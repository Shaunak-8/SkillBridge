import type { ProjectStatus } from '@/types/backend';
const transitions: Record<ProjectStatus, readonly ProjectStatus[]> = {
  draft: ['published', 'cancelled'], published: ['draft', 'in_progress', 'closed', 'cancelled'],
  in_progress: ['completed', 'cancelled'], completed: [], closed: [], cancelled: [],
};
export function canTransition(from: ProjectStatus, to: ProjectStatus) { return transitions[from].includes(to); }
