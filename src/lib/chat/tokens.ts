import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { database } from '@/lib/db';
import { chatRest, ChatRestFailure, remoteList } from './rest';
import { ApiFailure } from '@/lib/api';

function encryptionKey() {
  const secret = process.env.NEON_AUTH_COOKIE_SECRET;
  if (!secret || secret.length < 32) throw new Error('Chat token encryption is not configured.');
  return createHash('sha256').update(`skillbridge-chat-token-v1:${secret}`).digest();
}
export function encryptChatToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const value = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), value].map(part => part.toString('base64url')).join('.');
}
export function decryptChatToken(encrypted: string) {
  const [iv, tag, value] = encrypted.split('.').map(part => Buffer.from(part, 'base64url'));
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(value), decipher.final()]).toString('utf8');
}
export async function revokeChatToken(row: { token_hash: string; uid: string; encrypted_token: string }) {
  try {
    await chatRest('DELETE', `/users/${encodeURIComponent(row.uid)}/auth_tokens/${encodeURIComponent(decryptChatToken(row.encrypted_token))}`);
  } catch (error) {
    if (!(error instanceof ChatRestFailure && ['ERR_AUTH_TOKEN_NOT_FOUND', 'ERR_UID_NOT_FOUND'].includes(error.code))) throw error;
  }
  await database()`DELETE FROM skillbridge.chat_tokens WHERE token_hash = ${row.token_hash}`;
}
export async function sweepChatTokens(heartbeat: () => Promise<void> = async () => undefined) {
  // Read-only managed Auth metadata; never mutate Neon Auth tables.
  const rows = await database()`SELECT t.* FROM skillbridge.chat_tokens t
    LEFT JOIN neon_auth.session s ON s.id = t.session_id
    LEFT JOIN skillbridge.profiles p ON p.id = t.profile_id
    WHERE t.expires_at <= now() OR s.id IS NULL OR s."expiresAt" <= now()
      OR p.id IS NULL OR NOT p.onboarding_completed OR p.role NOT IN ('student', 'business')`;
  for (const row of rows) { await heartbeat(); await revokeChatToken(row as { token_hash: string; uid: string; encrypted_token: string }); }
  // A timed-out mint or failed DB write can leave a provider token without a
  // lease. Reconcile only our registered UIDs, with a grace period for in-flight
  // issuance; no tokens or deletion URLs are logged.
  const users = await database()`SELECT uid FROM skillbridge.chat_users`;
  for (const user of users) {
    await heartbeat();
    let remote: { authToken: string; createdAt: number }[];
    try { remote = await remoteList(`/users/${encodeURIComponent(user.uid)}/auth_tokens`); }
    catch (error) { if (error instanceof ChatRestFailure && error.code === 'ERR_UID_NOT_FOUND') continue; throw error; }
    const leases = await database()`SELECT token_hash FROM skillbridge.chat_tokens WHERE uid = ${user.uid}`;
    const known = new Set(leases.map(lease => lease.token_hash));
    for (const token of remote) {
      if (!token.authToken || !Number.isFinite(Number(token.createdAt))) throw new Error('Invalid provider token metadata.');
      if (known.has(createHash('sha256').update(token.authToken).digest('hex')) || Number(token.createdAt) * 1000 > Date.now() - 120000) continue;
      await heartbeat();
      await chatRest('DELETE', `/users/${encodeURIComponent(user.uid)}/auth_tokens/${encodeURIComponent(token.authToken)}`);
    }
  }
}
export async function issueChatToken(profileId: string, sessionId: string, uid: string, sessionExpiry: Date) {
  const sql = database();
  const sessions = await sql`SELECT s.id FROM neon_auth.session s JOIN skillbridge.profiles p
    ON p.auth_user_id = s."userId"::text WHERE s.id = ${sessionId} AND p.id = ${profileId} AND s."expiresAt" > now()`;
  if (!sessions.length) throw new ApiFailure(401, 'UNAUTHENTICATED', 'Sign in required.');
  const [existing] = await sql`SELECT * FROM skillbridge.chat_tokens WHERE profile_id = ${profileId}
    AND session_id = ${sessionId} AND expires_at > now() + interval '2 minutes' ORDER BY created_at DESC LIMIT 1`;
  if (existing) return { authToken: decryptChatToken(existing.encrypted_token), expiresAt: new Date(existing.expires_at).toISOString() };
  const expiresAt = new Date(Math.min(sessionExpiry.getTime(), Date.now() + 30 * 60 * 1000));
  const result = await chatRest<{ authToken: string; uid: string }>('POST', `/users/${encodeURIComponent(uid)}/auth_tokens`, { force: true });
  if (!result.authToken || result.uid !== uid) throw new Error('Chat token response invalid.');
  const tokenHash = createHash('sha256').update(result.authToken).digest('hex');
  const encrypted = encryptChatToken(result.authToken);
  try {
    await sql`INSERT INTO skillbridge.chat_tokens(token_hash, profile_id, session_id, uid, encrypted_token, expires_at)
      VALUES (${tokenHash}, ${profileId}, ${sessionId}, ${uid}, ${encrypted}, ${expiresAt.toISOString()})`;
  } catch {
    await chatRest('DELETE', `/users/${encodeURIComponent(uid)}/auth_tokens/${encodeURIComponent(result.authToken)}`).catch(() => undefined);
    throw new Error('Chat token could not be recorded.');
  }
  return { authToken: result.authToken, expiresAt: expiresAt.toISOString() };
}
