import 'server-only';
import { ApiFailure } from '@/lib/api';
import { publicChatConfig } from './config';

export function serverChatConfig() {
  const config = publicChatConfig();
  const key = process.env.COMETCHAT_API_KEY?.trim();
  const syncSecret = process.env.COMETCHAT_SYNC_SECRET?.trim();
  if (!config || !key || !syncSecret || syncSecret.length < 32 || !process.env.NEON_AUTH_COOKIE_SECRET)
    throw new ApiFailure(503, 'CHAT_NOT_CONFIGURED', 'Messaging is not configured for this environment.');
  return { ...config, key, syncSecret };
}
export class ChatRestFailure extends Error {
  constructor(public status: number, public code: string) { super('Messaging service request failed.'); }
}
type Envelope<T> = { data?: T; error?: { code?: string } };
/** No URL/body/error logging: token deletion URLs contain credentials. */
export async function chatRest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const { appId, region, key } = serverChatConfig();
  for (let attempt = 0; attempt < 3; attempt++) {
    let response: Response;
    try {
      response = await fetch(`https://${appId}.api-${region}.cometchat.io/v3${path}`, {
        method, headers: { apikey: key, 'Content-Type': 'application/json' }, cache: 'no-store',
        body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(10000),
      });
    } catch {
      // Never retry token minting: an uncertain POST may already have issued a token.
      if (method === 'GET' && attempt < 2) continue;
      throw new ChatRestFailure(503, 'CHAT_UNAVAILABLE');
    }
    const value: Envelope<T> = await response.json().catch(() => ({}));
    if ((response.status === 429 || response.status >= 500) && method !== 'POST' && attempt < 2) {
      await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)));
      continue;
    }
    if (!response.ok || value.error || value.data === undefined)
      throw new ChatRestFailure(response.status, value.error?.code || 'CHAT_UNAVAILABLE');
    return value.data;
  }
  throw new ChatRestFailure(503, 'CHAT_UNAVAILABLE');
}
export async function remoteList<T>(path: string): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 1; page <= 100; page++) {
    const items = await chatRest<T[]>('GET', `${path}?perPage=100&page=${page}`);
    if (!Array.isArray(items)) throw new ChatRestFailure(503, 'CHAT_INVALID_RESPONSE');
    rows.push(...items);
    if (items.length < 100) return rows;
  }
  throw new ChatRestFailure(503, 'CHAT_LIST_TOO_LARGE');
}
