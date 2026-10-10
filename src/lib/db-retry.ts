const MAX_ATTEMPTS = 4;
const RETRY_DELAY_MS = 250;

function isTransientConnectionError(error: unknown) {
  const text = [(error as Error)?.message, ((error as Error)?.cause as Error)?.message,
    ((error as { sourceError?: Error })?.sourceError?.cause as { code?: string })?.code].join(' ');
  return /fetch failed|UND_ERR_(CONNECT_TIMEOUT|SOCKET)|ECONNRESET|ETIMEDOUT/.test(text);
}

/**
 * Wraps a Neon tagged-template client so connection-level failures are retried.
 * Only use it for idempotent work (the chat reconciler): a reset after the request
 * was sent could otherwise apply a write twice.
 */
export function retryTransient<T extends (strings: TemplateStringsArray, ...values: never[]) => Promise<unknown>>(sql: T): T {
  return (async (strings: TemplateStringsArray, ...values: never[]) => {
    for (let attempt = 1; ; attempt++) {
      try { return await sql(strings, ...values); }
      catch (error) {
        if (attempt >= MAX_ATTEMPTS || !isTransientConnectionError(error)) throw error;
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
      }
    }
  }) as T;
}
