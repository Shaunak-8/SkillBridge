import { apiError } from '@/lib/api';
import { database } from '@/lib/db';
import { chatIdentity, chatResponse } from '@/lib/chat/identity';
import { revokeChatToken } from '@/lib/chat/tokens';
export async function POST(request: Request) {
  try {
    const current = await chatIdentity(request);
    // Record expiry before REST, so maintenance retries a failed revocation.
    const rows = await database()`UPDATE skillbridge.chat_tokens SET expires_at = now()
      WHERE profile_id = ${current.profile.id} AND session_id = ${current.sessionId} RETURNING token_hash, uid, encrypted_token`;
    for (const row of rows) await revokeChatToken(row as { token_hash: string; uid: string; encrypted_token: string });
    return chatResponse({ success: true });
  } catch (error) { return apiError(error); }
}
