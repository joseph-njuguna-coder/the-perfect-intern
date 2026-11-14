import fs from 'node:fs';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../config/db.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler, AppError } from '../../utils/errors.js';
import { audit } from '../../utils/audit.js';
import { toCsv } from '../../utils/csv.js';
import { resolveStored } from '../../utils/uploads.js';
import { tell } from '../applications/service.js';
import { shape as shapePayment } from '../payments/service.js';
import { listingSchema, listingColumnsFor, shapeListing } from '../company/routes.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

const idParam = z.object({ id: z.coerce.number().int().positive() });
const paging = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) });
const like = (q) => `%${q.replace(/[%_\\]/g, '\\$&')}%`;
const pages = (n, limit) => Math.max(1, Math.ceil(Number(n) / limit));
const log = (req, action, entityType, entityId, before, after) => audit({ actorId: req.user.id, action, entityType, entityId, before, after, ip: req.ip });
const reasonSchema = z.object({ reason: z.string().trim().min(5, 'Give a reason of at least 5 characters').max(500) });

/* ---------- Dashboard stats ---------- */
router.get('/stats', asyncHandler(async (req, res) => {
  const { rows: [s] } = await db.raw(`SELECT
    (SELECT COUNT(*) FROM users WHERE role='intern')::int AS interns,
    (SELECT COUNT(*) FROM company_profiles)::int AS companies,
    (SELECT COUNT(*) FROM company_profiles WHERE approval_status='approved')::int AS "approvedCompanies",
    (SELECT COUNT(*) FROM internships)::int AS internships,
    (SELECT COUNT(*) FROM internships WHERE status='approved' AND deadline >= CURRENT_DATE)::int AS "activeInternships",
    (SELECT COUNT(*) FROM applications)::int AS applications,
    (SELECT COUNT(*) FROM payments WHERE status='success')::int AS "successfulPayments",
    (SELECT COALESCE(SUM(amount),0) FROM payments WHERE status='success')::float AS revenue,
    (SELECT COUNT(*) FROM company_profiles WHERE approval_status='pending')::int AS "pendingCompanies",
    (SELECT COUNT(*) FROM internships WHERE status='pending_approval')::int AS "pendingInternships",
    (SELECT COUNT(*) FROM payments WHERE status='pending')::int AS "pendingPayments",
    (SELECT COUNT(*) FROM audit_logs WHERE action IN ('payment.amount_mismatch','payment.duplicate_success_flagged','payment.duplicate_receipt_rejected') AND created_at > now() - interval '30 days')::int AS "paymentFlags"`);
  res.json({ stats: s });
}));

/* ---------- Interns ---------- */
const internList = paging.extend({ q: z.string().trim().max(100).optional(), status: z.enum(['active', 'suspended', 'pending_verification']).optional() });
router.get('/interns', validate(internList, 'query'), asyncHandler(async (req, res) => {
  const f = req.query;
  const base = () => {
    const q = db('users as u').join('intern_profiles as p', 'p.user_id', 'u.id').where('u.role', 'intern');
    if (f.status) q.where('u.status', f.status);
    if (f.q) q.where((w) => w.whereILike('u.full_name', like(f.q)).orWhereILike('u.email', like(f.q)).orWhereILike('u.phone', like(f.q)));
    return q;
  };
  const [{ n }] = await base().count('u.id as n');
  const items = await base().orderBy('u.created_at', 'desc').limit(f.limit).offset((f.page - 1) * f.limit)
    .select('u.id', 'u.full_name as name', 'u.email', 'u.phone', 'u.county', 'u.status', 'u.created_at as createdAt',
      db.raw('(u.access_activated_at IS NOT NULL) AS "hasAccess"'), 'p.completion_pct as completion',
      db.raw('(SELECT COUNT(*) FROM applications a WHERE a.intern_id = u.id)::int AS applications'));
  res.json({ items, total: Number(n), page: f.page, pages: pages(n, f.limit) });
}));

