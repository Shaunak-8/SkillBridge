import { apiError } from '@/lib/api';
import { createPortfolioItem, getMyProfile, listPortfolio } from '@/lib/students/service';
import { readJson, studentIdentity, studentMutationIdentity, validationFailed } from '@/lib/students/http';
import { validatePortfolioInput } from '@/lib/validation/student';

export async function GET() {
  try {
    const { profile } = await studentIdentity();
    return Response.json({ data: await listPortfolio((await getMyProfile(profile.id)).id) });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const { profile } = await studentMutationIdentity(request);
    const validation = validatePortfolioInput(await readJson(request));
    if (!validation.valid || !validation.sanitized) return validationFailed(validation.errors);
    const student = await getMyProfile(profile.id);
    return Response.json({ data: await createPortfolioItem(student.id, validation.sanitized), message: 'Portfolio project added successfully.' }, { status: 201 });
  } catch (error) { return apiError(error); }
}
