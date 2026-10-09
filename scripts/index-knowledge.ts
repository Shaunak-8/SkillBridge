import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { database } from "../src/lib/db";
import { SEED_KNOWLEDGE_CHUNKS } from "../src/lib/ai/seed-knowledge";
import { EMBEDDING_MODEL, generateDocumentEmbedding } from "../src/lib/ai/embeddings";

// Run with `npm run db:index` (tsx --conditions react-server, so 'server-only' resolves).
async function main() {
  const sql = database();
  let count = 0;
  for (const chunk of SEED_KNOWLEDGE_CHUNKS) {
    const embedding = await generateDocumentEmbedding(chunk.content);
    if (!embedding) throw new Error(`No valid 768-dim embedding for ${chunk.id}; check GEMINI_API_KEY.`);
    const metadata = JSON.stringify({
      chunkId: chunk.id,
      sourceType: chunk.sourceType,
      category: chunk.category ?? "General",
      keywords: chunk.keywords,
    });
    await sql`INSERT INTO skillbridge.knowledge_chunks (source_key, chunk_index, content, language, metadata, approved, embedding, embedding_model)
      VALUES (${chunk.sourceId}, 0, ${chunk.content}, ${chunk.language}, ${metadata}::jsonb, true, ${`[${embedding.join(",")}]`}::vector, ${EMBEDDING_MODEL})
      ON CONFLICT (source_key, chunk_index) DO UPDATE SET content = EXCLUDED.content, language = EXCLUDED.language,
        metadata = EXCLUDED.metadata, approved = true, embedding = EXCLUDED.embedding, embedding_model = EXCLUDED.embedding_model`;
    count++;
  }
  console.log(`Indexed ${count} knowledge chunks into skillbridge.knowledge_chunks.`);
}

main().catch((err) => {
  console.error("Indexing failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
