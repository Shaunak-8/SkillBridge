import { z } from "zod";

export const generateInputSchema = z.object({
  rawProblemText: z
    .string()
    .trim()
    .min(10, { message: "Problem description must be at least 10 characters long." })
    .max(4000, { message: "Problem description cannot exceed 4000 characters." }),
  preferredLanguage: z.string().optional(),
  category: z.string().optional(),
  format: z.enum(["individual", "team"]).optional(),
  draftId: z.string().optional(),
});

export const requiredSkillSchema = z.object({
  skillName: z.string().trim().min(1),
  category: z.enum(["technical", "creative", "business"]).default("technical"),
  level: z.enum(["beginner", "intermediate", "advanced"]).default("intermediate"),
  essential: z.boolean().default(true),
});

export const suggestedMilestoneSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().optional(),
  dueDate: z.string().trim().optional(),
});

export const projectDraftSchema = z.object({
  title: z.string().trim().min(3).max(120),
  problem_statement: z.string().trim().min(10).max(1000),
  business_goal: z.string().trim().min(5).max(500),
  category: z.string().trim().min(2).default("General"),
  mode: z.enum(["individual", "team"]).default("team"),
  proposed_deliverables: z.array(z.string().trim().min(2)).min(1).max(10),
  required_skills: z.array(requiredSkillSchema).min(1).max(8),
  suggested_milestones: z.array(suggestedMilestoneSchema).default([]),
  budget_range: z.string().nullable().default(null),
  timeline: z.string().nullable().default(null),
  language: z.string().default("en"),
  open_questions: z.array(z.string().trim().min(5)).default([]),
});

export type ValidatedGenerateInput = z.infer<typeof generateInputSchema>;
export type ValidatedProjectDraft = z.infer<typeof projectDraftSchema>;
