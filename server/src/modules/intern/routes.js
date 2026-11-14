import fs from 'node:fs';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../config/db.js';
import { COUNTIES } from '../../config/constants.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler, AppError } from '../../utils/errors.js';
import { audit } from '../../utils/audit.js';
import { uploader, verifyUpload, resolveStored, removeStored } from '../../utils/uploads.js';
import { liveInternships, listingColumns } from '../public/queries.js';
import { completion } from './completion.js';
import crypto from 'node:crypto';
import path from 'node:path';
import { uploadRoot } from '../../utils/uploads.js';
import { eligibility, tell, getSetting } from '../applications/service.js';
import { notify } from '../notifications/service.js';

const router = Router();
router.use(requireAuth, requireRole('intern'));

const QUALIFICATIONS = ['Certificate', 'Diploma', 'Higher National Diploma', "Bachelor's degree", "Master's degree", 'Other'];
const blank = (v) => (v === '' || v == null ? null : v);
const optText = (max) => z.preprocess(blank, z.string().trim().max(max).nullable().optional());
const optUrl = z.preprocess(blank, z.string().trim().url('Enter a full link starting with https://').max(300)
  .refine((u) => /^https?:\/\//i.test(u), 'Enter a full link starting with https://').nullable().optional());

const profileSchema = z.object({
  institution: optText(160), course: optText(160),
  qualificationLevel: z.preprocess(blank, z.enum(QUALIFICATIONS).nullable().optional()),
  graduationYear: z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().int().min(1990, 'Enter a valid year').max(2040, 'Enter a valid year').nullable().optional()),
  skills: z.array(z.string().trim().min(1).max(40)).max(20, 'Add up to 20 skills').default([]),
  careerInterests: z.array(z.string().trim().min(1).max(80)).max(8, 'Choose up to 8 interests').default([]),
  experience: optText(3000),
  preferredCounty: z.preprocess(blank, z.enum(COUNTIES).nullable().optional()),
  preferredWorkArrangement: z.preprocess(blank, z.enum(['remote', 'hybrid', 'physical']).nullable().optional()),
  linkedinUrl: optUrl, portfolioUrl: optUrl,
});

const shape = (p) => ({
  institution: p.institution, course: p.course, qualificationLevel: p.qualification_level,
  graduationYear: p.graduation_year, skills: p.skills, careerInterests: p.career_interests,
  experience: p.experience, preferredCounty: p.preferred_county, preferredWorkArrangement: p.preferred_work_arrangement,
  linkedinUrl: p.linkedin_url, portfolioUrl: p.portfolio_url, hasPhoto: Boolean(p.photo_path), hasCv: Boolean(p.cv_path),
  completion: completion(p),
});

const getProfile = (userId, trx = db) => trx('intern_profiles').where({ user_id: userId }).first();

async function saveCompletion(userId, trx = db) {
  const p = await getProfile(userId, trx);
  const { pct } = completion(p);
  await trx('intern_profiles').where({ user_id: userId }).update({ completion_pct: pct, updated_at: trx.fn.now() });
  return p;
}

router.get('/profile', asyncHandler(async (req, res) => {
  res.json({ profile: shape(await getProfile(req.user.id)), qualifications: QUALIFICATIONS });
}));

router.put('/profile', validate(profileSchema), asyncHandler(async (req, res) => {
  const b = req.body;
  await db.transaction(async (trx) => {
    await trx('intern_profiles').where({ user_id: req.user.id }).update({
      institution: b.institution ?? null, course: b.course ?? null, qualification_level: b.qualificationLevel ?? null,
      graduation_year: b.graduationYear ?? null, skills: [...new Set(b.skills)], career_interests: [...new Set(b.careerInterests)],
      experience: b.experience ?? null, preferred_county: b.preferredCounty ?? null,
      preferred_work_arrangement: b.preferredWorkArrangement ?? null, linkedin_url: b.linkedinUrl ?? null, portfolio_url: b.portfolioUrl ?? null,
    });
    await saveCompletion(req.user.id, trx);
    await audit({ actorId: req.user.id, action: 'intern.profile_updated', entityType: 'intern_profile', entityId: req.user.id, ip: req.ip }, trx);
  });
  res.json({ profile: shape(await getProfile(req.user.id)) });
}));

function fileRoute(path, { column, folder, kind, maxBytes, action }) {
  router.post(path, (req, res, next) => uploader(folder, { kind, maxBytes })(req, res, next), asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError(422, 'NO_FILE', 'Choose a file to upload.');
    verifyUpload(req.file, kind);
    const rel = `${folder}/${req.file.filename}`;
    const old = (await getProfile(req.user.id))[column];
    await db.transaction(async (trx) => {
      await trx('intern_profiles').where({ user_id: req.user.id }).update({ [column]: rel });
      await saveCompletion(req.user.id, trx);
      await audit({ actorId: req.user.id, action, entityType: 'intern_profile', entityId: req.user.id, ip: req.ip }, trx);
    });
    removeStored(old);
    res.json({ profile: shape(await getProfile(req.user.id)) });
  }));

  router.get(path, asyncHandler(async (req, res) => {
    const rel = (await getProfile(req.user.id))[column];
    if (!rel) throw new AppError(404, 'NO_FILE', 'Nothing uploaded yet.');
    const full = resolveStored(rel);
    if (!fs.existsSync(full)) throw new AppError(404, 'NO_FILE', 'Nothing uploaded yet.');
    res.set('Cache-Control', 'private, no-store').set('X-Content-Type-Options', 'nosniff');
    if (kind === 'pdf') res.set('Content-Disposition', 'attachment; filename="cv.pdf"');
    res.sendFile(full);
  }));
}
fileRoute('/profile/photo', { column: 'photo_path', folder: 'photos', kind: 'image', maxBytes: 2 * 1024 * 1024, action: 'intern.photo_uploaded' });
fileRoute('/profile/cv', { column: 'cv_path', folder: 'cvs', kind: 'pdf', maxBytes: 5 * 1024 * 1024, action: 'intern.cv_uploaded' });

