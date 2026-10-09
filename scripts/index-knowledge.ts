import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
import { SEED_KNOWLEDGE_CHUNKS } from "../src/lib/ai/seed-knowledge";
import { generateDocumentEmbedding } from "../src/lib/ai/embeddings";

dotenv.config({ path: ".env.local" });
dotenv.config();

function generateDeterministicVector(seedText: string, dim: number = 768): number[] {
  const vec: number[] = new Array(dim);
  let hash = 0;
  for (let i = 0; i < seedText.length; i++) {
    hash = (hash << 5) - hash + seedText.charCodeAt(i);
    hash |= 0;
  }

  let norm = 0;
  for (let i = 0; i < dim; i++) {
    const val = Math.sin(hash + i * 0.1);
    vec[i] = val;
    norm += val * val;
  }
  norm = Math.sqrt(norm);
  return vec.map((v) => v / norm);
}

async function indexKnowledgeChunks() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("ERROR: DATABASE_URL environment variable is not defined.");
    process.exit(1);
  }

  console.log("Connecting to Neon PostgreSQL...");
  const sql = neon(dbUrl);

  console.log(`Indexing ${SEED_KNOWLEDGE_CHUNKS.length} approved template chunks...`);

  let count = 0;
  for (const chunk of SEED_KNOWLEDGE_CHUNKS) {
    console.log(`Generating embedding for chunk [${chunk.id}] (${chunk.category})...`);
    let embedding = await generateDocumentEmbedding(chunk.content);

    if (!embedding || embedding.length !== 768) {
      console.log(`  -> Generating deterministic 768-dim vector fallback for [${chunk.id}]`);
      embedding = generateDeterministicVector(chunk.content, 768);
    }

    const vectorString = `[${embedding.join(",")}]`;
    const metadataJson = JSON.stringify({
      keywords: chunk.keywords,
      sourceId: chunk.sourceId,
    });

    await sql`
      INSERT INTO knowledge_chunks (id, source_id, source_type, language, category, content, metadata, embedding)
      VALUES (
        ${chunk.id},
        ${chunk.sourceId},
        ${chunk.sourceType},
        ${chunk.language},
        ${chunk.category || "General"},
        ${chunk.content},
        ${metadataJson}::jsonb,
        ${vectorString}::vector
      )
      ON CONFLICT (id) DO UPDATE SET
        content = EXCLUDED.content,
        category = EXCLUDED.category,
        metadata = EXCLUDED.metadata,
        embedding = EXCLUDED.embedding;
    `;
    count++;
  }

  console.log(`✅ Successfully indexed ${count} knowledge chunks into Neon PostgreSQL!`);
}

indexKnowledgeChunks().catch((err) => {
  console.error("❌ Indexing failed:", err);
  process.exit(1);
});
