import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../../config/db.js';
import { COUNTIES } from '../../config/constants.js';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { loginLimiter } from '../../middleware/rateLimit.js';
import { asyncHandler, AppError } from '../../utils/errors.js';
import { normaliseKenyanPhone } from '../../utils/phone.js';
import { audit } from '../../utils/audit.js';
import crypto from 'node:crypto';
import { passwordRule } from '../auth/schemas.js';
import { tell } from '../applications/service.js';
import { removeStored } from '../../utils/uploads.js';

const router = Router();
router.use(requireAuth);

const accountSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name').max(120),
  phone: z.string().trim().transform((v, ctx) => {
    const n = normaliseKenyanPhone(v);
    if (!n) ctx.addIssue({ code: 'custom', message: 'Enter a valid Kenyan number, e.g. 0712345678' });
    return n;
  }),
  county: z.enum(COUNTIES, { errorMap: () => ({ message: 'Select your county' }) }),
});
const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password').max(128),
  newPassword: passwordRule,
});

router.put('/', validate(accountSchema), asyncHandler(async (req, res) => {
  const { fullName, phone, county } = req.body;
  await db('users').where({ id: req.user.id }).update({ full_name: fullName, phone, county, updated_at: db.fn.now() });
  await audit({ actorId: req.user.id, action: 'user.account_updated', entityType: 'user', entityId: req.user.id, ip: req.ip });
  res.json({ message: 'Account details saved.' });
}));

router.post('/password', loginLimiter, validate(passwordSchema), asyncHandler(async (req, res) => {
  const ok = await bcrypt.compare(req.body.currentPassword, req.user.password_hash);
  if (!ok) throw new AppError(422, 'VALIDATION_ERROR', 'Your current password is incorrect.', { currentPassword: 'Incorrect password' });
  const hash = await bcrypt.hash(req.body.newPassword, 12);
  await db.transaction(async (trx) => {
    await trx('users').where({ id: req.user.id }).update({ password_hash: hash, updated_at: trx.fn.now() });
    // Sign out every other device, keep this one.
    await trx.raw("DELETE FROM session WHERE sess->>'userId' = ? AND sid <> ?", [String(req.user.id), req.sessionID]);
    await audit({ actorId: req.user.id, action: 'auth.password_changed', entityType: 'user', entityId: req.user.id, ip: req.ip }, trx);
  });
  await tell(req.user.id, { type: 'security', title: 'Your password was changed', body: 'If this was not you, reset your password immediately and contact support.', link: '/forgot-password', ctaLabel: 'Reset password' });
  res.json({ message: 'Password changed. Other devices have been signed out.' });
}));

/* ---------- Data Protection Act: access (export) and erasure ---------- */
router.get('/export', asyncHandler(async (req, res) => {
  const u = req.user;
  const out = {
    exportedAt: new Date().toISOString(),
    account: { id: Number(u.id), role: u.role, fullName: u.full_name, email: u.email, phone: u.phone, county: u.county, gender: u.gender, dateOfBirth: u.date_of_birth, createdAt: u.created_at, emailVerifiedAt: u.email_verified_at, consentGivenAt: u.consent_at },
    notifications: await db('notifications').where({ user_id: u.id }).select('type', 'title', 'body', 'created_at as createdAt', 'read_at as readAt'),
  };
  if (u.role === 'intern') {
    const p = await db('intern_profiles').where({ user_id: u.id }).first();
    out.profile = p && { institution: p.institution, course: p.course, qualification: p.qualification_level, graduationYear: p.graduation_year, skills: p.skills, careerInterests: p.career_interests, experience: p.experience, preferredCounty: p.preferred_county, preferredWorkArrangement: p.preferred_work_arrangement, linkedinUrl: p.linkedin_url, portfolioUrl: p.portfolio_url, hasPhoto: Boolean(p.photo_path), hasCv: Boolean(p.cv_path) };
    out.applications = await db('applications as a').join('internships as i', 'i.id', 'a.internship_id').join('company_profiles as c', 'c.id', 'i.company_id').where('a.intern_id', u.id)
      .select('a.reference', 'a.status', 'a.cover_letter as coverLetter', 'a.submitted_at as submittedAt', 'i.title as internship', 'c.company_name as company');
    out.payments = await db('payments').where({ user_id: u.id }).select('amount', 'phone', 'status', 'mpesa_receipt as mpesaReceipt', 'receipt_number as receiptNumber', 'created_at as createdAt');
    out.savedInternships = await db('saved_internships as s').join('internships as i', 'i.id', 's.internship_id').where('s.intern_id', u.id).select('i.title', 's.created_at as savedAt');
  } else if (u.role === 'company') {
    const c = await db('company_profiles').where({ user_id: u.id }).first();
    out.company = c && { name: c.company_name, officialEmail: c.official_email, phone: c.phone, address: c.address, county: c.county, industry: c.industry, website: c.website, description: c.description, registrationNumber: c.registration_number, approvalStatus: c.approval_status };
    out.internships = c ? await db('internships').where({ company_id: c.id }).select('reference', 'title', 'status', 'deadline', 'created_at as createdAt') : [];
  }
  await audit({ actorId: u.id, action: 'user.data_exported', entityType: 'user', entityId: u.id, ip: req.ip });
  res.set('Cache-Control', 'no-store').set('Content-Disposition', 'attachment; filename="my-perfect-intern-data.json"').json(out);
}));

