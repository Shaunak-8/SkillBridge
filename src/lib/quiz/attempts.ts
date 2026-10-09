import 'server-only';
import { z } from 'zod';
import { database } from '@/lib/db';
import {
  INTEGRITY_EVENT_KINDS, MAX_ANSWER_CHARS, MAX_EVENTS_PER_ATTEMPT, MAX_EVENTS_PER_BATCH, MAX_TIME_LIMIT_SECONDS,
  QUIZ_QUESTION_COUNT, SHORT_MAX_POINTS,
} from './constants';
import { gradeShortAnswer } from './grade';

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** A submit that arrives this long after the deadline still counts (the client auto-submits at zero). Answers get no grace. */
export const SUBMIT_GRACE_MS = 5_000;
const MAX_EVENT_MS = 2 * MAX_TIME_LIMIT_SECONDS * 1000;

// ---- request bodies (strict: unknown keys are rejected) ----
export const startBodySchema = z.object({
  consent: z.literal(true),
  proctoringMode: z.enum(['full', 'limited', 'none']),
}).strict();

export const answerBodySchema = z.object({
  questionId: z.string().uuid(),
  answerIndex: z.number().int().min(0).max(3).optional(),
  answerText: z.string().max(MAX_ANSWER_CHARS).transform((t) => t.replace(/\u0000/g, '').trim()).optional(),
}).strict();

export const eventsBodySchema = z.object({
  events: z.array(z.object({
    kind: z.enum(INTEGRITY_EVENT_KINDS),
    atMs: z.number().int().min(0).max(MAX_EVENT_MS),
    durationMs: z.number().int().min(0).max(MAX_EVENT_MS).optional(),
  }).strict()).min(1).max(MAX_EVENTS_PER_BATCH),
}).strict();

export type AnswerBody = z.infer<typeof answerBodySchema>;
export type EventsBody = z.infer<typeof eventsBodySchema>;
export type ProctoringMode = z.infer<typeof startBodySchema>['proctoringMode'];

// ---- results ----
export type Denied = { ok: false; status: 400 | 403 | 404 | 409; error: string };
export type Result<T> = { ok: true; data: T } | Denied;
const ok = <T>(data: T): Result<T> => ({ ok: true, data });
const deny = (status: Denied['status'], error: string): Denied => ({ ok: false, status, error });
const NOT_FOUND = deny(404, 'Not found.');

const iso = (v: unknown) => new Date(v as string | Date).toISOString();
const ms = (v: unknown) => new Date(v as string | Date).getTime();

// ---- student's quiz list ----
export interface MyQuizDto {
  applicationId: string; projectId: string; projectTitle: string; quizId: string; closesAt: string; timeLimitSeconds: number;
  attemptId: string | null; attemptStatus: 'in_progress' | 'submitted' | 'expired' | null;
}

/** Open, unexpired quizzes on the caller's own applications that are not withdrawn or declined. Nothing about answers. */
export async function listMyQuizzes(profileId: string): Promise<MyQuizDto[]> {
  const rows = await database()`SELECT a.id AS application_id, p.id AS project_id, p.title, q.id AS quiz_id, q.closes_at,
      q.time_limit_seconds, t.id AS attempt_id, t.status AS attempt_status
    FROM skillbridge.student_profiles sp
    JOIN skillbridge.applications a ON a.student_id = sp.id AND a.status NOT IN ('withdrawn', 'declined')
    JOIN skillbridge.project_quizzes q ON q.project_id = a.project_id AND q.status = 'open' AND q.closes_at > now()
    JOIN skillbridge.projects p ON p.id = a.project_id
    LEFT JOIN skillbridge.quiz_attempts t ON t.application_id = a.id
    WHERE sp.profile_id = ${profileId}
    ORDER BY q.closes_at, a.id LIMIT 100`;
  return rows.map((r: Row) => ({
    applicationId: r.application_id, projectId: r.project_id, projectTitle: r.title, quizId: r.quiz_id,
    closesAt: iso(r.closes_at), timeLimitSeconds: r.time_limit_seconds,
    attemptId: r.attempt_id ?? null, attemptStatus: r.attempt_status ?? null,
  }));
}

// ---- attempt loading ----
interface Attempt { id: string; quizId: string; status: string; deadlineAt: string; serverNow: string; pastDeadline: boolean; lateBeyondGrace: boolean }

