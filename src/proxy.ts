import { NextRequest, NextResponse } from 'next/server';
import { authConfigured, getAuth } from '@/lib/auth/server';
export default async function proxy(request: NextRequest) {
  if (!authConfigured()) return NextResponse.redirect(new URL('/login', request.url));
  return getAuth().middleware({ loginUrl: '/login' })(request);
}
export const config = { matcher: ['/student/:path*', '/business/:path*', '/admin/:path*', '/onboarding', '/auth/continue'] };
