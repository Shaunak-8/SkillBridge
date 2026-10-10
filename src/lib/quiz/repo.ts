import 'server-only';
import { database } from '@/lib/db';
import { QUIZ_MIN_APPLICANTS, QUIZ_OPEN_WINDOW_HOURS, QUIZ_QUESTION_COUNT } from './constants';
import { pickQuizSource, type QuizSource } from './generate';
import type { QuizQuestionInput } from './schema';

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export interface QuizQuestionDto {
  id: string; position: number; kind: 'mcq' | 'short'; prompt: string;
  options: string[] | null; correctIndex: number | null; rubric: string | null;
}
export interface QuizDto {
  id: string; status: 'draft' | 'open' | 'closed'; timeLimitSeconds: number; openedAt: string | null; closesAt: string | null;
  questions: QuizQuestionDto[];
}
export interface QuizContext {
  project: { id: string; ownerProfileId: string; status: string; source: QuizSource };
  applicantCount: number;
  quiz: QuizDto | null;
}

/** Eligible when MORE than 3 non-withdrawn applicants, or a quiz already exists in open/closed state (latch). */
export const isEligible = (applicantCount: number, quiz: Pick<QuizDto, 'status'> | null) =>
  applicantCount > QUIZ_MIN_APPLICANTS || quiz?.status === 'open' || quiz?.status === 'closed';

function toQuiz(r: Row): QuizDto {
  return {
    id: r.id, status: r.status, timeLimitSeconds: r.time_limit_seconds, openedAt: r.opened_at ?? null, closesAt: r.closes_at ?? null,
    questions: r.questions ?? [],
  };
}

/** Project, applicant count and quiz (with questions) in one parallel round trip. Null when the project does not exist. */
export async function loadQuizContext(projectId: string): Promise<QuizContext | null> {
  const sql = database();
  const [projects, counts, quizzes] = await Promise.all([
    sql`SELECT id, owner_profile_id, status, title, summary, problem_statement, category, required_skills, deliverables
      FROM skillbridge.projects WHERE id = ${projectId}`,
    sql`SELECT count(*)::int AS n FROM skillbridge.applications WHERE project_id = ${projectId} AND status <> 'withdrawn'`,
    sql`SELECT q.id, q.status, q.time_limit_seconds, q.opened_at, q.closes_at,
        COALESCE((SELECT json_agg(json_build_object('id', k.id, 'position', k.position, 'kind', k.kind, 'prompt', k.prompt,
          'options', k.options, 'correctIndex', k.correct_index, 'rubric', k.rubric) ORDER BY k.position)
          FROM skillbridge.quiz_questions k WHERE k.quiz_id = q.id), '[]'::json) AS questions
      FROM skillbridge.project_quizzes q WHERE q.project_id = ${projectId}`,
  ]);
  const p: Row | undefined = projects[0];
  if (!p) return null;
  return {
    project: { id: p.id, ownerProfileId: p.owner_profile_id, status: p.status, source: pickQuizSource(p) },
    applicantCount: Number(counts[0]?.n ?? 0),
    quiz: quizzes[0] ? toQuiz(quizzes[0]) : null,
  };
}

const withPositions = (questions: QuizQuestionInput[]) =>
  JSON.stringify(questions.map((q, i) => ({
    position: i + 1, kind: q.kind, prompt: q.prompt,
    options: q.kind === 'mcq' ? q.options : null, correct_index: q.kind === 'mcq' ? q.correctIndex : null,
    rubric: q.kind === 'short' ? q.rubric : null,
  })));

/**
 * Creates the draft quiz or replaces the questions of an existing DRAFT, atomically. Open and closed quizzes are never touched.
 * Returns false when the quiz is no longer a draft.
 */
export async function saveDraftQuiz(
  projectId: string, profileId: string, hash: string, model: string, questions: QuizQuestionInput[],
): Promise<boolean> {
  const sql = database();
  const payload = withPositions(questions);
  const results = await sql.transaction([
    sql`INSERT INTO skillbridge.project_quizzes (project_id, created_by, source_hash, generated_by_model)
      VALUES (${projectId}, ${profileId}, ${hash}, ${model})
      ON CONFLICT (project_id) DO UPDATE SET source_hash = EXCLUDED.source_hash, generated_by_model = EXCLUDED.generated_by_model, updated_at = now()
      WHERE skillbridge.project_quizzes.status = 'draft' RETURNING id`,
    sql`DELETE FROM skillbridge.quiz_questions WHERE quiz_id IN
      (SELECT id FROM skillbridge.project_quizzes WHERE project_id = ${projectId} AND status = 'draft')`,
    sql`INSERT INTO skillbridge.quiz_questions (quiz_id, position, kind, prompt, options, correct_index, rubric)
      SELECT q.id, x.position, x.kind, x.prompt, x.options, x.correct_index, x.rubric
      FROM skillbridge.project_quizzes q,
        jsonb_to_recordset(${payload}::jsonb) AS x(position int, kind text, prompt text, options jsonb, correct_index int, rubric text)
      WHERE q.project_id = ${projectId} AND q.status = 'draft' RETURNING id`,
  ]);
  return (results[2] as Row[]).length === QUIZ_QUESTION_COUNT;
}