/** The attempt, only when it belongs to the session profile's student row. Other callers get null (the route answers 404). */
async function loadOwned(profileId: string, attemptId: string): Promise<Attempt | null> {
  const rows = await database()`SELECT t.id, t.quiz_id, t.status, t.deadline_at, now() AS server_now
    FROM skillbridge.quiz_attempts t JOIN skillbridge.student_profiles sp ON sp.id = t.student_id
    WHERE t.id = ${attemptId} AND sp.profile_id = ${profileId}`;
  const r: Row | undefined = rows[0];
  if (!r) return null;
  const now = ms(r.server_now), deadline = ms(r.deadline_at);
  return {
    id: r.id, quizId: r.quiz_id, status: r.status, deadlineAt: iso(r.deadline_at), serverNow: iso(r.server_now),
    pastDeadline: now >= deadline, lateBeyondGrace: now > deadline + SUBMIT_GRACE_MS,
  };
}

type Gate = { kind: 'missing' } | { kind: 'finished' } | { kind: 'live'; attempt: Attempt };

/** Loads the attempt and finalizes it as 'expired' when its deadline has passed. */
async function gate(profileId: string, attemptId: string): Promise<Gate> {
  const attempt = await loadOwned(profileId, attemptId);
  if (!attempt) return { kind: 'missing' };
  if (attempt.status !== 'in_progress') return { kind: 'finished' };
  if (attempt.pastDeadline) { await finalize(attempt, 'expired'); return { kind: 'finished' }; }
  return { kind: 'live', attempt };
}

// ---- finalization ----
/**
 * Sets the final state exactly once (compare-and-set on in_progress). mcq is scored in SQL from the stored correct_index.
 * The short answer is graded by AI after the fact: any failure leaves short_score NULL ("not graded") and never fails the caller.
 * An unanswered short question scores 0 (nothing to grade).
 */
async function finalize(attempt: Pick<Attempt, 'id' | 'quizId'>, status: 'submitted' | 'expired'): Promise<void> {
  const sql = database();
  const shorts = await sql`SELECT k.id AS question_id, k.prompt, k.rubric, a.answer_text
    FROM skillbridge.quiz_questions k
    LEFT JOIN skillbridge.quiz_answers a ON a.question_id = k.id AND a.attempt_id = ${attempt.id}
    WHERE k.quiz_id = ${attempt.quizId} AND k.kind = 'short'`;
  const s: Row | undefined = shorts[0];
  const text = String(s?.answer_text ?? '').trim();
  const graded = s && text ? await gradeShortAnswer({ prompt: s.prompt, rubric: s.rubric }, text) : null;
  const score = !s ? null : text ? graded?.score ?? null : 0;
  await sql`WITH done AS (
      UPDATE skillbridge.quiz_attempts t SET status = ${status}, submitted_at = LEAST(now(), t.deadline_at), updated_at = now(),
        mcq_score = (SELECT count(*)::int FROM skillbridge.quiz_answers a JOIN skillbridge.quiz_questions k ON k.id = a.question_id
          WHERE a.attempt_id = t.id AND k.kind = 'mcq' AND a.answer_index = k.correct_index),
        mcq_max = (SELECT count(*)::int FROM skillbridge.quiz_questions k WHERE k.quiz_id = t.quiz_id AND k.kind = 'mcq'),
        short_score = ${score}::int,
        short_max = (SELECT count(*)::int * ${SHORT_MAX_POINTS} FROM skillbridge.quiz_questions k WHERE k.quiz_id = t.quiz_id AND k.kind = 'short')
      WHERE t.id = ${attempt.id} AND t.status = 'in_progress' RETURNING t.id)
    UPDATE skillbridge.quiz_answers a SET ai_score = ${graded?.score ?? null}::int, ai_feedback = ${graded?.feedback ?? null}::text
    WHERE a.attempt_id IN (SELECT id FROM done) AND a.question_id = ${s?.question_id ?? null}::uuid`;
}

// ---- start ----
export interface StartDto { attemptId: string; deadlineAt: string; serverNow: string }

/**
 * Starts the attempt for the caller's own application, or RESUMES the in-progress one (UNIQUE application_id: never two attempts).
 * New attempts need an open quiz before closes_at and an application that is not withdrawn or declined.
 * A student with an in-progress attempt may resume even if the business has since closed the quiz (the deadline still applies).
 */
