# Workstream 2 — Voice, AI Project Generation & RAG

## Objective
Turn a business owner's rough problem statement into a clear, structured project brief. Use retrieval-augmented generation (RAG) to ground the AI in approved project templates and relevant examples rather than relying only on general model knowledge.

## Owns
- Text-first AI project generation
- Embedding and retrieval pipeline for approved knowledge
- Optional speech-to-text integration (coordinate with Member 1)
- Prompting, structured output validation, and AI safety/quality checks
- RAG evaluation and seeded knowledge content

## Suggested flow
1. Receive the owner's transcript or typed problem.
2. Normalize the text without losing the original meaning; record the selected language.
3. Embed the query using the selected embedding model.
4. Retrieve the most relevant permitted chunks from Neon + pgvector.
5. Send the problem plus retrieved context to the LLM.
6. Ask the LLM to return a structured draft and mark unknown information as unknown instead of guessing.
7. Validate the output schema and save it as a draft.
8. Return the draft and (internally) source IDs used for grounding.

## RAG scope for the prototype
Start with a small, curated knowledge base:
- Approved project templates (e.g. digital marketing, inventory tracking, website/catalog, customer feedback)
- Example project descriptions reviewed by the team
- General guidance for useful deliverables, milestones, and skills

Do not index private student data or private business conversations as shared knowledge. Only ingest content the platform is allowed to use.

## Suggested Neon tables
- `knowledge_chunks`: `id`, `content`, `source_type`, `source_id`, `language`, `metadata JSONB`, `embedding VECTOR(...)`, `created_at`
- `projects`: structured output saved as a draft
- Optional `ai_generation_runs`: `id`, `project_id`, `model`, `retrieved_chunk_ids`, `status`, `created_at` (avoid storing unnecessary sensitive prompts/audio)

Choose the embedding model before creating the vector column. The vector dimension must match that model's output dimension. Enable pgvector in Neon and use parameterized SQL.

## Structured project output
Agree on one shared schema, for example:
- `title`
- `problem_statement`
- `business_goal`
- `proposed_deliverables` (array)
- `required_skills` (array)
- `suggested_milestones` (array, explicitly suggestions)
- `budget_range` (optional; null if unknown)
- `timeline` (optional; null if unknown)
- `language`
- `open_questions` (array of details needing owner input)
- `retrieved_sources` (internal IDs, not shown as factual evidence unless validated)

Never fabricate a budget, deadline, business fact, student result, or promise that an example's outcome will repeat.

## Suggested routes
- `POST /api/ai/project-draft` — input: `projectId` or a draft problem + language; output: validated structured draft
- `POST /api/ai/transcribe` — optional later, audio upload handled securely
- `POST /api/ai/reindex-knowledge` — development/admin-only; never expose unrestricted indexing to public users

Coordinate final route shapes with Members 1, 3, and 6.

## Retrieval requirements
- Retrieve only approved knowledge sources.
- Use metadata filters for language and source type where useful.
- Use a small top-k initially (e.g. 3–5), then evaluate whether results are genuinely relevant.
- Keep the retrieved source IDs for debugging/evaluation.
- Do not treat vector similarity as proof that retrieved content is true or authorized.
- Consider keyword/structured filters alongside vector similarity for exact requirements.

## Dependencies
- Member 1: input UX, supported languages, and draft display contract.
- Member 3: clarification questions and owner-confirmation workflow.
- Member 5: matching may reuse embeddings, but must use a separately defined retrieval/ranking contract.
- Member 6: pgvector migration, secrets, server-side DB helper, auth, and shared schema.

## Definition of done
- A typed business problem produces valid structured JSON and a saved draft.
- Retrieval is actually performed against seeded approved content and relevant retrieved sources can be inspected in development.
- If retrieval returns nothing useful, generation still behaves safely and does not pretend sources were found.
- Missing details remain null or appear as questions rather than invented facts.
- Invalid model output is rejected/retried safely and errors are handled.
- Basic evaluation set of at least 10 sample business problems is tested and reviewed by the team.

## End goal
The AI helps an owner explain a real problem clearly, using relevant examples as context, while leaving the owner in control of all factual details and publication.
