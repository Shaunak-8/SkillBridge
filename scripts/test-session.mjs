import nextEnv from '@next/env';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
nextEnv.loadEnvConfig(process.cwd());
// Opt-in, ignored file. Never print credentials or session cookies.
for (const line of readFileSync('.env.test.local', 'utf8').split(/\r?\n/)) {
  const equals = line.indexOf('=');
  if (equals > 0) process.env[line.slice(0, equals)] = line.slice(equals + 1);
}
const base = process.env.APP_URL;
const cookies = new Map();
let checks = 0;
async function request(path, body) {
  const response = await fetch(`${base}${path}`, {
    redirect: 'manual', method: body === undefined ? 'GET' : 'POST',
    headers: { origin: base, 'Content-Type': 'application/json', cookie: [...cookies].map(([k,v]) => `${k}=${v}`).join('; ') },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  for (const cookie of response.headers.getSetCookie()) {
    const pair = cookie.split(';')[0]; const index = pair.indexOf('=');
    if (/max-age=0/i.test(cookie) || !pair.slice(index+1)) cookies.delete(pair.slice(0,index));
    else cookies.set(pair.slice(0,index), pair.slice(index+1));
  }
  return response;
}
function pass(label) { checks++; console.log(`PASS: ${label}`); }
const login = await request('/api/auth/sign-in/email', { email: process.env.TEST_EMAIL, password: process.env.TEST_PASSWORD });
assert.equal(login.status, 200, 'Verified account login'); pass('verified email/password login');
assert.ok(login.headers.getSetCookie().some(c => /httponly/i.test(c)), 'Session must use HttpOnly cookies'); pass('HttpOnly session cookie');
const userSession = await (await request('/api/auth/get-session')).json();
assert.ok(userSession?.user?.id); assert.equal(userSession.user.emailVerified, true); pass('verified session restored from cookies');
// Simulate browser cache expiry without depending on the configured cache TTL.
cookies.delete('__Secure-neon-auth.local.session_data');
assert.ok((await (await request('/api/auth/get-session')).json())?.user?.id); pass('session persists after session-cache removal');
const continuation = await request('/auth/continue');
assert.equal(continuation.status, 307); pass('authenticated callback redirects');
const profileResponse = await request('/api/profile');
assert.equal(profileResponse.status, 200);
let profile = (await profileResponse.json()).profile;
assert.ok(profile?.auth_user_id); pass('callback creates a persistent profile');
if (!profile.onboarding_completed) {
  const forgedRole = await request('/api/profile', { username: profile.username, fullName: process.env.TEST_FULL_NAME, role: 'admin' });
  assert.equal(forgedRole.status, 400); pass('admin role self-selection blocked');
  const onboard = await request('/api/profile', { username: profile.username, fullName: process.env.TEST_FULL_NAME, role: process.env.TEST_ROLE });
  assert.equal(onboard.status, 200); assert.equal((await onboard.json()).redirect, `/${process.env.TEST_ROLE}/dashboard`); pass('student onboarding saved');
} else {
  assert.equal(profile.role, process.env.TEST_ROLE); pass('existing student onboarding preserved');
}
profile = (await (await request('/api/profile')).json()).profile;
const change = await request('/api/profile', { role: 'admin', auth_user_id: 'forged-account' });
assert.equal(change.status, 200); assert.equal((await change.json()).redirect, '/student/dashboard');
assert.equal((await (await request('/api/profile')).json()).profile.role, 'student'); pass('assigned role cannot be overwritten');
assert.equal((await request('/student/dashboard')).status, 200); pass('student dashboard authorized');
assert.equal((await request('/api/workspace/student')).status, 200); pass('student API authorized');
for (const role of ['business', 'admin']) {
  const response = await request(`/${role}/dashboard`); assert.equal(response.status, 307); assert.match(response.headers.get('location'), /student\/dashboard/); pass(`${role} dashboard denied to student`);
  assert.equal((await request(`/api/workspace/${role}`)).status, 403); pass(`${role} API denied to student`);
}
const duplicate = await request('/api/auth/sign-up/email', { name: profile.username.toUpperCase(), email: 'duplicate@example.invalid', password: process.env.TEST_PASSWORD });
assert.equal(duplicate.status, 409); pass('live duplicate username rejected case-insensitively');
if (!process.argv.includes('--skip-recovery')) {
  const recovery = await request('/api/auth/request-password-reset', { email: process.env.TEST_EMAIL, redirectTo: `${base}/reset-password` });
  assert.equal(recovery.status, 200); pass('real-account reset request accepted (inbox/link verification still required)');
}
const logout = await request('/api/auth/sign-out', {}); assert.equal(logout.status, 200); pass('authenticated logout');
await new Promise(resolve => setTimeout(resolve, 1100));
assert.equal(await (await request('/api/auth/get-session')).json(), null); pass('logout clears persistent session');
assert.equal((await request('/api/profile')).status, 401); pass('profile access denied after logout');
assert.equal((await request('/student/dashboard')).status, 307); pass('dashboard access denied after logout');
console.log(`${checks} authenticated live checks passed. Password-reset completion and Google consent are manual.`);
