import assert from 'node:assert/strict';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const base = process.env.APP_URL || 'http://localhost:3000';
const demoId = '00000000-0000-4000-8000-000000000001';
let checks = 0;
async function check(path, status, method = 'GET', body) {
  const response = await fetch(`${base}${path}`, { method, redirect: 'manual', headers: { origin: base, 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  assert.equal(response.status, status, `${method} ${path}`);
  checks++; console.log(`PASS: ${method} ${path} (${status})`);
  return response;
}
const list = await (await check('/api/projects', 200)).json();
assert.ok(list.items.some(project => project.id === demoId), 'Neon demo project must be discoverable');
assert.ok(list.items.every(project => project.status === 'published'), 'Only published projects are public');
assert.equal((await (await check(`/api/projects/${demoId}`, 200)).json()).project.ownerConfirmed, true);
assert.match(await (await check('/projects', 200)).text(), /Build a café website/);
assert.match(await (await check(`/projects/${demoId}`, 200)).text(), /Build a café website/);
await check('/api/projects?limit=101', 400);
await check('/api/projects/not-a-uuid', 400);
await check('/api/applications', 401);
await check('/api/applications', 401, 'POST', { projectId: demoId, coverNote: 'Hello' });
await check('/api/projects', 401, 'POST', { title: 'Unauthorized' });
await check(`/api/projects/${demoId}`, 401, 'PATCH', { action: 'confirm' });
await check('/api/domain-profile', 401, 'PUT', { businessName: 'Unauthorized' });
await check('/api/applications/00000000-0000-4000-8000-000000000002', 401, 'PATCH', { status: 'accepted' });
await check(`/api/projects/${demoId}/questions`, 401);
await check(`/api/projects/${demoId}/answers`, 401, 'POST', { questionId: demoId, answerText: 'Unauthorized' });
await check(`/api/projects/${demoId}/brief`, 401, 'PATCH', { title: 'Unauthorized edit' });
await check(`/api/projects/${demoId}/confirm`, 401, 'POST', { briefVersion: 1 });
await check(`/business/projects/${demoId}/verify`, 307);
console.log(`${checks} live backend HTTP integration checks passed.`);
