import 'server-only';
import { database } from '@/lib/db';
import { calculateProfileCompleteness } from '@/lib/validation/student';
import type {
  PortfolioItemInput, ProfileVisibility, StudentPortfolioItemDTO, StudentProfileDTO, StudentProfileUpdateInput,
} from '@/types/student';

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

// WS4 UI vocabulary <-> skillbridge column values.
const VISIBILITY_TO_DB: Record<ProfileVisibility, string> = { draft_private: 'private', public_to_businesses: 'public' };
const VISIBILITY_FROM_DB = (v: string): ProfileVisibility => (v === 'private' ? 'draft_private' : 'public_to_businesses');
const YEAR_LABELS = ['1st Year', '2nd Year', '3rd Year', 'Final Year', 'Recent Graduate'];
const yearToDb = (label?: string) => { const i = label ? YEAR_LABELS.indexOf(label) : -1; return i < 0 ? null : i + 1; };
const yearFromDb = (n: number | null) => (n && YEAR_LABELS[n - 1]) || '';
const iso = (d: unknown) => new Date(d as string).toISOString();
const SCHEDULES = ['Flexible', 'Weekdays', 'Weekends', 'Evenings', 'Part-time'] as const;

function toItem(r: Row): StudentPortfolioItemDTO {
  return {
    id: r.id, studentId: r.student_id, title: r.title, description: r.description, role: r.role || undefined,
    skillsUsed: r.skills_used ?? [], projectUrl: r.project_url ?? undefined, mediaUrl: r.media_url ?? undefined,
    createdAt: iso(r.created_at), updatedAt: iso(r.updated_at),
  };
}

function toResume(r: Row | undefined) {
  return r ? { id: r.id, fileName: r.file_name, fileUrl: r.file_url, createdAt: iso(r.created_at) } : undefined;
}

function toProfile(r: Row, items: StudentPortfolioItemDTO[]): StudentProfileDTO {
  const schedule = SCHEDULES.find((s) => s === r.availability) ?? 'Flexible';
  const dto: StudentProfileDTO = {
    id: r.id, userId: r.profile_id, displayName: r.full_name, bio: r.bio, educationLevel: r.education_level ?? '',
    fieldOfStudy: r.field_of_study, studyYear: yearFromDb(r.study_year), skills: r.skills, interests: r.interests,
    learningGoals: r.learning_goals, preferredCategories: r.preferred_categories,
    availability: { hoursPerWeek: r.availability_hours_per_week ?? 0, schedulePreference: schedule, notes: r.availability_notes },
    visibility: VISIBILITY_FROM_DB(r.visibility), portfolioItems: items, resume: toResume(r.resume),
    createdAt: iso(r.created_at), updatedAt: iso(r.updated_at),
  };
  return { ...dto, completenessScore: calculateProfileCompleteness(dto, items).score };
}

export async function listPortfolio(studentId: string): Promise<StudentPortfolioItemDTO[]> {
  const rows = await database()`SELECT * FROM skillbridge.student_portfolio_items WHERE student_id = ${studentId} ORDER BY created_at DESC, id`;
  return rows.map(toItem);
}

/** The signed-in student's profile, created empty on first access. Ownership comes only from profileId. */
export async function getMyProfile(profileId: string): Promise<StudentProfileDTO> {
  const sql = database();
  // Read first, in parallel: the profile row and its portfolio need no ids from each other.
  const read = async () => {
    const [rows, items] = await Promise.all([
      sql`SELECT sp.*, pr.full_name,
        (SELECT row_to_json(r) FROM skillbridge.resumes r
          WHERE r.student_id = sp.id ORDER BY r.created_at DESC, r.id DESC LIMIT 1) AS resume
        FROM skillbridge.student_profiles sp
        JOIN skillbridge.profiles pr ON pr.id = sp.profile_id WHERE sp.profile_id = ${profileId}`,
      sql`SELECT i.* FROM skillbridge.student_portfolio_items i
        JOIN skillbridge.student_profiles sp ON sp.id = i.student_id WHERE sp.profile_id = ${profileId} ORDER BY i.created_at DESC, i.id`,
    ]);
    return { row: rows[0], items };
  };
  let { row, items } = await read();
  if (!row) {
    // First access only: create the empty profile, then read again.
    await sql`INSERT INTO skillbridge.student_profiles (profile_id) VALUES (${profileId}) ON CONFLICT (profile_id) DO NOTHING`;
    ({ row, items } = await read());
  }
  return toProfile(row, items.map(toItem));
}

