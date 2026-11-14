import 'dotenv/config';

const required = ['DATABASE_URL', 'SESSION_SECRET'];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
}
if (process.env.NODE_ENV === 'production' && process.env.SESSION_SECRET.length < 32) {
  throw new Error('SESSION_SECRET must be at least 32 characters in production');
}

const mpesaMock = process.env.MPESA_MOCK === 'true';
const emailProvider = (process.env.EMAIL_PROVIDER || 'smtp').toLowerCase();
if (!['smtp', 'brevo', 'resend'].includes(emailProvider)) throw new Error('EMAIL_PROVIDER must be smtp, brevo or resend');
if (process.env.NODE_ENV === 'production') {
  const configured = emailProvider === 'brevo' ? process.env.BREVO_API_KEY : emailProvider === 'resend' ? process.env.RESEND_API_KEY : process.env.SMTP_HOST;
  if (!configured) throw new Error('Email is not configured: set SMTP_HOST (EMAIL_PROVIDER=smtp), or EMAIL_PROVIDER=brevo with BREVO_API_KEY, or EMAIL_PROVIDER=resend with RESEND_API_KEY');
}
if (process.env.NODE_ENV === 'production') {
  if (!/^https:\/\//.test(process.env.APP_URL || '')) throw new Error('APP_URL must be an https:// URL in production');
  if (process.env.MPESA_ENV === 'production') {
    const missing = ['MPESA_CONSUMER_KEY', 'MPESA_CONSUMER_SECRET', 'MPESA_SHORTCODE', 'MPESA_PASSKEY', 'MPESA_CALLBACK_URL'].filter((k) => !process.env[k]);
    if (missing.length) throw new Error(`MPESA_ENV=production requires: ${missing.join(', ')}`);
    if (!/^https:\/\//.test(process.env.MPESA_CALLBACK_URL)) throw new Error('MPESA_CALLBACK_URL must be https://');
    if ((process.env.MPESA_CALLBACK_SECRET || '').length < 32) throw new Error('MPESA_CALLBACK_SECRET must be at least 32 characters in production (openssl rand -hex 32)');
  }
}
if (process.env.NODE_ENV === 'production' && mpesaMock) {
  throw new Error('MPESA_MOCK must never be enabled in production');
}

export const env = {
  isProd: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT || 4000),
  appUrl: process.env.APP_URL || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL,
  sessionSecret: process.env.SESSION_SECRET,
  mail: { provider: emailProvider, brevoApiKey: process.env.BREVO_API_KEY || '', resendApiKey: process.env.RESEND_API_KEY || '' },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  mpesa: {
    mock: mpesaMock,
    env: process.env.MPESA_ENV === 'production' ? 'production' : 'sandbox',
    consumerKey: process.env.MPESA_CONSUMER_KEY || '',
    consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
    shortcode: process.env.MPESA_SHORTCODE || '',
    partyB: process.env.MPESA_PARTY_B || '',
    passkey: process.env.MPESA_PASSKEY || '',
    transactionType: process.env.MPESA_TRANSACTION_TYPE || 'CustomerPayBillOnline',
    callbackUrl: (process.env.MPESA_CALLBACK_URL || '').replace(/\/+$/, ''),
    callbackSecret: process.env.MPESA_CALLBACK_SECRET || '',
    allowedIps: (process.env.MPESA_ALLOWED_IPS || '').split(',').map((v) => v.trim()).filter(Boolean),
  },
  serveClient: process.env.SERVE_CLIENT === 'true',
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  mailFrom: process.env.MAIL_FROM || 'The Perfect Intern <no-reply@localhost>',
  adminNotifyEmail: process.env.ADMIN_NOTIFY_EMAIL || '',
};
