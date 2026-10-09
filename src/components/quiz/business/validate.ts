import {
  MAX_TIME_LIMIT_SECONDS, MCQ_OPTION_COUNT, MIN_TIME_LIMIT_SECONDS, QUIZ_MCQ_COUNT, QUIZ_QUESTION_COUNT, QUIZ_SHORT_COUNT,
} from '@/lib/quiz/constants';
import type { DraftQuestion, Quiz, QuestionPayload } from './types';

// Mirrors src/lib/quiz/schema.ts so the editor flags problems before the server does. The server stays the authority.
export const PROMPT_MIN = 10, PROMPT_MAX = 600, OPTION_MAX = 300, RUBRIC_MIN = 10, RUBRIC_MAX = 1000;
const STEP_SECONDS = 300;

export const timeLimitChoices = (): number[] => {
  const out: number[] = [];
  for (let s = MIN_TIME_LIMIT_SECONDS; s <= MAX_TIME_LIMIT_SECONDS; s += STEP_SECONDS) out.push(s);
  return out;
};

export function draftsFromQuiz(quiz: Quiz): DraftQuestion[] {
  return [...quiz.questions].sort((a, b) => a.position - b.position).map((q) => ({
    kind: q.kind,
    prompt: q.prompt,
    options: q.kind === 'mcq' ? Array.from({ length: MCQ_OPTION_COUNT }, (_, i) => q.options?.[i] ?? '') : Array(MCQ_OPTION_COUNT).fill(''),
    correctIndex: q.correctIndex ?? 0,
    rubric: q.rubric ?? '',
  }));
}

/** Problems for one question, in plain words. Empty array means valid. */
export function questionProblems(q: DraftQuestion): string[] {
  const out: string[] = [];
  const prompt = q.prompt.trim();
  if (prompt.length < PROMPT_MIN) out.push(`The question needs at least ${PROMPT_MIN} characters.`);
  if (prompt.length > PROMPT_MAX) out.push(`The question can be at most ${PROMPT_MAX} characters.`);
  if (q.kind === 'short') {
    const rubric = q.rubric.trim();
    if (rubric.length < RUBRIC_MIN) out.push(`The marking guide needs at least ${RUBRIC_MIN} characters.`);
    if (rubric.length > RUBRIC_MAX) out.push(`The marking guide can be at most ${RUBRIC_MAX} characters.`);
    return out;
  }
  const options = q.options.map((o) => o.trim());
  if (options.length !== MCQ_OPTION_COUNT || options.some((o) => o.length === 0)) out.push(`Fill in all ${MCQ_OPTION_COUNT} options.`);
  if (options.some((o) => o.length > OPTION_MAX)) out.push(`Each option can be at most ${OPTION_MAX} characters.`);
  const filled = options.filter(Boolean).map((o) => o.toLowerCase());
  if (new Set(filled).size !== filled.length) out.push('Options must be different from each other.');
  if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex >= MCQ_OPTION_COUNT) out.push('Choose which option is correct.');
  return out;
}

/** Per-question problems plus a quiz-level problem when the 4 multiple choice + 1 short mix is wrong. */
export function validateDrafts(drafts: DraftQuestion[]): { ok: boolean; quizProblem: string | null; byQuestion: string[][] } {
  const byQuestion = drafts.map(questionProblems);
  const mcq = drafts.filter((q) => q.kind === 'mcq').length;
  const short = drafts.filter((q) => q.kind === 'short').length;
  const mixOk = drafts.length === QUIZ_QUESTION_COUNT && mcq === QUIZ_MCQ_COUNT && short === QUIZ_SHORT_COUNT;
  const quizProblem = mixOk ? null : `A quiz needs exactly ${QUIZ_MCQ_COUNT} multiple choice questions and ${QUIZ_SHORT_COUNT} short answer question.`;
  return { ok: mixOk && byQuestion.every((p) => p.length === 0), quizProblem, byQuestion };
}

export const toPayload = (drafts: DraftQuestion[]): QuestionPayload[] => drafts.map((q) => q.kind === 'mcq'
  ? { kind: 'mcq', prompt: q.prompt.trim(), options: q.options.map((o) => o.trim()), correctIndex: q.correctIndex }
  : { kind: 'short', prompt: q.prompt.trim(), rubric: q.rubric.trim() });
