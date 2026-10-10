import 'server-only';
import type { NextRequest } from 'next/server';
import { getAuth } from './server';

// Retry only this read, never sign-in, signup, or other auth mutations.
export async function sessionResponse(request: NextRequest) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await getAuth().handler().GET(request, {
        params: Promise.resolve({ path: ['get-session'] }),
      });
      if (response.status < 500) {
        response.headers.set('Cache-Control', 'private, no-store');
        return response;
      }
    } catch { /* A transport failure is not an invalid session. */ }
  }
  return Response.json({ message: 'Authentication is temporarily unavailable. Please retry.' }, {
    status: 503, headers: { 'Cache-Control': 'private, no-store', 'Retry-After': '3' },
  });
}