export async function startAttempt(profileId: string, quizId: string, body: { proctoringMode: ProctoringMode }): Promise<Result<StartDto & { created: boolean }>> {
  const sql = database();
  const rows = await sql`SELECT q.status, (q.closes_at IS NULL OR q.closes_at <= now()) AS timed_out,
      sp.id AS student_id, a.id AS application_id, a.status AS application_status,
      t.id AS attempt_id, t.status AS attempt_status, t.deadline_at, now() AS server_now
    FROM skillbridge.project_quizzes q
    LEFT JOIN skillbridge.student_profiles sp ON sp.profile_id = ${profileId}
    LEFT JOIN skillbridge.applications a ON a.project_id = q.project_id AND a.student_id = sp.id
    LEFT JOIN skillbridge.quiz_attempts t ON t.application_id = a.id
    WHERE q.id = ${quizId}`;
  const r: Row | undefined = rows[0];
  if (!r || r.status === 'draft') return NOT_FOUND;
  if (!r.application_id) return deny(403, 'You can only take quizzes for projects you applied to.');
  if (r.application_status === 'withdrawn' || r.application_status === 'declined') return deny(403, 'Your application is no longer active.');

  if (r.attempt_id) {
    const live = r.attempt_status === 'in_progress';
    if (live && ms(r.server_now) >= ms(r.deadline_at)) { await finalize({ id: r.attempt_id, quizId }, 'expired'); }
    else if (live) return ok({ attemptId: r.attempt_id, deadlineAt: iso(r.deadline_at), serverNow: iso(r.server_now), created: false });
    return deny(409, 'You have already taken this quiz.');
  }
  if (r.status !== 'open' || r.timed_out) return deny(409, 'This quiz is closed.');

  const created = await sql`INSERT INTO skillbridge.quiz_attempts (quiz_id, application_id, student_id, consent_at, started_at, deadline_at, proctoring_mode)
    SELECT q.id, ${r.application_id}::uuid, ${r.student_id}::uuid, now(), now(), now() + make_interval(secs => q.time_limit_seconds), ${body.proctoringMode}
    FROM skillbridge.project_quizzes q WHERE q.id = ${quizId} AND q.status = 'open' AND q.closes_at > now()
    ON CONFLICT (application_id) DO NOTHING
    RETURNING id, deadline_at, now() AS server_now`;
  const c: Row | undefined = created[0];
  if (c) return ok({ attemptId: c.id, deadlineAt: iso(c.deadline_at), serverNow: iso(c.server_now), created: true });

  // Lost a race with a concurrent start (resume it) or the quiz closed in between.
  const again = await sql`SELECT t.id, t.status, t.deadline_at, now() AS server_now FROM skillbridge.quiz_attempts t WHERE t.application_id = ${r.application_id}`;
  const e: Row | undefined = again[0];
  if (e && e.status === 'in_progress' && ms(e.server_now) < ms(e.deadline_at)) {
    return ok({ attemptId: e.id, deadlineAt: iso(e.deadline_at), serverNow: iso(e.server_now), created: false });
  }
  return deny(409, e ? 'You have already taken this quiz.' : 'This quiz is closed.');
}

// ---- current question ----
export type CurrentDto =
  | { done: true }
  | { done: false; questionId: string; position: number; total: number; kind: 'mcq' | 'short'; prompt: string; options: string[] | null; deadlineAt: string; serverNow: string };

/** First unanswered question. Selects only id/position/kind/prompt/options: correct_index and rubric are never read here. */
async function currentQuestion(attempt: Attempt): Promise<Row | null> {
  const rows = await database()`SELECT k.id, k.position, k.kind, k.prompt, k.options FROM skillbridge.quiz_questions k
    WHERE k.quiz_id = ${attempt.quizId}
      AND NOT EXISTS (SELECT 1 FROM skillbridge.quiz_answers a WHERE a.attempt_id = ${attempt.id} AND a.question_id = k.id)
    ORDER BY k.position LIMIT 1`;
  return rows[0] ?? null;
}