router.get('/interns/:id', validate(idParam, 'params'), asyncHandler(async (req, res) => {
  const u = await db('users as u').join('intern_profiles as p', 'p.user_id', 'u.id').where({ 'u.id': req.params.id, 'u.role': 'intern' }).first(
    'u.id', 'u.full_name as name', 'u.email', 'u.phone', 'u.county', 'u.gender', 'u.status', 'u.created_at as createdAt', 'u.last_login_at as lastLoginAt',
    'u.email_verified_at as emailVerifiedAt', 'u.access_activated_at as accessActivatedAt',
    'p.institution', 'p.course', 'p.qualification_level as qualification', 'p.graduation_year as graduationYear', 'p.skills',
    'p.career_interests as careerInterests', 'p.completion_pct as completion', 'p.preferred_county as preferredCounty');
  if (!u) throw new AppError(404, 'NOT_FOUND', 'Intern not found.');
  const payments = await db('payments').where({ user_id: u.id }).orderBy('id', 'desc').limit(50);
  const applications = await db('applications as a').join('internships as i', 'i.id', 'a.internship_id').join('company_profiles as c', 'c.id', 'i.company_id')
    .where('a.intern_id', u.id).orderBy('a.submitted_at', 'desc').limit(50)
    .select('a.id', 'a.reference', 'a.status', 'a.submitted_at as submittedAt', 'i.title', 'c.company_name as companyName');
  res.json({ intern: u, payments: payments.map(shapePayment), applications });
}));

async function setUserStatus(req, res, status, action) {
  const u = await db('users').where({ id: req.params.id, role: 'intern' }).first();
  if (!u) throw new AppError(404, 'NOT_FOUND', 'Intern not found.');
  const next = status === 'active' && !u.email_verified_at ? 'pending_verification' : status;
  await db.transaction(async (trx) => {
    await trx('users').where({ id: u.id }).update({ status: next, updated_at: trx.fn.now() });
    if (status === 'suspended') await trx.raw("DELETE FROM session WHERE sess->>'userId' = ?", [String(u.id)]);
    await audit({ actorId: req.user.id, action, entityType: 'user', entityId: u.id, before: { status: u.status }, after: { status: next }, ip: req.ip }, trx);
  });
  res.json({ ok: true, status: next });
}
router.post('/interns/:id/suspend', validate(idParam, 'params'), asyncHandler((req, res) => setUserStatus(req, res, 'suspended', 'admin.intern_suspended')));
router.post('/interns/:id/reactivate', validate(idParam, 'params'), asyncHandler((req, res) => setUserStatus(req, res, 'active', 'admin.intern_reactivated')));

/* ---------- Companies ---------- */
const companyList = paging.extend({ q: z.string().trim().max(100).optional(), approvalStatus: z.enum(['pending', 'approved', 'rejected', 'suspended']).optional() });
router.get('/companies', validate(companyList, 'query'), asyncHandler(async (req, res) => {
  const f = req.query;
  const base = () => {
    const q = db('company_profiles as c').join('users as u', 'u.id', 'c.user_id');
    if (f.approvalStatus) q.where('c.approval_status', f.approvalStatus);
    if (f.q) q.where((w) => w.whereILike('c.company_name', like(f.q)).orWhereILike('c.official_email', like(f.q)));
    return q;
  };
  const [{ n }] = await base().count('c.id as n');
  const items = await base().orderByRaw("(c.approval_status = 'pending') DESC, c.created_at DESC").limit(f.limit).offset((f.page - 1) * f.limit)
    .select('c.id', 'c.company_name as name', 'c.industry', 'c.county', 'c.official_email as email', 'c.approval_status as approvalStatus', 'c.created_at as createdAt',
      db.raw('(SELECT COUNT(*) FROM company_documents d WHERE d.company_id = c.id)::int AS documents'),
      db.raw('(SELECT COUNT(*) FROM company_documents d WHERE d.company_id = c.id AND d.verified)::int AS "verifiedDocuments"'),
      db.raw('(SELECT COUNT(*) FROM internships i WHERE i.company_id = c.id)::int AS internships'));
  res.json({ items, total: Number(n), page: f.page, pages: pages(n, f.limit) });
}));

const getCompany = async (id) => {
  const c = await db('company_profiles').where({ id }).first();
  if (!c) throw new AppError(404, 'NOT_FOUND', 'Company not found.');
  return c;
};

