import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Download, Briefcase, FileText } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { SkillBadge } from "@/components/shared/ProjectCard";
import { businessPage } from "@/lib/business/pages";
import { isUuid } from "@/lib/ws5/guard";
import { loadApplicationDetail } from "@/lib/ws5/repo";
import { ApplicationStatusScope, LiveStatusActions, LiveStatusBadge } from "@/components/ws5/status-scope";
import type { ApplicationStatus } from "@/lib/applications/status";

export const dynamic = "force-dynamic";

interface ApplicantPortfolioItem {
  id: string;
  title: string;
  description: string;
  skillsUsed: string[];
  projectUrl?: string;
}

interface ApplicantAnswer {
  question: string;
  answer_text: string;
}

interface ApplicantDetail {
  owner_profile_id: string;
  project_id: string;
  required_skills: string[] | null;
  skills: string[] | null;
  bio: string | null;
  interests: string[] | null;
  learning_goals: string[] | null;
  preferred_categories: string[] | null;
  full_name: string;
  project_title: string;
  status: string;
  pitch: string | null;
  cover_note: string | null;
  portfolio: ApplicantPortfolioItem[] | null;
  answers: ApplicantAnswer[] | null;
  education_level: string | null;
  study_year: number | null;
  location_text: string | null;
  resume_url: string | null;
  resume_name: string | null;
  availability_hours: number | null;
  availability_schedule: string | null;
  availability_notes: string | null;
  profile_portfolio: ApplicantPortfolioItem[] | null;
}

export default async function ApplicantDetailPage({ params }: { params: Promise<{ id: string, applicationId: string }> }) {
  const { id, applicationId } = await params;
  if (!isUuid(id) || !isUuid(applicationId)) notFound();

  const { owner: profileId } = await businessPage();
  const app = await loadApplicationDetail(applicationId) as ApplicantDetail | null;

  // Authorization: Only the business that owns the project can view this application
  if (!app || app.owner_profile_id !== profileId || app.project_id !== id) {
    notFound();
  }

  const projectSkills = new Set((app.required_skills as string[] || []).map(s => s.toLowerCase()));
  const studentSkills = (app.skills as string[] || []);
  
  const matchedSkills = studentSkills.filter(s => projectSkills.has(s.toLowerCase()));
  const otherSkills = studentSkills.filter(s => !projectSkills.has(s.toLowerCase()));

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <Link href={`/business/projects/${id}/applications`} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-brand">
        <ArrowLeft size={16} /> Back to applicants
      </Link>
      
      <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-black mb-2">{app.full_name}</h1>
          <p className="text-sm font-medium text-muted">Applicant for {app.project_title}</p>
        </div>
        <ApplicationStatusScope applicationId={applicationId} status={app.status as ApplicationStatus} actor="business_owner">
           <div className="flex gap-3 items-center">
             <LiveStatusBadge />
             <LiveStatusActions />
           </div>
        </ApplicationStatusScope>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* Left Column - Application Content */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-black mb-4 flex items-center gap-2"><FileText size={20} /> Application Pitch</h2>
            <div className="whitespace-pre-wrap text-sm leading-relaxed bg-[#F7F0D2]/20 p-4 rounded-xl border border-line">
              {app.pitch || app.cover_note || "No pitch provided."}
            </div>
          </Card>

          {app.profile_portfolio && app.profile_portfolio.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-black mb-4 flex items-center gap-2"><Briefcase size={20} /> Full Portfolio</h2>
              <div className="space-y-4">
                {app.profile_portfolio.map((item) => (
                  <div key={item.id} className="rounded-xl border border-line p-4">
                    <h3 className="font-bold">{item.title}</h3>
                    <p className="text-sm text-muted mt-1">{item.description}</p>
                    {item.skillsUsed?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {item.skillsUsed.map((s: string) => <Badge key={s} tone="default">{s}</Badge>)}
                      </div>
                    )}
                    {item.projectUrl && (
                      <a href={item.projectUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-brand hover:underline">
                        View Project <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-6">
            <h2 className="text-xl font-black mb-4">Complete Student Profile</h2>
            <div className="space-y-5 text-sm">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-muted mb-2">About</h3>
                <p className="whitespace-pre-wrap leading-relaxed">{app.bio || "No bio provided."}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-muted mb-2">Interests</h3>
                  <p>{app.interests?.length ? app.interests.join(", ") : "Not specified"}</p>
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-muted mb-2">Learning goals</h3>
                  <p>{app.learning_goals?.length ? app.learning_goals.join(", ") : "Not specified"}</p>
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-muted mb-2">Preferred categories</h3>
                  <p>{app.preferred_categories?.length ? app.preferred_categories.join(", ") : "Not specified"}</p>
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-muted mb-2">Availability</h3>
                  <p>{app.availability_hours ? `${app.availability_hours} hours/week` : "Not specified"}{app.availability_schedule ? ` · ${app.availability_schedule}` : ""}</p>
                  {app.availability_notes && <p className="mt-1 text-muted">{app.availability_notes}</p>}
                </div>
              </div>
            </div>
          </Card>

          {app.answers && app.answers.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-black mb-4">Screening Answers</h2>
              <div className="space-y-4">
                {app.answers.map((ans, idx) => (
                  <div key={idx} className="border-b border-line last:border-0 pb-4 last:pb-0">
                    <p className="font-bold text-sm mb-1">Q: {ans.question}</p>
                    <p className="text-sm text-muted">A: {ans.answer_text}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right Column - Profile Sidebar */}
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex flex-col items-center text-center border-b border-line pb-4 mb-4">
              <div className="size-16 bg-[#F2BE4E] rounded-xl flex items-center justify-center font-black text-xl mb-3 shadow-[2px_2px_0_#111111] border-2 border-[#111111]">
                {app.full_name?.charAt(0).toUpperCase()}
              </div>
              <h2 className="font-bold text-lg">{app.full_name}</h2>
              <p className="text-xs text-muted mt-1">
                 {app.education_level || "Student"} {app.study_year ? `· Year ${app.study_year}` : ""}
              </p>
              {app.location_text && <p className="text-xs text-muted mt-1">{app.location_text}</p>}
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-muted mb-2">Relevant Skills</h3>
                <div className="flex flex-wrap gap-1.5">
                  {matchedSkills.length > 0 ? matchedSkills.map(s => (
                    <SkillBadge key={s} name={s} />
                  )) : <span className="text-xs text-muted">No exact skill matches.</span>}
                </div>
              </div>
              
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-muted mb-2">Other Skills</h3>
                <div className="flex flex-wrap gap-1.5">
                  {otherSkills.length > 0 ? otherSkills.map(s => (
                    <SkillBadge key={s} name={s} />
                  )) : <span className="text-xs text-muted">None listed.</span>}
                </div>
              </div>

              <div>
                 <h3 className="text-xs font-black uppercase tracking-wider text-muted mb-2">Availability</h3>
                 <p className="text-sm font-bold">{app.availability_hours ? `${app.availability_hours} hours/week` : "Not specified"}</p>
              </div>

              {app.resume_url && (
                <div className="pt-4 border-t border-line">
                  <h3 className="text-xs font-black uppercase tracking-wider text-muted mb-2">Resume</h3>
                  <a href={app.resume_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 rounded-xl border border-line hover:bg-gray-50 transition">
                    <FileText size={16} className="text-brand" />
                    <span className="text-sm font-bold truncate flex-1">{app.resume_name}</span>
                    <Download size={16} className="text-muted" />
                  </a>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