/** Draft-only edit of the time limit and/or the five questions. Returns false when there is no draft to edit. */
export async function updateDraftQuiz(
  projectId: string, edit: { timeLimitSeconds?: number; questions?: QuizQuestionInput[] },
): Promise<boolean> {
  const sql = database();
  const limit = edit.timeLimitSeconds ?? null;
  const touch = sql`UPDATE skillbridge.project_quizzes SET time_limit_seconds = COALESCE(${limit}::int, time_limit_seconds), updated_at = now()
    WHERE project_id = ${projectId} AND status = 'draft' RETURNING id`;
  if (!edit.questions) return ((await touch) as Row[]).length === 1;
  const payload = withPositions(edit.questions);
  const results = await sql.transaction([
    touch,
    sql`DELETE FROM skillbridge.quiz_questions WHERE quiz_id IN
      (SELECT id FROM skillbridge.project_quizzes WHERE project_id = ${projectId} AND status = 'draft')`,
    sql`INSERT INTO skillbridge.quiz_questions (quiz_id, position, kind, prompt, options, correct_index, rubric)
      SELECT q.id, x.position, x.kind, x.prompt, x.options, x.correct_index, x.rubric
      FROM skillbridge.project_quizzes q,
        jsonb_to_recordset(${payload}::jsonb) AS x(position int, kind text, prompt text, options jsonb, correct_index int, rubric text)
      WHERE q.project_id = ${projectId} AND q.status = 'draft' RETURNING id`,
  ]);
  return (results[2] as Row[]).length === QUIZ_QUESTION_COUNT;
}

/** draft -> open, only with exactly five questions. Compare-and-set so concurrent opens cannot both win. */
export async function openQuiz(projectId: string): Promise<boolean> {
  const rows = await database()`UPDATE skillbridge.project_quizzes q SET status = 'open', opened_at = now(),
      closes_at = now() + make_interval(hours => ${QUIZ_OPEN_WINDOW_HOURS}), updated_at = now()
    WHERE q.project_id = ${projectId} AND q.status = 'draft'
      AND (SELECT count(*) FROM skillbridge.quiz_questions k WHERE k.quiz_id = q.id) = ${QUIZ_QUESTION_COUNT}
    RETURNING q.id`;
  return rows.length === 1;
}

/** open -> closed. New attempts are blocked at once. */
export async function closeQuiz(projectId: string): Promise<boolean> {
  const rows = await database()`UPDATE skillbridge.project_quizzes SET status = 'closed', closes_at = now(), updated_at = now()
    WHERE project_id = ${projectId} AND status = 'open' RETURNING id`;
  return rows.length === 1;
}

export type AttemptStatus = 'not_taken' | 'in_progress' | 'submitted' | 'expired';

/**
 * One row per non-withdrawn applicant. Integrity events are aggregated per applicant inside the same query (no N+1).
 * Selects display names only: no email or other contact fields. totalAwayMs counts only tab_hidden and app_background durations.
 */
export async function listQuizResults(projectId: string) {
  const rows = await database()`SELECT a.id AS application_id, sp.id AS student_id, pr.full_name,
      t.status AS attempt_status, t.mcq_score, t.mcq_max, t.short_score, t.short_max, t.proctoring_mode,
      CASE WHEN t.submitted_at IS NULL THEN NULL
        ELSE EXTRACT(EPOCH FROM (LEAST(t.submitted_at, t.deadline_at) - t.started_at))::int END AS time_taken_seconds,
      ans.answer_text AS short_answer, ans.ai_feedback AS short_feedback,
      COALESCE(ev.counts, '{}'::json) AS counts, COALESCE(ev.away_ms, 0)::int AS total_away_ms
    FROM skillbridge.applications a
    JOIN skillbridge.student_profiles sp ON sp.id = a.student_id
    JOIN skillbridge.profiles pr ON pr.id = sp.profile_id
    LEFT JOIN skillbridge.project_quizzes q ON q.project_id = a.project_id
    LEFT JOIN skillbridge.quiz_attempts t ON t.application_id = a.id AND t.quiz_id = q.id
    LEFT JOIN LATERAL (SELECT qa.answer_text, qa.ai_feedback FROM skillbridge.quiz_answers qa
      JOIN skillbridge.quiz_questions qq ON qq.id = qa.question_id
      WHERE qa.attempt_id = t.id AND qq.kind = 'short') ans ON true
    LEFT JOIN LATERAL (SELECT json_object_agg(g.kind, g.n) AS counts,
        sum(g.dur) FILTER (WHERE g.kind IN ('tab_hidden', 'app_background')) AS away_ms
      FROM (SELECT e.kind, count(*) AS n, COALESCE(sum(e.duration_ms), 0) AS dur
        FROM skillbridge.quiz_integrity_events e WHERE e.attempt_id = t.id GROUP BY e.kind) g) ev ON true
    WHERE a.project_id = ${projectId} AND a.status <> 'withdrawn'
    ORDER BY t.submitted_at DESC NULLS LAST, a.created_at, a.id`;
  return rows.map((r: Row) => ({
    applicationId: r.application_id, studentId: r.student_id, displayName: r.full_name ?? 'Student',
    status: (r.attempt_status ?? 'not_taken') as AttemptStatus,
    mcqScore: r.mcq_score ?? null, mcqMax: r.mcq_max ?? null, shortScore: r.short_score ?? null, shortMax: r.short_max ?? null,
    shortAnswer: r.short_answer ?? null, shortFeedback: r.short_feedback ?? null,
    timeTakenSeconds: r.time_taken_seconds ?? null, proctoringMode: r.proctoring_mode ?? null,
    integrity: { counts: (r.counts ?? {}) as Record<string, number>, totalAwayMs: Number(r.total_away_ms ?? 0) },
  }));
}
