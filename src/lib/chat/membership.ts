import 'server-only';
import { database } from '@/lib/db';
import { chatContacts, chatGuid, chatUid, type ChatMetadata, type ChatProject } from './policy';

export async function eligibleProjects(): Promise<ChatProject[]> {
  const rows = await database()`SELECT p.id, p.title, p.owner_profile_id,
      array_agg(DISTINCT student.profile_id) AS students
    FROM skillbridge.projects p
    JOIN skillbridge.profiles owner ON owner.id = p.owner_profile_id
      AND owner.role = 'business' AND owner.onboarding_completed
    JOIN skillbridge.applications a ON a.project_id = p.id
      AND a.status IN ('submitted', 'viewed', 'reviewing', 'shortlisted', 'accepted')
    JOIN skillbridge.student_profiles student ON student.id = a.student_id
    JOIN skillbridge.profiles member ON member.id = student.profile_id
      AND member.role = 'student' AND member.onboarding_completed
    WHERE p.status IN ('published', 'in_progress', 'completed')
    GROUP BY p.id, p.title, p.owner_profile_id ORDER BY p.id`;
  return rows.map(row => ({ id: row.id, title: row.title, guid: chatGuid(row.id), ownerProfileId: row.owner_profile_id, memberIds: [row.owner_profile_id, ...row.students] }));
}
export async function chatMetadata(profileId: string): Promise<ChatMetadata> {
  const eligible = (await eligibleProjects()).filter(project => project.memberIds.includes(profileId));
  const ids = chatContacts(eligible, profileId);
  const projects = eligible.map(project => ({ ...project, memberIds: project.ownerProfileId === profileId
    ? project.memberIds : [project.ownerProfileId, profileId] }));
  const people = ids.length ? await database()`SELECT id, full_name FROM skillbridge.profiles WHERE id = ANY(${ids}::uuid[]) ORDER BY full_name, id` : [];
  return { uid: chatUid(profileId), projects, people: people.map(person => ({ id: person.id, name: person.full_name, uid: chatUid(person.id) })) };
}

/** Resolve a deep link only for an application belonging to this account. */
export async function applicationChatTarget(profileId: string, projectId?: string, applicationId?: string) {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if ((!projectId || !uuid.test(projectId)) && (!applicationId || !uuid.test(applicationId))) return undefined;
  const rows = await database()`SELECT p.owner_profile_id, sp.profile_id AS student_profile_id
    FROM skillbridge.applications a JOIN skillbridge.projects p ON p.id = a.project_id
    JOIN skillbridge.student_profiles sp ON sp.id = a.student_id
    WHERE a.status IN ('submitted', 'viewed', 'reviewing', 'shortlisted', 'accepted')
      AND p.status IN ('published', 'in_progress', 'completed')
      AND (p.owner_profile_id = ${profileId} OR sp.profile_id = ${profileId})
      AND (${applicationId && uuid.test(applicationId) ? applicationId : null}::uuid IS NULL
        OR a.id = ${applicationId && uuid.test(applicationId) ? applicationId : null}::uuid)
      AND (${projectId && uuid.test(projectId) ? projectId : null}::uuid IS NULL
        OR p.id = ${projectId && uuid.test(projectId) ? projectId : null}::uuid)
    ORDER BY a.created_at DESC LIMIT 1`;
  const row = rows[0];
  return row ? chatUid(row.owner_profile_id === profileId ? row.student_profile_id : row.owner_profile_id) : undefined;
}
