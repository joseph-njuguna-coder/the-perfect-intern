# Launch checklist

Tick every box on a staging copy first, then repeat on production.

## Content and brand
- [ ] Replace the placeholder testimonials in `client/src/content.js` with real, consented quotes (or remove the section).
- [ ] Review About, For Companies, How It Works, FAQ and Privacy copy; have a Kenyan data protection lawyer review the privacy notice and consent wording.
- [ ] Add real imagery or illustrations if you want more than the current typographic design (none is bundled).
- [ ] Confirm the social links in `client/src/content.js` are the ones you want public (the TikTok handle is `@phenomenal.chapterz`, which differs from the other channels) and that the Google link opens your business listing.
- [ ] Send yourself a test email and confirm the logo shows in Gmail and Outlook (it loads from your public site address).
- [ ] Set the contact email (`ADMIN_NOTIFY_EMAIL`) and check contact-form messages arrive.

## Accounts and data
- [ ] Production database created, migrated and seeded; `SEED_ADMIN_PASSWORD` removed from the env file; admin password changed.
- [ ] No demo accounts exist (`SELECT email FROM users WHERE email LIKE '%@demo.test'` returns nothing).
- [ ] Categories and fee reviewed in Admin > Platform settings.

## Infrastructure and security
- [ ] HTTPS works, HTTP redirects, certificates auto-renew (`sudo certbot renew --dry-run`).
- [ ] API reachable only through nginx; PostgreSQL not exposed publicly; firewall allows only SSH and web.
- [ ] `SESSION_SECRET` and `MPESA_CALLBACK_SECRET` are long random values; `MPESA_MOCK` is false.
- [ ] Security headers present (check with securityheaders.com); no CSP errors in the browser console.
- [ ] `npm audit` reviewed; lockfiles committed.
- [ ] Backups run nightly, are copied off-site, and a restore has been rehearsed successfully.
- [ ] Uptime monitoring and alerts configured.

## Email
- [ ] SMTP credentials set; SPF, DKIM and DMARC records published for the sending domain.
- [ ] Verification, password-reset, application, interview and receipt emails received in Gmail and an Outlook/Yahoo inbox (not spam).

## M-Pesa go-live (confirm current requirements in Safaricom's Daraja documentation)
- [ ] The full flow passed on the Daraja **sandbox** through the real STK Push and callback (not only the simulator).
- [ ] You hold a production Paybill or Till number and have completed Safaricom's go-live process; production consumer key, secret and passkey are in the env file with `MPESA_ENV=production`.
- [ ] Callback URL is public HTTPS and ends with your secret; `MPESA_ALLOWED_IPS` lists Safaricom's current source IPs.
- [ ] Make one real low-value payment (temporarily set the fee to KSh 1): access activates, the receipt and email arrive, the M-Pesa code matches your statement; also test a cancelled prompt. Restore the fee to KSh 199 afterwards.
- [ ] Decide and document your refund and failed-payment support process (the admin Finance page and audit log show every step).

## Functional pass (all three roles)
- [ ] Intern: register, verify, complete profile, save, apply (blocked correctly at each gate), pay, apply, track, withdraw, export and delete account.
- [ ] Company: register, upload documents, wait for approval, post, edit (returns to review), review applicants, shortlist, schedule, select, reject, message.
- [ ] Admin: approve and reject companies and listings, verify documents, feature, suspend and reactivate, view finance, export CSV, change categories and settings.
- [ ] Mobile phone and tablet pass on the real site (layout, forms, file upload, printing a receipt).
- [ ] Run the integration suite against a test database one last time: `npm run test:integration`.

## After launch
- [ ] Check the audit log and the "payment anomalies" counter daily for the first week.
- [ ] Reconcile payments against the M-Pesa statement weekly.
- [ ] Schedule a quarterly restore test and a dependency update.
