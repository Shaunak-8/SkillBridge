// Opt-in live auth regression: no profile changes, email sends, screenshots,
// traces, or credential logging. Only this browser's sessions are signed out.
import { chromium, webkit } from '@playwright/test';
import nextEnv from '@next/env';
import { readFileSync, existsSync } from 'node:fs';
import { parse } from 'dotenv';
import assert from 'node:assert/strict';

nextEnv.loadEnvConfig(process.cwd());
const test = parse(readFileSync('.env.test.local'));
const base = new URL(process.env.APP_URL || 'http://localhost:3000').origin;
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const executablePath = process.env.BROWSER_EXECUTABLE || (existsSync(chrome) ? chrome : undefined);
const useWebKit = process.env.AUTH_TEST_BROWSER === 'webkit';
const browser = await (useWebKit ? webkit : chromium).launch({ headless: true, ...(!useWebKit && { executablePath }) });
// Only the isolated test context bypasses trust for our self-signed local cert.
const localHttps = base.startsWith('https://') && ['localhost', '127.0.0.1'].includes(new URL(base).hostname);
const context = await browser.newContext({ ignoreHTTPSErrors: localHttps });
const page = await context.newPage();
const dashboard = `/${test.TEST_ROLE}/dashboard`;
let step = 'anonymous protection';
let checks = 0;
function pass() { checks++; console.log(`PASS: ${step}`); }
try {
  await page.goto(`${base}${dashboard}`);
  assert.equal(new URL(page.url()).pathname, '/login');
  assert.equal((await context.request.get(`${base}/api/profile`)).status(), 401);
  pass();
  for (let cycle = 1; cycle <= 3; cycle++) {
    step = `browser sign-in ${cycle}`;
    await page.goto(`${base}/login`);
    await page.getByLabel('Email', { exact: true }).fill(test.TEST_EMAIL);
    await page.getByLabel('Password', { exact: true }).fill(test.TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL(url => url.pathname === dashboard, { timeout: 60000 });
    await page.getByRole('button', { name: 'Log out', exact: true }).waitFor();
    pass();

    step = `signed-in login page redirects to dashboard ${cycle}`;
    await page.goto(`${base}/login`);
    await page.waitForURL(url => url.pathname === dashboard, { timeout: 30000 });
    pass();

    step = `client-side protected navigation ${cycle}`;
    await page.locator(`a[href="/${test.TEST_ROLE}/projects"]`).first().click();
    await page.waitForURL(url => url.pathname === `/${test.TEST_ROLE}/projects`);
    await page.locator(`a[href="${dashboard}"]`).first().click();
    await page.waitForURL(url => url.pathname === dashboard);
    pass();

    step = `session survives reload and cache renewal ${cycle}`;
    await context.clearCookies({ name: '__Secure-neon-auth.local.session_data' });
    await page.reload();
    assert.equal(new URL(page.url()).pathname, dashboard);
    assert.equal((await context.request.get(`${base}/api/profile`)).status(), 200);
    const cookies = await context.cookies();
    const cache = cookies.find(c => c.name === '__Secure-neon-auth.local.session_data');
    assert.ok(cache?.httpOnly && cache.secure && cache.expires > Date.now() / 1000 + 5);
    pass();

    step = `new tab restores session ${cycle}`;
    const tab = await context.newPage();
    await tab.goto(`${base}${dashboard}`);
    assert.equal(new URL(tab.url()).pathname, dashboard);
    pass();

    step = `logout denies access in both tabs ${cycle}`;
    await page.getByRole('button', { name: 'Log out', exact: true }).click();
    await page.waitForURL(url => url.pathname === '/login', { timeout: 30000 });
    await tab.reload();
    assert.equal(new URL(tab.url()).pathname, '/login');
    assert.equal((await context.request.get(`${base}/api/profile`)).status(), 401);
    await tab.close();
    pass();
  }
  console.log(`${checks} live browser auth checks passed.`);
} catch {
  // Playwright errors can contain input values. Never print the raw exception.
  console.error(`FAIL: ${step}. Inspect the local app; credentials and cookies were not logged.`);
  process.exitCode = 1;
} finally {
  await context.request.post(`${base}/api/auth/sign-out`, { headers: { origin: base }, data: {} }).catch(() => {});
  await browser.close();
}
