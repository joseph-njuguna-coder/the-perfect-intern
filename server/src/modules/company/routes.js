import fs from 'node:fs';
import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../config/db.js';
import { COUNTIES } from '../../config/constants.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler, AppError } from '../../utils/errors.js';
import { audit } from '../../utils/audit.js';
import { notify, notifyAdmins } from '../notifications/service.js';
import applicantsRouter from '../applications/applicants.js';
import { uploader, verifyUpload, resolveStored, removeStored } from '../../utils/uploads.js';

const router = Router();
router.use(requireAuth, requireRole('company'));

/** Loads the signed-in user's company profile; every query below is scoped to its id. */
router.use(asyncHandler(async (req, res, next) => {
  req.company = await db('company_profiles').where({ user_id: req.user.id }).first();
  if (!req.company) throw new AppError(404, 'NO_COMPANY', 'Company profile not found.');
  next();
}));

const blank = (v) => (v === '' || v == null ? null : v);
const optText = (max) => z.preprocess(blank, z.string().trim().max(max).nullable().optional());
const url = z.preprocess(blank, z.string().trim().url('Enter a full link starting with https://').max(300)
  .refine((u) => /^https?:\/\//i.test(u), 'Enter a full link starting with https://').nullable().optional());

const shapeCompany = (c) => ({
  companyName: c.company_name, officialEmail: c.official_email, phone: c.phone, address: c.address, county: c.county,
  industry: c.industry, website: c.website, description: c.description, registrationNumber: c.registration_number,
  hasLogo: Boolean(c.logo_path), approvalStatus: c.approval_status, rejectionReason: c.rejection_reason,
});

/* ---------- Company profile ---------- */
const profileSchema = z.object({
  companyName: z.string().trim().min(2, 'Enter your company name').max(160),
  officialEmail: z.string().trim().toLowerCase().email('Enter a valid email address').max(254),
  phone: z.string().trim().min(9, 'Enter a phone number').max(20),
  address: z.string().trim().min(5, 'Enter your physical address').max(300),
  county: z.enum(COUNTIES, { errorMap: () => ({ message: 'Select a county' }) }),
  industry: z.string().trim().min(2, 'Select an industry').max(120),
  website: url,
  description: z.string().trim().min(30, 'Describe your company in at least 30 characters').max(3000),
  registrationNumber: optText(80),
});

router.get('/profile', asyncHandler(async (req, res) => res.json({ company: shapeCompany(req.company) })));

router.put('/profile', validate(profileSchema), asyncHandler(async (req, res) => {
  const b = req.body;
  await db.transaction(async (trx) => {
    await trx('company_profiles').where({ id: req.company.id }).update({
      company_name: b.companyName, official_email: b.officialEmail, phone: b.phone, address: b.address, county: b.county,
      industry: b.industry, website: b.website ?? null, description: b.description,
      registration_number: b.registrationNumber ?? null, updated_at: trx.fn.now(),
    });
    await audit({ actorId: req.user.id, action: 'company.profile_updated', entityType: 'company', entityId: req.company.id, ip: req.ip }, trx);
  });
  res.json({ company: shapeCompany(await db('company_profiles').where({ id: req.company.id }).first()) });
}));

router.post('/logo', (req, res, next) => uploader('logos', { kind: 'image', maxBytes: 2 * 1024 * 1024 })(req, res, next), asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError(422, 'NO_FILE', 'Choose a file to upload.');
  verifyUpload(req.file, 'image');
  const old = req.company.logo_path;
  await db('company_profiles').where({ id: req.company.id }).update({ logo_path: `logos/${req.file.filename}`, updated_at: db.fn.now() });
  removeStored(old);
  await audit({ actorId: req.user.id, action: 'company.logo_uploaded', entityType: 'company', entityId: req.company.id, ip: req.ip });
  res.json({ hasLogo: true });
}));

router.get('/logo', asyncHandler(async (req, res) => {
  if (!req.company.logo_path) throw new AppError(404, 'NO_FILE', 'No logo uploaded.');
  res.set('Cache-Control', 'private, no-cache').set('X-Content-Type-Options', 'nosniff').sendFile(resolveStored(req.company.logo_path));
}));

/* ---------- Verification documents ---------- */
const DOC_TYPES = ['certificate_of_incorporation', 'kra_pin', 'business_permit', 'cr12', 'other'];
const MAX_DOCS = 10;

