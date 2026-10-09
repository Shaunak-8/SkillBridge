import { beforeAll, afterAll, beforeEach, expect, it, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ sql: vi.fn(), profile: vi.fn(), rate: vi.fn() }));
vi.mock('@/lib/db', () => ({ database: () => mocks.sql }));
vi.mock('@/lib/auth/profile', () => ({ currentProfile: mocks.profile }));
vi.mock('@/lib/auth/security', async original => ({ ...await original<typeof import('@/lib/auth/security')>(), rateLimit: mocks.rate }));
import { businessSchema, briefSchema, confirmSchema, type BriefInput } from '@/lib/business/contracts';
import { saveBusiness, getBusiness, createDraft, getProject, editDraft, confirmDraft, publishDraft, listProjects, dashboardCounts } from '@/lib/business/service';
import { GET as me, PATCH as patchMe } from '@/app/api/business/me/route';
import { POST as create } from '@/app/api/projects/route';
import { GET as detail, PATCH as edit } from '@/app/api/projects/[id]/route';
import { POST as confirm } from '@/app/api/projects/[id]/confirm/route';
import { POST as publish } from '@/app/api/projects/[id]/publish/route';
import { POST as generate } from '@/app/api/business/generate/route';
import { GET as applicants } from '@/app/api/business/projects/[id]/applications/route';
import { PATCH as setApplicationStatus } from '@/app/api/applications/[id]/status/route';
import { GET as discover } from '@/app/api/projects/discover/route';
import { appliedStudentIds } from '@/lib/ws5/repo';

