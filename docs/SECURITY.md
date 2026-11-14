# Security, privacy and operations checklist

## What is implemented
| Area | Control |
|---|---|
| Passwords | bcrypt (cost 12); min 8 chars with letter and number; common passwords rejected; 5 failed sign-ins lock the account 15 minutes; unknown-email sign-ins take the same time as real ones |
| Sessions | httpOnly, SameSite=Lax, Secure in production cookie; stored in PostgreSQL; regenerated on sign-in; every session revoked on password reset, others revoked on password change; suspended users are signed out immediately |
| CSRF | Per-session token required (x-csrf-token) on every state-changing /api request. Only the Safaricom callback is exempt; it is protected by a secret URL segment, optional IP allow-list, matching checkout ID and amount validation |
| Access control | requireAuth + requireRole on every private router; company and intern queries are scoped to the signed-in owner's id; cross-company access returns 404 |
| Input | zod validation on every body/query/param; parameterised SQL (the only raw SQL uses fixed whitelists); 1 MB JSON limit |
| XSS | React escapes output; emails escape every dynamic value; helmet headers on the API |
| Uploads | MIME allow-list, size limits, real file-signature check, random server-side names, stored outside the web root, served only through authorised routes with nosniff; application CVs are snapshotted |
| Enumeration | Registration, resend-verification and forgot-password answer identically whether or not the email exists |
| Rate limiting | Global API limiter, tight limits on sign-in, email-sending routes, contact form and payment initiation |
| Payments | See PHASES.md (Phase 6): server-side verification, amount check, idempotent settlement, unique receipts, audit trail, sweep for lost callbacks |
| Auditability | audit_logs for sign-ins, profile and file events, every admin action, every payment step, CV downloads, exports |
| Caching | All /api responses are no-store unless explicitly public (company logos) |

## Data Protection Act, 2019 (design notes, not legal advice)
- Consent: explicit checkbox at registration; time stored in users.consent_at; privacy notice at /privacy.
- Purpose and minimisation: only the profile and payment data the platform needs; companies see an intern's profile and CV only for applications that intern submitted; admins cannot download CVs.
- Access/portability: Account settings -> Download my data (JSON).
- Erasure: interns can delete their account (profile, files, saved items, notifications removed; open applications withdrawn; payment and audit records retained without personal details; row anonymised with deleted_at). Company and admin accounts are closed via support.
- Retention: define and publish your own schedule for retained payment and audit records with your lawyer.
- Security: see above. Register with the Office of the Data Protection Commissioner and appoint a data protection officer if your processing requires it; have a breach-response procedure (72-hour notification window under the Act).
- Please have a Kenyan data protection lawyer review the privacy notice and consent wording before launch.

## Backup recommendations
- Enable automated daily PostgreSQL backups with point-in-time recovery (WAL archiving or your host's managed backups); keep at least 14 days and one monthly copy.
- Encrypt backups, store them off the primary server and region, and restrict who can restore.
- Back up the uploads directory (CVs, photos, documents) on the same schedule, or use S3-compatible storage with versioning.
- Test a full restore quarterly. A backup you have not restored is not a backup.
- Remember that backups contain personal data: deleted accounts disappear from backups when they expire, so keep retention short and documented.

## Before going live
1. Set a long random SESSION_SECRET and MPESA_CALLBACK_SECRET; use production Daraja credentials; set MPESA_ALLOWED_IPS; MPESA_MOCK must be false (the server refuses to start otherwise).
2. Serve everything over HTTPS; put the API behind a reverse proxy that sets X-Forwarded-Proto (the app trusts one proxy hop in production).
3. Configure SMTP (the server refuses to start in production without it) and set SPF/DKIM/DMARC on the sending domain.
4. Change the seeded admin password and remove demo accounts (the demo seed never runs in production).
5. Run `npm audit` and keep dependencies updated.
6. Add a Content-Security-Policy at the web server for the React app (script-src 'self', connect-src 'self', img-src 'self' data:, style/font sources for Google Fonts if you keep them).
7. Monitor the audit log for payment.amount_mismatch and payment.duplicate_* entries; reconcile against your M-Pesa statement.

## Known limits
- Failed emails are logged in email_logs (status and error) but not automatically retried.
- There is no multi-factor authentication for administrators yet; consider adding it before scaling the admin team.
- Messages to applicants are email plus notification, not a threaded inbox.