router.get('/documents', asyncHandler(async (req, res) => {
  const items = await db('company_documents').where({ company_id: req.company.id }).orderBy('created_at', 'desc')
    .select('id', 'doc_type as docType', 'original_name as originalName', 'verified', 'created_at as createdAt');
  res.json({ items, docTypes: DOC_TYPES });
}));

router.post('/documents', (req, res, next) => uploader('company-docs', { kind: 'doc', maxBytes: 5 * 1024 * 1024 })(req, res, next), asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError(422, 'NO_FILE', 'Choose a file to upload.');
  try {
    verifyUpload(req.file, 'doc');
    const docType = z.enum(DOC_TYPES, { errorMap: () => ({ message: 'Select the document type' }) }).parse(req.body.docType);
    const [{ n }] = await db('company_documents').where({ company_id: req.company.id }).count('* as n');
    if (Number(n) >= MAX_DOCS) throw new AppError(422, 'TOO_MANY', `You can upload up to ${MAX_DOCS} documents. Delete one first.`);
    const original = req.file.originalname.replace(/[^\w.\- ]/g, '_').slice(0, 120);
    const [row] = await db('company_documents').insert({
      company_id: req.company.id, doc_type: docType, file_path: `company-docs/${req.file.filename}`, original_name: original,
    }).returning('id');
    await audit({ actorId: req.user.id, action: 'company.document_uploaded', entityType: 'company_document', entityId: row.id ?? row, ip: req.ip });
  } catch (err) { fs.rmSync(req.file.path, { force: true }); throw err; }
  res.status(201).json({ ok: true });
}));

const idParam = z.object({ id: z.coerce.number().int().positive() });

router.get('/documents/:id/file', validate(idParam, 'params'), asyncHandler(async (req, res) => {
  const d = await db('company_documents').where({ id: req.params.id, company_id: req.company.id }).first();
  if (!d) throw new AppError(404, 'NOT_FOUND', 'Document not found.');
  res.set('Cache-Control', 'private, no-store').set('X-Content-Type-Options', 'nosniff')
    .set('Content-Disposition', `attachment; filename="${d.original_name || 'document'}"`).sendFile(resolveStored(d.file_path));
}));

router.delete('/documents/:id', validate(idParam, 'params'), asyncHandler(async (req, res) => {
  const d = await db('company_documents').where({ id: req.params.id, company_id: req.company.id }).first();
  if (!d) throw new AppError(404, 'NOT_FOUND', 'Document not found.');
  if (d.verified) throw new AppError(409, 'VERIFIED', 'Verified documents cannot be deleted. Contact support if one is wrong.');
  await db('company_documents').where({ id: d.id }).del();
  removeStored(d.file_path);
  await audit({ actorId: req.user.id, action: 'company.document_deleted', entityType: 'company_document', entityId: d.id, ip: req.ip });
  res.json({ ok: true });
}));

/* ---------- Internship listings ---------- */
const today = () => new Date().toISOString().slice(0, 10);
const optDate = z.preprocess(blank, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date').nullable().optional());

const listingSchema = z.object({
  title: z.string().trim().min(4, 'Enter a title of at least 4 characters').max(150),
  department: optText(120),
  categoryId: z.coerce.number({ invalid_type_error: 'Select a category' }).int().positive('Select a category'),
  description: z.string().trim().min(50, 'Describe the internship in at least 50 characters').max(6000),
  responsibilities: z.string().trim().min(20, 'List the main responsibilities').max(4000),
  qualifications: z.string().trim().min(10, 'Describe the qualifications required').max(3000),
  skills: z.array(z.string().trim().min(1).max(40)).max(20, 'Add up to 20 skills').default([]),
  positions: z.coerce.number().int().min(1, 'At least 1 position').max(500),
  county: z.preprocess(blank, z.enum(COUNTIES).nullable().optional()),
  location: optText(200),
  workArrangement: z.enum(['remote', 'hybrid', 'physical'], { errorMap: () => ({ message: 'Select a work arrangement' }) }),
  durationMonths: z.coerce.number().int().min(1, 'At least 1 month').max(24, 'At most 24 months'),
  startDate: optDate,
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Select the application deadline'),
  isPaid: z.coerce.boolean().default(false),
  stipendAmount: z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().min(0).max(10000000).nullable().optional()),
  additionalRequirements: optText(2000),
}).superRefine((v, ctx) => {
  if (v.isPaid && !(v.stipendAmount > 0)) ctx.addIssue({ code: 'custom', path: ['stipendAmount'], message: 'Enter the monthly stipend for a paid internship' });
  if (v.workArrangement !== 'remote' && !v.county) ctx.addIssue({ code: 'custom', path: ['county'], message: 'Select the county for on-site or hybrid roles' });
  if (v.startDate && v.startDate < v.deadline) ctx.addIssue({ code: 'custom', path: ['startDate'], message: 'Start date must be on or after the deadline' });
});

