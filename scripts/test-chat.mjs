import nextEnv from '@next/env';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
nextEnv.loadEnvConfig(process.cwd());
if (process.env.NEXT_PUBLIC_ENABLE_CHAT !== 'true') throw new Error('Run with NEXT_PUBLIC_ENABLE_CHAT=true against the enabled test server.');
const appId = process.env.NEXT_PUBLIC_COMETCHAT_APP_ID;
const region = process.env.NEXT_PUBLIC_COMETCHAT_REGION?.toLowerCase();
const apiKey = process.env.COMETCHAT_API_KEY;
const base = process.env.APP_URL || 'http://localhost:3000';
const remote = `https://${appId}.api-${region}.cometchat.io/v3`;
let checks = 0;
function pass(label) { checks++; console.log(`PASS: ${label}`); }
async function rest(method, path, body, actor) {
  const response = await fetch(`${remote}${path}`, { method, headers: { apikey: apiKey, 'Content-Type': 'application/json', ...(actor ? { onBehalfOf: actor } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(15000) });
  const result = await response.json();
  return { ok: response.ok && !result.error, status: response.status, data: result.data, code: result.error?.code };
}
async function ok(method, path, body, actor) {
  const result = await rest(method, path, body, actor);
  if (!result.ok) throw new Error(`CometChat fixture operation failed (${result.status}, ${result.code || 'UNKNOWN'}).`);
  return result.data;
}
for (const [path, method] of [['/api/chat/session', 'GET'], ['/api/chat/session', 'POST'], ['/api/chat/logout', 'POST']]) {
  const response = await fetch(`${base}${path}`, { method, headers: { origin: new URL(base).origin } });
  assert.equal(response.status, 401); pass(`anonymous ${method} ${path} denied`);
}
const forged = await fetch(`${base}/api/chat/sync`, { method: 'POST', headers: { authorization: 'Bearer forged' } });
assert.equal(forged.status, 401); pass('forged maintenance key denied');
const csrf = await fetch(`${base}/api/chat/session`, { method: 'POST', headers: { origin: 'https://evil.example' } });
assert.equal(csrf.status, 403); pass('cross-origin token request denied');
let synchronized;
for (let attempt = 0; attempt < 40; attempt++) {
  synchronized = await fetch(`${base}/api/chat/sync`, { method: 'POST', headers: { authorization: `Bearer ${process.env.COMETCHAT_SYNC_SECRET}` } });
  if (synchronized.status !== 409) break;
  await new Promise(resolve => setTimeout(resolve, 3000));
}
assert.equal(synchronized.status, 200); pass('real Neon membership sync succeeds');
const permissions = (await ok('GET', '/roles/skillbridge-member/permissions')).permissions;
assert.equal(permissions.createGroup, 'deny'); assert.equal(permissions.joinGroup, 'deny'); assert.equal(permissions['sendMessage.mode'], 'friends'); pass('provider enforces restricted messaging role');
assert.equal(permissions['listMessages.mode'], 'all');
assert.deepEqual(permissions['sendMessage.allowedReceiverTypes'], ['user']);
assert.deepEqual(permissions['listMessages.allowedReceiverTypes'], ['user']); pass('history enabled only for direct conversations');

// Isolated CometChat fixtures only; never send test messages to real project participants.
const suffix = randomUUID();
const users = ['owner', 'student', 'outsider'].map(name => `sb-chat-test-${name}-${suffix}`);
const created = [];
const tokens = [];
try {
  for (const uid of users) { await ok('POST', '/users', { uid, name: 'SkillBridge chat test', role: 'skillbridge-member' }); created.push(uid); }
  const [owner, student, outsider] = users;
  await ok('POST', `/users/${owner}/friends`, { accepted: [student] });
  await ok('POST', `/users/${student}/friends`, { accepted: [owner] });
  const direct = await ok('POST', '/messages', { receiver: student, receiverType: 'user', category: 'message', type: 'text', data: { text: 'Isolated integration test DM' } }, owner);
  assert.equal(direct.sender, owner); assert.equal(direct.receiver, student); pass('authorized one-to-one message sent');
  const denied = await rest('POST', '/messages', { receiver: outsider, receiverType: 'user', category: 'message', type: 'text', data: { text: 'This must be denied' } }, owner);
  assert.equal(denied.ok, false); pass('unrelated one-to-one message rejected by CometChat');
  const reply = await ok('POST', '/messages', { receiver: owner, receiverType: 'user', category: 'message', type: 'text', data: { text: 'Isolated student reply' } }, student);
  assert.equal(reply.sender, student); pass('student can message the business');
  const history = await ok('GET', `/users/${owner}/messages`, undefined, student);
  assert.ok([direct.id, reply.id].every(id => history.some(message => String(message.id) === String(id)))); pass('both direct messages retained in history');
  const privateHistory = await ok('GET', `/users/${owner}/messages`, undefined, outsider);
  assert.equal(privateHistory.length, 0); pass('unrelated account cannot retrieve conversation history');
  const token = await ok('POST', `/users/${student}/auth_tokens`, { force: true });
  assert.ok(token.authToken); tokens.push({ uid: student, token: token.authToken }); pass('server token provisioning works for restricted user');
  await ok('DELETE', `/users/${owner}/friends`, { friends: [student] });
  await ok('DELETE', `/users/${student}/friends`, { friends: [owner] });
  const revoked = await rest('POST', '/messages', { receiver: student, receiverType: 'user', category: 'message', type: 'text', data: { text: 'This must be denied after revocation' } }, owner);
  assert.equal(revoked.ok, false); pass('revoked direct-message relationship cannot send');
} finally {
  let failed = false;
  for (const token of tokens) {
    const result = await rest('DELETE', `/users/${token.uid}/auth_tokens/${encodeURIComponent(token.token)}`); failed ||= !result.ok;
  }
  // Do not short-circuit cleanup after one failure.
  for (const uid of created) { const result = await rest('DELETE', `/users/${uid}`, { permanent: true }); if (!result.ok) failed = true; }
  if (failed) throw new Error(`Chat fixture cleanup requires attention; fixture suffix ${suffix}. No real project data was targeted.`);
  pass('isolated test users, messages and auth tokens cleaned up');
}
console.log(`${checks} live CometChat REST checks passed. Run test:chat:browser for SDK send/receive; attachment UX uses the manual checklist.`);
