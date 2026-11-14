import { db } from '../../config/db.js';

export async function notify(userId, { type, title, body = null, link = null }, trx = db) {
  await trx('notifications').insert({ user_id: userId, type, title, body, link });
}

/** In-app notification to every active administrator. */
export async function notifyAdmins({ type, title, body = null, link = null }, trx = db) {
  const admins = await trx('users').where({ role: 'admin', status: 'active' }).select('id');
  if (admins.length) await trx('notifications').insert(admins.map((a) => ({ user_id: a.id, type, title, body, link })));
}