const columns = (v) => ({
  category_id: v.categoryId, title: v.title, department: v.department ?? null, description: v.description,
  responsibilities: v.responsibilities, qualifications: v.qualifications, skills: [...new Set(v.skills)],
  positions: v.positions, county: v.county ?? null, location: v.location ?? null, work_arrangement: v.workArrangement,
  duration_months: v.durationMonths, start_date: v.startDate ?? null, deadline: v.deadline,
  is_paid: v.isPaid, stipend_amount: v.isPaid ? v.stipendAmount : null, additional_requirements: v.additionalRequirements ?? null,
});

const shapeListing = (r) => ({
  id: Number(r.id), reference: r.reference, title: r.title, department: r.department, categoryId: Number(r.category_id),
  description: r.description, responsibilities: r.responsibilities, qualifications: r.qualifications, skills: r.skills,
  positions: r.positions, county: r.county, location: r.location, workArrangement: r.work_arrangement,
  durationMonths: r.duration_months, startDate: r.start_date, deadline: r.deadline,
  isPaid: r.is_paid, stipendAmount: r.stipend_amount, additionalRequirements: r.additional_requirements,
  status: r.status, rejectionReason: r.rejection_reason, createdAt: r.created_at,
});

function assertCanPost(company) {
  if (['rejected', 'suspended'].includes(company.approval_status)) {
    throw new AppError(403, 'COMPANY_BLOCKED', 'Your company account cannot post internships. Contact support.');
  }
  if (!company.description || !company.address) {
    throw new AppError(422, 'PROFILE_INCOMPLETE', 'Complete your company profile (address and description) before posting.');
  }
}

router.get('/internships', asyncHandler(async (req, res) => {
  const items = await db('internships as i')
    .leftJoin('applications as a', 'a.internship_id', 'i.id')
    .join('internship_categories as k', 'k.id', 'i.category_id')
    .where('i.company_id', req.company.id)
    .groupBy('i.id', 'k.name')
    .orderBy('i.created_at', 'desc')
    .select('i.id', 'i.reference', 'i.title', 'i.status', 'i.deadline', 'i.positions', 'i.rejection_reason as rejectionReason',
      'i.created_at as createdAt', 'k.name as category', db.raw('COUNT(a.id)::int AS applicants'),
      db.raw("(i.status = 'approved' AND i.deadline < CURRENT_DATE) AS expired"));
  res.json({ items });
}));

router.get('/internships/:id', validate(idParam, 'params'), asyncHandler(async (req, res) => {
  const row = await db('internships').where({ id: req.params.id, company_id: req.company.id }).first();
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Internship not found.');
  res.json({ internship: shapeListing(row) });
}));

