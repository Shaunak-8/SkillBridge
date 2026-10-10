# CometChat integration

## Architecture and access policy

SkillBridge still uses its existing Next.js 16 App Router, TypeScript route handlers, Neon Auth, parameterized Neon SQL driver, and numbered SQL migrations. No Python backend or second ORM was introduced. Messages and attachment histories live in CometChat, not Neon.

Chat is private between a project business owner and each student who has applied.
Submitted, viewed, reviewing, shortlisted, and accepted applications grant access;
acceptance is not required. Before applying, the student has no business chat
link or contact. Declined, withdrawn, and unrelated applications grant no access.
Other applicants cannot message or discover each other through this feature.
Completed projects retain access; closed/cancelled/deleted projects and removed
or invalid members lose contacts on the next successful synchronization.
Relationships shared through another eligible application are retained.

Internal profile UUIDs map to `sb-user-<uuid>`; email is not an identifier.
Project conversations open a direct message with the authorized business or
applicant. Earlier shared project groups are retired: the worker removes their
human members while retaining provider history and the reserved server-only
`skillbridge-system` owner. Never mint credentials for the system user.

The dedicated `skillbridge-member` CometChat role restricts user lookup and new direct messages to friends, denies group creation/joining, disables profile editing and calling, and is verified through the provider's permissions API before synchronization succeeds. Backend maintenance grants only applicant-owner friendships and removes unauthorized friendships using current Neon application records. Shared groups are neither displayed nor accepted by client authorization. History permits only user messages and is scoped by CometChat to the authenticated conversation participant. The history API requires `listMessages.mode: all`; `friends` silently returns an empty list. Live tests verify that a third account cannot read another pair's messages. Previously exchanged messages remain retained by the provider after withdrawal, but the app hides revoked contacts and the provider denies new messages after reconciliation.

Small SQL triggers increment a durable revision counter whenever applications,
projects, or profiles change. A serialized reconciler provisions contacts without
changing application status. During provisioning, the UI polls read-only
readiness instead of repeatedly minting tokens. No credentials are issued from
a stale membership snapshot.

## Dependencies and compatibility

Installed lockfile versions:

- `@cometchat/chat-uikit-react`: 7.2.4
- `@cometchat/chat-sdk-javascript`: 4.2.0
- `@cometchat/calls-sdk-javascript`: 5.0.3 (the UI Kit's optional peer must resolve during Next.js bundling; calling remains disabled)

The UI Kit supports the existing React 19. Framework versions, TypeScript strictness, and lint rules were not changed. Existing Neon Auth peer conflicts were resolved with compatible overrides for `@daveyplate/better-auth-ui` 3.3.0, `@better-auth/core`/`@better-auth/api-key` 1.6.23, and `@better-fetch/fetch` 1.3.1. Installation used strict peer checking, not `--force` or `--legacy-peer-deps`.

This machine runs Node 25, which triggers an existing Vitest engine warning. Use a supported Node release, such as Node 24, for CI; the tests ran successfully here.

## Environment and setup

In the CometChat dashboard, create/select an app, copy its App ID and region, and create a full-access **REST API key**. An Auth Key is not a replacement for the server REST key. Use a separate CometChat app for each unrelated database environment: two reconcilers using different databases against one app would overwrite each other's permissions.

Add these to ignored `.env.local` (placeholders only below):

```dotenv
NEXT_PUBLIC_ENABLE_CHAT=false
NEXT_PUBLIC_COMETCHAT_APP_ID=YOUR_APP_ID
NEXT_PUBLIC_COMETCHAT_REGION=in
COMETCHAT_API_KEY=YOUR_SERVER_ONLY_REST_KEY
COMETCHAT_SYNC_SECRET=GENERATE_A_RANDOM_SECRET_OF_AT_LEAST_32_CHARACTERS
```

Existing `DATABASE_URL`, `APP_URL`, `NEON_AUTH_BASE_URL`, and `NEON_AUTH_COOKIE_SECRET` remain required. The cookie secret also derives an AES-GCM key for encrypted server-side chat token leases; no plaintext chat tokens are stored in the database. Before rotating that secret, revoke existing CometChat token leases while the old secret is still available. Rotate credentials shared in chat before production.

Generate a maintenance secret locally with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Never expose REST or maintenance keys through `NEXT_PUBLIC_*` variables or commit them.

Install and apply the additive migration:

```sh
npm install --strict-peer-deps
npm run db:migrate
```

Migration `007_cometchat.sql` adds only chat mapping/tombstone tables, encrypted token leases, sync state, and invalidation triggers. Earlier migrations are unchanged. It was numbered after migrations already present in the shared database, including teammates' 004–006 migrations.

To test locally, set `NEXT_PUBLIC_ENABLE_CHAT=true`, restart the app, and run maintenance in a second terminal:

```sh
npm run dev -- --webpack
NODE_EXTRA_CA_CERTS=.local-certificates/localhost.pem npm run chat:sync -- --watch
```

Run these in separate terminals and keep both running. The second command trusts
only the development server's local certificate; do not disable TLS verification
globally. Wait for `Chat membership and token cleanup synchronized.` before
opening Messages. Pending applications do not unlock a project conversation:
the student must submit an application first, then let synchronization finish.
The watcher targets a 30-second start cadence. If a sync takes longer, it starts
the next cycle after one second instead of adding another 30-second gap. Cycles
remain serialized, and stale-worker access protection stays enabled.

The existing Next.js app serves both frontend and backend; there is no separate Python server to start. `APP_URL` must match the browser's origin exactly (including hostname/port). Chat POST endpoints reject other origins. Open `/business/messages` or `/student/messages`, or use Messages in the desktop sidebar/mobile workspace link.

For deployment, schedule an authenticated POST to `/api/chat/sync` every 30–60 seconds using `Authorization: Bearer <COMETCHAT_SYNC_SECRET>`. Store that header only in the scheduler's secret settings. Ensure the host supports the reconciler's runtime. New session issuance requires a successful worker heartbeat within 90 seconds. Keep the flag off until maintenance is configured. Because it is a public build-time flag, rebuild/redeploy after changing it.

## Session safety and maintenance requirement

Server session issuance verifies the existing Neon session, role, email verification, onboarding, membership synchronization, and the live managed session row. Only a token for that authenticated internal user is returned; client-submitted IDs are ignored. Responses are private/no-store. REST keys never enter the browser.

CometChat tokens do **not** natively expire. The application records a maximum 30-minute lease (capped by Neon session expiry), renews it through authenticated requests, and maintenance revokes expired leases and tokens whose managed session no longer exists. Logout marks leases expired before attempting provider deletion. Client logout clears the SDK, broadcasts a token-free logout event to other tabs, and never blocks normal Neon logout indefinitely. Account changes clear the prior SDK identity before the UI becomes available. SDK initialization/login are serialized and pending initialization is invalidated on logout.

Maintenance also removes untracked provider tokens for this integration's registered user IDs after a two-minute minting grace period, recovering credentials orphaned by a network timeout or failed database write. Do not issue independent tokens for these reserved IDs outside this backend.

Access removal and server token revocation are eventually consistent with maintenance, normally within one worker interval. If maintenance or CometChat is unavailable, previously issued provider tokens cannot be guaranteed revoked until service recovers; the app stops issuing credentials when the worker becomes stale and hides the chat on session-check failures. This is a required operational dependency, not an intrinsic token TTL.

Disable the flag to stop SDK initialization, hide navigation, and avoid new CometChat calls. To retire an already-enabled deployment, revoke its active token leases while maintenance and the old encryption secret still work, then disable/rebuild. Disabling alone does not invalidate credentials already issued by CometChat.

## Two-account browser test

The project page shows “Chat with the business” immediately after successful
submission and on reload. Student application cards and business applicant cards
have matching links. They open the correct direct conversation and disappear
after a withdrawal or decline. Deep links are resolved server-side against the
signed-in account; forged application IDs cannot grant contact access.

Use a business account and a student account in separate browser profiles (or normal/incognito windows). Verify both emails and complete onboarding through the existing flow.

1. Sign in as the business and publish a project. Before applying, the student
   must not see its “Chat with the business” link or business contact.
2. Submit the student application. Without accepting it, use “Chat with the
   business” on the success screen or My applications. As the business, use
   “Chat with the student” on that applicant's card. Wait for synchronization.
3. Send a student message and reply as the business. Check receipt, timestamp,
   unread indicator, and history after reload. No shared group is exposed.
4. Try a PNG/JPEG, PDF, or text attachment supported by the app's CometChat plan. Reload and verify history. Continue using the existing submission workflow for official deliverables.
5. Use an unrelated student account to confirm the business never appears. Apply
   as another student: both may contact the business, but cannot discover or
   message each other. A forged project/application link must not grant access.
6. Log out one session while two tabs are open; neither tab may display the previous user's messages. Sign in to a different account and check the prior conversations do not appear. Let a Neon session expire/revoke it and confirm chat is cleared at the next session check and its provider token is removed by maintenance.
7. Withdraw or decline an application: its link disappears and synchronization
   removes the relationship unless another eligible application to the same
   business remains. Complete a project to retain its conversations; close/cancel
   it to remove access after synchronization.
8. Stop maintenance or temporarily disconnect the network. Chat must show an error/retry state; other dashboard features and valid approvals must continue working. Restart maintenance and Retry. Check mobile back navigation and that no horizontal overflow occurs.
9. Set the flag false and restart/rebuild: messaging navigation is hidden, its page shows the missing-configuration fallback, and no new chat calls occur. Restore true and maintenance for further testing.

## Verification

Current applicant-to-business integration: 447 tests across 30 files pass, along
with TypeScript, targeted ESLint, the production webpack build, and the client
secret scan across 131 JavaScript files. The existing student's submitted (not
accepted) application exposes a project chat link that opens the correct
business's real CometChat composer. Before applying, that link is hidden.
The isolated real-SDK browser test passes student-to-business delivery,
business replies, conversation history after reload, third-account history
denial, and denial of new messages after friendship removal. Temporary users,
tokens, and messages are permanently removed after the test. These are local
checks, not verification of an unpublished Vercel deployment. The updated live
REST regression also passes all 16 checks, including real Neon membership sync,
anonymous/CSRF rejection, retained direct-message history, and access revocation.