/* ---------- Saved internships ---------- */
router.get('/saved', asyncHandler(async (req, res) => {
  const items = await liveInternships()
    .join('saved_internships as s', 's.internship_id', 'i.id').where('s.intern_id', req.user.id)
    .select(listingColumns).orderBy('s.created_at', 'desc');
  res.json({ items });
}));
router.get('/saved/ids', asyncHandler(async (req, res) => {
  const rows = await db('saved_internships').where({ intern_id: req.user.id }).select('internship_id');
  res.json({ ids: rows.map((r) => Number(r.internship_id)) });
}));
const idParam = z.object({ id: z.coerce.number().int().positive() });
router.post('/saved/:id', validate(idParam, 'params'), asyncHandler(async (req, res) => {
  const ok = await liveInternships().where('i.id', req.params.id).first('i.id');
  if (!ok) throw new AppError(404, 'NOT_FOUND', 'That internship is no longer available.');
  await db('saved_internships').insert({ intern_id: req.user.id, internship_id: req.params.id }).onConflict(['intern_id', 'internship_id']).ignore();
  res.status(201).json({ saved: true });
}));
router.delete('/saved/:id', validate(idParam, 'params'), asyncHandler(async (req, res) => {
  await db('saved_internships').where({ intern_id: req.user.id, internship_id: req.params.id }).del();
  res.json({ saved: false });
}));

/* ---------- Applications (history; submission arrives in Phase 5) ---------- */
router.get('/applications', asyncHandler(async (req, res) => {
  const items = await db('applications as a')
    .join('internships as i', 'i.id', 'a.internship_id')
    .join('company_profiles as c', 'c.id', 'i.company_id')
    .where('a.intern_id', req.user.id)
    .orderBy('a.submitted_at', 'desc')
    .select('a.id', 'a.reference', 'a.status', 'i.id as internshipId', 'a.submitted_at as submittedAt', 'a.interview_at as interviewAt',
      'i.title', 'c.company_name as companyName');
  res.json({ items });
}));

/* ---------- Apply ---------- */
router.get('/internships/:id/eligibility', validate(idParam, 'params'), asyncHandler(async (req, res) => {
  const e = await eligibility(req.user, req.params.id);
  const accessFee = Number(await getSetting('access_fee', '199'));
  if (e.ok) return res.json({ eligible: true, accessFee });
  res.json({ eligible: false, code: e.code, message: e.message, pct: e.pct, min: e.min, missing: e.missing, reference: e.reference, applicationStatus: e.applicationStatus, accessFee });
}));

const applySchema = z.object({
  internshipId: z.coerce.number().int().positive(),
  coverLetter: z.string().trim().min(50, 'Write at least 50 characters about why you are a good fit').max(3000, 'Keep it under 3000 characters'),
});

