# Local Business–Student Project Matching Platform
## Product vision, features, scope, and end goal

**Document type:** Product feature specification  
**Status:** Proposed MVP scope  
**Primary users:** Local MSMEs, shopkeepers, and FY–SY college students  
**Core principle:** Make it simple for a non-technical business owner to explain a real problem, while giving students a sophisticated platform to discover and deliver meaningful projects.

---

## 1. Product vision

Build a platform that connects real problems faced by local businesses with students who want practical experience. Many small business owners know what is difficult in their daily operations but may not know how to describe it as a technical or project requirement. The platform should help them express the problem in their own language, convert it into a structured project brief, verify the brief through simple questions, and connect with suitable students.

The student experience should be substantially richer than the business-owner experience: professional profiles, skills, portfolios, project listings, applications, matching recommendations, project milestones, and feedback.

## 2. Problem statement

Local MSMEs and shopkeepers may face operational or digital problems—such as tracking inventory, organizing orders, improving customer communication, maintaining records, or creating a basic online presence—but may not know how to translate these needs into a project specification or find students who can help.

At the same time, FY–SY students often need practical experience and portfolio projects but have limited access to genuine business problems, real stakeholders, and guided project opportunities.

The platform bridges this gap by turning a business owner's everyday description into a verified, understandable project brief and matching it with students based on skills, interests, availability, and project requirements.

## 3. Target users

### Primary: Local businesses
- Shopkeepers and small retailers
- Micro, small, and medium enterprises (MSMEs)
- Local service providers and family-run businesses
- Owners with limited technical knowledge or limited comfort using apps

### Primary: Students
- First-year and second-year (FY–SY) college students
- Students seeking practical experience, portfolio projects, mentorship, and teamwork
- Students across relevant disciplines—not only computer science—depending on the business problem

### Supporting users
- Platform administrators/moderators
- College clubs, faculty coordinators, or mentors (optional future role)

## 4. Product principles

1. **Business-side simplicity:** One clear action per screen, large controls, plain language, voice-first input, and minimal typing.
2. **Student-side depth:** Detailed profiles, project portfolios, filters, applications, team workflows, and progress tracking.
3. **Human verification:** AI may draft and organize a brief, but the business owner must confirm that it represents their need.
4. **Language accessibility:** Support a small, defined set of launch languages well before expanding. Keep original speech/text available for correction.
5. **No false promises:** Do not claim a student is verified, a solution is guaranteed, or a project is completed without an explicit process and evidence.
6. **Privacy and consent:** Explain what information will be shared with students before publishing a project.
7. **Safe expectations:** Set scope, deliverables, timelines, communication expectations, and compensation/volunteer status clearly.

## 5. Main user journeys

### Journey A — Business creates a project
1. Business owner signs up or receives help creating an account.
2. Chooses a language and selects **Describe a problem**.
3. Speaks into the app or types a short description.
4. Speech is transcribed into editable text.
5. AI creates a structured draft with a title, problem, desired outcome, category, expected deliverables, skills, timeline, and budget/compensation status where applicable.
6. The app asks short, predefined clarification questions using simple wording and optional voice playback.
7. Owner answers by tapping an option or speaking.
8. The app shows a plain-language summary and asks: **Is this correct?**
9. Owner confirms, edits, saves as draft, or requests help.
10. The project is published only after the owner confirms it and required fields pass validation.

### Journey B — Student discovers and applies
1. Student creates a profile with education, skills, interests, availability, and location/remote preference.
2. Adds projects, portfolio links, certificates, and experience.
3. Browses project cards or receives recommendations.
4. Opens a detailed project brief and checks expected deliverables, timeline, required skills, compensation status, and application deadline.
5. Applies with a short proposal explaining fit, approach, availability, and relevant work.
6. Business reviews applicants, asks questions, and selects a student or team.
7. Project status, milestones, and communication are managed in the platform.

### Journey C — Business selects students
1. Business sees a short list of relevant students or applications.
2. Reviews student skills, portfolio, availability, and proposal.
3. Shortlists, messages, requests clarification, and selects a student/team.
4. Confirms the scope and working expectations before starting.

### Journey D — Project delivery
1. Business and student confirm scope and deliverables.
2. Student/team posts progress against milestones.
3. Business can review, ask questions, and confirm milestone completion.
4. Project is marked complete only after both sides confirm, or an admin handles a dispute.
5. Both sides can provide structured feedback.

