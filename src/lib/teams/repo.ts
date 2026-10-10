import 'server-only';
import { randomUUID } from 'node:crypto';
import { database } from '@/lib/db';
import { inviteExpiry } from './policy';
import type { ApplicationTeam, InvitableStudent, TeamInvite, TeamView } from './types';

export type { ApplicationTeam, InvitableStudent, TeamInvite, TeamMemberView, TeamView } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const escapeLike = (text: string) => text.replace(/[\\%_]/g, char => `\\${char}`);

/** The viewer's own team (they must be an active member) by team id, or their open team for a project. */
async function fetchTeamView(profileId: string, where: { teamId?: string; projectId?: string }): Promise<TeamView | null> {
  const teamId = where.teamId ?? null;
  const projectId = where.projectId ?? null;
  if (!teamId && !projectId) return null;
  const rows = await database()`SELECT t.id, t.project_id, p.title AS project_title, t.name, t.description, t.status,
      me.role AS my_role, app.id AS application_id, app.status AS application_status,
      COALESCE((SELECT json_agg(json_build_object('membershipId', m.id, 'studentId', m.student_id, 'name', pr.full_name,
          'role', m.role, 'status', m.status, 'expiresAt', m.expires_at, 'joinedAt', m.joined_at)
          ORDER BY (m.role = 'leader') DESC, m.status, m.joined_at NULLS LAST, m.created_at)
        FROM skillbridge.team_members m
        JOIN skillbridge.student_profiles sp ON sp.id = m.student_id
        JOIN skillbridge.profiles pr ON pr.id = sp.profile_id
        WHERE m.team_id = t.id AND (m.status = 'active' OR (m.status = 'invited' AND m.expires_at > now()))), '[]'::json) AS members
    FROM skillbridge.teams t
    JOIN skillbridge.projects p ON p.id = t.project_id
    JOIN skillbridge.team_members me ON me.team_id = t.id AND me.status = 'active'
    JOIN skillbridge.student_profiles msp ON msp.id = me.student_id AND msp.profile_id = ${profileId}
    LEFT JOIN skillbridge.applications app ON app.team_id = t.id
    WHERE (${teamId}::uuid IS NULL OR t.id = ${teamId}::uuid)
      AND (${projectId}::uuid IS NULL OR (t.project_id = ${projectId}::uuid AND t.status IN ('forming', 'active')))
    ORDER BY t.created_at DESC LIMIT 1`;
  const row: Row | undefined = rows[0];
  if (!row) return null;
  return {
    id: row.id, projectId: row.project_id, projectTitle: row.project_title, name: row.name, description: row.description,
    status: row.status, myRole: row.my_role, members: row.members, applicationId: row.application_id ?? null,
    applicationStatus: row.application_status ?? null,
  };
}
export const loadTeam = (profileId: string, teamId: string) => fetchTeamView(profileId, { teamId });
export const loadProjectTeam = (profileId: string, projectId: string) => fetchTeamView(profileId, { projectId });

/** Creates the team and its leader atomically; the deferred leader check passes only if both rows commit. */
export async function createTeam(profileId: string, projectId: string, name: string, description: string) {
  const sql = database();
  const id = randomUUID();
  await sql.transaction([
    sql`INSERT INTO skillbridge.teams(id, project_id, name, description) VALUES (${id}, ${projectId}, ${name}, ${description})`,
    sql`INSERT INTO skillbridge.team_members(team_id, project_id, student_id, role, status, joined_at)
      SELECT ${id}, ${projectId}, sp.id, 'leader', 'active', now()
      FROM skillbridge.student_profiles sp WHERE sp.profile_id = ${profileId}`,
  ]);
  return id;
}

/**
 * Invites (or re-invites after a decline, leave, removal or expiry) a student. Returns null when the leader or
 * invitee is not eligible, for example the invitee is already on a team or applied on their own.
 */
