import { NextRequest } from 'next/server';
import { authConfigured, getAuth } from '@/lib/auth/server';
import { database } from '@/lib/db';
import { email, password, username } from '@/lib/auth/validation';
import { rateLimit, releaseSuccessfulLogin, sameOrigin } from '@/lib/auth/security';
import { ensureProfile } from '@/lib/auth/ensure-profile';
import { sessionResponse } from '@/lib/auth/session-response';

type Context = { params: Promise<{ path: string[] }> };
export async function GET(request: NextRequest, context: Context) {
  if (!authConfigured()) return Response.json({ message: 'Neon Auth setup is required.' }, { status: 503 });
  const path = (await context.params).path.join('/');
  if (!['get-session', 'list-accounts', 'verify-email'].includes(path)) return Response.json({ message: 'Unsupported operation.' }, { status: 404 });
  if (path === 'get-session') return sessionResponse(request);
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
    let signupUsername: string | undefined;
    if (path === 'sign-up/email') {
      body.email = email(body.email); password(body.password);
      signupUsername = username(body.name);
    }
    if (path === 'sign-in/email' || path === 'request-password-reset') body.email = email(body.email);
    if (path === 'reset-password') password(body.newPassword);
    // sameOrigin above validated this against server configuration. Keep the
    // callback on the browser's current deployment, including preview aliases.
    const origin = request.headers.get('origin')!;
    for (const key of ['callbackURL', 'newUserCallbackURL', 'errorCallbackURL', 'redirectTo']) {
      if (body[key] !== undefined && (typeof body[key] !== 'string' || new URL(body[key], origin).origin !== origin)) throw new Error('Invalid redirect.');
    }
    const identity = typeof body.email === 'string' ? body.email.trim().toLowerCase() : 'shared';
    if (path !== 'sign-out' && !await rateLimit(`global:${path}`, 'shared', 1000)) return Response.json({ message: 'Too many attempts. Try again later.' }, { status: 429 });
    if (path !== 'sign-out' && !await rateLimit(path, identity, identity === 'shared' ? 100 : 10)) return Response.json({ message: 'Too many attempts. Try again later.' }, { status: 429 });
    if (signupUsername) {
      const existing = await database()`SELECT id FROM skillbridge.profiles WHERE lower(username) = ${signupUsername}`;
      if (existing.length) return Response.json({ message: 'That username is taken. Choose another.' }, { status: 409 });
    }
    const headers = new Headers(request.headers);
    headers.delete('content-length');
    const normalizedRequest = new NextRequest(request.url, { method: request.method, headers, body: JSON.stringify(body) });
    const response = await getAuth().handler().POST(normalizedRequest, context);
    if (path === 'sign-in/email' && response.ok) {
      // Never discard a successful login/cookies because limiter storage failed.
      try { await releaseSuccessfulLogin(identity); }
      catch { console.warn('Could not release the successful login rate-limit attempt.'); }
    }
    if (path === 'email-otp/verify-email' && response.ok) {
      // A previously cached unverified user must not bounce back to verification.
      response.headers.append('Set-Cookie', '__Secure-neon-auth.local.session_data=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
    }
    if (path === 'sign-up/email' && response.ok) {
      const result = await response.clone().json();
      // Signup has already succeeded: do not discard its session cookies if
      // profile storage is temporarily unavailable. /auth/continue retries it.
      if (result.user?.id && result.user?.email) {
        try { await ensureProfile(result.user); }
        catch { console.warn('Signup profile creation deferred until authenticated continuation.'); }
      }
    }
    if (response.status === 429) return Response.json({ message: 'Too many attempts. Please wait before trying again.' }, { status: 429, headers: { 'Retry-After': response.headers.get('retry-after') || '60' } });
    if (response.status >= 500) return Response.json({ message: 'Authentication is temporarily unavailable. Please try again.' }, { status: 503 });
    if (path === 'request-password-reset' && response.status !== 429 && response.status !== 503) return Response.json({ message: 'If an account exists, a reset email will arrive shortly.' });
    if (path === 'sign-in/email' && !response.ok) return Response.json({ message: 'Unable to sign in. Check your details and email verification.' }, { status: 401 });
    if (path === 'sign-up/email' && !response.ok) return Response.json({ message: 'Unable to create an account. Try signing in or recovering your password.' }, { status: 400 });
    return response;
  } catch (error) {
    if (error instanceof SyntaxError) return Response.json({ message: 'Invalid request.' }, { status: 400 });
    if (error instanceof Error && /^(Use |Enter |Invalid redirect)/.test(error.message)) return Response.json({ message: error.message }, { status: 400 });
    return Response.json({ message: 'Authentication is temporarily unavailable. Please try again.' }, { status: 503 });
  }
}
