import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { env } from './config/env.js';
import { pool, db } from './config/db.js';
import { csrfProtect, issueCsrfToken } from './middleware/csrf.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { notFound, errorHandler } from './middleware/errors.js';
import authRoutes from './modules/auth/routes.js';
import publicRoutes from './modules/public/routes.js';
import internRoutes from './modules/intern/routes.js';
import companyRoutes from './modules/company/routes.js';
import paymentRoutes from './modules/payments/routes.js';
import mpesaCallback from './modules/payments/callback.js';
import adminRoutes from './modules/admin/routes.js';
import accountRoutes from './modules/account/routes.js';

const PgStore = connectPgSimple(session);
const app = express();

if (env.isProd) app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.appUrl, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.use(session({
  name: 'tpi.sid',
  store: new PgStore({ pool, tableName: 'session' }),
  secret: env.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: env.isProd, maxAge: 7 * 24 * 3600 * 1000 },
}));

// API responses can contain personal data: never let browsers or proxies cache them (routes that want caching override this).
app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

// One JSON line per request (no query strings, bodies or cookies, which can hold personal data or tokens).
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'test' || req.path === '/api/health') return next();
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    console.log(JSON.stringify({ t: new Date().toISOString(), method: req.method, path: req.path, status: res.statusCode, ms: Math.round(ms), ip: req.ip }));
  });
  next();
});

app.get('/api/health', (req, res) => res.json({ ok: true })); // liveness
app.get('/api/health/ready', async (req, res) => { // readiness: can we reach the database?
  try { await db.raw('SELECT 1'); res.json({ ok: true }); } catch { res.status(503).json({ ok: false }); }
});

// The Daraja callback is mounted ABOVE the rate limiter and csrfProtect: Safaricom has no session or CSRF token.
// See modules/payments/callback.js for how it is authenticated.
app.use('/api/payments/mpesa', mpesaCallback);

app.use('/api', apiLimiter);
app.get('/api/csrf', issueCsrfToken);
app.use('/api', csrfProtect);

app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/intern', internRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/account', accountRoutes);

// Single-service hosting: serve the built React app (client/dist) from this server too, so the site and API share one origin.
// Enabled with SERVE_CLIENT=true (used by free hosts such as Render). With nginx in front you leave it off.
if (env.serveClient) {
  const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
  app.use(express.static(dist, {
    index: false,
    setHeaders: (res, file) => res.set('Cache-Control', file.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'public, max-age=3600'),
  }));
  app.get(/^\/(?!api\/).*/, (req, res) => res.set('Cache-Control', 'no-store').sendFile(path.join(dist, 'index.html')));
}

app.use(notFound);
app.use(errorHandler);

export default app;
