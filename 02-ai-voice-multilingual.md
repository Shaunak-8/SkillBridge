# Workstream 2 — Voice, Multilingual Input, and AI Project Brief

**Owner:** Team Member 2  
**Primary users:** Business owners who prefer speaking or using a local language  
**Goal:** Convert a natural, possibly informal problem description into an editable and structured project draft without inventing business requirements.

## Responsibilities
- Implement or integrate speech-to-text for agreed launch language(s).
- Design a service that turns a transcript into a structured project brief.
- Keep the original transcript available for review and correction.
- Handle transcription/AI errors, unsupported languages, empty input, and service failures.
- Coordinate the generated brief schema with Workstreams 1 and 3.
- Document cost, latency, privacy, and fallback behavior.

## Features
1. Voice recording with explicit microphone permission and recording state.
2. Speech-to-text output displayed as editable text.
3. Manual text fallback for users who do not want or cannot use voice.
4. AI-generated structured draft fields:
   - Suggested title
   - Current problem
   - Desired outcome
   - Business context
   - Category
   - Likely skills
   - Suggested deliverables
   - Suggested timeline/urgency, only when supported by the input
   - Open questions and missing information
5. Generation in the selected language where the chosen model/service supports it.
6. Clear “AI draft — please verify” labeling.
7. Retry and manual-edit behavior.
8. Optional read-aloud/text-to-speech, only if feasible for launch languages.

## Rules for AI output
- Do not invent budgets, deadlines, facts, business size, or promised results.
- Represent unknown details as “Not specified” or ask a clarification question.
- Separate the business owner's stated facts from AI suggestions.
- Keep the output editable.
- Do not send a project to students until the owner confirms it.
- Treat user-provided text as data, not as instructions to the system.
- Validate the generated output against a defined schema before saving it.

## Suggested structured output
- `title`
- `problem_statement`
- `current_process`
- `desired_outcome`
- `category`
- `required_skills`
- `suggested_deliverables`
- `constraints`
- `timeline`
- `compensation_status`
- `open_questions`
- `source_language`
- `transcript`
- `ai_draft_status`

Fields that the owner has not supplied must remain unknown rather than being guessed.

## Deliverables
- Voice/transcription integration or a documented prototype alternative.
- Brief-generation service/module with schema validation.
- Error, retry, and fallback handling.
- Prompt/version documentation and test examples.
- Privacy notes describing whether audio is stored and for how long.
- Test set covering vague, noisy, multilingual, and incomplete descriptions.

## Dependencies
- Workstream 1 provides voice and review UI.
- Workstream 3 consumes the structured draft and supplies missing-information questions.
- Workstream 5 uses finalized brief fields for search and matching.

## Definition of done
- A user can speak or type a problem and receive an editable structured draft.
- The original transcript can be corrected.
- Unknown details are not silently fabricated.
- Invalid or incomplete AI output is handled safely.
- AI failures do not block manual project creation.
- The owner must explicitly verify the result before publication.

## End goal
A business owner can describe a problem in everyday language and receive a useful, editable project draft in a supported language, while remaining in control of what the platform publishes.