export async function inviteStudent(profileId: string, teamId: string, inviteeStudentId: string): Promise<string | null> {
  const expiresAt = inviteExpiry(new Date()).toISOString();
  const rows = await database()`INSERT INTO skillbridge.team_members(team_id, project_id, student_id, role, status, invited_by, expires_at)
    SELECT t.id, t.project_id, inv.id, 'member', 'invited', lead.student_id, ${expiresAt}::timestamptz
    FROM skillbridge.teams t
    JOIN skillbridge.team_members lead ON lead.team_id = t.id AND lead.role = 'leader' AND lead.status = 'active'
    JOIN skillbridge.student_profiles lsp ON lsp.id = lead.student_id AND lsp.profile_id = ${profileId}
    JOIN skillbridge.student_profiles inv ON inv.id = ${inviteeStudentId}::uuid AND inv.id <> lead.student_id
    JOIN skillbridge.profiles ipr ON ipr.id = inv.profile_id AND ipr.role = 'student' AND ipr.onboarding_completed
    WHERE t.id = ${teamId}::uuid AND t.status IN ('forming', 'active')
      AND NOT EXISTS (SELECT 1 FROM skillbridge.team_members o
        WHERE o.project_id = t.project_id AND o.student_id = inv.id AND o.status = 'active')
      AND NOT EXISTS (SELECT 1 FROM skillbridge.applications a
        WHERE a.project_id = t.project_id AND a.student_id = inv.id AND a.team_id IS NULL
          AND a.status NOT IN ('declined', 'withdrawn'))
    ON CONFLICT (team_id, student_id) DO UPDATE
      SET status = 'invited', invited_by = EXCLUDED.invited_by, invited_at = now(), expires_at = EXCLUDED.expires_at,
          responded_at = NULL, joined_at = NULL, left_at = NULL
      WHERE team_members.status IN ('declined', 'left', 'removed')
         OR (team_members.status = 'invited' AND team_members.expires_at <= now())
    RETURNING id`;
  return rows[0]?.id ?? null;
}

/** The leader withdraws a pending invitation. */
export async function cancelInvite(profileId: string, teamId: string, membershipId: string) {
  const rows = await database()`UPDATE skillbridge.team_members m SET status = 'removed', responded_at = now()
    WHERE m.id = ${membershipId}::uuid AND m.team_id = ${teamId}::uuid AND m.status = 'invited'
      AND EXISTS (SELECT 1 FROM skillbridge.team_members lead
        JOIN skillbridge.student_profiles lsp ON lsp.id = lead.student_id
        WHERE lead.team_id = m.team_id AND lead.role = 'leader' AND lead.status = 'active' AND lsp.profile_id = ${profileId})
    RETURNING m.id`;
  return rows.length > 0;
}

/** The invitee accepts or declines. Returns the team and project, or null when there is no open invitation. */
export async function respondToInvite(profileId: string, membershipId: string, accept: boolean) {
  const status = accept ? 'active' : 'declined';
  const rows = await database()`UPDATE skillbridge.team_members m
    SET status = ${status}, responded_at = now(), joined_at = CASE WHEN ${accept} THEN now() ELSE NULL END
    FROM skillbridge.student_profiles sp
    WHERE m.id = ${membershipId}::uuid AND sp.id = m.student_id AND sp.profile_id = ${profileId}
      AND m.status = 'invited' AND m.expires_at > now()
    RETURNING m.team_id, m.project_id`;
  return rows[0] ? { teamId: rows[0].team_id as string, projectId: rows[0].project_id as string } : null;
}

