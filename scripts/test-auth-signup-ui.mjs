// Browser UI regression with mocked auth responses: creates no accounts and
// sends no email. Live SMTP/code delivery is a separate manual check.
import { chromium, webkit } from '@playwright/test';
import nextEnv from '@next/env';
import { existsSync } from 'node:fs';
import assert from 'node:assert/strict';

nextEnv.loadEnvConfig(process.cwd());
const base = new URL(process.env.APP_URL || 'https://localhost:3000').origin;
const useWebKit = process.env.AUTH_TEST_BROWSER === 'webkit';
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const executablePath = process.env.BROWSER_EXECUTABLE || (existsSync(chrome) ? chrome : undefined);
const browser = await (useWebKit ? webkit : chromium).launch({ headless: true, ...(!useWebKit && { executablePath }) });
const context = await browser.newContext({ ignoreHTTPSErrors: new URL(base).hostname === 'localhost' });
const page = await context.newPage();
const address = 'signup-ui@example.invalid';
let deliveryFails = false;
let signupRequests = 0;
let step = 'signup';
let checks = 0;
function pass() { checks++; console.log(`PASS (mocked provider): ${step}`); }
await page.route('**/api/auth/sign-up/email', async route => {
  signupRequests++;
  await route.fulfill({ json: { user: { id: 'ui-only-user', name: 'ui_test_user', email: address, emailVerified: false }, token: null } });
});
await page.route('**/api/auth/email-otp/send-verification-otp', async route => {
  assert.equal(route.request().postDataJSON().email, address);
  await route.fulfill({ status: deliveryFails ? 503 : 200, json: deliveryFails ? { message: 'Temporarily unavailable' } : { success: true } });
});
await page.route('**/api/auth/email-otp/verify-email', route => route.fulfill({ json: { user: { id: 'ui-only-user', email: address, emailVerified: true }, status: true } }));
async function signup() {
  await page.goto(`${base}/signup`);
  await page.locator('input[name=username]').fill('ui_test_user');
  await page.getByLabel('Email', { exact: true }).fill(address);
  await page.getByLabel('Password', { exact: true }).fill('UiFixturePassword123!');
  await page.getByLabel('Confirm password', { exact: true }).fill('UiFixturePassword123!');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await page.waitForURL(url => url.pathname === '/verify-email');
}
try {
  step = 'signup requests a verification code and retains the email';
  await signup();
  await page.waitForFunction(() => document.querySelector('input[name=email]')?.value === 'signup-ui@example.invalid');
  assert.equal(signupRequests, 1);
  pass();

  step = 'successful verification continues to login when no session was issued';
  await page.getByLabel('Verification code', { exact: true }).fill('123456');
  await page.getByRole('button', { name: 'Verify email', exact: true }).click();
  await page.waitForURL(url => url.pathname === '/login' && url.searchParams.get('verified') === '1');
  assert.ok(await page.getByText('Email verified. Sign in to open your workspace.').isVisible());
  pass();

  step = 'email delivery failure preserves signup and offers a code retry';
  deliveryFails = true;
  await signup();
  assert.equal(new URL(page.url()).searchParams.get('delivery'), 'retry');
  assert.ok(await page.getByText('Your account was created, but the code could not be sent.', { exact: false }).isVisible());
  deliveryFails = false;
  await page.getByRole('button', { name: 'Send a new code', exact: true }).click();
  await page.getByText('If verification is available for this account, a code will arrive shortly.').waitFor();
  pass();
  console.log(`${checks} signup/verification UI checks passed (${useWebKit ? 'WebKit' : 'Chrome'}, mocked delivery).`);
} catch {
  console.error(`FAIL: ${step}. Raw browser output omitted to avoid logging input values.`);
  process.exitCode = 1;
} finally { await browser.close(); }
