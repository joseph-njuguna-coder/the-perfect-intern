import crypto from 'node:crypto';
import { AppError } from '../utils/errors.js';

export function issueCsrfToken(req, res) {
  if (!req.session.csrf) req.session.csrf = crypto.randomBytes(24).toString('hex');
  res.json({ token: req.session.csrf });
}

export function csrfProtect(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const sent = Buffer.from(req.get('x-csrf-token') || '');
  const expected = Buffer.from(req.session?.csrf || '');
  if (!expected.length || sent.length !== expected.length || !crypto.timingSafeEqual(sent, expected)) {
    return next(new AppError(403, 'CSRF_INVALID', 'Your session expired. Please refresh and try again.'));
  }
  next();
}
