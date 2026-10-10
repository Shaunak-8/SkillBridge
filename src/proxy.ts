import { NextRequest, NextResponse } from 'next/server';
import { authConfigured, getAuth } from '@/lib/auth/server';
import { sessionResponse } from '@/lib/auth/session-response';
import { applicationOrigin } from '@/lib/auth/security';
export default async function proxy(request: NextRequest) {
  const origin = new URL(applicationOrigin());
  // Next normalizes loopback IPs in nextUrl, but the browser's Host is unchanged.
  const incoming = new URL(request.url);
  incoming.host = request.headers.get('host') || incoming.host;
  // Local aliases have separate cookie jars. Always open auth on APP_URL.
  if (process.env.NODE_ENV === 'development' && ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)
    && ['localhost', '127.0.0.1', '[::1]'].includes(incoming.hostname)
    && incoming.origin !== origin.origin) {
    return NextResponse.redirect(new URL(request.nextUrl.pathname + request.nextUrl.search, origin));
  }
  if (['/signup', '/register', '/verify-email', '/forgot-password', '/reset-password'].includes(request.nextUrl.pathname)) return NextResponse.next();
  if (request.nextUrl.pathname === '/login' && (!authConfigured() || !request.cookies.has('__Secure-neon-auth.session_token'))) return NextResponse.next();
  if (!authConfigured()) return NextResponse.redirect(new URL('/login', request.url));
  const middleware = getAuth().middleware({ loginUrl: '/login' });
  // Keep the provider's OAuth verifier exchange intact.
  if (request.nextUrl.searchParams.has('neon_auth_session_verifier')
    || !request.cookies.has('__Secure-neon-auth.session_token')) return middleware(request);

  // The SDK middleware maps an upstream outage to a login redirect. Check first
  // so we retain the cookie and show a retryable error instead of a false logout.
  const session = await sessionResponse(request);
  if (session.status === 401) return middleware(request);
  if (!session.ok) return new NextResponse('Authentication is temporarily unavailable. Please reload this page in a moment.', {
    status: session.status === 429 ? 429 : 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'private, no-store', 'Retry-After': '3' },
  });
  const refreshed = new NextResponse(null, { headers: session.headers });
  for (const cookie of refreshed.cookies.getAll()) request.cookies.set(cookie.name, cookie.value);
  const response = await middleware(request);
  // Forward refreshed cookies to both the render and the browser.
  for (const cookie of session.headers.getSetCookie()) response.headers.append('Set-Cookie', cookie);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
export const config = { matcher: ['/student/:path*', '/business/:path*', '/admin/:path*', '/onboarding', '/auth/continue', '/login', '/signup', '/register', '/verify-email', '/forgot-password', '/reset-password'] };