router.get('/companies/:id', validate(idParam, 'params'), asyncHandler(async (req, res) => {
  const c = await getCompany(req.params.id);
  const documents = await db('company_documents').where({ company_id: c.id }).orderBy('created_at', 'desc')
    .select('id', 'doc_type as docType', 'original_name as originalName', 'verified', 'verified_at as verifiedAt', 'created_at as createdAt');
  const internships = await db('internships').where({ company_id: c.id }).orderBy('created_at', 'desc').select('id', 'title', 'status', 'deadline');
  res.json({
    company: {
      id: Number(c.id), name: c.company_name, email: c.official_email, phone: c.phone, address: c.address, county: c.county, industry: c.industry,
      website: c.website, description: c.description, registrationNumber: c.registration_number, approvalStatus: c.approval_status,
      rejectionReason: c.rejection_reason, hasLogo: Boolean(c.logo_path), createdAt: c.created_at,
    }, documents, internships,
  });
}));

router.get('/companies/:id/documents/:docId/file', validate(z.object({ id: z.coerce.number().int().positive(), docId: z.coerce.number().int().positive() }), 'params'), asyncHandler(async (req, res) => {
  const d = await db('company_documents').where({ id: req.params.docId, company_id: req.params.id }).first();
  if (!d || !fs.existsSync(resolveStored(d.file_path))) throw new AppError(404, 'NOT_FOUND', 'Document not found.');
  await log(req, 'admin.document_viewed', 'company_document', d.id);
  res.set('Cache-Control', 'private, no-store').set('X-Content-Type-Options', 'nosniff')
    .set('Content-Disposition', `attachment; filename="${d.original_name || 'document'}"`).sendFile(resolveStored(d.file_path));
}));

router.post('/companies/:id/documents/:docId/verify', validate(z.object({ id: z.coerce.number().int().positive(), docId: z.coerce.number().int().positive() }), 'params'), validate(z.object({ verified: z.boolean() })), asyncHandler(async (req, res) => {
  const n = await db('company_documents').where({ id: req.params.docId, company_id: req.params.id })
    .update(req.body.verified ? { verified: true, verified_by: req.user.id, verified_at: db.fn.now() } : { verified: false, verified_by: null, verified_at: null });
  if (!n) throw new AppError(404, 'NOT_FOUND', 'Document not found.');
  await log(req, req.body.verified ? 'admin.document_verified' : 'admin.document_unverified', 'company_document', req.params.docId);
  res.json({ ok: true });
}));

async function companyDecision(req, res, status, { reasonRequired, action, title, body }) {
  const c = await getCompany(req.params.id);
  if (c.approval_status === status) throw new AppError(409, 'NO_CHANGE', `This company is already ${status}.`);
  const reason = req.body?.reason || null;
  await db.transaction(async (trx) => {
    await trx('company_profiles').where({ id: c.id }).update({
      approval_status: status, rejection_reason: status === 'approved' ? null : reason,
      ...(status === 'approved' ? { approved_by: req.user.id, approved_at: trx.fn.now() } : {}), updated_at: trx.fn.now(),
    });
    await audit({ actorId: req.user.id, action, entityType: 'company', entityId: c.id, before: { status: c.approval_status }, after: { status, reason }, ip: req.ip }, trx);
  });
  await tell(c.user_id, { type: `company_${status}`, title, body: `${body}${reason ? `\nReason: ${reason}` : ''}`, link: '/dashboard', ctaLabel: 'Open dashboard' });
  res.json({ ok: true, approvalStatus: status });
}
router.post('/companies/:id/approve', validate(idParam, 'params'), asyncHandler((req, res) => companyDecision(req, res, 'approved', { action: 'admin.company_approved', title: 'Your company has been approved', body: 'Your approved internship listings are now visible to interns.' })));
router.post('/companies/:id/reject', validate(idParam, 'params'), validate(reasonSchema), asyncHandler((req, res) => companyDecision(req, res, 'rejected', { action: 'admin.company_rejected', title: 'Company application update', body: 'We could not approve your company at this time. Update your details and contact support.' })));
router.post('/companies/:id/suspend', validate(idParam, 'params'), validate(reasonSchema), asyncHandler((req, res) => companyDecision(req, res, 'suspended', { action: 'admin.company_suspended', title: 'Your company account is suspended', body: 'Your listings are hidden while the account is suspended.' })));