const deleteSchema = z.object({ password: z.string().min(1, 'Enter your password').max(128), confirm: z.literal('DELETE', { errorMap: () => ({ message: 'Type DELETE to confirm' }) }) });
router.post('/delete', loginLimiter, validate(deleteSchema), asyncHandler(async (req, res) => {
  const u = req.user;
  if (u.role !== 'intern') throw new AppError(403, 'FORBIDDEN', 'To close a company or administrator account, contact support.');
  if (!(await bcrypt.compare(req.body.password, u.password_hash))) throw new AppError(422, 'VALIDATION_ERROR', 'Your password is incorrect.', { password: 'Incorrect password' });
  const pending = await db('payments').where({ user_id: u.id, status: 'pending' }).first('id');
  if (pending) throw new AppError(409, 'PAYMENT_PENDING', 'A payment is still being confirmed. Try again in a few minutes.');

  const profile = await db('intern_profiles').where({ user_id: u.id }).first();
  const appCvs = (await db('applications').where({ intern_id: u.id }).select('cv_path')).map((a) => a.cv_path).filter((x) => x && x !== 'removed');
  const randomHash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);

  await db.transaction(async (trx) => {
    await trx('applications').where({ intern_id: u.id }).update({ cover_letter: 'Removed at the applicant\'s request', cv_path: 'removed', updated_at: trx.fn.now() });
    await trx('applications').where({ intern_id: u.id }).whereIn('status', ['submitted', 'under_review', 'shortlisted', 'interview_scheduled']).update({ status: 'withdrawn' });
    await trx('saved_internships').where({ intern_id: u.id }).del();
    await trx('notifications').where({ user_id: u.id }).del();
    await trx('email_logs').where({ user_id: u.id }).update({ to_email: 'deleted', subject: 'deleted' });
    await trx('intern_profiles').where({ user_id: u.id }).update({
      photo_path: null, institution: null, course: null, qualification_level: null, graduation_year: null, skills: [], career_interests: [],
      experience: null, preferred_county: null, preferred_work_arrangement: null, linkedin_url: null, portfolio_url: null, cv_path: null, completion_pct: 0, updated_at: trx.fn.now(),
    });
    await trx('users').where({ id: u.id }).update({
      full_name: 'Deleted user', email: `deleted-${u.id}@deleted.invalid`, phone: null, county: null, gender: null, date_of_birth: null,
      password_hash: randomHash, status: 'suspended', verification_token_hash: null, reset_token_hash: null, deleted_at: trx.fn.now(), updated_at: trx.fn.now(),
    });
    await trx.raw("DELETE FROM session WHERE sess->>'userId' = ?", [String(u.id)]);
    await audit({ actorId: u.id, action: 'user.deleted', entityType: 'user', entityId: u.id, ip: req.ip }, trx);
  });
  // Files go after the database commit; payment and audit records are retained as required by law.
  removeStored(profile?.photo_path); removeStored(profile?.cv_path); appCvs.forEach((p) => removeStored(p));
  res.clearCookie('tpi.sid');
  res.json({ message: 'Your account and personal data have been deleted.' });
}));

/* ---------- Notification centre (interns and companies) ---------- */
router.get('/notifications', asyncHandler(async (req, res) => {
  const items = await db('notifications').where({ user_id: req.user.id }).orderBy('created_at', 'desc').limit(50)
    .select('id', 'type', 'title', 'body', 'link', 'read_at as readAt', 'created_at as createdAt');
  res.json({ items });
}));
router.post('/notifications/read-all', asyncHandler(async (req, res) => {
  await db('notifications').where({ user_id: req.user.id }).whereNull('read_at').update({ read_at: db.fn.now() });
  res.json({ ok: true });
}));
router.post('/notifications/:id/read', validate(z.object({ id: z.coerce.number().int().positive() }), 'params'), asyncHandler(async (req, res) => {
  await db('notifications').where({ id: req.params.id, user_id: req.user.id }).whereNull('read_at').update({ read_at: db.fn.now() });
  res.json({ ok: true });
}));

export default router;
