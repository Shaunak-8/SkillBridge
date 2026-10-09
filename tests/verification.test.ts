import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ profile: vi.fn(), sql: vi.fn(), transaction: vi.fn() }));
vi.mock('@/lib/auth/profile', () => ({ currentProfile: mocks.profile }));
vi.mock('@/lib/db', () => ({ database: () => Object.assign(mocks.sql, { transaction: mocks.transaction }) }));
import { GET as questions } from '@/app/api/projects/[id]/questions/route';
import { POST as answers } from '@/app/api/projects/[id]/answers/route';
import { PATCH as brief } from '@/app/api/projects/[id]/brief/route';
import { POST as confirm } from '@/app/api/projects/[id]/confirm/route';
const id = '11111111-1111-4111-8111-111111111111', questionId = '22222222-2222-4222-8222-222222222222';
const context = { params: Promise.resolve({ id }) };
const project = { id, owner_profile_id: 'owner', status: 'draft', brief_version: 3, title: 'Title', summary: 'Summary', problem_statement: 'Description', deliverables: ['Website'], required_skills: ['Design'] };
const request = (body: unknown = {}, origin = 'http://localhost:3000') => new Request(`http://localhost:3000/api/projects/${id}`, {
  method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body),
});
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv('APP_URL', 'http://localhost:3000');
  mocks.profile.mockResolvedValue({ user: { emailVerified: true }, profile: { id: 'owner', role: 'business', onboarding_completed: true } });
  mocks.sql.mockResolvedValue([project]);
});
describe('All WS-3 routes use shared authorization', () => {
  const routes = [questions, answers, brief, confirm];
  it.each(routes)('rejects anonymous users', async route => { mocks.profile.mockResolvedValue(null); expect((await route(request(), context)).status).toBe(401); expect(mocks.sql).not.toHaveBeenCalled(); });
  it.each(routes)('rejects students', async route => { mocks.profile.mockResolvedValue({ user: { emailVerified: true }, profile: { role: 'student', onboarding_completed: true } }); expect((await route(request(), context)).status).toBe(403); expect(mocks.sql).not.toHaveBeenCalled(); });
  it.each(routes)('rejects another business owner', async route => { mocks.sql.mockResolvedValue([{ ...project, owner_profile_id: 'someone-else' }]); expect((await route(request(), context)).status).toBe(403); expect(mocks.sql).toHaveBeenCalledTimes(1); });
  it.each([answers, brief, confirm])('rejects cross-origin mutations', async route => { expect((await route(request({}, 'https://evil.example'), context)).status).toBe(403); expect(mocks.sql).not.toHaveBeenCalled(); });
});
it('restores saved answers and maps questions to the frontend DTO', async () => {
  mocks.sql.mockResolvedValueOnce([project]).mockResolvedValueOnce([{ id: questionId, project_id: id, question: 'What is needed?', question_type: 'short_text', position: 2, required: true, saved_answer: 'A website' }]);
  const result = await (await questions(request(), context)).json();
  expect(result.data[0]).toMatchObject({ text: 'What is needed?', answerText: 'A website', sortOrder: 2 });
  expect(result.briefVersion).toBe(3);
});
it('rejects a question from another project', async () => {
  mocks.sql.mockResolvedValueOnce([project]).mockResolvedValueOnce([]);
  expect((await answers(request({ questionId, answerText: 'Answer' }), context)).status).toBe(400);
  expect(mocks.transaction).not.toHaveBeenCalled();
});
it('ignores forged answer identity and upserts against the authenticated owner', async () => {
  mocks.sql.mockResolvedValueOnce([project]).mockResolvedValueOnce([{ question_type: 'yes_no' }]);
  mocks.transaction.mockResolvedValue([[{ id: 'answer' }], [{ brief_version: 4 }]]);
  expect((await answers(request({ questionId, answerText: 'Not sure', business_user_id: 'forged' }), context)).status).toBe(200);
  expect(mocks.sql.mock.calls[2].slice(1)).toContain('owner');
  expect(mocks.sql.mock.calls.flat()).not.toContain('forged');
});
it('rejects invalid choices', async () => {
  mocks.sql.mockResolvedValueOnce([project]).mockResolvedValueOnce([{ question_type: 'multiple_choice', options: ['Website'] }]);
  expect((await answers(request({ questionId, answerText: 'Unexpected' }), context)).status).toBe(400);
});
it('rejects an answer based on an unseen version before querying the question', async () => {
  expect((await answers(request({ questionId, answerText: 'Answer', briefVersion: 2 }), context)).status).toBe(409);
  expect(mocks.sql).toHaveBeenCalledTimes(1); expect(mocks.transaction).not.toHaveBeenCalled();
});
it('updates only supplied brief fields and preserves unrelated values', async () => {
  mocks.sql.mockResolvedValueOnce([project]).mockResolvedValueOnce([{ ...project, title: 'New title', brief_version: 4, owner_confirmed: false }]);
  const result = await brief(request({ title: 'New title', briefVersion: 3 }), context);
  expect(result.status).toBe(200);
  expect(mocks.sql.mock.calls[1].slice(1).slice(0, 5)).toEqual(['New title', 'Summary', 'Description', ['Website'], ['Design']]);
});
it('rejects stale brief editing before writing', async () => {
  expect((await brief(request({ title: 'New title', briefVersion: 2 }), context)).status).toBe(409);
  expect(mocks.sql).toHaveBeenCalledTimes(1);
});
it('requires the reviewed version for confirmation', async () => {
  expect((await confirm(request(), context)).status).toBe(400); expect(mocks.sql).toHaveBeenCalledTimes(1);
});
it('rejects stale or incomplete confirmation atomically', async () => {
  mocks.sql.mockResolvedValueOnce([project]).mockResolvedValueOnce([]);
  expect((await confirm(request({ briefVersion: 2 }), context)).status).toBe(409);
});
it('translates unanswered required question rejection', async () => {
  mocks.sql.mockResolvedValueOnce([project]).mockRejectedValueOnce({ code: '23514' });
  expect((await confirm(request({ briefVersion: 3 }), context)).status).toBe(409);
});
it('confirms the current version without publishing it', async () => {
  mocks.sql.mockResolvedValueOnce([project]).mockResolvedValueOnce([{ ...project, owner_confirmed: true, confirmed_version: 3 }]);
  const result = await (await confirm(request({ briefVersion: 3 }), context)).json();
  expect(result.success).toBe(true); expect(result.data.ownerConfirmed).toBe(true); expect(result.data.status).toBe('draft');
});
