import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
vi.stubGlobal('React', React);
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }), usePathname: () => '/business/projects/new' }));
import { ProjectList } from '@/components/business/ProjectList';
import { BusinessProfileForm } from '@/components/business/BusinessProfileForm';
import { BriefEditor } from '@/components/business/BriefEditor';
import { ProblemForm } from '@/components/business/ProblemForm';
import { BusinessNav } from '@/components/business/BusinessNav';
import Loading from '@/app/(business)/business/loading';
import ErrorPage from '@/app/(business)/business/error';
import type { BusinessProfile, BusinessProject } from '@/lib/business/contracts';
const profile: BusinessProfile = { profile_id: 'test', business_name: 'Test shop', business_type: 'Retail', location: '', preferred_language: 'en', created_at: '2026-10-09', updated_at: '2026-10-09' };
const project: BusinessProject = { id: 'test', title: '<script>alert(1)</script>', summary: '', problem_statement: 'Order tracking is difficult', category: 'Retail', deliverables: [], required_skills: [], budget_label: '', timeline: '', preferred_language: 'en', location_text: '', remote_ok: false, mode: 'individual', compensation: 'negotiable', status: 'draft', brief_version: 1, confirmed_version: null, owner_confirmed: false, application_count: 0, questions: [], published_at: null, created_at: '2026-10-09', updated_at: '2026-10-09' };
it('renders an actionable empty dashboard without fake records', () => {
  const html = renderToStaticMarkup(<ProjectList projects={[]} />);
  expect(html).toContain('No projects yet'); expect(html).toContain('Post Your First Problem'); expect(html).toContain('/business/projects/new'); expect(html).not.toContain('Green Leaf');
});
it('renders loading and recoverable error states with accessible status roles', () => {
  expect(renderToStaticMarkup(<Loading />)).toContain('role="status"');
  const html = renderToStaticMarkup(<ErrorPage reset={() => {}} />); expect(html).toContain('role="alert"'); expect(html).toContain('Try again');
});
it('associates business profile labels and explains supported languages', () => {
  const html = renderToStaticMarkup(<BusinessProfileForm profile={null} onboarding />);
  expect(html).toContain('for="business_name"'); expect(html).toContain('id="business_name"'); expect(html).toContain('Save and continue'); expect(html).toContain('English is available');
});
it('preserves a text entry and manual draft route when generation is unavailable', () => {
  const html = renderToStaticMarkup(<ProblemForm business={profile} />);
  expect(html).toContain('id="problem"'); expect(html).toContain('Generate Project Brief'); expect(html).toContain('Save problem and write a draft'); expect(html).toContain('Voice input is not available yet');
});
it('escapes user content and disables publication of an incomplete unconfirmed draft', () => {
  const html = renderToStaticMarkup(<BriefEditor initial={project} editing />);
  expect(html).not.toContain('<script>'); expect(html).toContain('&lt;script&gt;'); expect(html).toContain('Add your project goals.'); expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Publish Project/);
});
it('provides responsive business navigation with an active page and no pending links', () => {
  const html = renderToStaticMarkup(<BusinessNav mobile />);
  expect(html).toContain('lg:hidden'); expect(html).toContain('aria-current="page"'); expect(html).toContain('Business Profile'); expect(html).not.toContain('/business/billing');
});
