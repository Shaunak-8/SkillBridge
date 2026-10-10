import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const sql = vi.hoisted(() => vi.fn());
const embed = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db", () => ({ database: () => sql }));
vi.mock("../embeddings", () => ({ EMBEDDING_MODEL: "test-model", generateDocumentEmbedding: embed }));

import { createHash } from "node:crypto";
import { reindexKnowledge } from "../knowledge-index";
import { SEED_KNOWLEDGE_CHUNKS } from "../seed-knowledge";

const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const existingRow = (c: (typeof SEED_KNOWLEDGE_CHUNKS)[number], over = {}) => ({
  source_key: c.sourceId, chunk_index: 0, content_hash: hash(c.content), embedding_model: "test-model", has_embedding: true, ...over,
});
const upserts = () => sql.mock.calls.filter((c) => (c[0] as string[]).join("?").includes("INSERT INTO skillbridge.knowledge_chunks"));
const TOTAL = SEED_KNOWLEDGE_CHUNKS.length;

beforeEach(() => {
  vi.resetAllMocks();
  embed.mockResolvedValue(Array.from({ length: 768 }, () => 0.1));
});

describe("reindexKnowledge", () => {
  it("embeds and upserts everything on first run, storing a content hash", async () => {
    sql.mockResolvedValue([]);
    expect(await reindexKnowledge()).toEqual({ total: TOTAL, embedded: TOTAL, skipped: 0, failed: 0 });
    expect(embed).toHaveBeenCalledTimes(TOTAL);
    const [strings, ...values] = upserts()[0];
    expect((strings as string[]).join("?")).toContain("ON CONFLICT (source_key, chunk_index) DO UPDATE");
    const metadata = JSON.parse(values.find((v) => typeof v === "string" && v.includes("contentHash")) as string);
    expect(metadata.contentHash).toBe(hash(SEED_KNOWLEDGE_CHUNKS[0].content));
  });

  it("skips unchanged chunks without calling the embedding API or writing", async () => {
    sql.mockResolvedValueOnce(SEED_KNOWLEDGE_CHUNKS.map((c) => existingRow(c)));
    expect(await reindexKnowledge()).toEqual({ total: TOTAL, embedded: 0, skipped: TOTAL, failed: 0 });
    expect(embed).not.toHaveBeenCalled();
    expect(upserts()).toHaveLength(0);
  });

  it("re-embeds only chunks whose hash, model or embedding changed", async () => {
    sql.mockResolvedValueOnce([
      existingRow(SEED_KNOWLEDGE_CHUNKS[0], { content_hash: "stale" }),
      existingRow(SEED_KNOWLEDGE_CHUNKS[1], { embedding_model: "old-model" }),
      existingRow(SEED_KNOWLEDGE_CHUNKS[2], { has_embedding: false }),
      ...SEED_KNOWLEDGE_CHUNKS.slice(3).map((c) => existingRow(c)),
    ]).mockResolvedValue([]);
    expect(await reindexKnowledge()).toMatchObject({ embedded: 3, skipped: TOTAL - 3 });
  });

  it("force re-embeds unchanged chunks", async () => {
    sql.mockResolvedValueOnce(SEED_KNOWLEDGE_CHUNKS.map((c) => existingRow(c))).mockResolvedValue([]);
    expect(await reindexKnowledge({ force: true })).toEqual({ total: TOTAL, embedded: TOTAL, skipped: 0, failed: 0 });
  });

  it("counts embedding failures without writing those chunks", async () => {
    sql.mockResolvedValue([]);
    embed.mockResolvedValueOnce(null);
    expect(await reindexKnowledge()).toEqual({ total: TOTAL, embedded: TOTAL - 1, skipped: 0, failed: 1 });
    expect(upserts()).toHaveLength(TOTAL - 1);
  });

  it("never logs chunk content", async () => {
    sql.mockResolvedValue([]);
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await reindexKnowledge();
    expect(log).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });
});
