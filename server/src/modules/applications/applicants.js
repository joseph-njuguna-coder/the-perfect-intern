import fs from 'node:fs';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../config/db.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler, AppError } from '../../utils/errors.js';
import { audit } from '../../utils/audit.js';
import { resolveStored } from '../../utils/uploads.js';
import { tell } from './service.js';

/** Mounted under /api/company/applications. req.company is set by the parent router. */
const router = Router();
const idParam = z.object({ id: z.coerce.number().int().positive() });

// Every query joins through internships.company_id = the signed-in company, so other companies' data is unreachable.
const mine = (req) => db('applications as a')
  .join('internships as i', 'i.id', 'a.internship_id')
  .join('users as u', 'u.id', 'a.intern_id')
  .join('intern_profiles as p', 'p.user_id', 'a.intern_id')
  .where('i.company_id', req.company.id);

const STATUSES = ['submitted', 'under_review', 'shortlisted', 'interview_scheduled', 'selected', 'rejected', 'withdrawn'];

const listSchema = z.object({
  internshipId: z.coerce.number().int().positive().optional(),
  status: z.enum(STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

router.get('/', validate(listSchema, 'query'), asyncHandler(async (req, res) => {
  const f = req.query;
  const filt = (q) => { if (f.internshipId) q.where('a.internship_id', f.internshipId); if (f.status) q.where('a.status', f.status); return q; };
  const [{ n }] = await filt(mine(req)).count('a.id as n');
  const items = await filt(mine(req)).orderBy('a.submitted_at', 'desc').limit(f.limit).offset((f.page - 1) * f.limit)
    .select('a.id', 'a.reference', 'a.status', 'a.submitted_at as submittedAt', 'a.interview_at as interviewAt',
      'u.full_name as name', 'u.county', 'p.institution', 'p.course', 'p.qualification_level as qualification',
      'i.id as internshipId', 'i.title as internshipTitle');
  res.json({ items, total: Number(n), page: f.page, pages: Math.max(1, Math.ceil(Number(n) / f.limit)) });
}));

router.get('/:id', validate(idParam, 'params'), asyncHandler(async (req, res) => {
  const r = await mine(req).where('a.id', req.params.id).first(
    'a.id', 'a.reference', 'a.status', 'a.cover_letter as coverLetter', 'a.submitted_at as submittedAt',
    'a.interview_at as interviewAt', 'a.interview_notes as interviewNotes', 'a.company_notes as companyNotes',
    'u.full_name as name', 'u.email', 'u.phone', 'u.county',
    'p.institution', 'p.course', 'p.qualification_level as qualification', 'p.graduation_year as graduationYear',
    'p.skills', 'p.career_interests as careerInterests', 'p.experience', 'p.linkedin_url as linkedinUrl',
    'p.portfolio_url as portfolioUrl', 'p.preferred_county as preferredCounty', 'p.preferred_work_arrangement as preferredWorkArrangement',
    db.raw('(p.photo_path IS NOT NULL) AS "hasPhoto"'), 'i.id as internshipId', 'i.title as internshipTitle',
  );
  if (!r) throw new AppError(404, 'NOT_FOUND', 'Application not found.');
  // Opening an untouched application marks it as under review, so the intern sees progress.
  if (r.status === 'submitted') {
    await db('applications').where({ id: r.id }).update({ status: 'under_review', updated_at: db.fn.now() });
    await audit({ actorId: req.user.id, action: 'application.viewed', entityType: 'application', entityId: r.id, before: { status: 'submitted' }, after: { status: 'under_review' }, ip: req.ip });
    const owner = await db('applications').where({ id: r.id }).first('intern_id');
    await tell(owner.intern_id, { type: 'application_status', title: 'Application under review', body: `${r.internshipTitle}: the company is now reviewing your application (${r.reference}).`, link: '/dashboard/applications' });
    r.status = 'under_review';
  }
  res.json({ application: r });
}));

router.get('/:id/cv', validate(idParam, 'params'), asyncHandler(async (req, res) => {
  const r = await mine(req).where('a.id', req.params.id).first('a.id', 'a.cv_path', 'a.reference');
  if (!r || !fs.existsSync(resolveStored(r.cv_path))) throw new AppError(404, 'NOT_FOUND', 'CV not found.');
  await audit({ actorId: req.user.id, action: 'application.cv_downloaded', entityType: 'application', entityId: r.id, ip: req.ip });
  res.set('Cache-Control', 'private, no-store').set('X-Content-Type-Options', 'nosniff')
    .set('Content-Disposition', `attachment; filename="cv-${r.reference}.pdf"`).sendFile(resolveStored(r.cv_path));
}));

router.get('/:id/photo', validate(idParam, 'params'), asyncHandler(async (req, res) => {
  const r = await mine(req).where('a.id', req.params.id).first('p.photo_path');
  if (!r?.photo_path || !fs.existsSync(resolveStored(r.photo_path))) throw new AppError(404, 'NOT_FOUND', 'No photo.');
  res.set('Cache-Control', 'private, no-store').set('X-Content-Type-Options', 'nosniff').sendFile(resolveStored(r.photo_path));
}));

/* Allowed company-driven transitions. Withdrawn is intern-only; selected and rejected are final. */
const TRANSITIONS = {
  submitted: ['under_review', 'shortlisted', 'rejected'],
  under_review: ['shortlisted', 'rejected'],
  shortlisted: ['interview_scheduled', 'selected', 'rejected'],
  interview_scheduled: ['interview_scheduled', 'selected', 'rejected'],
  selected: [], rejected: [], withdrawn: [],
};

const statusSchema = z.object({
  status: z.enum(['under_review', 'shortlisted', 'interview_scheduled', 'selected', 'rejected']),
  interviewAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Choose the interview date and time').optional(),
  interviewNotes: z.string().trim().max(1000).optional(),
  message: z.string().trim().max(1500).optional(),
}).superRefine((v, ctx) => {
  if (v.status === 'interview_scheduled' && !v.interviewAt) ctx.addIssue({ code: 'custom', path: ['interviewAt'], message: 'Choose the interview date and time' });
});

router.put('/:id/status', validate(idParam, 'params'), validate(statusSchema), asyncHandler(async (req, res) => {
  const { status, interviewAt, interviewNotes, message } = req.body;
  const a = await mine(req).where('a.id', req.params.id).first('a.id', 'a.status', 'a.reference', 'a.intern_id as internId', 'i.title');
  if (!a) throw new AppError(404, 'NOT_FOUND', 'Application not found.');
  if (!TRANSITIONS[a.status].includes(status)) {
    throw new AppError(409, 'BAD_TRANSITION', `An application that is "${a.status.replace('_', ' ')}" cannot be moved to "${status.replace('_', ' ')}".`);
  }
  let when = null;
  if (status === 'interview_scheduled') {
    when = new Date(`${interviewAt}:00+03:00`); // Kenya time (UTC+3, no daylight saving)
    if (Number.isNaN(when.getTime()) || when <= new Date()) throw new AppError(422, 'VALIDATION_ERROR', 'The interview must be in the future.', { interviewAt: 'Choose a future date and time' });
  }
  await db.transaction(async (trx) => {
    await trx('applications').where({ id: a.id }).update({
      status, updated_at: trx.fn.now(),
      ...(status === 'interview_scheduled' ? { interview_at: when, interview_notes: interviewNotes || null } : {}),
    });
    await audit({ actorId: req.user.id, action: 'application.status_changed', entityType: 'application', entityId: a.id, before: { status: a.status }, after: { status }, ip: req.ip }, trx);
  });

  const extra = message ? `\n\nMessage from the company:\n${message}` : '';
  const text = {
    under_review: [`Application under review`, `${a.title}: the company is reviewing your application (${a.reference}).`],
    shortlisted: ['You have been shortlisted', `Good news. You were shortlisted for ${a.title} (${a.reference}).${extra}`],
    interview_scheduled: ['Interview scheduled', `Your interview for ${a.title} is on ${when?.toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', dateStyle: 'full', timeStyle: 'short' })} (Kenya time).${interviewNotes ? `\nDetails: ${interviewNotes}` : ''}${extra}`],
    selected: ['Congratulations, you were selected', `You were selected for ${a.title} (${a.reference}). The company will contact you about next steps.${extra}`],
    rejected: ['Application update', `Thank you for applying for ${a.title} (${a.reference}). The company has decided not to move forward with your application.${extra}`],
  }[status];
  await tell(a.internId, { type: 'application_status', title: text[0], body: text[1], link: '/dashboard/applications', ctaLabel: 'View application' });
  res.json({ ok: true, status });
}));

const noteSchema = z.object({ companyNotes: z.string().trim().max(2000).default('') });
router.put('/:id/notes', validate(idParam, 'params'), validate(noteSchema), asyncHandler(async (req, res) => {
  const n = await mine(req).where('a.id', req.params.id).update({ company_notes: req.body.companyNotes || null, updated_at: db.fn.now() });
  if (!n) throw new AppError(404, 'NOT_FOUND', 'Application not found.');
  res.json({ ok: true });
}));

const msgSchema = z.object({ message: z.string().trim().min(2, 'Write a message').max(1500) });
router.post('/:id/message', validate(idParam, 'params'), validate(msgSchema), asyncHandler(async (req, res) => {
  const a = await mine(req).where('a.id', req.params.id).first('a.id', 'a.reference', 'a.status', 'a.intern_id as internId', 'i.title');
  if (!a) throw new AppError(404, 'NOT_FOUND', 'Application not found.');
  if (a.status === 'withdrawn') throw new AppError(409, 'WITHDRAWN', 'The applicant withdrew this application.');
  await audit({ actorId: req.user.id, action: 'application.message_sent', entityType: 'application', entityId: a.id, ip: req.ip });
  await tell(a.internId, { type: 'application_message', title: `Message about ${a.title}`, body: `${req.company.company_name} wrote:\n${req.body.message}`, link: '/dashboard/notifications', ctaLabel: 'Open notifications' });
  res.json({ ok: true });
}));

export default router;
