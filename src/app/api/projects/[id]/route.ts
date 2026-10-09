import { businessApi, jsonBody, projectId } from '@/lib/business/http';
import { editSchema } from '@/lib/business/contracts';
import { getProject, editDraft } from '@/lib/business/service';
type Context = { params: Promise<{ id: string }> };
export const GET = (request: Request, context: Context) => businessApi(request, async owner => getProject(owner, projectId((await context.params).id)));
export const PATCH = (request: Request, context: Context) => businessApi(request, async owner => editDraft(owner, projectId((await context.params).id), await jsonBody(request, editSchema)));
