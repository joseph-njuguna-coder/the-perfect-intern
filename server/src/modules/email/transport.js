import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';
import { parseFrom } from './address.js';

export { parseFrom };

/**
 * Email delivery, selectable with EMAIL_PROVIDER:
 *   smtp   (default)  nodemailer over SMTP. Many hosts block SMTP ports (Render's free tier blocks 25/465/587).
 *   brevo             Brevo's HTTPS API (port 443, never blocked). Needs BREVO_API_KEY and a verified sender.
 *   resend            Resend's HTTPS API. Needs RESEND_API_KEY and a verified sending domain.
 * Every call has a short timeout so a blocked network cannot hang a sign-up request for minutes.
 */
const TIMEOUT_MS = 12000;

const smtp = env.mail.provider === 'smtp' && env.smtp.host
  ? nodemailer.createTransport({
      host: env.smtp.host, port: env.smtp.port, secure: env.smtp.secure,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
      connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
    })
  : null;

async function postJson(url, headers, body, label) {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json', ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 300);
    throw new Error(`${label} rejected the email (${res.status}): ${detail}`);
  }
}

const SMTP_BLOCKED = new Set(['ETIMEDOUT', 'ESOCKET', 'ECONNREFUSED', 'ECONNECTION', 'EDNS']);

/** Sends one email or throws an Error with a human-readable reason. Returns false if no provider is configured (dev). */
export async function deliver({ to, subject, html, text }) {
  const from = parseFrom(env.mailFrom);
  if (env.mail.provider === 'brevo') {
    if (!env.mail.brevoApiKey) throw new Error('EMAIL_PROVIDER=brevo but BREVO_API_KEY is empty');
    await postJson('https://api.brevo.com/v3/smtp/email', { 'api-key': env.mail.brevoApiKey },
      { sender: { name: from.name || undefined, email: from.email }, to: [{ email: to }], subject, htmlContent: html, textContent: text }, 'Brevo');
    return true;
  }
  if (env.mail.provider === 'resend') {
    if (!env.mail.resendApiKey) throw new Error('EMAIL_PROVIDER=resend but RESEND_API_KEY is empty');
    await postJson('https://api.resend.com/emails', { authorization: `Bearer ${env.mail.resendApiKey}` },
      { from: env.mailFrom, to: [to], subject, html, text }, 'Resend');
    return true;
  }
  if (!smtp) return false;
  try {
    await smtp.sendMail({ from: env.mailFrom, to, subject, html, text });
  } catch (err) {
    if (SMTP_BLOCKED.has(err.code) || /timeout/i.test(err.message)) {
      throw new Error(`${err.message}. Could not reach the SMTP server on port ${env.smtp.port}: the host may block outbound SMTP (Render's free tier does). Use EMAIL_PROVIDER=brevo or resend, which send over HTTPS.`);
    }
    throw err;
  }
  return true;
}
