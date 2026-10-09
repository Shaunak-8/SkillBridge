# Workstream 5 — RAG-Assisted Matching & Applications

## Objective
Help students discover relevant projects and help businesses identify suitable candidates. Use semantic retrieval as one signal, then combine it with structured eligibility and skills filters. Recommendations assist human decisions; they do not automatically accept or reject students.

## Owns
- Project browse/search/filter experience
- Candidate retrieval and ranking
- “Why this match?” explanations grounded in profile data
- Applications and business review/selection workflow
- Matching evaluation set and tests

## Matching approach
1. Start with projects that are published and visible to the student.
2. Use text/embedding similarity between project requirements and student profile/portfolio summaries to retrieve candidates.
3. Apply structured checks such as visibility, required skills, availability, and any agreed project constraints.
4. Rank candidates using documented, explainable signals.
5. Show a short explanation referencing actual profile evidence.
6. Let the business review, shortlist, and select students manually.

For student discovery, reverse the process: retrieve published projects relevant to the student's skills/interests and apply normal status/visibility filters.

## RAG and database design
- Reuse the team's agreed embedding model and pgvector setup; coordinate with Member 2 and Member 6.
- Keep project and student records in their authoritative relational tables.
- Optionally maintain separate embedding records, such as `entity_embeddings` with `entity_type`, `entity_id`, `embedding`, `model`, and `updated_at`, if the team agrees. Do not create a second vector system without need.
- Use private student profiles only if the owner has opted into matching and the caller is authorized to see the relevant fields.
- Never index application messages, personal contact details, or private conversations as shared retrieval context.

## Suggested Neon tables
- `applications`: `id`, `project_id`, `student_id`, `status`, `cover_note`, `created_at`, `updated_at`
- Optional `project_members`: `id`, `project_id`, `student_id`, `role`, `joined_at`
- Optional `entity_embeddings`: use only if needed and agreed with Member 6
- Existing `projects`, `student_profiles`, and `student_portfolio_items` remain the source of truth

Suggested application states: `submitted`, `viewed`, `shortlisted`, `accepted`, `declined`, `withdrawn`. Agree on the exact enum/check constraint with Member 6 before implementing.

## Suggested routes
- `GET /api/projects/discover` — published, visible projects with filters
- `GET /api/projects/:id/recommendations` — authorized business owner gets candidate recommendations
- `GET /api/students/me/recommendations` — optional student project recommendations
- `POST /api/projects/:id/applications`
- `PATCH /api/applications/:id/status` — business owner updates status
- `GET /api/business/projects/:id/applications`

Use pagination and server-side filters. Final routes must be agreed with Members 4 and 6.

## Dependencies
- Member 2: embedding model and shared retrieval helper conventions.
- Member 4: profile fields, portfolio DTO, and visibility rules.
- Member 6: schema, pgvector extension/migrations, authorization, and transaction conventions.
- Member 1: business-side project dashboard and application-review UI.

## Integration contract
- Only published projects appear in discovery.
- Only eligible, visible student profiles can be recommended.
- A recommendation explanation must cite actual fields, e.g. “Portfolio includes an Instagram campaign” only when the portfolio contains that evidence.
- Similarity scores are not probabilities of success; do not display them as percentages unless calibrated and validated.
- The business makes the final selection. Enforce project ownership before viewing applications or changing application status.

## Definition of done
- Students can browse published projects, filter them, and apply.
- Businesses can view applications and shortlist/accept/decline applicants for their own projects.
- Recommendations use semantic retrieval plus structured filtering.
- Every displayed explanation is grounded in real retrieved fields.
- Authorization, duplicate applications, invalid status transitions, pagination, and empty results are tested.
- Evaluate at least 10 sample projects/profiles and inspect whether top recommendations are sensible.

## End goal
Students find relevant real-world experience, while businesses receive explainable suggestions and retain control over whom they select.
