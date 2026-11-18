# M-Pesa (Daraja) sandbox: setup and troubleshooting

The payment code is already in the app (Phase 6). This guide gets it talking to Safaricom's **sandbox**, where no real money moves.

## 1. Get sandbox credentials
1. Sign in at developer.safaricom.co.ke (create a free account if needed).
2. **My Apps > Add a new app**. Tick **Lipa Na M-Pesa Sandbox** (that is the STK Push product). Create it.
3. Copy the app's **Consumer Key** and **Consumer Secret**.
4. From the portal's Lipa Na M-Pesa (STK Push) page, note the sandbox **shortcode** (normally `174379`) and the sandbox **passkey** shown there. Copy the passkey from the portal rather than from anywhere else.

## 2. Set the variables on Render (Environment tab)
```
MPESA_ENV=sandbox
MPESA_CONSUMER_KEY=<from the portal>
MPESA_CONSUMER_SECRET=<from the portal>
MPESA_SHORTCODE=174379
MPESA_PASSKEY=<sandbox passkey from the portal>
MPESA_TRANSACTION_TYPE=CustomerPayBillOnline
MPESA_CALLBACK_URL=https://YOUR-APP.onrender.com/api/payments/mpesa/callback
MPESA_CALLBACK_SECRET=<32+ random hex characters, e.g. from openssl rand -hex 32>
MPESA_ALLOWED_IPS=            (leave EMPTY in the sandbox)
MPESA_PARTY_B=                (leave empty)
MPESA_MOCK=false
```
Notes: do not add the secret to the callback URL yourself (the app appends it). Use hex characters for the secret so the URL needs no encoding. Save and redeploy after changing anything.

## 3. Prove the credentials work (from your computer)
Put the same `MPESA_*` values, plus `DATABASE_URL` and `SESSION_SECRET`, into `server/.env`, then:
```bash
cd server
npm run test:mpesa -- 0708374149 1
```
(`254708374149` is the commonly used sandbox test number; your own Safaricom number can also be used in sandbox.) It prints your settings with secrets hidden, sends one STK Push, and shows Safaricom's exact answer. Delete the `.env` afterwards.

## 4. Prove the callback route is reachable
In PowerShell (a wrong secret must be rejected, which proves the route is live without creating anything):
```powershell
Invoke-WebRequest -Method POST -ContentType "application/json" -Body "{}" https://YOUR-APP.onrender.com/api/payments/mpesa/callback/wrong-secret
```
Expected: a **404** error. A page-not-found HTML page or a timeout means the URL or deploy is wrong.

## 5. Test the real flow in the site
1. Register an intern and sign in. Complete at least 70% of the profile and upload a PDF CV.
2. Open an approved internship and click **Apply Now**. You land on the Pay page.
3. Enter the test number and click Pay.
4. In the sandbox, no real money moves. Depending on Safaricom's sandbox behaviour you may or may not see a prompt on a phone; what matters is that the Pay page moves to "Payment confirmed" after the callback arrives.
5. Check the result in **Admin > Finance** (status, M-Pesa code, audit trail) or in the Neon SQL editor:
```sql
select id, status, amount, phone, result_desc, mpesa_receipt, created_at from payments order by id desc limit 5;
```

## Troubleshooting
| What you see | Likely cause and fix |
|---|---|
| Pay page says "Payments are temporarily unavailable" | Render Logs show `M-Pesa is not configured. Missing: ...`. Add the missing variables. |
| "We could not send the M-Pesa prompt" | Logs show `STK push failed: ...` with Safaricom's reason. Wrong key/secret, the app lacks the Lipa Na M-Pesa Sandbox product, or the shortcode and passkey do not match. Run `npm run test:mpesa`. |
| Stays on "Check your phone" and no callback | Look in Logs for `POST /api/payments/mpesa/callback/...`. None: `MPESA_CALLBACK_URL` is wrong or not public. Status 404: the secret in the URL differs from `MPESA_CALLBACK_SECRET` (a changed value needs a redeploy). Status 403: `MPESA_ALLOWED_IPS` is set; empty it. |
| Payment shows failed, "Amount mismatch" | The callback amount differs from the fee on record. See the audit trail in Admin > Finance. |
| Pending for 15 minutes then "timed out" | No callback and no answer to the status query. The app marks it failed but still accepts a late success. |
| Callback arrives but the phone number looks masked | Safaricom now masks the phone number in callbacks. The app does not use it: payments are matched by CheckoutRequestID, so this is fine. |

## Going live later
Complete Safaricom's Go Live process for your real Paybill or Till. The production passkey is different from the sandbox one, so replace the shortcode, passkey and keys, set `MPESA_ENV=production`, set `MPESA_ALLOWED_IPS` to Safaricom's current callback IPs, and do one real KSh 1 payment (temporarily set the fee to 1 in Admin > Platform settings). See `docs/LAUNCH_CHECKLIST.md`.