const companyEdit = z.object({
  companyName: z.string().trim().min(2).max(160), phone: z.string().trim().max(20).optional().nullable(),
  address: z.string().trim().max(300).optional().nullable(), county: z.string().trim().max(60).optional().nullable(),
  industry: z.string().trim().max(120).optional().nullable(), website: z.string().trim().url().max(300).optional().nullable().or(z.literal('').transform(() => null)),
  description: z.string().trim().max(3000).optional().nullable(),
});
router.put('/companies/:id', validate(idParam, 'params'), validate(companyEdit), asyncHandler(async (req, res) => {
  const c = await getCompany(req.params.id);
  const b = req.body;
  await db('company_profiles').where({ id: c.id }).update({ company_name: b.companyName, phone: b.phone ?? null, address: b.address ?? null, county: b.county ?? null, industry: b.industry ?? null, website: b.website ?? null, description: b.description ?? null, updated_at: db.fn.now() });
  await log(req, 'admin.company_edited', 'company', c.id, { name: c.company_name }, { name: b.companyName });
  res.json({ ok: true });
}));

/* ---------- Internships ---------- */
const internshipList = paging.extend({ q: z.string().trim().max(100).optional(), status: z.enum(['pending_approval', 'approved', 'rejected', 'closed', 'draft']).optional(), companyId: z.coerce.number().int().positive().optional() });
router.get('/internships', validate(internshipList, 'query'), asyncHandler(async (req, res) => {
  const f = req.query;
  const base = () => {
    const q = db('internships as i').join('company_profiles as c', 'c.id', 'i.company_id').join('internship_categories as k', 'k.id', 'i.category_id');
    if (f.status) q.where('i.status', f.status);
    if (f.companyId) q.where('i.company_id', f.companyId);
    if (f.q) q.where((w) => w.whereILike('i.title', like(f.q)).orWhereILike('c.company_name', like(f.q)).orWhereILike('i.reference', like(f.q)));
    return q;
  };
  const [{ n }] = await base().count('i.id as n');
  const items = await base().orderByRaw("(i.status = 'pending_approval') DESC, i.created_at DESC").limit(f.limit).offset((f.page - 1) * f.limit)
    .select('i.id', 'i.reference', 'i.title', 'i.status', 'i.deadline', 'i.is_featured as isFeatured', 'i.created_at as createdAt', 'c.company_name as companyName',
      'c.approval_status as companyStatus', 'k.name as category', 'i.rejection_reason as rejectionReason',
      db.raw('(SELECT COUNT(*) FROM applications a WHERE a.internship_id = i.id)::int AS applicants'),
      db.raw("(i.status = 'approved' AND i.deadline < CURRENT_DATE) AS expired"));
  res.json({ items, total: Number(n), page: f.page, pages: pages(n, f.limit) });
}));

const getListing = async (id) => {
  const r = await db('internships').where({ id }).first();
  if (!r) throw new AppError(404, 'NOT_FOUND', 'Internship not found.');
  return r;
};
router.get('/internships/:id', validate(idParam, 'params'), asyncHandler(async (req, res) => {
  const r = await getListing(req.params.id);
  const c = await db('company_profiles').where({ id: r.company_id }).first('company_name', 'approval_status');
  res.json({ internship: shapeListing(r), company: { name: c.company_name, approvalStatus: c.approval_status } });
}));

router.put('/internships/:id', validate(idParam, 'params'), validate(listingSchema), asyncHandler(async (req, res) => {
  const r = await getListing(req.params.id);
  const cat = await db('internship_categories').where({ id: req.body.categoryId }).first();
  if (!cat) throw new AppError(422, 'VALIDATION_ERROR', 'Select a valid category.');
  await db('internships').where({ id: r.id }).update({ ...listingColumnsFor(req.body), updated_at: db.fn.now() });
  await log(req, 'admin.internship_edited', 'internship', r.id, { title: r.title }, { title: req.body.title });
  res.json({ internship: shapeListing(await getListing(r.id)) });
}));

