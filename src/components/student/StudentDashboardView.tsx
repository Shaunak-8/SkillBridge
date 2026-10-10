// src/components/student/StudentDashboardView.tsx
// Rich Student Dashboard integrated with Workstream 4 profile/portfolio and Member 5 applications

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  ExternalLink,
  GraduationCap,
  Loader2,
  Plus,
  Sparkles,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import type { StudentPortfolioItemDTO, StudentProfileDTO } from "@/types/student";
import { calculateProfileCompleteness } from "@/lib/validation/student";
import { Badge, Button, Card, SectionTitle } from "@/components/ui";
import { StatCard } from "@/components/shared/StatCard";
import { WelcomeBanner } from "@/components/shared/WelcomeBanner";
import { ProfileCompleteness } from "./ProfileCompleteness";

// Shape of GET /api/students/me/applications items (WS5).
interface DashboardApplication {
  id: string;
  project_title: string;
  project_category: string;
  status: string;
  created_at: string;
}

export function StudentDashboardView({ 
  profile, 
  applications, 
  portfolioItems 
}: { 
  profile: StudentProfileDTO | null, 
  applications: DashboardApplication[], 
  portfolioItems: StudentPortfolioItemDTO[] 
}) {
  const completeness = profile
    ? calculateProfileCompleteness(profile, portfolioItems)
    : { score: 70, checklist: [] };

  return (
    <div className="space-y-8">
      {/* NeoFlux Welcome Banner */}
      <WelcomeBanner
        role="student"
        userName={profile?.displayName}
        title="Find projects. Build your future."
        highlightWord="future"
        description="Connect with local businesses, build real-world software & creative solutions, and turn your skills into a verified portfolio."
        primaryActionLabel="Explore Projects"
        primaryActionHref="/student/projects"
        secondaryActionLabel="Manage Profile"
        secondaryActionHref="/student/profile"
        badgeText="• LIVE Opportunities"
      />

      {/* High-level stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Profile Strength"
          value={`${completeness.score}%`}
          detail={completeness.score >= 80 ? "Ready for business matching" : "Suggestions available"}
          icon={TrendingUp}
        />
        <StatCard
          label="Active Applications"
          value={String(applications.length)}
          detail={`${applications.filter((a) => a.status === "shortlisted").length} shortlisted`}
          icon={ClipboardCheck}
        />
        <StatCard
          label="Portfolio Projects"
          value={String(portfolioItems.length)}
          detail={portfolioItems.length > 0 ? "Evidence active" : "Add your first project"}
          icon={Briefcase}
        />
      </div>

      {/* Main Grid: 2 columns */}
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* Left Column */}
        <div className="space-y-8 min-w-0">
          {/* Profile Overview Card */}
          <div className="rounded-2xl border-2 border-[#111111] bg-white p-6 shadow-[4px_4px_0_#111111]">
            <div className="flex items-center justify-between border-b-2 border-[#111111]/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="grid size-12 place-items-center rounded-xl border-2 border-[#111111] bg-[#F2BE4E] font-black text-[#151515] text-base shadow-[2px_2px_0_#111111]">
                  {profile?.displayName
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase() || "ST"}
                </div>
                <div>
                  <h3 className="font-black text-[#151515] text-base">{profile?.displayName || "Student Builder"}</h3>
                  <p className="text-xs font-semibold text-[#655F52]">
                    {[profile?.educationLevel, profile?.fieldOfStudy, profile?.studyYear]
                      .filter(Boolean)
                      .join(" · ") || "Undergraduate Student"}
                  </p>
                </div>
              </div>
              <Link href="/student/profile">
                <span className="btn-press rounded-lg border-2 border-[#111111] bg-[#F7F0D2] px-3 py-1.5 text-xs font-bold text-[#151515] shadow-[2px_2px_0_#111111] hover:bg-[#F2BE4E]">
                  Edit profile
                </span>
              </Link>
            </div>
            {profile?.bio && (
              <p className="mt-4 text-xs leading-relaxed text-[#151515] bg-[#F7F0D2]/50 p-3.5 rounded-xl border-2 border-[#111111]">
                &ldquo;{profile.bio}&rdquo;
              </p>
            )}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border-2 border-[#111111] bg-[#F7F0D2]/40 p-3.5 shadow-[2px_2px_0_#111111]">
                <p className="text-[10px] font-black uppercase tracking-wider text-[#655F52]">Current Skills</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {profile?.skills && profile.skills.length > 0 ? (
                    profile.skills.slice(0, 5).map((sk, idx) => (
                      <span
                        key={`${sk}-${idx}`}
                        className="rounded-md bg-white border border-[#111111] px-2 py-0.5 text-[11px] font-bold text-[#151515]"
                      >
                        {sk}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-[#655F52]">No skills listed yet</span>
                  )}
                  {profile?.skills && profile.skills.length > 5 && (
                    <span className="text-[10px] font-bold text-[#655F52] self-center">
                      +{profile.skills.length - 5} more
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-xl border-2 border-[#111111] bg-[#F7F0D2]/40 p-3.5 shadow-[2px_2px_0_#111111]">
                <p className="text-[10px] font-black uppercase tracking-wider text-[#655F52]">Availability</p>
                <p className="mt-1 text-sm font-black text-[#D83D63]">
                  {profile?.availability?.hoursPerWeek ?? 10} hrs / week
                </p>
                <p className="text-[11px] font-semibold text-[#655F52]">
                  Schedule: {profile?.availability?.schedulePreference ?? "Flexible"}
                </p>
              </div>
            </div>
          </div>

          {/* Portfolio Highlights */}
          <div className="rounded-2xl border-2 border-[#111111] bg-white p-6 shadow-[4px_4px_0_#111111] space-y-4">
            <div className="flex items-center justify-between border-b-2 border-[#111111]/10 pb-3">
              <div className="flex items-center gap-2">
                <Briefcase size={18} className="text-[#151515]" />
                <h3 className="font-black text-[#151515] text-base">Portfolio Highlights</h3>
              </div>
              <Link href="/student/profile" className="text-xs font-bold text-[#D83D63] hover:underline">
                Manage all ({portfolioItems.length})
              </Link>
            </div>

            {portfolioItems.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-[#111111]/30 p-6 text-center text-xs text-[#655F52]">
                No portfolio items added yet.{" "}
                <Link href="/student/profile" className="font-bold text-[#D83D63] hover:underline">
                  Add a project
                </Link>{" "}
                to showcase your work to business owners.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {portfolioItems.slice(0, 2).map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between rounded-xl border-2 border-[#111111] bg-[#F7F0D2]/30 p-4 shadow-[2px_2px_0_#111111]"
                  >
                    <div>
                      <h4 className="font-black text-[#151515] text-xs">{item.title}</h4>
                      {item.role && (
                        <p className="text-[11px] font-bold text-[#D83D63] mt-0.5">
                          {item.role}
                        </p>
                      )}
                      <p className="mt-1.5 text-xs text-[#655F52] line-clamp-2">{item.description}</p>
                    </div>
                    {item.projectUrl && (
                      <a
                        href={item.projectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-[#D83D63] hover:underline"
                      >
                        View project <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Applied Projects / Application History */}
          <div className="rounded-2xl border-2 border-[#111111] bg-white p-6 shadow-[4px_4px_0_#111111] space-y-4">
            <div className="flex items-center justify-between border-b-2 border-[#111111]/10 pb-3">
              <div className="flex items-center gap-2">
                <ClipboardCheck size={18} className="text-[#151515]" />
                <h3 className="font-black text-[#151515] text-base">Applied Projects & Status</h3>
              </div>
              <Link href="/student/applications" className="text-xs font-bold text-[#D83D63] hover:underline">
                View all applications
              </Link>
            </div>

            <div className="space-y-3">
              {applications.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-[#111111]/30 p-6 text-center text-xs text-[#655F52]">
                  No active applications. Explore available projects to submit your first proposal!
                </div>
              ) : (
                applications.map((app) => (
                  <div
                    key={app.id}
                    className="flex flex-col gap-2 rounded-xl border-2 border-[#111111] bg-[#F7F0D2]/20 p-4 shadow-[2px_2px_0_#111111] sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-black text-xs text-[#151515]">{app.project_title}</p>
                      <p className="mt-0.5 text-[11px] font-medium text-[#655F52]">
                        {app.project_category || "General"} · Applied {new Date(app.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      tone={
                        app.status === "accepted"
                          ? "green"
                          : app.status === "shortlisted"
                          ? "purple"
                          : "amber"
                      }
                    >
                      {app.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Profile Completeness & Quick Guide */}
        <aside className="space-y-6">
          <ProfileCompleteness completeness={completeness} />

          <div className="rounded-2xl border-2 border-[#111111] bg-white p-5 shadow-[4px_4px_0_#111111]">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg border border-[#111111] bg-[#F2BE4E]">
                <Sparkles size={16} className="text-[#151515]" />
              </div>
              <h3 className="font-black text-[#151515] text-sm">Recommended Next Step</h3>
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-[#655F52]">
              Add projects to your portfolio or refine your availability so local businesses can propose projects matching your schedule.
            </p>
            <Link href="/student/projects">
              <Button className="mt-4 w-full">
                Find new projects <ArrowRight size={14} className="ml-1" />
              </Button>
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

