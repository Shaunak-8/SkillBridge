import { businessApi, jsonBody } from '@/lib/business/http';
import { businessSchema } from '@/lib/business/contracts';
import { getBusiness, saveBusiness } from '@/lib/business/service';
export const GET = (request: Request) => businessApi(request, getBusiness);
export const PATCH = (request: Request) => businessApi(request, async owner => saveBusiness(owner, await jsonBody(request, businessSchema)));
