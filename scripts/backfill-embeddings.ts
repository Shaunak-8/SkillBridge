// Backfill WS5 embeddings. Run: npm run db:embed:ws5 [-- --force]
// Embeds published projects and students who opted in (public or matching). Private students are never read.
// Contact fields are never selected. Rows whose embedding is newer than the row are skipped unless --force.
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";
import { EMBEDDING_MODEL } from "../src/lib/ai/embeddings";
import { embedProject, embedStudentByProfile, type EmbedResult } from "../src/lib/ai/embed-records";

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const force = process.argv.includes("--force");
const DELAY_MS = 150; // gentle on the embedding API rate limit

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing");
  const sql = neon(process.env.DATABASE_URL);

  const projects = (await sql`SELECT id FROM skillbridge.projects
    WHERE status = 'published' AND (${force} OR embedding IS NULL OR embedded_at IS NULL OR embedded_at < updated_at)`) as Row[];
  const students = (await sql`SELECT sp.profile_id AS id FROM skillbridge.student_profiles sp
    WHERE sp.visibility IN ('public', 'matching') AND (${force} OR sp.embedding IS NULL OR sp.embedded_at IS NULL OR sp.embedded_at < sp.updated_at
      OR EXISTS (SELECT 1 FROM skillbridge.student_portfolio_items i WHERE i.student_id = sp.id AND i.updated_at > sp.embedded_at))`) as Row[];

  const counts = { projects: 0, students: 0, failed: 0 };
  const run = async (embed: (id: string) => Promise<EmbedResult>, id: string, key: "projects" | "students") => {
    const result = await embed(id);
    if (result === "embedded") counts[key]++;
    else if (result === "failed") counts.failed++;
    await new Promise((r) => setTimeout(r, DELAY_MS));
  };

  for (const r of projects) await run(embedProject, r.id, "projects");
  for (const r of students) await run(embedStudentByProfile, r.id, "students");
  console.log(`Embedded ${counts.projects}/${projects.length} projects and ${counts.students}/${students.length} students (${counts.failed} failed, model ${EMBEDDING_MODEL}).`);
  if (counts.failed) process.exitCode = 1;
}

main().catch((e) => { console.error("Backfill failed:", e?.code || e?.name, e?.message); process.exitCode = 1; });
