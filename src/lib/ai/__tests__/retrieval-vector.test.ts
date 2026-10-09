import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const sql = vi.hoisted(() => vi.fn());
const dbState = vi.hoisted(() => ({ available: true }));
const queryEmbedding = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db", () => ({
  database: () => {
    if (!dbState.available) throw new Error("DATABASE_URL is missing.");
    return sql;
  },
}));
vi.mock("../embeddings", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../embeddings")>()),
  generateQueryEmbedding: queryEmbedding,
}));

import { retrieveKnowledge } from "../retrieval";
import { generateProjectDraft } from "../generator";

const VECTOR = Array.from({ length: 768 }, (_, i) => (i % 7) / 10);
const VECTOR_LITERAL = `[${VECTOR.join(",")}]`;
const ROW = {
  id: "11111111-1111-4111-8111-111111111111",
  source_key: "tpl-cafe-ordering",
  language: "en",
  content: "VECTOR-ONLY-CHUNK-CONTENT about cafe ordering dashboards.",
  metadata: { chunkId: "chunk-cafe", sourceType: "approved_template", category: "Web development" },
  similarity: "0.8125", // pgvector/neon returns numerics as strings
};
const QUERY = "We run a cafe and need an ordering system";
const sqlText = () => (sql.mock.calls[0][0] as string[]).join("?");
const sqlValues = () => sql.mock.calls[0].slice(1);

