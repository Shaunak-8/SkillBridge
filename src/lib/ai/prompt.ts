import { KnowledgeChunk } from "@/types/ai";
import { ValidatedGenerateInput, ValidatedProjectDraft } from "./schemas";

export const SYSTEM_PROMPT = `You are the AI Project Brief Assistant for SkillBridge, a platform connecting local small businesses and MSMEs with talented student builders.

YOUR GOAL:
Convert a business owner's rough description of a problem or goal into a clear, structured, professional project brief.

CRITICAL CONSTRAINTS & RAG GROUNDING RULES:
1. PRESERVE INTENT & ACCESSIBILITY: Keep the business owner's core objective intact. Use plain, friendly, non-jargon language that a small business owner can easily understand.
2. RETRIEVED CONTEXT IS FOR GUIDANCE ONLY:
   - Retrieved knowledge chunks are examples and project guidance templates. They are NOT facts about the user's business.
   - Use retrieved context to suggest relevant deliverables, essential skills, and realistic milestone phases.
   - DO NOT copy unrelated company names, budgets, or timelines from retrieved chunks.
3. DO NOT FABRICATE FACTS: NEVER invent budget amounts, deadlines, tech stacks, customer metrics, sales guarantees, or existing business infrastructure not mentioned in the problem.
4. HANDLING UNKNOWN DATA:
   - Set "budget_range" to null UNLESS an explicit budget is mentioned in the input text.
   - Set "timeline" to null UNLESS an explicit timeline is mentioned in the input text.
   - Put any unresolved assumptions or missing details as helpful questions in "open_questions".
5. SUGGESTIONS vs FACTS: Present deliverables and required skills as suggestions designed to solve the described problem.
6. REQUIRED JSON FORMAT: Return ONLY a single valid JSON object with NO markdown formatting, NO extra commentary, matching the JSON schema strictly:

{
  "title": "Short, clear project title (3-8 words)",
  "problem_statement": "Concise summary of the challenge faced by the business owner",
  "business_goal": "Clear outcome the business owner hopes to achieve",
  "category": "Suggested category (e.g. Web development, Marketing, Photography, Culinary, Data & analytics)",
  "mode": "individual" or "team",
  "proposed_deliverables": ["Deliverable 1", "Deliverable 2"],
  "required_skills": [
    {
      "skillName": "Name of skill",
      "category": "technical" | "creative" | "business",
      "level": "beginner" | "intermediate" | "advanced",
      "essential": true | false
    }
  ],
  "suggested_milestones": [
    {
      "title": "Milestone title",
      "description": "Short explanation of what happens in this milestone",
      "dueDate": "Suggested timeframe e.g. Week 1"
    }
  ],
  "budget_range": null,
  "timeline": null,
  "language": "en",
  "open_questions": ["Clarification question 1 for the business owner"]
}`;

export function buildUserPrompt(
  input: ValidatedGenerateInput,
  retrievedChunks: KnowledgeChunk[] = []
): string {
  let contextSection = "";

  if (retrievedChunks && retrievedChunks.length > 0) {
    contextSection = `\n\nRETRIEVED KNOWLEDGE CONTEXT (FOR GUIDANCE & DELIVERABLE INSPIRATION ONLY):\n` +
      retrievedChunks
        .map(
          (chunk, index) =>
            `--- EXAMPLE CHUNK ${index + 1} (Source ID: ${chunk.sourceId} | Type: ${chunk.sourceType} | Category: ${chunk.category || "General"}) ---\n${chunk.content}`
        )
        .join("\n\n");
  }

  return `BUSINESS PROBLEM STATEMENT:
"${input.rawProblemText}"

${input.category ? `PREFERRED CATEGORY: ${input.category}` : ""}
${input.format ? `PREFERRED FORMAT: ${input.format}` : ""}
${input.preferredLanguage ? `PREFERRED LANGUAGE: ${input.preferredLanguage}` : ""}
${contextSection}

Please convert the above business problem into a structured project brief adhering strictly to the system prompt guidelines and JSON output schema. Use the retrieved context as reference templates for proposed deliverables and skills where relevant.`;
}

export function buildFallbackDraft(
  rawProblemText: string,
  category: string = "General",
  format: "individual" | "team" = "team"
): ValidatedProjectDraft {
  const shortTitle =
    rawProblemText.length > 40
      ? `${rawProblemText.substring(0, 37)}...`
      : rawProblemText;

  return {
    title: `Project: ${shortTitle}`,
    problem_statement: rawProblemText,
    business_goal: "Solve the operational or creative challenge described by the business owner.",
    category: category || "General",
    mode: format || "team",
    proposed_deliverables: [
      "Initial discovery and problem breakdown",
      "Draft solution design or prototype",
      "Final handover and user walkthrough",
    ],
    required_skills: [
      {
        skillName: category === "Marketing" ? "Social media" : category === "Photography" ? "Photography" : "Problem solving",
        category: category === "Marketing" ? "business" : category === "Photography" ? "creative" : "technical",
        level: "intermediate",
        essential: true,
      },
    ],
    suggested_milestones: [
      {
        title: "Phase 1: Discovery & Scope Review",
        description: "Align on requirements and confirm student roles.",
        dueDate: "Week 1",
      },
      {
        title: "Phase 2: Execution & Handover",
        description: "Deliver key assets and review results with business owner.",
        dueDate: "Week 3",
      },
    ],
    budget_range: null,
    timeline: null,
    language: "en",
    open_questions: [
      "What is your target completion date for this project?",
      "Are there existing brand guidelines or materials the students should use?",
    ],
  };
}