router.post('/internships', validate(listingSchema), asyncHandler(async (req, res) => {
  assertCanPost(req.company);
  if (req.body.deadline < today()) throw new AppError(422, 'VALIDATION_ERROR', 'The deadline cannot be in the past.', { deadline: 'Choose today or a later date' });
  const cat = await db('internship_categories').where({ id: req.body.categoryId, is_active: true }).first();
  if (!cat) throw new AppError(422, 'VALIDATION_ERROR', 'Select a valid category.');
  const reference = `INT-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const created = await db.transaction(async (trx) => {
    const [row] = await trx('internships').insert({ ...columns(req.body), reference, company_id: req.company.id, status: 'pending_approval' }).returning('*');
    await audit({ actorId: req.user.id, action: 'internship.created', entityType: 'internship', entityId: row.id, after: { reference, title: row.title }, ip: req.ip }, trx);
    await notify(req.user.id, { type: 'internship', title: 'Listing submitted for approval', body: `${row.title} will go live once an administrator approves it.`, link: '/dashboard/listings' }, trx);
    await notifyAdmins({ type: 'admin_listing_pending', title: 'Internship awaiting approval', body: `${row.title} from ${req.company.company_name}.`, link: '/dashboard/admin/internships?status=pending_approval' }, trx);
    return row;
  });
  res.status(201).json({ internship: shapeListing(created) });
}));

router.put('/internships/:id', validate(idParam, 'params'), validate(listingSchema), asyncHandler(async (req, res) => {
  assertCanPost(req.company);
  const row = await db('internships').where({ id: req.params.id, company_id: req.company.id }).first();
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Internship not found.');
  if (row.status === 'closed') throw new AppError(409, 'CLOSED', 'Closed listings cannot be edited.');
  const cat = await db('internship_categories').where({ id: req.body.categoryId, is_active: true }).first();
  if (!cat) throw new AppError(422, 'VALIDATION_ERROR', 'Select a valid category.');
  // Any edit to a live or rejected listing sends it back for approval so approved content cannot be swapped silently.
  const resubmit = ['approved', 'rejected'].includes(row.status);
  await db.transaction(async (trx) => {
    await trx('internships').where({ id: row.id }).update({
      ...columns(req.body), updated_at: trx.fn.now(),
      ...(resubmit ? { status: 'pending_approval', rejection_reason: null, approved_by: null, approved_at: null, is_featured: false } : {}),
    });
    if (resubmit) await notifyAdmins({ type: 'admin_listing_pending', title: 'Edited internship awaiting approval', body: `${row.title} from ${req.company.company_name}.`, link: '/dashboard/admin/internships?status=pending_approval' }, trx);
    await audit({ actorId: req.user.id, action: 'internship.updated', entityType: 'internship', entityId: row.id, before: { status: row.status }, after: { status: resubmit ? 'pending_approval' : row.status }, ip: req.ip }, trx);
  });
  const fresh = await db('internships').where({ id: row.id }).first();
  res.json({ internship: shapeListing(fresh), resubmitted: resubmit });
}));

router.post('/internships/:id/close', validate(idParam, 'params'), asyncHandler(async (req, res) => {
  const n = await db('internships').where({ id: req.params.id, company_id: req.company.id }).whereNot('status', 'closed').update({ status: 'closed', updated_at: db.fn.now() });
  if (!n) throw new AppError(404, 'NOT_FOUND', 'Internship not found or already closed.');
  await audit({ actorId: req.user.id, action: 'internship.closed', entityType: 'internship', entityId: req.params.id, ip: req.ip });
  res.json({ ok: true });
}));

router.delete('/internships/:id', validate(idParam, 'params'), asyncHandler(async (req, res) => {
  const row = await db('internships').where({ id: req.params.id, company_id: req.company.id }).first();
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Internship not found.');
  const [{ n }] = await db('applications').where({ internship_id: row.id }).count('* as n');
  if (Number(n) > 0) throw new AppError(409, 'HAS_APPLICATIONS', 'This listing has applications. Close it instead so applicants keep their history.');
  await db.transaction(async (trx) => {
    await trx('internships').where({ id: row.id }).del();
    await audit({ actorId: req.user.id, action: 'internship.deleted', entityType: 'internship', entityId: row.id, before: { reference: row.reference, title: row.title }, ip: req.ip }, trx);
  });
  res.json({ ok: true });
}));

router.use('/applications', applicantsRouter);

/* ---------- Dashboard ---------- */
router.get('/dashboard', asyncHandler(async (req, res) => {
  const cid = req.company.id;
  const [l] = await db('internships').where({ company_id: cid }).select(
    db.raw('COUNT(*)::int AS total'),
    db.raw("COUNT(*) FILTER (WHERE status = 'approved' AND deadline >= CURRENT_DATE)::int AS active"),
    db.raw("COUNT(*) FILTER (WHERE status = 'pending_approval')::int AS pending"),
  );
  const [a] = await db('applications as a').join('internships as i', 'i.id', 'a.internship_id').where('i.company_id', cid).select(
    db.raw('COUNT(*)::int AS total'),
    db.raw("COUNT(*) FILTER (WHERE a.status = 'shortlisted')::int AS shortlisted"),
    db.raw("COUNT(*) FILTER (WHERE a.status = 'interview_scheduled')::int AS interviews"),
    db.raw("COUNT(*) FILTER (WHERE a.status = 'selected')::int AS selected"),
  );
  const [{ n: docs }] = await db('company_documents').where({ company_id: cid }).count('* as n');
  res.json({
    company: shapeCompany(req.company),
    internships: l, applications: a, documents: Number(docs),
    profileComplete: Boolean(req.company.description && req.company.address && req.company.website !== undefined),
  });
}));

export { listingSchema, columns as listingColumnsFor, shapeListing };
export default router;
