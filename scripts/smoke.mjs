import assert from 'node:assert/strict';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const base = process.env.APP_URL || 'http://localhost:3000';
const syntheticEmail = `skillbridge-test-${Date.now()}@example.invalid`;
let checks = 0;
async function check(label, path, status, options = {}) {
  const response = await fetch(`${base}${path}`, { redirect: 'manual', ...options });
  assert.equal(response.status, status, `${label}: ${response.status}`);
  console.log(`PASS: ${label}`); checks++;
  return response;
}
const post = body => ({ method: 'POST', headers: { origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
for (const page of ['/', '/signup', '/login', '/forgot-password', '/reset-password', '/verify-email']) await check(`page ${page}`, page, 200);
for (const page of ['/student/dashboard', '/business/dashboard', '/admin/dashboard', '/onboarding']) {
  const response = await check(`anonymous redirect ${page}`, page, 307);
  assert.match(response.headers.get('location'), /\/login/);
}
await check('anonymous profile denied', '/api/profile', 401);
await check('anonymous workspace API denied', '/api/workspace/student', 401);
await check('anonymous profile write denied', '/api/profile', 401, post({ role: 'admin' }));
await check('cross-origin profile blocked', '/api/profile', 403, { ...post({}), headers: { origin: 'https://evil.example', 'Content-Type': 'application/json' } });
await check('cross-origin login blocked', '/api/auth/sign-in/email', 403, { ...post({}), headers: { origin: 'https://evil.example', 'Content-Type': 'application/json' } });
await check('weak signup password blocked', '/api/auth/sign-up/email', 400, post({ name: 'test_user', email: syntheticEmail, password: 'short' }));
await check('invalid username blocked', '/api/auth/sign-up/email', 400, post({ name: 'x', email: syntheticEmail, password: 'LongPassword123!' }));
await check('unknown email login generic error', '/api/auth/sign-in/email', 401, post({ email: syntheticEmail, password: 'LongPassword123!' }));
await check('recovery generic response', '/api/auth/request-password-reset', 200, post({ email: syntheticEmail, redirectTo: `${base}/reset-password` }));
await check('external callback blocked', '/api/auth/sign-in/social', 400, post({ provider: 'google', callbackURL: 'https://evil.example' }));
await check('managed admin endpoint blocked', '/api/auth/admin/set-role', 404, post({ role: 'admin' }));
const session = await check('anonymous managed session', '/api/auth/get-session', 200);
assert.equal(await session.json(), null);
const google = await check('Google OAuth authorization initiated', '/api/auth/sign-in/social', 200, post({ provider: 'google', callbackURL: `${base}/auth/continue` }));
const googleResult = await google.json();
assert.ok(googleResult.url, 'Google authorization URL must be returned');
console.log('OAuth authorization origin:', new URL(googleResult.url).origin);
assert.ok(['accounts.google.com', new URL(process.env.NEON_AUTH_BASE_URL || base).hostname].includes(new URL(googleResult.url).hostname), 'Unexpected OAuth redirect host');
console.log(`${checks} live HTTP smoke checks passed. No test accounts were created. Google consent and email delivery require manual verification.`);
