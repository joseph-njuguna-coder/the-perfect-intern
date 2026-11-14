# Free deployment: GitHub + Render + Neon (+ Brevo for email)

Good for a **demo, a pilot or Safaricom sandbox testing**. Read "Limits" before taking real money or real CVs on it.

## What you need (all free sign-ups)
- A **GitHub** account (Render deploys from a Git repository; GitHub is the easiest).
- **Render** (hosts the app), **Neon** (PostgreSQL), **Brevo** or **Resend** (email sent over HTTPS), and a **Safaricom Daraja** sandbox account (payments).
- **Do not use plain SMTP on Render's free tier.** Render blocks outbound SMTP ports 25, 465 and 587 there, so SMTP connections just time out. The app therefore sends through an HTTPS email API (`EMAIL_PROVIDER=brevo` or `resend`).
- Node 20+ and Git on your computer (for the one-off database setup).

## 1. Put the code on GitHub
1. Unzip the project. In the project folder run `npm install --prefix server` and `npm install --prefix client` once, so the `package-lock.json` files are created.
2. On github.com create a **private** repository named `perfect-intern` (empty: no README).
3. In the project folder:
```bash
git init
git add .
git commit -m "The Perfect Intern"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/perfect-intern.git
git push -u origin main
```
`.gitignore` already keeps `.env`, `node_modules` and `uploads` out of the repository. **Never commit real keys or passwords.**

## 2. Create the database on Neon
1. neon.com, sign up, create a project (pick the region nearest Kenya that is offered; Europe is usually closest).
2. Copy the **connection string** (it looks like `postgres://user:pass@ep-xxxx.neon.tech/neondb?sslmode=require`).

## 3. Create the tables and the first admin (from your computer, once)
Create `server/.env` with just:
```
DATABASE_URL=<your Neon connection string>
SEED_ADMIN_EMAIL=you@example.com
SEED_ADMIN_PASSWORD=<a strong password>
NODE_ENV=production
```
Then:
```bash
cd server
npm run migrate
npm run seed
```
`NODE_ENV=production` seeds only categories, settings and your admin (clean data). **Leave that line out** if you want the demo companies, internships and demo logins for private testing, but do not leave demo accounts on a public site: their passwords are in the README. Afterwards delete `server/.env`.

## 4. Create the app on Render
1. render.com, sign up with GitHub, **New > Web Service**, pick the `perfect-intern` repository.
2. Settings:
   - **Name:** `theperfectintern` (your address becomes `https://theperfectintern.onrender.com`; if the name is taken Render adds letters, so use the exact address it gives you below)
   - **Runtime:** Node, **Instance type:** Free, **Root directory:** leave empty
   - **Build command:** `npm run build:render`
   - **Start command:** `npm run start:render`
   - **Health check path:** `/api/health`
3. Add these **environment variables**:
```
NODE_ENV=production
NODE_VERSION=20
SERVE_CLIENT=true
APP_URL=https://theperfectintern.onrender.com        (your exact Render address)
DATABASE_URL=<your Neon connection string>
SESSION_SECRET=<random 40+ characters>
UPLOAD_DIR=/tmp/uploads
EMAIL_PROVIDER=brevo
BREVO_API_KEY=<your Brevo API key (not the SMTP key)>
MAIL_FROM="The Perfect Intern <the sender address you verified in Brevo>"
ADMIN_NOTIFY_EMAIL=you@example.com
MPESA_ENV=sandbox
MPESA_CONSUMER_KEY=<Daraja sandbox>
MPESA_CONSUMER_SECRET=<Daraja sandbox>
MPESA_SHORTCODE=174379
MPESA_PASSKEY=<Daraja sandbox passkey>
MPESA_CALLBACK_URL=https://theperfectintern.onrender.com/api/payments/mpesa/callback
MPESA_CALLBACK_SECRET=<random 32+ characters>
```
   Generate random values at any password generator, or with `openssl rand -hex 32`.
   **Email setup (Brevo):** create an account, add and verify the sender address you will use in `MAIL_FROM` (Brevo only sends from verified senders), then create an **API key** in your Brevo account settings. For better inbox delivery, verify your own domain in Brevo too. **Alternative (Resend):** `EMAIL_PROVIDER=resend` and `RESEND_API_KEY=...`; Resend needs a verified sending domain before it will email other people, so check its current rules.
4. Click **Create Web Service**. The first build takes several minutes. When it says "Live", open your address.

## 5. Check it
1. Open the site; the homepage should load with your logo.
2. Register an intern; the verification email should arrive (check spam the first time).
3. Sign in as your admin and approve a company and a listing.
4. Pay with the Daraja sandbox test number and confirm access activates.
If something fails, open the service's **Logs** tab in Render and send me the error.

## If emails do not arrive
1. In Render > **Logs**, look for `Email failed:` lines. The reason is also saved in the database table `email_logs` (columns `status` and `error`).
2. Test from your own computer: put the same email variables in `server/.env`, then run `cd server && npm run test:email -- you@example.com`. It prints the provider, what is missing, and the exact error.
3. Common causes:
   - `timeout`, `ETIMEDOUT` or `ECONNREFUSED`: you are using SMTP on a host that blocks it. Switch to `EMAIL_PROVIDER=brevo` or `resend`.
   - `rejected the email (401)`: wrong or missing API key (Brevo's API key is different from its SMTP key).
   - `rejected the email (400)` mentioning the sender: the `MAIL_FROM` address is not verified with the provider.
   - Arrives in spam: verify your domain with the provider and add its SPF and DKIM records.
   - No email and no error: `EMAIL_PROVIDER` or the key is not set, so in development the email is only printed to the log.

## Updating later
Change code, then `git add . && git commit -m "message" && git push`. Render redeploys automatically and runs the migrations on start.

## Limits you must know about
- **Uploads are not permanent.** Free Render services have no persistent disk, so CVs, photos and company documents stored in `/tmp/uploads` disappear whenever the service restarts, redeploys or wakes from sleep. Fine for testing; not for real users. The fix is to store files in object storage (Cloudflare R2, Backblaze B2, Supabase Storage or any S3-compatible service). This is not built yet.
- **The app sleeps** after about 15 minutes without visitors and takes about a minute to wake. M-Pesa flows still work because the payment starts from an awake server, but the first visitor after a quiet period waits.
- **Free limits change.** Check render.com and neon.com for the current terms. Neon's free database is small (about 0.5 GB), which is plenty for the data (files are not stored in it).
- **Real money:** use this only with the sandbox. For going live, move to an always-on paid instance with persistent storage, set `MPESA_ENV=production` and follow `docs/DEPLOYMENT.md` and `docs/LAUNCH_CHECKLIST.md`.
