// Pure team rules: no database or framework imports, so they are trivially testable and shared by
// routes, repo code and UI. The database enforces the same invariants (migration 011) as a backstop.
export const TEAM_MIN_SIZE = 2;
export const TEAM_MAX_SIZE = 5;
export const INVITE_TTL_DAYS = 7;
const DAY_MS = 86_400_000;

export const TEAM_STATUSES = ['forming', 'active', 'archived', 'disbanded'] as const;
export const MEMBER_STATUSES = ['invited', 'active', 'declined', 'removed', 'left'] as const;
export const TASK_STATUSES = ['todo', 'in_progress', 'review', 'done'] as const;
export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const;
export type TeamStatus = (typeof TEAM_STATUSES)[number];
export type MemberStatus = (typeof MEMBER_STATUSES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type TeamRole = 'leader' | 'member';
/** null = signed-in user who is not an active member of the team. */
export type ActorRole = TeamRole | null;
export type ProjectMode = 'individual' | 'team';
export type ApplicationKind = 'solo' | 'team';

export function hasValidTeamSize(activeMembers: number) {
  return Number.isInteger(activeMembers) && activeMembers >= TEAM_MIN_SIZE && activeMembers <= TEAM_MAX_SIZE;
}

/** Individual projects take solo applications only; team projects take a team or a solo applicant. */
export function applicationKindAllowed(mode: ProjectMode, kind: ApplicationKind) {
  return kind === 'solo' || mode === 'team';
}

export const inviteExpiry = (sentAt: Date) => new Date(sentAt.getTime() + INVITE_TTL_DAYS * DAY_MS);
export const isInviteExpired = (expiresAt: Date, now: Date) => now.getTime() >= expiresAt.getTime();

const MANAGEABLE: readonly TeamStatus[] = ['forming', 'active'];
export const canManageTeam = (role: ActorRole, status: TeamStatus) => role === 'leader' && MANAGEABLE.includes(status);
/** Chat, tasks, notes and files are writable only while the team is actually working on the project. */
export const isWorkspaceWritable = (status: TeamStatus) => status === 'active';

export const canAssignTasks = (role: ActorRole) => role === 'leader';
export const canEditTask = (role: ActorRole) => role === 'leader';
export const canCreateTask = (role: ActorRole, assignedToSelf: boolean) =>
  role === 'leader' || (role === 'member' && assignedToSelf);

/**
 * The leader can move any task anywhere. A member can move only their own tasks between todo, in
 * progress and review; marking done needs the leader's approval and a done task needs the leader to reopen.
 */
export function canMoveTask(role: ActorRole, isAssignee: boolean, from: TaskStatus, to: TaskStatus) {
  if (from === to || role === null) return false;
  if (role === 'leader') return true;
  return isAssignee && from !== 'done' && to !== 'done';
}

export interface Progress { total: number; done: number; inReview: number; percent: number }
interface ProgressTask { status: TaskStatus; assigneeId: string | null }

function summarize(tasks: readonly ProgressTask[]): Progress {
  const done = tasks.filter(task => task.status === 'done').length;
  const inReview = tasks.filter(task => task.status === 'review').length;
  return { total: tasks.length, done, inReview, percent: tasks.length ? Math.round((done / tasks.length) * 100) : 0 };
}
export const memberProgress = (tasks: readonly ProgressTask[], studentId: string) =>
  summarize(tasks.filter(task => task.assigneeId === studentId));
export const teamProgress = (tasks: readonly ProgressTask[]) => summarize(tasks);
