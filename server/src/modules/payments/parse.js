/** Pure helpers (no env or DB access) so they can be unit tested. */

/** Kenya has no daylight saving, so EAT is always UTC+3. */
export const timestampEAT = (d = new Date()) => new Date(d.getTime() + 3 * 3600 * 1000).toISOString().replace(/\D/g, '').slice(0, 14);

export const buildPassword = (shortcode, passkey, timestamp) => Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

/** Daraja result codes: 0 success, 1032 cancelled by the customer, everything else a failure. */
export function mapResult(code) {
  if (code === 0) return 'success';
  if (code === 1032) return 'cancelled';
  return 'failed';
}

/** "20260101123456" (EAT) to a Date. */
export function parseMpesaDate(v) {
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(String(v ?? ''));
  return m ? new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}+03:00`) : null;
}

/** Extracts the fields we need from a Daraja STK callback body; returns null if it is not a usable callback. */
export function parseCallback(body) {
  const cb = body?.Body?.stkCallback;
  if (!cb || typeof cb.CheckoutRequestID !== 'string' || cb.ResultCode === undefined) return null;
  const items = Object.fromEntries((cb.CallbackMetadata?.Item || []).map((i) => [i.Name, i.Value]));
  return {
    checkoutRequestId: cb.CheckoutRequestID,
    merchantRequestId: cb.MerchantRequestID || null,
    resultCode: Number(cb.ResultCode),
    resultDesc: String(cb.ResultDesc || '').slice(0, 300),
    amount: items.Amount != null ? Number(items.Amount) : null,
    receipt: items.MpesaReceiptNumber ? String(items.MpesaReceiptNumber) : null,
    txDate: parseMpesaDate(items.TransactionDate),
  };
}
