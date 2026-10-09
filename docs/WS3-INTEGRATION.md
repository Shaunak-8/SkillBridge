# Guided questions integration

Integrated from `feat/ws-3-guided-questions` at `493a3537ed7429f3715c60ea687c86918e676af0`. Relevant WS-3 changes were adapted without merging the branch's environment values or reverting the working authentication/backend changes.

## Database

Run `npm run db:migrate`. Migration `003_guided_verification.sql` adapts the original proposal in `docs/03-guided-questions-schema.sql` to existing `skillbridge` tables. Do not execute the proposal directly: it targets unqualified tables and repeats columns/tables from migration 002.

Existing `question`, `position`, and `answer` columns are retained, and mapped to the frontend's text/sortOrder/answerText contracts. Migration 003 adds question types/options/timestamps, answer IDs and owner-profile attribution, and `confirmed_at`. `business_user_id` stores the base profile UUID, not the external Auth user ID. Its backfill preserves existing confirmations. Historical confirmations retain an unknown timestamp until reconfirmed; no date is invented.

Database triggers enforce answer ownership, question-project consistency, version invalidation and confirmation timestamp clearing. Material brief edits or question/answer changes reset confirmation. Publishing remains an explicit separate action governed by existing backend checks.

## Routes and UI

All four routes require a verified, onboarded business session and ownership of the project. Mutations check same-origin requests. Errors use the shared `{error:{code,message}}` convention.

- `GET /api/projects/:id/questions`: `{success:true,data:[{id,projectId,text,type,options,sortOrder,required,answerText}],briefVersion}`. Saved answers restore after refresh.
- `POST /api/projects/:id/answers`: `{questionId,answerText,briefVersion?}`. Atomic upsert and current version response. The UI supplies its reviewed version to prevent unseen concurrent edits from being confirmed. Yes/no supports Yes, No, Not sure. Multiple-choice supports configured options or Not sure. Forged owner IDs are ignored.
- `PATCH /api/projects/:id/brief`: partial title/summary/description/deliverables/requiredSkills; optional `briefVersion` detects stale editing. Unrelated fields are preserved. `description` maps to `problem_statement`.
- `POST /api/projects/:id/confirm`: `{briefVersion}` is required so an owner approves the version actually reviewed. Requires complete fields/deliverables and required answers; returns confirmed brief, without publishing it.

`/business/projects` now lists only the signed-in owner's Neon projects. Draft cards open `/business/projects/:id/verify`. The verification page loads real questions and saved answers, persists each answer/edit, confirms the reviewed version, and offers an explicit Publish action. Required questions cannot be skipped; Not sure is supported. A changed/stale brief requires reloading before confirmation.

Question generation remains the upstream AI/workstream's responsibility. Insert questions into the shared `skillbridge.project_questions` table; do not create parallel unqualified tables. Answers are stored as clarification evidence and do not automatically replace unrelated brief fields.

## Validation

Use `npm ci --legacy-peer-deps` when restoring the teammate's lockfile. Existing dependencies need no reinstall solely to integrate these files.

Run `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, and `npm run test:backend`. With the local server running, run `npm run test:integration` and `npm run test:smoke`. Route tests cover all four endpoints' authorization, cross-project questions, forged identities, partial edits, stale confirmation and unanswered required questions. Live database tests use rolled-back fixtures, including clean-schema migrations. Real signed-in browser interactions still require a verified business account; tests create no Auth accounts.

Integration validation: 100 unit tests, 17 backend HTTP checks, 23 auth smoke checks, lint, TypeScript and live database/clean-schema tests pass. Production compilation also passes with `npm run build -- --webpack`. The latest default Turbopack run hit a local worker port-permission error; webpack is the verified fallback for that environment. Use `npm run dev -- --webpack` if the same worker restriction affects local development.
