# Workstream 3 — Guided Questions & Owner Verification

## Objective
Make the AI-generated brief understandable and trustworthy for a non-technical business owner. Ask a small number of plain-language questions to fill gaps, let the owner correct errors, and ensure a project is not published until the owner confirms it.

## Owns
- Guided clarification/Q&A flow
- Question selection and simple language
- Saving answers and edits
- Confirmation state and validation rules
- Verification-related tests

## Frontend tasks
1. Display one clear question at a time where possible.
2. Use familiar answer controls: yes/no, short text, multiple choice, “not sure”, and “skip for now” when safe.
3. Show the draft brief alongside the questions when screen size permits.
4. Let the owner edit generated fields directly.
5. Show a final review summary with explicit Confirm and Edit options.
6. Explain that confirmation means “this accurately describes what I need,” not a guarantee of project success.

## Backend tasks
- Generate/select clarification questions based on missing or ambiguous fields in the draft.
- Save answers against the correct project and question.
- Apply answers to the draft without overwriting unrelated owner edits.
- Set `owner_confirmed = true` only after an authenticated owner explicitly confirms the current version.
- If the brief changes after confirmation, reset confirmation to false.
- Enforce publication checks server-side, not only in the UI.

## Suggested Neon tables
- `project_questions`: `id`, `project_id`, `question_text`, `question_type`, `options JSONB`, `sort_order`, `created_at`
- `project_answers`: `id`, `question_id`, `project_id`, `business_user_id`, `answer_text`, `created_at`, `updated_at`
- `projects`: `owner_confirmed`, `confirmed_at`, `status`, `updated_at`, plus structured brief fields

Use foreign keys and ownership checks. Agree with Member 6 on whether questions are generated per project or represented as JSON on the project for the first prototype; avoid building both approaches.

## Example questions
- “What would you most like to improve?”
- “Who are your customers?”
- “Do you need a website, help with social media, or are you unsure?”
- “When would you ideally like this done?” with “I’m not sure” available
- “What would a successful result look like?”

Ask only questions that are useful to clarify scope. Do not pressure the owner to invent a budget or deadline.

## Suggested routes
- `GET /api/projects/:id/questions`
- `POST /api/projects/:id/answers`
- `PATCH /api/projects/:id/brief`
- `POST /api/projects/:id/confirm`

Final routes and DTOs must be agreed with Members 1, 2, and 6.

## Dependencies
- Member 1: question UI and review/publish screens.
- Member 2: generated brief schema and `open_questions` field.
- Member 6: shared database schema, auth, ownership checks, and transaction conventions.

## Integration contract
- Member 2 creates the initial draft and can return `open_questions`.
- This workstream turns those gaps into guided questions and updates the same project record.
- `owner_confirmed` applies to a specific current brief version. Any subsequent material edit invalidates it.
- Member 1 may display the Publish button, but only the server can authorize publication.

## Definition of done
- A project with missing information shows relevant clarification questions.
- Answers and edits persist after refresh.
- The owner can confirm the final brief.
- Any material edit after confirmation resets the confirmation state.
- A direct API call cannot publish an unconfirmed or unauthorized project.
- Questions use plain language and include a safe “not sure” option where appropriate.

## End goal
A business owner can understand, correct, and explicitly approve the project description before students see it.
