import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui";
import { ApplyForm } from "@/components/ws5/actions";
import { DbError } from "@/components/ws5/parts";
import { currentProfile } from "@/lib/auth/profile";
import { database } from "@/lib/db";
import { isUuid } from "@/lib/ws5/guard";
import { loadProject } from "@/lib/ws5/repo";
import { StudentProjectDetailView } from "@/components/student/StudentProjectDetailView";

export const dynamic = "force-dynamic";

export default async function ProjectDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  let project, role: string | null = null, applied = false;
  try {
    // Independent reads run together instead of one after another.
    const [loaded, current] = await Promise.all([loadProject(id), currentProfile()]);
    project = loaded;
    role = current?.profile?.role ?? null;
    if (role === "student" && current?.profile?.id) {
      const rows = await database()`SELECT 1 FROM skillbridge.applications a JOIN skillbridge.student_profiles sp ON sp.id = a.student_id
        WHERE a.project_id = ${id} AND sp.profile_id = ${current.profile.id} LIMIT 1`;
      applied = rows.length > 0;
    }
  } catch { return <main className="mx-auto max-w-5xl px-5 py-10"><DbError /></main>; }
  if (!project || project.status !== "published") notFound();

  const backUrl = role === 'student' ? '/student/projects' : role === 'business' ? '/business/projects' : '/projects';

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <Link
        href={backUrl}
        className="btn-press mb-8 inline-flex items-center gap-2 rounded-xl border-2 border-[#111111] bg-white px-3.5 py-2 text-xs font-black text-[#151515] shadow-[2px_2px_0_#111111] hover:bg-[#F7F0D2] transition"
      >
        <ArrowLeft size={14} /> Back to projects
      </Link>
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <StudentProjectDetailView project={project} />
        <Card className="h-fit p-6 bg-white border-2 border-[#111111] shadow-[4px_4px_0_#111111] lg:sticky lg:top-6">
          <h3 className="text-lg font-black text-[#151515]">Apply to Project</h3>
          <p className="mb-4 mt-1 text-xs text-[#655F52]">
            The business reviews every application and makes the final decision.
          </p>
          {role === "student" ? (
            applied ? (
              <div
                role="status"
                className="rounded-xl border-2 border-[#111111] bg-[#dbf5ed] p-4 text-xs font-bold text-emerald-900 shadow-[2px_2px_0_#111111]"
              >
                You have applied to this project.{" "}
                <Link href="/student/applications" className="font-black text-[#151515] underline block mt-1">
                  View your application & status →
                </Link>
              </div>
            ) : (
              <ApplyForm projectId={project.id} />
            )
          ) : role ? (
            <div className="rounded-xl border-2 border-[#111111] bg-[#F7F0D2]/50 p-4 text-xs font-bold text-[#655F52]">
              Only student accounts can apply to projects. You are signed in as {role}.
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="btn-press inline-flex w-full items-center justify-center rounded-xl border-2 border-[#111111] bg-[#D83D63] px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-[3px_3px_0_#111111] hover:bg-[#c22e53] transition"
              >
                Sign in to apply
              </Link>
              <p className="mt-3 text-center text-xs text-[#655F52]">
                New here?{" "}
                <Link href="/register" className="font-bold text-[#D83D63] underline">
                  Create a student profile
                </Link>
              </p>
            </>
          )}
        </Card>
      </div>
    </main>
  );

}
