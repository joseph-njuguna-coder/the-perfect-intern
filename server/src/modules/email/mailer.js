import { db } from '../../config/db.js';
import { deliver } from './transport.js';

/** In-memory outbox used only when NODE_ENV=test, so integration tests can read verification links. */
export const mailbox = [];

/** Sends an email and records it in email_logs. Never throws: failures are logged with the reason. */
export async function sendEmail({ userId = null, to, subject, html, text, template }) {
  const [log] = await db('email_logs').insert({ user_id: userId, to_email: to, subject, template }).returning('id');
  const logId = log.id ?? log;
  try {
    if (process.env.NODE_ENV === 'test') {
      mailbox.push({ to, subject, text, template });
    } else if (!(await deliver({ to, subject, html, text }))) {
      console.log(`\n[email:dev] To: ${to}\nSubject: ${subject}\n${text}\n`); // no provider configured: print instead
    }
    await db('email_logs').where({ id: logId }).update({ status: 'sent', sent_at: db.fn.now() });
  } catch (err) {
    console.error('Email failed:', err.message);
    await db('email_logs').where({ id: logId }).update({ status: 'failed', error: err.message.slice(0, 500) });
  }
}
