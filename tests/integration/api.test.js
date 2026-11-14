/**
 * End-to-end API tests across all three roles, run against a REAL PostgreSQL test database.
 *
 *   createdb perfect_intern_test
 *   TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/perfect_intern_test npm run test:integration   (from /server)
 *
 * The suite migrates and TRUNCATES that database, so it refuses to run unless the database name contains "test".
 * Payments use MPESA_MOCK and simulated Daraja callbacks; nothing leaves your machine.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TEST_DB = process.env.TEST_DATABASE_URL;
const here = path.dirname(fileURLToPath(import.meta.url));
const serverSrc = path.resolve(here, '../../server/src');
const SECRET = 'testcallbacksecret';
const ADMIN = { email: 'admin@test.local', password: 'Admin#Test2026' };
const PASS = 'Strong#Pass2026';

class Client {
  constructor(base) { this.base = base; this.jar = new Map(); this.csrf = null; }
  capture(res) {
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [pair] = c.split(';');
      const name = pair.split('=')[0];
      if (/Max-Age=0|Expires=Thu, 01 Jan 1970/i.test(c)) this.jar.delete(name); else this.jar.set(name, pair);
    }
  }
  get cookie() { return [...this.jar.values()].join('; '); }
  async req(method, url, body, { form = false, noCsrf = false } = {}) {
    const headers = {};
    if (this.cookie) headers.cookie = this.cookie;
    if (method !== 'GET' && !noCsrf) {
      if (!this.csrf) { const r = await this.req('GET', '/csrf'); this.csrf = r.json.token; headers.cookie = this.cookie; }
      headers['x-csrf-token'] = this.csrf;
    }
    if (body && !form) headers['content-type'] = 'application/json';
    const res = await fetch(`${this.base}/api${url}`, { method, headers, body: form ? body : body ? JSON.stringify(body) : undefined });
    this.capture(res);
    const text = await res.text();
    let json; try { json = JSON.parse(text); } catch { /* not json */ }
    return { status: res.status, json, text, headers: res.headers };
  }
  async login(email, password) {
    const r = await this.req('POST', '/auth/login', { email, password });
    if (r.status === 200) this.csrf = r.json.csrfToken;
    return r;
  }
}

const pdfForm = (bytes = '%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF') => {
  const fd = new FormData();
  fd.append('file', new Blob([bytes], { type: 'application/pdf' }), 'cv.pdf');
  return fd;
};

