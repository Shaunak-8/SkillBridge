// src/components/student/StudentDashboardView.tsx
// Rich Student Dashboard integrated with Workstream 4 profile/portfolio and Member 5 applications

"use client";

import React, { useEffect, useState } from "react";
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
import { ProfileCompleteness } from "./ProfileCompleteness";

// Shape of GET /api/students/me/applications items (WS5).
interface DashboardApplication {
  id: string;
  project_title: string;
  project_category: string;
  status: string;
  created_at: string;
}

export function StudentDashboardView() {
  const [profile, setProfile] = useState<StudentProfileDTO | null>(null);
  const [portfolioItems, setPortfolioItems] = useState<StudentPortfolioItemDTO[]>([]);
  const [applications, setApplications] = useState<DashboardApplication[]>([]);
  const [loading, setLoading] = useState(true);

  // Load profile and portfolio
  useEffect(() => {
    async function loadData() {
      try {
        const [res, appsRes] = await Promise.all([fetch("/api/students/me"), fetch("/api/students/me/applications?pageSize=5")]);
        if (res.ok) {
          const json = await res.json();
          setProfile(json.data);
          setPortfolioItems(json.data.portfolioItems || []);
        }
        if (appsRes.ok) setApplications((await appsRes.json()).items ?? []);
      } catch (err) {
        console.error("Failed to load profile for dashboard:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 size={28} className="animate-spin text-saffron-dark" />
      </div>
    );
  }

  const completeness = profile
    ? calculateProfileCompleteness(profile, portfolioItems)
    : { score: 70, checklist: [] };

  return (
    <div className="space-y-8">
      {/* Title & Greeting */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SectionTitle
          eyebrow="Student Workspace"
          title={`Good day, ${profile?.displayName || "there"}.`}
          description="Here is your current profile readiness, portfolio evidence, and application journey."
        />
        <Link href="/student/profile">
          <button className="btn-press inline-flex items-center gap-2 rounded-xl border-1.5 border-charcoal bg-saffron px-4 py-2.5 text-xs font-bold text-charcoal shadow-brutal hover:bg-saffron-dark hover:text-white transition">
            <UserCheck size={16} />
            Manage Profile & Portfolio
          </button>
        </Link>
      </div>

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
          <div className="rounded-2xl border-1.5 border-charcoal/20 bg-white p-6 shadow-brutal">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div className="flex items-center gap-3">
                <div className="grid size-12 place-items-center rounded-xl border border-charcoal/20 bg-saffron/20 font-bold text-charcoal text-base">
                  {profile?.displayName
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase() || "AM"}
                </div>
                <div>
                  <h3 className="font-bold text-ink">{profile?.displayName}</h3>
                  <p className="text-xs text-muted">
                    {[profile?.educationLevel, profile?.fieldOfStudy, profile?.studyYear]
                      .filter(Boolean)
                      .join(" · ") || "Undergraduate Student"}
                  </p>
                </div>
              </div>
              <Link href="/student/profile">
                <span className="text-xs font-semibold text-brand hover:underline">Edit details</span>
              </Link>
            </div>

            {profile?.bio && (
              <p className="mt-4 text-xs leading-relaxed text-charcoal bg-warmCanvas p-3 rounded-xl border border-charcoal/10">
                &ldquo;{profile.bio}&rdquo;
              </p>
            )}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-charcoal/15 bg-warmCanvas p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Current Skills</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {profile?.skills && profile.skills.length > 0 ? (
                    profile.skills.slice(0, 5).map((sk, idx) => (
                      <span
                        key={`${sk}-${idx}`}
                        className="rounded bg-white border border-charcoal/15 px-2 py-0.5 text-[11px] font-medium text-charcoal"
                      >
                        {sk}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted">No skills listed yet</span>
                  )}
                  {profile?.skills && profile.skills.length > 5 && (
                    <span className="text-[10px] text-muted self-center">
                      +{profile.skills.length - 5} more
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-charcoal/15 bg-warmCanvas p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Availability</p>
                <p className="mt-1.5 text-xs font-bold text-saffron-dark">
                  {profile?.availability?.hoursPerWeek ?? 10} hrs / week
                </p>
                <p className="text-[11px] text-muted">
                  Schedule: {profile?.availability?.schedulePreference ?? "Flexible"}
                </p>
              </div>
            </div>
          </div>

          {/* Portfolio Highlights */}
          <div className="rounded-2xl border-1.5 border-charcoal/20 bg-white p-6 shadow-brutal space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <Briefcase size={18} className="text-charcoal" />
                <h3 className="font-bold text-ink">Portfolio Highlights</h3>
              </div>
              <Link href="/student/profile" className="text-xs font-semibold text-brand hover:underline">
                Manage all ({portfolioItems.length})
              </Link>
            </div>

            {portfolioItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-charcoal/20 p-6 text-center text-xs text-muted">
                No portfolio items added yet.{" "}
                <Link href="/student/profile" className="font-bold text-saffron-dark hover:underline">
                  Add a project
                </Link>{" "}
                to showcase your work to business owners.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {portfolioItems.slice(0, 2).map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between rounded-xl border border-charcoal/20 bg-warmCanvas p-4"
                  >
                    <div>
                      <h4 className="font-bold text-ink text-xs">{item.title}</h4>
                      {item.role && (
                        <p className="text-[11px] font-semibold text-saffron-dark mt-0.5">
                          {item.role}
                        </p>
                      )}
                      <p className="mt-1.5 text-xs text-muted line-clamp-2">{item.description}</p>
                    </div>
                    {item.projectUrl && (
                      <a
                        href={item.projectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline"
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
          <div className="rounded-2xl border-1.5 border-charcoal/20 bg-white p-6 shadow-brutal space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <ClipboardCheck size={18} className="text-charcoal" />
                <h3 className="font-bold text-ink">Applied Projects & Status</h3>
              </div>
              <Link href="/student/applications" className="text-xs font-semibold text-brand hover:underline">
                View all applications
              </Link>
            </div>

            <div className="space-y-2.5">
              {applications.map((app) => (
                <div
                  key={app.id}
                  className="flex flex-col gap-2 rounded-xl border border-charcoal/15 bg-warmCanvas p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-bold text-xs text-ink">{app.project_title}</p>
                    <p className="mt-0.5 text-[11px] text-muted">
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
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Profile Completeness & Quick Guide */}
        <aside className="space-y-6">
          <ProfileCompleteness completeness={completeness} />

          <div className="rounded-2xl border-1.5 border-charcoal/20 bg-white p-5 shadow-brutal">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-saffron-dark" />
              <h3 className="font-bold text-ink text-sm">Recommended Next Step</h3>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Add projects to your portfolio or refine your availability so local businesses can propose projects matching your schedule.
            </p>
            <Link href="/student/projects">
              <Button className="mt-4 w-full">
                Find new projects <ArrowRight size={14} />
              </Button>
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
