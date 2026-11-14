# Deployment guide (Ubuntu 22.04/24.04 VPS, nginx, PostgreSQL, systemd)

This is the primary, recommended path. A Docker alternative is at the end. Shared (cPanel) hosting is not suitable: the API is a long-running Node process and needs PostgreSQL.

> None of these steps could be executed in the environment where the code was written. Do a full dry run on a staging server (with the Safaricom sandbox) before production, and fix any command that differs on your distribution.

## 0. What you need
- A server with 2 GB RAM or more, root/sudo access, and a domain whose DNS A record points to it.
- Safaricom Daraja credentials (sandbox first, then production), an SMTP account (Brevo, SES, Mailgun, Zoho, or your host's), and a place for off-site backups.

## 1. Server packages
```bash
sudo apt update && sudo apt install -y nginx postgresql certbot python3-certbot-nginx ufw rsync
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs
sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw enable
```

## 2. User and folders
```bash
sudo adduser --system --group --home /opt/perfect-intern perfectintern
sudo mkdir -p /var/lib/perfect-intern/uploads /var/backups/perfect-intern /var/www/perfect-intern
sudo chown -R perfectintern:perfectintern /var/lib/perfect-intern /var/backups/perfect-intern
sudo chmod 750 /var/lib/perfect-intern /var/lib/perfect-intern/uploads
```
Uploads (CVs, photos, company documents) live in `/var/lib/perfect-intern/uploads`, outside the web root. nginx never serves this folder; only the API does, after checking permissions.

## 3. Database
```bash
sudo -u postgres psql <<'SQL'
CREATE USER perfect_intern WITH PASSWORD 'REPLACE_WITH_LONG_RANDOM';
CREATE DATABASE perfect_intern OWNER perfect_intern;
SQL
```
PostgreSQL listens on localhost only by default; keep it that way.

## 4. Code
Copy the project to `/opt/perfect-intern` (git clone or rsync), then:
```bash
cd /opt/perfect-intern/server
sudo -u perfectintern npm install --omit=dev      # use `npm ci --omit=dev` once you have committed package-lock.json
```
The lockfiles do not exist yet because the packages could not be installed where the code was written. After your first `npm install` in `server/` and `client/`, **commit both `package-lock.json` files** so every deploy installs identical versions.

## 5. Environment file
Create `/etc/perfect-intern.env` (`sudo chown root:perfectintern`, `sudo chmod 640`). Start from `server/.env.example`; production values:
```
NODE_ENV=production
PORT=4000
APP_URL=https://example.co.ke
SESSION_SECRET=<openssl rand -hex 32>
DATABASE_URL=postgres://perfect_intern:PASSWORD@localhost:5432/perfect_intern
UPLOAD_DIR=/var/lib/perfect-intern/uploads
EMAIL_PROVIDER=smtp          # smtp (your own server or relay), brevo or resend (HTTPS APIs, use these if your host blocks SMTP)
SMTP_HOST=...   SMTP_PORT=587   SMTP_SECURE=false   SMTP_USER=...   SMTP_PASS=...      # when EMAIL_PROVIDER=smtp
# BREVO_API_KEY=...  or  RESEND_API_KEY=...                                         # when using an API provider
MAIL_FROM="The Perfect Intern <no-reply@example.co.ke>"
ADMIN_NOTIFY_EMAIL=you@example.co.ke
SEED_ADMIN_EMAIL=you@example.co.ke
SEED_ADMIN_PASSWORD=<strong one-time password>
MPESA_ENV=production        # use sandbox on staging
MPESA_CONSUMER_KEY=...  MPESA_CONSUMER_SECRET=...  MPESA_SHORTCODE=...  MPESA_PASSKEY=...
MPESA_TRANSACTION_TYPE=CustomerPayBillOnline   # CustomerBuyGoodsOnline + MPESA_PARTY_B for a Till
MPESA_CALLBACK_URL=https://example.co.ke/api/payments/mpesa/callback
MPESA_CALLBACK_SECRET=<openssl rand -hex 32>
MPESA_ALLOWED_IPS=<Safaricom callback IPs, comma separated>
```
The server **refuses to start** in production if: `APP_URL` is not https, no email provider is configured, `SESSION_SECRET` is shorter than 32 characters, `MPESA_MOCK=true`, or production M-Pesa settings are incomplete or the callback secret is weak. That is deliberate.

## 6. Migrate and seed
```bash
cd /opt/perfect-intern/server
sudo -u perfectintern bash -c 'set -a; . /etc/perfect-intern.env; set +a; npm run migrate && npm run seed'
```
The seed creates the 16 categories, the default settings (fee KSh 199, minimum profile completion 70%) and the admin account. The demo data seed does nothing in production. **Afterwards remove `SEED_ADMIN_PASSWORD` from the env file and change the admin password at first sign-in.**

## 7. Run the API under systemd
```bash
sudo cp /opt/perfect-intern/deploy/perfect-intern.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now perfect-intern
sudo systemctl status perfect-intern && journalctl -u perfect-intern -f
curl -s http://127.0.0.1:4000/api/health/ready        # {"ok":true}
```

## 8. Build and publish the website
On your build machine (or the server):
```bash
cd client && npm install && npm run build            # produces client/dist
rsync -a --delete dist/ user@server:/var/www/perfect-intern/
```

## 9. nginx and HTTPS
```bash
sudo cp /opt/perfect-intern/deploy/nginx.conf /etc/nginx/sites-available/perfect-intern   # replace example.co.ke
sudo ln -s /etc/nginx/sites-available/perfect-intern /etc/nginx/sites-enabled/
sudo certbot --nginx -d example.co.ke -d www.example.co.ke      # issues certificates and auto-renews
sudo nginx -t && sudo systemctl reload nginx
```
The config serves the React app, proxies `/api/` to the API with `X-Forwarded-Proto` (the API needs it for secure cookies and real client IPs), limits uploads to 6 MB, and sets HSTS and a Content-Security-Policy. If the browser console shows CSP violations after you add third-party scripts, extend the policy deliberately rather than loosening it.

## 10. Smoke test (staging first)
1. Open the site over HTTPS; register an intern; confirm the verification email arrives and works.
2. Sign in as admin; approve a test company and a test listing; see it on the public Browse page.
3. Pay with the Daraja sandbox (staging) and confirm access activates and the receipt shows.
4. Check `journalctl -u perfect-intern` for errors, and the admin audit log for the events you just caused.

## 11. Backups
```bash
sudo install -m 750 /opt/perfect-intern/deploy/backup.sh /usr/local/bin/perfect-intern-backup
echo '15 2 * * * perfectintern /usr/local/bin/perfect-intern-backup >> /var/log/perfect-intern-backup.log 2>&1' | sudo tee /etc/cron.d/perfect-intern-backup
```
The script writes a PostgreSQL dump and an uploads archive nightly, keeps 14 days of dailies and a year of monthlies, **but only protects you from a failed disk if you also copy them off the server** (see the rclone line in the script). Practise a restore now:
```bash
sudo systemctl stop perfect-intern
sudo -u postgres dropdb perfect_intern && sudo -u postgres createdb -O perfect_intern perfect_intern
sudo -u postgres pg_restore --no-owner -d perfect_intern /var/backups/perfect-intern/daily/db-YYYY-MM-DD-HHMM.dump
sudo tar -xzf /var/backups/perfect-intern/daily/uploads-YYYY-MM-DD-HHMM.tar.gz -C /var/lib/perfect-intern
sudo chown -R perfectintern:perfectintern /var/lib/perfect-intern
sudo systemctl start perfect-intern
```
Remember that backups hold personal data: encrypt off-site copies and restrict access.

## 12. Releasing updates
```bash
# on the server
cd /opt/perfect-intern && sudo -u perfectintern git pull              # or rsync the new release
cd server && sudo -u perfectintern npm ci --omit=dev
sudo -u perfectintern bash -c 'set -a; . /etc/perfect-intern.env; set +a; npm run migrate'
sudo systemctl restart perfect-intern
# then publish the new client/dist as in step 8
```
Take a backup before every release that includes a migration. **Never run `npm run rollback` in production:** the first migration's down step drops every table. To undo a bad release, redeploy the previous code and restore the pre-release backup if the schema changed.

## 13. Monitoring
- Uptime check (UptimeRobot, Better Stack, etc.) on `https://example.co.ke/api/health/ready`; alert if it fails.
- `journalctl -u perfect-intern` holds one JSON line per request (method, path, status, duration, IP; never bodies or query strings) plus errors.
- Watch the admin dashboard's "payment anomalies" counter and the audit log for `payment.amount_mismatch` and `payment.duplicate_*`; reconcile weekly against your M-Pesa statement.
- Keep the server patched (`unattended-upgrades`) and run `npm audit` on each release.

## 14. Growing beyond one server
Sessions are stored in PostgreSQL, so you can run several API instances behind a load balancer. Uploads are on local disk today, so before adding a second server move them to shared or object storage (the `uploads.js` helper is the only place that touches the filesystem path).

## 15. Docker alternative (untested starting point)
```bash
cp .env.docker.example .env.docker      # fill in
docker compose --env-file .env.docker up -d --build
docker compose --env-file .env.docker run --rm api npm run seed     # first run only
```
This runs PostgreSQL, the API and an nginx web container on port 8080. Put a TLS-terminating reverse proxy (Caddy, Traefik or host nginx) in front, and make sure it sends `X-Forwarded-Proto: https`.
