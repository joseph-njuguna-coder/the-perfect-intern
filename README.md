# The Perfect Intern

*Your Career. Your Opportunity. Your Future.*

A Kenyan internship and attachment marketplace. Interns register free, browse free, and pay a one-time KSh 199 (configurable) by M-Pesa to activate application access. Companies post internships and manage applicants. Administrators approve companies and listings, manage users, and oversee finance.

**Stack:** React + Vite + Tailwind, Node/Express, PostgreSQL, Safaricom Daraja STK Push, SMTP email.

## Documentation
| Document | Contents |
|---|---|
| `docs/DEPLOY_FREE.md` | Free deployment with GitHub, Render and Neon (demo and sandbox testing) |
| `docs/DEPLOYMENT.md` | Step-by-step production deployment, backups, releases, monitoring |
| `docs/LAUNCH_CHECKLIST.md` | What to verify before going live, including Safaricom go-live |
| `docs/ARCHITECTURE.md` | Stack, folder map against the original brief, database relationships |
| `docs/API.md`, `docs/openapi.json` | Conventions, key flows, generated endpoint index (105 endpoints) |
| `docs/SECURITY.md` | Controls, Data Protection Act notes, backup advice |
| `docs/PHASES.md` | What each build phase added, rules and how to test it |

## Branding
The logo assets are in `client/public` (`logo.png`, `logo-transparent.png`, `logo-mark.png`, `favicon.png`, `apple-touch-icon.png`, plus the "Powered by Porous Kenya" credit in light and dark versions). The colour palette in `client/tailwind.config.js` was sampled from the logo: navy `#02205F`, blue `#0A56B5` (primary actions), orange `#F7941D` (accents; the Tailwind class is still called `gold`) and the star's gold. Social links and the tagline live in `client/src/content.js`. Emails load the emblem from `APP_URL/logo-mark.png`, so it only appears once the site is public over HTTPS.

## Quick start (development)
Requirements: Node 20+, PostgreSQL 14+.
```bash
createdb perfect_intern

cd server
cp .env.example .env        # set DATABASE_URL, SESSION_SECRET, SEED_ADMIN_PASSWORD
npm install
npm run migrate
npm run seed                # categories, settings, admin, demo companies/internships/interns
npm run dev                 # API on :4000

cd ../client
npm install
npm run dev                 # site on http://localhost:5173 (proxies /api to :4000)
```
With `SMTP_HOST` empty, emails print to the server console. After the first `npm install`, commit the `package-lock.json` files.

**Offline payments:** set `MPESA_MOCK=true` and `MPESA_CALLBACK_SECRET` in `.env`, pay in the UI, then simulate Safaricom with `node scripts/simulate-callback.js <CheckoutRequestID>` (see `docs/PHASES.md`, Phase 6). For the real sandbox, fill the `MPESA_*` values and expose the server with an HTTPS tunnel.

## Demo logins (development seed only; never created in production)
| Role | Email | Password |
|---|---|---|
| Admin | value of SEED_ADMIN_EMAIL | value of SEED_ADMIN_PASSWORD |
| Intern | intern@demo.test | Demo#2026pass |
| Intern (second) | intern2@demo.test | Demo#2026pass |
| Company (approved) | company1@demo.test ... company4@demo.test | Demo#2026pass |

## Tests
- `npm test` (in `server/`): unit tests, no database needed.
- `npm run test:integration` (in `server/`): API suite across all roles against a throwaway PostgreSQL database; set `TEST_DATABASE_URL` to a database whose name contains "test" (it is wiped). See `docs/PHASES.md`, Phase 8.

## Project layout
```
client/            React app (pages, components, context, lib)
server/src/        config, middleware, utils, database (migrations, seeds), modules/<feature>
tests/             unit tests and tests/integration
deploy/            nginx, systemd, backup script      docker-compose.yml, .env.docker.example
docs/              guides and API reference            tools/gen-api-docs.mjs
```

## Status and known gaps
All nine phases are written. **The code was developed without network access, a database or a browser**, so it has been syntax-checked and unit-tested but never run end to end. Expect to fix small issues on first run, and use the integration suite and `docs/LAUNCH_CHECKLIST.md` to find them. Specifically:
- Not yet exercised: the React pages in a browser (including responsive layout), the SQL in the admin and analytics queries, and the real Daraja sandbox.
- Placeholder content: three sample testimonials in `client/src/content.js`. No photography or illustrations are bundled.
- Browsing by company works through a link (`/internships?company=ID`, used on the home page's company cards) but has no filter dropdown. The intern dashboard shows recommended, not featured, internships.
- Only the one-time payment model exists. Messages to applicants are email plus notification, not a threaded inbox. Failed emails are logged but not retried. There is no multi-factor authentication for administrators.
- Lockfiles are not generated yet (commit them after your first install).
