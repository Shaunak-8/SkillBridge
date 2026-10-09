# Shared backend setup and contracts

Workstream 3's guided flow is now integrated; see [WS-3 integration](WS3-INTEGRATION.md) for its migration, API contracts and UI. Business projects and verification pages query owned Neon records.

The app preserves Neon Auth and parameterized `@neondatabase/serverless` queries. Credentials belong in ignored `.env.local` or deployment secret settings.

## Local setup

1. Run `npm install`. Copy `.env.example` only if `.env.local` does not exist.
2. Obtain `DATABASE_URL`, `NEON_AUTH_BASE_URL`, and `NEON_AUTH_COOKIE_SECRET` privately from the project owner. Auth and database must refer to the same development branch. Set `APP_URL` and `NEXT_PUBLIC_APP_URL` to `http://localhost:3000`.
3. Run `npm run db:migrate`, `npm run db:seed`, then `npm run dev`.
4. Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`. With the server running, run `npm run test:smoke` and `npm run test:integration`. Run `npm run test:db` and `npm run test:backend` for live database validation.

The runner uses a direct Neon hostname for migrations, applies each file transactionally, and stores checksums in `skillbridge.schema_migrations`. Add numbered files instead of editing applied migrations. A checksum mismatch stops execution. Coordinate shared schema changes with feature owners before merging.

## Existing database compatibility

Neon already contained projects, student profiles, portfolios, and applications. Migration 002 preserves their rows, identifiers, and existing column names: projects use `owner_profile_id` and `problem_statement`; students have a separate `id` plus a unique `profile_id`. Application and portfolio `student_id` references `student_profiles.id`, not the base profile or auth ID.

Migration 002 adds business profiles, verification questions/answers, knowledge chunks, confirmation versions, deliverables, and lifecycle triggers, and enables pgvector. The stricter `projects_publish_ready` constraint is initially `NOT VALID` to preserve historical published records with incomplete briefs; PostgreSQL checks new inserts and updates. Owners must complete historical briefs before validating that constraint across the whole table. Do not invent deliverables or confirmations to backfill them.

## Shared security and lifecycle

- Pages use `requireRole`; APIs use `requireApiIdentity` and `requireOwnership` from `src/lib/api.ts`.
- Verified sessions determine identity. Request-supplied owner/student/auth IDs never assign ownership. Mutations check Origin and validate inputs.
- App API errors are `{ "error": { "code": "...", "message": "..." } }`. Managed `/api/auth/*` preserves the SDK's format.
- Matching DTOs exclude contact details; feature implementations must check visibility. RAG queries must filter approval and embedding model.
- Project statuses: draft, published, in_progress, completed, closed, cancelled. “Open” is the display label for published.
- Draft can publish or cancel; published can return to draft, start, close, or cancel; in_progress can complete or cancel. Terminal states cannot reopen.
- Publishing requires title, summary, problem statement, deliverables, and confirmation of the current brief version. Required questions must have answers. Material edits and verification changes increment the version, invalidate confirmation, and return published projects to draft. Brief changes are locked after work starts.

## API foundation

| Route | Contract |
| --- | --- |
| `GET /api/projects?limit=20&offset=0` | Published UI project cards; `items/limit/offset`; limit 1–100 |
| `POST /api/projects` | Business only; `{title}` creates owned draft; requires business profile |
| `GET /api/projects/:id` | Published briefs public; other briefs require business owner |
| `PATCH /api/projects/:id` | Owner: `{action:"edit",title,summary,description,requiredSkills,deliverables}`, `{action:"confirm"}`, or `{status}` |
| `PUT /api/domain-profile` | Current business `{businessName}` or student `{bio}`; own domain profile only |
| `GET /api/applications` | Up to 100 recent applications for current student or business's projects |
| `POST /api/applications` | Student `{projectId,coverNote}`; published only; note 1–2000 characters; duplicates rejected |
| `PATCH /api/applications/:id` | Project owner `{status}`: reviewing/shortlisted/accepted/declined; terminal applications cannot change |

Project mutation/detail responses use `ProjectBrief`; application responses use `ApplicationDTO` from `src/types/backend.ts`. Existing application statuses viewed and withdrawn remain supported.

The public project board/detail pages query Neon. Other dashboards and AI screens still contain feature-owned mock content. Feature owners can use these helpers/contracts to wire their routes and forms. AI generation, real embeddings, uploads, and guided question creation remain those workstreams' implementations.

## Seed and verification

The repeatable seed creates synthetic `demo:*` profiles, a business/student, a confirmed published project, an application, and approved scoping guidance. These are not login accounts; existing demo entries are untouched. Real embeddings remain NULL until a model is chosen. The vector column accepts model-dependent dimensions; filter queries by model/dimension. No approximate index is selected yet.

Database tests roll back fixtures. The backend test also applies all migrations in an isolated temporary schema, exercises the lifecycle, and rolls that schema back. HTTP tests verify real public Neon data and unauthorized requests; unit tests cover role/ownership checks and forged identities. Verified student/business login, Google consent, email delivery, and the feature-owned AI/RAG flow still need interactive end-to-end testing. These checks create no Auth accounts.
