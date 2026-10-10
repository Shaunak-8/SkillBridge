import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ profile: vi.fn(), session: vi.fn(), sql: vi.fn(), origin: vi.fn(() => true) }));
vi.mock('@/lib/auth/profile', () => ({ currentProfile: mocks.profile }));
vi.mock('@/lib/auth/server', () => ({ getAuth: () => ({ getSession: mocks.session }) }));
vi.mock('@/lib/db', () => ({ database: () => mocks.sql }));
vi.mock('@/lib/auth/security', () => ({ sameOrigin: mocks.origin, rateLimit: vi.fn(() => true) }));
import { publicChatConfig } from '@/lib/chat/config';
import { chatUid, chatGuid, authorizedEntity, chatContacts, canChatForApplication } from '@/lib/chat/policy';
import { chatRest, serverChatConfig } from '@/lib/chat/rest';
import { chatIdentity } from '@/lib/chat/identity';
import { chatMetadata, eligibleProjects } from '@/lib/chat/membership';
import { encryptChatToken, decryptChatToken } from '@/lib/chat/tokens';
import { POST as sync } from '@/app/api/chat/sync/route';
import { POST as session } from '@/app/api/chat/session/route';

const id = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
beforeEach(() => {
  vi.resetAllMocks(); mocks.origin.mockReturnValue(true);
  vi.stubEnv('NEXT_PUBLIC_ENABLE_CHAT', 'true'); vi.stubEnv('NEXT_PUBLIC_COMETCHAT_APP_ID', 'testapp');
  vi.stubEnv('NEXT_PUBLIC_COMETCHAT_REGION', 'in'); vi.stubEnv('COMETCHAT_API_KEY', 'private-rest-key');
  vi.stubEnv('COMETCHAT_SYNC_SECRET', 'a'.repeat(64)); vi.stubEnv('NEON_AUTH_COOKIE_SECRET', 'b'.repeat(64));
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe('CometChat configuration and REST boundary', () => {
  it('exposes only public SDK configuration', () => { expect(publicChatConfig()).toEqual({ appId: 'testapp', region: 'in' }); });
  it('disables SDK configuration when flag is off', () => { vi.stubEnv('NEXT_PUBLIC_ENABLE_CHAT', 'false'); expect(publicChatConfig()).toBeNull(); });
  it('normalizes the dashboard region', () => { vi.stubEnv('NEXT_PUBLIC_COMETCHAT_REGION', 'IN'); expect(publicChatConfig()?.region).toBe('in'); });
  it('fails gracefully for a mistyped region', () => { vi.stubEnv('NEXT_PUBLIC_COMETCHAT_REGION', 'im'); expect(publicChatConfig()).toBeNull(); });
  it('requires the server REST key and maintenance secret', () => { vi.stubEnv('COMETCHAT_API_KEY', ''); expect(serverChatConfig).toThrow('not configured'); });
  it('does not make external calls when disabled', async () => { const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher); vi.stubEnv('NEXT_PUBLIC_ENABLE_CHAT', 'false'); await expect(chatRest('GET', '/users')).rejects.toMatchObject({ code: 'CHAT_NOT_CONFIGURED' }); expect(fetcher).not.toHaveBeenCalled(); });
  it('uses server headers and no-store caching', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ data: { uid: 'x' } })); vi.stubGlobal('fetch', fetcher);
    expect(await chatRest('GET', '/users/x')).toEqual({ uid: 'x' });
    expect(fetcher.mock.calls[0][1]).toMatchObject({ cache: 'no-store', headers: { apikey: 'private-rest-key' } });
  });
  it('does not expose provider messages or credentials', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error: { code: 'ERR_DENIED', message: 'private-rest-key' } }, { status: 403 })));
    await expect(chatRest('GET', '/users/x')).rejects.toMatchObject({ message: 'Messaging service request failed.', code: 'ERR_DENIED' });
  });
  it('does not blindly retry an uncertain token POST', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('network')); vi.stubGlobal('fetch', fetcher);
    await expect(chatRest('POST', '/users/x/auth_tokens', { force: true })).rejects.toThrow(); expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
