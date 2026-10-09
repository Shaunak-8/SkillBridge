# Workstream 4 — Student Profiles & Portfolio

## Objective
Build the student side of the platform so students can present their skills, interests, availability, and evidence of work. Profiles should provide useful matching information without overstating a student's abilities.

## Owns
- Student onboarding/profile editor
- Skills, interests, education, availability, and portfolio items
- Profile completeness and visibility
- Student-side dashboard and application history (coordinate with Member 5)
- Profile data API and validation

## Frontend tasks
1. Build a student profile with display name, education/year, skills, interests, preferred project categories, and availability.
2. Support portfolio entries with title, description, role, skills used, links, and optional media URLs.
3. Let students edit and remove their own profile/portfolio items.
4. Show profile-completeness suggestions without making profile completion a blocker for exploration.
5. Clearly label student-entered information; do not imply that claims are verified unless a verification process exists.
6. Add visibility controls if the product needs private/draft profiles; align the default with the team.
7. Display the student's own projects/applications using Member 5's contract.

## Backend tasks
- Create/read/update the authenticated student's profile.
- Validate skills and portfolio input sizes and URL formats.
- Enforce that students can edit only their own profiles and portfolio entries.
- Expose only fields needed for matching and visible to the relevant business; never expose private contact details by default.
- Provide clean, structured profile text suitable for optional embedding by Member 5.

## Suggested Neon tables
- `student_profiles`: `id`, `user_id`, `education_level`, `study_year`, `bio`, `skills TEXT[]` or a normalized skill relation, `interests TEXT[]`, `availability`, `preferred_categories TEXT[]`, `visibility`, timestamps
- `student_portfolio_items`: `id`, `student_id`, `title`, `description`, `skills_used TEXT[]`, `project_url`, `created_at`, `updated_at`
- `user_profiles`: shared role and display-name record

Pick either arrays or normalized skill tables with Member 6. Do not create duplicate skill models across workstreams.

## Suggested routes
- `GET /api/students/me`
- `PATCH /api/students/me`
- `GET /api/students/me/portfolio`
- `POST /api/students/me/portfolio`
- `PATCH /api/students/me/portfolio/:itemId`
- `DELETE /api/students/me/portfolio/:itemId`

Agree on DTOs and route naming with Member 6.

## Dependencies
- Member 5: the profile fields needed for matching, profile visibility, and student application views.
- Member 6: user roles, auth/session helper, schema/migrations, and authorization.
- Member 2: only if student portfolio content is used as a source for project guidance; it must not be indexed as public knowledge without permission.

## Integration contract
- Use the shared authenticated `user_id` and role from the session.
- Member 5 consumes a server-defined candidate profile DTO; do not let the matching endpoint query arbitrary private fields.
- If embeddings are created for matching, store/rebuild them through the agreed server-side job/helper and refresh them when relevant profile fields change.

## Definition of done
- A student can create and update their profile and portfolio.
- Input validation and ownership checks work.
- Matching-relevant skills and interests are available to Member 5 in a stable shape.
- Private contact details and non-visible profile fields are not exposed in public discovery results.
- The profile UI works on mobile and has clear empty/error states.

## End goal
A student can show what they can do and what they want to learn, giving businesses reliable information for making informed choices.
