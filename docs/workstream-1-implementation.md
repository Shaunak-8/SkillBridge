# Workstream 1 implementation report

## A. Summary
The English, text-first business flow in `01-business-ui-and-onboarding.md` is implemented: business onboarding/profile, real dashboard counts, problem input, Member 2's AI brief generation, stable saved drafts, editing/regeneration, guided answers, explicit confirmation and protected publishing. Mobile and desktop share the Student Dashboard's purple design tokens, cards, controls and navigation.

Real Gemini structured generation passed separately. Browser lifecycle tests run actual components, routes and PostgreSQL SQL/triggers with synthetic identity and provider responses. They cover the complete business flow without using live database credentials. A live Neon-authenticated business browser flow was not run.

Voice recording/transcription is not enabled because no approved transcription service is supplied. The working typed-input launch follows the master prompt's explicit text-first alternative; the UI identifies voice as unavailable. Only English is offered until additional languages are tested.

## B. Files
Created:
- `.gitattributes`
- `docs/workstream-1-implementation.md`
- `migrations/002_shared_backend.sql`
- `migrations/003_guided_verification.sql`
- `migrations/004_ws5_matching.sql`
- `migrations/005_knowledge_vector.sql`
- `playwright.config.ts`
- `scripts/business-browser-server.mjs`
- `scripts/check-client-secrets.mjs`
- `scripts/inspect-business.mjs`
- `scripts/sql-statements.mjs`
- `scripts/verify-ai.mjs`
- `src/app/(business)/business/error.tsx`
- `src/app/(business)/business/loading.tsx`
- `src/app/(business)/business/not-found.tsx`
- `src/app/(business)/business/onboarding/page.tsx`
- `src/app/(business)/business/projects/[id]/edit/page.tsx`
- `src/app/(business)/business/projects/[id]/page.tsx`
- `src/app/(business)/business/projects/new/page.tsx`
- `src/app/api/applications/[id]/status/route.ts`
- `src/app/api/business/generate/route.ts`
- `src/app/api/business/me/route.ts`
- `src/app/api/business/projects/[id]/applications/route.ts`
- `src/app/api/business/projects/route.ts`
- `src/app/api/projects/[id]/answers/route.ts`
- `src/app/api/projects/[id]/applications/route.ts`
- `src/app/api/projects/[id]/brief/route.ts`
- `src/app/api/projects/[id]/confirm/route.ts`
- `src/app/api/projects/[id]/publish/route.ts`
- `src/app/api/projects/[id]/questions/route.ts`
- `src/app/api/projects/[id]/recommendations/route.ts`
- `src/app/api/projects/[id]/route.ts`
- `src/app/api/projects/discover/route.ts`
- `src/app/api/projects/route.ts`
- `src/components/business/BriefEditor.tsx`
- `src/components/business/BusinessNav.tsx`
- `src/components/business/BusinessProfileForm.tsx`
- `src/components/business/FormField.tsx`
- `src/components/business/ProblemForm.tsx`
- `src/components/business/ProjectList.tsx`
- `src/components/ws5/actions.tsx`
- `src/components/ws5/parts.tsx`
- `src/lib/ai/embeddings.ts`
- `src/lib/ai/generator.ts`
- `src/lib/ai/prompt.ts`
- `src/lib/ai/retrieval.ts`
- `src/lib/ai/schemas.ts`
- `src/lib/ai/seed-knowledge.ts`
- `src/lib/api.ts`
- `src/lib/applications/status.ts`
- `src/lib/business/client.ts`
- `src/lib/business/contracts.ts`
- `src/lib/business/generation.ts`
- `src/lib/business/http.ts`
- `src/lib/business/pages.ts`
- `src/lib/business/service.ts`
- `src/lib/contracts.ts`
- `src/lib/matching/rank.ts`
- `src/lib/matching/retriever.ts`
- `src/lib/matching/types.ts`
- `src/lib/projects/verification.ts`
- `src/lib/validation.ts`
- `src/lib/ws5/guard.ts`
- `src/lib/ws5/repo.ts`
- `src/types/ai.ts`
- `src/types/backend.ts`
- `tests/application-status.test.ts`
- `tests/browser/business.spec.ts`
- `tests/browser/db.ts`
- `tests/browser/empty.ts`
- `tests/browser/identity.ts`
- `tests/browser/index.html`
- `tests/browser/main.tsx`
- `tests/browser/router.tsx`
- `tests/business-generated.test.ts`
- `tests/business-ui.test.tsx`
- `tests/business.test.ts`
- `tests/fixtures/business-schema.sql`
- `tests/fixtures/postgres.ts`
- `tests/matching.test.ts`
- `tests/verification.test.ts`
- `tests/ws5-api.test.ts`

