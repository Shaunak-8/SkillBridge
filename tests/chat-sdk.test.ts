import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ init: vi.fn(), login: vi.fn(), logout: vi.fn(), current: vi.fn(), initialized: vi.fn(() => true), settings: vi.fn() }));
vi.mock('@cometchat/chat-uikit-react', () => ({
  CometChatUIKit: { init: mocks.init, loginWithAuthToken: mocks.login, logout: mocks.logout, getLoggedInUser: mocks.current, isInitialized: mocks.initialized },
  UIKitSettingsBuilder: class {
    setAppId(value: string) { mocks.settings('appId', value); return this; }
    setRegion(value: string) { mocks.settings('region', value); return this; }
    subscribePresenceForFriends() { return this; }
    setCallingEnabled(value: boolean) { mocks.settings('calling', value); return this; }
    build() { return {}; }
  },
}));
import type { ChatSession } from '@/lib/chat/policy';
function session(uid: string, token = 'token'): ChatSession { return { uid, authToken: token, expiresAt: new Date(Date.now() + 60000).toISOString(), projects: [], people: [] }; }
beforeEach(() => {
  vi.resetModules(); vi.resetAllMocks(); mocks.initialized.mockReturnValue(true);
  vi.stubEnv('NEXT_PUBLIC_ENABLE_CHAT', 'true'); vi.stubEnv('NEXT_PUBLIC_COMETCHAT_APP_ID', 'testapp'); vi.stubEnv('NEXT_PUBLIC_COMETCHAT_REGION', 'in');
  mocks.init.mockResolvedValue(null); mocks.current.mockReturnValue(null); mocks.logout.mockResolvedValue(undefined);
  mocks.login.mockImplementation(async () => { const user = { getUid: () => 'first' }; mocks.current.mockReturnValue(user); return user; });
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it('initializes once and authenticates with backend tokens, not an Auth Key', async () => {
  const { loginChat } = await import('@/lib/chat/sdk');
  await Promise.all([loginChat(session('first')), loginChat(session('first'))]);
  expect(mocks.init).toHaveBeenCalledTimes(1); expect(mocks.login).toHaveBeenCalledTimes(1);
  expect(mocks.login).toHaveBeenCalledWith('token'); expect(mocks.settings).toHaveBeenCalledWith('calling', false);
});
it('logs out the previous account before switching identity', async () => {
  const { loginChat } = await import('@/lib/chat/sdk'); await loginChat(session('first'));
  mocks.login.mockImplementationOnce(async () => ({ getUid: () => 'second' }));
  await loginChat(session('second', 'second-token')); expect(mocks.logout).toHaveBeenCalledTimes(1);
  expect(mocks.logout.mock.invocationCallOrder[0]).toBeLessThan(mocks.login.mock.invocationCallOrder[1]);
});
it('rejects a mismatched SDK identity and clears that session', async () => {
  mocks.login.mockResolvedValue({ getUid: () => 'other' });
  const { loginChat } = await import('@/lib/chat/sdk'); await expect(loginChat(session('first'))).rejects.toThrow('session changed'); expect(mocks.logout).toHaveBeenCalled();
});
it('cancels a pending initialization when the application logs out', async () => {
  let finish!: (value: null) => void; mocks.init.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const { loginChat } = await import('@/lib/chat/sdk'); const { clearLocalChat } = await import('@/lib/chat/lifecycle');
  const pending = loginChat(session('first')); const rejection = expect(pending).rejects.toThrow('session changed');
  await vi.waitFor(() => expect(mocks.init).toHaveBeenCalled());
  const cleared = clearLocalChat(); finish(null); await rejection; await cleared; expect(mocks.login).not.toHaveBeenCalled();
});
it('does not initialize when the feature flag is disabled', async () => {
  vi.stubEnv('NEXT_PUBLIC_ENABLE_CHAT', 'false'); const { loginChat } = await import('@/lib/chat/sdk');
  await expect(loginChat(session('first'))).rejects.toThrow('not configured'); expect(mocks.init).not.toHaveBeenCalled();
});
it('broadcasts logout without putting auth tokens in browser storage', async () => {
  const setItem = vi.fn(); vi.stubGlobal('localStorage', { setItem }); vi.stubGlobal('window', new EventTarget());
  const fetcher = vi.fn().mockResolvedValue(new Response()); vi.stubGlobal('fetch', fetcher);
  const { endChatSession } = await import('@/lib/chat/lifecycle'); await endChatSession();
  expect(fetcher).toHaveBeenCalledWith('/api/chat/logout', expect.objectContaining({ method: 'POST' }));
  expect(setItem).toHaveBeenCalledWith('skillbridge-chat-logout', expect.any(String)); expect(setItem.mock.calls.flat()).not.toContain('token');
});
