import { apiError, ApiFailure, requireApiIdentity } from '@/lib/api';
import { database } from '@/lib/db';
import { sameOrigin } from '@/lib/auth/security';
import { jsonBody, textField } from '@/lib/validation';

export async function PUT(request: Request) {
  try {
    if (!sameOrigin(request)) throw new ApiFailure(403, 'INVALID_ORIGIN', 'Invalid request origin.');
    const current = await requireApiIdentity();
    const body = await jsonBody(request);
    if (current.profile.role === 'business') {
      const name = textField(body.businessName, 200);
      const [profile] = await database()`INSERT INTO skillbridge.business_profiles(profile_id, business_name)
        VALUES (${current.profile.id}, ${name}) ON CONFLICT(profile_id) DO UPDATE
        SET business_name = EXCLUDED.business_name, updated_at = now() RETURNING *`;
      return Response.json({ profile });
    }
    if (current.profile.role !== 'student') throw new ApiFailure(403, 'FORBIDDEN', 'Access denied.');
    const bio = textField(body.bio, 5000);
    const [profile] = await database()`INSERT INTO skillbridge.student_profiles(profile_id, bio)
      VALUES (${current.profile.id}, ${bio}) ON CONFLICT(profile_id) DO UPDATE SET bio = EXCLUDED.bio, updated_at = now() RETURNING *`;
    return Response.json({ profile });
  } catch (error) { return apiError(error); }
}
