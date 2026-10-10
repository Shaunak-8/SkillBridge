// Runs the real repo SQL against a throwaway schema built from every migration (dropped afterwards).
// Opt in with `npm run test:teams:repo`; skipped in the normal unit run.
import { randomBytes } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const RUN = process.env.TEAMS_INTEGRATION === '1' && Boolean(process.env.DATABASE_URL);
const holder = vi.hoisted(() => ({ schema: 'skillbridge' }));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', async () => {
  const { neon } = await import('@neondatabase/serverless');
  return {
    database: () => {
      const base = neon(process.env.DATABASE_URL!);
      const rewrite = (strings: TemplateStringsArray) => {
        const mapped = strings.map(text => text.replaceAll('skillbridge', holder.schema));
        return Object.assign(mapped, { raw: mapped }) as unknown as TemplateStringsArray;
      };
      const wrapped = ((strings: TemplateStringsArray, ...values: unknown[]) => base(rewrite(strings), ...values)) as typeof base;
      wrapped.transaction = base.transaction.bind(base) as typeof base.transaction;
      return wrapped;
    },
  };
});

import { neon } from '@neondatabase/serverless';
import { teamErrorResponse } from '@/lib/teams/errors';
import {
  cancelInvite, createTeam, inviteStudent, listMyInvites, loadProjectTeam, loadTeam, respondToInvite,
  searchInvitableStudents, teamsForApplications,
} from '@/lib/teams/repo';
import { insertComplexApplication } from '@/lib/ws5/repo';

interface Student { profileId: string; studentId: string; name: string }

