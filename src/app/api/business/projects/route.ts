import { businessApi, jsonBody } from '@/lib/business/http';
import { briefSchema } from '@/lib/business/contracts';
import { createDraft, listProjects } from '@/lib/business/service';
export const GET = (request: Request) => businessApi(request, listProjects);
export const POST = (request: Request) => businessApi(request, async owner => createDraft(owner, await jsonBody(request, briefSchema)));
