# Architecture

## Stack
| Layer | Choice |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router, Recharts |
| Backend | Node.js 20+, Express 4, zod validation |
| Database | PostgreSQL 14+, Knex migrations and seeds (plain SQL, no ORM) |
| Auth | Server-side sessions in PostgreSQL (httpOnly cookie) + per-session CSRF token, bcrypt |
| Payments | Safaricom Daraja STK Push and STK Query |
| Email | Nodemailer over configurable SMTP, every message logged in `email_logs` |
| Files | Private local disk (`UPLOAD_DIR`), content-checked, served only through authorised routes |

## How the folders map to the original brief
The brief asked for directories for routes, controllers, models, middleware, and so on. The code is organised **by feature module** instead, which keeps each role's code together:

| Brief | Where it is |
|---|---|
| Frontend | `client/src` (`pages/`, `components/`, `context/`, `lib/`) |
| API routes + controllers | `server/src/modules/<feature>/routes.js` (route handlers); validation in `schemas.js`; business logic in `service.js` |
| Models + database | `server/src/database/migrations` (schema) and `seeds`; data access is Knex queries inside each module |
| Middleware | `server/src/middleware` (auth, RBAC, CSRF, rate limits, validation, errors) |
| Authentication | `server/src/modules/auth` |
| Payment integration | `server/src/modules/payments` (`daraja.js`, `service.js`, `callback.js`, `parse.js`) |
| Email services | `server/src/modules/email` (SMTP mailer, templates) |
| File uploads | `server/src/utils/uploads.js` |
| Admin / Company / Intern modules | `modules/admin`, `modules/company`, `modules/intern` (+ `modules/applications`, `modules/account`, `modules/public`, `modules/notifications`) |
| Configuration | `server/src/config`, `server/.env.example` |
| Tests | `tests/` (unit) and `tests/integration/` (API, real PostgreSQL) |
| Deployment | `deploy/`, `docker-compose.yml`, `docs/DEPLOYMENT.md` |

## Database relationships
- `users` (role intern/company/admin) is the root. `intern_profiles` and `company_profiles` are 1:1 with it.
- `company_profiles` 1:N `company_documents` and 1:N `internships`; `internship_categories` 1:N `internships`.
- `internships` 1:N `applications`; an intern has many applications; `UNIQUE (internship_id, intern_id)` prevents duplicates.
- `payments` belong to a user; `users.access_payment_id` points at the verified payment that activated access. `mpesa_receipt`, `receipt_number` and `checkout_request_id` are unique.
- `saved_internships` (intern x internship), `notifications` (per user), `email_logs`, `audit_logs` (actor, action, entity, before/after), `admin_settings` (key/value: fee, payment model, minimum profile completion), plus `contact_messages` and the `session` store.

## Request flow
Browser -> nginx (static files; `/api` proxied) -> Express: helmet, CORS, JSON parsing, session, (callback route here, exempt from CSRF), rate limit, CSRF check, then the feature router: `requireAuth` -> `requireRole` -> zod validation -> handler -> Knex. Errors are normalised by one handler into `{ error: { code, message, fields } }`.