describe.skipIf(!RUN)('teams repo against a real database', () => {
  const schema = `sb_repo_${randomBytes(6).toString('hex')}`;
  const raw = neon(process.env.DATABASE_URL ?? 'postgresql://invalid');
  const q = (text: string, params: unknown[] = []) => raw.query(text.replaceAll('skillbridge', schema), params);
  const students: Student[] = [];
  let project = '';
  let teamId = '';
  let realAuthIds: string[] = [];

  beforeAll(async () => {
    holder.schema = schema;
    const folder = new URL('migrations/', pathToFileURL(`${process.cwd()}/`));
    const { sqlStatements } = await import(/* @vite-ignore */ pathToFileURL(`${process.cwd()}/scripts/sql-statements.mjs`).href) as
      { sqlStatements: (text: string) => string[] };
    const statements = readdirSync(folder).filter(name => /^\d+.*\.sql$/.test(name)).sort()
      .flatMap(name => sqlStatements(readFileSync(new URL(name, folder), 'utf8').replaceAll('skillbridge', schema)));
    await raw.transaction(statements.map(statement => raw.query(statement)));
    await q(`ALTER TABLE skillbridge.projects VALIDATE CONSTRAINT projects_publish_ready`);

    realAuthIds = (await raw`SELECT id::text AS id FROM neon_auth."user" ORDER BY "createdAt" LIMIT 4`).map(row => row.id as string);
    const suffix = randomBytes(5).toString('hex');
    const [owner] = await q(`INSERT INTO skillbridge.profiles(auth_user_id, username, email, role, onboarding_completed, full_name)
      VALUES ($1, $2, 'o@example.invalid', 'business', true, 'Biz Owner') RETURNING id`, [`owner-${suffix}`, `own_${suffix}`]);
    await q(`INSERT INTO skillbridge.business_profiles(profile_id, business_name) VALUES ($1, 'Biz')`, [owner.id]);
    const names = ['Asha Leader', 'Ben Mate', 'Chitra Third', 'Dev Fourth'];
    for (const [index, name] of names.entries()) {
      const [profile] = await q(`INSERT INTO skillbridge.profiles(auth_user_id, username, email, role, onboarding_completed, full_name)
        VALUES ($1, $2, 'p@example.invalid', 'student', true, $3) RETURNING id`,
        [realAuthIds[index] ?? `fake-${index}-${suffix}`, `st${index}_${suffix}`, name]);
      const [student] = await q(`INSERT INTO skillbridge.student_profiles(profile_id, visibility, skills) VALUES ($1, 'public', ARRAY['React','Design']) RETURNING id`, [profile.id]);
      students.push({ profileId: profile.id, studentId: student.id, name });
    }
    const [created] = await q(`INSERT INTO skillbridge.projects(owner_profile_id, title, summary, problem_statement, deliverables, mode)
      VALUES ($1, 'Team project', 'S', 'P', ARRAY['Website'], 'team') RETURNING id`, [owner.id]);
    project = created.id;
    await q(`UPDATE skillbridge.projects SET owner_confirmed = true, confirmed_version = brief_version WHERE id = $1`, [project]);
    await q(`UPDATE skillbridge.projects SET status = 'published' WHERE id = $1`, [project]);
  }, 120_000);

  afterAll(async () => { if (RUN) await raw.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); }, 60_000);

  const [leader, mate, third, fourth] = [0, 1, 2, 3].map(index => ({ get: () => students[index] }));

  it('creates a team with its leader and finds it as the leader\'s open team', async () => {
    teamId = await createTeam(leader.get().profileId, project, 'Pixel Pioneers', 'We build things');
    const view = await loadProjectTeam(leader.get().profileId, project);
    expect(view).toMatchObject({ id: teamId, name: 'Pixel Pioneers', status: 'forming', myRole: 'leader', applicationId: null });
    expect(view?.members.map(member => [member.name, member.role, member.status])).toEqual([['Asha Leader', 'leader', 'active']]);
  });

  it('does not show a team to someone who is not an active member', async () => {
    expect(await loadTeam(mate.get().profileId, teamId)).toBeNull();
    expect(await loadProjectTeam(mate.get().profileId, project)).toBeNull();
  });

  it('rejects a duplicate team name with a friendly conflict', async () => {
    const error = await createTeam(mate.get().profileId, project, 'pixel pioneers', '').catch(e => e);
    expect(teamErrorResponse(error)).toMatchObject({ status: 409, message: expect.stringContaining('name') });
  });

  it('invites a student once and refuses to invite the leader or a duplicate', async () => {
    expect(await inviteStudent(leader.get().profileId, teamId, mate.get().studentId)).toEqual(expect.any(String));
    expect(await inviteStudent(leader.get().profileId, teamId, mate.get().studentId)).toBeNull();
    expect(await inviteStudent(leader.get().profileId, teamId, leader.get().studentId)).toBeNull();
    expect(await inviteStudent(mate.get().profileId, teamId, third.get().studentId)).toBeNull();
  });

  it('lists the invitation for the invitee only', async () => {
    const invites = await listMyInvites(mate.get().profileId);
    expect(invites).toHaveLength(1);
    expect(invites[0]).toMatchObject({ teamId, teamName: 'Pixel Pioneers', leaderName: 'Asha Leader', projectTitle: 'Team project' });
    expect(await listMyInvites(third.get().profileId)).toEqual([]);
  });

  it('lets only the leader cancel an invitation', async () => {
    const [invite] = await listMyInvites(mate.get().profileId);
    expect(await cancelInvite(mate.get().profileId, teamId, invite.membershipId)).toBe(false);
    expect(await cancelInvite(leader.get().profileId, teamId, invite.membershipId)).toBe(true);
    expect(await listMyInvites(mate.get().profileId)).toEqual([]);
    expect(await inviteStudent(leader.get().profileId, teamId, mate.get().studentId)).toEqual(expect.any(String));
  });

  it('refuses a team application until a second member has accepted', async () => {
    const error = await insertComplexApplication(project, leader.get().studentId, { cover_note: 'x', pitch: 'p' }, teamId).catch(e => e);
    expect(teamErrorResponse(error)).toMatchObject({ status: 409, message: expect.stringMatching(/at least 2/) });
  });

  it('lets the invitee accept and then shows them the team', async () => {
    const [invite] = await listMyInvites(mate.get().profileId);
    expect(await respondToInvite(third.get().profileId, invite.membershipId, true)).toBeNull();
    expect(await respondToInvite(mate.get().profileId, invite.membershipId, true)).toEqual({ teamId, projectId: project });
    const view = await loadProjectTeam(mate.get().profileId, project);
    expect(view).toMatchObject({ id: teamId, myRole: 'member' });
    expect(view?.members.filter(member => member.status === 'active')).toHaveLength(2);
    expect(await respondToInvite(mate.get().profileId, invite.membershipId, true)).toBeNull();
  });

  it('keeps searchable students free of the requester and of existing members', async () => {
    if (realAuthIds.length < 4) return;
    // "e" matches Asha Leader (the requester), Ben Mate (an active member) and Dev Fourth; only the last may appear.
    const found = await searchInvitableStudents(leader.get().profileId, project, 'e');
    expect(found.map(student => student.name)).toEqual(['Dev Fourth']);
    expect(Object.keys(found[0]).sort()).toEqual(['id', 'name', 'skills']);
    expect((await searchInvitableStudents(leader.get().profileId, project, 'th')).map(student => student.name))
      .toEqual(['Chitra Third', 'Dev Fourth']);
    expect(await searchInvitableStudents(leader.get().profileId, project, '%')).toEqual([]);
  });

  it('accepts a team application from the leader and rolls the roster into the application', async () => {
    const created = await insertComplexApplication(project, leader.get().studentId, { cover_note: 'We apply', pitch: 'Team pitch' }, teamId);
    expect(created).toMatchObject({ team_id: teamId, student_id: leader.get().studentId });
    const view = await loadProjectTeam(leader.get().profileId, project);
    expect(view).toMatchObject({ applicationId: created!.id, applicationStatus: 'submitted' });
    const roster = (await teamsForApplications([created!.id])).get(created!.id);
    expect(roster).toMatchObject({ id: teamId, name: 'Pixel Pioneers' });
    expect(roster?.members.map(member => member.role)).toEqual(['leader', 'member']);
    const error = await insertComplexApplication(project, mate.get().studentId, { cover_note: 'x' }).catch(e => e);
    expect(teamErrorResponse(error).status).toBe(409);
  });

  it('returns no team for applications that are not team applications', async () => {
    expect((await teamsForApplications([])).size).toBe(0);
    expect((await teamsForApplications(['00000000-0000-4000-8000-000000000000'])).size).toBe(0);
  });

  it('activates the team and drops pending invitations when the application is accepted', async () => {
    expect(await inviteStudent(leader.get().profileId, teamId, fourth.get().studentId)).toEqual(expect.any(String));
    await q(`UPDATE skillbridge.applications SET status = 'accepted' WHERE team_id = $1`, [teamId]);
    const view = await loadTeam(leader.get().profileId, teamId);
    expect(view?.status).toBe('active');
    expect(view?.members.map(member => member.status)).toEqual(['active', 'active']);
    expect(await listMyInvites(fourth.get().profileId)).toEqual([]);
  });
});
