# SkillBridge authentication

SkillBridge uses Next.js 16.4 App Router, React 19, TypeScript, Tailwind CSS, the existing UI components, npm, `@neondatabase/auth` 0.5.0-beta, and `@neondatabase/serverless` 1.2.0. The installed Auth SDK requires Next.js 16, so Next.js was upgraded from 15 without replacing the application's route structure.

## Current status and actual verification

Verified on October 9, 2026:

- `npm run lint`: passed with no warnings.
- `npm run typecheck`: passed.
- `npm run build`: passed, including all protected routes.
- `npm test`: 52 tests passed across four files. Covers input validation, SDK initialization, profile creation, request origins, anonymous access, forged identities, one-time roles, username collisions, recovery errors, and role-scoped APIs.
- `npm run test:db`: six live Postgres checks passed. Duplicate usernames, unique Auth IDs, initial onboarding, immutable completed roles, invalid roles, and rollback of fixtures were verified.
- `npm run test:smoke`: 23 live HTTP checks passed, including Google OAuth initiation, protected page redirects, validation, origin checks, and anonymous API denial.
- `npm run test:session`: 20 live authenticated checks passed with the user-provided verified Student account. Verified login, HttpOnly cookies, session persistence after cache expiry, profile creation, saved onboarding, role immutability, Student dashboard/API access, denied Business/Admin dashboard/API access, case-insensitive duplicate username rejection, recovery request, logout, and denial after logout.
- After the user completed password reset, `npm run test:session -- --skip-recovery` passed all 19 checks using the new password, without requesting another reset email.
- The user completed registration and OTP email verification in their browser, then reported successful Google and email login. These browser steps are user-verified, not automated browser tests: no browser was exposed to this agent's computer-use tools.
- `npm audit --omit=dev`: zero runtime dependency advisories. The full audit reported nine development-tool advisories, primarily in Tailwind and ESLint transitive dependencies; these still need review before production CI is finalized.

No Neon MCP tools were exposed to this session. The supplied Postgres connection was used to inspect the existing schema, apply the reviewed additive migration transactionally, and run rollback-only database tests. Existing tables were in `neon_auth`; none of those tables was modified. No separate preview database branch was provisioned.

## Environment and start commands

All values are server-only. `.env.local` and `.env.test.local` are gitignored, and this was verified. Never prefix these secrets with `NEXT_PUBLIC_`.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | The Neon Postgres connection string for the same branch as Auth. Use a pooled application connection. |
| `NEON_AUTH_BASE_URL` | The exact branch Auth URL from Neon Console, including `/neondb/auth`. |
| `NEON_AUTH_COOKIE_SECRET` | A cryptographically random secret of at least 32 characters. A local secret was generated. Keep the same secret across application instances. |
| `APP_URL` | Exact application origin, currently `http://localhost:3000`. Used for request-origin and redirect validation. Change it for deployment. |

If the local environment already exists, keep it. For a new checkout, copy `.env.example` to `.env.local` and fill in actual values. On PowerShell:

```powershell
npm install
# Only on a new checkout without .env.local:
Copy-Item .env.example .env.local
# Fill in .env.local before running the following commands.
npm run db:inspect
npm run db:migrate
npm run dev
```

Production build and checks:

```powershell
npm run lint
npm run typecheck
npm test
npm run test:db
npm run build
npm run start
# With the server running, use a second terminal:
npm run test:smoke
```

The opt-in authenticated test reads `.env.test.local` with `TEST_EMAIL`, `TEST_PASSWORD`, `TEST_ROLE`, and `TEST_FULL_NAME`. This file contains only local test credentials and must remain ignored. `npm run test:session` requests one recovery email and can complete onboarding with the explicitly chosen test role if it is pending. Use `npm run test:session -- --skip-recovery` for later checks without another recovery email. The script never prints credentials or cookies.

## Neon Console configuration

Use the same project and branch for Postgres and Auth. In **Branch → Auth → Configuration**, enable Managed Neon Auth and copy its Auth URL. Enable email/password signup and required email verification. The application also enforces `emailVerified` before onboarding and protected data access. Verification codes work with Neon's shared development email provider.

