import { businessApi, jsonBody, projectId } from '@/lib/business/http';
import { versionSchema } from '@/lib/business/contracts';
import { publishDraft } from '@/lib/business/service';
export const POST = (request: Request, context: { params: Promise<{ id: string }> }) => businessApi(request, async owner => publishDraft(owner, projectId((await context.params).id), (await jsonBody(request, versionSchema)).brief_version));
