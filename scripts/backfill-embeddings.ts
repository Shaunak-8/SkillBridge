// Backfill WS5 embeddings. Run: npm run db:embed:ws5 [-- --force]
// Embeds published projects and students who opted in (public or matching). Private students are never read.
// Contact fields are never selected. Rows whose embedding is newer than the row are skipped unless --force.
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";
import { EMBEDDING_MODEL, generateDocumentEmbedding } from "../src/lib/ai/embeddings";
import { projectDoc, studentDoc } from "../src/lib/matching/rank";
import type { MatchProject, MatchStudent } from "../src/lib/matching/types";

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const force = process.argv.includes("--force");
const DELAY_MS = 150; // gentle on the embedding API rate limit

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing");
  const sql = neon(process.env.DATABASE_URL);

  const projects = (await sql`SELECT id, title, summary, problem_statement, category, required_skills FROM skillbridge.projects
    WHERE status = 'published' AND (${force} OR embedding IS NULL OR embedded_at IS NULL OR embedded_at < updated_at)`) as Row[];
  const students = (await sql`SELECT sp.id, sp.bio, sp.skills, sp.interests, sp.preferred_categories FROM skillbridge.student_profiles sp
    WHERE sp.visibility IN ('public', 'matching') AND (${force} OR sp.embedding IS NULL OR sp.embedded_at IS NULL OR sp.embedded_at < sp.updated_at
      OR EXISTS (SELECT 1 FROM skillbridge.student_portfolio_items i WHERE i.student_id = sp.id AND i.updated_at > sp.embedded_at))`) as Row[];
  const items = (students.length ? await sql`SELECT student_id, title, description, skills_used FROM skillbridge.student_portfolio_items
    WHERE student_id = ANY(${students.map((s) => s.id)}::uuid[]) ORDER BY created_at` : []) as Row[];

  const counts = { projects: 0, students: 0, failed: 0 };
  const store = async (table: "projects" | "student_profiles", id: string, text: string) => {
    const vec = await generateDocumentEmbedding(text);
    if (!vec) { counts.failed++; return false; }
    const literal = JSON.stringify(vec);
    if (table === "projects") {
      await sql`UPDATE skillbridge.projects SET embedding = ${literal}::vector, embedding_model = ${EMBEDDING_MODEL}, embedded_at = now() WHERE id = ${id}`;
    } else {
      await sql`UPDATE skillbridge.student_profiles SET embedding = ${literal}::vector, embedding_model = ${EMBEDDING_MODEL}, embedded_at = now() WHERE id = ${id}`;
    }
    await new Promise((r) => setTimeout(r, DELAY_MS));
    return true;
  };

  for (const r of projects) {
    const p: Pick<MatchProject, "id" | "title" | "summary" | "problemStatement" | "category" | "requiredSkills"> = {
      id: r.id, title: r.title, summary: r.summary, problemStatement: r.problem_statement, category: r.category, requiredSkills: r.required_skills ?? [],
    };
    if (await store("projects", r.id, projectDoc(p as MatchProject).text)) counts.projects++;
  }
  for (const r of students) {
    const s = {
      id: r.id, bio: r.bio, skills: r.skills ?? [], interests: r.interests ?? [], preferredCategories: r.preferred_categories ?? [],
      portfolio: items.filter((i) => i.student_id === r.id).map((i) => ({ title: i.title, description: i.description, skillsUsed: i.skills_used ?? [] })),
    };
    if (await store("student_profiles", r.id, studentDoc(s as MatchStudent).text)) counts.students++;
  }
  console.log(`Embedded ${counts.projects}/${projects.length} projects and ${counts.students}/${students.length} students (${counts.failed} failed, model ${EMBEDDING_MODEL}).`);
  if (counts.failed) process.exitCode = 1;
}

main().catch((e) => { console.error("Backfill failed:", e?.code || e?.name, e?.message); process.exitCode = 1; });
