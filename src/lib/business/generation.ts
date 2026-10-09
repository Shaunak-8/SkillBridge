import 'server-only';
import { BusinessError } from './http';
import { generateProjectDraft } from '@/lib/ai/generator';
import { generateInputSchema } from '@/lib/ai/schemas';
import { briefSchema } from './contracts';
import type { z } from 'zod';
import type { problemSchema, BriefInput } from './contracts';
export async function generateBrief(input: z.infer<typeof problemSchema>, defaults: Partial<BriefInput> = {}): Promise<{ brief: BriefInput; questions: string[] }> {
  const result = await generateProjectDraft(generateInputSchema.parse({ rawProblemText: input.problem, preferredLanguage: input.preferred_language, category: defaults.category, format: defaults.mode }));
  if (result.isFallback) throw new BusinessError(503, 'GENERATION_UNAVAILABLE', 'We could not create your project brief right now. Your text is safe. Please try again, or write a draft yourself.');
  const d = result.draft;
  return { brief: briefSchema.parse({ title: d.title, problem_statement: d.problem_statement, summary: d.business_goal,
    category: d.category, deliverables: d.proposed_deliverables, required_skills: d.required_skills.map(s => s.skillName),
    budget_label: d.budget_range ?? '', timeline: d.timeline ?? '', preferred_language: input.preferred_language,
    location_text: defaults.location_text ?? '', remote_ok: defaults.remote_ok ?? false, mode: d.mode, compensation: defaults.compensation ?? 'negotiable' }),
    questions: d.open_questions.slice(0, 20) };
}