Set **Application Name** to **SkillBridge**. In Auth settings, enable Google, add trusted production/preview application origins, and retain localhost access on the development branch. Configure custom SMTP for production delivery. Google shared credentials and shared SMTP are intended for development; production needs your own provider credentials. Disable localhost access on a separate production branch when local testing is no longer needed there. See [Neon's production checklist](https://neon.com/docs/auth/production-checklist).

This agent configured the application and database, but did not change your Neon Console project name, SMTP settings, trusted production domains, or OAuth client credentials. Credentials already shared in chat should be replaced before production deployment, then updated in the ignored environment files.

## Google Cloud Console configuration

1. Create/select a Google Cloud project. Configure Google Auth Platform branding with **SkillBridge**, a support email, developer contact, and the application's authorized domains.
2. Create an OAuth client of type **Web application**.
3. In **Authorized redirect URIs**, use the exact callback displayed by Neon for your branch: `{NEON_AUTH_BASE_URL}/callback/google`. Register each branch you will use. The callback belongs to Neon's Auth service.
4. Add your application origins under **Authorized JavaScript origins** where applicable: `http://localhost:3000` and your production origin. Add the Auth origin if Google's setup requires it.
5. In Google Testing mode, add the Google accounts used for testing. Complete publication/verification requirements before public access.
6. Paste the real Google client ID and secret into **Neon → Settings → Auth → OAuth providers → Google**. These values belong in Neon, not the browser bundle.

The SDK's `callbackURL` is the later application landing page, `/auth/continue`, and its origin must be trusted in Neon. It is different from Google's authorized redirect URI. See [Neon's Google OAuth guide](https://neon.com/docs/auth/guides/setup-oauth).

## Database and authorization

`migrations/001_skillbridge_auth.sql` creates only the `skillbridge` application schema:

- `profiles`: UUID `id`; unique text `auth_user_id`; constrained lowercase `username`; `email`; `full_name`; optional `avatar_url`; nullable `role` constrained to `student`, `business`, or `admin`; `onboarding_completed`; and creation/update timestamps.
- A unique `lower(username)` index enforces case-insensitive usernames.
- `rate_limits`: hashed request keys, atomic attempt counters, and expiry timestamps shared across application instances.

Application tables never contain passwords or password hashes. Neon Auth owns credentials and sessions. App SQL uses tagged parameters, and profiles are selected using the validated Auth user ID. Profiles are created with a single atomic insert and `ON CONFLICT (auth_user_id) DO NOTHING`; retried callbacks preserve existing profiles. For OAuth display names or simultaneous username claims, a deterministic fallback username is assigned and can be chosen during onboarding.

Onboarding atomically sets Student/Business only while `onboarding_completed` is false. A concurrent or subsequent request cannot replace a completed role. An Admin cannot be selected through any application form or endpoint. Trusted operators can grant Admin using a reviewed SQL update against `skillbridge.profiles` for a verified account; there is no public promotion endpoint.

SDK proxy/session checks protect routes, and server components plus APIs independently enforce verification and role permissions. `/api/profile` exposes only the current user's profile. `/api/workspace/[role]` returns 401 for anonymous callers and 403 for mismatched roles. Application CSRF protection rejects mutation origins outside `APP_URL`. Shared Postgres counters limit sensitive Auth and onboarding operations; logout remains available without the counter. For large deployments, tune quotas, add host-level request throttling, and schedule removal of expired rate-limit records.

## Flows and remaining limits

- `/signup`: username, email, password, confirmation, password visibility, validation, loading/error states, Google signup. Username availability is checked before registration and ultimately enforced by the profile database.
- `/login`: email/password and Google sign-in, followed by verified onboarding or a fixed role dashboard.
- `/verify-email`: OTP verification and resending codes.
- `/forgot-password` and `/reset-password`: documented SDK recovery request and token-based reset with the same password policy. Reset completion was performed by the user and the new password was verified by automated login.
- `/onboarding`: Student/Business selection. `/register` redirects to `/signup`.
- `/student/dashboard`, `/business/dashboard`, `/admin/dashboard`: protected by their respective server checks. Existing project content remains demo data; authentication and profiles use live Neon services.
- Logout and explicit Google linking are available in the workspace. Linking calls the official `linkSocial` API; its consent flow has not been separately tested. The application never merges profiles using email matches and does not implement custom password authentication.
- Username/password login is not implemented because the managed client does not expose the username plugin. Sign in with email/password and keep a unique application username.
- Auth account creation and the application profile insert span two services; there is no distributed transaction. If profile creation fails after an Auth account exists, the callback retries idempotently on the next successful login.
- Complete a Business user's onboarding and an operator-granted Admin's successful dashboard access in a browser before launch. Their role logic is covered by automated tests, but successful live sessions for those roles were not exercised.

## Created and modified files

Created:

```text
AUTHENTICATION.md
eslint.config.mjs
vitest.config.mts
migrations/001_skillbridge_auth.sql
scripts/database.mjs
scripts/test-database.mjs
scripts/smoke.mjs
scripts/test-session.mjs
src/lib/db.ts
src/lib/auth/client.ts
src/lib/auth/server.ts
src/lib/auth/profile.ts
src/lib/auth/ensure-profile.ts
src/lib/auth/security.ts
src/lib/auth/validation.ts
src/proxy.ts
src/app/error.tsx
src/app/(auth)/signup/page.tsx
src/app/(auth)/forgot-password/page.tsx
src/app/(auth)/reset-password/page.tsx
src/app/(auth)/verify-email/page.tsx
src/app/(auth)/onboarding/page.tsx
src/app/auth/continue/page.tsx
src/app/(student)/student/layout.tsx
src/app/(business)/business/layout.tsx
src/app/(admin)/admin/layout.tsx
src/app/api/auth/[...path]/route.ts
src/app/api/profile/route.ts
src/app/api/workspace/[role]/route.ts
src/components/auth/AuthForm.tsx
src/components/auth/OnboardingForm.tsx
src/components/auth/AccountControls.tsx
tests/auth.test.ts
tests/auth-proxy.test.ts
tests/profile-creation.test.ts
tests/sdk.test.ts
```

Modified:

```text
.env.example
README.md
package.json
package-lock.json
postcss.config.mjs
tsconfig.json
next-env.d.ts
src/app/layout.tsx
src/app/(auth)/login/page.tsx
src/app/(auth)/register/page.tsx
src/app/(student)/student/profile/page.tsx
src/app/(business)/business/profile/page.tsx
src/app/(business)/business/post-problem/page.tsx
src/components/layout/DashboardLayout.tsx
src/components/layout/Navbar.tsx
src/components/layout/Sidebar.tsx
src/components/shared/DashboardHome.tsx
src/components/shared/RolePage.tsx
```

Ignored local files created: `.env.local` and `.env.test.local`. Existing `.agents` and `skills-lock.json` were retained.
