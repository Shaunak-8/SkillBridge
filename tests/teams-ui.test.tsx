import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
vi.stubGlobal('React', React);
import { TeamRoster } from '@/components/teams/TeamRoster';

const members = [
  { name: 'Asha <b>Leader</b>', role: 'leader' as const, status: 'active' as const },
  { name: 'Ben Mate', role: 'member' as const, status: 'active' as const },
  { name: 'Chitra Third', role: 'member' as const, status: 'invited' as const },
];

describe('TeamRoster', () => {
  it('shows every person with their role and pending state', () => {
    const html = renderToStaticMarkup(<TeamRoster members={members} />);
    expect(html).toContain('Ben Mate');
    expect(html).toContain('Leader');
    expect(html).toContain('Invited');
    expect(html).toContain('Chitra Third');
  });
  it('escapes names', () => {
    const html = renderToStaticMarkup(<TeamRoster members={members} />);
    expect(html).toContain('Asha &lt;b&gt;Leader&lt;/b&gt;');
    expect(html).not.toContain('<b>Leader</b>');
  });
  it('shows how many of the 5 places are taken by members and invitations', () => {
    expect(renderToStaticMarkup(<TeamRoster members={members} />)).toContain('2 members');
    expect(renderToStaticMarkup(<TeamRoster members={members} />)).toContain('1 invited');
  });
  it('renders a leader-only action next to a pending invitation', () => {
    const html = renderToStaticMarkup(
      <TeamRoster members={members} renderPendingAction={member => <button>Cancel {member.name}</button>} />,
    );
    expect(html).toContain('Cancel Chitra Third');
    expect(html).not.toContain('Cancel Ben Mate');
  });
  it('renders nothing but a message for an empty roster', () => {
    expect(renderToStaticMarkup(<TeamRoster members={[]} />)).toContain('No members yet');
  });
});

// ---- interactive components: initial render for each state ----
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
import { ApplyModeTabs } from '@/components/teams/ApplyModeTabs';
import { TeamApplyPanel } from '@/components/teams/TeamApplyPanel';
import { TeamInvites } from '@/components/teams/TeamInvites';
import type { TeamView } from '@/lib/teams/types';
import type { StudentProfileDTO } from '@/types/student';

const profile = { displayName: 'Asha', educationLevel: 'UG', skills: ['React'], availability: { hoursPerWeek: 5 } } as unknown as StudentProfileDTO;
const project = { id: '11111111-1111-4111-8111-111111111111', title: 'Cafe site' };
const member = (name: string, role: 'leader' | 'member', status: 'active' | 'invited') =>
  ({ membershipId: `m-${name}`, studentId: `s-${name}`, name, role, status, expiresAt: null, joinedAt: null });
const team = (over: Partial<TeamView> = {}): TeamView => ({
  id: '22222222-2222-4222-8222-222222222222', projectId: project.id, projectTitle: project.title, name: 'Pixel Pioneers', description: '',
  status: 'forming', myRole: 'leader', members: [member('Asha', 'leader', 'active')], applicationId: null, applicationStatus: null, ...over,
});
const panel = (initialTeam: TeamView | null) => renderToStaticMarkup(<TeamApplyPanel project={project} profile={profile} initialTeam={initialTeam} />);

describe('TeamApplyPanel states', () => {
  it('starts with the create-team form when there is no team', () => {
    const html = panel(null);
    expect(html).toContain('Create your team');
    expect(html).toContain('id="team-name"');
  });
  it('asks a lone leader to invite someone and offers the invite search, without the application form', () => {
    const html = panel(team());
    expect(html).toContain('Pixel Pioneers');
    expect(html).toContain('Invite teammates');
    expect(html).toContain('needs at least 2 members');
    expect(html).not.toContain('Why are you a good fit');
  });
  it('shows the application form once the team has two active members', () => {
    const html = panel(team({ members: [member('Asha', 'leader', 'active'), member('Ben', 'member', 'active')] }));
    expect(html).toContain('Why are you a good fit');
    expect(html).not.toContain('needs at least 2 members');
  });
  it('does not count pending invitations towards the minimum', () => {
    const html = panel(team({ members: [member('Asha', 'leader', 'active'), member('Ben', 'member', 'invited')] }));
    expect(html).toContain('needs at least 2 members');
    expect(html).toContain('Cancel invite');
  });
  it('shows the applied state and hides invites and the form after applying', () => {
    const html = panel(team({ applicationId: 'a1', applicationStatus: 'shortlisted', members: [member('Asha', 'leader', 'active'), member('Ben', 'member', 'active')] }));
    expect(html).toContain('Your team has applied');
    expect(html).toContain('shortlisted');
    expect(html).not.toContain('Invite teammates');
    expect(html).not.toContain('Cancel invite');
  });
  it('shows a teammate the leader-submits message and no leader controls', () => {
    const html = panel(team({ myRole: 'member', members: [member('Asha', 'leader', 'active'), member('Ben', 'member', 'active')] }));
    expect(html).toContain('Asha will submit the application');
    expect(html).not.toContain('Invite teammates');
    expect(html).not.toContain('Why are you a good fit');
  });
});

describe('TeamInvites', () => {
  const invite = { membershipId: 'i1', teamId: 't1', teamName: 'Pixel <Pioneers>', projectId: project.id, projectTitle: 'Cafe site', leaderName: 'Asha', expiresAt: '2026-10-20T00:00:00.000Z' };
  it('lists invitations with accept and decline, escaping names', () => {
    const html = renderToStaticMarkup(<TeamInvites invites={[invite]} />);
    expect(html).toContain('Team invitations');
    expect(html).toContain('Pixel &lt;Pioneers&gt;');
    expect(html).toContain('Accept');
    expect(html).toContain('Decline');
  });
  it('renders nothing without invitations', () => {
    expect(renderToStaticMarkup(<TeamInvites invites={[]} />)).toBe('');
  });
});

describe('ApplyModeTabs', () => {
  it('offers solo and team and starts on solo', () => {
    const html = renderToStaticMarkup(<ApplyModeTabs project={project} profile={profile} />);
    expect(html).toContain('Apply solo');
    expect(html).toContain('Apply as a team');
    expect(html).toContain('Why are you a good fit');
  });
});
