import { db } from '../config/db.js';
import { AppError } from '../utils/errors.js';

/** Loads the signed-in user from the session; rejects suspended or missing accounts. */
export async function requireAuth(req, res, next) {
  try {
    const id = req.session?.userId;
    if (!id) throw new AppError(401, 'UNAUTHENTICATED', 'Please sign in to continue.');
    const user = await db('users').where({ id }).first();
    if (!user || user.status !== 'active') {
      req.session.destroy(() => {});
      throw new AppError(401, 'UNAUTHENTICATED', 'Please sign in to continue.');
    }
    req.user = user;
    next();
  } catch (err) { next(err); }
}

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new AppError(403, 'FORBIDDEN', 'You do not have access to this resource.'));
  }
  next();
};
