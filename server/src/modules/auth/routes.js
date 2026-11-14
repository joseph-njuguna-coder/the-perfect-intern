import { Router } from 'express';
import crypto from 'node:crypto';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { loginLimiter, emailLimiter } from '../../middleware/rateLimit.js';
import { asyncHandler } from '../../utils/errors.js';
import * as schemas from './schemas.js';
import * as service from './service.js';

const router = Router();
const REGISTERED = { message: 'Account created. Check your email for a verification link.' };

router.post('/register/intern', emailLimiter, validate(schemas.registerInternSchema), asyncHandler(async (req, res) => {
  await service.register('intern', req.body, req.ip);
  res.status(201).json(REGISTERED);
}));

router.post('/register/company', emailLimiter, validate(schemas.registerCompanySchema), asyncHandler(async (req, res) => {
  await service.register('company', req.body, req.ip);
  res.status(201).json(REGISTERED);
}));

router.post('/verify-email', validate(schemas.tokenSchema), asyncHandler(async (req, res) => {
  await service.verifyEmail(req.body.token, req.ip);
  res.json({ message: 'Email verified. You can now sign in.' });
}));

router.post('/resend-verification', emailLimiter, validate(schemas.emailOnlySchema), asyncHandler(async (req, res) => {
  await service.resendVerification(req.body.email);
  res.json({ message: 'If that account needs verification, a new link is on its way.' });
}));

router.post('/login', loginLimiter, validate(schemas.loginSchema), asyncHandler(async (req, res) => {
  const user = await service.login(req.body, req.ip);
  // Regenerate the session on privilege change to prevent fixation.
  await new Promise((resolve, reject) => req.session.regenerate((e) => (e ? reject(e) : resolve())));
  req.session.userId = user.id;
  req.session.role = user.role;
  req.session.csrf = crypto.randomBytes(24).toString('hex');
  res.json({ user: await service.profileSummary(user), csrfToken: req.session.csrf });
}));

router.post('/logout', asyncHandler(async (req, res) => {
  await new Promise((resolve) => req.session.destroy(() => resolve()));
  res.clearCookie('tpi.sid');
  res.json({ message: 'Signed out.' });
}));

router.post('/forgot-password', emailLimiter, validate(schemas.emailOnlySchema), asyncHandler(async (req, res) => {
  await service.forgotPassword(req.body.email);
  res.json({ message: 'If an account exists for that email, a reset link is on its way.' });
}));

router.post('/reset-password', emailLimiter, validate(schemas.resetSchema), asyncHandler(async (req, res) => {
  await service.resetPassword(req.body.token, req.body.password, req.ip);
  res.json({ message: 'Password updated. Sign in with your new password.' });
}));

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  res.json({ user: await service.profileSummary(req.user) });
}));

export default router;