Modified:
- `warning: in the working copy of '.env.example', LF will be replaced by CRLF the next time Git touches it`
- `.env.example`
- `.gitignore`
- `README.md`
- `docs/01-business-ui-and-onboarding.md`
- `package-lock.json`
- `package.json`
- `scripts/database.mjs`
- `src/app/(business)/business/billing/page.tsx`
- `src/app/(business)/business/dashboard/page.tsx`
- `src/app/(business)/business/layout.tsx`
- `src/app/(business)/business/post-problem/page.tsx`
- `src/app/(business)/business/profile/page.tsx`
- `src/app/(business)/business/projects/[id]/applications/page.tsx`
- `src/app/(business)/business/projects/[id]/workspace/page.tsx`
- `src/app/(business)/business/projects/page.tsx`
- `src/app/(business)/business/screening/page.tsx`
- `src/app/globals.css`
- `src/components/layout/DashboardLayout.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/shared/DashboardHome.tsx`
- `src/types/index.ts`
- `vitest.config.mts`

The supplied Gemini credential and working model setting are stored only in ignored `.env.local`. No credential is listed in this report. `.env.test.local` was not changed.

## C. Pages
- `/business/onboarding`: business name/category, optional general location, supported language.
- `/business/profile`: authenticated profile updates with validation.
- `/business/dashboard`: real owned totals, drafts, published projects, application count and recent projects.
- `/business/projects/new`: problem input, actual generation, retry, and explicit manual draft option.
- `/business/projects`: owned cards and shared status filters.
- `/business/projects/[id]`: review, questions, confirmation and publication.
- `/business/projects/[id]/edit`: editable brief, save and regenerate.
- `/business/projects/[id]/applications`: real applicant review, permitted status actions and candidate suggestions.
- Legacy `post-problem` redirects to creation; workspace redirects after ownership checks. Billing/screening show pending states.

Loading, empty, validation, network, not-found, retry and success states are provided. Drafts survive refresh. Unsaved text warns on browser departure; regeneration warns before replacing edits. Navigation is available on mobile, with visible focus, associated labels, 44px touch targets and reduced-motion support.

## D. APIs and contracts
Workstream 1 uses `{ data: T }` successes and `{ error: { code, message, fields? } }` errors. Existing Member 3/6 and Member 5 response shapes are preserved.

| Endpoint | Contract |
| --- | --- |
| GET/PATCH /api/business/me | BusinessProfile / validated BusinessInput |
| GET /api/business/projects | Owned BusinessProject[]; most recent 200 |
| POST /api/projects | Validated BriefInput; persistent draft UUID |
| GET/PATCH /api/projects/:id | Owned full project / complete brief plus brief_version |
| POST /api/business/generate | problem, preferred_language; optional project_id and brief_version for regeneration; returns saved BusinessProject |
| GET /api/projects/:id/questions | Member 6 mapped questions, saved answers and briefVersion |
| POST /api/projects/:id/answers | Member 6 questionId, answerText, briefVersion; returns the advanced briefVersion |
| PATCH /api/projects/:id/brief | Member 6 partial title/summary/description/deliverables/requiredSkills and briefVersion |
| POST /api/projects/:id/confirm | Member 6 reviewed briefVersion; returns confirmed ProjectBrief, without publishing |
| POST /api/projects/:id/publish | brief_version; independently validated publication |
| GET /api/projects/discover | Member 5 published-project discovery, filters and pagination |
| POST /api/projects/:id/applications | Member 5 authenticated student application |
| GET /api/projects/:id/recommendations | Member 5 owner-authorized candidate suggestions |
| GET /api/business/projects/:id/applications | Member 5 owner-authorized applicants, reasons and pagination |
| PATCH /api/applications/:id/status | Member 5 actor-specific conditional status change |