Historical checks from earlier implementation stages:

Verified during implementation: 143 automated tests, TypeScript, ESLint, production webpack builds with chat both enabled and disabled, 23 existing auth HTTP smoke checks, 17 existing backend HTTP checks, 20 live CometChat REST checks, and rollback-only database lifecycle/clean-schema checks. The development Neon migration was applied successfully. Credentials remain ignored, and chat remains disabled in the local environment by default.

After pulling `main` at `807a422` and restoring the uncommitted integration, 305 tests, TypeScript, and the production webpack build passed. Main initially brought in 15 lint errors and 15 warnings. A subsequently requested cleanup fixed these without disabling rules: lint now has zero errors/warnings, all 308 tests pass, and TypeScript and the production build pass. The client-secret scan now includes the CometChat REST and maintenance keys. The earlier live checks above were performed before this pull, not rerun against all newly imported features.

Automated/unit checks cover configuration, server-only REST handling, authenticated roles/origins, expiry, stable IDs, private metadata, worker authorization/serialization, encrypted leases, provider restriction verification, deleted-project revocation, safe failures, SDK initialization, logout races, account switching, and token-free logout broadcasts.

```sh
npm test
npm run typecheck
npm run lint
npm run build -- --webpack
npm run test:backend
npm run test:smoke
npm run test:integration
NEXT_PUBLIC_ENABLE_CHAT=true npm run test:chat
```

The live REST test creates isolated provider fixtures and cleans them up. It
checks provider restrictions, bidirectional direct messages, retained history,
and third-account denial. It sends no messages to real
participants.

`npm run test:chat:browser` uses two isolated CometChat users to test real browser
SDK send/receive and reload history, then permanently removes those fixtures.
It reads the ignored test credentials for access to the local UI, mocks only the
fixture chat session responses, and does not change real application status.
The SQL membership tests separately execute the actual authorization queries
against PostgreSQL fixtures for before-application denial, all supported active
statuses, withdrawal/decline, closed projects, forged links, and applicant privacy.

Attachment UX, responsive layout, and unread/receipt presentation still require
the manual checklist above. Automated transport checks do not establish these.

The database regression fixture now discovers the vector column's actual dimension, preserving teammates' `vector(768)` schema instead of changing it back to fit an obsolete 3-dimensional test.

## Files

Created:

- `migrations/007_cometchat.sql`
- `src/lib/chat/{config,policy,rest,membership,identity,service,tokens,lifecycle,sdk}.ts`
- `src/app/api/chat/{session,logout,sync}/route.ts`
- `src/app/(student)/student/messages/page.tsx`
- `src/app/(business)/business/messages/page.tsx`
- `src/components/chat/{Messages,ChatWindow,ChatSessionGuard}.tsx`
- `scripts/{chat-sync,test-chat}.mjs`
- `tests/{chat,chat-service,chat-sdk,chat-tokens}.test.ts`
- `docs/COMETCHAT.md`

Modified:

- `package.json`, `package-lock.json`, `.env.example`
- `src/components/auth/AccountControls.tsx`
- `src/components/layout/{DashboardLayout,Sidebar}.tsx`
- `src/components/business/BusinessNav.tsx` (preserves main's desktop/mobile business navigation and adds the optional Messages link)
- `scripts/test-backend.sql` (dimension-compatible rollback fixture only)

Ignored local credentials were configured in `.env.local`; they are not part of the change set.

## Official references

- [React UI Kit Next.js integration](https://www.cometchat.com/docs/ui-kit/react/integration-nextjs)
- [Provider role restrictions](https://www.cometchat.com/docs/rest-api/rbac/set-role-permissions)
- [Private groups and member provisioning](https://www.cometchat.com/docs/rest-api/group-members/add-members)
- [REST token provisioning](https://www.cometchat.com/docs/rest-api/auth-tokens/create)
- [CometChat tokens do not natively expire](https://help.cometchat.com/hc/en-us/articles/29216281863835-Do-auth-tokens-expire)
