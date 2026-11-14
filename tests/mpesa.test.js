import test from 'node:test';
import assert from 'node:assert/strict';
import { timestampEAT, buildPassword, mapResult, parseMpesaDate, parseCallback } from '../server/src/modules/payments/parse.js';

test('timestamp is 14 digits in Kenya time (UTC+3)', () => {
  assert.equal(timestampEAT(new Date('2026-11-02T21:30:05Z')), '20261103003005');
  assert.match(timestampEAT(), /^\d{14}$/);
});

test('password is base64(shortcode + passkey + timestamp)', () => {
  assert.equal(buildPassword('174379', 'abc', '20260101000000'), Buffer.from('174379abc20260101000000').toString('base64'));
});

test('result codes map to payment statuses', () => {
  assert.equal(mapResult(0), 'success');
  assert.equal(mapResult(1032), 'cancelled');
  assert.equal(mapResult(1), 'failed');
  assert.equal(mapResult(1037), 'failed');
});

test('M-Pesa dates parse as Kenya time', () => {
  assert.equal(parseMpesaDate('20260105123000').toISOString(), '2026-01-05T09:30:00.000Z');
  assert.equal(parseMpesaDate('garbage'), null);
});

test('parses a successful callback', () => {
  const body = { Body: { stkCallback: { MerchantRequestID: 'm1', CheckoutRequestID: 'ws_CO_1', ResultCode: 0, ResultDesc: 'ok',
    CallbackMetadata: { Item: [{ Name: 'Amount', Value: 199 }, { Name: 'MpesaReceiptNumber', Value: 'QWE123ABCD' }, { Name: 'TransactionDate', Value: 20260105123000 }, { Name: 'PhoneNumber', Value: 254712345678 }] } } } };
  const p = parseCallback(body);
  assert.equal(p.checkoutRequestId, 'ws_CO_1');
  assert.equal(p.resultCode, 0);
  assert.equal(p.amount, 199);
  assert.equal(p.receipt, 'QWE123ABCD');
  assert.ok(p.txDate instanceof Date);
});

test('parses a cancelled callback without metadata', () => {
  const p = parseCallback({ Body: { stkCallback: { MerchantRequestID: 'm', CheckoutRequestID: 'ws_2', ResultCode: 1032, ResultDesc: 'Request cancelled by user' } } });
  assert.equal(p.resultCode, 1032);
  assert.equal(p.amount, null);
  assert.equal(p.receipt, null);
});

test('rejects malformed callbacks', () => {
  assert.equal(parseCallback({}), null);
  assert.equal(parseCallback({ Body: { stkCallback: { ResultCode: 0 } } }), null);
  assert.equal(parseCallback(null), null);
});
