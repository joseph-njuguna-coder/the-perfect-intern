# Bulk demo data (1,000+ interns and companies)

`npm run seed` already adds a handful of demo accounts. For a convincing demo, admin charts and load testing, the bulk seed adds about **1,200 interns, 80 companies, 300+ internships, 900+ applications and 600+ payments** across Kenyan counties, universities, courses and all 16 categories, with dates spread over the last five months so the analytics charts have a history.

Everything is fictional. Phone numbers are random, emails end in `@bulk.demo.test` (they cannot receive mail), and the seeded payments are not real M-Pesa transactions.

## Run it (from your computer, against Neon or your local database)
1. Make sure `npm run migrate` and `npm run seed` have been run on that database (the bulk seed needs the categories).
2. Put your `DATABASE_URL` in `server/.env` (for Neon, the connection string it gives you, ending in `?sslmode=require`). Do **not** set `NODE_ENV=production` in that file.
3. Preview, which changes nothing and shows exactly which database it would touch:
```bash
cd server
npm run seed:bulk
```
4. Create the data:
```bash
npm run seed:bulk -- --yes
```
It takes under a minute and runs as one transaction, so a failure saves nothing.

Options: `--interns 1500`, `--companies 100`, `--per-company 5`, `--password "YourPassword1"`.
Re-run with `--clean` to replace the data, or remove all of it with `npm run seed:bulk -- --clean-only --yes`. Cleanup only deletes accounts whose email ends in `@bulk.demo.test`, never real users.

## What you get
- **Logins** (password `Demo#2026pass` unless you set `--password`): interns `intern0001@bulk.demo.test` to `intern1200@bulk.demo.test`; companies `hr0001@bulk.demo.test` to `hr0080@bulk.demo.test`.
- **Companies:** about 85% approved, with some pending, rejected and suspended so the admin approval screens have work in them. Approved companies have verified documents (the files themselves do not exist, so downloading them shows "not found").
- **Internships:** mostly approved, plus pending, rejected, closed and a few expired ones; about 55% paid; a spread of work styles, durations and counties.
- **Interns:** realistic Kenyan names, institutions, courses and skills; most active, a few unverified or suspended; profile completion varies. Demo interns have no uploaded CV or photo, so the profile tops out at 80% and they cannot submit new applications; they already have their seeded ones.
- **Payments and applications:** about 46% of active interns have paid KSh 199 (with application access active), and they have applied to one to six internships at every status from submitted to selected. A few failed and cancelled payments are included.

## Important
- **Never leave this on a public site.** All 1,200 accounts share one known password. Use it on a demo database, then remove it before real users or real money arrive.
- Do not run it on a database that holds real data you cannot afford to touch. It only adds and removes `@bulk.demo.test` records, but take a backup first if in doubt.
- The seeded dates make the admin dashboard, analytics and revenue charts look established; the revenue figures are fake.