## 6. Feature modules

### Module 1 — Business onboarding and accessible interface
- Short onboarding with a business-oriented explanation
- Language selection
- Large tap targets, readable typography, low-jargon labels
- Guided, one-step-at-a-time project creation
- Voice input and optional read-aloud support
- Save draft and resume later
- Clear help/contact option
- Mobile-first and resilient to slow connections

### Module 2 — Voice, multilingual input, and project brief generation
- Record or capture speech with explicit permission
- Convert speech to editable text
- Preserve the original transcript so the owner can correct errors
- Generate a structured project brief from the transcript
- Support selected launch languages; do not claim universal language coverage
- Show the generated brief in the owner's chosen language where supported
- Allow correction before the brief is shared
- Clearly label AI-generated content as a draft until verified

### Module 3 — Guided Q&A and owner verification
- Category-specific predefined questions
- Questions about current process, pain point, desired outcome, users, urgency, constraints, budget, and deliverables
- Tap-to-answer choices plus optional free-text/voice answer
- Follow-up questions only when needed
- Show the final brief in plain language
- Owner confirms, edits, saves draft, or cancels
- Keep a record of the confirmed version and subsequent edits

### Module 4 — Student profiles and portfolio
- Profile photo/avatar and basic information
- College, year, course/discipline, location, and remote preference
- Skills with self-reported proficiency
- Interests and availability
- Portfolio projects with role, tools, outcome, links, and media
- Certificates and achievements (optional)
- Resume/profile export (future enhancement)
- Privacy controls for contact details and public profile visibility

### Module 5 — Project discovery, matching, and applications
- Search and filters by category, skills, project type, timeline, location/remote, and compensation status
- Recommended projects based on skills, interests, availability, and stated preferences
- Explain recommendations with simple reasons such as “matches your web-development skills”
- Business can browse student profiles and select applicants
- Student can apply with a proposal and availability
- Application states: submitted, viewed, shortlisted, interview/discussion, accepted, declined, withdrawn
- Prevent duplicate applications and handle project closure
- Matching assists discovery; business retains final selection

### Module 6 — Project workspace and communication
- Project overview, participants, scope, and deliverables
- Milestones, due dates, and status
- Basic in-platform messages or a clearly defined external contact method
- File/link sharing with sensible limits and access control
- Progress updates and comments
- Completion confirmation from both sides
- Feedback and issue reporting
- Real-time chat provider integration is optional for the prototype; do not make it a blocker for validating the core workflow

### Module 7 — Trust, safety, and administration
- Email/phone verification appropriate to launch constraints
- Role-based access control for business, student, and admin
- Report user/project and block abusive interactions
- Admin review for suspicious, misleading, unsafe, or inappropriate projects
- Clearly state whether a project is paid, unpaid, expense-only, or negotiable
- No guarantee of business outcomes or student employment
- Audit important actions such as publishing, selection, and completion
- Data deletion and account deactivation path

## 7. Roles and permissions

### Business
Can create/edit its own project drafts, verify and publish projects, review applicants, browse student profiles, message relevant candidates, select a student/team, update project status, and provide feedback.

### Student
Can manage their own profile and portfolio, browse published projects, apply, communicate on accepted projects, update progress, and provide feedback.

### Admin
Can review reports, moderate projects/users, manage categories and predefined Q&A, inspect audit history where authorized, and help resolve issues. Admin access must not silently bypass privacy controls.

A user role describes permissions, not a person's identity or quality. A user should not be able to grant themselves admin permissions.

## 8. MVP scope

### Must have
- Student and business accounts with role-based authorization
- Business-friendly mobile-first onboarding
- Text input for a business problem
- Voice-to-text for at least one launch language, if supported reliably
- AI-generated structured project draft
- Predefined clarification Q&A and explicit owner confirmation
- Publish/edit/draft project flow
- Student profiles and project portfolios
- Project listings, basic filters, applications, and business review
- Manual student selection
- Basic project status and communication
- Admin moderation/reporting basics
- Responsive UI, validation, loading/error states, and basic tests

### Should have if time permits
- Multiple launch languages
- Text-to-speech/read-aloud
- Matching score and explanation
- Milestones and feedback
- Saved projects and notifications

### Not required for the first prototype
- Payments or escrow
- Complex AI agent workflows
- Fully automated student selection
- Native mobile apps
- Full real-time chat if a simpler communication flow validates the idea
- Large-scale analytics, advanced reputation scoring, or college ERP integrations

