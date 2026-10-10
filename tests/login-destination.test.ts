import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { loginDestination } from '@/lib/auth/login-destination';
const request = vi.fn();
beforeEach(() => { request.mockReset(); vi.stubGlobal('fetch', request); });
afterEach(() => vi.unstubAllGlobals());
it.each(['student', 'business', 'admin'])('routes a verified %s directly to the correct dashboard', async role => {
  request.mockResolvedValueOnce(Response.json({ user: { id: 'user', emailVerified: true } }))
    .mockResolvedValueOnce(Response.json({ profile: { role, onboarding_completed: true } }));
  expect(await loginDestination('user')).toBe(`/${role}/dashboard`);
  expect(request.mock.calls.every(([, options]) => options.cache === 'no-store' && options.credentials === 'same-origin')).toBe(true);
});
it.each([null, { user: { id: 'different-user' } }])('does not navigate when the browser session is missing or mismatched', async session => {
  request.mockResolvedValueOnce(Response.json(session));
  await expect(loginDestination('user')).rejects.toThrow('did not save');
  expect(request).toHaveBeenCalledOnce();
});
it('keeps email verification mandatory', async () => {
  request.mockResolvedValueOnce(Response.json({ user: { id: 'user', emailVerified: false } }));
  expect(await loginDestination('user')).toBe('/verify-email');
  expect(request).toHaveBeenCalledOnce();
});
it('sends incomplete profiles to onboarding', async () => {
  request.mockResolvedValueOnce(Response.json({ user: { id: 'user', emailVerified: true } }))
    .mockResolvedValueOnce(Response.json({ profile: { onboarding_completed: false } }));
  expect(await loginDestination('user')).toBe('/onboarding');
});
it('recovers missing profiles through authenticated continuation', async () => {
  request.mockResolvedValueOnce(Response.json({ user: { id: 'user', emailVerified: true } }))
    .mockResolvedValueOnce(Response.json({ profile: null }));
  expect(await loginDestination('user')).toBe('/auth/continue');
});
it('does not navigate through a failed session check', async () => {
  request.mockResolvedValueOnce(Response.json({}, { status: 503 }));
  await expect(loginDestination('user')).rejects.toThrow('Unable to confirm');
});
it('does not turn a profile outage into an onboarding redirect', async () => {
  request.mockResolvedValueOnce(Response.json({ user: { id: 'user', emailVerified: true } }))
    .mockResolvedValueOnce(Response.json({}, { status: 503 }));
  await expect(loginDestination('user')).rejects.toThrow('profile could not be loaded');
});
