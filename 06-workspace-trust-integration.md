# Workstream 6 — Project Workspace, Trust, and Integration

**Owner:** Team Member 6  
**Primary users:** Accepted students, businesses, and platform administrators  
**Goal:** Make the handoff from selection to delivery clear, safe, and trackable, while integrating the team's modules into one working prototype.

## Responsibilities
- Build the accepted-project workspace and basic status tracking.
- Implement milestones/progress updates if time permits.
- Build basic communication or integrate an agreed chat provider.
- Add reporting/moderation basics and role-aware access checks.
- Coordinate end-to-end integration, environment configuration, and demo readiness.
- Own integration tests and the final end-to-end demo checklist.

## Core workspace features
1. Project overview with confirmed scope, deliverables, timeline, compensation status, and participants.
2. Status states such as `selected`, `in_progress`, `awaiting_review`, `completed`, `paused`, and `cancelled`.
3. Basic milestones with due dates and progress notes, if feasible.
4. Business feedback/comments on progress.
5. Completion confirmation from both sides.
6. Structured review/feedback after completion.
7. Report project/user and basic admin review queue.
8. Important event history for selection, scope changes, status changes, and completion.

## Communication
For the MVP, choose the simplest reliable option:
- Option A: basic in-platform messages.
- Option B: a minimal contact/request workflow.
- Option C: a chat provider integration if setup, permissions, and time allow.

Do not make advanced real-time chat a dependency for validating project creation and matching. If a provider such as CometChat is used, document user identity mapping, access control, and what happens when a user is removed from a project.

## Trust and safety
- Enforce business/student/admin permissions on the server, not only in the UI.
- Allow users to report inappropriate projects or behavior.
- Make paid/unpaid/expense-only/negotiable status visible.
- Do not promise jobs, guaranteed outcomes, or verified credentials unless a real verification process exists.
- Keep private contact information restricted.
- Provide basic account/project moderation and an admin path for reports.
- Do not expose secrets or unrestricted database credentials in the client.

## Integration responsibilities
- Agree on API contracts and shared types with all workstreams.
- Maintain environment variable documentation without committing secrets.
- Ensure consistent project/application/status naming across modules.
- Verify database migrations and seed data.
- Run end-to-end checks for business project creation through student application and selection.
- Prepare demo accounts and realistic sample projects.

## Deliverables
- Project workspace and lifecycle UI.
- Basic reporting/moderation workflow.
- Shared integration documentation and environment setup notes.
- End-to-end tests and bug list.
- Demo-ready seed data and final run instructions.

## Definition of done
- An accepted project has a clear next step and visible status.
- Participants can track progress and understand deliverables.
- Users cannot access unauthorized projects, messages, or private data.
- Reports can be submitted and reviewed.
- The core demo works from business onboarding to verified project, student application, selection, and completion-state demonstration.

## End goal
A project does not stop at matching: the business and student can agree on expectations, communicate, track progress, and close the collaboration with feedback. The whole prototype runs as one coherent product.
