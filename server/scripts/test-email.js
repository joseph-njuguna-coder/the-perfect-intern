// Sends one test email with your current settings and prints exactly why it failed, if it does.
// Usage (from /server, with your .env filled in):  npm run test:email -- you@example.com
import 'dotenv/config';
import { env } from '../src/config/env.js';
import { deliver, parseFrom } from '../src/modules/email/transport.js';

const to = process.argv[2];
if (!to) { console.error('Usage: npm run test:email -- you@example.com'); process.exit(1); }

const from = parseFrom(env.mailFrom);
console.log(`Provider : ${env.mail.provider}`);
if (env.mail.provider === 'smtp') console.log(`SMTP     : ${env.smtp.host || '(not set)'}:${env.smtp.port} secure=${env.smtp.secure} user=${env.smtp.user ? 'set' : '(none)'}`);
else console.log(`API key  : ${(env.mail.provider === 'brevo' ? env.mail.brevoApiKey : env.mail.resendApiKey) ? 'set' : 'MISSING'}`);
console.log(`From     : ${from.name} <${from.email}>   To: ${to}\n`);

const started = Date.now();
try {
  const sent = await deliver({ to, subject: 'The Perfect Intern: email test', text: 'If you can read this, email delivery works.', html: '<p>If you can read this, <strong>email delivery works</strong>.</p>' });
  console.log(sent ? `OK: accepted in ${Date.now() - started} ms. Check the inbox (and spam).` : 'No provider configured (SMTP_HOST empty): nothing was sent.');
} catch (err) {
  console.error(`FAILED after ${Date.now() - started} ms:\n${err.message}`);
  process.exit(1);
}
process.exit(0);
