import { businessApi, jsonBody, BusinessError } from '@/lib/business/http';
import { generationSchema } from '@/lib/business/contracts';
import { requireBusiness, getProject, saveGenerated } from '@/lib/business/service';
import { generateBrief } from '@/lib/business/generation';
export const POST = (request: Request) => businessApi(request, async owner => {
  const input = await jsonBody(request, generationSchema);
  const business = await requireBusiness(owner);
  const project = input.project_id ? await getProject(owner,input.project_id) : undefined;
  if (project && (project.status !== 'draft' || project.brief_version !== input.brief_version)) throw new BusinessError(409,'STALE_DRAFT','Reload the latest draft before creating another brief.');
  const generated = await generateBrief({ problem: input.problem, preferred_language: input.preferred_language }, project ?? { category: business.business_type, location_text: business.location });
  return saveGenerated(owner,generated.brief,generated.questions,project);
});