let pg: PGlite;
const owner = '00000000-0000-4000-8000-000000000001';
const other = '00000000-0000-4000-8000-000000000002';
const student = '00000000-0000-4000-8000-000000000003';
const profile = { business_name: 'Test shop', business_type: 'Retail', location: '', preferred_language: 'en' as const };
const brief: BriefInput = { title: 'Order tracker', summary: 'Track completed orders', problem_statement: 'Our shop cannot keep track of customer orders.', category: 'Retail', deliverables: ['An order tracking screen'], required_skills: ['Web development'], budget_label: '', timeline: '', preferred_language: 'en', location_text: '', remote_ok: true, mode: 'individual', compensation: 'negotiable' };
const request = (path: string, method = 'POST', body?: unknown, origin = 'http://localhost:3000') => new Request(`http://localhost:3000${path}`, { method, headers: { origin, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
const context = (id: string) => ({ params: Promise.resolve({ id }) });
beforeAll(async () => {
  pg = new PGlite();
  await pg.exec(readFileSync(new URL('./fixtures/business-schema.sql', import.meta.url), 'utf8'));
  await pg.query('INSERT INTO skillbridge.profiles(id,role) VALUES ($1,\'business\'),($2,\'business\')', [owner, other]);
  await pg.query('INSERT INTO skillbridge.profiles(id,role,full_name) VALUES ($1,\'student\',\'Test student\')', [student]);
  await pg.query('INSERT INTO skillbridge.student_profiles(id,profile_id,skills) VALUES ($1,$1,ARRAY[\'Web development\'])', [student]);
}, 30000);
afterAll(async () => { await pg?.close(); });
beforeEach(async () => {
  vi.clearAllMocks(); vi.stubEnv('APP_URL', 'http://localhost:3000');
  mocks.profile.mockResolvedValue({ user: { emailVerified: true }, profile: { id: owner, role: 'business', onboarding_completed: true } });
  mocks.rate.mockResolvedValue(true);
  mocks.sql.mockImplementation(async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const query = strings.reduce((text, part, i) => text + part + (i < values.length ? `$${i+1}` : ''), '');
    return (await pg.query(query, values)).rows;
  });
  await pg.exec('TRUNCATE skillbridge.projects CASCADE; DELETE FROM skillbridge.business_profiles;');
});
async function draft() { await saveBusiness(owner, profile); return createDraft(owner, brief); }
it('trims profile fields and rejects missing category, unknown owners, and unsupported languages', () => {
  expect(businessSchema.parse({ ...profile, business_name: ' Shop ' }).business_name).toBe('Shop');
  for (const input of [{ ...profile, business_type: '' }, { ...profile, profile_id: other }, { ...profile, preferred_language: 'xx' }]) expect(businessSchema.safeParse(input).success).toBe(false);
});
it('rejects oversized briefs and forged publication/ownership fields', () => {
  expect(briefSchema.safeParse({ ...brief, problem_statement: 'x'.repeat(5001) }).success).toBe(false);
  expect(briefSchema.safeParse({ ...brief, owner_confirmed: true, owner_profile_id: other, status: 'published' }).success).toBe(false);
});
it('rejects duplicate verification answers', () => { expect(confirmSchema.safeParse({ brief_version: 1, answers: [{ question_id: owner, answer: 'Yes' }, { question_id: owner, answer: 'Again' }] }).success).toBe(false); });
it('saves and updates only the session business profile', async () => {
  expect((await patchMe(request('/api/business/me', 'PATCH', profile))).status).toBe(200);
  expect((await getBusiness(owner))?.business_name).toBe('Test shop');
  await patchMe(request('/api/business/me', 'PATCH', { ...profile, business_name: 'Updated' }));
  expect((await getBusiness(owner))?.business_name).toBe('Updated'); expect(await getBusiness(other)).toBeNull();
});
it.each([null, { user: { emailVerified: true }, profile: { role: 'student', onboarding_completed: true } }, { user: { emailVerified: false }, profile: { role: 'business', onboarding_completed: true } }, { user: { emailVerified: true }, profile: { role: 'business', onboarding_completed: false } }])('rejects anonymous, student, unverified, and incomplete accounts', async current => {
  mocks.profile.mockResolvedValue(current); expect((await me(request('/api/business/me', 'GET'))).status).toBe(current ? 403 : 401); expect(mocks.sql).not.toHaveBeenCalled();
});
it('rejects cross-origin writes and shared rate-limit exhaustion', async () => {
  expect((await patchMe(request('/api/business/me', 'PATCH', profile, 'https://evil.example'))).status).toBe(403);
  mocks.rate.mockResolvedValue(false); expect((await patchMe(request('/api/business/me', 'PATCH', profile))).status).toBe(429); expect(mocks.sql).not.toHaveBeenCalled();
});
it('returns friendly validation and malformed input errors', async () => {
  expect((await patchMe(request('/api/business/me', 'PATCH', { ...profile, business_name: '' }))).status).toBe(400);
  const invalid = new Request('http://localhost:3000/api/business/me', { method: 'PATCH', headers: { origin: 'http://localhost:3000' }, body: '{' });
  expect((await patchMe(invalid)).status).toBe(400);
});
it('requires business onboarding before creating a draft', async () => { expect((await create(request('/api/projects', 'POST', brief))).status).toBe(409); });
it('creates a stable persistent draft and never accepts a publish flag', async () => {
  await saveBusiness(owner, profile);
  const response = await create(request('/api/projects', 'POST', brief)); const { data } = await response.json();
  expect(data.status).toBe('draft'); expect(data.owner_confirmed).toBe(false); expect((await getProject(owner, data.id)).title).toBe(brief.title);
  expect((await create(request('/api/projects', 'POST', { ...brief, owner_confirmed: true }))).status).toBe(400);
});
it('prevents cross-business read, edit, confirmation and publication', async () => {
  const project = await draft(); mocks.profile.mockResolvedValue({ user: { emailVerified: true }, profile: { id: other, role: 'business', onboarding_completed: true } });
  expect((await detail(request(`/api/projects/${project.id}`, 'GET'), context(project.id))).status).toBe(404);
  expect((await edit(request(`/api/projects/${project.id}`, 'PATCH', { ...brief, brief_version: 1 }), context(project.id))).status).toBe(404);
  expect((await confirm(request('', 'POST', { briefVersion: 1 }), context(project.id))).status).toBe(403);
  expect((await publish(request('', 'POST', { brief_version: 1 }), context(project.id))).status).toBe(404);
});
it('returns a not-found response for invalid IDs', async () => { expect((await detail(request('', 'GET'), context('invalid'))).status).toBe(404); });
it('edits draft revisions and rejects stale saves', async () => {
  const project = await draft(); const updated = await editDraft(owner, project.id, { ...brief, title: 'Updated', brief_version: 1 });
  expect(updated.brief_version).toBe(2); expect(updated.title).toBe('Updated');
  await expect(editDraft(owner, project.id, { ...brief, brief_version: 1 })).rejects.toMatchObject({ status: 409 });
});
it('rejects unconfirmed publication even through a direct request', async () => {
  const project = await draft(); expect((await publish(request('', 'POST', { brief_version: 1 }), context(project.id))).status).toBe(409);
  expect((await getProject(owner, project.id)).status).toBe('draft');
});
it('rejects incomplete brief confirmation and publication', async () => {
  await saveBusiness(owner, profile); const project = await createDraft(owner, { ...brief, summary: '', deliverables: [] });
  await expect(confirmDraft(owner, project.id, { brief_version: 1, answers: [] })).rejects.toMatchObject({ status: 400 });
  await expect(publishDraft(owner, project.id, 1)).rejects.toMatchObject({ status: 400 });
});
it('confirms and publishes a complete draft, and disallows further draft edits', async () => {
  const project = await draft(); const confirmed = await confirmDraft(owner, project.id, { brief_version: 1, answers: [] });
  expect(confirmed.confirmed_version).toBe(1); expect(confirmed.owner_confirmed).toBe(true);
  const published = await publishDraft(owner, project.id, 1); expect(published.status).toBe('published'); expect(published.published_at).toBeTruthy();
  await expect(editDraft(owner, project.id, { ...brief, brief_version: 1 })).rejects.toMatchObject({ status: 409 });
});
it('invalidates confirmation on edits and rejects stale confirmation/publication', async () => {
  const project = await draft(); await confirmDraft(owner, project.id, { brief_version: 1, answers: [] });
  const changed = await editDraft(owner, project.id, { ...brief, title: 'Changed', brief_version: 1 }); expect(changed.owner_confirmed).toBe(false); expect(changed.confirmed_version).toBeNull();
  await expect(confirmDraft(owner, project.id, { brief_version: 1, answers: [] })).rejects.toMatchObject({ status: 409 });
  await expect(publishDraft(owner, project.id, 1)).rejects.toMatchObject({ status: 409 });
});
it('records required verification answers and confirmation together under the shared trigger', async () => {
  const project = await draft();
  const question = (await pg.query<{ id: string }>('INSERT INTO skillbridge.project_questions(project_id,question) VALUES ($1,\'What result do you need?\') RETURNING id', [project.id])).rows[0];
  await expect(confirmDraft(owner, project.id, { brief_version: 1, answers: [] })).rejects.toMatchObject({ status: 400 });
  await pg.query('INSERT INTO skillbridge.project_answers(question_id,project_id,answer) VALUES ($1,$2,$3)', [question.id,project.id,'A working order tracker']);
  const confirmed = await confirmDraft(owner, project.id, { brief_version: 1, answers: [] });
  expect(confirmed.owner_confirmed).toBe(true); expect(confirmed.questions[0].answer).toBe('A working order tracker'); expect((await publishDraft(owner, project.id, 1)).status).toBe('published');
});
it('rejects verification answers for another project', async () => {
  const one = await draft(); const two = await createDraft(owner, brief);
  const q = (await pg.query<{ id: string }>('INSERT INTO skillbridge.project_questions(project_id,question) VALUES ($1,\'Question\') RETURNING id', [two.id])).rows[0];
  await expect(confirmDraft(owner, one.id, { brief_version: 1, answers: [{ question_id: q.id, answer: 'Wrong project' }] })).rejects.toMatchObject({ status: 400 });
});
it('counts only owned projects and their real applications, including an empty dashboard', async () => {
  expect(await dashboardCounts(owner)).toEqual({ total: 0, drafts: 0, published: 0, applications: 0 });
  const one = await draft(); await saveBusiness(other, profile); await createDraft(other, brief);
  await pg.query('INSERT INTO skillbridge.applications(project_id,student_id,cover_note) VALUES ($1,$2,\'Fixture application\')', [one.id, student]);
  expect(await dashboardCounts(owner)).toEqual({ total: 1, drafts: 1, published: 0, applications: 1 }); expect(await listProjects(owner)).toHaveLength(1);
});
it('validates problems and reports missing AI integration without creating fake projects', async () => {
  await saveBusiness(owner, profile);
  expect((await generate(request('', 'POST', { problem: 'short', preferred_language: 'en' }))).status).toBe(400);
  const response = await generate(request('', 'POST', { problem: brief.problem_statement, preferred_language: 'en' })); expect(response.status).toBe(503);
  expect((await response.json()).error.code).toBe('GENERATION_UNAVAILABLE'); expect(await listProjects(owner)).toHaveLength(0);
});
it('does not expose internal database errors', async () => {
  mocks.sql.mockRejectedValue(new Error('postgresql://secret internal query')); const response = await me(request('', 'GET'));
  expect(response.status).toBe(503); expect(JSON.stringify(await response.json())).not.toContain('postgresql');
});
it.each(['edit', 'confirm', 'publish'] as const)('rejects a revision changed between reading and %s', async action => {
  const project = await draft();
  if (action === 'publish') await confirmDraft(owner, project.id, { brief_version: 1, answers: [] });
  const execute = mocks.sql.getMockImplementation()!;
  let intervened = false;
  mocks.sql.mockImplementation(async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const query = strings.join('');
    if (!intervened && (query.startsWith('UPDATE skillbridge.projects') || query.startsWith('WITH locked'))) {
      intervened = true;
      await pg.query('UPDATE skillbridge.projects SET title=\'A newer edit\',brief_version=brief_version+1 WHERE id=$1', [project.id]);
    }
    return execute(strings, ...values);
  });
  const attempt = action === 'edit' ? editDraft(owner, project.id, { ...brief, brief_version: 1 }) : action === 'confirm' ? confirmDraft(owner, project.id, { brief_version: 1, answers: [] }) : publishDraft(owner, project.id, 1);
  await expect(attempt).rejects.toMatchObject({ status: 409 });
  const current = await getProject(owner, project.id);
  expect(current.title).toBe('A newer edit'); expect(current.status).toBe('draft'); expect(current.owner_confirmed).toBe(false);
});
it('rechecks required answers at publication when questions change after confirmation', async () => {
  const project = await draft(); await confirmDraft(owner, project.id, { brief_version: 1, answers: [] });
  await pg.query('INSERT INTO skillbridge.project_questions(project_id,question) VALUES ($1,\'New required question\')', [project.id]);
  await expect(publishDraft(owner, project.id, 1)).rejects.toMatchObject({ status: 409 });
  expect((await getProject(owner, project.id)).status).toBe('draft');
});
it('makes publication visible through Member 5 discovery while keeping drafts private', async () => {
  const project = await draft();
  expect((await (await discover(request('/api/projects/discover', 'GET'))).json()).items).toHaveLength(0);
  await confirmDraft(owner, project.id, { brief_version: 1, answers: [] }); await publishDraft(owner, project.id, 1);
  const data = await (await discover(request('/api/projects/discover', 'GET'))).json();
  expect(data.items).toHaveLength(1); expect(data.items[0].id).toBe(project.id); expect(data.items[0]).not.toHaveProperty('owner_profile_id');
});
it('reviews real applications and applies only allowed owner status transitions', async () => {
  const project = await draft();
  const app = (await pg.query<{ id: string }>('INSERT INTO skillbridge.applications(project_id,student_id,cover_note) VALUES ($1,$2,\'I can build this\') RETURNING id', [project.id, student])).rows[0];
  const response = await applicants(request('', 'GET'), context(project.id)); const data = await response.json();
  expect(response.status).toBe(200); expect(data.items[0].candidate.displayName).toBe('Test student'); expect(data.items[0].candidate).not.toHaveProperty('email');
  expect(await appliedStudentIds(project.id)).toEqual([student]);
  expect((await setApplicationStatus(request('', 'PATCH', { status: 'shortlisted' }), context(app.id))).status).toBe(200);
  expect((await setApplicationStatus(request('', 'PATCH', { status: 'accepted' }), context(app.id))).status).toBe(200);
  expect((await setApplicationStatus(request('', 'PATCH', { status: 'submitted' }), context(app.id))).status).toBe(409);
});
it('protects imported application APIs from unverified accounts and unrelated owners', async () => {
  const project = await draft();
  const app = (await pg.query<{ id: string }>('INSERT INTO skillbridge.applications(project_id,student_id,cover_note) VALUES ($1,$2,\'Test\') RETURNING id', [project.id, student])).rows[0];
  mocks.profile.mockResolvedValue({ user: { emailVerified: false }, profile: { id: owner, role: 'business', onboarding_completed: true } });
  expect((await applicants(request('', 'GET'), context(project.id))).status).toBe(403);
  expect((await setApplicationStatus(request('', 'PATCH', { status: 'viewed' }), context(app.id))).status).toBe(403);
  mocks.profile.mockResolvedValue({ user: { emailVerified: true }, profile: { id: other, role: 'business', onboarding_completed: true } });
  expect((await applicants(request('', 'GET'), context(project.id))).status).toBe(403);
  expect((await setApplicationStatus(request('', 'PATCH', { status: 'viewed' }), context(app.id))).status).toBe(404);
});
