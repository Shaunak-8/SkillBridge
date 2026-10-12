import type { ReactNode } from 'react';
import { Badge } from '@/components/ui';
import { TEAM_MAX_SIZE, type MemberStatus, type TeamRole } from '@/lib/teams/policy';

export interface RosterMember { name: string; role: TeamRole; status: MemberStatus }

/** People on a team: active members first, then pending invitations. Safe to render on the server or client. */
export function TeamRoster<M extends RosterMember>({
  members, renderPendingAction,
}: { members: readonly M[]; renderPendingAction?: (member: M) => ReactNode }) {
  if (!members.length) return <p className="text-sm text-[#655F52]">No members yet.</p>;
  const active = members.filter(member => member.status === 'active').length;
  const invited = members.filter(member => member.status === 'invited').length;
  return (
    <div>
      <p className="mb-2 text-xs font-bold text-[#655F52]">
        {active} {active === 1 ? 'member' : 'members'}{invited > 0 && ` · ${invited} invited`} · up to {TEAM_MAX_SIZE}
      </p>
      <ul className="space-y-2">
        {members.map((member, index) => (
          <li key={`${member.name}-${index}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-[#111111] bg-white px-3 py-2">
            <span className="flex items-center gap-2 text-sm font-bold text-[#151515]">
              {member.name}
              {member.role === 'leader' && <Badge tone="gold">Leader</Badge>}
              {member.status === 'invited' && <Badge tone="blue">Invited</Badge>}
            </span>
            {member.status === 'invited' && renderPendingAction?.(member)}
          </li>
        ))}
      </ul>
    </div>
  );
}
