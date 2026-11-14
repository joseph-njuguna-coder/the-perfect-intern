import { db } from '../../config/db.js';
import { AppError } from '../../utils/errors.js';
import { audit } from '../../utils/audit.js';
import { notify } from '../notifications/service.js';
import { getSetting, tell } from '../applications/service.js';
import { stkPush, stkQuery } from './daraja.js';
import { mapResult } from './parse.js';

const PENDING_RESUME_MS = 2 * 60 * 1000;   // re-use a prompt sent within the last 2 minutes
const QUERY_AFTER_MS = 20 * 1000;          // start asking Safaricom if no callback arrives
const TIMEOUT_MS = 15 * 60 * 1000;         // give up waiting after 15 minutes
const lastQuery = new Map();               // paymentId -> ms, throttles STK queries

export const shape = (p) => ({
  id: Number(p.id), status: p.status, amount: Number(p.amount), phone: p.phone, resultDesc: p.result_desc,
  receiptNumber: p.receipt_number, mpesaReceipt: p.mpesa_receipt, createdAt: p.created_at, transactionDate: p.transaction_date,
});

/** Starts a payment. The amount always comes from admin_settings, never from the client. */
export async function initiate(user, phone, ip) {
  if (user.access_activated_at) throw new AppError(409, 'ALREADY_ACTIVE', 'Application access is already active on your account.');
  const model = await getSetting('payment_model', 'one_time');
  if (model !== 'one_time') throw new AppError(503, 'MODEL_UNSUPPORTED', 'Payments are temporarily unavailable.');
  const amount = Math.ceil(Number(await getSetting('access_fee', '199')));
  if (!(amount > 0)) throw new AppError(503, 'PAYMENTS_NOT_CONFIGURED', 'Payments are temporarily unavailable.');

  const recent = await db('payments').where({ user_id: user.id, status: 'pending' })
    .where('created_at', '>', new Date(Date.now() - PENDING_RESUME_MS)).orderBy('id', 'desc').first();
  if (recent) return { payment: shape(recent), resumed: true };

  const [row] = await db('payments').insert({ user_id: user.id, amount, phone }).returning('*');
  await audit({ actorId: user.id, action: 'payment.initiated', entityType: 'payment', entityId: row.id, after: { amount, phone }, ip });
  try {
    const r = await stkPush({ phone, amount, reference: `TPI-${user.id}`, description: 'Intern access' });
    const [upd] = await db('payments').where({ id: row.id }).update({
      merchant_request_id: r.merchantRequestId, checkout_request_id: r.checkoutRequestId, updated_at: db.fn.now(),
    }).returning('*');
    return { payment: shape(upd), resumed: false };
  } catch (err) {
    if (err instanceof AppError) {
      await db('payments').where({ id: row.id }).update({ status: 'failed', result_desc: 'Payments not configured', updated_at: db.fn.now() });
      throw err;
    }
    console.error('STK push failed:', err.message);
    await db('payments').where({ id: row.id }).update({ status: 'failed', result_desc: String(err.message).slice(0, 300), updated_at: db.fn.now() });
    await audit({ actorId: user.id, action: 'payment.initiate_failed', entityType: 'payment', entityId: row.id, after: { reason: err.message }, ip });
    throw new AppError(502, 'STK_FAILED', 'We could not send the M-Pesa prompt. Check your number and try again.');
  }
}

/**
 * Applies a verified outcome to a payment inside one transaction. Used by the Daraja callback and the STK query fallback.
 * `result` = { resultCode, resultDesc, receipt, amount, txDate, raw }. Idempotent: repeats change nothing.
 */
