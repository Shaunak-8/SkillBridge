# Workstream 5 — Project Discovery, Matching, and Applications

**Owner:** Team Member 5  
**Primary users:** Students searching for real projects and businesses selecting students  
**Goal:** Connect verified business projects with relevant students while keeping recommendations explainable and human decisions in control.

## Responsibilities
- Build the project listing/detail experience.
- Implement search, filters, and basic matching.
- Build student application and business review workflows.
- Support both student-led applications and business-led discovery.
- Coordinate with Workstream 4 on profile fields and Workstream 6 on accepted projects.

## Student discovery features
- Project cards with title, category, skills, timeline, compensation status, and location/remote status.
- Search and filters by category, required skills, timeline, location/remote, and compensation status.
- Project detail page with verified problem statement, desired outcome, deliverables, constraints, and application instructions.
- Save/bookmark projects if time permits.
- Apply with a proposal, relevant portfolio links, and availability.
- View application status and withdraw where appropriate.

## Business selection features
- View applicants for a project.
- Review student profile, portfolio, skills, availability, and proposal.
- Shortlist, ask questions, accept, or decline.
- Browse student profiles and invite a relevant student to apply, if time permits.
- Clearly explain that a match recommendation is not a guarantee of suitability.

## Prototype matching logic
Use a simple, explainable approach:
- Skill overlap
- Interest/category fit
- Availability versus timeline
- Location/remote preference fit
- Relevant portfolio evidence

Start with filters and weighted rules. Display reasons such as “Matches 3 requested skills” rather than a mysterious score alone. The business makes the final choice.

## Application states
`submitted → viewed → shortlisted → discussion/interview → accepted/declined`
Also support `withdrawn` and `project_closed`. Enforce valid transitions server-side.

## Deliverables
- Project feed, search/filter UI, and detail page.
- Application form and status tracking.
- Business applicant review and decision flow.
- Basic explainable matching logic.
- Tests for duplicate applications, closed projects, and unauthorized access.

## Dependencies
- Workstream 3 provides verified project data.
- Workstream 4 provides student profiles, skills, and portfolio.
- Workstream 6 handles accepted participants, communication, and project progress.

## Definition of done
- Students can find projects, inspect the full brief, and apply.
- Businesses can review applicants and select a student/team.
- Matching reasons are understandable.
- Only published projects are discoverable.
- Closed projects cannot receive new applications.
- Users can access only the applications and information permitted by their role.

## End goal
A student can find a genuine project that fits their skills and availability, and a local business can confidently compare relevant candidates and choose whom to work with.
