import { unstable_cache } from "next/cache";
import { database } from "@/lib/db";
import { discoverProjects, FALLBACK_PUBLISHED_PROJECTS } from "@/lib/ws5/repo";
import { DEFAULT_PAGE_SIZE } from "@/lib/ws5/guard";
import { PROJECTS_BOARD_REVALIDATE_SECONDS, PROJECTS_BOARD_TAG } from "@/lib/ws5/cache-tags";
import { ProjectsBoardView } from "@/components/projects/ProjectsBoardView";

export const dynamic = "force-dynamic";

const loadBoard = unstable_cache(
  async (q: string | null, category: string | null, skill: string | null, remote: boolean | null, page: number) => {
    if (process.env.DATABASE_URL) {
      try {
        return await Promise.all([
          discoverProjects({ q, category, skill, remote }, { page, pageSize: DEFAULT_PAGE_SIZE }),
          database()`SELECT DISTINCT category FROM skillbridge.projects WHERE status = 'published' ORDER BY category LIMIT 30`.then((r) => r.map((x) => x.category as string)),
        ]);
      } catch {
        // Fall through to fallback data
      }
    }

    const projects = await discoverProjects({ q, category, skill, remote }, { page, pageSize: DEFAULT_PAGE_SIZE });
    const cats = Array.from(new Set(FALLBACK_PUBLISHED_PROJECTS.map((p) => p.category)));
    return [projects, cats] as const;
  },
  ["projects-board"],
  { revalidate: PROJECTS_BOARD_REVALIDATE_SECONDS, tags: [PROJECTS_BOARD_TAG] },
);

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim().slice(0, 100) || null;

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = one(sp.q);
  const category = one(sp.category);
  const skill = one(sp.skill);
  const remoteRaw = one(sp.remote);
  const remote = remoteRaw === "true" ? true : remoteRaw === "false" ? false : null;
  const page = Math.max(1, Number.parseInt(one(sp.page) ?? "1", 10) || 1);

  let data, categories: string[] = [];
  try {
    [data, categories] = await loadBoard(q, category, skill, remote, page);
  } catch {
    data = await discoverProjects({ q, category, skill, remote }, { page, pageSize: DEFAULT_PAGE_SIZE });
    categories = Array.from(new Set(FALLBACK_PUBLISHED_PROJECTS.map((p) => p.category)));
  }

  const pages = Math.max(1, Math.ceil(data.total / DEFAULT_PAGE_SIZE));

  return (
    <ProjectsBoardView
      initialData={data as any}
      categories={categories}
      q={q}
      category={category}
      skill={skill}
      remoteRaw={remoteRaw}
      page={page}
      pages={pages}
    />
  );
}
