import { ApiFailure, apiError } from '@/lib/api';
import { embedStudentByProfile, scheduleEmbedding } from '@/lib/ai/embed-records';
import { deletePortfolioItem, getMyProfile, updatePortfolioItem } from '@/lib/students/service';
import { readJson, studentMutationIdentity, validationFailed } from '@/lib/students/http';
import { isUuid } from '@/lib/ws5/guard';
import { validatePortfolioInput } from '@/lib/validation/student';

type Ctx = { params: Promise<{ itemId: string }> };
const notFound = () => new ApiFailure(404, 'NOT_FOUND', 'Portfolio item not found.');

async function ownedItemId({ params }: Ctx) {
  const { itemId } = await params;
  if (!isUuid(itemId)) throw notFound();
  return itemId;
}

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const { profile } = await studentMutationIdentity(request);
    const itemId = await ownedItemId(ctx);
    const validation = validatePortfolioInput(await readJson(request));
    if (!validation.valid || !validation.sanitized) return validationFailed(validation.errors);
    const student = await getMyProfile(profile.id);
    const updated = await updatePortfolioItem(student.id, itemId, validation.sanitized);
    if (!updated) throw notFound();
    scheduleEmbedding(() => embedStudentByProfile(profile.id));
    return Response.json({ data: updated, message: 'Portfolio item updated successfully.' });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request, ctx: Ctx) {
  try {
    const { profile } = await studentMutationIdentity(request);
    const itemId = await ownedItemId(ctx);
    const student = await getMyProfile(profile.id);
    if (!(await deletePortfolioItem(student.id, itemId))) throw notFound();
    scheduleEmbedding(() => embedStudentByProfile(profile.id));
    return Response.json({ success: true, message: 'Portfolio project deleted successfully.' });
  } catch (error) { return apiError(error); }
}
