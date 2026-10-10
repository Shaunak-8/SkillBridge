export type TeamResult<T> = { ok: true; data: T } | { ok: false; error: string };

/** Small fetch wrapper for the team API routes: JSON in and out, and a readable error instead of a throw. */
export async function teamRequest<T = unknown>(path: string, init: RequestInit = {}): Promise<TeamResult<T>> {
  try {
    const response = await fetch(path, {
      ...init, cache: 'no-store',
      headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
    });
    const data = await response.json().catch(() => null);
    return response.ok ? { ok: true, data: data as T } : { ok: false, error: data?.error ?? 'Something went wrong. Please try again.' };
  } catch {
    return { ok: false, error: 'Network error. Try again.' };
  }
}
