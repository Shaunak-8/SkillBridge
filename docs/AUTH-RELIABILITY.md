# Authentication reliability

The app retains Neon Auth and its official SDK, OAuth verifier, HttpOnly cookies,
CSRF checks, email verification, onboarding, and server-side role checks.

## Fixed failure paths

- The signed session cache previously lasted one second. It could expire between
  middleware and rendering, causing repeated network checks. It now lasts 60
  seconds. Middleware forwards renewed cookies to the current render and browser.
  Server Components share session reads within a render using React `cache`;
  no user identity is stored in a process-wide cache.
- A failed session lookup is no longer treated as proof of logout. Session GETs
  retry one server/transport failure. Persistent failures return a retryable 503
  without deleting the cookie or redirecting to login. Mutations are not retried.
- Successful email login and logout perform a fresh document navigation so stale
  router state cannot reuse a prior anonymous redirect or authenticated page.
  Email login first confirms the persisted cookie belongs to the signed-in user,
  then loads the server profile and navigates directly to that role's dashboard.
  Missing cookies or profile failures show an error instead of a redirect loop.
  Visiting `/login` with a valid session redirects to the dashboard (or required
  verification/onboarding), including when opened in a new tab.
- Upstream throttling stays 429; provider outages stay 503 instead of appearing
  as incorrect credentials. Signup preserves successful auth cookies if profile
  storage fails; the authenticated continuation retries idempotent profile creation.
- Local auth pages redirect loopback aliases to the configured `APP_URL` during
  development. Use `https://localhost:3000`: WebKit rejected the Secure session
  cookies over plain HTTP in the reproduced failure. `npm run dev` creates an
  ignored, local-only certificate; its untrusted-certificate warning is expected
  only on your own localhost. It never changes system trust or production TLS.
  Switching hostnames uses separate cookie jars. Never bypass certificate warnings
  on the public deployment.
- Vercel origin checks accept only explicit server-configured domains and exact
  deployment/branch aliases from Vercel system variables, not arbitrary Host headers
  or every `*.vercel.app` site. Missing/local APP_URL falls back to the deployment
  configuration on Vercel. Production-domain fallback is not inherited by previews.
  Auth callbacks stay on the validated requesting origin.
- Signup explicitly requests an email verification code, keeps only the email in
  tab storage, and offers resend if delivery fails. Verification clears stale
  unverified cache data and continues to login if no session was issued.
- Successful email login refunds only its own failed-attempt allowance; failed
  attempts and the global rate limit remain enforced.
- Error boundaries use this installed Next.js version's `retry` prop so their
  recovery buttons actually retry server rendering.

The 60-second signed cache is a bounded revocation window, not session lifetime.
External revocations may take up to that interval to be noticed. Normal browser
logout clears cookies immediately; CometChat token issuance separately checks the
live managed session. No expired or unverified cache is accepted on an outage.

## Repeatable verification

Run the app, then `npm run test:auth:browser`. It reads the existing ignored
`.env.test.local` (TEST_EMAIL, TEST_PASSWORD, TEST_ROLE), uses a pre-existing
onboarded account, and checks three login/logout cycles, signed-in login-page
redirects, client navigation, reload after cache removal, new-tab restoration,
and protected-page/API denial after logout.
It signs out only sessions created in its isolated browser context and does not
change profile data, send emails, or record screenshots, traces, passwords, or
cookies. On macOS it uses installed Chrome; elsewhere set BROWSER_EXECUTABLE or
install Playwright Chromium. Never commit the test credential file.

For Safari coverage install Playwright WebKit and set `AUTH_TEST_BROWSER=webkit`.
`npm run test:auth:signup-ui` checks signup, verification, and resend UI using mocked
provider responses; it creates no accounts and sends no email. Local browser tests
ignore certificate trust only for localhost; live deployments must pass TLS checks.
For Node-based local checks such as `test:session` and `chat:sync`, use
`NODE_EXTRA_CA_CERTS=.local-certificates/localhost.pem` to trust just this local
certificate. Do not set `NODE_TLS_REJECT_UNAUTHORIZED=0`.

