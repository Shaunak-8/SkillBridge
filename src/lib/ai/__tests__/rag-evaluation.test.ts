import { describe, expect, it, vi } from "vitest";
import { retrieveKnowledge } from "../retrieval";
import { generateProjectDraft } from "../generator";
import { cosineSimilarity, keywordSimilarity } from "../embeddings";
import { buildUserPrompt } from "../prompt";
import { KnowledgeChunk } from "@/types/ai";

vi.mock("server-only", () => ({}));
// No DATABASE_URL in unit tests: retrieval must fall back to the seed knowledge base.
vi.mock("@/lib/db", () => ({ database: () => { throw new Error("DATABASE_URL is missing."); } }));

describe("Semantic Retrieval & RAG Pipeline Evaluation", () => {
  describe("Similarity & Distance Math", () => {
    it("calculates exact cosine similarity between identical vectors", () => {
      const vec = [0.1, 0.5, 0.8, -0.2];
      const score = cosineSimilarity(vec, vec);
      expect(score).toBeCloseTo(1.0);
    });

    it("calculates zero similarity for orthogonal vectors", () => {
      const vecA = [1, 0];
      const vecB = [0, 1];
      const score = cosineSimilarity(vecA, vecB);
      expect(score).toBe(0.0);
    });

    it("evaluates keyword similarity for semantic fallback search", () => {
      const score = keywordSimilarity("We need an online bakery ordering system", [
        "bakery",
        "order",
        "ordering",
      ]);
      expect(score).toBeGreaterThanOrEqual(0.6);
    });
  });

  describe("Semantic Retrieval Function", () => {
    it("1. Relevant query: retrieves Cafe/Bakery Web Ordering template", async () => {
      const result = await retrieveKnowledge(
        "We run a local cafe and manage custom orders on paper tickets.",
        "en",
        3
      );

      expect(result.chunks.length).toBeGreaterThan(0);
      expect(result.retrievedSourceIds).toContain("tpl-cafe-ordering");
      expect(result.chunks[0].category).toBe("Web development");
    });

    it("2. Ambiguous query: handles broad text safely without throwing", async () => {
      const result = await retrieveKnowledge(
        "We need help making our business better.",
        "en",
        3
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result.chunks)).toBe(true);
      expect(Array.isArray(result.retrievedSourceIds)).toBe(true);
    });

    it("3. Multilingual query: retrieves relevant bakery template for Hindi query", async () => {
      const result = await retrieveKnowledge(
        "हमारी बेकरी के लिए ऑनलाइन ऑर्डरिंग ऐप और मेनू चाहिए",
        "hi",
        3
      );

      expect(result.chunks.length).toBeGreaterThan(0);
      expect(result.retrievedSourceIds).toContain("tpl-cafe-ordering");
    });

    it("4. No useful match: filters out weak matches below similarity threshold", async () => {
      const result = await retrieveKnowledge(
        "xyz12345 unmapped quantum physics space satellite problem",
        "en",
        3
      );

      expect(result.chunks.length).toBe(0);
      expect(result.retrievedSourceIds.length).toBe(0);
    });

    it("5. Handles embedding API / network failure gracefully without throwing", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new Error("Network connection error"))
      );

      const result = await retrieveKnowledge(
        "Inventory tracking spreadsheet for small retail shop",
        "en",
        3
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result.chunks)).toBe(true);
      vi.restoreAllMocks();
    });
  });

  describe("RAG Prompt Grounding & LLM Pipeline Integration", () => {
    it("6. Formats retrieved chunks as guidance context in user prompt", () => {
      const mockChunks: KnowledgeChunk[] = [
        {
          id: "kc-1",
          sourceId: "tpl-cafe-ordering",
          sourceType: "approved_template",
          language: "en",
          category: "Web development",
          content: "Template: Cafe ordering interface with React and SMS triggers.",
        },
      ];

      const input = {
        rawProblemText: "We need an order app for our cafe.",
        category: "Web development",
      };

      const prompt = buildUserPrompt(input, mockChunks);
      expect(prompt).toContain("RETRIEVED KNOWLEDGE CONTEXT (FOR GUIDANCE & DELIVERABLE INSPIRATION ONLY)");
      expect(prompt).toContain("tpl-cafe-ordering");
      expect(prompt).toContain("Template: Cafe ordering interface with React and SMS triggers.");
    });

    it("7. Full RAG Generation: returns retrievedSourceIds and ragContextUsed flag", async () => {
      const result = await generateProjectDraft({
        rawProblemText: "We run a bakery and need an online order system for custom cakes.",
        category: "Web development",
        format: "team",
      });

      expect(result.draft).toBeDefined();
      expect(result.retrievedSourceIds.length).toBeGreaterThan(0);
      expect(result.retrievedSourceIds).toContain("tpl-cafe-ordering");
      expect(result.ragContextUsed).toBe(true);
    });

    it("8. Preserves budget_range and timeline as null when unspecified in RAG problem", async () => {
      const result = await generateProjectDraft({
        rawProblemText: "We need product photography for our artisanal clothing line.",
        category: "Photography",
      });

      expect(result.draft.budget_range).toBeNull();
      expect(result.draft.timeline).toBeNull();
      expect(result.retrievedSourceIds).toContain("tpl-product-photography");
    });
  });
});
