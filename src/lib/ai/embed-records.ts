import 'server-only';
import { after } from 'next/server';
import { database } from '@/lib/db';
import { EMBEDDING_MODEL, generateDocumentEmbedding } from '@/lib/ai/embeddings';
import { projectDoc, studentDoc } from '@/lib/matching/rank';
import type { MatchProject, MatchStudent } from '@/lib/matching/types';

/**
 * Keeps WS5 vectors fresh. Callers never see a throw: a missing or failed embedding leaves the row as is, so matching
 * falls back to lexical until the next successful run (`npm run db:embed:ws5` also fills gaps).
 *
 * Race guard: every write is conditional on the row's `updated_at` being unchanged since it was read. A newer edit
 * schedules its own embedding, so a stale vector is never marked fresh.
 */
export type EmbedResult = 'embedded' | 'cleared' | 'skipped' | 'failed';

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function failed(kind: string, id: string, why: string): EmbedResult {
  console.warn(`[embed] ${kind} ${id}: ${why}; matching falls back to lexical.`);
  return 'failed';
}

const reason = (e: unknown) => (e && typeof e === 'object' && 'code' in e && (e as { code?: string }).code) || (e instanceof Error ? e.name : 'unknown error');

export async function embedProject(projectId: string): Promise<EmbedResult> {
  try {
    const sql = database();
    const [r] = (await sql`SELECT title, summary, problem_statement, category, required_skills, updated_at::text AS version
      FROM skillbridge.projects WHERE id = ${projectId} AND status = 'published'`) as Row[];
    if (!r) return 'skipped';
    const doc = projectDoc({
      id: projectId, title: r.title, summary: r.summary, problemStatement: r.problem_statement, category: r.category, requiredSkills: r.required_skills ?? [],
    } as MatchProject);
    const vec = await generateDocumentEmbedding(doc.text);
    if (!vec) return failed('project', projectId, 'no embedding generated');
    const written = await sql`UPDATE skillbridge.projects SET embedding = ${JSON.stringify(vec)}::vector, embedding_model = ${EMBEDDING_MODEL}, embedded_at = now()
      WHERE id = ${projectId} AND status = 'published' AND updated_at::text = ${r.version} RETURNING id`;
    return written.length ? 'embedded' : 'skipped';
  } catch (e) { return failed('project', projectId, `error ${reason(e)}`); }
}

/** Private students are never embedded (and any earlier vector is dropped). Contact fields and names never enter the text. */
export async function embedStudentByProfile(profileId: string): Promise<EmbedResult> {
  try {
    const sql = database();
    const [s] = (await sql`SELECT id, visibility, bio, skills, interests, preferred_categories, updated_at::text AS version
      FROM skillbridge.student_profiles WHERE profile_id = ${profileId}`) as Row[];
    if (!s) return 'skipped';
    if (s.visibility === 'private') {
      await sql`UPDATE skillbridge.student_profiles SET embedding = NULL, embedding_model = NULL, embedded_at = NULL
        WHERE id = ${s.id} AND visibility = 'private' AND (embedding IS NOT NULL OR embedding_model IS NOT NULL OR embedded_at IS NOT NULL)`;
      return 'cleared';
    }
    const items = (await sql`SELECT title, description, skills_used FROM skillbridge.student_portfolio_items WHERE student_id = ${s.id} ORDER BY created_at`) as Row[];
    const doc = studentDoc({
      id: s.id, bio: s.bio, skills: s.skills ?? [], interests: s.interests ?? [], preferredCategories: s.preferred_categories ?? [],
      portfolio: items.map((i) => ({ title: i.title, description: i.description, skillsUsed: i.skills_used ?? [] })),
    } as MatchStudent);
    const vec = await generateDocumentEmbedding(doc.text);
    if (!vec) return failed('student', s.id, 'no embedding generated');
    const written = await sql`UPDATE skillbridge.student_profiles SET embedding = ${JSON.stringify(vec)}::vector, embedding_model = ${EMBEDDING_MODEL}, embedded_at = now()
      WHERE id = ${s.id} AND visibility IN ('public', 'matching') AND updated_at::text = ${s.version} RETURNING id`;
    return written.length ? 'embedded' : 'skipped';
  } catch (e) { return failed('student', profileId, `error ${reason(e)}`); }
}

/** Runs `task` after the response is sent; outside a request (unit tests, scripts) it just runs in the background. */
export function scheduleEmbedding(task: () => Promise<unknown>): void {
  const run = () => task().catch((e) => { console.warn(`[embed] background task failed: ${reason(e)}`); });
  try { after(run); } catch { void run(); }
}
