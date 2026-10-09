# Workstream 1 — Business Experience and Accessible UX

**Owner:** Team Member 1  
**Primary users:** Shopkeepers, local service providers, MSMEs with limited app experience  
**Goal:** Make the business-side experience simple enough that a first-time or non-technical user can publish a verified project with minimal assistance.

## Responsibilities
- Design business onboarding and navigation.
- Build the mobile-first business dashboard.
- Create a guided “Describe a problem” entry point.
- Use plain language, large controls, clear progress indicators, and minimal typing.
- Add preferred-language selection and help/resume-draft affordances.
- Make all business actions clear: save draft, edit, verify, publish, pause, and close.
- Test the flow with people who are not familiar with complex apps.

## Features
1. Business sign-up/onboarding and profile basics.
2. Language preference and accessible layout.
3. One-question/one-step-at-a-time project creation shell.
4. Clear draft, error, success, loading, and retry states.
5. Voice-input entry point integrated with Workstream 2.
6. Verification summary screen integrated with Workstream 3.
7. Published-project status and simple project management screen.
8. Help, edit, and resume-later paths.

## UX rules
- Avoid unexplained terms such as “API,” “stack,” “deliverable,” or “requirements.”
- Explain concepts with examples and everyday language.
- Never publish an AI-generated brief without explicit owner confirmation.
- Use tap-to-select options where possible.
- Keep the user informed when recording, transcribing, generating, saving, or publishing.
- Provide a correction path when transcription or generated text is wrong.

## Deliverables
- Business journey flow/wireframes.
- Responsive business-facing screens and reusable UI components.
- Form validation and user feedback.
- Integration points documented for voice, brief generation, and Q&A.
- Usability test notes and fixes.

## Dependencies
- Coordinate with Workstream 2 for voice/transcription and generated brief data.
- Coordinate with Workstream 3 for predefined Q&A and confirmation state.
- Coordinate with Workstream 6 for project status and moderation states.

## Definition of done
- A new business user can start, save, edit, verify, and publish a project.
- The interface works on a phone-sized viewport.
- Errors explain how to recover.
- No project is published before required fields and owner confirmation are complete.
- At least a small usability test is conducted with representative users, and major blockers are fixed.

## End goal
A shopkeeper who is not comfortable with sophisticated apps can complete the core project-creation journey without needing to understand technical terminology or ask a developer to fill in the form.
