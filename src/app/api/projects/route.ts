import { businessApi, jsonBody } from '@/lib/business/http';
import { briefSchema } from '@/lib/business/contracts';
import { createDraft } from '@/lib/business/service';
export const POST = (request: Request) => businessApi(request, async owner => createDraft(owner, await jsonBody(request, briefSchema)));
