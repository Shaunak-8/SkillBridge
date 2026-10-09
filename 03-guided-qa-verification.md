# Workstream 3 — Guided Q&A and Business Verification

**Owner:** Team Member 3  
**Primary users:** Business owners who need help clarifying their needs  
**Goal:** Turn an AI draft into a clear, owner-approved project brief using short, understandable questions.

## Responsibilities
- Define a reusable project brief schema with the team.
- Create a predefined question bank by project category.
- Build the question-and-answer flow and final confirmation step.
- Identify missing or contradictory information.
- Ensure questions are simple, localized where supported, and easy to answer by tapping or speaking.
- Store the confirmed version and track later edits.

## Question categories
Questions should be conditional: ask only what is relevant and not already clear.

1. **Current situation:** How do you handle this today?
2. **Main difficulty:** What is the biggest problem?
3. **Desired result:** What would you like to become easier or better?
4. **People affected:** Who will use the solution?
5. **Must-have functions:** What must the solution do?
6. **Constraints:** Is there a device, internet, language, or process limitation?
7. **Timeline:** When would you ideally like it?
8. **Budget/compensation:** Is this paid, unpaid, expense-only, or to be discussed?
9. **Access and materials:** Can the student see sample records or test the current process?
10. **Success criteria:** How will you know the project helped?

Use simple options plus “Other” and “Not sure.” Do not force the owner to answer a question when the answer is genuinely unknown.

## Features
- Category-aware predefined question bank.
- Tap-to-answer options and optional free-text/voice answer.
- Skip/not-sure options for nonessential questions.
- Missing-field and contradiction checks.
- Plain-language project summary.
- Edit individual answers or return to an earlier step.
- Explicit confirmation: confirm, edit, save draft, or cancel.
- Versioning/audit trail for confirmed briefs and subsequent edits.

## Verification rules
- The owner confirms the final brief, not just the transcript.
- Highlight assumptions and unanswered questions.
- Do not present AI suggestions as facts.
- Required fields should be limited to what is essential for a useful listing.
- Re-confirm material changes to title, scope, deliverables, timeline, or compensation after publication.

## Deliverables
- Question bank in a maintainable format.
- Q&A screens and answer persistence.
- Brief review/confirmation screen.
- Validation rules and version history.
- Test cases for incomplete, conflicting, and corrected answers.

## Dependencies
- Workstream 2 provides the structured AI draft and open questions.
- Workstream 1 provides the accessible business interface.
- Workstream 5 consumes the confirmed project record.

## Definition of done
- The app asks relevant questions without making the process unnecessarily long.
- Owners can change answers and review the resulting description.
- A project cannot be published without explicit confirmation.
- Confirmed data is saved with a version/timestamp.
- Material edits after publication are traceable.

## End goal
The business owner understands and approves the exact project students will see, reducing misunderstandings before anyone applies or begins work.
