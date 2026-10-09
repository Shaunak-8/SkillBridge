import { z } from 'zod';

export const languages = [{ value: 'en', label: 'English' }] as const;
export const statuses = ['draft', 'published', 'in_progress', 'completed', 'closed', 'cancelled'] as const;
const text = (max: number) => z.string().trim().max(max);
export const businessSchema = z.object({
  business_name: text(120).min(1, 'Please enter your business name.'),
  business_type: text(100).min(1, 'Please enter your business category.'),
  location: text(200),
  preferred_language: z.enum(['en']),
}).strict();
export const problemSchema = z.object({ problem: text(4000).min(10, 'Please describe the problem in at least 10 characters.'), preferred_language: z.enum(['en']) }).strict();
export const generationSchema = problemSchema.extend({ project_id: z.uuid().optional(), brief_version: z.number().int().positive().optional() }).refine(v => !!v.project_id === !!v.brief_version, 'Project ID and version must be supplied together.');
const items = z.array(text(500).min(1)).max(20);
export const briefSchema = z.object({
  title: text(160), summary: text(2000), problem_statement: text(5000).min(1, 'Please describe your problem.'),
  category: text(100), deliverables: items, required_skills: items,
  budget_label: text(200), timeline: text(200), preferred_language: z.enum(['en']),
  location_text: text(200), remote_ok: z.boolean(), mode: z.enum(['individual', 'team']),
  compensation: z.enum(['unpaid', 'paid', 'negotiable']),
}).strict();
export const editSchema = briefSchema.extend({ brief_version: z.number().int().positive() });
export type BusinessInput = z.infer<typeof businessSchema>;
export type BriefInput = z.infer<typeof briefSchema>;
export type EditInput = z.infer<typeof editSchema>;
export type BusinessProfile = BusinessInput & { profile_id: string; created_at: string; updated_at: string };
export type Question = { id: string; question: string; required: boolean; position: number; answer: string | null; type?: 'short_text' | 'yes_no' | 'multiple_choice'; options?: string[] };
export type BusinessProject = BriefInput & {
  id: string; status: typeof statuses[number]; owner_confirmed: boolean; brief_version: number;
  confirmed_version: number | null; created_at: string; updated_at: string; published_at: string | null;
  application_count: number; questions: Question[];
};
export type ApiErrorBody = { error: { code: string; message: string; fields?: Record<string, string> } };
export function publicationIssues(brief: BriefInput): string[] {
  return [!brief.title.trim() && 'Add a project title.', !brief.summary.trim() && 'Add your project goals.',
    !brief.problem_statement.trim() && 'Describe your problem.', !brief.deliverables.length && 'Add at least one deliverable.',
    !brief.required_skills.length && 'Add at least one required skill.'].filter(Boolean) as string[];
}
