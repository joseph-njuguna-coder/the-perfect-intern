# Phase 2 notes

Implemented: full 13-table schema (+ session and contact_messages), seed data, intern and company registration, email verification, login with lockout, logout, password reset (revokes sessions), CSRF, rate limiting, RBAC middleware, audit logging, email logging, public API and public website.

## API (Phase 2)
POST /api/auth/register/intern | /register/company | /verify-email | /resend-verification | /login | /logout | /forgot-password | /reset-password
GET /api/auth/me, GET /api/csrf
GET /api/public/categories | counties | internships | internships/featured | companies/featured | stats | settings
POST /api/public/contact

## Outstanding
Phase 3 intern profile and dashboard; Phase 4 company portal; Phase 5 detail page, save and apply; Phase 6 M-Pesa; Phase 7 admin; Phase 8 notification emails and test suite; Phase 9 deployment docs.
Replace placeholder testimonials in client/src/content.js before launch.


# Phase 3 notes

New API (all require sign-in; /api/intern/* requires the intern role):
GET/PUT /api/intern/profile; GET/POST /api/intern/profile/photo (image, 2 MB); GET/POST /api/intern/profile/cv (PDF, 5 MB)
GET /api/intern/dashboard; GET /api/intern/applications; GET /api/intern/saved, /saved/ids; POST/DELETE /api/intern/saved/:id
PUT /api/account; POST /api/account/password; GET /api/account/notifications; POST /api/account/notifications/read-all, /:id/read

Files are stored under UPLOAD_DIR (default server/uploads, git-ignored) with random names, type-checked by content, and served only through authenticated routes. Company access to applicant CVs is added in Phase 5.
Profile completion = 10 requirements x 10% (photo, institution, course, qualification, graduation year, skills, interests, preferred county, work arrangement, CV).
No schema changes in this phase. The minimum completion required to apply (admin setting, default 70) is enforced in Phase 5.


# Phase 4 notes

New API (company role only; every query is scoped to the signed-in company):
GET/PUT /api/company/profile; GET/POST /api/company/logo; GET /api/company/dashboard
GET/POST /api/company/documents; GET /api/company/documents/:id/file; DELETE /api/company/documents/:id (unverified only)
GET/POST /api/company/internships; GET/PUT/DELETE /api/company/internships/:id; POST /api/company/internships/:id/close
GET /api/public/companies/:id/logo (approved companies only)

Rules: new listings start as pending_approval. Editing an approved or rejected listing sends it back to pending_approval. Closed listings cannot be edited. Listings with applications cannot be deleted (close them). Rejected or suspended companies cannot post. Address and description are required before posting. Paid listings need a stipend; on-site and hybrid listings need a county.
Documents: PDF/JPG/PNG/WebP up to 5 MB, max 10 per company, content-checked, private. Administrators review and verify them in Phase 7.
Schema: no changes. DATE columns now return plain YYYY-MM-DD strings.


# Phase 5 notes

New API:
GET /api/public/internships/:id (full detail, live listings only)
GET /api/intern/internships/:id/eligibility; POST /api/intern/applications; POST /api/intern/applications/:id/withdraw
GET /api/company/applications (filters: internshipId, status, page); GET /api/company/applications/:id (+ /cv, /photo)
PUT /api/company/applications/:id/status; PUT /api/company/applications/:id/notes; POST /api/company/applications/:id/message

Apply gates, in order: listing live and not expired -> not already applied -> profile completion >= admin setting min_profile_completion (default 70) -> CV uploaded -> paid access active (else 402 ACCESS_REQUIRED and the client sends the intern to /pay). The same function backs both the eligibility check and the submit, and a unique (internship_id, intern_id) constraint is the final duplicate guard.
The CV is copied at submission, so later changes to the profile CV never alter what the company received.
Company transitions: submitted -> under_review | shortlisted | rejected; under_review -> shortlisted | rejected; shortlisted -> interview_scheduled | selected | rejected; interview_scheduled -> reschedule | selected | rejected. Selected, rejected and withdrawn are final. Only interns can withdraw. Opening a "submitted" application marks it under review.
Emails (and in-app notifications): application submitted (intern and company), shortlisted, interview scheduled, selected, rejected, withdrawn (company, in-app), and free-text messages. Interview times are entered and shown in Kenya time (UTC+3).
Messages to applicants are delivered as notification plus email and recorded in email_logs; there is no threaded inbox.
Dev seed: intern@demo.test starts with application access pre-activated (no payment) so applications can be tested; intern2@demo.test has no access. Payment replaces this in Phase 6.


# Phase 6 notes: M-Pesa (Daraja STK Push)

API: POST /api/payments/initiate {phone}; GET /api/payments; GET /api/payments/:id/status; GET /api/payments/:id/receipt (intern only)
POST /api/payments/mpesa/callback/:secret (public, called by Safaricom)

Flow: initiate creates a pending payment row (amount read from admin_settings.access_fee, never from the client) and sends the STK push -> the customer enters their PIN -> Safaricom POSTs the callback -> the backend settles the payment in one transaction (row locked FOR UPDATE) and activates access. The browser only polls our status endpoint.

Safeguards
- Callback authenticity: Safaricom does not sign callbacks, so the callback URL carries a secret path segment (MPESA_CALLBACK_SECRET), optional IP allow-list (MPESA_ALLOWED_IPS), and the CheckoutRequestID must match a payment we created.
- Amount validation: a callback must include amount and receipt; a mismatch marks the payment failed and writes an audit entry for manual reconciliation. No access is granted.
- Idempotent: a payment settles once. Repeat callbacks change nothing; a different receipt on an already-successful payment is flagged in audit_logs. mpesa_receipt and receipt_number are UNIQUE.
- Lost callbacks: the status endpoint and a 30-second background sweep ask Safaricom (STK Query) about pending payments. The query carries no receipt number, so a payment confirmed only by query is activated with a blank M-Pesa code, and a late callback fills the code in. Payments with no outcome after 15 minutes are marked failed ("timed out"), but a late success callback still settles them.
- Cancelled (code 1032) and failed payments never activate access. Resuming: a prompt sent in the last 2 minutes is re-used, preventing double prompts.
- A successful payment emails and notifies the intern with the receipt; receipts print or save as PDF from the browser.
- Admin can change access_fee (Phase 7); payment_model other than one_time is not implemented and disables payments.

Testing
- Offline: set MPESA_MOCK=true (refused in production), pay in the UI, then run `node scripts/simulate-callback.js <CheckoutRequestID>` (find the id in the payments table) with --cancel, --fail, --amount 100, or --receipt CODE to exercise each branch.
- Sandbox: fill the MPESA_* values from developer.safaricom.co.ke, expose the server with an HTTPS tunnel (e.g. ngrok http 4000) and set MPESA_CALLBACK_URL to <tunnel>/api/payments/mpesa/callback. Use the Daraja test number and PIN shown in the simulator.
- Production: set MPESA_ENV=production with your live shortcode, passkey and credentials, set MPESA_ALLOWED_IPS to Safaricom's published callback IPs, and use HTTPS. Never enable MPESA_MOCK.
- The dev seed no longer pre-activates the demo intern. To reset an existing database: UPDATE users SET access_activated_at = NULL, access_payment_id = NULL WHERE email = 'intern@demo.test';


# Phase 7 notes: administrator dashboard

All routes are under /api/admin and require the admin role. Admin pages live under /dashboard/admin/*.

Dashboard: the 10 required statistics plus a "needs attention" list (companies and internships awaiting approval, pending payments, payment anomalies in the last 30 days).
Interns: GET /interns (search, status), GET /interns/:id (profile, payments, applications), POST /interns/:id/suspend | /reactivate. Suspending signs the user out immediately and blocks sign-in.
Companies: list/detail, approve, reject (reason required), suspend (reason required), edit profile, view and verify documents. Approving a company with no documents asks for confirmation. Companies and the intern/company are emailed and notified on each decision.
Internships: list/filter, approve, reject (reason required), edit, feature/unfeature (approved only), remove (deletes if it has no applications, otherwise closes it and keeps the history), and a "close expired listings" action. New and edited listings notify admins.
Categories: add, rename, activate/deactivate, delete (blocked while internships use it).
Finance: searchable, filterable transaction list (status, date range, M-Pesa code, phone, name, email), per-payment details and audit trail, receipts, daily (30 days) and monthly (12 months) revenue, CSV export of the current filters (formula-injection safe, logged). Dates use Kenya time.
Analytics: charts for intern registrations, company registrations, internship postings, applications, payments, daily and monthly revenue (7/30/90 day ranges).
Settings: access fee (whole KSh 1 to 100,000, confirmed before saving, applies to new payments only) and minimum profile completion. Payment model is shown as one-time only; no second model is implemented.
Audit log: filterable viewer of every audited action.

Creating the first admin: the seed creates one from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD. Change that password after first sign-in (Account settings).
Admins cannot download interns' CVs by design (privacy); they see profile data only.


# Phase 8 notes: notifications, security and testing

Emails (all via configurable SMTP, all recorded in email_logs): verification, welcome (after verification), password reset, password changed (security notice), duplicate-registration notice, company approved/rejected/suspended, internship approved/rejected, application submitted (intern and company), under review, shortlisted, interview scheduled, selected, rejected, messages from companies, payment success/receipt. Every one also appears in the in-app notification centre.

Hardening added: no email enumeration on registration; constant-time unknown-user sign-in; common-password rejection; production refuses to start without SMTP; no-store on API responses; password-changed alerts.
Data Protection Act: GET /api/account/export (JSON download) and POST /api/account/delete (interns; password + typing DELETE), with a new users.deleted_at column (migration 20261102000001, run `npm run migrate`). See docs/SECURITY.md.

Testing
- Unit tests (no database): `npm test` from /server (or `node --test "tests/**/*.test.js"` from the project root): phone normalisation, tokens, profile completion, M-Pesa parsing/mapping, CSV safety.
- Integration tests (real PostgreSQL, all three roles, mock M-Pesa): create an empty database whose name contains "test", then from /server run
  TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/perfect_intern_test npm run test:integration
  The suite migrates and TRUNCATES that database. Without TEST_DATABASE_URL it is skipped. It covers CSRF, registration/verification/login, enumeration and weak passwords, RBAC, approval gating of public visibility, apply gates and upload validation, payment callbacks (wrong secret, wrong amount, replay, cancel, fee change), duplicate-application prevention, company data isolation and status transitions, suspension, CSV export, password-reset session revocation, and data export/erasure.
- Real Safaricom sandbox testing remains a manual step (see Phase 6).


# Phase 9 notes: deployment preparation

Added: production start-up checks (https APP_URL, SMTP required, strong secrets, complete M-Pesa settings), readiness endpoint (GET /api/health/ready), one-line JSON request logging without bodies or query strings, crash handlers so systemd or Docker restarts a clean process, `engines` (Node 20+), root convenience scripts, deployment files in /deploy (nginx, systemd, backup script) and Docker files, a generated endpoint index (`npm run docs:api` from the project root writes docs/API.md and docs/openapi.json from the route files), and the guides below.

Docs: README.md (start here), docs/DEPLOYMENT.md, docs/LAUNCH_CHECKLIST.md, docs/ARCHITECTURE.md, docs/API.md, docs/openapi.json, docs/SECURITY.md, docs/PHASES.md.


# Branding update

Applied the supplied logo and brand: new palette sampled from the logo, emblem plus live-text wordmark in the header, logo on a white chip in the footer, "Powered by Porous Kenya" in the footer and emails, favicon and touch icon, social links (footer, home contact section, contact page), tagline "Your professional journey starts here" in the footer and emails (the original "Your Career. Your Opportunity. Your Future." remains on the About page), and the logo on payment receipts. No server logic or database changes.


# Email delivery update

Added HTTPS email providers (EMAIL_PROVIDER=brevo or resend) because Render's free tier blocks outbound SMTP ports 25, 465 and 587. All email calls now time out after about 12 seconds (previously an unreachable SMTP server could hold a sign-up request for minutes), failures record a readable reason in email_logs, and `npm run test:email -- you@example.com` (in /server) sends a test message and prints the exact error. Production start-up now requires either SMTP_HOST or a provider API key.
