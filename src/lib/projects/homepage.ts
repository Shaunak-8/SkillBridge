import 'server-only';
import { unstable_cache } from 'next/cache';
import { database } from '@/lib/db';
import type { Project, ProjectMode } from '@/types';
import type { ProjectStatus } from '@/types/backend';
import { PROJECTS_BOARD_REVALIDATE_SECONDS, PROJECTS_BOARD_TAG } from '@/lib/ws5/cache-tags';

export interface HomepageStats {
  openProjects: number;
  completedProjects: number;
  studentCount: number;
  businessCount: number;
}

export type HomepageDataState = 'ready' | 'empty' | 'db_unavailable';

export interface HomepageData {
  state: HomepageDataState;
  projects: Project[];
  featuredProjects: Project[];
  additionalProjects: Project[];
  stats: HomepageStats | null;
  errorMessage?: string;
}

interface ProjectDbRow {
  id: string;
  title: string;
  summary: string;
  problem_statement: string;
  owner_profile_id: string;
  business_name: string | null;
  category: string;
  location_text: string | null;
  status: ProjectStatus;
  mode: ProjectMode;
  budget_label: string | null;
  created_at: string;
  published_at: string | null;
  timeline: string | null;
  required_skills: string[] | null;
  applicants: number | null;
}

function mapRowToProject(row: ProjectDbRow): Project {
  const publishedDate = row.published_at || row.created_at;
  const postedAt = publishedDate
    ? new Date(publishedDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Recently';

  const skills = Array.isArray(row.required_skills) ? row.required_skills : [];

  return {
    id: row.id,
    title: row.title || 'Untitled Project',
    summary: row.summary || '',
    description: row.problem_statement || '',
    businessId: row.owner_profile_id,
    businessName: row.business_name || 'Verified Business',
    category: row.category || 'General',
    location: row.location_text || '',
    status: row.status,
    mode: row.mode || 'individual',
    budgetLabel: row.budget_label || '',
    postedAt,
    duration: row.timeline || '',
    requirements: skills.map((name, i) => ({
      id: `${row.id}-skill-${i}`,
      skill: { id: name, name, type: 'technical' },
      level: 'intermediate',
      essential: true,
    })),
    milestones: [],
    applicants: Number(row.applicants || 0),
  };
}

async function fetchRawHomepageData(): Promise<HomepageData> {
  if (!process.env.DATABASE_URL) {
    return {
      state: 'db_unavailable',
      projects: [],
      featuredProjects: [],
      additionalProjects: [],
      stats: null,
      errorMessage: 'Database connection is not configured.',
    };
  }

  try {
    const db = database();

    // Run projects query and statistics query in parallel
    const [rawProjectRows, rawStatsRows] = await Promise.all([
      db`
        SELECT
          p.id,
          p.title,
          p.summary,
          p.problem_statement,
          p.owner_profile_id,
          COALESCE(b.business_name, owner.full_name) AS business_name,
          p.category,
          p.location_text,
          p.status,
          p.mode,
          p.budget_label,
          p.created_at,
          p.published_at,
          p.timeline,
          p.required_skills,
          (SELECT count(*)::integer FROM skillbridge.applications a WHERE a.project_id = p.id) AS applicants
        FROM skillbridge.projects p
        JOIN skillbridge.profiles owner ON owner.id = p.owner_profile_id
        LEFT JOIN skillbridge.business_profiles b ON b.profile_id = p.owner_profile_id
        WHERE p.status = 'published'
        ORDER BY COALESCE(p.published_at, p.created_at) DESC, p.created_at DESC, p.id DESC
        LIMIT 9
      `,

      db`
        SELECT
          (SELECT count(*)::integer FROM skillbridge.projects WHERE status = 'published') AS open_projects,
          (SELECT count(*)::integer FROM skillbridge.projects WHERE status = 'completed') AS completed_projects,
          (SELECT count(*)::integer FROM skillbridge.profiles WHERE role = 'student') AS student_count,
          (SELECT count(*)::integer FROM skillbridge.profiles WHERE role = 'business') AS business_count
      `,
    ]);

    const projectRows = rawProjectRows as unknown as ProjectDbRow[];
    const statsRows = rawStatsRows as unknown as Array<{
      open_projects: number;
      completed_projects: number;
      student_count: number;
      business_count: number;
    }>;

    const mappedProjects = (projectRows || []).map(mapRowToProject);

    const rawStat = statsRows && statsRows[0];
    const stats: HomepageStats | null = rawStat
      ? {
          openProjects: Number(rawStat.open_projects || 0),
          completedProjects: Number(rawStat.completed_projects || 0),
          studentCount: Number(rawStat.student_count || 0),
          businessCount: Number(rawStat.business_count || 0),
        }
      : null;

    if (mappedProjects.length === 0) {
      return {
        state: 'empty',
        projects: [],
        featuredProjects: [],
        additionalProjects: [],
        stats,
      };
    }

    return {
      state: 'ready',
      projects: mappedProjects,
      featuredProjects: mappedProjects.slice(0, 3),
      additionalProjects: mappedProjects.slice(3, 9),
      stats,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Database query failed';
    return {
      state: 'db_unavailable',
      projects: [],
      featuredProjects: [],
      additionalProjects: [],
      stats: null,
      errorMessage: message,
    };
  }
}

/**
 * Cached getter for homepage published projects and verifiable statistics.
 * Automatically revalidated on PROJECTS_BOARD_TAG or after 60s.
 */
export const getHomepageData = unstable_cache(
  fetchRawHomepageData,
  ['skillbridge-homepage-projects-v2'],
  {
    revalidate: PROJECTS_BOARD_REVALIDATE_SECONDS,
    tags: [PROJECTS_BOARD_TAG],
  }
);
