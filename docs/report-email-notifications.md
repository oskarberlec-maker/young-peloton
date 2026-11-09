# Race correction notifications — Gmail delivery

Visitors submit corrections at `/report` or from a race card. They **must** supply
an HTTPS source showing the proposed correction. The form works without GitHub
or any user login.

## Delivery behavior

1. The server validates the report and saves it as a private Vercel Blob at
   `corrections/v1/YYYY-MM-DD/<UUID>.json`.
2. It attempts to email the fixed administrator Gmail address using the
   **server-only** Resend API. The email contains the race name, ID, issue
   category, proposed correction, source link, and report reference.
3. If the provider accepts the email, the stored report records `emailStatus:
   "sent"`. Otherwise it remains `"pending"`, is not lost and is never
   falsely reported to visitors as sent.
4. The Vercel Cron `/api/report-mail-retry` retries pending notifications
   daily using the existing `CRON_SECRET` for authentication. It reuses a
   stable report UUID as the Resend idempotency key.

## One-time setup (owner)

- Create or connect a Resend account and verify the owned domain
  `youngpeloton.eu` according to the DNS records shown in Resend
  (DKIM/SPF and, if requested, return-path). Do **not** publish API credentials
  in the repository or send them over chat.
- In **Vercel Project → Settings → Environment Variables**, add
  `RESEND_API_KEY` as a sensitive/encrypted **server-only** value for
  `production`. Set it for `preview` only if you explicitly intend to
  send test reports there.
- `ISSUE_REPORT_TO_EMAIL` is the owner's Gmail inbox. The preconfigured
  `ISSUE_REPORT_FROM_EMAIL` is
  `Young Peloton <reports@youngpeloton.eu>`. This from-domain must be
  verified in Resend before delivery can work.
- Redeploy the application so the new server environment is available. To
  verify, submit one legitimate test report using a public HTTPS confirmation
  URL and check both the Gmail inbox and Spam folder. Avoid sending fake
  corrections to the production system.
- In the event of an outage, reports stay in private storage and the retry
  schedule processes them later. Resend acceptance does not guarantee inbox
  placement, so monitor the provider's delivery status too.

**Limitation:** Linking the user's Gmail connector in ChatGPT does not grant
the deployed Vercel application ongoing Gmail-sending permissions. Its
server-side mail service requires its own credential and verified sender.
