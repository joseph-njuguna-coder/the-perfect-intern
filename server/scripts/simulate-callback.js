// Offline helper: posts a fake Daraja STK callback to your local server.
// Usage: node scripts/simulate-callback.js <CheckoutRequestID> [--cancel] [--fail] [--amount 199] [--receipt QWE123ABCD]
import 'dotenv/config';
import crypto from 'node:crypto';

const [id, ...flags] = process.argv.slice(2);
if (!id) { console.error('Usage: node scripts/simulate-callback.js <CheckoutRequestID> [--cancel|--fail] [--amount N] [--receipt CODE]'); process.exit(1); }
const flag = (n) => flags.includes(`--${n}`);
const val = (n, d) => (flags.includes(`--${n}`) ? flags[flags.indexOf(`--${n}`) + 1] : d);
const secret = process.env.MPESA_CALLBACK_SECRET;
if (!secret) { console.error('Set MPESA_CALLBACK_SECRET in .env first.'); process.exit(1); }

const resultCode = flag('cancel') ? 1032 : flag('fail') ? 1 : 0;
const eat = new Date(Date.now() + 3 * 3600 * 1000).toISOString().replace(/\D/g, '').slice(0, 14);
const body = {
  Body: { stkCallback: {
    MerchantRequestID: `sim-${crypto.randomBytes(4).toString('hex')}`, CheckoutRequestID: id, ResultCode: resultCode,
    ResultDesc: resultCode === 0 ? 'The service request is processed successfully.' : resultCode === 1032 ? 'Request cancelled by user' : 'The balance is insufficient for the transaction',
    ...(resultCode === 0 ? { CallbackMetadata: { Item: [
      { Name: 'Amount', Value: Number(val('amount', 199)) },
      { Name: 'MpesaReceiptNumber', Value: val('receipt', `SIM${crypto.randomBytes(4).toString('hex').toUpperCase()}`) },
      { Name: 'TransactionDate', Value: Number(eat) },
      { Name: 'PhoneNumber', Value: 254712345678 },
    ] } } : {}),
  } },
};
const url = `http://localhost:${process.env.PORT || 4000}/api/payments/mpesa/callback/${secret}`;
const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
console.log(res.status, await res.text());