AI fields map to the actual shared schema: business_goal → summary, proposed_deliverables → deliverables, skillName → required_skills, budget_range → budget_label, and timeline → timeline. Generation uses Member 2's 10–4,000-character problem limit. Its open_questions become ordered, required short-text verification questions. Other persisted yes/no and multiple-choice questions also render correctly.

Generation and regeneration save the brief and questions in one database transaction. Regeneration keeps the project UUID, clears old clarification answers, and invalidates confirmation. A changed revision aborts before replacing the brief/questions. Fallback templates are rejected as unsuccessful AI generation, preserving the original text instead of pretending they are model output.

## E. Database
Reuses the shared `skillbridge` profile, business, project, question, answer, application and rate-limit tables. Safe tagged SQL remains server-only.

Restored exact shared migrations:
- `002_shared_backend.sql` and `003_guided_verification.sql` from Member 6.
- `004_ws5_matching.sql` and `005_knowledge_vector.sql` from Member 5's embeddings branch.

No migration was applied by this work. Read-only inspection confirms required fields/guards exist and checksums for migrations 001–005 all match the database's already-applied records. Migration 001's content was unchanged; its line endings were normalized to the shared Git source. `.gitattributes` keeps migration SQL in LF format so checksums are stable across Windows/Linux.

The migration runner now reuses Member 6's function-aware splitter and checksum-tracked transactional runner. A fresh database can use `npm run db:migrate`; existing installations skip matching applied migrations.

The test fixture is not a deployment migration. Browser/integration tests use isolated PostgreSQL and actual version/answer-owner/confirmation functions from the shared migrations. No business fixtures, Auth accounts or schema changes were written to live Neon.

## F. Security
Existing verified Neon sessions, role onboarding and ownership are reused. Browser-supplied owner/status/confirmation fields are rejected by business DTO validation; profile identity comes from the session.

Writes check origin; business writes use the existing limiter. All editable brief fields are bounded and normalized. Saves increment the brief version and invalidate confirmation. Generated replacement locks and verifies the matching owned draft revision before any transaction changes.

Member 6's answer routes validate question ownership, supported choices and reviewed versions. Their database triggers attribute answers to the owner and advance the version. The UI uses each returned version before confirming; publication independently checks current confirmation, complete fields and required answers. No action automatically publishes generated text.

The existing Member 5 status rules and API shapes were preserved. Its shared guard additionally requires verified email. Other owners cannot access/change applications. Candidate DTOs omit contact details.

Error responses omit SQL, credentials and submitted text. Imported provider logs that could include raw model validation output or database details were removed; Gemini credentials use a request header instead of a URL query parameter. Built client JavaScript is scanned against configured database, cookie and AI secrets.

## G. Team integration sources
- **Member 2:** `feature/member2-ai-rag-embeddings` at `bd7b0e0e19df7642e384eefeed19487713887847`. Reused schemas, generator, prompts, embeddings, retrieval, approved seed context and AI types. No second generator/provider was introduced. Retrieval was adapted to the actual namespaced approved knowledge table, and provider errors were sanitized.
- **Member 3/6:** `feat/ws6-backend-ws3-integration` at `5e974990a7b05b1e3217b3c6a2f854c58e32d73a`. Reused secure verification APIs/helpers/DTOs, migration runner and shared migrations. The business editor adopts their canonical briefVersion, questionId and answerText contract. Answers are saved before confirmation because answer writes advance the version.
- **Member 5:** application/recommendation modules from `1826bc5eefa30b6fac4d3613d853ac28569d3007`; matching migration sources from `f2c0b0bffa9933ada11a1e66679adaf64f25fe0d`. Adapted the application page to the existing shell and excluded every applicant from suggestions.
- Existing authentication and student pages were preserved. Whole teammate branches were not merged. Student/public demo-page rollout remains a separate integration; the real discovery API already exposes published records.

