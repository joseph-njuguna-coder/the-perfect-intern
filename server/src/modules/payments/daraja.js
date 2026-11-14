import crypto from 'node:crypto';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/errors.js';
import { timestampEAT, buildPassword } from './parse.js';

const BASE = { sandbox: 'https://sandbox.safaricom.co.ke', production: 'https://api.safaricom.co.ke' };
const cfg = env.mpesa;
let tokenCache = { token: null, expires: 0 };

function assertConfigured() {
  const missing = ['consumerKey', 'consumerSecret', 'shortcode', 'passkey', 'callbackUrl', 'callbackSecret'].filter((k) => !cfg[k]);
  if (missing.length) {
    console.error(`M-Pesa is not configured. Missing: ${missing.join(', ')}`);
    throw new AppError(503, 'PAYMENTS_NOT_CONFIGURED', 'Payments are temporarily unavailable. Please try again later.');
  }
}

async function getToken() {
  if (tokenCache.token && tokenCache.expires > Date.now() + 30000) return tokenCache.token;
  const auth = Buffer.from(`${cfg.consumerKey}:${cfg.consumerSecret}`).toString('base64');
  const res = await fetch(`${BASE[cfg.env]}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` }, signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) throw new Error(`Daraja auth failed (${res.status})`);
  tokenCache = { token: data.access_token, expires: Date.now() + Number(data.expires_in || 3000) * 1000 };
  return tokenCache.token;
}

async function post(path, body) {
  const token = await getToken();
  const res = await fetch(`${BASE[cfg.env]}${path}`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(20000),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

/** Sends the STK Push prompt. Returns the Safaricom request ids; throws on any failure to initiate. */
export async function stkPush({ phone, amount, reference, description }) {
  if (cfg.mock) {
    const id = crypto.randomBytes(6).toString('hex');
    return { merchantRequestId: `mock-m-${id}`, checkoutRequestId: `ws_CO_MOCK_${id}` };
  }
  assertConfigured();
  const timestamp = timestampEAT();
  const { ok, data } = await post('/mpesa/stkpush/v1/processrequest', {
    BusinessShortCode: cfg.shortcode,
    Password: buildPassword(cfg.shortcode, cfg.passkey, timestamp),
    Timestamp: timestamp,
    TransactionType: cfg.transactionType,
    Amount: amount,
    PartyA: phone,
    PartyB: cfg.partyB || cfg.shortcode,
    PhoneNumber: phone,
    CallBackURL: `${cfg.callbackUrl}/${cfg.callbackSecret}`,
    AccountReference: String(reference).slice(0, 12),
    TransactionDesc: String(description).slice(0, 13),
  });
  if (!ok || data.ResponseCode !== '0' || !data.CheckoutRequestID) {
    throw new Error(data.errorMessage || data.ResponseDescription || 'STK Push was rejected');
  }
  return { merchantRequestId: data.MerchantRequestID, checkoutRequestId: data.CheckoutRequestID };
}

/**
 * Asks Safaricom for the outcome of a prompt. Returns { resultCode, resultDesc }, or null while it is still processing
 * or if the query itself fails (the caller then just tries again later). The query response carries no receipt number.
 */
export async function stkQuery(checkoutRequestId) {
  if (cfg.mock) return null;
  assertConfigured();
  const timestamp = timestampEAT();
  try {
    const { ok, data } = await post('/mpesa/stkpushquery/v1/query', {
      BusinessShortCode: cfg.shortcode, Password: buildPassword(cfg.shortcode, cfg.passkey, timestamp),
      Timestamp: timestamp, CheckoutRequestID: checkoutRequestId,
    });
    if (!ok || data.ResultCode === undefined) return null; // e.g. "transaction is being processed"
    return { resultCode: Number(data.ResultCode), resultDesc: String(data.ResultDesc || '') };
  } catch (err) {
    console.error('STK query failed:', err.message);
    return null;
  }
}

export const isMock = cfg.mock;
