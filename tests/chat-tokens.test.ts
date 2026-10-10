import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ sql: vi.fn(), rest: vi.fn(), list: vi.fn() }));
vi.mock('@/lib/db', () => ({ database: () => mocks.sql }));
vi.mock('@/lib/chat/rest', async original => ({ ...await original<typeof import('@/lib/chat/rest')>(), chatRest: mocks.rest, remoteList: mocks.list }));
import { encryptChatToken, issueChatToken, sweepChatTokens } from '@/lib/chat/tokens';
beforeEach(() => { vi.resetAllMocks(); vi.stubEnv('NEON_AUTH_COOKIE_SECRET', 'b'.repeat(64)); mocks.rest.mockResolvedValue({}); mocks.list.mockResolvedValue([]); });
afterEach(() => vi.unstubAllEnvs());
it('refuses to mint a token when the managed session has been revoked', async () => {
  mocks.sql.mockResolvedValue([]);
  await expect(issueChatToken('profile', 'session', 'uid', new Date(Date.now() + 60000))).rejects.toMatchObject({ status: 401 });
  expect(mocks.rest).not.toHaveBeenCalled();
});
it('reuses a valid lease for the same verified session', async () => {
  const expiry = new Date(Date.now() + 600000).toISOString();
  mocks.sql.mockResolvedValueOnce([{ id: 'session' }]).mockResolvedValueOnce([{ encrypted_token: encryptChatToken('existing'), expires_at: expiry }]);
  expect(await issueChatToken('profile', 'session', 'uid', new Date(expiry))).toEqual({ authToken: 'existing', expiresAt: expiry }); expect(mocks.rest).not.toHaveBeenCalled();
});
it('caps token leases at the application session expiry and stores only ciphertext', async () => {
  const expiry = new Date(Date.now() + 60000);
  mocks.sql.mockResolvedValueOnce([{ id: 'session' }]).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
  mocks.rest.mockResolvedValue({ uid: 'uid', authToken: 'new-token' });
  expect((await issueChatToken('profile', 'session', 'uid', expiry)).expiresAt).toBe(expiry.toISOString());
  expect(mocks.sql.mock.calls.at(-1)?.slice(1)).not.toContain('new-token');
});
it('attempts remote token deletion if recording a newly minted lease fails', async () => {
  mocks.sql.mockResolvedValueOnce([{ id: 'session' }]).mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('offline'));
  mocks.rest.mockResolvedValue({ uid: 'uid', authToken: 'new-token' });
  await expect(issueChatToken('profile', 'session', 'uid', new Date(Date.now() + 60000))).rejects.toThrow('could not be recorded');
  expect(mocks.rest).toHaveBeenCalledWith('DELETE', '/users/uid/auth_tokens/new-token');
});
it('revokes expired leases before deleting their database record', async () => {
  mocks.sql.mockImplementation(async (strings: TemplateStringsArray) => strings.join('').includes('SELECT t.*')
    ? [{ token_hash: 'hash', uid: 'uid', encrypted_token: encryptChatToken('expired') }] : []);
  await sweepChatTokens(); expect(mocks.rest).toHaveBeenCalledWith('DELETE', '/users/uid/auth_tokens/expired');
  expect(mocks.sql.mock.calls.some(call => call[0].join('').includes('DELETE FROM skillbridge.chat_tokens'))).toBe(true);
});
it('removes only old untracked tokens within registered user IDs', async () => {
  const known = createHash('sha256').update('known').digest('hex');
  mocks.sql.mockImplementation(async (strings: TemplateStringsArray) => {
    const query = strings.join('');
    return query.includes('SELECT uid FROM') ? [{ uid: 'managed-uid' }] : query.includes('SELECT token_hash') ? [{ token_hash: known }] : [];
  });
  const old = Math.floor(Date.now() / 1000) - 180;
  mocks.list.mockResolvedValue([{ authToken: 'known', createdAt: old }, { authToken: 'orphan', createdAt: old }, { authToken: 'in-flight', createdAt: Math.floor(Date.now() / 1000) }]);
  await sweepChatTokens(); expect(mocks.rest).toHaveBeenCalledTimes(1);
  expect(mocks.rest).toHaveBeenCalledWith('DELETE', '/users/managed-uid/auth_tokens/orphan');
});
