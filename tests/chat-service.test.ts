import { beforeEach, afterEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ sql: vi.fn(), rest: vi.fn(), list: vi.fn(), projects: vi.fn(), sweep: vi.fn() }));
vi.mock('@/lib/db', () => ({ database: () => mocks.sql }));
vi.mock('@/lib/chat/membership', () => ({ eligibleProjects: mocks.projects }));
vi.mock('@/lib/chat/tokens', () => ({ sweepChatTokens: mocks.sweep }));
vi.mock('@/lib/chat/rest', async original => ({ ...await original<typeof import('@/lib/chat/rest')>(), chatRest: mocks.rest, remoteList: mocks.list }));
import { CHAT_ROLE, CHAT_SYSTEM_UID, chatPermissions, chatUid, chatGuid } from '@/lib/chat/policy';
import { syncChat, ensureChatRole, requireChatWorker } from '@/lib/chat/service';
const id = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('NEXT_PUBLIC_ENABLE_CHAT', 'true'); vi.stubEnv('NEXT_PUBLIC_COMETCHAT_APP_ID', 'testapp'); vi.stubEnv('NEXT_PUBLIC_COMETCHAT_REGION', 'in');
  vi.stubEnv('COMETCHAT_API_KEY', 'key'); vi.stubEnv('COMETCHAT_SYNC_SECRET', 'a'.repeat(64)); vi.stubEnv('NEON_AUTH_COOKIE_SECRET', 'b'.repeat(64));
  mocks.projects.mockResolvedValue([]); mocks.list.mockResolvedValue([]);
  mocks.rest.mockImplementation(async (method, path) => path.endsWith('/permissions') ? { permissions: chatPermissions } : { uid: 'user', type: 'private', owner: CHAT_SYSTEM_UID });
  mocks.sql.mockImplementation(async (strings: TemplateStringsArray) => {
    const query = strings.join('');
    if (query.includes('RETURNING revision')) return [{ revision: 1 }];
    if (query.includes('RETURNING singleton')) return [{ singleton: true }];
    return [];
  });
});
afterEach(() => vi.unstubAllEnvs());
it('requires a fresh worker before issuing credentials', async () => { mocks.sql.mockResolvedValue([{ fresh: false }]); await expect(requireChatWorker()).rejects.toMatchObject({ code: 'CHAT_SYNC_REQUIRED' }); });
it('fails closed if provider restrictions are not applied', async () => { mocks.rest.mockResolvedValue({ permissions: { createGroup: 'allow' } }); await expect(ensureChatRole()).rejects.toMatchObject({ code: 'CHAT_PERMISSIONS_UNAVAILABLE' }); });
it('verifies real provider permissions, not only UI visibility', async () => { await ensureChatRole(); expect(mocks.rest).toHaveBeenCalledWith('PUT', `/roles/${CHAT_ROLE}/permissions`, { permissions: chatPermissions }); expect(mocks.rest).toHaveBeenCalledWith('GET', `/roles/${CHAT_ROLE}/permissions`); });
it('verifies explicit history filters by value, regardless of provider ordering', async () => {
  mocks.rest.mockResolvedValue({ permissions: { ...chatPermissions, 'listMessages.allowedMessageTypes': ['file', 'text', 'image'] } });
  await expect(ensureChatRole()).resolves.toBeUndefined();
  mocks.rest.mockResolvedValue({ permissions: { ...chatPermissions, 'sendMessage.allowedReceiverTypes': ['user', 'group'] } });
  await expect(ensureChatRole()).rejects.toMatchObject({ code: 'CHAT_PERMISSIONS_UNAVAILABLE' });
});
it('rejects concurrent sync without external operations', async () => { mocks.sql.mockResolvedValue([]); await expect(syncChat(true)).rejects.toMatchObject({ status: 409 }); expect(mocks.rest).not.toHaveBeenCalled(); });
it('skips unchanged snapshots for ordinary bootstrap', async () => { mocks.sql.mockResolvedValue([{ current: true }]); await syncChat(); expect(mocks.rest).not.toHaveBeenCalled(); });
it('sweeps token leases before declaring worker success', async () => { await syncChat(true); expect(mocks.sweep).toHaveBeenCalledTimes(1); expect(mocks.sql.mock.calls.some(call => call[0].join('').includes('synced_revision ='))).toBe(true); });
it('revokes group membership even if the project no longer exists', async () => {
  const defaultSql = mocks.sql.getMockImplementation()!;
  mocks.sql.mockImplementation(async (strings: TemplateStringsArray, ...values: unknown[]) => strings.join('').includes('SELECT project_id, guid') ? [{ project_id: id, guid: chatGuid(id) }] : defaultSql(strings, ...values));
  mocks.list.mockResolvedValue([{ uid: CHAT_SYSTEM_UID, scope: 'admin' }, { uid: chatUid(other), scope: 'participant' }]);
  await syncChat(true); expect(mocks.rest).toHaveBeenCalledWith('DELETE', `/groups/${chatGuid(id)}/members/${chatUid(other)}`);
  expect(mocks.rest).not.toHaveBeenCalledWith('DELETE', `/groups/${chatGuid(id)}/members/${CHAT_SYSTEM_UID}`);
});
it('does not give participant credentials when a group is public', async () => {
  const defaultSql = mocks.sql.getMockImplementation()!;
  mocks.sql.mockImplementation(async (strings: TemplateStringsArray, ...values: unknown[]) => strings.join('').includes('SELECT project_id, guid') ? [{ project_id: id, guid: chatGuid(id) }] : defaultSql(strings, ...values));
  mocks.projects.mockResolvedValue([{ id, title: 'Project', guid: chatGuid(id), ownerProfileId: id, memberIds: [id, other] }]);
  mocks.rest.mockImplementation(async (method, path) => path.endsWith('/permissions') ? { permissions: chatPermissions } : { type: 'public', owner: CHAT_SYSTEM_UID });
  await expect(syncChat(true)).rejects.toMatchObject({ code: 'CHAT_GROUP_UNSAFE' });
});
it('does not mark failed sync successful, and releases its lease', async () => {
  mocks.sweep.mockRejectedValue(new Error('offline')); await expect(syncChat(true)).rejects.toThrow('offline');
  expect(mocks.sql.mock.calls.some(call => call[0].join('').includes('synced_revision ='))).toBe(false);
  expect(mocks.sql.mock.calls.at(-1)?.[0].join('')).toContain('lock_id = NULL');
});
it('grants only applicant-owner friendships and revokes earlier applicant-to-applicant access', async () => {
  const third = '33333333-3333-4333-8333-333333333333';
  const defaultSql = mocks.sql.getMockImplementation()!;
  const users = [id, other, third].map(profile_id => ({ profile_id, uid: chatUid(profile_id), full_name: 'Fixture', role: profile_id === id ? 'business' : 'student', onboarding_completed: true }));
  const friends = new Map([[chatUid(id), new Set<string>()], [chatUid(other), new Set([chatUid(third)])], [chatUid(third), new Set([chatUid(other)])]]);
  mocks.projects.mockResolvedValue([{ id, title: 'Application project', guid: chatGuid(id), ownerProfileId: id, memberIds: [id, other, third] }]);
  mocks.sql.mockImplementation(async (strings: TemplateStringsArray, ...values: unknown[]) => strings.join('').includes('SELECT u.profile_id') ? users : defaultSql(strings, ...values));
  mocks.list.mockImplementation(async (path: string) => [...(friends.get(path.split('/')[2]) || [])].map(uid => ({ uid })));
  mocks.rest.mockImplementation(async (method: string, path: string, body?: { accepted?: string[]; friends?: string[] }) => {
    if (path.endsWith('/permissions')) return { permissions: chatPermissions };
    if (path.endsWith('/friends')) {
      const desired = friends.get(path.split('/')[2])!;
      if (method === 'POST') for (const uid of body?.accepted || []) desired.add(uid);
      if (method === 'DELETE') for (const uid of body?.friends || []) desired.delete(uid);
    }
    return { uid: 'user', type: 'private', owner: CHAT_SYSTEM_UID };
  });
  await syncChat(true);
  expect(friends.get(chatUid(id))).toEqual(new Set([chatUid(other), chatUid(third)]));
  expect(friends.get(chatUid(other))).toEqual(new Set([chatUid(id)]));
  expect(friends.get(chatUid(third))).toEqual(new Set([chatUid(id)]));
  expect(mocks.rest).toHaveBeenCalledWith('DELETE', `/users/${chatUid(other)}/friends`, { friends: [chatUid(third)] });
  expect(mocks.rest).not.toHaveBeenCalledWith('POST', '/groups', expect.anything());
});
