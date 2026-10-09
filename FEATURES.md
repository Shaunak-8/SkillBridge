# Features — Local Business & Student Project Matching Platform

## 1. Project Overview

The platform connects local businesses and MSMEs that need help solving real-world problems with students who want practical experience, portfolio projects, and opportunities to apply their skills.

Businesses can describe their problems in simple language or by voice. AI helps turn these descriptions into structured project briefs, while students can discover projects, apply, and collaborate with businesses.

The platform uses Retrieval-Augmented Generation (RAG) to provide relevant project examples, improve AI-generated briefs, and recommend suitable students based on their skills and portfolio evidence.

## 2. User Roles

### Business Owner
- Create and manage a business profile.
- Describe business problems using text or voice.
- Review, edit, and confirm AI-generated project briefs.
- Publish projects after confirmation.
- Browse applicants and review recommended students.
- Shortlist and select students for projects.

### Student
- Create a student profile.
- Add skills, interests, education, availability, and portfolio projects.
- Discover and search published business projects.
- Receive relevant project recommendations.
- Apply to projects and track application status.
- Build practical experience through real-world projects.

### Administrator (Optional)
- Manage platform content and reported issues.
- Maintain approved project templates and RAG knowledge sources.
- Monitor platform health and misuse.

## 3. Core Features

### 3.1 Business Onboarding and Simple Interface
- Mobile-friendly interface designed for local business owners.
- Simple onboarding and business profile creation.
- Language preference selection for supported languages.
- Clear dashboard for drafts, published projects, and project status.
- Accessible forms, guided actions, and understandable error messages.

### 3.2 Voice and Text-Based Problem Submission
- Allow businesses to describe problems using text.
- Support voice input and speech-to-text transcription as an incremental feature.
- Let the owner review the transcript before generating a project brief.
- Preserve the meaning of the original problem statement.
- Clearly communicate which languages are supported and tested.

### 3.3 AI-Powered Project Brief Generation
- Convert rough problem descriptions into structured project briefs.
- Generate a title, problem statement, business goal, proposed deliverables, and required skills.
- Suggest possible milestones when sufficient context exists.
- Identify missing information using clarification questions.
- Leave unknown budgets, timelines, and business details unspecified instead of inventing them.
- Save generated briefs as drafts until the owner confirms them.

### 3.4 Retrieval-Augmented Generation (RAG)
- Use a curated knowledge base of approved project templates, examples, and project-planning guidance.
- Generate embeddings for knowledge chunks and store them in Neon PostgreSQL using pgvector.
- Retrieve relevant information based on semantic similarity to a business problem.
- Supply retrieved context to the AI when generating project briefs.
- Record source references for development evaluation and debugging.
- Restrict retrieval to approved and authorized content.
- Avoid treating retrieved examples as guaranteed outcomes or verified facts.
- Allow the AI to respond safely when relevant information is unavailable.

### 3.5 Guided Questions and Project Verification
- Ask simple follow-up questions when the project description is incomplete or ambiguous.
- Offer understandable answer choices and a “not sure” option where appropriate.
- Allow businesses to edit generated project details.
- Show a final review screen before publication.
- Require explicit owner confirmation before a project can be published.
- Invalidate confirmation when material project details change.
- Enforce confirmation and ownership checks on the server.

### 3.6 Student Profiles and Portfolios
- Student profiles with education, skills, interests, and availability.
- Portfolio entries describing previous projects, individual contributions, and technologies used.
- Optional links to repositories, demos, or other work samples.
- Profile editing and visibility controls.
- Structured profile data for matching and recommendations.
- Clearly distinguish student-provided claims from verified information.

### 3.7 Project Discovery and Search
- Display published projects to eligible students.
- Search and filter projects by skills, category, project status, and other agreed criteria.
- Show project descriptions, required skills, proposed deliverables, and relevant constraints.
- Support pagination and useful empty states.
- Prevent unpublished or private projects from appearing in public discovery.

### 3.8 RAG-Assisted Student–Project Matching
- Compare project requirements with student skills, interests, and portfolio descriptions.
- Use embeddings and semantic retrieval to identify potentially relevant students and projects.
- Combine semantic similarity with structured filters such as profile visibility, skills, and availability.
- Explain recommendations using evidence from actual profile and project fields.
- Avoid inventing student experience or presenting similarity scores as probabilities of success.
- Let businesses review recommendations and make the final selection.
- Let students discover projects relevant to their interests and capabilities.

### 3.9 Applications and Student Selection
- Allow students to submit applications and optional cover notes.
- Prevent duplicate active applications to the same project.
- Let businesses review applicants for their own projects.
- Support application statuses such as submitted, viewed, shortlisted, accepted, declined, and withdrawn.
- Allow businesses to select suitable students manually.
- Let students track their application status.
- Enforce project ownership and valid status transitions on the server.

