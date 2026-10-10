import type { ProctorEvent, ProctorMode } from '@/lib/proctoring/types';
import { mapError, type FriendlyError, type MyQuiz } from './logic';

/** Student quiz routes answer errors as { error: string }. Status 0 means the request never reached the server. */
export class StudentApiError extends Error {
  readonly friendly: FriendlyError;
  constructor(public readonly status: number, serverMessage = '') {
    const friendly = mapError(status, serverMessage);
    super(friendly.message);
    this.friendly = friendly;
  }
}

export type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

export interface StartResult { attemptId: string; deadlineAt: string; serverNow: string }
export type CurrentResult =
  | { done: true }
  | { done: false; questionId: string; position: number; total: number; kind: 'mcq' | 'short'; prompt: string; options: string[] | null; deadlineAt: string; serverNow: string };
export interface AnswerResult { ok: true; next: number | null; deadlineAt: string; serverNow: string }
export interface AnswerBody { questionId: string; answerIndex?: number; answerText?: string }

async function call<T>(fetcher: Fetcher, path: string, method: 'GET' | 'POST', body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetcher(path, {
      method, credentials: 'same-origin',
      ...(body !== undefined ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new StudentApiError(0);
  }
  const value = await res.json().catch(() => null) as ({ error?: unknown } & Record<string, unknown>) | null;
  if (!res.ok) throw new StudentApiError(res.status, typeof value?.error === 'string' ? value.error : '');
  if (!value) throw new StudentApiError(500);
  return value as T;
}

export function createStudentApi(fetcher: Fetcher = (input, init) => fetch(input, init)) {
  const attempt = (id: string) => `/api/quiz/attempts/${encodeURIComponent(id)}`;
  return {
    myQuizzes: () => call<MyQuiz[]>(fetcher, '/api/students/me/quizzes', 'GET'),
    /** `consent: true` is a literal type: callers can only pass it after the student has agreed (or agreed earlier, on resume). */
    start: (quizId: string, body: { consent: true; proctoringMode: ProctorMode }) =>
      call<StartResult>(fetcher, `/api/quiz/${encodeURIComponent(quizId)}/attempts`, 'POST', body),
    current: (attemptId: string) => call<CurrentResult>(fetcher, `${attempt(attemptId)}/current`, 'GET'),
    answer: (attemptId: string, body: AnswerBody) => call<AnswerResult>(fetcher, `${attempt(attemptId)}/answers`, 'POST', body),
    events: (attemptId: string, events: ProctorEvent[]) => call<{ ok: true }>(fetcher, `${attempt(attemptId)}/events`, 'POST', { events }),
    submit: (attemptId: string) => call<{ status: 'submitted' }>(fetcher, `${attempt(attemptId)}/submit`, 'POST'),
  };
}

export type StudentApi = ReturnType<typeof createStudentApi>;
