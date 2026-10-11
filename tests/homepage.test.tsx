import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
vi.stubGlobal('React', React);

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
}));

// Mock authClient
vi.mock('@/lib/auth/client', () => ({
  authClient: {
    useSession: vi.fn(() => ({ data: null, isPending: false })),
  },
}));

// Mock i18n
vi.mock('@/lib/i18n/context', () => ({
  useLanguage: () => ({
    locale: 'en',
    language: { code: 'en', label: 'English', nativeLabel: 'English' },
    setLocale: vi.fn(),
    t: (k: string) => k,
  }),
}));

import { HomeHero } from '@/components/home/HomeHero';
import { HomeProjectsSection } from '@/components/home/HomeProjectsSection';
import { HomeValueSection } from '@/components/home/HomeValueSection';
import { Navbar } from '@/components/layout/Navbar';
import type { HomepageData } from '@/lib/projects/homepage';
import type { Project } from '@/types';

const mockSampleProject: Project = {
  id: '33333333-3333-4333-8333-333333333333',
  title: 'Real Bakery E-Commerce & Inventory Sync',
  summary: 'Automate daily stock counts and online customer ordering for a neighborhood bakery.',
  description: 'Our traditional bakery faces morning rush stockouts.',
  businessId: 'bus-1',
  businessName: 'Sharma Artisan Bakery',
  category: 'Retail & E-commerce',
  location: 'Mumbai, Maharashtra',
  status: 'published',
  mode: 'individual',
  budgetLabel: '₹12,000 Stipend',
  postedAt: '10 Oct 2026',
  duration: '3 weeks',
  requirements: [
    { id: 'req-1', skill: { id: 'react', name: 'React', type: 'technical' }, level: 'intermediate', essential: true },
    { id: 'req-2', skill: { id: 'node', name: 'Node.js', type: 'technical' }, level: 'intermediate', essential: true },
  ],
  milestones: [],
  applicants: 4,
};

describe('SkillBridge Homepage Redesign', () => {
  it('renders HomeHero with real published database projects when available', () => {
    const readyData: HomepageData = {
      state: 'ready',
      projects: [mockSampleProject],
      featuredProjects: [mockSampleProject],
      additionalProjects: [],
      stats: {
        openProjects: 1,
        completedProjects: 0,
        studentCount: 15,
        businessCount: 5,
      },
    };

    const html = renderToStaticMarkup(<HomeHero data={readyData} />);

    // Hero title & pitch
    expect(html).toContain('Good problems deserve');
    expect(html).toContain('curious people.');

    // Published project card details
    expect(html).toContain('Real Bakery E-Commerce &amp; Inventory Sync');
    expect(html).toContain('Sharma Artisan Bakery');

    // Canonical link to project detail route
    expect(html).toContain(`/projects/${mockSampleProject.id}`);

    // Verifiable stats
    expect(html).toContain('15');
    expect(html).toContain('Students');
    expect(html).toContain('Open Projects');
  });

  it('renders polished empty state when database contains 0 published projects', () => {
    const emptyData: HomepageData = {
      state: 'empty',
      projects: [],
      featuredProjects: [],
      additionalProjects: [],
      stats: {
        openProjects: 0,
        completedProjects: 0,
        studentCount: 5,
        businessCount: 2,
      },
    };

    const html = renderToStaticMarkup(<HomeHero data={emptyData} />);

    // Empty state heading & guidance
    expect(html).toContain('No open projects just yet.');
    expect(html).toContain('New opportunities from local businesses will appear here as they are published.');

    // Action to explore all projects exists and links to /projects
    expect(html).toContain('/projects');
    expect(html).toContain('Explore All Projects');
  });

  it('renders graceful unavailable state without mock data on database error', () => {
    const errorData: HomepageData = {
      state: 'db_unavailable',
      projects: [],
      featuredProjects: [],
      additionalProjects: [],
      stats: null,
      errorMessage: 'Connection refused',
    };

    const html = renderToStaticMarkup(<HomeHero data={errorData} />);

    expect(html).toContain('Live project listings temporarily unavailable');
    expect(html).toContain('We are having trouble connecting to the live projects registry');

    // Does NOT render fake/mock project cards
    expect(html).not.toContain('FreshFoods Market Pune');
  });

  it('renders HomeProjectsSection grid when additional projects are present', () => {
    const html = renderToStaticMarkup(
      <HomeProjectsSection projects={[mockSampleProject]} hasHeroProjects={true} />
    );

    expect(html).toContain('Real challenges. Real opportunities.');
    expect(html).toContain('Real Bakery E-Commerce &amp; Inventory Sync');
    expect(html).toContain('/projects');
  });

  it('renders HomeValueSection with 3 platform pillars and get started banner', () => {
    const html = renderToStaticMarkup(<HomeValueSection />);

    expect(html).toContain('From code to croissants, bring what you&#x27;re good at.');
    expect(html).toContain('For students');
    expect(html).toContain('For businesses');
    expect(html).toContain('Skills-first matching');
  });

  it('renders Navbar with logo, navigation links, and mobile menu trigger', () => {
    const html = renderToStaticMarkup(<Navbar />);

    expect(html).toContain('Skill');
    expect(html).toContain('Bridge');
    expect(html).toContain('aria-label="Open navigation menu"');
    expect(html).toContain('href="/projects"');
    expect(html).toContain('href="/community"');
    expect(html).toContain('href="/about"');
  });
});
