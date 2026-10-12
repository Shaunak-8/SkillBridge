import { z } from 'zod';

export const createTeamSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).default(''),
});
export const inviteSchema = z.object({ studentId: z.string().uuid() });
export const respondSchema = z.object({ accept: z.boolean() });
export const searchQuerySchema = z.string().trim().min(2).max(60);

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