async function listingDecision(req, res, { from, to, action, title, body, reason }) {
  const r = await getListing(req.params.id);
  if (!from.includes(r.status)) throw new AppError(409, 'BAD_STATE', `A listing that is "${r.status.replace('_', ' ')}" cannot be moved to "${to.replace('_', ' ')}".`);
  await db.transaction(async (trx) => {
    await trx('internships').where({ id: r.id }).update({
      status: to, rejection_reason: to === 'approved' ? null : reason || null, is_featured: to === 'approved' ? r.is_featured : false,
      ...(to === 'approved' ? { approved_by: req.user.id, approved_at: trx.fn.now() } : {}), updated_at: trx.fn.now(),
    });
    await audit({ actorId: req.user.id, action, entityType: 'internship', entityId: r.id, before: { status: r.status }, after: { status: to, reason }, ip: req.ip }, trx);
  });
  const c = await db('company_profiles').where({ id: r.company_id }).first('user_id');
  await tell(c.user_id, { type: `internship_${to}`, title, body: `${r.title} (${r.reference}): ${body}${reason ? `\nReason: ${reason}` : ''}`, link: '/dashboard/listings', ctaLabel: 'View listings' });
  res.json({ ok: true, status: to });
}
router.post('/internships/:id/approve', validate(idParam, 'params'), asyncHandler((req, res) => listingDecision(req, res, { from: ['pending_approval', 'rejected'], to: 'approved', action: 'admin.internship_approved', title: 'Your internship was approved', body: 'it is now visible to interns.' })));
router.post('/internships/:id/reject', validate(idParam, 'params'), validate(reasonSchema), asyncHandler((req, res) => listingDecision(req, res, { from: ['pending_approval', 'approved'], to: 'rejected', action: 'admin.internship_rejected', title: 'Internship not approved', body: 'it was not approved. Edit and resubmit it.', reason: req.body.reason })));

router.post('/internships/:id/feature', validate(idParam, 'params'), validate(z.object({ featured: z.boolean() })), asyncHandler(async (req, res) => {
  const r = await getListing(req.params.id);
  if (r.status !== 'approved') throw new AppError(409, 'BAD_STATE', 'Only approved listings can be featured.');
  await db('internships').where({ id: r.id }).update({ is_featured: req.body.featured, updated_at: db.fn.now() });
  await log(req, req.body.featured ? 'admin.internship_featured' : 'admin.internship_unfeatured', 'internship', r.id);
  res.json({ ok: true });
}));

router.delete('/internships/:id', validate(idParam, 'params'), validate(reasonSchema), asyncHandler(async (req, res) => {
  const r = await getListing(req.params.id);
  const [{ n }] = await db('applications').where({ internship_id: r.id }).count('* as n');
  const hasApps = Number(n) > 0;
  await db.transaction(async (trx) => {
    if (hasApps) await trx('internships').where({ id: r.id }).update({ status: 'closed', is_featured: false, rejection_reason: req.body.reason, updated_at: trx.fn.now() });
    else await trx('internships').where({ id: r.id }).del();
    await audit({ actorId: req.user.id, action: 'admin.internship_removed', entityType: 'internship', entityId: r.id, before: { status: r.status, title: r.title }, after: { mode: hasApps ? 'closed' : 'deleted', reason: req.body.reason }, ip: req.ip }, trx);
  });
  res.json({ ok: true, mode: hasApps ? 'closed' : 'deleted' });
}));

router.post('/internships/close-expired', asyncHandler(async (req, res) => {
  const n = await db('internships').where({ status: 'approved' }).whereRaw('deadline < CURRENT_DATE').update({ status: 'closed', is_featured: false, updated_at: db.fn.now() });
  await log(req, 'admin.expired_closed', 'internship', null, null, { count: n });
  res.json({ closed: n });
}));

