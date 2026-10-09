import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateInputSchema, projectDraftSchema } from "../schemas";
import { generateProjectDraft } from "../generator";
import { buildFallbackDraft, buildUserPrompt } from "../prompt";

vi.mock("server-only", () => ({}));
// No DATABASE_URL in unit tests: retrieval must fall back to the seed knowledge base.
vi.mock("@/lib/db", () => ({ database: () => { throw new Error("DATABASE_URL is missing."); } }));

vi.mock("server-only", () => ({}));
// No DATABASE_URL in unit tests: retrieval must fall back to the seed knowledge base.
vi.mock("@/lib/db", () => ({ database: () => { throw new Error("DATABASE_URL is missing."); } }));

describe("AI Project Draft Generator & Gemini Integration", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe("Input Validation Schema", () => {
    it("accepts valid problem statement input", () => {
      const input = {
        rawProblemText: "We need a custom website for our local bakery to accept cake orders.",
        category: "Web development",
        format: "team" as const,
      };
      const result = generateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("rejects short problem statements (< 10 chars)", () => {
      const result = generateInputSchema.safeParse({
        rawProblemText: "Too short",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("at least 10 characters");
      }
    });

    it("rejects oversized problem statements (> 4000 chars)", () => {
      const longText = "a".repeat(4001);
      const result = generateInputSchema.safeParse({
        rawProblemText: longText,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("Structured Project Draft Zod Schema", () => {
    it("validates a properly structured LLM output", () => {
      const validDraft = {
        title: "Bakery Custom Order Portal",
        problem_statement: "Bakery manages paper orders leading to lost tickets.",
        business_goal: "Digital order tracking and customer notifications.",
        category: "Web development",
        mode: "team",
        proposed_deliverables: [
          "Order entry form",
          "Kitchen status dashboard",
        ],
        required_skills: [
          {
            skillName: "React",
            category: "technical",
            level: "intermediate",
            essential: true,
          },
        ],
        suggested_milestones: [
          {
            title: "Phase 1 Prototype",
            description: "Review order input form",
            dueDate: "Week 1",
          },
        ],
        budget_range: null,
        timeline: null,
        language: "en",
        open_questions: ["What notification channel is preferred?"],
      };

      const result = projectDraftSchema.safeParse(validDraft);
      expect(result.success).toBe(true);
    });

    it("rejects malformed LLM output missing required fields", () => {
      const invalidDraft = {
        title: "Missing Fields Draft",
      };

      const result = projectDraftSchema.safeParse(invalidDraft);
      expect(result.success).toBe(false);
    });
  });

  describe("Gemini Provider Call & Fallback Handling", () => {
    it("successfully parses valid Gemini API response", async () => {
      process.env.GEMINI_API_KEY = "test_gemini_key";
      process.env.LLM_MODEL = "gemini-2.5-flash-lite";

      const mockGeminiResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    title: "Local Cafe Order Management",
                    problem_statement: "Paper tickets cause order confusion during rush hours.",
                    business_goal: "Streamline cafe order processing.",
                    category: "Web development",
                    mode: "team",
                    proposed_deliverables: ["Order dashboard", "Customer receipts"],
                    required_skills: [
                      {
                        skillName: "React",
                        category: "technical",
                        level: "intermediate",
                        essential: true,
                      },
                    ],
                    suggested_milestones: [
                      { title: "M1: Wireframes", description: "UI mockup", dueDate: "Week 1" },
                    ],
                    budget_range: null,
                    timeline: null,
                    language: "en",
                    open_questions: ["Do you use a POS printer?"],
                  }),
                },
              ],
            },
          },
        ],
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => mockGeminiResponse,
        })
      );

      const result = await generateProjectDraft({
        rawProblemText: "Our cafe struggles with paper tickets during busy mornings.",
        category: "Web development",
        format: "team",
      });

      expect(result.isFallback).toBe(false);
      expect(result.providerUsed).toContain("Google Gemini (gemini-2.5-flash-lite)");
      expect(result.draft.title).toBe("Local Cafe Order Management");
      expect(result.draft.budget_range).toBeNull();
    });

    it("flags fallback cleanly when GEMINI_API_KEY is missing", async () => {
      delete process.env.GEMINI_API_KEY;
      delete process.env.LLM_API_KEY;
      delete process.env.OPENAI_API_KEY;

      const result = await generateProjectDraft({
        rawProblemText: "We need social media graphics for our vintage shop.",
        category: "Marketing",
      });

      expect(result.isFallback).toBe(true);
      expect(result.providerUsed).toBe("Offline Fallback");
      expect(result.fallbackReason).toContain("Missing GEMINI_API_KEY");
      expect(result.draft).toBeDefined();
    });

    it("handles Gemini HTTP 429 rate limit error gracefully with fallback flag", async () => {
      process.env.GEMINI_API_KEY = "test_gemini_key";

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 429,
          statusText: "Too Many Requests",
        })
      );

      const result = await generateProjectDraft({
        rawProblemText: "High traffic test problem statement.",
      });

      expect(result.isFallback).toBe(true);
      expect(result.fallbackReason).toContain("rate limit exceeded (HTTP 429)");
    });

    it("handles malformed JSON from Gemini API gracefully with fallback flag", async () => {
      process.env.GEMINI_API_KEY = "test_gemini_key";

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [{ text: "Invalid Non-JSON response text" }],
                },
              },
            ],
          }),
        })
      );

      const result = await generateProjectDraft({
        rawProblemText: "Testing malformed output handling.",
      });

      expect(result.isFallback).toBe(true);
      expect(result.fallbackReason).toBeDefined();
    });

    it("handles request timeout gracefully with fallback flag", async () => {
      process.env.GEMINI_API_KEY = "test_gemini_key";

      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation(() => {
          const error = new Error("The operation was aborted");
          error.name = "AbortError";
          return Promise.reject(error);
        })
      );

      const result = await generateProjectDraft({
        rawProblemText: "Testing API timeout handling.",
      });

      expect(result.isFallback).toBe(true);
      expect(result.fallbackReason).toContain("timed out");
    });
  });
});
