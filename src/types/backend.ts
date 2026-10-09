export const projectStatuses = ['draft', 'published', 'in_progress', 'completed', 'closed', 'cancelled'] as const;
export type ProjectStatus = typeof projectStatuses[number];
export interface ApiError { error: { code: string; message: string } }
export interface Paginated<T> { items: T[]; limit: number; offset: number }
export interface ProjectBrief {
  id: string; ownerId: string; title: string; summary: string; description: string;
  status: ProjectStatus; requiredSkills: string[]; deliverables: string[];
  ownerConfirmed: boolean; briefVersion: number; confirmedVersion: number | null;
  confirmedAt: string | null;
  createdAt: string; updatedAt: string;
}
// Contact information is intentionally absent from matching responses.
export interface StudentCandidate { id: string; displayName: string; bio: string; skills: string[]; interests: string[]; availability: string }
export interface ApplicationDTO { id: string; projectId: string; studentId: string; status: import('./index').ApplicationStatus; coverNote: string; createdAt: string }