/* ---------- Categories ---------- */
const slugify = (s) => s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
const catSchema = z.object({ name: z.string().trim().min(2, 'Enter a category name').max(80), isActive: z.boolean().optional(), sortOrder: z.coerce.number().int().min(0).max(1000).optional() });

router.get('/categories', asyncHandler(async (req, res) => {
  const items = await db('internship_categories as k').leftJoin('internships as i', 'i.category_id', 'k.id').groupBy('k.id').orderBy('k.sort_order')
    .select('k.id', 'k.name', 'k.slug', 'k.is_active as isActive', 'k.sort_order as sortOrder', db.raw('COUNT(i.id)::int AS internships'));
  res.json({ items });
}));
router.post('/categories', validate(catSchema), asyncHandler(async (req, res) => {
  const slug = slugify(req.body.name);
  if (!slug) throw new AppError(422, 'VALIDATION_ERROR', 'Enter a valid category name.', { name: 'Use letters or numbers' });
  const [{ m }] = await db('internship_categories').max('sort_order as m');
  const [row] = await db('internship_categories').insert({ name: req.body.name, slug, sort_order: (m ?? -1) + 1 }).returning('id');
  await log(req, 'admin.category_created', 'category', row.id ?? row, null, { name: req.body.name });
  res.status(201).json({ ok: true });
}));
router.put('/categories/:id', validate(idParam, 'params'), validate(catSchema), asyncHandler(async (req, res) => {
  const k = await db('internship_categories').where({ id: req.params.id }).first();
  if (!k) throw new AppError(404, 'NOT_FOUND', 'Category not found.');
  const slug = slugify(req.body.name);
  await db('internship_categories').where({ id: k.id }).update({ name: req.body.name, slug, ...(req.body.isActive !== undefined ? { is_active: req.body.isActive } : {}), ...(req.body.sortOrder !== undefined ? { sort_order: req.body.sortOrder } : {}) });
  await log(req, 'admin.category_updated', 'category', k.id, { name: k.name, isActive: k.is_active }, { name: req.body.name, isActive: req.body.isActive ?? k.is_active });
  res.json({ ok: true });
}));
router.delete('/categories/:id', validate(idParam, 'params'), asyncHandler(async (req, res) => {
  const k = await db('internship_categories').where({ id: req.params.id }).first();
  if (!k) throw new AppError(404, 'NOT_FOUND', 'Category not found.');
  const [{ n }] = await db('internships').where({ category_id: k.id }).count('* as n');
  if (Number(n) > 0) throw new AppError(409, 'IN_USE', 'This category has internships. Deactivate it instead so it is hidden from new listings.');
  await db('internship_categories').where({ id: k.id }).del();
  await log(req, 'admin.category_deleted', 'category', k.id, { name: k.name });
  res.json({ ok: true });
}));

