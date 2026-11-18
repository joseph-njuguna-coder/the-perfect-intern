// Checks your M-Pesa (Daraja) settings and sends ONE real STK Push request, printing Daraja's exact answer.
// Usage (from /server, with the MPESA_* values in .env):  npm run test:mpesa -- 0708374149 1
//   arg 1 = phone (sandbox test number 254708374149, or your own Safaricom number), arg 2 = amount (default 1)
// The callback goes to MPESA_CALLBACK_URL (e.g. your Render app). It matches no payment row, so the app just ignores it.
import 'dotenv/config';
import { env } from '../src/config/env.js';
import { stkPush } from '../src/modules/payments/daraja.js';
import { normaliseKenyanPhone } from '../src/utils/phone.js';

const m = env.mpesa;
const missing = ['consumerKey', 'consumerSecret', 'shortcode', 'passkey', 'callbackUrl', 'callbackSecret'].filter((k) => !m[k]);
console.log(`Environment : ${m.env}${m.mock ? '   (MPESA_MOCK=true: NOTHING will be sent to Safaricom)' : ''}`);
console.log(`Shortcode   : ${m.shortcode || 'MISSING'}   Type: ${m.transactionType}${m.partyB ? `   PartyB: ${m.partyB}` : ''}`);
console.log(`Callback URL: ${m.callbackUrl || 'MISSING'}/${m.callbackSecret ? '<secret>' : 'MISSING'}`);
console.log(`Credentials : key ${m.consumerKey ? 'set' : 'MISSING'}, secret ${m.consumerSecret ? 'set' : 'MISSING'}, passkey ${m.passkey ? 'set' : 'MISSING'}`);
if (m.allowedIps.length) console.log(`Note        : MPESA_ALLOWED_IPS is set (${m.allowedIps.length}). Leave it EMPTY in the sandbox or callbacks will be rejected.`);
if (!m.callbackUrl.startsWith('https://')) console.log('Warning     : the callback URL must be public HTTPS.');
if (missing.length) { console.error(`\nMissing settings: ${missing.join(', ')}`); process.exit(1); }

const phone = normaliseKenyanPhone(process.argv[2]);
const amount = Number(process.argv[3] || 1);
if (!phone) { console.error('\nGive a Kenyan phone number, e.g. npm run test:mpesa -- 0708374149 1'); process.exit(1); }
if (!(amount >= 1)) { console.error('\nAmount must be at least 1.'); process.exit(1); }

console.log(`\nSending STK Push for KSh ${amount} to ${phone} ...`);
try {
  const r = await stkPush({ phone, amount, reference: 'TPI-TEST', description: 'Test' });
  console.log('OK. Safaricom accepted the request.');
  console.log(`  CheckoutRequestID: ${r.checkoutRequestId}`);
  console.log(`  MerchantRequestID: ${r.merchantRequestId}`);
  console.log('\nNext: watch your Render Logs for "POST /api/payments/mpesa/callback/..." (status 200 = good, 404 = secret mismatch, 403 = IP allow-list).');
} catch (err) {
  console.error(`FAILED: ${err.message}`);
  console.error('Common causes: wrong consumer key/secret, the Daraja app lacks "Lipa Na M-Pesa Sandbox", or the shortcode and passkey do not belong together.');
  process.exit(1);
}
process.exit(0);
