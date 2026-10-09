import { NextRequest } from 'next/server';
import { authConfigured, getAuth } from '@/lib/auth/server';
import { database } from '@/lib/db';
import { email, password, username } from '@/lib/auth/validation';
import { rateLimit, sameOrigin } from '@/lib/auth/security';
import { ensureProfile } from '@/lib/auth/ensure-profile';

type Context = { params: Promise<{ path: string[] }> };
export async function GET(request: NextRequest, context: Context) {
  if (!authConfigured()) return Response.json({ message: 'Neon Auth setup is required.' }, { status: 503 });
  const path = (await context.params).path.join('/');
  if (!['get-session', 'list-accounts', 'verify-email'].includes(path)) return Response.json({ message: 'Unsupported operation.' }, { status: 404 });
  try { return await getAuth().handler().GET(request, context); }
  catch { return Response.json({ message: 'Authentication is temporarily unavailable.' }, { status: 503 }); }
}
export async function POST(request: NextRequest, context: Context) {
  if (!sameOrigin(request)) return Response.json({ message: 'Invalid request origin.' }, { status: 403 });
  if (!authConfigured()) return Response.json({ message: 'Neon Auth setup is required.' }, { status: 503 });
  const path = (await context.params).path.join('/');
  // Do not expose the managed admin APIs or role-changing helpers through this app.
  const allowed = ['sign-up/email', 'sign-in/email', 'sign-in/social', 'sign-out', 'request-password-reset', 'reset-password', 'send-verification-email', 'verify-email', 'link-social', 'list-accounts', 'unlink-account', 'email-otp/send-verification-otp', 'email-otp/verify-email'];
  if (!allowed.includes(path)) return Response.json({ message: 'Unsupported operation.' }, { status: 404 });
  try {
    const raw = await request.clone().text();
    if (raw.length > 16384) return Response.json({ message: 'Request is too large.' }, { status: 413 });
    const body = raw ? JSON.parse(raw) : {};
    if (!body || typeof body !== 'object' || Array.isArray(body)) return Response.json({ message: 'Invalid request.' }, { status: 400 });
    if (path === 'sign-up/email') {
      email(body.email); password(body.password);
      const name = username(body.name);
      const existing = await database()`SELECT id FROM skillbridge.profiles WHERE lower(username) = ${name}`;
      if (existing.length) return Response.json({ message: 'That username is taken. Choose another.' }, { status: 409 });
    }
    if (path === 'sign-in/email' || path === 'request-password-reset') email(body.email);
    if (path === 'reset-password') password(body.newPassword);
    for (const key of ['callbackURL', 'newUserCallbackURL', 'errorCallbackURL', 'redirectTo']) {
      if (body[key] && new URL(body[key], process.env.APP_URL).origin !== new URL(process.env.APP_URL!).origin) throw new Error('Invalid redirect.');
    }
    const identity = typeof body.email === 'string' ? body.email.toLowerCase() : 'shared';
    if (path !== 'sign-out' && !await rateLimit(`global:${path}`, 'shared', 1000)) return Response.json({ message: 'Too many attempts. Try again later.' }, { status: 429 });
    if (path !== 'sign-out' && !await rateLimit(path, identity, identity === 'shared' ? 100 : 10)) return Response.json({ message: 'Too many attempts. Try again later.' }, { status: 429 });
    const response = await getAuth().handler().POST(request, context);
    if (path === 'sign-up/email' && response.ok) {
      const result = await response.clone().json();
      if (result.user?.id && result.user?.email) await ensureProfile(result.user);
    }
    if (path === 'request-password-reset' && response.status !== 429 && response.status !== 503) return Response.json({ message: 'If an account exists, a reset email will arrive shortly.' });
    if (path === 'sign-in/email' && !response.ok) return Response.json({ message: 'Unable to sign in. Check your details and email verification.' }, { status: response.status >= 500 ? 503 : 401 });
    if (path === 'sign-up/email' && !response.ok) return Response.json({ message: 'Unable to create an account. Try signing in or recovering your password.' }, { status: 400 });
    return response;
  } catch (error) {
    if (error instanceof SyntaxError) return Response.json({ message: 'Invalid request.' }, { status: 400 });
    if (error instanceof Error && /^(Use |Enter |Invalid redirect)/.test(error.message)) return Response.json({ message: error.message }, { status: 400 });
    return Response.json({ message: 'Authentication is temporarily unavailable. Please try again.' }, { status: 503 });
  }
}