describe('The Perfect Intern API', { skip: !TEST_DB && 'set TEST_DATABASE_URL to run integration tests' }, () => {
  let server, base, db, pool, mailbox, anon;

  before(async () => {
    const dbName = new URL(TEST_DB).pathname;
    assert.ok(/test/i.test(dbName), `Refusing to run: database "${dbName}" does not look like a test database`);
    Object.assign(process.env, {
      NODE_ENV: 'test', DATABASE_URL: TEST_DB, SESSION_SECRET: 'test-secret-test-secret-test-secret-12', MPESA_MOCK: 'true',
      MPESA_CALLBACK_SECRET: SECRET, SEED_ADMIN_EMAIL: ADMIN.email, SEED_ADMIN_PASSWORD: ADMIN.password, APP_URL: 'http://localhost:5173',
      UPLOAD_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'tpi-uploads-')), SMTP_HOST: '',
    });
    ({ db, pool } = await import(`${serverSrc}/config/db.js`));
    ({ mailbox } = await import(`${serverSrc}/modules/email/mailer.js`));
    await db.migrate.latest({ directory: `${serverSrc}/database/migrations` });
    await db.raw('TRUNCATE users, internship_categories, admin_settings, email_logs, audit_logs, contact_messages, session, payments RESTART IDENTITY CASCADE');
    await db.seed.run({ directory: `${serverSrc}/database/seeds`, specific: '01_base.js' });
    const { default: app } = await import(`${serverSrc}/app.js`);
    server = app.listen(0);
    base = `http://127.0.0.1:${server.address().port}`;
    anon = new Client(base);
  });

  after(async () => {
    server?.close();
    await db?.destroy();
    await pool?.end();
  });

  const tokenFrom = (email, template) => {
    const m = [...mailbox].reverse().find((x) => x.to === email && (!template || x.template === template));
    return m?.text.match(/token=([a-f0-9]{64})/)?.[1];
  };
  const internBody = (email, extra = {}) => ({ fullName: 'Test Intern', email, phone: '0712345678', password: PASS, county: 'Nairobi', consent: true, ...extra });
  const companyBody = (email, name) => ({ fullName: 'Hiring Manager', email, phone: '0722345678', password: PASS, county: 'Nairobi', consent: true, companyName: name, industry: 'Information Technology' });

  async function signUp(kind, email, body) {
    const c = new Client(base);
    const r = await c.req('POST', `/auth/register/${kind}`, body);
    assert.equal(r.status, 201, r.text);
    const v = await c.req('POST', '/auth/verify-email', { token: tokenFrom(email, 'verify_email') });
    assert.equal(v.status, 200, v.text);
    const l = await c.login(email, PASS);
    assert.equal(l.status, 200, l.text);
    return c;
  }

  const S = {}; // shared state across the ordered tests below

  it('serves health and rejects state-changing requests without a CSRF token', async () => {
    assert.equal((await anon.req('GET', '/health')).status, 200);
    const r = await anon.req('POST', '/auth/login', { email: 'a@b.co', password: 'x' }, { noCsrf: true });
    assert.equal(r.status, 403);
    assert.equal(r.json.error.code, 'CSRF_INVALID');
  });

  it('registers, blocks unverified sign-in, verifies, and signs in', async () => {
    const email = 'intern1@test.local';
    const c = new Client(base);
    assert.equal((await c.req('POST', '/auth/register/intern', internBody(email))).status, 201);
    const early = await c.login(email, PASS);
    assert.equal(early.status, 403);
    assert.equal(early.json.error.code, 'EMAIL_NOT_VERIFIED');
    assert.equal((await c.req('POST', '/auth/verify-email', { token: tokenFrom(email, 'verify_email') })).status, 200);
    assert.equal((await c.login(email, 'Wrong#Pass1')).status, 401);
    const ok = await c.login(email, PASS);
    assert.equal(ok.status, 200);
    assert.equal(ok.json.user.role, 'intern');
    assert.equal((await c.req('GET', '/auth/me')).json.user.email, email);
    S.intern = c; S.internId = ok.json.user.id;
  });

  it('does not reveal registered emails and rejects weak passwords', async () => {
    const dup = await new Client(base).req('POST', '/auth/register/intern', internBody('intern1@test.local'));
    assert.equal(dup.status, 201); // identical response to a fresh registration
    assert.equal((await db('users').whereRaw('lower(email) = ?', ['intern1@test.local'])).length, 1);
    assert.ok(mailbox.some((m) => m.to === 'intern1@test.local' && m.template === 'duplicate_registration'));
    const weak = await new Client(base).req('POST', '/auth/register/intern', internBody('weak@test.local', { password: 'password123' }));
    assert.equal(weak.status, 422);
    assert.ok(weak.json.error.fields.password);
  });

  it('enforces role-based access control', async () => {
    assert.equal((await anon.req('GET', '/intern/profile')).status, 401);
    assert.equal((await S.intern.req('GET', '/company/profile')).status, 403);
    assert.equal((await S.intern.req('GET', '/admin/stats')).status, 403);
    S.companyA = await signUp('company', 'companya@test.local', companyBody('companya@test.local', 'Alpha Tech Ltd'));
    assert.equal((await S.companyA.req('GET', '/admin/stats')).status, 403);
    assert.equal((await S.companyA.req('GET', '/intern/dashboard')).status, 403);
    S.admin = new Client(base);
    assert.equal((await S.admin.login(ADMIN.email, ADMIN.password)).status, 200);
    const stats = await S.admin.req('GET', '/admin/stats');
    assert.equal(stats.status, 200);
    assert.equal(stats.json.stats.pendingCompanies, 1);
  });

  it('keeps listings private until a company and its internship are approved', async () => {
    const cats = (await anon.req('GET', '/public/categories')).json.categories;
    const profile = { companyName: 'Alpha Tech Ltd', officialEmail: 'companya@test.local', phone: '0722345678', address: 'Westlands, Nairobi', county: 'Nairobi', industry: 'Information Technology', description: 'We build software for East African businesses and mentor interns.' };
    assert.equal((await S.companyA.req('PUT', '/company/profile', profile)).status, 200);
    const deadline = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
    const listing = { title: 'Backend Intern', categoryId: cats[0].id, description: 'Work with our engineers on APIs and databases for real customers, with a mentor.', responsibilities: 'Build and test small features each week.', qualifications: 'Studying computing.', skills: ['SQL'], positions: 2, county: 'Nairobi', workArrangement: 'physical', durationMonths: 3, deadline, isPaid: false };
    const created = await S.companyA.req('POST', '/company/internships', listing);
    assert.equal(created.status, 201, created.text);
    assert.equal(created.json.internship.status, 'pending_approval');
    S.listingId = created.json.internship.id;
    assert.equal((await anon.req('GET', '/public/internships')).json.total, 0);

    const companyRow = await db('company_profiles').where({ official_email: 'companya@test.local' }).first();
    assert.equal((await S.admin.req('POST', `/admin/companies/${companyRow.id}/approve`)).status, 200);
    assert.equal((await anon.req('GET', '/public/internships')).json.total, 0); // company approved, listing still pending
    const rej = await S.admin.req('POST', `/admin/internships/${S.listingId}/reject`, { reason: 'x' });
    assert.equal(rej.status, 422); // reason too short
    assert.equal((await S.admin.req('POST', `/admin/internships/${S.listingId}/approve`)).status, 200);
    const pub = await anon.req('GET', '/public/internships');
    assert.equal(pub.json.total, 1);
    assert.equal((await anon.req('GET', `/public/internships/${S.listingId}`)).status, 200);
    assert.ok(mailbox.some((m) => m.to === 'companya@test.local' && m.template === 'internship_approved'));
  });

  it('gates applications on profile, CV and paid access, and validates uploads', async () => {
    const e1 = await S.intern.req('GET', `/intern/internships/${S.listingId}/eligibility`);
    assert.equal(e1.json.code, 'PROFILE_INCOMPLETE');
    const prof = { institution: 'University of Nairobi', course: 'Computer Science', qualificationLevel: "Bachelor's degree", graduationYear: 2027, skills: ['SQL', 'JavaScript'], careerInterests: ['software-development'], preferredCounty: 'Nairobi', preferredWorkArrangement: 'physical' };
    assert.equal((await S.intern.req('PUT', '/intern/profile', prof)).status, 200);
    assert.equal((await S.intern.req('GET', `/intern/internships/${S.listingId}/eligibility`)).json.code, 'CV_MISSING');
    const fake = new FormData();
    fake.append('file', new Blob(['just text, not a pdf'], { type: 'application/pdf' }), 'cv.pdf');
    const bad = await S.intern.req('POST', '/intern/profile/cv', fake, { form: true });
    assert.equal(bad.status, 422);
    assert.equal(bad.json.error.code, 'BAD_FILE_CONTENT');
    assert.equal((await S.intern.req('POST', '/intern/profile/cv', pdfForm(), { form: true })).status, 200);
    assert.equal((await S.intern.req('GET', `/intern/internships/${S.listingId}/eligibility`)).json.code, 'ACCESS_REQUIRED');
    const apply = await S.intern.req('POST', '/intern/applications', { internshipId: S.listingId, coverLetter: 'I am keen to learn backend engineering and contribute from week one.' });
    assert.equal(apply.status, 402);
    assert.equal(apply.json.error.code, 'ACCESS_REQUIRED');
  });

  const callbackBody = (id, { code = 0, amount = 199, receipt = 'QWE1234567' } = {}) => ({
    Body: { stkCallback: { MerchantRequestID: 'm1', CheckoutRequestID: id, ResultCode: code, ResultDesc: code === 0 ? 'The service request is processed successfully.' : 'Request cancelled by user',
      ...(code === 0 ? { CallbackMetadata: { Item: [{ Name: 'Amount', Value: amount }, { Name: 'MpesaReceiptNumber', Value: receipt }, { Name: 'TransactionDate', Value: 20261105120000 }, { Name: 'PhoneNumber', Value: 254712345678 }] } } : {}) } },
  });
  const sendCallback = (id, opts, secret = SECRET) => fetch(`${base}/api/payments/mpesa/callback/${secret}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(callbackBody(id, opts)) });
  const latestCheckout = async (userId) => (await db('payments').where({ user_id: userId }).orderBy('id', 'desc').first()).checkout_request_id;

  it('activates access only after a verified M-Pesa callback', async () => {
    assert.equal((await S.intern.req('POST', '/payments/initiate', { phone: '12345' })).status, 422);
    const init = await S.intern.req('POST', '/payments/initiate', { phone: '0712345678' });
    assert.equal(init.status, 201, init.text);
    assert.equal(init.json.payment.amount, 199); // from admin_settings, never from the client
    let id = await latestCheckout(S.internId);

    assert.equal((await sendCallback(id, {}, 'wrong-secret')).status, 404);
    assert.equal((await S.intern.req('GET', '/auth/me')).json.user.accessActivated, false);

    await sendCallback(id, { amount: 100, receipt: 'MISMATCH01' }); // wrong amount: must not activate
    assert.equal((await S.intern.req('GET', '/auth/me')).json.user.accessActivated, false);
    assert.equal((await db('payments').where({ checkout_request_id: id }).first()).status, 'failed');

    assert.equal((await S.intern.req('POST', '/payments/initiate', { phone: '0712345678' })).status, 201);
    id = await latestCheckout(S.internId);
    assert.equal((await sendCallback(id, { receipt: 'QWE1234567' })).status, 200);
    assert.equal((await S.intern.req('GET', '/auth/me')).json.user.accessActivated, true);
    await sendCallback(id, { receipt: 'QWE1234567' }); // replay: idempotent
    assert.equal(Number((await db('payments').where({ user_id: S.internId, status: 'success' }).count('* as n'))[0].n), 1);
    const paid = await db('payments').where({ checkout_request_id: id }).first();
    assert.equal(paid.mpesa_receipt, 'QWE1234567');
    assert.match(paid.receipt_number, /^TPI-\d{4}-\d{6}$/);
    assert.equal((await S.intern.req('POST', '/payments/initiate', { phone: '0712345678' })).status, 409);
    assert.equal((await S.intern.req('GET', `/payments/${paid.id}/receipt`)).status, 200);
    assert.ok(mailbox.some((m) => m.to === 'intern1@test.local' && m.template === 'payment_success'));
  });

  it('treats a cancelled prompt as unpaid', async () => {
    const c = await signUp('intern', 'intern2@test.local', internBody('intern2@test.local'));
    const me = (await c.req('GET', '/auth/me')).json.user;
    assert.equal((await c.req('POST', '/payments/initiate', { phone: '0733345678' })).status, 201);
    await sendCallback(await latestCheckout(me.id), { code: 1032 });
    assert.equal((await db('payments').where({ user_id: me.id }).first()).status, 'cancelled');
    assert.equal((await c.req('GET', '/auth/me')).json.user.accessActivated, false);
    S.intern2 = c; S.intern2Id = me.id;
  });

  it('accepts one application per internship and tracks it', async () => {
    const body = { internshipId: S.listingId, coverLetter: 'I am keen to learn backend engineering and contribute from week one.' };
    const first = await S.intern.req('POST', '/intern/applications', body);
    assert.equal(first.status, 201, first.text);
    assert.match(first.json.application.reference, /^APP-\d{4}-[0-9A-F]{6}$/);
    S.appId = first.json.application.id;
    const dup = await S.intern.req('POST', '/intern/applications', body);
    assert.equal(dup.status, 409);
    assert.equal(dup.json.error.code, 'ALREADY_APPLIED');
    const list = await S.intern.req('GET', '/intern/applications');
    assert.equal(list.json.items.length, 1);
    assert.ok(mailbox.some((m) => m.to === 'companya@test.local' && m.template === 'application_received'));
  });

  it('lets a company manage only its own applicants, with valid status transitions', async () => {
    S.companyB = await signUp('company', 'companyb@test.local', companyBody('companyb@test.local', 'Beta Works'));
    assert.equal((await S.companyB.req('GET', `/company/applications/${S.appId}`)).status, 404);
    assert.equal((await S.companyB.req('GET', `/company/applications/${S.appId}/cv`)).status, 404);
    assert.equal((await S.companyB.req('GET', `/company/internships/${S.listingId}`)).status, 404);
    assert.equal((await S.companyB.req('GET', '/company/applications')).json.total, 0);

    const detail = await S.companyA.req('GET', `/company/applications/${S.appId}`);
    assert.equal(detail.status, 200);
    assert.equal(detail.json.application.status, 'under_review'); // opening marks it under review
    const cv = await S.companyA.req('GET', `/company/applications/${S.appId}/cv`);
    assert.equal(cv.status, 200);
    assert.match(cv.headers.get('content-type'), /pdf/);

    const skip = await S.companyA.req('PUT', `/company/applications/${S.appId}/status`, { status: 'selected' });
    assert.equal(skip.status, 409);
    assert.equal(skip.json.error.code, 'BAD_TRANSITION');
    assert.equal((await S.companyA.req('PUT', `/company/applications/${S.appId}/status`, { status: 'shortlisted' })).status, 200);
    const when = new Date(Date.now() + 3 * 864e5 + 3 * 3600e3).toISOString().slice(0, 16);
    assert.equal((await S.companyA.req('PUT', `/company/applications/${S.appId}/status`, { status: 'interview_scheduled', interviewAt: when, interviewNotes: 'Office, 2nd floor' })).status, 200);
    assert.ok(mailbox.some((m) => m.to === 'intern1@test.local' && m.subject === 'Interview scheduled'));

    const apps = await S.intern.req('GET', '/intern/applications');
    assert.equal(apps.json.items[0].status, 'interview_scheduled');
    assert.equal((await S.intern.req('POST', `/intern/applications/${S.appId}/withdraw`)).status, 200);
    const after = await S.companyA.req('PUT', `/company/applications/${S.appId}/status`, { status: 'selected' });
    assert.equal(after.status, 409);
  });

  it('lets an admin suspend and reactivate an intern, and export payments safely', async () => {
    assert.equal((await S.admin.req('POST', `/admin/interns/${S.intern2Id}/suspend`)).status, 200);
    assert.equal((await S.intern2.req('GET', '/auth/me')).status, 401);
    const blocked = await new Client(base).login('intern2@test.local', PASS);
    assert.equal(blocked.status, 403);
    assert.equal(blocked.json.error.code, 'ACCOUNT_SUSPENDED');
    assert.equal((await S.admin.req('POST', `/admin/interns/${S.intern2Id}/reactivate`)).status, 200);
    assert.equal((await S.intern2.login('intern2@test.local', PASS)).status, 200);

    const csv = await S.admin.req('GET', '/admin/payments/export.csv?status=success');
    assert.equal(csv.status, 200);
    assert.match(csv.headers.get('content-type'), /text\/csv/);
    assert.match(csv.text, /QWE1234567/);
    assert.match(csv.text, /Receipt number/);
    assert.equal((await S.admin.req('GET', '/admin/analytics?days=30')).status, 200);
    assert.equal((await S.admin.req('GET', '/admin/revenue')).status, 200);
  });

  it('applies a changed access fee to new payments only', async () => {
    assert.equal((await S.admin.req('PUT', '/admin/settings', { accessFee: 250, minProfileCompletion: 70 })).status, 200);
    const init = await S.intern2.req('POST', '/payments/initiate', { phone: '0733345678' });
    assert.equal(init.status, 201);
    assert.equal(init.json.payment.amount, 250);
    await sendCallback(await latestCheckout(S.intern2Id), { amount: 250, receipt: 'FEE2500001' });
    assert.equal((await S.intern2.req('GET', '/auth/me')).json.user.accessActivated, true);
    assert.equal(Number((await db('payments').where({ user_id: S.internId, status: 'success' }).first()).amount), 199);
    assert.equal((await S.admin.req('PUT', '/admin/settings', { accessFee: 0, minProfileCompletion: 70 })).status, 422);
  });

  it('revokes every session on password reset', async () => {
    const other = new Client(base);
    assert.equal((await other.login('intern1@test.local', PASS)).status, 200);
    await anon.req('POST', '/auth/forgot-password', { email: 'intern1@test.local' });
    const token = tokenFrom('intern1@test.local', 'password_reset');
    assert.ok(token);
    const NEW = 'Brand#New2027x';
    assert.equal((await anon.req('POST', '/auth/reset-password', { token, password: NEW })).status, 200);
    assert.equal((await other.req('GET', '/auth/me')).status, 401);
    assert.equal((await S.intern.req('GET', '/auth/me')).status, 401);
    assert.equal((await anon.req('POST', '/auth/reset-password', { token, password: NEW })).status, 400); // single use
    assert.equal((await new Client(base).login('intern1@test.local', NEW)).status, 200);
  });

  it('exports and erases personal data on request', async () => {
    const exp = await S.intern2.req('GET', '/account/export');
    assert.equal(exp.status, 200);
    assert.equal(exp.json.account.email, 'intern2@test.local');
    assert.ok(Array.isArray(exp.json.payments));
    assert.ok(!('password_hash' in exp.json.account));

    const wrong = await S.intern2.req('POST', '/account/delete', { password: 'Nope#12345', confirm: 'DELETE' });
    assert.equal(wrong.status, 422);
    assert.equal((await S.intern2.req('POST', '/account/delete', { password: PASS, confirm: 'delete' })).status, 422);
    assert.equal((await S.intern2.req('POST', '/account/delete', { password: PASS, confirm: 'DELETE' })).status, 200);

    const row = await db('users').where({ id: S.intern2Id }).first();
    assert.equal(row.full_name, 'Deleted user');
    assert.equal(row.email, `deleted-${S.intern2Id}@deleted.invalid`);
    assert.ok(row.deleted_at);
    assert.equal((await new Client(base).login('intern2@test.local', PASS)).status, 401);
    assert.equal((await S.intern2.req('GET', '/auth/me')).status, 401);
    assert.ok((await db('payments').where({ user_id: S.intern2Id })).length >= 1); // financial records are retained
    assert.equal((await S.companyA.req('POST', '/account/delete', { password: PASS, confirm: 'DELETE' })).status, 403); // companies go through support
  });
});
