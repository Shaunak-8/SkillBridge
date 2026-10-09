# Workstream 4 — Student Profiles and Portfolio

**Owner:** Team Member 4  
**Primary users:** FY–SY students seeking practical experience  
**Goal:** Give students a professional, credible profile and portfolio experience inspired by career platforms, while keeping the MVP achievable.

## Responsibilities
- Build student onboarding and profile management.
- Implement skills, interests, availability, and preferences.
- Build portfolio project creation/editing.
- Ensure student profiles are readable to businesses and protect private data.
- Coordinate profile fields with matching and application workflows.

## Features
1. Student onboarding with education level/year and discipline.
2. Profile photo/avatar, headline, bio, and location/remote preference.
3. Skills and self-described proficiency.
4. Interests and project categories.
5. Availability and expected weekly commitment.
6. Portfolio entries containing:
   - Project name and summary
   - Student's role/contribution
   - Skills/tools used
   - Outcome or what was learned
   - Links/media where safe
7. Optional certificates, achievements, and resume link.
8. Profile completeness indicator.
9. Public/private profile and contact visibility controls.
10. Edit, preview, and delete portfolio entries.

## Important product rules
- Do not imply that self-reported skills are formally certified.
- Clearly distinguish profile information from verified credentials.
- Avoid requiring an extensive profile before a student can explore projects.
- Never expose private email, phone, or sensitive data to every user by default.
- Validate and safely display user-submitted links and text.

## Deliverables
- Student onboarding and profile screens.
- Student profile and portfolio data model integration.
- Portfolio add/edit/delete flows.
- Profile preview as seen by a business.
- Validation, empty states, and responsive layouts.

## Dependencies
- Workstream 5 consumes skills, interests, availability, and preferences.
- Workstream 6 needs the student identity and profile summary for accepted project participants.
- Shared authentication and schema decisions must be agreed with the team.

## Definition of done
- A student can create and update a profile.
- A student can add, edit, and remove portfolio projects.
- Businesses can view relevant public profile information.
- Private contact details are protected by authorization.
- Profile data can be used by the discovery/matching module.

## End goal
A first- or second-year student with limited formal work experience can demonstrate what they know, what they have built, and what they want to learn—so businesses can make a more informed selection.
