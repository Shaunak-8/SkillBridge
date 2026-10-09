import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const current = vi.hoisted(() => vi.fn());
const reindex = vi.hoisted(() => vi.fn());
const limiter = vi.hoisted(() => vi.fn());
const origin = vi.hoisted(() => ({ ok: true }));
vi.mock('@/lib/db', () => ({ database: () => vi.fn() }));
vi.mock('@/lib/auth/profile', () => ({ currentProfile: current }));
vi.mock('@/lib/auth/security', () => ({ sameOrigin: () => origin.ok, rateLimit: limiter }));
vi.mock('@/lib/ai/knowledge-index', () => ({ reindexKnowledge: reindex }));
import { POST } from '@/app/api/ai/reindex-knowledge/route';

const RESULT = { total: 10, embedded: 2, skipped: 8, failed: 0 };
const as = (role: string, extra: Record<string, unknown> = {}) =>
  current.mockResolvedValue({ user: { id: 'u', emailVerified: true }, profile: { id: 'p1', role, onboarding_completed: true, ...extra } });
const post = (body?: string) => new Request('http://x/api/ai/reindex-knowledge', { method: 'POST', body });

beforeEach(() => {
  vi.resetAllMocks();
  origin.ok = true;
  limiter.mockResolvedValue(true);
  reindex.mockResolvedValue(RESULT);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('POST /api/ai/reindex-knowledge auth', () => {
  it('rejects signed-out callers with 401', async () => {
    current.mockResolvedValue(null);
    expect((await POST(post())).status).toBe(401);
    expect(reindex).not.toHaveBeenCalled();
  });
  it.each(['student', 'business'])('rejects %s accounts with 403 and never reindexes', async (role) => {
    as(role);
    const res = await POST(post('{"force":true}'));
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe('FORBIDDEN');
    expect(reindex).not.toHaveBeenCalled();
    expect(limiter).not.toHaveBeenCalled();
  });
  it('rejects admins who have not completed onboarding', async () => {
    as('admin', { onboarding_completed: false });
    expect((await POST(post())).status).toBe(403);
    expect(reindex).not.toHaveBeenCalled();
  });
  it('rejects cross-origin requests with 403 before any auth or work', async () => {
    as('admin');
    origin.ok = false;
    const res = await POST(post());
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe('INVALID_ORIGIN');
    expect(current).not.toHaveBeenCalled();
    expect(reindex).not.toHaveBeenCalled();
  });
});

describe('POST /api/ai/reindex-knowledge behaviour', () => {
  it('returns 429 when the rate limit is exhausted', async () => {
    as('admin');
    limiter.mockResolvedValue(false);
    expect((await POST(post())).status).toBe(429);
    expect(reindex).not.toHaveBeenCalled();
  });
  it('rate limits per admin profile at 3 per window', async () => {
    as('admin');
    await POST(post());
    expect(limiter).toHaveBeenCalledWith('ai-reindex-knowledge', 'p1', 3);
  });
  it('runs for an admin with no body (force defaults to false)', async () => {
    as('admin');
    const res = await POST(post());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ result: RESULT });
    expect(reindex).toHaveBeenCalledWith({ force: undefined });
  });
  it.each([true, false])('passes force=%s through to the lib', async (force) => {
    as('admin');
    expect((await POST(post(JSON.stringify({ force })))).status).toBe(200);
    expect(reindex).toHaveBeenCalledWith({ force });
  });
  it.each(['not json', '{"force":"yes"}', '{"force":true,"extra":1}', '[1]'])('rejects invalid body %s with 400', async (body) => {
    as('admin');
    const res = await POST(post(body));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('VALIDATION_ERROR');
    expect(reindex).not.toHaveBeenCalled();
  });
  it('returns a generic 503 without leaking details when the reindex fails', async () => {
    as('admin');
    reindex.mockRejectedValue(new Error('password authentication failed for user secret_user'));
    const res = await POST(post());
    expect(res.status).toBe(503);
    expect(JSON.stringify(await res.json())).not.toContain('secret_user');
  });
});
