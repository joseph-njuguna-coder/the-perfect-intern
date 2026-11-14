import crypto from 'node:crypto';

export function newToken() {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, hash: hashToken(token) };
}
export const hashToken = (t) => crypto.createHash('sha256').update(t).digest('hex');