/* ---------- Finance ---------- */
const payFilter = z.object({
  q: z.string().trim().max(100).optional(), status: z.enum(['pending', 'success', 'failed', 'cancelled']).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
const payBase = (f) => {
  const q = db('payments as p').join('users as u', 'u.id', 'p.user_id');
  if (f.status) q.where('p.status', f.status);
  if (f.from) q.whereRaw("(p.created_at AT TIME ZONE 'Africa/Nairobi')::date >= ?", [f.from]);
  if (f.to) q.whereRaw("(p.created_at AT TIME ZONE 'Africa/Nairobi')::date <= ?", [f.to]);
  if (f.q) q.where((w) => w.whereILike('p.mpesa_receipt', like(f.q)).orWhereILike('p.receipt_number', like(f.q)).orWhereILike('p.phone', like(f.q)).orWhereILike('u.email', like(f.q)).orWhereILike('u.full_name', like(f.q)).orWhereILike('p.checkout_request_id', like(f.q)));
  return q;
};
const payCols = ['p.id', 'p.amount', 'p.phone', 'p.status', 'p.mpesa_receipt as mpesaReceipt', 'p.receipt_number as receiptNumber', 'p.result_desc as resultDesc', 'p.created_at as createdAt', 'p.transaction_date as transactionDate', 'u.id as userId', 'u.full_name as name', 'u.email'];

router.get('/payments', validate(paging.merge(payFilter), 'query'), asyncHandler(async (req, res) => {
  const f = req.query;
  const [{ n }] = await payBase(f).count('p.id as n');
  const items = await payBase(f).orderBy('p.id', 'desc').limit(f.limit).offset((f.page - 1) * f.limit).select(payCols);
  const [t] = await payBase(f).select(db.raw("COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'success'),0)::float AS revenue"), db.raw("COUNT(*) FILTER (WHERE p.status = 'success')::int AS successful"));
  res.json({ items: items.map((r) => ({ ...r, amount: Number(r.amount) })), total: Number(n), page: f.page, pages: pages(n, f.limit), totals: t });
}));

router.get('/payments/export.csv', validate(payFilter, 'query'), asyncHandler(async (req, res) => {
  const rows = await payBase(req.query).orderBy('p.id', 'desc').limit(50000).select(payCols);
  const csv = toCsv(['Payment ID', 'Receipt number', 'M-Pesa code', 'Name', 'Email', 'Phone', 'Amount (KSh)', 'Status', 'Result', 'Created', 'Transaction date'],
    rows.map((r) => [r.id, r.receiptNumber, r.mpesaReceipt, r.name, r.email, r.phone, Number(r.amount), r.status, r.resultDesc, r.createdAt, r.transactionDate]));
  await log(req, 'admin.payments_exported', 'payment', null, null, { rows: rows.length, filters: req.query });
  res.set('Content-Type', 'text/csv; charset=utf-8').set('Content-Disposition', `attachment; filename="payments-${new Date().toISOString().slice(0, 10)}.csv"`).send(`\uFEFF${csv}`);
}));

router.get('/payments/:id', validate(idParam, 'params'), asyncHandler(async (req, res) => {
  const p = await db('payments as p').join('users as u', 'u.id', 'p.user_id').where('p.id', req.params.id).first(
    ...payCols, 'p.checkout_request_id as checkoutRequestId', 'p.merchant_request_id as merchantRequestId', 'p.result_code as resultCode');
  if (!p) throw new AppError(404, 'NOT_FOUND', 'Payment not found.');
  const flags = await db('audit_logs').where({ entity_type: 'payment', entity_id: String(p.id) }).orderBy('id').select('action', 'after', 'created_at as createdAt');
  res.json({ payment: { ...p, amount: Number(p.amount) }, trail: flags });
}));

router.get('/payments/:id/receipt', validate(idParam, 'params'), asyncHandler(async (req, res) => {
  const p = await db('payments as p').join('users as u', 'u.id', 'p.user_id').where({ 'p.id': req.params.id, 'p.status': 'success' }).first('p.*', 'u.full_name as payerName', 'u.email as payerEmail');
  if (!p) throw new AppError(404, 'NOT_FOUND', 'Receipt not found.');
  res.json({ receipt: { ...shapePayment(p), payer: { name: p.payerName, email: p.payerEmail }, description: 'Application access activation (one-time fee)', note: 'Payment activates application access. It does not guarantee an interview, placement or employment.' } });
}));

router.get('/revenue', asyncHandler(async (req, res) => {
  const daily = await db.raw(`SELECT d::date AS day, COALESCE(SUM(p.amount),0)::float AS revenue, COUNT(p.id)::int AS payments
    FROM generate_series((now() AT TIME ZONE 'Africa/Nairobi')::date - 29, (now() AT TIME ZONE 'Africa/Nairobi')::date, interval '1 day') d
    LEFT JOIN payments p ON p.status = 'success' AND (COALESCE(p.transaction_date, p.created_at) AT TIME ZONE 'Africa/Nairobi')::date = d::date
    GROUP BY d ORDER BY d`);
  const monthly = await db.raw(`SELECT to_char(m, 'YYYY-MM') AS month, COALESCE(SUM(p.amount),0)::float AS revenue, COUNT(p.id)::int AS payments
    FROM generate_series(date_trunc('month', now() AT TIME ZONE 'Africa/Nairobi') - interval '11 months', date_trunc('month', now() AT TIME ZONE 'Africa/Nairobi'), interval '1 month') m
    LEFT JOIN payments p ON p.status = 'success' AND date_trunc('month', COALESCE(p.transaction_date, p.created_at) AT TIME ZONE 'Africa/Nairobi') = m
    GROUP BY m ORDER BY m`);
  res.json({ daily: daily.rows, monthly: monthly.rows });
}));

/* ---------- Analytics ---------- */
const SERIES = {
  interns: ['users', 'created_at', "t.role = 'intern'"], companies: ['company_profiles', 'created_at', 'true'],
  internships: ['internships', 'created_at', 'true'], applications: ['applications', 'submitted_at', 'true'],
  payments: ['payments', 'created_at', "t.status = 'success'"],
};
router.get('/analytics', validate(z.object({ days: z.coerce.number().int().refine((v) => [7, 30, 90].includes(v), 'Use 7, 30 or 90').default(30) }), 'query'), asyncHandler(async (req, res) => {
  const days = req.query.days;
  const out = {};
  for (const [key, [table, col, where]] of Object.entries(SERIES)) {
    // table, column and condition come from the fixed map above, never from user input.
    const r = await db.raw(`SELECT d::date AS day, COUNT(t.id)::int AS n
      FROM generate_series((now() AT TIME ZONE 'Africa/Nairobi')::date - (?::int - 1), (now() AT TIME ZONE 'Africa/Nairobi')::date, interval '1 day') d
      LEFT JOIN ${table} t ON (t.${col} AT TIME ZONE 'Africa/Nairobi')::date = d::date AND ${where}
      GROUP BY d ORDER BY d`, [days]);
    out[key] = r.rows;
  }
  res.json({ days, series: out });
}));

/* ---------- Settings ---------- */
const settingsSchema = z.object({
  accessFee: z.coerce.number().int('Enter a whole number of shillings').min(1, 'Must be at least KSh 1').max(100000, 'Must be at most KSh 100,000'),
  minProfileCompletion: z.coerce.number().int().min(0).max(100),
});
router.get('/settings', asyncHandler(async (req, res) => {
  const rows = await db('admin_settings');
  const m = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  res.json({ settings: { accessFee: Number(m.access_fee ?? 199), minProfileCompletion: Number(m.min_profile_completion ?? 70), paymentModel: m.payment_model ?? 'one_time' } });
}));
router.put('/settings', validate(settingsSchema), asyncHandler(async (req, res) => {
  const before = Object.fromEntries((await db('admin_settings')).map((r) => [r.key, r.value]));
  await db.transaction(async (trx) => {
    for (const [key, value] of [['access_fee', String(req.body.accessFee)], ['min_profile_completion', String(req.body.minProfileCompletion)]]) {
      await trx('admin_settings').insert({ key, value, updated_by: req.user.id }).onConflict('key').merge({ value, updated_by: req.user.id, updated_at: trx.fn.now() });
    }
    await audit({ actorId: req.user.id, action: 'admin.settings_updated', entityType: 'settings', before: { accessFee: before.access_fee, minProfileCompletion: before.min_profile_completion }, after: req.body, ip: req.ip }, trx);
  });
  res.json({ ok: true });
}));

/* ---------- Audit log ---------- */
router.get('/audit', validate(paging.extend({ action: z.string().trim().max(60).optional(), q: z.string().trim().max(60).optional() }), 'query'), asyncHandler(async (req, res) => {
  const f = req.query;
  const base = () => {
    const q = db('audit_logs as a').leftJoin('users as u', 'u.id', 'a.actor_id');
    if (f.action) q.whereILike('a.action', like(f.action));
    if (f.q) q.where((w) => w.whereILike('u.email', like(f.q)).orWhere('a.entity_id', f.q));
    return q;
  };
  const [{ n }] = await base().count('a.id as n');
  const items = await base().orderBy('a.id', 'desc').limit(f.limit).offset((f.page - 1) * f.limit)
    .select('a.id', 'a.action', 'a.entity_type as entityType', 'a.entity_id as entityId', 'a.before', 'a.after', 'a.ip', 'a.created_at as createdAt', 'u.email as actor');
  res.json({ items, total: Number(n), page: f.page, pages: pages(n, f.limit) });
}));

export default router;
