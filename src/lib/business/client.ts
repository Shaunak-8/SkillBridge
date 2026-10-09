import type { ApiErrorBody } from './contracts';
export class FormError extends Error {
  constructor(message: string, public fields: Record<string, string> = {}) { super(message); }
}
export async function businessRequest<T>(path: string, method: string, body?: unknown, unwrap = true): Promise<T> {
  let response: Response;
  try { response = await fetch(path, { method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }); }
  catch { throw new FormError('We could not connect. Check your connection and try again.'); }
  const value = await response.json().catch(() => null) as { data?: T } & Partial<ApiErrorBody> | null;
  if (!response.ok || !value || (unwrap && !('data' in value))) throw new FormError(value?.error?.message || 'We could not complete that action. Please try again.', value?.error?.fields);
  return (unwrap ? value.data : value) as T;
}
