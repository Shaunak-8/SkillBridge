import 'server-only';
import { randomUUID } from 'node:crypto';
import { ApiFailure } from '@/lib/api';
import { database } from '@/lib/db';
import { eligibleProjects } from './membership';
import { CHAT_ROLE, CHAT_SYSTEM_UID, chatContacts, chatPermissions, chatUid } from './policy';
import { chatRest, ChatRestFailure, remoteList, serverChatConfig } from './rest';
import { sweepChatTokens } from './tokens';

export async function ensureChatRole() {
  const payload = { role: CHAT_ROLE, name: 'SkillBridge project member', settings: { listUsers: 'friendsOnly', sendMessagesTo: 'friendsOnly' } };
  try { await chatRest('GET', `/roles/${CHAT_ROLE}`); }
  catch (error) {
    if (!(error instanceof ChatRestFailure && (error.status === 404 || error.code === 'ERR_ROLE_NOT_FOUND'))) throw error;
    try { await chatRest('POST', '/roles', payload); }
    catch (error) { if (!(error instanceof ChatRestFailure && error.code === 'ERR_ROLE_ALREADY_EXISTS')) throw error; }
  }
  await chatRest('PUT', `/roles/${CHAT_ROLE}`, payload);
  await chatRest('PUT', `/roles/${CHAT_ROLE}/permissions`, { permissions: chatPermissions });
  const result = await chatRest<{ permissions: Record<string, unknown> }>('GET', `/roles/${CHAT_ROLE}/permissions`);
  if (!result.permissions || Object.entries(chatPermissions).some(([key, value]) => {
    const actual = result.permissions[key];
    return Array.isArray(value)
      ? !Array.isArray(actual) || actual.length !== value.length || value.some(item => !actual.includes(item))
      : actual !== value;
  }))
    throw new ApiFailure(503, 'CHAT_PERMISSIONS_UNAVAILABLE', 'Messaging permissions could not be verified.');
}
async function provisionUser(uid: string, name: string, role?: string) {
  let found: { uid: string; role?: string } | undefined;
  try { found = await chatRest('GET', `/users/${uid}`); }
  catch (error) { if (!(error instanceof ChatRestFailure && error.code === 'ERR_UID_NOT_FOUND')) throw error; }
  if (!found) {
    try { await chatRest('POST', '/users', { uid, name: name || 'SkillBridge member', ...(role ? { role } : {}) }); }
    catch (error) { if (!(error instanceof ChatRestFailure && error.code === 'ERR_UID_ALREADY_EXISTS')) throw error; }
  }
  // CometChat applies editProfile restrictions even to this update path. Do not
  // repeatedly update a correctly provisioned restricted account.
  if (role && found && found.role !== role) await chatRest('PUT', `/users/${uid}`, { role });
}
export async function registerChatUser(profileId: string) {
  const uid = chatUid(profileId);
  await database()`WITH added AS (
    INSERT INTO skillbridge.chat_users(profile_id, uid) VALUES (${profileId}, ${uid})
    ON CONFLICT DO NOTHING RETURNING profile_id
  ) UPDATE skillbridge.chat_sync_state SET revision = revision + 1
    WHERE singleton AND EXISTS (SELECT 1 FROM added)`;
  return uid;
}
export async function requireChatWorker() {
  serverChatConfig();
  const [state] = await database()`SELECT worker_at > now() - interval '90 seconds' AS fresh FROM skillbridge.chat_sync_state WHERE singleton`;
  if (!state?.fresh) throw new ApiFailure(503, 'CHAT_SYNC_REQUIRED', 'Messaging maintenance is offline. Please retry shortly.');
}
/** Serialized, retryable snapshot reconciler. No CometChat request runs in an approval transaction. */
export async function syncChat(worker = false) {
  serverChatConfig();
  const sql = database();
  if (!worker) {
    const [state] = await sql`SELECT revision = synced_revision AS current FROM skillbridge.chat_sync_state WHERE singleton`;
    if (state?.current) return;
  }
  const lockId = randomUUID();
  const [claimed] = await sql`UPDATE skillbridge.chat_sync_state SET lock_id = ${lockId}, locked_until = now() + interval '2 minutes'
    WHERE singleton AND (locked_until IS NULL OR locked_until < now()) RETURNING revision`;
  if (!claimed) throw new ApiFailure(409, 'CHAT_SYNC_BUSY', 'Messaging is updating. Please retry shortly.');
  async function heartbeat() {
    const rows = await sql`UPDATE skillbridge.chat_sync_state SET locked_until = now() + interval '2 minutes'
      WHERE singleton AND lock_id = ${lockId} AND locked_until > now() RETURNING singleton`;
    if (!rows.length) throw new Error('Chat sync lease lost.');
  }
  try {
    await ensureChatRole();
    await provisionUser(CHAT_SYSTEM_UID, 'SkillBridge project service');
    const projects = await eligibleProjects();
    const memberIds = [...new Set(projects.flatMap(project => project.memberIds))];
    for (const id of memberIds) await sql`INSERT INTO skillbridge.chat_users(profile_id, uid) VALUES (${id}, ${chatUid(id)}) ON CONFLICT DO NOTHING`;
    const users = await sql`SELECT u.profile_id, u.uid, p.full_name, p.role, p.onboarding_completed
      FROM skillbridge.chat_users u LEFT JOIN skillbridge.profiles p ON p.id = u.profile_id ORDER BY u.uid`;
    for (const user of users) {
      await heartbeat();
      if (user.onboarding_completed && ['student', 'business'].includes(user.role)) await provisionUser(user.uid, user.full_name, CHAT_ROLE);
    }
    // Retire human membership in earlier shared groups. Application chat is
    // private between each applicant and the owner; history is retained remotely.
    const groups = await sql`SELECT project_id, guid FROM skillbridge.chat_groups ORDER BY guid`;
    for (const group of groups) {
      await heartbeat();
      let remote: { type: string; owner: string } | undefined;
      try { remote = await chatRest('GET', `/groups/${group.guid}`); }
      catch (error) { if (!(error instanceof ChatRestFailure && error.code === 'ERR_GUID_NOT_FOUND')) throw error; }
      if (!remote) continue;
      if (remote?.type !== 'private' || remote.owner !== CHAT_SYSTEM_UID)
        throw new ApiFailure(503, 'CHAT_GROUP_UNSAFE', 'Project chat permissions could not be verified.');
      const members = await remoteList<{ uid: string; scope: string }>(`/groups/${group.guid}/members`);
      for (const member of members) {
        await heartbeat();
        if (member.uid === CHAT_SYSTEM_UID) continue;
        await chatRest('DELETE', `/groups/${group.guid}/members/${member.uid}`);
      }
    }
    // Reconcile friends across ALL eligible projects, not only the project being opened.
    for (const user of users) {
      await heartbeat();
      const desired = new Set(chatContacts(projects, user.profile_id).map(chatUid));
      let friends: { uid: string }[];
      try { friends = await remoteList(`/users/${user.uid}/friends`); }
      catch (error) { if (error instanceof ChatRestFailure && error.code === 'ERR_UID_NOT_FOUND') continue; throw error; }
      for (const friend of friends) {
        if (!desired.has(friend.uid)) await chatRest('DELETE', `/users/${user.uid}/friends`, { friends: [friend.uid] });
      }
      for (const uid of desired) {
        if (!friends.some(friend => friend.uid === uid)) await chatRest('POST', `/users/${user.uid}/friends`, { accepted: [uid] });
      }
      const confirmed = await remoteList<{ uid: string }>(`/users/${user.uid}/friends`);
      if (confirmed.length !== desired.size || confirmed.some(friend => !desired.has(friend.uid))) throw new Error('Chat contacts could not be verified.');
    }
    await heartbeat();
    await sweepChatTokens(heartbeat);
    await heartbeat();
    await sql`UPDATE skillbridge.chat_sync_state SET synced_revision = ${claimed.revision},
      worker_at = CASE WHEN ${worker} THEN now() ELSE worker_at END WHERE singleton AND lock_id = ${lockId}`;
  } catch (error) {
    // Only safe category information, never raw REST errors or token URLs.
    console.warn('CometChat sync failed:', error instanceof ApiFailure ? error.code
      : error instanceof ChatRestFailure && /^ERR_[A-Z0-9_]{1,80}$/.test(error.code) ? error.code : 'CHAT_SYNC_FAILED');
    throw error;
  } finally {
    await sql`UPDATE skillbridge.chat_sync_state SET lock_id = NULL, locked_until = NULL WHERE singleton AND lock_id = ${lockId}`;
  }
}
