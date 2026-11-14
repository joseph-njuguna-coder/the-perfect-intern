import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../config/db.js';
import { COUNTIES } from '../../config/constants.js';
import { validate } from '../../middleware/validate.js';
import { contactLimiter } from '../../middleware/rateLimit.js';
import { asyncHandler, AppError } from '../../utils/errors.js';
import { resolveStored } from '../../utils/uploads.js';
import { sendEmail } from '../email/mailer.js';
import { env } from '../../config/env.js';
import { liveInternships, listingColumns } from './queries.js';

const router = Router();

const columns = listingColumns;

router.get('/categories', asyncHandler(async (req, res) => {
  const rows = await db('internship_categories as k')
    .leftJoin('internships as i', function join() {
      this.on('i.category_id', 'k.id').andOn(db.raw("i.status = 'approved' AND i.deadline >= CURRENT_DATE"));
    })
    .where('k.is_active', true)
    .groupBy('k.id')
    .orderBy('k.sort_order')
    .select('k.id', 'k.name', 'k.slug', db.raw('COUNT(i.id)::int AS count'));
  res.json({ categories: rows });
}));

router.get('/counties', (req, res) => res.json({ counties: COUNTIES }));

const listSchema = z.object({
  q: z.string().trim().max(100).optional(),
  county: z.string().trim().max(60).optional(),
  category: z.string().trim().max(80).optional(),
  company: z.coerce.number().int().positive().optional(),
  paid: z.enum(['true', 'false']).optional(),
  arrangement: z.enum(['remote', 'hybrid', 'physical']).optional(),
  maxDuration: z.coerce.number().int().positive().max(24).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

router.get('/internships', validate(listSchema, 'query'), asyncHandler(async (req, res) => {
  const f = req.query;
  const apply = (q) => {
    if (f.q) {
      const like = `%${f.q.replace(/[%_]/g, '\\$&')}%`;
      q.where((w) => w.whereILike('i.title', like).orWhereILike('i.description', like).orWhereILike('c.company_name', like));
    }
    if (f.county) q.where('i.county', f.county);
    if (f.category) q.where('k.slug', f.category);
    if (f.company) q.where('c.id', f.company);
    if (f.paid) q.where('i.is_paid', f.paid === 'true');
    if (f.arrangement) q.where('i.work_arrangement', f.arrangement);
    if (f.maxDuration) q.where('i.duration_months', '<=', f.maxDuration);
    return q;
  };
  const [{ count }] = await apply(liveInternships()).count('i.id as count');
  const items = await apply(liveInternships()).select(columns)
    .orderBy('i.created_at', 'desc').limit(f.limit).offset((f.page - 1) * f.limit);
  res.json({ items, total: Number(count), page: f.page, pages: Math.max(1, Math.ceil(Number(count) / f.limit)) });
}));

router.get('/internships/featured', asyncHandler(async (req, res) => {
  const featured = await liveInternships().where('i.is_featured', true).select(columns).orderBy('i.created_at', 'desc').limit(6);
  let items = featured;
  if (items.length < 6) {
    const ids = items.map((r) => r.id);
    const more = await liveInternships().whereNotIn('i.id', ids.length ? ids : [0])
      .select(columns).orderBy('i.created_at', 'desc').limit(6 - items.length);
    items = [...items, ...more];
  }
  res.json({ items });
}));

router.get('/internships/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw new AppError(404, 'NOT_FOUND', 'Internship not found.');
  const r = await liveInternships().where('i.id', id).first(
    ...columns, 'i.department', 'i.description', 'i.responsibilities', 'i.qualifications', 'i.positions',
    'i.start_date as startDate', 'i.additional_requirements as additionalRequirements',
    'c.description as companyDescription', 'c.website as companyWebsite', 'c.industry as companyIndustry',
    'c.county as companyCounty', db.raw('(c.logo_path IS NOT NULL) AS "hasLogo"'),
  );
  if (!r) throw new AppError(404, 'NOT_FOUND', 'This internship is closed or no longer available.');
  res.json({ internship: r });
}));

router.get('/companies/featured', asyncHandler(async (req, res) => {
  const rows = await db('company_profiles as c')
    .join('users as u', 'u.id', 'c.user_id')
    .leftJoin('internships as i', function join() {
      this.on('i.company_id', 'c.id').andOn(db.raw("i.status = 'approved' AND i.deadline >= CURRENT_DATE"));
    })
    .where('c.approval_status', 'approved').where('u.status', 'active')
    .groupBy('c.id')
    .orderByRaw('COUNT(i.id) DESC, c.company_name')
    .limit(8)
    .select('c.id', 'c.company_name as name', 'c.industry', 'c.county', db.raw('COUNT(i.id)::int AS openings'));
  res.json({ companies: rows });
}));

router.get('/companies/:id/logo', asyncHandler(async (req, res) => {
  const c = await db('company_profiles').where({ id: Number(req.params.id) || 0, approval_status: 'approved' }).whereNotNull('logo_path').first();
  if (!c) throw new AppError(404, 'NOT_FOUND', 'No logo.');
  res.set('Cache-Control', 'public, max-age=3600').set('X-Content-Type-Options', 'nosniff').sendFile(resolveStored(c.logo_path));
}));

router.get('/stats', asyncHandler(async (req, res) => {
  const one = async (q) => Number((await q.count('* as n').first()).n);
  const [interns, companies, openings, applications] = await Promise.all([
    one(db('users').where({ role: 'intern', status: 'active' })),
    one(db('company_profiles').where({ approval_status: 'approved' })),
    one(liveInternships()),
    one(db('applications')),
  ]);
  res.json({ interns, companies, openings, applications });
}));

const contactSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(120),
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(254),
  subject: z.string().trim().max(160).optional(),
  message: z.string().trim().min(10, 'Write at least 10 characters').max(3000),
});

router.post('/contact', contactLimiter, validate(contactSchema), asyncHandler(async (req, res) => {
  const { name, email, subject, message } = req.body;
  await db('contact_messages').insert({ name, email, subject: subject || null, message });
  if (env.adminNotifyEmail) {
    await sendEmail({
      to: env.adminNotifyEmail, template: 'contact_form',
      subject: `Contact form: ${subject || 'New message'}`,
      text: `From: ${name} <${email}>\n\n${message}`,
      html: `<p><strong>${name}</strong> &lt;${email}&gt;</p><pre style="font-family:inherit;white-space:pre-wrap">${message.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))}</pre>`,
    });
  }
  res.status(201).json({ message: 'Thanks. We have your message and will reply by email.' });
}));

router.get('/settings', asyncHandler(async (req, res) => {
  const rows = await db('admin_settings').whereIn('key', ['access_fee', 'payment_model']);
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  res.json({ accessFee: Number(map.access_fee ?? 199), paymentModel: map.payment_model ?? 'one_time' });
}));

export default router;
