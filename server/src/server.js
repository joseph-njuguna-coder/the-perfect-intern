import app from './app.js';
import { env } from './config/env.js';
import { db, pool } from './config/db.js';
import { reconcilePending } from './modules/payments/service.js';

const server = app.listen(env.port, () => console.log(`API listening on :${env.port}`));

// Sweep for lost M-Pesa callbacks every 30 seconds (see modules/payments/service.js).
let sweeping = false;
setInterval(async () => {
  if (sweeping) return;
  sweeping = true;
  try { await reconcilePending(); } catch (err) { console.error('Payment reconcile failed:', err.message); } finally { sweeping = false; }
}, 30000).unref();

async function shutdown() {
  server.close(async () => {
    await db.destroy();
    await pool.end();
    process.exit(0);
  });
}
// Log and exit on unexpected errors so systemd/Docker restarts a clean process instead of leaving it in an unknown state.
process.on('unhandledRejection', (err) => { console.error('Unhandled rejection:', err); process.exit(1); });
process.on('uncaughtException', (err) => { console.error('Uncaught exception:', err); process.exit(1); });
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