## 9. Suggested data model

The final schema should be reviewed as a team before implementation. Suggested entities:

- `users`: identity, email/phone as appropriate, status, timestamps
- `user_roles` or a protected role field: business/student/admin
- `business_profiles`: business name, category, location, preferred language, contact preferences
- `student_profiles`: college, year, discipline, bio, skills, availability, preferences
- `student_projects`: portfolio items, contribution, tools, outcomes, links
- `projects`: owner, title, problem, desired outcome, category, skills, timeline, compensation status, status, language, confirmed version
- `project_questions` / `project_answers`: predefined prompts and owner responses
- `applications`: project, student/team, proposal, availability, status
- `project_members`: accepted participants and roles
- `milestones`: deliverable, due date, status, review
- `messages` or `conversation references`: sender, participants, content/reference, timestamps
- `reviews`: author, recipient, project, structured ratings/comments
- `reports`: reporter, target, reason, status
- `audit_events`: important security- and workflow-related changes

Use foreign keys, indexes, server-side validation, and access policies. Do not expose private data simply because it exists in a shared database.

## 10. Matching approach for the prototype

Start with explainable rules, not a complex recommendation model:
- Required skills overlap with student skills
- Student interest/category preference
- Availability fits project timeline
- Remote/on-site preference and location fit
- Student application/proposal quality is reviewed by the business

Display reasons for recommendations and let the business make the final decision. Do not infer sensitive traits or use opaque scores as the sole basis for selection.

## 11. Non-functional requirements

- Mobile-first and usable on a low-cost phone
- Clear feedback for every save, submit, and error
- Secure authentication and server-side authorization
- Input validation and rate limits on expensive AI/transcription calls
- Consent before microphone use and clear indication while recording
- Secure storage and access to uploaded files
- Avoid storing voice recordings unless necessary and explicitly disclosed
- Language-specific review of generated text before launch
- Basic accessibility: keyboard support, contrast, labels, and screen-reader semantics
- Logging that avoids secrets and unnecessary personal data
- Backup and recovery plan appropriate to prototype stage

## 12. Success metrics

Prototype metrics to validate with real users:
- Business owners who successfully submit a verified project
- Median time from starting a brief to publishing it
- Percentage of generated briefs accepted with minor edits
- Percentage of users who finish the clarification Q&A
- Student profile completion rate
- Project application rate and business response rate
- Time from project publication to a shortlist/selection
- Percentage of projects with agreed deliverables
- Business and student satisfaction after completion
- Number and type of usability failures during observed tests

Do not optimize only for sign-ups. The primary validation is whether a real business can describe a problem and reach a useful student collaboration.

## 13. Key risks and mitigations

- **Incorrect transcription or AI interpretation:** preserve transcript, allow edits, ask clarifying questions, require owner confirmation.
- **Low digital literacy:** guided flow, voice input, local-language wording, large controls, usability testing with actual shopkeepers.
- **Scope mismatch:** structured deliverables, timeline, constraints, and pre-start confirmation.
- **Unrealistic student expectations:** show skill level, availability, responsibilities, and compensation clearly.
- **Unfair/opaque matching:** explain recommendations and retain human choice.
- **Privacy and security:** role-based access, minimum data collection, consent, and moderation.
- **Too much scope for a student team:** ship the verified-project and application loop first; add advanced chat and automation later.

## 14. Suggested implementation sequence

1. Agree on user flows, role permissions, and data model.
2. Build authentication, profiles, and project lifecycle.
3. Build the business guided form and owner verification.
4. Add voice transcription and AI brief generation behind a service boundary.
5. Build student discovery, applications, and business selection.
6. Add basic workspace, moderation, tests, and demo data.
7. Test with a small number of real shopkeepers and FY–SY students.
8. Prioritize changes based on observed task failures, not assumptions.

## 15. End goal

A shopkeeper with limited app experience can explain a problem naturally—preferably in their own language—review a clear project description through a few simple questions, and publish a verified brief without needing to understand technical terminology.

A student can create a credible professional profile, demonstrate skills through a portfolio, discover relevant real-world projects, apply confidently, and track their contribution.

The platform succeeds when it produces **clear, verified business problems and completed student collaborations**, not merely a large number of listings or AI-generated descriptions.
