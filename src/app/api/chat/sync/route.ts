import { createHash, timingSafeEqual } from 'node:crypto';
import { ApiFailure, apiError } from '@/lib/api';
import { serverChatConfig } from '@/lib/chat/rest';
import { syncChat } from '@/lib/chat/service';
import { chatResponse } from '@/lib/chat/identity';
export const runtime = 'nodejs';
export const maxDuration = 300;
export async function POST(request: Request) {
  try {
    const { syncSecret } = serverChatConfig();
    const digest = (value: string) => createHash('sha256').update(value).digest();
    if (!timingSafeEqual(digest(request.headers.get('authorization') || ''), digest(`Bearer ${syncSecret}`))) throw new ApiFailure(401, 'UNAUTHENTICATED', 'Access denied.');
    await syncChat(true);
    return chatResponse({ success: true });
  } catch (error) { return apiError(error); }
}
