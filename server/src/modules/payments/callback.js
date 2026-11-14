import crypto from 'node:crypto';
import { Router } from 'express';
import { env } from '../../config/env.js';
import { audit } from '../../utils/audit.js';
import { parseCallback } from './parse.js';
import { settle } from './service.js';

/**
 * Public endpoint called by Safaricom. It has no session and no CSRF token, so it is protected by:
 *  1. a secret path segment only Safaricom was given (the callback URL we send with each STK push),
 *  2. an optional source-IP allow-list,
 *  3. matching the CheckoutRequestID to a pending payment we created, and validating the amount.
 * It always answers 200 to genuine-looking calls so Safaricom does not retry forever.
 */
const router = Router();
const ACK = { ResultCode: 0, ResultDesc: 'Accepted' };

const safeEqual = (a, b) => { const x = Buffer.from(a); const y = Buffer.from(b); return x.length === y.length && crypto.timingSafeEqual(x, y); };

router.post('/callback/:secret', async (req, res) => {
  const { callbackSecret, allowedIps } = env.mpesa;
  if (!callbackSecret || !safeEqual(req.params.secret, callbackSecret)) return res.status(404).json({ error: 'Not found' });
  if (allowedIps.length && !allowedIps.includes(req.ip.replace('::ffff:', ''))) {
    await audit({ action: 'payment.callback_blocked_ip', after: { ip: req.ip } }).catch(() => {});
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const parsed = parseCallback(req.body);
    if (parsed) await settle(parsed.checkoutRequestId, { ...parsed, raw: req.body }, 'callback', req.ip);
  } catch (err) {
    console.error('Callback processing error:', err);
    return res.status(500).json({ ResultCode: 1, ResultDesc: 'Retry' }); // lets Safaricom retry after a transient failure
  }
  res.json(ACK);
});

export default router;
