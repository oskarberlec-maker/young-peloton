# Reporting race data corrections via GitHub Issues

Visitors can report errors from the race card, race detail page or footer via `/report`.

1. The form prefills the race name and ID when opened from a race.
2. The visitor enters the issue category, suggested correction and a public HTTPS evidence link.
3. Clicking **Continue to GitHub** opens the public repository's **New issue** form with a prefilled title and body.
4. The visitor must sign into GitHub and click **Submit new issue**. Leaving the GitHub page without submitting does not create an issue.

The repository must have GitHub Issues enabled. No Resend account, Gmail SMTP credential, Vercel Blob write, GitHub API token or server-only secret is required for new issue reports.

The older private correction reports in Vercel Blob are not deleted or automatically migrated into public GitHub issues. They can still be reviewed separately by the site owner; privacy should be preserved.

The previous email API endpoints, daily retry job and email notification code were removed. The unrelated daily push notification cron remains enabled.