describe('Neon identities and project permissions', () => {
  it('rejects unauthenticated requests before REST', async () => { mocks.profile.mockResolvedValue(null); expect((await session(new Request('http://localhost/api/chat/session', { method: 'POST' }))).status).toBe(401); });
  it('rejects CSRF before looking up identity', async () => { mocks.origin.mockReturnValue(false); await expect(chatIdentity(new Request('http://localhost'))).rejects.toMatchObject({ status: 403 }); expect(mocks.profile).not.toHaveBeenCalled(); });
  it('rejects unverified accounts', async () => { mocks.profile.mockResolvedValue({ user: { emailVerified: false }, profile: { role: 'student', onboarding_completed: true } }); await expect(chatIdentity()).rejects.toMatchObject({ status: 403 }); });
  it('rejects admin accounts without provisioning', async () => { mocks.profile.mockResolvedValue({ user: { emailVerified: true }, profile: { role: 'admin', onboarding_completed: true } }); await expect(chatIdentity()).rejects.toMatchObject({ status: 403 }); expect(mocks.sql).not.toHaveBeenCalled(); });
  it('rejects an expired auth session', async () => {
    mocks.profile.mockResolvedValue({ user: { id, emailVerified: true }, profile: { role: 'student', onboarding_completed: true } });
    mocks.session.mockResolvedValue({ data: { user: { id }, session: { id, expiresAt: '2000-01-01' } } }); await expect(chatIdentity()).rejects.toMatchObject({ status: 401 });
  });
  it('uses immutable internal IDs, not emails', () => { expect(chatUid(id)).toBe(`sb-user-${id}`); expect(chatGuid(id)).toBe(`sb-project-${id}`); expect(() => chatUid('student@example.com')).toThrow(); });
  it('allows submitted applications without acceptance, retaining completed but not closed projects', async () => {
    mocks.sql.mockResolvedValue([]); await eligibleProjects(); const query = mocks.sql.mock.calls[0][0].join('');
    expect(query).toContain("a.status IN ('submitted', 'viewed', 'reviewing', 'shortlisted', 'accepted')"); expect(query).toContain("'completed'"); expect(query).not.toContain("'closed'");
  });
  it('does not return unrelated project metadata', async () => {
    mocks.sql.mockResolvedValue([{ id: other, title: 'Private project', owner_profile_id: other, students: [other] }]);
    expect(await chatMetadata(id)).toEqual({ uid: chatUid(id), projects: [], people: [] }); expect(mocks.sql).toHaveBeenCalledTimes(1);
  });
  it('returns only the owner to an applicant and denies shared group access', async () => {
    mocks.sql.mockResolvedValueOnce([{ id, title: 'Approved project', owner_profile_id: other, students: [id] }]).mockResolvedValueOnce([{ id: other, full_name: 'Owner' }]);
    const data = await chatMetadata(id); expect(data.people).toEqual([{ id: other, name: 'Owner', uid: chatUid(other) }]); expect(authorizedEntity(data, chatGuid(id), 'group')).toBe(false); expect(authorizedEntity(data, chatUid(other), 'user')).toBe(true);
  });
  it.each(['submitted', 'viewed', 'reviewing', 'shortlisted', 'accepted'])('shows chat for %s applications', status => expect(canChatForApplication(status)).toBe(true));
  it.each(['declined', 'withdrawn', 'draft', 'unknown'])('hides chat for %s applications', status => expect(canChatForApplication(status)).toBe(false));
  it('does not expose another applicant or create student-to-student relationships', async () => {
    const third = '33333333-3333-4333-8333-333333333333';
    const project = { id, title: 'Project', guid: chatGuid(id), ownerProfileId: other, memberIds: [other, id, third] };
    expect(chatContacts([project], id)).toEqual([other]);
    expect(chatContacts([project], third)).toEqual([other]);
    expect(chatContacts([project], other)).toEqual([id, third]);
    mocks.sql.mockResolvedValueOnce([{ id, title: 'Project', owner_profile_id: other, students: [id, third] }]).mockResolvedValueOnce([{ id: other, full_name: 'Owner' }]);
    const metadata = await chatMetadata(id);
    expect(metadata.projects[0].memberIds).toEqual([other, id]);
    expect(authorizedEntity(metadata, chatUid(third), 'user')).toBe(false);
  });
  it('rejects forged worker credentials before database or REST', async () => {
    const response = await sync(new Request('http://localhost/api/chat/sync', { method: 'POST', headers: { authorization: 'Bearer forged' } }));
    expect(response.status).toBe(401); expect(mocks.sql).not.toHaveBeenCalled();
  });
});
describe('Encrypted token leases', () => {
  it('round trips a token without storing plaintext', () => { const value = encryptChatToken('private-auth-token'); expect(value).not.toContain('private-auth-token'); expect(decryptChatToken(value)).toBe('private-auth-token'); });
  it('uses a fresh IV for each token', () => { expect(encryptChatToken('token')).not.toBe(encryptChatToken('token')); });
  it('detects altered ciphertext', () => { const parts = encryptChatToken('token').split('.'); parts[2] = Buffer.from('tampered').toString('base64url'); expect(() => decryptChatToken(parts.join('.'))).toThrow(); });
});
