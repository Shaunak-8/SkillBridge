import "server-only";
import { createHash } from "node:crypto";
import { database } from "@/lib/db";
import { SEED_KNOWLEDGE_CHUNKS } from "./seed-knowledge";
import { EMBEDDING_MODEL, generateDocumentEmbedding } from "./embeddings";

export interface ReindexResult {
  total: number;
  embedded: number;
  skipped: number;
  failed: number;
}

interface ExistingRow {
  source_key: string;
  chunk_index: number;
  content_hash: string | null;
  embedding_model: string | null;
  has_embedding: boolean;
}

const hashContent = (content: string) => createHash("sha256").update(content).digest("hex");

/**
 * Embeds the seed knowledge chunks and upserts them into skillbridge.knowledge_chunks.
 * Chunks whose content hash and embedding model are unchanged are skipped (no Gemini call) unless `force`.
 * Never logs chunk content or keys. A chunk whose embedding fails is counted in `failed` and left untouched.
 */
export async function reindexKnowledge({ force = false }: { force?: boolean } = {}): Promise<ReindexResult> {
  const sql = database();
  const existingRows = (await sql`
    SELECT source_key, chunk_index, metadata->>'contentHash' AS content_hash, embedding_model,
           embedding IS NOT NULL AS has_embedding
    FROM skillbridge.knowledge_chunks
    WHERE source_key = ANY(${SEED_KNOWLEDGE_CHUNKS.map((c) => c.sourceId)})`) as ExistingRow[];
  const existing = new Map(existingRows.map((r) => [`${r.source_key}:${r.chunk_index}`, r]));

  const result: ReindexResult = { total: SEED_KNOWLEDGE_CHUNKS.length, embedded: 0, skipped: 0, failed: 0 };
  for (const chunk of SEED_KNOWLEDGE_CHUNKS) {
    const contentHash = hashContent(chunk.content);
    const current = existing.get(`${chunk.sourceId}:0`);
    if (!force && current?.has_embedding && current.content_hash === contentHash && current.embedding_model === EMBEDDING_MODEL) {
      result.skipped++;
      continue;
    }
    const embedding = await generateDocumentEmbedding(chunk.content);
    if (!embedding) {
      result.failed++;
      continue;
    }
    const metadata = JSON.stringify({
      chunkId: chunk.id,
      sourceType: chunk.sourceType,
      category: chunk.category ?? "General",
      keywords: chunk.keywords,
      contentHash,
    });
    await sql`INSERT INTO skillbridge.knowledge_chunks (source_key, chunk_index, content, language, metadata, approved, embedding, embedding_model)
      VALUES (${chunk.sourceId}, 0, ${chunk.content}, ${chunk.language}, ${metadata}::jsonb, true, ${`[${embedding.join(",")}]`}::vector, ${EMBEDDING_MODEL})
      ON CONFLICT (source_key, chunk_index) DO UPDATE SET content = EXCLUDED.content, language = EXCLUDED.language,
        metadata = EXCLUDED.metadata, approved = true, embedding = EXCLUDED.embedding, embedding_model = EXCLUDED.embedding_model`;
    result.embedded++;
  }
  return result;
}
