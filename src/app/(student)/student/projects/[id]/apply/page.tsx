import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/profile";
import { isUuid } from "@/lib/ws5/guard";
import { loadProject } from "@/lib/ws5/repo";
import { getMyProfile } from "@/lib/students/service";
import { ApplyFormComplex } from "@/components/student/ApplyFormComplex";
import { database } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ApplyProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const auth = await requireRole('student');
  const [project, profile] = await Promise.all([
    loadProject(id), 
    getMyProfile(auth.profile.id)
  ]);

  if (!project || project.status !== "published") notFound();

  // Check if already applied
  const rows = await database()`SELECT 1 FROM skillbridge.applications a JOIN skillbridge.student_profiles sp ON sp.id = a.student_id
    WHERE a.project_id = ${id} AND sp.profile_id = ${auth.profile.id} LIMIT 1`;
  const applied = rows.length > 0;

  if (applied) {
    return (
      <main className="mx-auto max-w-4xl px-5 py-12 text-center">
        <h1 className="text-2xl font-black mb-4">You have already applied</h1>
        <p className="text-muted mb-8">You can view your application status in your dashboard.</p>
        <Link href="/student/applications" className="inline-flex rounded-xl bg-[#D83D63] text-white px-4 py-2 font-bold hover:bg-[#111111]">
          View My Applications
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <Link href={`/projects/${project.id}`} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-brand">
        <ArrowLeft size={16} /> Back to project
      </Link>
      
      <div className="mb-8">
        <h1 className="text-3xl font-black mb-2">Apply for {project.title}</h1>
        <p className="text-sm font-medium text-muted">Complete your application below.</p>
      </div>

      <ApplyFormComplex project={project} profile={profile} />
    </main>
  );
}
