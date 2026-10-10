'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import type { TeamInvite } from '@/lib/teams/types';
import { teamRequest } from './api';

/** Pending team invitations for the signed-in student, with accept and decline. */
export function TeamInvites({ invites }: { invites: TeamInvite[] }) {
  const router = useRouter();
  const [items, setItems] = useState(invites);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function respond(invite: TeamInvite, accept: boolean) {
    setBusyId(invite.membershipId); setError(null);
    const result = await teamRequest(`/api/team-invites/${invite.membershipId}/respond`, { method: 'POST', body: JSON.stringify({ accept }) });
    setBusyId(null);
    if (!result.ok) {
      setError(result.error);
      // The invitation is gone (expired, cancelled or the team applied): drop it instead of leaving a dead button.
      if (result.status === 404 || result.status === 410) {
        setItems(current => current.filter(item => item.membershipId !== invite.membershipId));
        router.refresh();
      }
      return;
    }
    setItems(current => current.filter(item => item.membershipId !== invite.membershipId));
    if (accept) router.push(`/student/projects/${invite.projectId}/apply`); else router.refresh();
  }

  if (!items.length) return null;
  return (
    <section aria-label="Team invitations" className="mb-6 rounded-xl border-2 border-[#111111] bg-[#F7F0D2] p-5 shadow-[4px_4px_0_#111111]">
      <h2 className="mb-3 text-lg font-black">Team invitations</h2>
      <ul className="space-y-3">
        {items.map(invite => (
          <li key={invite.membershipId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-[#111111] bg-white p-3">
            <p className="text-sm">
              <strong>{invite.leaderName ?? 'A student'}</strong> invited you to join <strong>{invite.teamName}</strong> for{' '}
              <strong>{invite.projectTitle}</strong>. Expires {new Date(invite.expiresAt).toLocaleDateString('en-GB', { timeZone: 'UTC' })}.
            </p>
            <span className="flex gap-2">
              <Button type="button" aria-label={`Accept invitation to ${invite.teamName}`} disabled={busyId === invite.membershipId}
                onClick={() => respond(invite, true)}>Accept</Button>
              <Button type="button" variant="secondary" aria-label={`Decline invitation to ${invite.teamName}`} disabled={busyId === invite.membershipId}
                onClick={() => respond(invite, false)}>Decline</Button>
            </span>
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="mt-3 text-xs font-bold text-[#D83D63]">{error}</p>}
    </section>
  );
}
