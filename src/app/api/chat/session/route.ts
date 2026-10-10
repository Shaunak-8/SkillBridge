import { ApiFailure, apiError } from '@/lib/api';
import { rateLimit } from '@/lib/auth/security';
import { database } from '@/lib/db';
import { chatIdentity, chatResponse } from '@/lib/chat/identity';
import { chatMetadata } from '@/lib/chat/membership';
import { registerChatUser, requireChatWorker, syncChat } from '@/lib/chat/service';
import { issueChatToken } from '@/lib/chat/tokens';
export const runtime = 'nodejs';
export async function GET() {
  try {
    const current = await chatIdentity(); await requireChatWorker();
    const [state] = await database()`SELECT revision = synced_revision AS current FROM skillbridge.chat_sync_state WHERE singleton`;
    return chatResponse({ ...await chatMetadata(current.profile.id), syncPending: !state?.current });
  }
  catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  try {
    const current = await chatIdentity(request);
    if (!await rateLimit('chat-session', current.user.id, 30)) throw new ApiFailure(429, 'RATE_LIMITED', 'Please try again shortly.');
    await requireChatWorker();
    const uid = await registerChatUser(current.profile.id);
    await syncChat();
    const [state] = await database()`SELECT revision = synced_revision AS current FROM skillbridge.chat_sync_state WHERE singleton`;
    if (!state?.current) throw new ApiFailure(409, 'CHAT_SYNC_BUSY', 'Messaging is updating. Please retry shortly.');
    const metadata = await chatMetadata(current.profile.id);
    const credentials = await issueChatToken(current.profile.id, current.sessionId, uid, current.sessionExpiry);
    return chatResponse({ ...metadata, ...credentials });
  } catch (error) { return apiError(error); }
}
