import { z } from 'zod';
import { businessApi, jsonBody } from '@/lib/business/http';
import { requireBusiness, getProject } from '@/lib/business/service';
import { refineProjectBrief } from '@/lib/ai/refining';

const refineSchema = z.object({
  projectId: z.string().optional(),
  userQuery: z.string().min(1, 'Please enter or speak a question.'),
  currentBrief: z.any().optional(),
});

export const POST = (request: Request) => businessApi(request, async owner => {
  const body = await jsonBody(request, refineSchema);
  await requireBusiness(owner);
  
  const project = body.projectId ? await getProject(owner, body.projectId) : null;
  const currentBrief = body.currentBrief || (project ? {
    title: project.title,
    summary: project.summary,
    problem_statement: project.problem_statement,
    category: project.category,
    deliverables: project.deliverables,
    required_skills: project.required_skills,
    budget_label: project.budget_label,
    timeline: project.timeline,
  } : {});

  const result = await refineProjectBrief(currentBrief, body.userQuery);
  return result;
});
