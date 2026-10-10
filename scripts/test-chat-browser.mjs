// Real CometChat SDK transport with isolated provider users. App chat responses
// are mocked for the fixture identities; Neon access policy has separate SQL tests.
import { chromium } from '@playwright/test';
import nextEnv from '@next/env';
import { readFileSync } from 'node:fs';
import { parse } from 'dotenv';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
nextEnv.loadEnvConfig(process.cwd());
const fixture = parse(readFileSync('.env.test.local'));
const base = new URL(process.env.APP_URL || 'https://localhost:3000').origin;
const remote = `https://${process.env.NEXT_PUBLIC_COMETCHAT_APP_ID}.api-${process.env.NEXT_PUBLIC_COMETCHAT_REGION?.toLowerCase()}.cometchat.io/v3`;
if (process.env.NEXT_PUBLIC_ENABLE_CHAT !== 'true') throw new Error('Enable local chat first.');
const suffix = randomUUID();
const users = [`sb-chat-ui-business-${suffix}`, `sb-chat-ui-student-${suffix}`, `sb-chat-ui-outsider-${suffix}`];
const names = ['Test business', 'Test applicant', 'Unrelated test user'];
const created = [];
const tokens = [];
const contexts = [];
let browser;
let step = 'fixture provisioning';
async function rest(method, path, body, actor) {
  const response = await fetch(`${remote}${path}`, { method, headers: {
    apikey: process.env.COMETCHAT_API_KEY, 'Content-Type': 'application/json', ...(actor ? { onBehalfOf: actor } : {}),
  }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(20000) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) throw Object.assign(new Error(`Fixture provider error (${response.status}).`), { status: response.status, code: data.error?.code });
  return data.data;
}
try {
  for (let i = 0; i < users.length; i++) {
    await rest('POST', '/users', { uid: users[i], name: names[i], role: 'skillbridge-member' }); created.push(users[i]);
    tokens[i] = (await rest('POST', `/users/${users[i]}/auth_tokens`, { force: true })).authToken;
  }
  for (let i = 0; i < 2; i++) await rest('POST', `/users/${users[i]}/friends`, { accepted: [users[1 - i]] });
  browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const pages = [];
  for (let i = 0; i < 2; i++) {
    step = `browser ${i + 1} setup`;
    const context = await browser.newContext({ ignoreHTTPSErrors: new URL(base).hostname === 'localhost' });
    contexts.push(context);
    const page = await context.newPage(); pages.push(page);
    await page.goto(`${base}/login`);
    await page.getByLabel('Email', { exact: true }).fill(fixture.TEST_EMAIL);
    await page.getByLabel('Password', { exact: true }).fill(fixture.TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL(url => url.pathname === `/${fixture.TEST_ROLE}/dashboard`, { timeout: 60000 });
    await page.route('**/api/chat/session', route => route.fulfill({ json: {
      uid: users[i], authToken: tokens[i], expiresAt: new Date(Date.now() + 1800000).toISOString(),
      projects: [], people: [{ id: users[1 - i], uid: users[1 - i], name: names[1 - i] }], syncPending: false,
    } }));
    await page.route('**/api/chat/logout', route => route.fulfill({ json: { success: true } }));
    await page.goto(`${base}/${fixture.TEST_ROLE}/messages`);
    await page.getByRole('button', { name: names[1 - i], exact: true }).first().click({ timeout: 60000 });
    await page.locator('[contenteditable="true"]').first().waitFor({ timeout: 30000 });
  }
  const outgoing = `Student question ${suffix}`;
  const reply = `Business reply ${suffix}`;
  async function send(page, text) {
    await page.locator('[contenteditable="true"]').first().fill(text);
    await page.locator('[contenteditable="true"]').first().press('Enter');
  }
  step = 'student sends to business';
  await send(pages[1], outgoing);
  await pages[0].getByText(outgoing, { exact: true }).first().waitFor({ timeout: 30000 });
  console.log('PASS: student message received in business browser through CometChat');
  step = 'business replies to student';
  await send(pages[0], reply);
  await pages[1].getByText(reply, { exact: true }).first().waitFor({ timeout: 30000 });
  console.log('PASS: business reply received in student browser through CometChat');
  step = 'reload retains history';
  let persisted = [];
  for (let i = 0; i < 10; i++) {
    persisted = await rest('GET', `/users/${users[0]}/messages`, undefined, users[1]);
    const result = JSON.stringify(persisted);
    if (result.includes(outgoing) && result.includes(reply)) break;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  const serialized = JSON.stringify(persisted);
  assert.ok(serialized.includes(outgoing) && serialized.includes(reply), 'Provider history must contain both messages');
  step = 'unrelated user cannot read conversation';
  const outsiderHistory = await rest('GET', `/users/${users[0]}/messages`, undefined, users[2]);
  assert.equal(outsiderHistory.length, 0);
  console.log('PASS: unrelated account cannot read student-business conversation');
  await pages[1].reload();
  step = 'reload conversation selection';
  await pages[1].getByRole('button', { name: names[0], exact: true }).first().click({ timeout: 60000 });
  step = 'reload reply history';
  const historyList = pages[1].locator('.cometchat-message-list');
  await historyList.getByText(reply, { exact: true }).first().waitFor({ timeout: 30000 });
  step = 'reload outgoing history';
  await historyList.getByText(outgoing, { exact: true }).first().waitFor({ timeout: 30000 });
  console.log('PASS: direct-message history survives reload');
  step = 'provider denies revoked relationship';
  for (let i = 0; i < 2; i++) await rest('DELETE', `/users/${users[i]}/friends`, { friends: [users[1 - i]] });
  let rejected = false;
  try { await rest('POST', '/messages', { receiver: users[0], receiverType: 'user', category: 'message', type: 'text', data: { text: 'Denied fixture message' } }, users[1]); }
  catch (error) { rejected = [400, 403].includes(error.status) && /FRIEND|PERMISSION|ACCESS|DENIED/.test(error.code || ''); }
  assert.ok(rejected);
  console.log('PASS: CometChat denies messaging after relationship removal');
} catch {
  console.error(`FAIL: ${step}. Raw browser/provider errors omitted to protect credentials.`);
  process.exitCode = 1;
} finally {
  for (const context of contexts) await context.request.post(`${base}/api/auth/sign-out`, { headers: { origin: base }, data: {} }).catch(() => {});
  await browser?.close();
  let cleanupFailed = false;
  for (const uid of created) {
    try { await rest('DELETE', `/users/${uid}`, { permanent: true }); }
    catch { cleanupFailed = true; }
  }
  if (cleanupFailed) { console.error(`Fixture cleanup needs attention: ${suffix}`); process.exitCode = 1; }
  else console.log('PASS: isolated provider users, tokens, and messages cleaned up');
}
