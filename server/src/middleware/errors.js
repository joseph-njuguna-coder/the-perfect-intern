import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';
import { env } from '../config/env.js';

export function notFound(req, res, next) {
  next(new AppError(404, 'NOT_FOUND', 'Resource not found'));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    const fields = {};
    for (const issue of err.issues) fields[issue.path.join('.') || '_'] = issue.message;
    return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Please correct the highlighted fields.', fields } });
  }
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, fields: err.details && typeof err.details === 'object' ? err.details : undefined } });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: { code: 'FILE_TOO_LARGE', message: 'That file is too large.' } });
  }
  if (err.code === '23505') { // unique violation
    return res.status(409).json({ error: { code: 'DUPLICATE', message: 'That record already exists.' } });
  }
  console.error(err);
  res.status(500).json({ error: { code: 'SERVER_ERROR', message: env.isProd ? 'Something went wrong. Please try again.' : err.message } });
}
