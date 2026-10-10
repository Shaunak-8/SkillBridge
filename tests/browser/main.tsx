import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@/app/globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import { BusinessNav } from '@/components/business/BusinessNav';
import { BusinessProfileForm } from '@/components/business/BusinessProfileForm';
import { ProblemForm } from '@/components/business/ProblemForm';
import { BriefEditor } from '@/components/business/BriefEditor';
import { ProjectList } from '@/components/business/ProjectList';
import { SectionTitle } from '@/components/ui';
import { businessRequest } from '@/lib/business/client';
import type { BusinessProfile, BusinessProject } from '@/lib/business/contracts';
import { CommunityPage } from '@/components/community/CommunityPage';
import type { CommunityPost } from '@/lib/community/service';
import { MobileNavDrawer } from '@/components/layout/MobileNavDrawer';

const previewPosts: CommunityPost[] = [
  {
    id: 'post-1',
    author_id: 'user-student-1',
    author_role: 'student',
    author_name: 'Aarav Patel',
    author_avatar: null,
    community_type: 'student',
    title: 'Completed Local Bakery E-commerce & Real-Time Inventory Sync',
    body: 'Just wrapped up a 4-week project for Sweet Delights Bakery. Built automated inventory alerts using Next.js 16 and PostgreSQL, helping them eliminate stock-out issues. Happy to answer any questions about client communication or tech stack!',
    category: 'Completed Projects',
    tags: ['nextjs', 'postgres', 'retail'],
    project_id: 'proj-1',
    project_title: 'Bakery Inventory Web App',
    created_at: new Date(Date.now() - 3600000 * 2),
    updated_at: new Date(Date.now() - 3600000 * 2),
    comment_count: 8,
    upvote_count: 24,
    downvote_count: 1,
    vote_score: 23,
    user_vote: 1,
  },
  {
    id: 'post-2',
    author_id: 'user-business-1',
    author_role: 'business',
    author_name: 'Rajesh Verma (Demo Snacks Corner)',
    author_avatar: null,
    community_type: 'business',
    title: 'What QA checklists do students prefer before milestone sign-off?',
    body: 'We are reviewing deliverables for our ordering system. For student developers here: what acceptance criteria format works best for you when verifying deliverables together?',
    category: 'Questions',
    tags: ['milestones', 'qa'],
    project_id: null,
    project_title: null,
    created_at: new Date(Date.now() - 3600000 * 5),
    updated_at: new Date(Date.now() - 3600000 * 5),
    comment_count: 12,
    upvote_count: 18,
    downvote_count: 0,
    vote_score: 18,
    user_vote: 0,
  },
  {
    id: 'post-3',
    author_id: 'user-student-2',
    author_role: 'student',
    author_name: 'Meera Nair',
    author_avatar: null,
    community_type: 'student',
    title: 'Earned AWS Certified Solutions Architect after building client infra on SkillBridge',
    body: 'Super excited to share that I passed my AWS Solutions Architect Associate exam! The real-world infra work for local business clients gave me the confidence and practical experience needed.',
    category: 'Achievements',
    tags: ['aws', 'cloud', 'career'],
    project_id: null,
    project_title: null,
    created_at: new Date(Date.now() - 3600000 * 18),
    updated_at: new Date(Date.now() - 3600000 * 18),
    comment_count: 15,
    upvote_count: 35,
    downvote_count: 0,
    vote_score: 35,
    user_vote: 0,
  },
  {
    id: 'post-4',
    author_id: 'user-business-2',
    author_role: 'business',
    author_name: 'TechNova Studio',
    author_avatar: null,
    community_type: 'business',
    title: 'New project brief posted: Customer Analytics Dashboard for Retail Chain',
    body: 'We just published a new project brief seeking 2 students with React, Tailwind, and SQL experience. Check out our project listing under Discover Projects or reach out if interested!',
    category: 'Project Updates',
    tags: ['hiring', 'react', 'dashboard'],
    project_id: 'proj-2',
    project_title: 'Customer Analytics Dashboard',
    created_at: new Date(Date.now() - 3600000 * 24),
    updated_at: new Date(Date.now() - 3600000 * 24),
    comment_count: 6,
    upvote_count: 14,
    downvote_count: 2,
    vote_score: 12,
    user_vote: 0,
  },
];

