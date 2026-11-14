import bcrypt from 'bcryptjs';
import { db } from '../../config/db.js';
import { AppError } from '../../utils/errors.js';
import { newToken, hashToken } from '../../utils/tokens.js';
import { audit } from '../../utils/audit.js';
import { sendEmail } from '../email/mailer.js';
import { notify, notifyAdmins } from '../notifications/service.js';
import { verificationEmail, resetEmail, welcomeEmail, duplicateRegistrationEmail, passwordChangedEmail } from '../email/templates.js';

const HOUR = 3600 * 1000;
// A real bcrypt hash to compare against when the email is unknown, so response time does not reveal which emails exist.
let dummyHash = null;
const getDummyHash = () => (dummyHash ??= bcrypt.hashSync('not-a-real-password-0', 12));
const MAX_FAILED = 5;
const LOCK_MS = 15 * 60 * 1000;

async function issueVerification(user) {
  const { token, hash } = newToken();
  await db('users').where({ id: user.id }).update({
    verification_token_hash: hash, verification_expires_at: new Date(Date.now() + 24 * HOUR),
  });
  const mail = verificationEmail(user.full_name, token);
  await sendEmail({ userId: user.id, to: user.email, template: 'verify_email', ...mail });
}

export async function register(role, data, ip) {
  const passwordHash = await bcrypt.hash(data.password, 12);
  // Never reveal whether an email is registered: answer identically and tell the real owner by email instead.
  const existing = await db('users').whereRaw('lower(email)=?', [data.email]).first();
  if (existing) {
    await sendEmail({ userId: existing.id, to: existing.email, template: 'duplicate_registration', ...duplicateRegistrationEmail(existing.full_name) });
    return;
  }
  let user;
  try {
    user = await db.transaction(async (trx) => {
    const [row] = await trx('users').insert({
      role, email: data.email, full_name: data.fullName, phone: data.phone, password_hash: passwordHash,
      county: data.county, gender: data.gender || null, date_of_birth: data.dateOfBirth || null,
      consent_at: trx.fn.now(),
    }).returning('*');
    if (role === 'intern') {
      await trx('intern_profiles').insert({ user_id: row.id });
    } else {
      await trx('company_profiles').insert({
        user_id: row.id, company_name: data.companyName, official_email: data.email,
        phone: data.phone, county: data.county, industry: data.industry,
      });
    }
    if (role === 'company') await notifyAdmins({ type: 'admin_company_pending', title: 'New company awaiting approval', body: `${data.companyName} registered.`, link: '/dashboard/admin/companies?approvalStatus=pending' }, trx);
    await audit({ actorId: row.id, action: `${role}.registered`, entityType: 'user', entityId: row.id, ip }, trx);
    return row;
    });
  } catch (err) {
    if (err.code === '23505') return; // lost a race with another registration of the same email
    throw err;
  }
  await issueVerification(user);
}

export async function verifyEmail(token, ip) {
  const user = await db('users').where({ verification_token_hash: hashToken(token) }).first();
  if (!user || !user.verification_expires_at || new Date(user.verification_expires_at) < new Date()) {
    throw new AppError(400, 'TOKEN_INVALID', 'This verification link is invalid or has expired. Request a new one.');
  }
  await db('users').where({ id: user.id }).update({
    status: user.status === 'suspended' ? 'suspended' : 'active',
    email_verified_at: db.fn.now(), verification_token_hash: null, verification_expires_at: null, updated_at: db.fn.now(),
  });
  await audit({ actorId: user.id, action: 'user.email_verified', entityType: 'user', entityId: user.id, ip });
  await notify(user.id, { type: 'welcome', title: 'Welcome to The Perfect Intern', body: user.role === 'intern' ? 'Complete your profile so you are ready to apply.' : 'We will notify you once your company is approved.', link: user.role === 'intern' ? '/dashboard/profile' : '/dashboard' });
  await sendEmail({ userId: user.id, to: user.email, template: 'welcome', ...welcomeEmail(user.full_name, user.role) });
}

