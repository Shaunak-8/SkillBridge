import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui";
import { DbError } from "@/components/ws5/parts";
import { currentProfile } from "@/lib/auth/profile";
import { database } from "@/lib/db";
import { isUuid } from "@/lib/ws5/guard";
import { loadProject } from "@/lib/ws5/repo";
import { StudentProjectDetailView } from "@/components/student/StudentProjectDetailView";
import { publicChatConfig } from '@/lib/chat/config';
import { canChatForApplication } from '@/lib/chat/policy';

export const dynamic = "force-dynamic";

export default async function ProjectDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  let project, role: string | null = null, applied = false, applicationStatus = '';
  try {
    // Independent reads run together instead of one after another.
    const [loaded, current] = await Promise.all([loadProject(id), currentProfile()]);
    project = loaded;
    role = current?.profile?.role ?? null;
    if (role === "student" && current?.profile?.id) {
      const rows = await database()`SELECT a.status FROM skillbridge.applications a JOIN skillbridge.student_profiles sp ON sp.id = a.student_id
        WHERE a.project_id = ${id} AND sp.profile_id = ${current.profile.id} LIMIT 1`;
      applied = rows.length > 0;
      applicationStatus = rows[0]?.status || '';
    }
  } catch { return <main className="mx-auto max-w-5xl px-5 py-10"><DbError /></main>; }
  if (!project || project.status !== "published") notFound();

  const backUrl = role === 'student' ? '/student/projects' : role === 'business' ? '/business/projects' : '/projects';

  return <main className="mx-auto max-w-5xl px-5 py-10">
    <Link href={backUrl} className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-brand"><ArrowLeft size={16} /> Back to projects</Link>
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <StudentProjectDetailView project={project} />
      <Card className="h-fit p-5 lg:sticky lg:top-6">
        <h3 className="text-lg font-bold">Apply</h3>
        <p className="mb-4 mt-1 text-sm text-muted">The business reviews every application and makes the final decision.</p>
        {role === "student" ? (<div className="flex flex-col gap-3">{applied
          ? <div><div role="status" className="rounded-xl bg-mint p-3 text-sm font-semibold text-emerald-700">You have applied to this project. <Link href="/student/applications" className="underline">View your application</Link></div>{publicChatConfig() && canChatForApplication(applicationStatus) && <Link href={`/student/messages?project=${project.id}`} className="mt-4 inline-flex min-h-11 items-center font-semibold text-brand underline">Chat with the business</Link>}</div>
          : <Link href={`/student/projects/${project.id}/apply`} className="inline-flex w-full items-center justify-center rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">Apply for this project</Link>}<Link href={`/student/projects/${project.id}/interview`} className="inline-flex w-full items-center justify-center rounded-xl border-2 border-brand px-4 py-2.5 text-sm font-semibold text-brand hover:bg-brand/10">Take Technical Interview</Link></div>)
          : role ? <p className="text-sm text-muted">Only student accounts can apply to projects.</p>
          : <><Link href="/login" className="inline-flex w-full items-center justify-center rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">Sign in to apply</Link><p className="mt-3 text-center text-xs text-muted">New here? <Link href="/register" className="font-semibold text-brand">Create a student profile</Link></p></>}
      </Card>
    </div>
  </main>;
}
