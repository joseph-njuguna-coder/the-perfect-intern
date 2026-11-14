# The Perfect Intern: API reference

Base URL: `https://<your-domain>/api` (the React app and API share one origin).

## Conventions
- **Auth:** cookie session (`tpi.sid`, httpOnly). Sign in with `POST /api/auth/login`; the response includes a `csrfToken`.
- **CSRF:** every non-GET request (except the Safaricom callback) must send the token in an `x-csrf-token` header. `GET /api/csrf` returns the token for the current session. A missing or wrong token returns `403 CSRF_INVALID`.
- **Format:** JSON in and out, except file uploads (`multipart/form-data`, one file in the field `file`) and downloads.
- **Roles:** `intern`, `company`, `admin`. Calling a route for another role returns `403 FORBIDDEN`; not signed in returns `401 UNAUTHENTICATED`. Data belonging to other users or companies returns `404`.
- **Pagination:** list endpoints take `page` and `limit` and return `{ items, total, page, pages }`.
- **Dates:** `YYYY-MM-DD` for dates; ISO 8601 for timestamps. Interview times are entered in Kenya time (UTC+3).
- **Rate limits:** a `429 RATE_LIMITED` response means slow down. Sign-in, email-sending, contact and payment routes have tight limits.

## Errors
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Please correct the highlighted fields.", "fields": { "email": "Enter a valid email address" } } }
```
Common codes: `VALIDATION_ERROR` (422), `UNAUTHENTICATED` (401), `FORBIDDEN` (403), `CSRF_INVALID` (403), `NOT_FOUND` (404), `DUPLICATE` / `ALREADY_APPLIED` / `BAD_TRANSITION` (409), `ACCESS_REQUIRED` (402), `PROFILE_INCOMPLETE` / `CV_MISSING` (422), `RATE_LIMITED` (429), `EMAIL_NOT_VERIFIED` / `ACCOUNT_SUSPENDED` (403), `ACCOUNT_LOCKED` (429).

## Key flows
**Register and sign in**
1. `POST /api/auth/register/intern` `{ fullName, email, phone, password, county, consent: true, gender?, dateOfBirth? }` (companies: `/register/company` with `companyName`, `industry`). Always answers 201, whether or not the email already exists.
2. The user clicks the emailed link, which calls `POST /api/auth/verify-email` `{ token }`.
3. `POST /api/auth/login` `{ email, password }` returns `{ user, csrfToken }`.

**Apply to an internship** (intern)
1. `GET /api/intern/internships/{id}/eligibility` returns `{ eligible }` or `{ eligible: false, code, message }` where `code` is one of `ALREADY_APPLIED`, `PROFILE_INCOMPLETE`, `CV_MISSING`, `ACCESS_REQUIRED`, `NOT_AVAILABLE`.
2. If `ACCESS_REQUIRED`: `POST /api/payments/initiate` `{ phone }` (amount is decided by the server), then poll `GET /api/payments/{id}/status` until `payment.status` is `success`, `failed` or `cancelled`.
3. `POST /api/intern/applications` `{ internshipId, coverLetter }` returns `{ application: { id, reference, status } }`.

**Review applicants** (company)
`GET /api/company/applications?internshipId=&status=` then `GET /api/company/applications/{id}` (opening a new one marks it under review), `PUT .../status` `{ status, interviewAt?, interviewNotes?, message? }`, `POST .../message` `{ message }`, `GET .../cv`.
Allowed moves: submitted to under_review, shortlisted or rejected; under_review to shortlisted or rejected; shortlisted to interview_scheduled, selected or rejected; interview_scheduled to reschedule, selected or rejected.

**M-Pesa callback** (Safaricom only): `POST /api/payments/mpesa/callback/{secret}` with Daraja's standard STK callback body. See `docs/PHASES.md` (Phase 6) for how it is verified.

