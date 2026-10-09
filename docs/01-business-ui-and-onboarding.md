# Workstream 1 — Business UI & Onboarding

## Objective
Build a simple, welcoming business-owner experience for local shops and MSMEs. Assume some users are not technically confident. A business owner should be able to explain a problem, review an AI-generated project brief, and publish it only after confirming it is correct.

## Owns
- Business onboarding and profile setup
- Language selection and accessible, mobile-first screens
- Voice/text problem input UI
- Project brief review and edit UI
- Business dashboard and project status display
- Clear loading, error, empty, and success states

## Suggested stack
- Next.js + React + TypeScript
- Tailwind CSS (or the styling choice agreed by the team)
- Shared API client/types agreed with the team
- Neon-backed data accessed through server routes, never directly with secret credentials in the browser

## Frontend tasks
1. Build onboarding for a business account and collect only necessary information.
2. Let the owner choose a supported language and enter a problem by typing or recording audio.
3. Show transcription text for review before AI processing when possible.
4. Show the generated project title, problem, goals, deliverables, skills, and optional budget/timeline.
5. Provide clear Edit, Regenerate, Confirm, Save Draft, and Publish actions.
6. Explain in plain language that the owner must confirm details before publishing.
7. Show drafts, published projects, and their statuses in a simple dashboard.
8. Ensure mobile usability, readable text, keyboard access, and useful error messages.

## Backend tasks
- Implement server-side routes/actions for business profile creation and reading the owner's projects, coordinating route names with Member 6.
- Enforce that a business can edit only its own profile and projects.
- Do not allow publication unless the owner-confirmation flag is true and required fields are present.
- Store the selected language and input/transcript references only where needed; do not log sensitive audio unnecessarily.

## Suggested Neon tables
- `user_profiles`: `user_id`, `role`, `display_name`, timestamps
- `business_profiles`: `id`, `user_id`, `business_name`, `business_type`, `location_text`, `preferred_language`, timestamps
- `projects`: shared project record; coordinate fields with Members 2, 3, and 6

## API contract to agree on
Example routes (adapt to the team's framework conventions):
- `GET /api/business/me`
- `PATCH /api/business/me`
- `GET /api/business/projects`
- `POST /api/projects` (create draft)
- `PATCH /api/projects/:id` (edit a draft)
- `POST /api/projects/:id/publish` (server checks confirmation and required fields)

Use shared TypeScript request/response types. Never trust a `user_id` supplied by the browser; derive identity from the authenticated session.

## Dependencies
- Member 2: project-generation request/response shape and AI loading/error states.
- Member 3: verification questions and the exact meaning of “confirmed”.
- Member 6: auth/session helpers, shared schema, migrations, and authorization conventions.
- Member 5: project status labels and dashboard counts if discovery/application status is shown.

## Integration contract
- The business UI creates or updates a **draft**; it does not invent project-generation output locally.
- The server returns a project ID and structured project fields.
- Publish only through a server endpoint that re-checks ownership, required fields, and `owner_confirmed = true`.
- Agree on supported launch languages; do not promise every language until tested.

## Definition of done
- A business user can sign up/sign in, complete a profile, submit a text problem, review/edit a generated brief, save a draft, and publish after confirmation.
- The UI works on a phone-sized viewport.
- Unconfirmed drafts cannot be published by bypassing the UI.
- Loading, empty, invalid-input, and server-error states are handled.
- No database secrets or model API keys appear in client code.

## End goal
A non-technical shopkeeper can move from “I have a problem” to a verified, published project without needing to understand AI or project-management jargon.

## Implementation status — 9 October 2026
The text-first launch flow is implemented. English is the supported launch language; voice recording/transcription remains unavailable until an approved transcription service is integrated.

| Requirement | Implementation and validation |
| --- | --- |
| Business onboarding/profile | `/business/onboarding` and `/business/profile`; verified Business session, validated server-side persistence |
| Text problem input | `/business/projects/new`; Member 2's 10–4,000-character input contract, retry/error recovery |
| Generated brief | Reuses Member 2's Gemini service; maps goals, deliverables, skills, optional budget/timeline; saves the draft and questions server-side |
| Review/edit/regenerate/save | `/business/projects/:id` and `/edit`; stable IDs, refresh persistence, unsaved-edit warning, regeneration preserves the project ID |
| Owner verification | Reuses Member 6's integrated Member 3 questions/answers/confirmation contract; answers advance the revision before confirmation |
| Publish safeguards | Server checks business role, ownership, current confirmation, required fields and answers; stale/unconfirmed publication is rejected |
| Dashboard/status | Real owner-scoped project/application counts, status filters and empty states |
| Mobile/accessibility | Browser lifecycle tests pass at 375px, 768px and 1440px, including keyboard focus and no horizontal overflow |
| Sensitive data | Server-only credentials; built client JavaScript checked for database, auth and AI secrets |

Validation includes isolated PostgreSQL and browser fixtures, plus a separate successful real Gemini structured-output check. Browser fixtures use synthetic authentication/provider responses and never connect to Neon; they do not claim a live Neon-authenticated browser test. Existing authentication uses the project's previously verified Neon setup.

See [the implementation report](workstream-1-implementation.md) for files, API contracts, database sources, exact check results and local setup. No migration or business test records were written to the live database during this work.
