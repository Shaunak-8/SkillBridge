import 'server-only';
import { ApiFailure, requireApiIdentity } from '@/lib/api';
import { getAuth } from '@/lib/auth/server';
import { sameOrigin } from '@/lib/auth/security';
import { serverChatConfig } from './rest';
export async function chatIdentity(request?: Request) {
  if (request && !sameOrigin(request)) throw new ApiFailure(403, 'BAD_ORIGIN', 'Access denied.');
  const current = await requireApiIdentity();
  if (!['student', 'business'].includes(current.profile.role)) throw new ApiFailure(403, 'FORBIDDEN', 'Access denied.');
  serverChatConfig();
  const { data, error } = await getAuth().getSession();
  if (error || !data?.session || data.user.id !== current.user.id) throw new ApiFailure(401, 'UNAUTHENTICATED', 'Sign in required.');
  const expiresAt = new Date(data.session.expiresAt);
  if (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) throw new ApiFailure(401, 'UNAUTHENTICATED', 'Sign in required.');
  return { ...current, sessionId: data.session.id, sessionExpiry: expiresAt };
}
export function chatResponse(data: unknown) { return Response.json(data, { headers: { 'Cache-Control': 'no-store, private' } }); }
