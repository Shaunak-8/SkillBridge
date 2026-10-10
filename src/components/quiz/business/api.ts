import type { QuestionPayload, Quiz, QuizState, ResultItem } from './types';

// The quiz routes answer errors as { error: string } (ws5 style), unlike businessRequest which expects { error: { message } }.
export class QuizApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

const FALLBACK: Record<number, string> = {
  401: 'Please sign in again.',
  403: 'Only the owner of this project can manage its quiz.',
  404: 'We could not find that. Refresh the page and try again.',
  409: 'The quiz changed or is not ready for that step. Refresh and check its status.',
  429: 'Too many attempts. Please wait a few minutes and try again.',
  502: 'The AI could not write the quiz this time. Please try again.',
  503: 'Something went wrong on our side. Please try again.',
};

export async function quizRequest<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method, credentials: 'same-origin',
      ...(body !== undefined ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new QuizApiError('We could not connect. Check your connection and try again.', 0);
  }
  const value = await res.json().catch(() => null) as ({ error?: unknown } & Record<string, unknown>) | null;
  if (!res.ok) {
    const serverMessage = typeof value?.error === 'string' ? value.error : '';
    // Prefer our own wording for the statuses the user can act on; fall back to the server text.
    throw new QuizApiError((res.status === 429 || res.status === 502 ? FALLBACK[res.status] : serverMessage) || FALLBACK[res.status] || 'We could not complete that. Please try again.', res.status);
  }
  if (!value) throw new QuizApiError('We got an unexpected reply. Please try again.', res.status);
  return value as T;
}

export const quizApi = (projectId: string) => {
  const base = `/api/business/projects/${encodeURIComponent(projectId)}/quiz`;
  return {
    state: () => quizRequest<QuizState>(base),
    generate: async () => (await quizRequest<{ quiz: Quiz }>(base, 'POST')).quiz,
    save: async (patch: { timeLimitSeconds?: number; questions?: QuestionPayload[] }) => (await quizRequest<{ quiz: Quiz }>(base, 'PATCH', patch)).quiz,
    open: async () => (await quizRequest<{ quiz: Quiz }>(`${base}/open`, 'POST')).quiz,
    close: async () => (await quizRequest<{ quiz: Quiz }>(`${base}/close`, 'POST')).quiz,
    results: async () => (await quizRequest<{ items: ResultItem[] }>(`${base}/results`)).items,
  };
};
