import { notFound } from "next/navigation";
import { DbError } from "@/components/ws5/parts";
import { currentProfile } from "@/lib/auth/profile";
import { database } from "@/lib/db";
import { isUuid } from "@/lib/ws5/guard";
import { loadProject } from "@/lib/ws5/repo";
import { StudentProjectDetailView } from "@/components/student/StudentProjectDetailView";
import { ProjectDetailBackButton } from "@/components/student/ProjectDetailBackButton";
import { ProjectDetailApplyCard } from "@/components/student/ProjectDetailApplyCard";
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
    if (role === "student" && current?.profile?.id && process.env.DATABASE_URL) {
      try {
        const rows = await database()`SELECT a.status FROM skillbridge.applications a JOIN skillbridge.student_profiles sp ON sp.id = a.student_id
          WHERE a.project_id = ${id} AND sp.profile_id = ${current.profile.id} LIMIT 1`;
        applied = rows.length > 0;
        applicationStatus = rows[0]?.status || '';
      } catch {
        applied = false;
      }
    }
  } catch { return <main className="mx-auto max-w-5xl px-5 py-10"><DbError /></main>; }
  if (!project || project.status !== "published") notFound();

  const backUrl = role === 'student' ? '/student/projects' : role === 'business' ? '/business/projects' : '/projects';
  const canChat = Boolean(publicChatConfig() && canChatForApplication(applicationStatus));

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <ProjectDetailBackButton href={backUrl} />
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <StudentProjectDetailView project={project} />
        <ProjectDetailApplyCard projectId={project.id} role={role} applied={applied} canChat={canChat} />
      </div>
    </main>
  );
}
