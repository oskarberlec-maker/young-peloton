# Activate Young Peloton accounts (Supabase + Vercel)

The application has a passwordless email login page at `/season`. It currently falls back to browser-local saved races if cloud credentials are missing. **Do not advertise cross-device sync until the following setup and security verification are complete.**

1. In your Supabase account, create a project you control. Keep database password and service-role key secret.
2. In Supabase SQL Editor apply `supabase/migrations/20261025_racing_season.sql`. Verify RLS is enabled on `public.racing_season_entries` and that `anon` has no access.
3. In Authentication → URL Configuration set **Site URL** to `https://young-peloton.vercel.app` (or your final domain). Add `https://young-peloton.vercel.app/season` to **Redirect URLs**. Include your final custom domain if applicable. Enable email OTP / magic links and a configured outgoing mail service as appropriate.
4. In Vercel Project → Settings → Environment Variables configure `VITE_SUPABASE_URL` and the **public** `VITE_SUPABASE_ANON_KEY`. Never use the `service_role` secret or Supabase database password as client variables. These public variables do not grant account-to-account access because RLS is enforced on every table action.
5. Redeploy and validate: sign in via email, add a race, sign in from another device, see the same race, remove it, sign out, import browser-local saved races intentionally, verify a second user never sees the first user's records.
6. Review privacy obligations before public account registration; only collect email plus racing selections and publish a contact method and privacy notice. Do not build public profiles or publish other users' racing calendars by default.

If environment variables are not present, the application remains usable with the local saved list and a clear message that cloud accounts are unavailable.

**Security checks:** Never log user access tokens or email-link tokens; don't send race selections to analytics. Enforce row-level security server-side. When moving between accounts on a shared browser, sign out before switching users. Check Supabase email rate limits and abuse protection before launch.

## Enable Google Sign-In

Google OAuth also requires provider setup; adding the frontend button alone cannot enable it.

1. Open [Google Cloud Credentials](https://console.cloud.google.com/apis/credentials) and create an OAuth 2.0 client of type **Web application**, with consent screen configured for the site's actual audience.
2. Authorized JavaScript origin: `https://young-peloton.vercel.app`.
3. Authorized redirect URI for Google's OAuth client: `https://tovumhxasksalywzijws.supabase.co/auth/v1/callback` (this is Supabase's callback, **not** the site's `/season` route).
4. In [Supabase Google provider settings](https://supabase.com/dashboard/project/tovumhxasksalywzijws/auth/providers), enable Google and enter the **Google OAuth Client ID and Client Secret** directly in the Supabase dashboard. Do not add the secret to GitHub or Vercel frontend environment variables.
5. In [Supabase URL Configuration](https://supabase.com/dashboard/project/tovumhxasksalywzijws/auth/url-configuration), set Site URL to `https://young-peloton.vercel.app` and allow `https://young-peloton.vercel.app/season`.
6. Test the flow in a browser: Continue with Google → consent/account picker → return to /season, save a race and confirm account-only cloud sync across devices.
7. Keep email sign-in as a fallback until Google OAuth has been tested. The Google button automatically disables if the public provider settings report Google is not enabled.

No Google Client Secret should ever be committed to this repository.