router.post('/applications', validate(applySchema), asyncHandler(async (req, res) => {
  const { internshipId, coverLetter } = req.body;
  const e = await eligibility(req.user, internshipId);
  if (!e.ok) throw new AppError(e.status, e.code, e.message, e.pct != null ? { pct: e.pct, min: e.min } : undefined);

  // Snapshot the CV so later replacement or deletion cannot change what the company receives.
  fs.mkdirSync(path.join(uploadRoot, 'applications'), { recursive: true });
  const rel = `applications/${crypto.randomUUID()}.pdf`;
  fs.copyFileSync(resolveStored(e.profile.cv_path), resolveStored(rel));

  const reference = `APP-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  let app;
  try {
    app = await db.transaction(async (trx) => {
      const [row] = await trx('applications').insert({
        reference, internship_id: internshipId, intern_id: req.user.id, cover_letter: coverLetter, cv_path: rel,
      }).returning('*');
      await notify(req.user.id, { type: 'application', title: 'Application submitted', body: `${e.internship.title} at ${e.internship.companyName} (${reference})`, link: '/dashboard/applications' }, trx);
      await audit({ actorId: req.user.id, action: 'application.submitted', entityType: 'application', entityId: row.id, after: { reference, internshipId }, ip: req.ip }, trx);
      return row;
    });
  } catch (err) {
    removeStored(rel);
    if (err.code === '23505') throw new AppError(409, 'ALREADY_APPLIED', 'You have already applied to this internship.');
    throw err;
  }
  // Emails and the company notification happen after the commit; failures never undo the application.
  await tell(req.user.id, { type: 'application_submitted', title: 'Application submitted', body: `Your application for ${e.internship.title} at ${e.internship.companyName} was received.\nReference: ${reference}`, link: '/dashboard/applications', ctaLabel: 'Track application' });
  await tell(e.internship.companyUserId, { type: 'application_received', title: 'New application received', body: `${req.user.full_name} applied for ${e.internship.title}.\nReference: ${reference}`, link: `/dashboard/applicants/${app.id}`, ctaLabel: 'Review application' });
  res.status(201).json({ application: { id: Number(app.id), reference, status: app.status } });
}));

const WITHDRAWABLE = ['submitted', 'under_review', 'shortlisted', 'interview_scheduled'];
router.post('/applications/:id/withdraw', validate(idParam, 'params'), asyncHandler(async (req, res) => {
  const a = await db('applications as a').join('internships as i', 'i.id', 'a.internship_id').join('company_profiles as c', 'c.id', 'i.company_id')
    .where({ 'a.id': req.params.id, 'a.intern_id': req.user.id })
    .first('a.id', 'a.status', 'a.reference', 'i.title', 'c.user_id as companyUserId');
  if (!a) throw new AppError(404, 'NOT_FOUND', 'Application not found.');
  if (!WITHDRAWABLE.includes(a.status)) throw new AppError(409, 'NOT_WITHDRAWABLE', 'This application can no longer be withdrawn.');
  await db.transaction(async (trx) => {
    await trx('applications').where({ id: a.id }).update({ status: 'withdrawn', updated_at: trx.fn.now() });
    await audit({ actorId: req.user.id, action: 'application.withdrawn', entityType: 'application', entityId: a.id, before: { status: a.status }, after: { status: 'withdrawn' }, ip: req.ip }, trx);
    await notify(a.companyUserId, { type: 'application_withdrawn', title: 'Application withdrawn', body: `${req.user.full_name} withdrew application ${a.reference} for ${a.title}.`, link: `/dashboard/applicants/${a.id}` }, trx);
  });
  res.json({ ok: true });
}));

/* ---------- Dashboard summary ---------- */
router.get('/dashboard', asyncHandler(async (req, res) => {
  const uid = req.user.id;
  const p = await getProfile(uid);
  const counts = await db('applications').where({ intern_id: uid }).select('status').count('* as n').groupBy('status');
  const by = Object.fromEntries(counts.map((r) => [r.status, Number(r.n)]));
  const total = Object.values(by).reduce((a, b) => a + b, 0);

  const interests = p.career_interests.length ? p.career_interests : [''];
  const recommended = await liveInternships()
    .whereNotExists(db('applications as a').whereRaw('a.internship_id = i.id').where('a.intern_id', uid))
    .select(listingColumns)
    .select(db.raw(
      '(CASE WHEN k.slug = ANY(?::text[]) THEN 3 ELSE 0 END) + (CASE WHEN i.county = ? THEN 2 ELSE 0 END) + (CASE WHEN i.work_arrangement = ? THEN 1 ELSE 0 END) AS score',
      [interests, p.preferred_county ?? '', p.preferred_work_arrangement ?? ''],
    ))
    .orderBy([{ column: 'score', order: 'desc' }, { column: 'i.created_at', order: 'desc' }]).limit(6);

  const [{ n: saved }] = await db('saved_internships').where({ intern_id: uid }).count('* as n');
  const [{ n: unread }] = await db('notifications').where({ user_id: uid }).whereNull('read_at').count('* as n');
  const recent = await db('applications as a')
    .join('internships as i', 'i.id', 'a.internship_id').join('company_profiles as c', 'c.id', 'i.company_id')
    .where('a.intern_id', uid).orderBy('a.submitted_at', 'desc').limit(5)
    .select('a.reference', 'a.status', 'a.submitted_at as submittedAt', 'i.title', 'c.company_name as companyName');

  res.json({
    completion: completion(p),
    accessActivated: Boolean(req.user.access_activated_at),
    stats: {
      total, pending: (by.submitted || 0) + (by.under_review || 0), shortlisted: by.shortlisted || 0,
      interviews: by.interview_scheduled || 0, selected: by.selected || 0, saved: Number(saved), unread: Number(unread),
    },
    recommended: recommended.map(({ score, ...r }) => r),
    recent,
  });
}));

export default router;
