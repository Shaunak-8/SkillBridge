import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

async function runMigration() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("ERROR: DATABASE_URL environment variable is not defined.");
    process.exit(1);
  }

  console.log("Connecting to Neon PostgreSQL...");
  const sql = neon(dbUrl);

  try {
    console.log("1. Enabling pgvector extension...");
    await sql`CREATE EXTENSION IF NOT EXISTS vector;`;

    console.log("2. Creating knowledge_chunks table with VECTOR(768)...");
    await sql`
      CREATE TABLE IF NOT EXISTS knowledge_chunks (
        id VARCHAR(64) PRIMARY KEY,
        source_id VARCHAR(64) NOT NULL,
        source_type VARCHAR(32) NOT NULL,
        language VARCHAR(10) NOT NULL DEFAULT 'en',
        category VARCHAR(64),
        content TEXT NOT NULL,
        metadata JSONB DEFAULT '{}'::jsonb,
        embedding VECTOR(768),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    console.log("3. Creating HNSW index for vector cosine similarity...");
    await sql`
      CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_hnsw_idx 
      ON knowledge_chunks USING hnsw (embedding vector_cosine_ops);
    `;

    console.log("✅ Neon pgvector migration executed successfully!");
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  }
}

runMigration();
