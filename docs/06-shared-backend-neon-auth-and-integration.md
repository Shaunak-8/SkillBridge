# Workstream 6 — Shared Backend, Neon, Auth & Integration

## Objective
Own the shared technical foundations and keep the six workstreams compatible: database schema/migrations, authentication/session helpers, authorization conventions, shared API types, and end-to-end integration. This role coordinates and reviews shared contracts; it should not become the sole implementer of every feature's backend.

## Owns
- Shared Neon PostgreSQL setup and migrations
- pgvector extension/migration coordination
- Shared auth/session and role helpers
- Common DB connection module and environment-variable conventions
- Shared TypeScript DTOs, status enums, and API error shape
- Integration checklist, seed data, and end-to-end test support

## Suggested stack
- Next.js + TypeScript
- Neon PostgreSQL
- Neon Auth or the authentication solution the team has actually configured
- pgvector extension for embeddings
- One agreed database access approach (e.g. Drizzle ORM or parameterized `pg` queries); do not mix ORMs without a reason
- Environment variables managed locally and in deployment settings; secrets must remain server-side

Confirm the exact auth provider configuration and supported sign-in methods before coding assumptions about Google or username/password. Do not treat a database provider as automatically configuring all app authentication.

## Shared schema to coordinate
Agree a minimal schema with all members before migrations:
- `user_profiles`: auth user ID, app role (`business` or `student`, optionally `admin`), display name, timestamps
- `business_profiles`: business owner, name, type, location text, preferred language
- `student_profiles`: student identity, bio, skills, interests, availability, visibility
- `student_portfolio_items`: portfolio evidence
- `projects`: owner, structured brief fields, status, owner-confirmation flag/version, timestamps
- `project_questions` and `project_answers`: guided verification
- `knowledge_chunks`: approved RAG content, source metadata, language, embedding
- `applications`: project, student, status, cover note, timestamps
- Optional `project_members`, `entity_embeddings`, `ai_generation_runs`, and audit records only if the prototype needs them

Use foreign keys, indexes, uniqueness constraints, and checks where appropriate. Store auth-provider user IDs in the correct type/format. Decide the canonical role and status names once.

## Suggested project lifecycle
Keep it simple and consistent:
- `draft`
- `published`
- `in_progress`
- `completed`
- `closed`
- `cancelled`

`owner_confirmed` is a separate boolean/versioned confirmation, not a project status. Publishing must require confirmation and valid fields. A material edit after confirmation invalidates it.

## Security and authorization
- Never expose database URLs, service keys, or model API keys in client bundles.
- Derive the user identity from the verified server session, not from a browser-supplied ID.
- Every read/write endpoint must check role, ownership, and visibility.
- Use parameterized SQL or the ORM's safe query APIs.
- Do not expose student private contact details in matching results.
- Restrict knowledge-base indexing and admin-only reindex routes.
- Keep application messages/private content out of shared RAG unless explicitly designed and permissioned.
- Add rate limits/size limits to costly AI endpoints where practical.

## Shared API conventions
Agree on:
- Authenticated identity and role helper
- Response DTOs for project brief, student candidate, application, and paginated lists
- Consistent error format, such as `{ "error": { "code": "...", "message": "..." } }`
- Stable status values and allowed transitions
- Validation approach (e.g. Zod) and where schemas live
- Naming and ownership rules for API routes

Do not implement every feature route yourself. Each feature owner should implement their routes using the shared helpers and schema.

## Environment setup
Create `.env.example` with variable names only, for example:
- `DATABASE_URL=`
- `AUTH_*` variables required by the chosen auth provider
- `LLM_API_KEY=`
- `EMBEDDING_API_KEY=` (if separate)
- `APP_URL=`

Never commit real secrets. Document how each teammate obtains local credentials safely.

## Integration and testing tasks
1. Create the initial migration and share schema changes through version control.
2. Provide a small seed script for sample business projects, students, and approved knowledge chunks.
3. Document how to run migrations and the app locally.
4. Add auth/role/ownership tests for critical endpoints.
5. Run the full flow: business creates draft → AI/RAG generates brief → owner answers questions and confirms → project publishes → student discovers/applies → business selects student.
6. Resolve contract mismatches with the workstream owners instead of taking over their implementation.

## Dependencies
All members. Ask each owner to submit their table fields, route contracts, and test cases early. Review changes before merging shared migrations.

## Definition of done
- All teammates can connect to a documented development Neon database using private local env vars.
- Migrations apply from a clean database.
- Authenticated role checks and ownership enforcement are reusable and tested.
- Shared DTOs and status values are documented and used consistently.
- pgvector is enabled and tested for the RAG workstream.
- Seed data supports a full demo.
- End-to-end tests cover both the happy path and unauthorized/unconfirmed cases.

## End goal
The team has one secure, consistent backend foundation that lets all five feature owners build in parallel and combine their work into a reliable prototype.
