import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

async function checkNeonData() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌ ERROR: DATABASE_URL environment variable is missing.");
    process.exit(1);
  }

  console.log("Connecting to Neon PostgreSQL...");
  const sql = neon(dbUrl);

  try {
    const rows = await sql`
      SELECT id, source_id, category, source_type, content 
      FROM knowledge_chunks 
      ORDER BY id ASC;
    `;

    console.log(`\n✅ Successfully retrieved ${rows.length} rows from Neon PostgreSQL:\n`);
    console.table(
      rows.map((r: any) => ({
        ID: r.id,
        "Source ID": r.source_id,
        Category: r.category,
        Type: r.source_type,
        "Content Snippet": r.content.substring(0, 50) + "...",
      }))
    );
  } catch (error) {
    console.error("❌ Failed to query Neon PostgreSQL:", error);
    process.exit(1);
  }
}

checkNeonData();