beforeEach(() => {
  vi.resetAllMocks();
  dbState.available = true;
  queryEmbedding.mockResolvedValue(VECTOR);
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("retrieveKnowledge: pgvector path", () => {
  it("returns neon_pgvector and maps rows to chunks", async () => {
    sql.mockResolvedValueOnce([ROW]);
    const result = await retrieveKnowledge(QUERY, "en", 3);

    expect(result.retrievedFrom).toBe("neon_pgvector");
    expect(result.queryEmbeddingGenerated).toBe(true);
    expect(result.retrievedSourceIds).toEqual(["tpl-cafe-ordering"]);
    expect(result.chunks).toEqual([
      {
        id: "chunk-cafe",
        sourceId: "tpl-cafe-ordering",
        sourceType: "approved_template",
        language: "en",
        category: "Web development",
        content: ROW.content,
        metadata: ROW.metadata,
        similarity: 0.8125,
      },
    ]);
    expect(typeof result.chunks[0].similarity).toBe("number");
  });

  it("falls back to the row id when metadata has no chunkId", async () => {
    sql.mockResolvedValueOnce([{ ...ROW, metadata: null }]);
    const { chunks } = await retrieveKnowledge(QUERY);
    expect(chunks[0].id).toBe(ROW.id);
    expect(chunks[0].sourceType).toBe("approved_template");
  });

  it("issues one parameterized query that filters approved, language, threshold and LIMIT", async () => {
    sql.mockResolvedValueOnce([ROW]);
    await retrieveKnowledge(QUERY, "en", 5);

    expect(sql).toHaveBeenCalledTimes(1);
    const text = sqlText();
    expect(text).toContain("FROM skillbridge.knowledge_chunks");
    expect(text).toContain("WHERE approved");
    expect(text).toContain("embedding IS NOT NULL");
    expect(text).toContain("language = ?");
    expect(text).toContain("OR language = 'en'");
    expect(text).toMatch(/>= \?/);
    expect(text).toMatch(/ORDER BY embedding <=> \?::vector/);
    expect(text).toMatch(/LIMIT \?/);
    // Every dynamic input is a bound value, never interpolated into the SQL text.
    expect(text).not.toContain(VECTOR_LITERAL);
    expect(text).not.toContain("cafe");
    const values = sqlValues();
    expect(values).toContain(VECTOR_LITERAL);
    expect(values).toContain("en");
    expect(values).toContain(0.35);
    expect(values).toContain(5);
  });

  it("binds the requested language and keeps the English fallback", async () => {
    sql.mockResolvedValueOnce([{ ...ROW, language: "hi" }]);
    const { chunks } = await retrieveKnowledge(QUERY, "hi", 3);
    expect(sqlValues()).toContain("hi");
    expect(sqlText()).toContain("OR language = 'en'");
    expect(chunks[0].language).toBe("hi");
  });

  it("treats a hostile language value as data, not SQL", async () => {
    sql.mockResolvedValueOnce([]);
    const hostile = "en'; DROP TABLE skillbridge.knowledge_chunks; --";
    await retrieveKnowledge(QUERY, hostile, 3);
    expect(sqlText()).not.toContain("DROP TABLE");
    expect(sqlValues()).toContain(hostile);
  });
});

describe("retrieveKnowledge: fallbacks", () => {
  it.each([
    ["null", null],
    ["wrong-length", [0.1, 0.2, 0.3]],
  ])("falls back to seed search for a %s query vector", async (_label, vector) => {
    queryEmbedding.mockResolvedValue(vector);
    const result = await retrieveKnowledge(QUERY, "en", 3);

    expect(sql).not.toHaveBeenCalled();
    expect(result.retrievedFrom).toBe("offline_seed_fallback");
    expect(result.queryEmbeddingGenerated).toBe(vector !== null);
    expect(result.retrievedSourceIds).toContain("tpl-cafe-ordering");
  });

  it("reports queryEmbeddingGenerated=false when the embedding call returns null", async () => {
    queryEmbedding.mockResolvedValue(null);
    const result = await retrieveKnowledge(QUERY);
    expect(result.queryEmbeddingGenerated).toBe(false);
    expect(result.retrievedFrom).toBe("offline_seed_fallback");
  });

  it("falls back to seed search and does not throw when the database query fails", async () => {
    sql.mockRejectedValueOnce(new Error("connection reset"));
    const result = await retrieveKnowledge(QUERY, "en", 3);

    expect(result.retrievedFrom).toBe("offline_seed_fallback");
    expect(result.queryEmbeddingGenerated).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.retrievedSourceIds).toContain("tpl-cafe-ordering");
  });

  it("falls back to seed keyword search when the vector query returns no rows", async () => {
    sql.mockResolvedValueOnce([]);
    const result = await retrieveKnowledge(QUERY, "en", 3);

    expect(sql).toHaveBeenCalledTimes(1);
    expect(result.retrievedFrom).toBe("offline_seed_fallback");
    expect(result.chunks.length).toBeGreaterThan(0);
    expect(result.retrievedSourceIds).toContain("tpl-cafe-ordering");
  });

  it("falls back when DATABASE_URL is missing even if embedding succeeded", async () => {
    dbState.available = false;
    const result = await retrieveKnowledge(QUERY);
    expect(result.retrievedFrom).toBe("offline_seed_fallback");
    expect(result.queryEmbeddingGenerated).toBe(true);
  });

  it("returns an empty fallback result for a too-short query without touching embeddings or DB", async () => {
    const result = await retrieveKnowledge("hi");
    expect(result.chunks).toEqual([]);
    expect(queryEmbedding).not.toHaveBeenCalled();
    expect(sql).not.toHaveBeenCalled();
  });
});

describe("generateProjectDraft: retrieved chunks reach the LLM prompt", () => {
  const originalEnv = process.env;
  const draft = {
    title: "Cafe Order Portal",
    problem_statement: "Paper tickets cause order confusion.",
    business_goal: "Digital order tracking.",
    category: "Web development",
    mode: "team",
    proposed_deliverables: ["Order dashboard"],
    required_skills: [{ skillName: "React", category: "technical", level: "intermediate", essential: true }],
    suggested_milestones: [{ title: "M1", description: "Wireframes", dueDate: "Week 1" }],
    budget_range: null,
    timeline: null,
    language: "en",
    open_questions: ["Which POS do you use?"],
  };

  beforeEach(() => {
    process.env = { ...originalEnv, GEMINI_API_KEY: "test_gemini_key" };
  });
  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
  });

  it("puts pgvector chunks in the Gemini prompt and reports RAG metadata", async () => {
    sql.mockResolvedValueOnce([ROW]);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(draft) }] } }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateProjectDraft({ rawProblemText: QUERY, category: "Web development", format: "team" });

    expect(result.isFallback).toBe(false);
    expect(result.ragContextUsed).toBe(true);
    expect(result.retrievedFrom).toBe("neon_pgvector");
    expect(result.retrievedSourceIds).toEqual(["tpl-cafe-ordering"]);
    // Only the Gemini generation call is made; embeddings are mocked, so no other network use.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("generativelanguage.googleapis.com");
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    const prompt: string = sent.contents[0].parts[0].text;
    expect(prompt).toContain("VECTOR-ONLY-CHUNK-CONTENT");
    expect(prompt).toContain("Source ID: tpl-cafe-ordering");
  });
});