export async function listMyInvites(profileId: string): Promise<TeamInvite[]> {
  const rows = await database()`SELECT m.id, m.team_id, t.name, t.project_id, p.title AS project_title, m.expires_at,
      (SELECT pr.full_name FROM skillbridge.team_members l
        JOIN skillbridge.student_profiles lsp ON lsp.id = l.student_id
        JOIN skillbridge.profiles pr ON pr.id = lsp.profile_id
        WHERE l.team_id = t.id AND l.role = 'leader' AND l.status = 'active') AS leader_name
    FROM skillbridge.team_members m
    JOIN skillbridge.student_profiles sp ON sp.id = m.student_id AND sp.profile_id = ${profileId}
    JOIN skillbridge.teams t ON t.id = m.team_id
    JOIN skillbridge.projects p ON p.id = t.project_id
    WHERE m.status = 'invited' AND m.expires_at > now() AND t.status IN ('forming', 'active')
      AND p.status IN ('published', 'in_progress')
    ORDER BY m.invited_at DESC LIMIT 20`;
  return rows.map((r: Row) => ({
    membershipId: r.id, teamId: r.team_id, teamName: r.name, projectId: r.project_id, projectTitle: r.project_title,
    leaderName: r.leader_name ?? null, expiresAt: r.expires_at,
  }));
}

/**
 * Teammate search for the invite box: students who opted in (visibility public or matching) and really signed up,
 * excluding the requester and anyone who is already on a team or applied on their own for this project.
 * Returns only a name and a few skills.
 */
export async function searchInvitableStudents(profileId: string, projectId: string, q: string): Promise<InvitableStudent[]> {
  const pattern = `%${escapeLike(q)}%`;
  const rows = await database()`SELECT sp.id, pr.full_name, sp.skills
    FROM skillbridge.student_profiles sp
    JOIN skillbridge.profiles pr ON pr.id = sp.profile_id
    WHERE sp.visibility IN ('public', 'matching') AND pr.role = 'student' AND pr.onboarding_completed AND pr.id <> ${profileId}
      AND EXISTS (SELECT 1 FROM neon_auth."user" u WHERE u.id::text = pr.auth_user_id)
      AND pr.full_name ILIKE ${pattern}
      AND NOT EXISTS (SELECT 1 FROM skillbridge.team_members o
        WHERE o.project_id = ${projectId}::uuid AND o.student_id = sp.id AND o.status = 'active')
      AND NOT EXISTS (SELECT 1 FROM skillbridge.applications a
        WHERE a.project_id = ${projectId}::uuid AND a.student_id = sp.id AND a.team_id IS NULL
          AND a.status NOT IN ('declined', 'withdrawn'))
    ORDER BY pr.full_name, sp.id LIMIT 8`;
  return rows.map((r: Row) => ({ id: r.id, name: r.full_name?.trim() || 'Student', skills: (r.skills ?? []).slice(0, 4) }));
}

/** Team and roster (active members and unexpired invitations) for a set of applications, keyed by application id. */
export async function teamsForApplications(applicationIds: string[]): Promise<Map<string, ApplicationTeam>> {
  if (!applicationIds.length) return new Map();
  const rows = await database()`SELECT a.id AS application_id, t.id, t.name, t.status,
      COALESCE(json_agg(json_build_object('name', pr.full_name, 'role', m.role, 'status', m.status)
        ORDER BY (m.role = 'leader') DESC, m.status, m.joined_at NULLS LAST, m.created_at) FILTER (WHERE m.id IS NOT NULL), '[]'::json) AS members
    FROM skillbridge.applications a
    JOIN skillbridge.teams t ON t.id = a.team_id
    LEFT JOIN skillbridge.team_members m ON m.team_id = t.id
      AND (m.status = 'active' OR (m.status = 'invited' AND m.expires_at > now()))
    LEFT JOIN skillbridge.student_profiles sp ON sp.id = m.student_id
    LEFT JOIN skillbridge.profiles pr ON pr.id = sp.profile_id
    WHERE a.id = ANY(${applicationIds}::uuid[])
    GROUP BY a.id, t.id`;
  return new Map(rows.map((r: Row) => [r.application_id as string, { id: r.id, name: r.name, status: r.status, members: r.members }]));
}