`npm test` covers transient/persistent failures, retry limits, cookie forwarding,
SDK OAuth delegation, role restrictions, origin checks, signup recovery, and
correct rate-limit responses. `npm run lint`, `npm run typecheck`, and
`npm run build -- --webpack` check the application integration.

Live local email/password checks passed with the existing student account in
WebKit over HTTPS. The user confirmed receiving the real verification code and
logging in locally. Google consent and password-reset email/link completion still
require manual end-to-end checks; mocked tests do not establish delivery or
external provider configuration. No provider can guarantee zero outages.

## Vercel production setup

Production site: https://skill-bridge-tau-tawny.vercel.app

In the Vercel project's **Production** environment, configure:

| Variable | Value |
| --- | --- |
| `APP_URL` | `https://skill-bridge-tau-tawny.vercel.app` |
| `NEXT_PUBLIC_APP_URL` | `https://skill-bridge-tau-tawny.vercel.app` |
| `DATABASE_URL` | The intended production Neon database connection string |
| `NEON_AUTH_BASE_URL` | The matching Neon branch's Auth endpoint |
| `NEON_AUTH_COOKIE_SECRET` | A stable, random server-only secret of at least 32 characters |

Local `.env` / `.env.local` files do not configure Vercel. Do not upload test
credentials or the local TLS certificate. Keep local APP_URL on localhost for
local development. Never prefix database credentials or cookie secrets with
`NEXT_PUBLIC_`. Rotate credentials that were shared in chat before production use;
rotating the cookie secret will invalidate cached sessions.

Enable Vercel system environment variables if using automatic URL detection.
Scope explicit production URLs to Production; for previews use the actual preview
origin and matching Neon branch, not production URLs/credentials accidentally
inherited from local files. Register every used origin in the appropriate Neon
Auth branch's Trusted Domains, including the production site above (no trailing
slash). Do not add wildcard trust for other Vercel projects.

Vercel supplies public HTTPS; `scripts/dev.mjs` and its certificate are only for
`npm run dev`, not `npm run build` / `npm start`. After changing Vercel variables,
redeploy the source revision containing these fixes: redeploying an old revision
does not publish uncommitted local changes. No commit, push, or deployment was
performed as part of this local fix.

After deploying, test signup with an email you control, verification, onboarding,
sign-out, and sign-in; then reload the dashboard and open it in a second tab.
Check Google and password recovery separately if enabled. Neon recommends custom
SMTP for production email and your own OAuth provider credentials.

### Deployment check, 2026-10-10

Local verification: 422 unit tests, TypeScript, targeted auth lint, production
webpack build, and client-secret scan passed. All 19 live WebKit auth checks and
3 mocked signup/verification UI checks passed. The same test credentials were
used for local and deployed sign-in; they worked locally but not on Vercel.

The public login page passed normal TLS verification and returned HTTP 200.
Anonymous session lookup returned null, protected profile access was denied, and
an empty same-origin login request reached input validation (400, not an origin
rejection). However, the existing test account's live WebKit login returned 401
and remained on `/login` without a session cookie. Production login is therefore
**not verified working**. This is upstream login rejection, not the localhost
certificate warning. Check the deployed Auth endpoint/branch and account details;
the public response alone cannot distinguish invalid credentials, unverified
email, a different Auth branch, or provider-side domain configuration. Confirm
the Vercel origin is in that branch's Trusted Domains too. The Vercel CLI token was invalid, so private
environment settings could not be inspected. Do not treat local tests as proof
that the currently deployed revision contains these fixes.

References: [Vercel system variables](https://vercel.com/docs/environment-variables/system-environment-variables),
[Vercel HTTPS](https://vercel.com/docs/domains/working-with-ssl),
[Neon trusted domains](https://neon.com/docs/auth/guides/configure-domains),
[Neon production checklist](https://neon.com/docs/auth/production-checklist).
