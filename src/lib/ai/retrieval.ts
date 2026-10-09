import { KnowledgeChunk, RetrievalResult } from "@/types/ai";
import { generateQueryEmbedding, keywordSimilarity } from "./embeddings";
import { SEED_KNOWLEDGE_CHUNKS } from "./seed-knowledge";
import { database } from "@/lib/db";

interface ChunkRow {
  id: string;
  source_key: string;
  language: string;
  content: string;
  metadata: Record<string, unknown> | null;
  similarity: number | string;
}

function optionalDatabase() {
  try {
    return database();
  } catch {
    return null; // DATABASE_URL missing: use seed search
  }
}

export async function retrieveKnowledge(
  queryText: string,
  language: string = "en",
  topK: number = 3
): Promise<RetrievalResult> {
  if (!queryText || queryText.trim().length < 3) {
    return {
      chunks: [],
      retrievedSourceIds: [],
      queryEmbeddingGenerated: false,
      retrievedFrom: "offline_seed_fallback",
    };
  }

  try {
    const queryVector = await generateQueryEmbedding(queryText);
    const queryEmbeddingGenerated = queryVector !== null;

    let retrievedChunks: KnowledgeChunk[] = [];
    let retrievedFrom: "neon_pgvector" | "offline_seed_fallback" = "offline_seed_fallback";

    // Attempt Neon PostgreSQL pgvector query if DATABASE_URL is configured
    const sql = optionalDatabase();
    if (sql && queryVector && queryVector.length === 768) {
      try {
        const vectorString = `[${queryVector.join(",")}]`;
        const minSimilarity = 0.35;

        // Execute parameterized pgvector similarity query against Neon PostgreSQL
        const rows = (await sql`
          SELECT id, source_key, language, content, metadata,
                 1 - (embedding <=> ${vectorString}::vector) AS similarity
          FROM skillbridge.knowledge_chunks
          WHERE approved
            AND embedding IS NOT NULL
            AND (language = ${language} OR language = 'en')
            AND (1 - (embedding <=> ${vectorString}::vector)) >= ${minSimilarity}
          ORDER BY embedding <=> ${vectorString}::vector
          LIMIT ${topK}
        `) as ChunkRow[];

        if (Array.isArray(rows) && rows.length > 0) {
          retrievedChunks = rows.map((r) => {
            const meta = r.metadata ?? {};
            return {
              id: String(meta.chunkId ?? r.id),
              sourceId: r.source_key,
              sourceType: (meta.sourceType as KnowledgeChunk["sourceType"]) ?? "approved_template",
              language: r.language,
              category: typeof meta.category === "string" ? meta.category : undefined,
              content: r.content,
              metadata: meta,
              similarity: Number(r.similarity),
            };
          });
          retrievedFrom = "neon_pgvector";
        }
      } catch (dbErr) {
        console.warn("Neon pgvector database query error, falling back to seed knowledge base:", dbErr);
      }
    }

    // Fallback/Deterministic Seed Search against approved knowledge chunks
    if (retrievedChunks.length === 0) {
      const scored = SEED_KNOWLEDGE_CHUNKS.map((chunk) => {
        const sim = keywordSimilarity(queryText, chunk.keywords);
        return {
          id: chunk.id,
          content: chunk.content,
          sourceType: chunk.sourceType,
          sourceId: chunk.sourceId,
          language: chunk.language,
          category: chunk.category,
          similarity: sim,
        };
      })
        .filter((chunk) => chunk.similarity >= 0.35)
        .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
        .slice(0, topK);

      retrievedChunks = scored;
      retrievedFrom = "offline_seed_fallback";
    }

    const retrievedSourceIds = Array.from(
      new Set(retrievedChunks.map((c) => c.sourceId))
    );

    return {
      chunks: retrievedChunks,
      retrievedSourceIds,
      queryEmbeddingGenerated,
      retrievedFrom,
    };
  } catch (error) {
    console.warn("Retrieval pipeline failure gracefully handled:", error);
    return {
      chunks: [],
      retrievedSourceIds: [],
      queryEmbeddingGenerated: false,
      retrievedFrom: "offline_seed_fallback",
      error: error instanceof Error ? error.message : "Failed to execute knowledge retrieval.",
    };
  }
}
