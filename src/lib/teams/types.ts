// View types shared by the server repo and client components (no server-only imports here).
import type { MemberStatus, TeamRole, TeamStatus } from './policy';

export interface TeamMemberView {
  membershipId: string; studentId: string; name: string; role: TeamRole; status: MemberStatus;
  expiresAt: string | null; joinedAt: string | null;
}
export interface TeamView {
  id: string; projectId: string; projectTitle: string; name: string; description: string; status: TeamStatus;
  myRole: TeamRole; members: TeamMemberView[]; applicationId: string | null; applicationStatus: string | null;
}
export interface TeamInvite {
  membershipId: string; teamId: string; teamName: string; projectId: string; projectTitle: string;
  leaderName: string | null; expiresAt: string;
}
export interface InvitableStudent { id: string; name: string; skills: string[] }
export interface ApplicationTeam {
  id: string; name: string; status: TeamStatus;
  members: { name: string; role: TeamRole; status: MemberStatus }[];
}
