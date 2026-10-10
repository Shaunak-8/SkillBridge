import Link from "next/link";
import { Clock, Search } from "lucide-react";
import { Button, Card, Input, SectionTitle } from "@/components/ui";
import { SkillBadge } from "@/components/shared/ProjectCard";
import { EmptyState } from "@/components/ws5/parts";
import type { DirectoryPage, DirectoryStudent } from "@/lib/ws5/students-directory";

const HOUR_OPTIONS = [5, 10, 15, 20];
const FIELD = "min-h-11 text-base";
const PAGE_LINK = "inline-flex min-h-11 items-center px-3 font-semibold text-brand";

export function StudentsDirectoryView({ data, q, skill, minHours }: { data: DirectoryPage; q: string | null; skill: string | null; minHours: number | null }) {
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const href = (page: number) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (skill) p.set("skill", skill);
    if (minHours) p.set("minHours", String(minHours));
    if (page > 1) p.set("page", String(page));
    const s = p.toString();
    return s ? `/business/students?${s}` : "/business/students";
  };
  const filtered = Boolean(q || skill || minHours);

  return <div className="min-w-0">
    <SectionTitle title="Find students" description="Students who opted in to matching. Contact details stay private. Apply to your projects to start a conversation — you decide who to work with." />
    <form method="get" action="/business/students" className="mb-4 grid gap-3 rounded-2xl border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto]">
      <div className="relative"><Search className="absolute left-3 top-3.5 text-slate-400" size={17} aria-hidden /><Input name="q" defaultValue={q ?? ""} aria-label="Search students" className={`${FIELD} pl-10`} placeholder="Search bio, skills, portfolio..." maxLength={100} /></div>
      <Input name="skill" defaultValue={skill ?? ""} aria-label="Filter by skill" className={FIELD} placeholder="Skill, e.g. React" maxLength={100} />
      <select name="minHours" defaultValue={minHours ? String(minHours) : ""} aria-label="Minimum hours per week" className="min-h-11 w-full rounded-xl border-2 border-[#111111] bg-white px-3 text-base">
        <option value="">Any availability</option>
        {HOUR_OPTIONS.map((h) => <option key={h} value={h}>{h}{h === 20 ? "+" : ""} hrs/week</option>)}
      </select>
      <Button type="submit" className="min-h-11"><Search size={16} aria-hidden />Search</Button>
    </form>
    <div className="mb-4 flex flex-wrap items-center gap-x-4 text-sm text-muted">
      <p>{data.total} {data.total === 1 ? "student" : "students"} found</p>
      {filtered && <Link href="/business/students" className="inline-flex min-h-11 items-center font-semibold text-brand">Clear filters</Link>}
    </div>
    {data.items.length === 0
      ? <EmptyState>{filtered ? "No students match those filters yet." : "No students have opted in to matching yet."}{filtered && <> <Link href="/business/students" className="font-semibold text-brand">Clear filters</Link></>}</EmptyState>
      : <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{data.items.map((s) => <StudentCard key={s.id} s={s} />)}</div>}
    {pages > 1 && <nav aria-label="Pagination" className="mt-8 flex flex-wrap items-center justify-center gap-2 text-sm">
      {data.page > 1 ? <Link href={href(data.page - 1)} className={PAGE_LINK}>Previous</Link> : <span className="px-3 text-muted">Previous</span>}
      <span className="text-muted">Page {data.page} of {pages}</span>
      {data.page < pages ? <Link href={href(data.page + 1)} className={PAGE_LINK}>Next</Link> : <span className="px-3 text-muted">Next</span>}
    </nav>}
  </div>;
}

function StudentCard({ s }: { s: DirectoryStudent }) {
  return <Card className="flex h-full min-w-0 flex-col p-5">
    <div className="flex items-start justify-between gap-3">
      <h2 className="min-w-0 break-words text-lg font-bold leading-snug">{s.displayName}</h2>
      {s.availabilityHoursPerWeek != null && <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-muted"><Clock size={14} aria-hidden />{s.availabilityHoursPerWeek} hrs/week</span>}
    </div>
    {s.bio && <p className="mt-2 line-clamp-3 break-words text-sm leading-6 text-muted">{s.bio}</p>}
    {s.skills.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{s.skills.slice(0, 6).map((k) => <SkillBadge key={k} name={k} />)}</div>}
    {s.portfolio.length > 0 && <div className="mt-auto border-t border-line pt-4">
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Portfolio</p>
      <ul className="space-y-2">{s.portfolio.map((p, i) => <li key={`${p.title}-${i}`} className="text-sm"><span className="break-words font-semibold">{p.title}</span>
        {p.skillsUsed.length > 0 && <span className="block break-words text-xs text-muted">{p.skillsUsed.join(", ")}</span>}</li>)}</ul>
    </div>}
  </Card>;
}