/** Any edit bumps updated_at so WS5's stored embedding is treated as stale until re-embedded. */
export async function updateMyProfile(profileId: string, input: StudentProfileUpdateInput): Promise<StudentProfileDTO> {
  const sql = database();
  const a = input.availability;
  await getMyProfile(profileId); // ensures the row exists
  await sql`UPDATE skillbridge.student_profiles SET
      bio = COALESCE(${input.bio ?? null}::text, bio),
      education_level = COALESCE(${input.educationLevel ?? null}::text, education_level),
      field_of_study = COALESCE(${input.fieldOfStudy ?? null}::text, field_of_study),
      study_year = COALESCE(${input.studyYear === undefined ? null : yearToDb(input.studyYear)}::int, study_year),
      skills = COALESCE(${input.skills ?? null}::text[], skills),
      interests = COALESCE(${input.interests ?? null}::text[], interests),
      learning_goals = COALESCE(${input.learningGoals ?? null}::text[], learning_goals),
      preferred_categories = COALESCE(${input.preferredCategories ?? null}::text[], preferred_categories),
      availability_hours_per_week = COALESCE(${a?.hoursPerWeek ?? null}::int, availability_hours_per_week),
      availability = COALESCE(${a?.schedulePreference ?? null}::text, availability),
      availability_notes = COALESCE(${a?.notes ?? null}::text, availability_notes),
      visibility = COALESCE(${input.visibility ? VISIBILITY_TO_DB[input.visibility] : null}::text, visibility),
      updated_at = now()
    WHERE profile_id = ${profileId}`;
  if (input.displayName) await sql`UPDATE skillbridge.profiles SET full_name = ${input.displayName}, updated_at = now() WHERE id = ${profileId}`;
  return getMyProfile(profileId);
}

const touch = (studentId: string) => database()`UPDATE skillbridge.student_profiles SET updated_at = now() WHERE id = ${studentId}`;

export async function createPortfolioItem(studentId: string, i: PortfolioItemInput): Promise<StudentPortfolioItemDTO> {
  const [row] = await database()`INSERT INTO skillbridge.student_portfolio_items
      (student_id, title, description, role, skills_used, project_url, media_url)
    VALUES (${studentId}, ${i.title}, ${i.description}, ${i.role ?? ''}, ${i.skillsUsed ?? []}::text[], ${i.projectUrl ?? null}, ${i.mediaUrl ?? null})
    RETURNING *`;
  await touch(studentId);
  return toItem(row);
}

/** Null when the item does not exist or belongs to someone else (indistinguishable on purpose). */
export async function updatePortfolioItem(studentId: string, itemId: string, i: PortfolioItemInput): Promise<StudentPortfolioItemDTO | null> {
  const [row] = await database()`UPDATE skillbridge.student_portfolio_items SET title = ${i.title}, description = ${i.description},
      role = ${i.role ?? ''}, skills_used = ${i.skillsUsed ?? []}::text[], project_url = ${i.projectUrl ?? null},
      media_url = ${i.mediaUrl ?? null}, updated_at = now()
    WHERE id = ${itemId} AND student_id = ${studentId} RETURNING *`;
  if (!row) return null;
  await touch(studentId);
  return toItem(row);
}

export async function deletePortfolioItem(studentId: string, itemId: string): Promise<boolean> {
  const rows = await database()`DELETE FROM skillbridge.student_portfolio_items WHERE id = ${itemId} AND student_id = ${studentId} RETURNING id`;
  if (!rows.length) return false;
  await touch(studentId);
  return true;
}