function App() {
  const [loaded, setLoaded] = useState(false);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [projects, setProjects] = useState<BusinessProject[]>([]);
  const [project, setProject] = useState<BusinessProject | null>(null);
  const [error, setError] = useState('');
  const path = window.location.pathname;

  useEffect(() => {
    async function load() {
      try {
        setBusiness(await businessRequest<BusinessProfile | null>('/api/business/me', 'GET'));
        setProjects(await businessRequest<BusinessProject[]>('/api/business/projects', 'GET'));
        const match = path.match(/\/projects\/([\w-]+)(?:\/edit)?$/);
        if (match && match[1] !== 'new') {
          setProject(await businessRequest<BusinessProject>(`/api/business/projects/${match[1]}`, 'GET'));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unable to load');
      } finally {
        setLoaded(true);
      }
    }
    void load();
  }, [path]);

  const isCommunity = path.includes('/community');

  return (
    <div className="flex min-h-screen bg-[#F7F0D2] bg-cream-grid text-[#151515]">
      {/* Desktop Persistent Sidebar */}
      <Sidebar role="business" />

      <main className="min-w-0 flex-1">
        {/* Top bar matching toggle bar reference screenshot */}
        <div className="sticky top-0 z-30 flex min-h-16 flex-wrap items-center justify-between gap-3 border-b-2 border-[#111111] bg-white px-5 py-3 sm:px-8">
          <div className="flex items-center gap-3">
            <MobileNavDrawer role="business" />
            <div className="flex items-center gap-2">
              <span className="rounded-md border-[1.5px] border-[#111111] bg-[#F2BE4E] px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-[#151515] shadow-[1.5px_1.5px_0_#111111]">
                BUSINESS HUB
              </span>
              <span className="hidden font-black text-sm text-[#151515] sm:inline">
                SkillBridge Workspace
              </span>
            </div>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border-2 border-[#111111] bg-[#F7F0D2] px-2.5 py-1 shadow-[2px_2px_0_#111111]">
              <div className="grid size-6 place-items-center rounded border border-[#111111] bg-[#D83D63] text-[10px] font-black text-white">
                AN
              </div>
              <span className="text-xs font-bold text-[#151515]">
                Ankitv
              </span>
            </div>

            <span className="hidden md:inline text-xs font-black uppercase text-[#151515]">
              ANKIT VYAVAHARE
            </span>

            <button
              type="button"
              className="text-xs font-bold text-[#151515] hover:underline"
            >
              Link Google
            </button>

            <button
              type="button"
              className="rounded-lg border-2 border-[#111111] bg-white px-3 py-1.5 text-xs font-black text-[#151515] shadow-[2px_2px_0_#111111] hover:bg-[#F7F0D2]"
            >
              Log out
            </button>
          </div>
        </div>

        {/* Mobile horizontal pill fallback */}
        <BusinessNav mobile />

        {/* Main Content Workspace */}
        <div className="mx-auto max-w-7xl p-5 sm:p-8">
          {error ? (
            <p role="alert" className="font-bold text-red-600">{error}</p>
          ) : isCommunity ? (
            <CommunityPage
              initialPosts={previewPosts}
              currentUserId="user-business-1"
              role="business"
              userProjects={[
                { id: 'proj-1', title: 'Bakery Inventory Web App' },
                { id: 'proj-2', title: 'Customer Analytics Dashboard' },
              ]}
            />
          ) : !loaded ? (
            <p role="status">Loading your business workspace…</p>
          ) : path.endsWith('/onboarding') || path.endsWith('/profile') ? (
            <>
              <SectionTitle title="Tell us a little about your business" />
              <BusinessProfileForm profile={business} onboarding />
            </>
          ) : !business ? (
            <a href="/business/onboarding">Complete your business profile</a>
          ) : path.endsWith('/new') ? (
            <>
              <SectionTitle title="What problem can we help you solve?" />
              <ProblemForm business={business} />
            </>
          ) : project ? (
            <>
              <SectionTitle title={project.title || 'Review your project brief'} />
              <BriefEditor initial={project} editing={path.endsWith('/edit')} />
            </>
          ) : (
            <>
              <SectionTitle title={`Welcome back, ${business.business_name}!`} />
              <ProjectList projects={projects} />
            </>
          )}
        </div>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
