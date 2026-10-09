import { apiError } from '@/lib/api';
import { getMyProfile, updateMyProfile } from '@/lib/students/service';
import { readJson, studentIdentity, studentMutationIdentity, validationFailed } from '@/lib/students/http';
import { validateProfileUpdate } from '@/lib/validation/student';

export async function GET() {
  try {
    const { profile } = await studentIdentity();
    return Response.json({ data: await getMyProfile(profile.id) });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request) {
  try {
    const { profile } = await studentMutationIdentity(request);
    const validation = validateProfileUpdate(await readJson(request));
    if (!validation.valid || !validation.sanitized) return validationFailed(validation.errors);
    return Response.json({ data: await updateMyProfile(profile.id, validation.sanitized), message: 'Profile updated successfully.' });
  } catch (error) { return apiError(error); }
}
