import { businessApi } from '@/lib/business/http';
import { listProjects } from '@/lib/business/service';
export const GET = (request: Request) => businessApi(request, listProjects);