### 3.10 Project Collaboration (Incremental)
- Provide a basic project workspace after a student is selected.
- Display project details, participants, and status.
- Support simple milestones or task tracking if time permits.
- Consider CometChat or another messaging integration only after the core workflow works.
- Keep real-time chat optional for the initial prototype.

### 3.11 Authentication and Authorization
- Support separate business and student roles.
- Use the authentication provider configured by the team.
- Verify user identity and role on the server.
- Enforce ownership checks for profiles, projects, applications, and private information.
- Keep database credentials and AI API keys server-side.
- Confirm the selected provider's support for Google and username/password authentication before implementing those flows.

## 4. Technology Stack

| Layer | Proposed technology |
|---|---|
| Frontend | Next.js, React, TypeScript |
| Styling | Tailwind CSS or the team's agreed styling system |
| Database | Neon PostgreSQL |
| Vector search | pgvector extension on Neon |
| Authentication | Neon Auth or the authentication provider confirmed by the team |
| AI generation | An LLM API selected by the team |
| Embeddings | An embedding model evaluated for the supported languages |
| Speech-to-text | A compatible speech transcription service, added incrementally |
| Backend | Next.js server routes/actions or the agreed backend service |
| Validation | A shared validation approach, such as Zod |
| Messaging | CometChat or another provider, optional for the prototype |

The team should choose one database access approach and one shared set of API contracts before implementation. Model providers and authentication capabilities must be verified against the actual project configuration.

## 5. Proposed Database Entities

- `user_profiles` — application roles and basic profile information.
- `business_profiles` — business details and preferred language.
- `student_profiles` — student skills, interests, availability, and visibility.
- `student_portfolio_items` — portfolio evidence and work samples.
- `projects` — project descriptions, structured requirements, owner confirmation, and lifecycle status.
- `project_questions` — guided verification questions.
- `project_answers` — business-owner answers.
- `knowledge_chunks` — approved RAG content, source metadata, language, and embeddings.
- `applications` — student applications and application status.
- `project_members` — optional selected project participants.
- `entity_embeddings` — optional embeddings for matching, if not stored with another agreed design.
- `ai_generation_runs` — optional AI and retrieval diagnostics for development and evaluation.

The team should agree on canonical field names, foreign keys, status values, and authorization rules before creating shared migrations. Optional tables should be added only when needed.

## 6. Project Lifecycle

A proposed project lifecycle is:

1. Business creates a draft.
2. AI generates a structured brief using relevant retrieved context.
3. Business answers clarification questions and edits the brief.
4. Business explicitly confirms the final description.
5. The server validates the brief and publishes the project.
6. Students discover the project and submit applications.
7. The business reviews applicants and selects students.
8. The project moves into progress and can later be completed or closed.

Suggested project statuses: `draft`, `published`, `in_progress`, `completed`, `closed`, and `cancelled`.

Owner confirmation should be stored separately from project status. A project must not be published unless the required fields are valid and the current version has been confirmed.

## 7. Security and Data Quality

- Enforce authentication, role checks, and resource ownership on every protected endpoint.
- Use parameterized database queries or safe ORM APIs.
- Retrieve only knowledge sources and profile fields that the caller is authorized to access.
- Keep private contact details and private conversations out of shared RAG context.
- Require explicit permission before using user-generated content as shared knowledge.
- Validate AI-generated structured output before saving it.
- Preserve unknown values instead of fabricating details.
- Protect AI and indexing endpoints from unauthorized use.
- Test retrieval relevance, recommendation quality, and generated content against realistic sample data.

## 8. Initial Prototype Scope

The first prototype should prioritize the complete end-to-end workflow:

1. Business and student authentication.
2. Business profile creation and text-based problem submission.
3. AI-generated project briefs grounded by RAG.
4. Guided clarification, editing, and owner confirmation.
5. Publishing and browsing projects.
6. Student profiles and portfolio creation.
7. RAG-assisted recommendations with explainable evidence.
8. Student applications and business selection.
9. Neon database integration and authorization checks.

Voice input, expanded multilingual support, advanced ranking, real-time chat, reviews, analytics, and a full project-management workspace can be added incrementally.

## 9. Definition of Success

The prototype is successful when a business owner can describe a genuine problem, review and confirm an AI-assisted project brief, publish it, receive relevant student applications or recommendations, and select a student.

A student must be able to create a profile, discover relevant projects, apply, and track the application. RAG must retrieve relevant approved context and produce recommendations grounded in real data, without bypassing user confirmation or access controls.
