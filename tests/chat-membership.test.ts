import { PGlite } from '@electric-sql/pglite';
import { beforeAll, afterAll, beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ sql: vi.fn() }));
vi.mock('@/lib/db', () => ({ database: () => mocks.sql }));
import { applicationChatTarget, chatMetadata } from '@/lib/chat/membership';
import { chatUid } from '@/lib/chat/policy';
let pg: PGlite;
const owner = '00000000-0000-4000-8000-000000000001';
const student = '00000000-0000-4000-8000-000000000002';
const other = '00000000-0000-4000-8000-000000000003';
const project = '00000000-0000-4000-8000-000000000004';
const application = '00000000-0000-4000-8000-000000000005';
beforeAll(async () => {
  pg = new PGlite();
  await pg.exec(`CREATE SCHEMA skillbridge;
    CREATE TABLE skillbridge.profiles(id uuid PRIMARY KEY, role text, onboarding_completed boolean, full_name text);
    CREATE TABLE skillbridge.student_profiles(id uuid PRIMARY KEY, profile_id uuid);
    CREATE TABLE skillbridge.projects(id uuid PRIMARY KEY, title text, owner_profile_id uuid, status text);
    CREATE TABLE skillbridge.applications(id uuid PRIMARY KEY, project_id uuid, student_id uuid, status text, created_at timestamptz DEFAULT now());`);
  mocks.sql.mockImplementation(async (parts: TemplateStringsArray, ...values: unknown[]) => {
    const query = parts.reduce((result, part, i) => result + part + (i < values.length ? `$${i + 1}` : ''), '');
    return (await pg.query(query, values)).rows;
  });
});
afterAll(async () => { await pg.close(); });
beforeEach(async () => {
  await pg.exec('TRUNCATE skillbridge.applications, skillbridge.projects, skillbridge.student_profiles, skillbridge.profiles');
  await pg.query("INSERT INTO skillbridge.profiles VALUES ($1,'business',true,'Business'),($2,'student',true,'Applicant'),($3,'student',true,'Other applicant')", [owner, student, other]);
  await pg.query('INSERT INTO skillbridge.student_profiles VALUES ($1,$1),($2,$2)', [student, other]);
  await pg.query("INSERT INTO skillbridge.projects VALUES($1,'Project',$2,'published')", [project, owner]);
});
async function apply(status: string, who = student) {
  await pg.query('INSERT INTO skillbridge.applications(id,project_id,student_id,status) VALUES($1,$2,$3,$4)', [who === student ? application : other, project, who, status]);
}
it('does not grant chat or resolve a target before applying', async () => {
  expect((await chatMetadata(student)).people).toEqual([]);
  expect(await applicationChatTarget(student, project)).toBeUndefined();
});
it.each(['submitted', 'viewed', 'reviewing', 'shortlisted', 'accepted'])('allows both parties for an actual %s application', async status => {
  await apply(status);
  expect((await chatMetadata(student)).people.map(person => person.id)).toEqual([owner]);
  expect((await chatMetadata(owner)).people.map(person => person.id)).toEqual([student]);
  expect(await applicationChatTarget(student, project)).toBe(chatUid(owner));
  expect(await applicationChatTarget(owner, undefined, application)).toBe(chatUid(student));
});
it.each(['declined', 'withdrawn'])('revokes access after %s', async status => {
  await apply('submitted');
  await pg.query('UPDATE skillbridge.applications SET status=$1 WHERE id=$2', [status, application]);
  expect((await chatMetadata(student)).people).toEqual([]);
  expect((await chatMetadata(owner)).people).toEqual([]);
  expect(await applicationChatTarget(student, project)).toBeUndefined();
});
it('keeps applicants private from each other and rejects forged application links', async () => {
  await apply('submitted'); await apply('shortlisted', other);
  expect((await chatMetadata(student)).people.map(person => person.id)).toEqual([owner]);
  expect((await chatMetadata(student)).projects[0].memberIds).toEqual([owner, student]);
  expect(await applicationChatTarget(other, undefined, application)).toBeUndefined();
  expect(await applicationChatTarget(owner, undefined, application)).toBe(chatUid(student));
});
it.each(['closed', 'cancelled', 'draft'])('denies chat for %s projects', async status => {
  await apply('submitted'); await pg.query('UPDATE skillbridge.projects SET status=$1', [status]);
  expect((await chatMetadata(student)).people).toEqual([]);
  expect(await applicationChatTarget(student, project)).toBeUndefined();
});
it('retains a business relationship if another eligible application remains', async () => {
  await apply('withdrawn');
  await pg.query("INSERT INTO skillbridge.projects VALUES($1,'Second project',$2,'in_progress')", [other, owner]);
  await pg.query("INSERT INTO skillbridge.applications(id,project_id,student_id,status) VALUES($1,$1,$2,'submitted')", [other, student]);
  expect((await chatMetadata(student)).people.map(person => person.id)).toEqual([owner]);
  expect(await applicationChatTarget(student, project)).toBeUndefined();
});