export async function resendVerification(email) {
  const user = await db('users').whereRaw('lower(email)=?', [email]).first();
  if (user && user.status === 'pending_verification') await issueVerification(user);
}

export async function login({ email, password }, ip) {
  const user = await db('users').whereRaw('lower(email)=?', [email]).first();
  const invalid = new AppError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password.');
  if (!user) { await bcrypt.compare(password, getDummyHash()); throw invalid; }
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    throw new AppError(429, 'ACCOUNT_LOCKED', 'Too many failed attempts. Try again in 15 minutes or reset your password.');
  }
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    const failed = user.failed_logins + 1;
    await db('users').where({ id: user.id }).update({
      failed_logins: failed >= MAX_FAILED ? 0 : failed,
      locked_until: failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MS) : null,
    });
    await audit({ actorId: user.id, action: 'auth.login_failed', entityType: 'user', entityId: user.id, ip });
    throw invalid;
  }
  if (user.status === 'pending_verification') {
    throw new AppError(403, 'EMAIL_NOT_VERIFIED', 'Verify your email before signing in. Check your inbox or request a new link.');
  }
  if (user.status === 'suspended') {
    throw new AppError(403, 'ACCOUNT_SUSPENDED', 'This account is suspended. Contact support for help.');
  }
  await db('users').where({ id: user.id }).update({ failed_logins: 0, locked_until: null, last_login_at: db.fn.now() });
  await audit({ actorId: user.id, action: 'auth.login', entityType: 'user', entityId: user.id, ip });
  return user;
}

export async function forgotPassword(email) {
  const user = await db('users').whereRaw('lower(email)=?', [email]).first();
  if (!user || user.status === 'suspended') return;
  const { token, hash } = newToken();
  await db('users').where({ id: user.id }).update({ reset_token_hash: hash, reset_expires_at: new Date(Date.now() + HOUR) });
  await sendEmail({ userId: user.id, to: user.email, template: 'password_reset', ...resetEmail(user.full_name, token) });
}

export async function resetPassword(token, password, ip) {
  const user = await db('users').where({ reset_token_hash: hashToken(token) }).first();
  if (!user || !user.reset_expires_at || new Date(user.reset_expires_at) < new Date()) {
    throw new AppError(400, 'TOKEN_INVALID', 'This reset link is invalid or has expired. Request a new one.');
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await db.transaction(async (trx) => {
    await trx('users').where({ id: user.id }).update({
      password_hash: passwordHash, reset_token_hash: null, reset_expires_at: null,
      failed_logins: 0, locked_until: null, updated_at: trx.fn.now(),
    });
    // Sign the user out everywhere.
    await trx.raw("DELETE FROM session WHERE sess->>'userId' = ?", [String(user.id)]);
    await audit({ actorId: user.id, action: 'auth.password_reset', entityType: 'user', entityId: user.id, ip }, trx);
  });
  await notify(user.id, { type: 'security', title: 'Your password was changed', body: 'You reset your password. If this was not you, contact support.', link: '/forgot-password' });
  await sendEmail({ userId: user.id, to: user.email, template: 'password_reset_done', ...passwordChangedEmail(user.full_name) });
}

export async function profileSummary(user) {
  const base = {
    id: user.id, role: user.role, fullName: user.full_name, email: user.email, phone: user.phone,
    county: user.county, accessActivated: Boolean(user.access_activated_at),
  };
  if (user.role === 'intern') {
    const p = await db('intern_profiles').where({ user_id: user.id }).first();
    return { ...base, profileCompletion: p?.completion_pct ?? 0 };
  }
  if (user.role === 'company') {
    const c = await db('company_profiles').where({ user_id: user.id }).first();
    return { ...base, companyName: c?.company_name, approvalStatus: c?.approval_status };
  }
  return base;
}