The teammate's original Gemini 2.5 Flash Lite setting returned 404 for the supplied credential. Gemini 3.1 Flash Lite returned 200 and produced a schema-valid project brief. The selected model has a documented free tier; no billing was configured. See [Google's model pricing](https://ai.google.dev/gemini-api/docs/pricing).

## H. Tests and actual results
- `npm.cmd test`: **181 tests passed in 11 files**.
- `npm.cmd run test:browser`: **3 tests passed**, at **375px, 768px and 1440px**.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed; business and shared verification routes compiled.
- `npm.cmd run check:client-secrets`: **24 client JavaScript files checked**; no configured database/auth/AI secrets found.
- `npm.cmd run check:ai`: actual Gemini 3.1 Flash Lite brief returned, validated fields and three clarification questions; no Neon connection.
- `npm.cmd run db:inspect:business`: read-only shared schema compatibility passed.
- Read-only migration checksum comparison: all five match applied metadata.
- `git diff --check`: passed.

Browser tests verify onboarding, actionable empty state, recoverable generation failure retaining text, generated saved draft, regeneration warning/stable ID, edits, save/reload, direct unconfirmed-publication rejection, answer/version handling, confirmation, publication, keyboard focus and no horizontal overflow. Phone/desktop screenshots were visually inspected. Screenshots/traces are ignored under `test-results`.

The isolated browser server uses synthetic identity/provider responses, actual React components/API handlers and PostgreSQL triggers. This establishes the UI/service lifecycle, not a live Neon Auth browser login test. The real provider check is separate and generates only a generic test problem.

Earlier failures were corrected: the browser fixture initially lacked the rate-limit table; the isolated guard lacked the shared SQL error code; inherited lint warnings and a test-script variable warning were fixed. Current checks pass.

Package installation retains the existing Better Auth peer warnings and inherited audit count (2 moderate, 7 high). No forced dependency upgrade was performed.

## I. Local setup
Required server environment names: `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`, `APP_URL`, `GEMINI_API_KEY`. Optional generator settings: `LLM_MODEL`, `LLM_TIMEOUT_MS`. Never prefix provider/database keys with NEXT_PUBLIC.

Keep existing ignored env files; do not copy the example over them. The supplied key and verified model are already configured in local `.env.local`.

```powershell
npm install
npm run db:inspect:business
npm run dev
```

For a fresh database, apply the shared migrations using `npm run db:migrate` before inspection. The configured database already contains them. Restart a previously running development server if it has not picked up the new environment values.

Use a verified Business account, complete `/business/onboarding`, submit text at `/business/projects/new`, review/edit/save the generated draft, answer required questions, explicitly confirm and publish. Do not change an existing Student account's permanent role to test this feature.

```powershell
npm test
npm run test:browser
npm run typecheck
npm run lint
npm run build
npm run check:client-secrets
npm run check:ai
```

Browser tests use installed Chrome by default. Set `BROWSER_EXECUTABLE` to a Chromium-compatible executable on another machine. The browser fixture never loads env files or connects to Neon. `check:ai` is an explicitly live provider check; it disables database access and stores no app records.

## J. Remaining scope and limits
The document's typed English launch flow is implemented and validated. Optional voice/transcription and additional launch languages require an approved service and testing before being enabled.

A live business-account click-through on Neon Auth is still useful deployment acceptance; isolated browser tests and the real Gemini check are accurately distinguished above. AI quotas/provider availability can produce a recoverable generation error.

Project listing displays the most recent 200 owned records; application review displays the most recent 50 with a visible cap. Larger installations need additional pagination. Student/public discovery UI, billing and collaboration workspace are outside this business onboarding workstream.

All changes remain local and reviewable on `feat/neon-authentication`; no commit or push was performed for this feature.
