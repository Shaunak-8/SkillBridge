import Link from "next/link";
import { ArrowUpRight, MapPin, Search } from "lucide-react";
import { Badge, Button, Card, Input, SectionTitle } from "@/components/ui";
import { SkillBadge } from "@/components/shared/ProjectCard";
import { DbError, EmptyState } from "@/components/ws5/parts";
import { unstable_cache } from "next/cache";
import { database } from "@/lib/db";
import { discoverProjects } from "@/lib/ws5/repo";
import { DEFAULT_PAGE_SIZE } from "@/lib/ws5/guard";
import { PROJECTS_BOARD_REVALIDATE_SECONDS, PROJECTS_BOARD_TAG } from "@/lib/ws5/cache-tags";

export const dynamic = "force-dynamic";

// The board shows the same published data to everyone, so cache it instead of querying Neon on every visit.
// Publishing a project invalidates the tag; the time limit is a safety net.
const loadBoard = unstable_cache(
  async (q: string | null, category: string | null, skill: string | null, remote: boolean | null, page: number) =>
    Promise.all([
      discoverProjects({ q, category, skill, remote }, { page, pageSize: DEFAULT_PAGE_SIZE }),
      database()`SELECT DISTINCT category FROM skillbridge.projects WHERE status = 'published' ORDER BY category LIMIT 30`.then((r) => r.map((x) => x.category as string)),
    ]),
  ["projects-board"],
  { revalidate: PROJECTS_BOARD_REVALIDATE_SECONDS, tags: [PROJECTS_BOARD_TAG] },
);
type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim().slice(0, 100) || null;

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = one(sp.q), category = one(sp.category), skill = one(sp.skill), remoteRaw = one(sp.remote);
  const remote = remoteRaw === "true" ? true : remoteRaw === "false" ? false : null;
  const page = Math.max(1, Number.parseInt(one(sp.page) ?? "1", 10) || 1);
  const href = (over: Record<string, string | null>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ q, category, skill, remote: remoteRaw, page: null, ...over })) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/projects?${s}` : "/projects";
  };

  let data, categories: string[] = [];
  try {
    [data, categories] = await loadBoard(q, category, skill, remote, page);
  } catch { return <main className="mx-auto max-w-7xl px-5 py-12"><DbError /></main>; }

  const pages = Math.max(1, Math.ceil(data.total / DEFAULT_PAGE_SIZE));
  return <main className="mx-auto max-w-7xl px-5 py-12">
    <SectionTitle eyebrow="Project board" title="Find work that feels meaningful." description="Browse real challenges from local businesses. Every project is clearly scoped, skills-first and ready for curious collaborators." />
    <form method="get" action="/projects" className="mb-4 grid gap-3 rounded-2xl border border-line bg-white p-4 sm:grid-cols-[2fr_1fr_1fr_auto]">
      {category && <input type="hidden" name="category" value={category} />}
      <div className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={17} /><Input name="q" defaultValue={q ?? ""} aria-label="Search projects" className="pl-10" placeholder="Search projects..." /></div>
      <Input name="skill" defaultValue={skill ?? ""} aria-label="Filter by skill" placeholder="Skill, e.g. React" />
      <select name="remote" defaultValue={remoteRaw ?? ""} aria-label="Remote filter" className="rounded-xl border border-line bg-white px-3 py-2.5 text-sm"><option value="">Any location</option><option value="true">Remote OK</option><option value="false">On-site only</option></select>
      <Button type="submit">Search</Button>
    </form>
    <nav aria-label="Categories" className="mb-6 flex gap-2 overflow-x-auto pb-1">
      {[null, ...categories].map((c) => <Link key={c ?? "all"} href={href({ category: c })} className={`whitespace-nowrap rounded-xl border px-3 py-2 text-sm font-semibold ${c === category ? "border-brand bg-brand text-white" : "border-line bg-white text-ink hover:text-brand"}`}>{c ?? "All"}</Link>)}
    </nav>
    <p className="mb-4 text-sm text-muted">{data.total} {data.total === 1 ? "opportunity" : "opportunities"} found</p>
    {data.items.length === 0 ? <EmptyState>No projects match those filters yet. <Link href="/projects" className="font-semibold text-brand">Clear filters</Link></EmptyState> :
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{data.items.map((p) => <Card key={p.id} className="group flex h-full flex-col p-5">
        <div className="mb-4 flex items-start justify-between gap-3"><Badge>{p.category}</Badge>{p.remote_ok && <Badge tone="green">Remote OK</Badge>}</div>
        <h3 className="text-lg font-bold leading-snug group-hover:text-brand">{p.title}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{p.summary}</p>
        <div className="mt-4 flex flex-wrap gap-2">{(p.required_skills as string[]).slice(0, 4).map((s) => <SkillBadge key={s} name={s} />)}</div>
        <div className="mt-auto border-t border-line pt-4"><span className="flex items-center gap-1 text-xs text-muted"><MapPin size={14} />{p.location_text ?? (p.remote_ok ? "Remote" : "Location flexible")}</span>
          <Link href={`/projects/${p.id}`} className="mt-4 flex items-center justify-between text-sm font-semibold text-brand">View project <ArrowUpRight size={16} /></Link></div>
      </Card>)}</div>}
    {pages > 1 && <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-4 text-sm">
      {page > 1 ? <Link href={href({ page: String(page - 1) })} className="font-semibold text-brand">Previous</Link> : <span className="text-muted">Previous</span>}
      <span className="text-muted">Page {page} of {pages}</span>
      {page < pages ? <Link href={href({ page: String(page + 1) })} className="font-semibold text-brand">Next</Link> : <span className="text-muted">Next</span>}
    </nav>}
  </main>;
}
