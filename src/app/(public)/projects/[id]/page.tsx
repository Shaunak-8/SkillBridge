import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";
import { notFound } from "next/navigation";
import { Badge, Card, SectionTitle } from "@/components/ui";
import { SkillBadge } from "@/components/shared/ProjectCard";
import { ApplyForm } from "@/components/ws5/actions";
import { DbError } from "@/components/ws5/parts";
import { currentProfile } from "@/lib/auth/profile";
import { isUuid } from "@/lib/ws5/guard";
import { loadProject } from "@/lib/ws5/repo";

export const dynamic = "force-dynamic";

export default async function ProjectDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  let project, role: string | null = null;
  try {
    project = await loadProject(id);
    role = (await currentProfile())?.profile?.role ?? null;
  } catch { return <main className="mx-auto max-w-5xl px-5 py-10"><DbError /></main>; }
  if (!project || project.status !== "published") notFound();

  return <main className="mx-auto max-w-5xl px-5 py-10">
    <Link href="/projects" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-brand"><ArrowLeft size={16} /> Back to projects</Link>
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div>
        <div className="mb-5 flex flex-wrap items-center gap-2"><Badge>{project.category}</Badge><Badge tone="green">Open</Badge>{project.remoteOk && <Badge tone="blue">Remote OK</Badge>}</div>
        <SectionTitle title={project.title} description={project.summary} />
        <div className="flex flex-wrap gap-5 border-y border-line py-5 text-sm text-muted"><span className="flex items-center gap-2"><MapPin size={16} />{project.locationText ?? (project.remoteOk ? "Remote" : "Location flexible")}</span></div>
        {project.problemStatement && <><h2 className="mt-9 text-lg font-bold">About the project</h2><p className="mt-3 whitespace-pre-line leading-7 text-muted">{project.problemStatement}</p></>}
        {project.requiredSkills.length > 0 && <><h2 className="mt-9 text-lg font-bold">Skills we&apos;re looking for</h2><div className="mt-4 flex flex-wrap gap-2">{project.requiredSkills.map((s) => <SkillBadge key={s} name={s} />)}</div></>}
      </div>
      <Card className="h-fit p-5 lg:sticky lg:top-6">
        <h3 className="text-lg font-bold">Apply</h3>
        <p className="mb-4 mt-1 text-sm text-muted">The business reviews every application and makes the final decision.</p>
        {role === "student" ? <ApplyForm projectId={project.id} />
          : role ? <p className="text-sm text-muted">Only student accounts can apply to projects.</p>
          : <><Link href="/login" className="inline-flex w-full items-center justify-center rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">Sign in to apply</Link><p className="mt-3 text-center text-xs text-muted">New here? <Link href="/register" className="font-semibold text-brand">Create a student profile</Link></p></>}
      </Card>
    </div>
  </main>;
}
