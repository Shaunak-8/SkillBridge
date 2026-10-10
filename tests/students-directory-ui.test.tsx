import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.stubGlobal('React', React);
vi.mock('server-only', () => ({}));
const sql = vi.hoisted(() => vi.fn());
vi.mock('@/lib/db', () => ({ database: () => sql }));
vi.mock('next/navigation', () => ({ redirect: vi.fn((to: string) => { throw new Error(`REDIRECT:${to}`); }) }));
import StudentsPage from '@/app/(business)/business/students/page';
import ScreeningPage from '@/app/(business)/business/screening/page';
import { StudentsDirectoryView } from '@/components/business/StudentsDirectory';
import type { DirectoryPage } from '@/lib/ws5/students-directory';

const item = { id: 's1', displayName: 'Asha <b>Rao</b>', bio: 'Builds React apps', skills: ['React', 'SQL'], interests: [], preferredCategories: [], availabilityHoursPerWeek: 12, remotePreference: 'remote', portfolio: [{ title: 'Shop site', skillsUsed: ['React', 'CSS'] }] };
const data = (over: Partial<DirectoryPage> = {}): DirectoryPage => ({ items: [item], total: 1, page: 1, pageSize: 12, ...over });
const view = (d: DirectoryPage, f: { q?: string | null; skill?: string | null; minHours?: number | null } = {}) =>
  renderToStaticMarkup(<StudentsDirectoryView data={d} q={f.q ?? null} skill={f.skill ?? null} minHours={f.minHours ?? null} />);

beforeEach(() => { vi.clearAllMocks(); });

describe('students directory view', () => {
  it('renders the intro, form and a card with name, hours, skills and portfolio', () => {
    const html = view(data());
    expect(html).toContain('Find students');
    expect(html).toContain('Contact details stay private');
    expect(html).toContain('method="get"');
    expect(html).toContain('1 student found');
    expect(html).toContain('Asha &lt;b&gt;Rao&lt;/b&gt;');
    expect(html).toContain('12 hrs/week');
    expect(html).toContain('>React<');
    expect(html).toContain('Shop site');
    expect(html).toContain('React, CSS');
    expect(html).toContain('Builds React apps');
  });
  it('has no invite, contact or message controls and no private fields', () => {
    const html = view(data()).toLowerCase();
    expect(html).not.toMatch(/invite|contact me|message|mailto:|@example/);
    expect(html).not.toContain('<button type="button"');
    expect(html.match(/<button/g)).toHaveLength(1); // only the Search submit
  });
  it('uses a responsive 1/2/3 column grid and 16px, 44px controls', () => {
    const html = view(data());
    expect(html).toContain('md:grid-cols-2');
    expect(html).toContain('lg:grid-cols-3');
    expect(html).toContain('min-h-11 text-base');
  });
  it('shows the empty state with a clear-filters link when filters are active', () => {
    const html = view(data({ items: [], total: 0 }), { q: 'zzz' });
    expect(html).toContain('No students match those filters yet.');
    expect(html).toContain('0 students found');
    expect(html).toContain('href="/business/students"');
  });
  it('shows a plain empty state when nothing is filtered', () => {
    const html = view(data({ items: [], total: 0 }));
    expect(html).toContain('No students have opted in to matching yet.');
    expect(html).not.toContain('Clear filters');
  });
  it('paginates and keeps filters in the links', () => {
    const html = view(data({ total: 30, page: 2 }), { q: 'react', skill: 'SQL', minHours: 10 });
    expect(html).toContain('Page 2 of 3');
    expect(html).toContain('href="/business/students?q=react&amp;skill=SQL&amp;minHours=10"'); // previous = page 1
    expect(html).toContain('href="/business/students?q=react&amp;skill=SQL&amp;minHours=10&amp;page=3"');
  });
  it('hides pagination for a single page and disables Previous on page 1', () => {
    expect(view(data())).not.toContain('aria-label="Pagination"');
    expect(view(data({ total: 30 }))).toMatch(/<span class="[^"]*">Previous<\/span>/);
  });
});

describe('students page', () => {
  it('loads the directory with parsed search params', async () => {
    sql.mockResolvedValue([{ id: 's1', full_name: 'Asha', bio: 'hi', skills: ['React'], interests: [], preferred_categories: [], availability_hours_per_week: 8, remote_preference: 'either', portfolio: [], total: '1' }]);
    const html = renderToStaticMarkup(await StudentsPage({ searchParams: Promise.resolve({ skill: 'React', minHours: '5' }) }));
    expect(html).toContain('Asha');
    expect(html).toContain('value="5" selected');
    expect(sql.mock.calls[0].slice(1)).toEqual(expect.arrayContaining(['React', 5]));
  });
  it('renders the error state when the database fails', async () => {
    sql.mockRejectedValue(new Error('down'));
    const html = renderToStaticMarkup(await StudentsPage({ searchParams: Promise.resolve({}) }));
    expect(html).toContain('role="alert"');
    expect(html).toContain('We could not load this right now');
  });
});

describe('legacy screening route', () => {
  it('redirects to the new directory', () => {
    expect(() => ScreeningPage()).toThrow('REDIRECT:/business/students');
  });
});