export async function getCurrent(profileId: string, attemptId: string): Promise<Result<CurrentDto>> {
  const g = await gate(profileId, attemptId);
  if (g.kind === 'missing') return NOT_FOUND;
  if (g.kind === 'finished') return ok({ done: true });
  const q = await currentQuestion(g.attempt);
  if (!q) return ok({ done: true });
  return ok({
    done: false, questionId: q.id, position: q.position, total: QUIZ_QUESTION_COUNT, kind: q.kind, prompt: q.prompt,
    options: q.kind === 'mcq' ? q.options : null, deadlineAt: g.attempt.deadlineAt, serverNow: g.attempt.serverNow,
  });
}

// ---- answers ----
export interface AnswerDto { next: number | null; deadlineAt: string; serverNow: string }

/** Saves the answer to the CURRENT question only: right kind, in range, before the deadline, never overwriting an earlier answer. */
export async function saveAnswer(profileId: string, attemptId: string, body: AnswerBody): Promise<Result<AnswerDto>> {
  const g = await gate(profileId, attemptId);
  if (g.kind === 'missing') return NOT_FOUND;
  if (g.kind === 'finished') return deny(409, 'This attempt has ended.');
  const { attempt } = g;
  const q = await currentQuestion(attempt);
  if (!q || q.id !== body.questionId) return deny(409, 'That is not the current question.');

  let index: number | null = null, text: string | null = null;
  if (q.kind === 'mcq') {
    const count = Array.isArray(q.options) ? q.options.length : 0;
    if (body.answerText !== undefined || body.answerIndex === undefined || body.answerIndex >= count) return deny(400, 'Choose one of the options.');
    index = body.answerIndex;
  } else {
    if (body.answerIndex !== undefined || body.answerText === undefined) return deny(400, 'Write your answer.');
    text = body.answerText;
  }
  const saved = await database()`INSERT INTO skillbridge.quiz_answers (attempt_id, question_id, answer_index, answer_text)
    SELECT t.id, ${q.id}::uuid, ${index}::int, ${text}::text FROM skillbridge.quiz_attempts t
    WHERE t.id = ${attempt.id} AND t.status = 'in_progress' AND t.deadline_at > now()
    ON CONFLICT (attempt_id, question_id) DO NOTHING RETURNING question_id`;
  if (saved.length === 0) {
    // Already answered (no overwrite) or the deadline passed between the check and the insert.
    await gate(profileId, attemptId);
    return deny(409, 'This question can no longer be answered.');
  }
  return ok({ next: q.position < QUIZ_QUESTION_COUNT ? q.position + 1 : null, deadlineAt: attempt.deadlineAt, serverNow: attempt.serverNow });
}

// ---- integrity events ----
/**
 * Advisory events: only while in progress, at most MAX_EVENTS_PER_ATTEMPT in total (extra events are dropped silently).
 * ponytail: the cap is checked inside one statement, so truly parallel batches can overshoot by a few rows. Lock the attempt row if that matters.
 */
export async function recordEvents(profileId: string, attemptId: string, body: EventsBody): Promise<Result<{ ok: true }>> {
  const g = await gate(profileId, attemptId);
  if (g.kind === 'missing') return NOT_FOUND;
  if (g.kind === 'finished') return deny(409, 'This attempt has ended.');
  const payload = JSON.stringify(body.events.map((e, idx) => ({ idx, kind: e.kind, at_ms: e.atMs, duration_ms: e.durationMs ?? null })));
  await database()`INSERT INTO skillbridge.quiz_integrity_events (attempt_id, kind, at_ms, duration_ms)
    SELECT t.id, x.kind, x.at_ms, x.duration_ms
    FROM skillbridge.quiz_attempts t,
      jsonb_to_recordset(${payload}::jsonb) AS x(idx int, kind text, at_ms int, duration_ms int)
    WHERE t.id = ${g.attempt.id} AND t.status = 'in_progress'
      AND x.idx < ${MAX_EVENTS_PER_ATTEMPT} - (SELECT count(*)::int FROM skillbridge.quiz_integrity_events e WHERE e.attempt_id = t.id)`;
  return ok({ ok: true });
}

// ---- submit ----
/** Idempotent. Finalizes once; later calls (and a deadline that already passed) answer the same. The student is never shown scores. */
export async function submitAttempt(profileId: string, attemptId: string): Promise<Result<{ status: 'submitted' }>> {
  const attempt = await loadOwned(profileId, attemptId);
  if (!attempt) return NOT_FOUND;
  if (attempt.status === 'in_progress') await finalize(attempt, attempt.lateBeyondGrace ? 'expired' : 'submitted');
  return ok({ status: 'submitted' });
}
