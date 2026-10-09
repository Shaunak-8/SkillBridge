import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { database } from "../src/lib/db";

async function main() {
  const rows = await database()`SELECT source_key, chunk_index, language, approved, embedding_model,
      metadata->>'category' AS category, vector_dims(embedding) AS dims, left(content, 50) AS snippet
    FROM skillbridge.knowledge_chunks ORDER BY source_key, chunk_index`;
  console.log(`Retrieved ${rows.length} rows from skillbridge.knowledge_chunks:`);
  console.table(rows);
}

main().catch((err) => {
  console.error("Check failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
