import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { db } from '../../config/db.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler, AppError } from '../../utils/errors.js';
import { normaliseKenyanPhone } from '../../utils/phone.js';
import { limitsOff } from '../../middleware/rateLimit.js';
import { initiate, statusFor, shape } from './service.js';

const router = Router();
router.use(requireAuth, requireRole('intern'));

const payLimiter = rateLimit({ skip: limitsOff, windowMs: 10 * 60 * 1000, limit: 6, standardHeaders: true, legacyHeaders: false, message: { error: { code: 'RATE_LIMITED', message: 'Too many payment attempts. Please wait a few minutes.' } } });
const idParam = z.object({ id: z.coerce.number().int().positive() });
const initSchema = z.object({
  phone: z.string().trim().transform((v, ctx) => {
    const n = normaliseKenyanPhone(v);
    if (!n) ctx.addIssue({ code: 'custom', message: 'Enter the Safaricom number to pay with, e.g. 0712345678' });
    return n;
  }),
});

router.post('/initiate', payLimiter, validate(initSchema), asyncHandler(async (req, res) => {
  const out = await initiate(req.user, req.body.phone, req.ip);
  res.status(out.resumed ? 200 : 201).json(out);
}));

router.get('/', asyncHandler(async (req, res) => {
  const rows = await db('payments').where({ user_id: req.user.id }).orderBy('id', 'desc').limit(50);
  res.json({ items: rows.map(shape) });
}));

router.get('/:id/status', validate(idParam, 'params'), asyncHandler(async (req, res) => {
  res.json(await statusFor(req.user, req.params.id));
}));

router.get('/:id/receipt', validate(idParam, 'params'), asyncHandler(async (req, res) => {
  const p = await db('payments').where({ id: req.params.id, user_id: req.user.id }).first();
  if (!p || p.status !== 'success') throw new AppError(404, 'NOT_FOUND', 'Receipt not found.');
  res.json({
    receipt: {
      ...shape(p), payer: { name: req.user.full_name, email: req.user.email },
      description: 'Application access activation (one-time fee)',
      note: 'Payment activates application access. It does not guarantee an interview, placement or employment.',
    },
  });
}));

export default router;