export async function settle(checkoutRequestId, result, source, ip = null) {
  const outcome = await db.transaction(async (trx) => {
    const p = await trx('payments').where({ checkout_request_id: checkoutRequestId }).forUpdate().first();
    if (!p) return { ignored: 'unknown' };
    const status = mapResult(result.resultCode);
    const log = (action, extra) => audit({ actorId: p.user_id, action, entityType: 'payment', entityId: p.id, after: { source, ...extra }, ip }, trx);

    // Already successful: only ever fill in a missing receipt from a later callback; never process twice.
    if (p.status === 'success') {
      if (status === 'success' && result.receipt && !p.mpesa_receipt && Number(result.amount) === Number(p.amount)) {
        await trx('payments').where({ id: p.id }).update({ mpesa_receipt: result.receipt, transaction_date: result.txDate, raw_callback: result.raw ? JSON.stringify(result.raw) : p.raw_callback, updated_at: trx.fn.now() });
        await log('payment.receipt_attached', { receipt: result.receipt });
      } else if (status === 'success' && result.receipt && p.mpesa_receipt && p.mpesa_receipt !== result.receipt) {
        await log('payment.duplicate_success_flagged', { receipt: result.receipt });
      }
      return { duplicate: true };
    }
    // A failed/cancelled payment with a real Safaricom result is final. One we merely timed out (no result code) may still succeed.
    const reopenable = ['failed', 'cancelled'].includes(p.status) && p.result_code === null;
    if (p.status !== 'pending' && !reopenable) return { ignored: 'final' };

    if (status !== 'success') {
      await trx('payments').where({ id: p.id }).update({ status, result_code: result.resultCode, result_desc: result.resultDesc, raw_callback: result.raw ? JSON.stringify(result.raw) : null, updated_at: trx.fn.now() });
      await log(`payment.${status}`, { resultCode: result.resultCode });
      return { failedUserId: p.user_id, status };
    }

    // Success: a callback must carry both the receipt and the amount; the query fallback carries neither.
    if (source === 'callback' && (result.receipt == null || result.amount == null)) {
      await log('payment.callback_incomplete', {});
      return { ignored: 'incomplete' };
    }
    if (result.amount != null && Number(result.amount) !== Number(p.amount)) {
      await trx('payments').where({ id: p.id }).update({ status: 'failed', result_code: result.resultCode, result_desc: `Amount mismatch: received ${result.amount}, expected ${Number(p.amount)}`, raw_callback: result.raw ? JSON.stringify(result.raw) : null, updated_at: trx.fn.now() });
      await log('payment.amount_mismatch', { received: result.amount, expected: Number(p.amount), receipt: result.receipt });
      return { ignored: 'mismatch' };
    }
    try {
      await trx.raw('SAVEPOINT s1');
      await trx('payments').where({ id: p.id }).update({
        status: 'success', result_code: 0, result_desc: result.resultDesc || 'Success', mpesa_receipt: result.receipt,
        transaction_date: result.txDate || trx.fn.now(), raw_callback: result.raw ? JSON.stringify(result.raw) : null,
        receipt_number: trx.raw("'TPI-' || to_char(now(), 'YYYY') || '-' || lpad(id::text, 6, '0')"), updated_at: trx.fn.now(),
      });
    } catch (err) {
      if (err.code === '23505') { // receipt already recorded against another payment
        await trx.raw('ROLLBACK TO SAVEPOINT s1');
        await log('payment.duplicate_receipt_rejected', { receipt: result.receipt });
        return { ignored: 'duplicate_receipt' };
      }
      throw err;
    }
    const activated = await trx('users').where({ id: p.user_id }).whereNull('access_activated_at')
      .update({ access_activated_at: trx.fn.now(), access_payment_id: p.id, updated_at: trx.fn.now() });
    await log(source === 'callback' ? 'payment.success' : 'payment.confirmed_by_query', { receipt: result.receipt, activated: Boolean(activated) });
    if (!activated) await log('payment.duplicate_success_flagged', { note: 'access was already active; review for refund' });
    return { succeeded: true, userId: p.user_id, paymentId: Number(p.id), amount: Number(p.amount) };
  });

  // Side effects after commit; they never undo the payment.
  if (outcome.succeeded) {
    const p = await db('payments').where({ id: outcome.paymentId }).first();
    await tell(outcome.userId, {
      type: 'payment_success', title: 'Payment received: application access active',
      body: `We received your payment of KSh ${outcome.amount}.\nReceipt: ${p.receipt_number}${p.mpesa_receipt ? `\nM-Pesa code: ${p.mpesa_receipt}` : ''}\nYou can now apply to internships.`,
      link: `/dashboard/payments/${p.id}`, ctaLabel: 'View receipt',
    });
  } else if (outcome.failedUserId) {
    await notify(outcome.failedUserId, { type: 'payment_failed', title: outcome.status === 'cancelled' ? 'Payment cancelled' : 'Payment failed', body: 'No application access was activated. You can try again from any internship.', link: '/dashboard/payments' });
  }
  return outcome;
}

/** Asks Safaricom about a still-pending payment and applies the answer. */
async function queryAndSettle(p) {
  lastQuery.set(Number(p.id), Date.now());
  const r = await stkQuery(p.checkout_request_id);
  if (r) await settle(p.checkout_request_id, { resultCode: r.resultCode, resultDesc: r.resultDesc, receipt: null, amount: null }, 'query');
}

async function markTimedOut(p) {
  const n = await db('payments').where({ id: p.id, status: 'pending' }).update({ status: 'failed', result_code: null, result_desc: 'Timed out waiting for confirmation', updated_at: db.fn.now() });
  if (n) await audit({ actorId: p.user_id, action: 'payment.timed_out', entityType: 'payment', entityId: p.id });
}

/** Owner polling endpoint. May trigger a throttled STK query when the callback is late. */
export async function statusFor(user, id) {
  let p = await db('payments').where({ id, user_id: user.id }).first();
  if (!p) throw new AppError(404, 'NOT_FOUND', 'Payment not found.');
  if (p.status === 'pending' && p.checkout_request_id) {
    const age = Date.now() - new Date(p.created_at).getTime();
    if (age > QUERY_AFTER_MS && Date.now() - (lastQuery.get(Number(p.id)) || 0) > 10000) {
      await queryAndSettle(p);
      p = await db('payments').where({ id }).first();
    }
  }
  const fresh = await db('users').where({ id: user.id }).first('access_activated_at');
  return { payment: shape(p), accessActivated: Boolean(fresh.access_activated_at) };
}

/** Background sweep for lost callbacks. */
export async function reconcilePending() {
  const rows = await db('payments').where({ status: 'pending' }).whereNotNull('checkout_request_id')
    .where('created_at', '<', new Date(Date.now() - QUERY_AFTER_MS)).where('created_at', '>', new Date(Date.now() - 24 * 3600 * 1000)).limit(50);
  for (const p of rows) {
    await queryAndSettle(p);
    const cur = await db('payments').where({ id: p.id }).first('status');
    if (cur.status === 'pending' && Date.now() - new Date(p.created_at).getTime() > TIMEOUT_MS) await markTimedOut(p);
  }
}
