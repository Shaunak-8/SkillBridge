'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Badge, Button } from '@/components/ui';
import { ApplyFormComplex } from '@/components/student/ApplyFormComplex';
import { hasValidTeamSize } from '@/lib/teams/policy';
import type { TeamView } from '@/lib/teams/types';
import type { StudentProfileDTO } from '@/types/student';
import { teamRequest } from './api';
import { TeamInviteBox } from './TeamInviteBox';
import { TeamRoster } from './TeamRoster';

const REFRESH_MS = 10_000;
interface Props { project: { id: string; title: string }; profile: StudentProfileDTO; initialTeam: TeamView | null }

function CreateTeamForm({ projectId, onCreated }: { projectId: string; onCreated: (team: TeamView) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(null);
    const result = await teamRequest<{ team: TeamView }>(`/api/projects/${projectId}/teams`, { method: 'POST', body: JSON.stringify({ name, description }) });
    setBusy(false);
    if (result.ok) onCreated(result.data.team); else setError(result.error);
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border-2 border-[#111111] bg-white p-6 shadow-[4px_4px_0_#111111]">
      <h2 className="text-xl font-black">Create your team</h2>
      <p className="text-sm text-[#655F52]">You become the team leader. Invite 1 to 4 teammates, and once at least one accepts you can apply together.</p>
      <div>
        <label htmlFor="team-name" className="text-xs font-black uppercase tracking-wider">Team name</label>
        <input id="team-name" required minLength={2} maxLength={80} value={name} onChange={event => setName(event.target.value)}
          className="mt-1 w-full rounded-xl border-2 border-[#111111] px-3.5 py-2.5 text-sm font-medium outline-none focus:bg-[#F7F0D2]/20" />
      </div>
      <div>
        <label htmlFor="team-description" className="text-xs font-black uppercase tracking-wider">About your team (optional)</label>
        <textarea id="team-description" rows={3} maxLength={500} value={description} onChange={event => setDescription(event.target.value)}
          className="mt-1 w-full rounded-xl border-2 border-[#111111] px-3.5 py-2.5 text-sm font-medium outline-none focus:bg-[#F7F0D2]/20" />
      </div>
      {error && <p role="alert" className="text-xs font-bold text-[#D83D63]">{error}</p>}
      <Button type="submit" disabled={busy || name.trim().length < 2}>{busy ? 'Creating…' : 'Create team'}</Button>
    </form>
  );
}

/** Team side of the apply page: create a team, invite and track teammates, then apply together. */
export function TeamApplyPanel({ project, profile, initialTeam }: Props) {
  const [team, setTeam] = useState(initialTeam);
  const [notice, setNotice] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const latestRefresh = useRef(0);
  const teamId = team?.id;

  const refresh = useCallback(async () => {
    if (!teamId) return;
    const mine = ++latestRefresh.current;
    const result = await teamRequest<{ team: TeamView }>(`/api/teams/${teamId}`);
    if (mine !== latestRefresh.current) return; // a newer refresh superseded this one
    if (result.ok) setTeam(result.data.team);
    else if (result.status === 404) {
      // The team was disbanded (its application was declined or withdrawn) or this student is no longer on it.
      setTeam(null);
      setNotice('This team is no longer active. You can create a new team or apply on your own.');
    }
  }, [teamId]);

  useEffect(() => {
    if (!teamId) return;
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [teamId, refresh]);

  async function cancelInvite(membershipId: string) {
    if (!team) return;
    setCancellingId(membershipId);
    const result = await teamRequest(`/api/teams/${team.id}/invites/${membershipId}`, { method: 'DELETE' });
    setCancellingId(null);
    setNotice(result.ok ? null : result.error);
    await refresh();
  }

  if (!team) {
    return (
      <div className="space-y-4">
        {notice && <p role="status" className="rounded-xl border-2 border-[#111111] bg-[#F7F0D2] p-3 text-sm font-bold">{notice}</p>}
        <CreateTeamForm projectId={project.id} onCreated={created => { setNotice(null); setTeam(created); }} />
      </div>
    );
  }

  const isLeader = team.myRole === 'leader';
  const activeMembers = team.members.filter(member => member.status === 'active').length;
  const leaderName = team.members.find(member => member.role === 'leader')?.name ?? 'the team leader';

  return (
    <div className="space-y-6">
      <section className="rounded-xl border-2 border-[#111111] bg-[#F7F0D2] p-6 shadow-[4px_4px_0_#111111]">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-black">{team.name}</h2>
          <Badge tone={team.applicationId ? 'green' : 'amber'}>{team.applicationId ? 'Applied' : 'Forming'}</Badge>
        </div>
        {team.description && <p className="mb-3 text-sm text-[#655F52]">{team.description}</p>}
        <TeamRoster members={team.members} renderPendingAction={isLeader && !team.applicationId
          ? member => (
            <Button type="button" variant="ghost" aria-label={`Cancel invitation to ${member.name}`}
              disabled={cancellingId === member.membershipId} onClick={() => cancelInvite(member.membershipId)}>Cancel invite</Button>
          ) : undefined} />
        {notice && <p role="alert" className="mt-2 text-xs font-bold text-[#D83D63]">{notice}</p>}
      </section>

      {isLeader && !team.applicationId && <TeamInviteBox teamId={team.id} projectId={project.id} onInvited={refresh} />}

      {team.applicationId ? (
        <section className="rounded-xl border-2 border-[#111111] bg-[#dbf5ed] p-6 text-center shadow-[4px_4px_0_#111111]">
          <h3 className="text-lg font-black text-emerald-800">Your team has applied</h3>
          <p className="mb-4 text-sm font-medium text-emerald-700">Status: {team.applicationStatus ?? 'submitted'}. The business reviews the application and sees your team.</p>
          <Link href="/student/applications"><Button>View My Applications</Button></Link>
        </section>
      ) : isLeader ? (
        hasValidTeamSize(activeMembers)
          ? <ApplyFormComplex project={project} profile={profile} teamId={team.id} />
          : <p className="rounded-xl border-2 border-dashed border-[#111111] p-4 text-sm font-medium text-[#655F52]">
              Your team needs at least 2 members before you can apply. Invite someone above and wait for them to accept.
            </p>
      ) : (
        <p className="rounded-xl border-2 border-dashed border-[#111111] p-4 text-sm font-medium text-[#655F52]">
          {leaderName} will submit the application for your team. You&apos;ll see it here and under My Applications once they do.
        </p>
      )}
    </div>
  );
}
