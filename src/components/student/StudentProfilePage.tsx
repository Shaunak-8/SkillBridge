// src/components/student/StudentProfilePage.tsx
// Main client component orchestrating Student Profile Editor, Portfolio, Completeness, and Preview

"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ExternalLink,
  Eye,
  Loader2,
  Lock,
  Pencil,
} from "lucide-react";
import type {
  ProfileCompletenessResult,
  StudentPortfolioItemDTO,
  StudentProfileDTO,
} from "@/types/student";
import { calculateProfileCompleteness } from "@/lib/validation/student";
import { ProfileCompleteness } from "./ProfileCompleteness";
import { ProfileEditor } from "./ProfileEditor";
import { PortfolioSection } from "./PortfolioSection";
import { ResumeSection } from "./ResumeSection";

export function StudentProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<StudentProfileDTO | null>(null);
  const [portfolioItems, setPortfolioItems] = useState<StudentPortfolioItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

  // Fetch student profile on mount
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        let res = await fetch("/api/students/me");
        // A single 401 can be a transient session refresh. Retry once, then send the user to sign in.
        if (res.status === 401) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          res = await fetch("/api/students/me");
          if (res.status === 401) {
            router.push("/login");
            return;
          }
        }
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error?.message || "Failed to load profile.");
        }

        const data: StudentProfileDTO = json.data;
        setProfile(data);
        setPortfolioItems(data.portfolioItems || []);
      } catch (err) {
        console.error("Error loading profile:", err);
        setError(err instanceof Error && err.message ? err.message : "Could not load profile. Please refresh.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  const handleProfileUpdated = (updated: StudentProfileDTO) => {
    setProfile(updated);
    if (updated.portfolioItems) {
      setPortfolioItems(updated.portfolioItems);
    }
  };

  const handlePortfolioItemCreated = (newItem: StudentPortfolioItemDTO) => {
    const updated = [newItem, ...portfolioItems];
    setPortfolioItems(updated);
    if (profile) {
      setProfile({ ...profile, portfolioItems: updated });
    }
  };

  const handlePortfolioItemUpdated = (updatedItem: StudentPortfolioItemDTO) => {
    const updated = portfolioItems.map((item) =>
      item.id === updatedItem.id ? updatedItem : item
    );
    setPortfolioItems(updated);
    if (profile) {
      setProfile({ ...profile, portfolioItems: updated });
    }
  };

  const handlePortfolioItemDeleted = (deletedId: string) => {
    const updated = portfolioItems.filter((item) => item.id !== deletedId);
    setPortfolioItems(updated);
    if (profile) {
      setProfile({ ...profile, portfolioItems: updated });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <Loader2 size={32} className="animate-spin text-saffron-dark" />
        <p className="text-sm font-semibold text-charcoal">Loading your student profile...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="rounded-2xl border-2 border-terracotta bg-white p-8 text-center shadow-brutal">
        <AlertCircle size={32} className="mx-auto text-terracotta" />
        <h2 className="mt-3 text-lg font-bold text-ink">Unable to load profile</h2>
        <p className="mt-1 text-xs text-muted">{error || "Please sign in as a student to view your profile."}</p>
        <button
          onClick={() => window.location.reload()}
          className="btn-press mt-4 rounded-xl border border-charcoal bg-warmCanvas px-4 py-2 text-xs font-bold text-charcoal shadow-brutal-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  const completeness: ProfileCompletenessResult = calculateProfileCompleteness(
    profile,
    portfolioItems
  );

  return (
    <div className="space-y-8">
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b-2 border-[#111111]/15 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md border-2 border-[#111111] bg-[#F7F0D2] px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-[#151515] shadow-[2px_2px_0_#111111]">
              Student Workspace
            </span>
            {profile.visibility === "draft_private" ? (
              <span className="flex items-center gap-1 rounded-md border-2 border-[#111111] bg-white px-2.5 py-0.5 text-[11px] font-bold text-[#655F52]">
                <Lock size={11} /> Private Draft
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-md border-2 border-[#111111] bg-[#F2BE4E] px-2.5 py-0.5 text-[11px] font-black text-[#151515]">
                <Eye size={11} /> Visible to Businesses
              </span>
            )}
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-[#151515] sm:text-3xl">
            {profile.displayName}&apos;s Profile & Portfolio
          </h1>
          <p className="mt-1 text-xs text-[#655F52] max-w-2xl font-medium">
            Present your skills, weekly availability, and evidence of practical work to local businesses.
          </p>
        </div>

        {/* Mode Toggle: Edit Form vs Business Preview */}
        <div className="flex items-center gap-1.5 rounded-xl border-2 border-[#111111] bg-white p-1 shadow-[3px_3px_0_#111111]">
          <button
            type="button"
            onClick={() => setActiveTab("edit")}
            className={`btn-press flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-black transition ${
              activeTab === "edit"
                ? "bg-[#D83D63] text-white border-2 border-[#111111] shadow-[2px_2px_0_#111111]"
                : "text-[#151515] hover:bg-[#F7F0D2]"
            }`}
          >
            <Pencil size={13} />
            Edit Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={`btn-press flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-black transition ${
              activeTab === "preview"
                ? "bg-[#F2BE4E] text-[#151515] border-2 border-[#111111] shadow-[2px_2px_0_#111111]"
                : "text-[#151515] hover:bg-[#F7F0D2]"
            }`}
          >
            <Eye size={13} />
            Business View
          </button>
        </div>
      </div>

      {activeTab === "edit" ? (
        /* TWO-COLUMN EDIT LAYOUT */
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          {/* Main Edit Column */}
          <div className="space-y-8 min-w-0">
            <ProfileEditor
              initialProfile={profile}
              onProfileUpdated={handleProfileUpdated}
            />

            <ResumeSection initialResume={profile.resume} />

            <PortfolioSection
              items={portfolioItems}
              onItemCreated={handlePortfolioItemCreated}
              onItemUpdated={handlePortfolioItemUpdated}
              onItemDeleted={handlePortfolioItemDeleted}
            />
          </div>

          {/* Right Sidebar */}
          <aside className="space-y-6">
            <ProfileCompleteness completeness={completeness} />

            {/* Quick Summary Card */}
            <div className="rounded-2xl border-2 border-[#111111] bg-white p-5 shadow-[4px_4px_0_#111111]">
              <h3 className="font-black text-[#151515] text-sm">Matching Availability</h3>
              <p className="mt-1 text-xs text-[#655F52]">
                Your committed weekly hours are visible to businesses when filtering matches.
              </p>
              <div className="mt-4 rounded-xl border-2 border-[#111111] bg-[#F7F0D2]/40 p-3.5 text-xs space-y-2 shadow-[2px_2px_0_#111111]">
                <div className="flex justify-between">
                  <span className="font-bold text-[#655F52]">Hours/week:</span>
                  <span className="font-black text-[#D83D63]">{profile.availability?.hoursPerWeek ?? 10} hrs</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-[#655F52]">Schedule:</span>
                  <span className="font-black text-[#151515]">{profile.availability?.schedulePreference ?? "Flexible"}</span>
                </div>
                {profile.availability?.notes && (
                  <p className="pt-2 text-[11px] text-[#655F52] italic border-t-2 border-[#111111]/10">
                    &ldquo;{profile.availability.notes}&rdquo;
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>
      ) : (
        /* BUSINESS VIEW PREVIEW */
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="rounded-2xl border-2 border-[#111111] bg-white p-6 shadow-[5px_5px_0_#111111]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="grid size-16 shrink-0 place-items-center rounded-2xl border-2 border-[#111111] bg-[#F2BE4E] text-xl font-black text-[#151515] shadow-[3px_3px_0_#111111]">
                  {profile.displayName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase() || "ST"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-[#151515]">{profile.displayName}</h2>
                    <span className="rounded-md border-2 border-[#111111] bg-[#F7F0D2] px-2 py-0.5 text-[10px] font-black text-[#151515]">
                      Student
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-[#655F52] mt-0.5">
                    {[profile.educationLevel, profile.fieldOfStudy, profile.studyYear]
                      .filter(Boolean)
                      .join(" · ") || "Student at local institution"}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border-2 border-[#111111] bg-[#F7F0D2]/40 px-3.5 py-2 text-right shadow-[2px_2px_0_#111111]">
                <p className="text-[10px] font-black uppercase tracking-wider text-[#655F52]">Availability</p>
                <p className="text-xs font-black text-[#D83D63]">
                  {profile.availability?.hoursPerWeek ?? 10} hrs / wk ({profile.availability?.schedulePreference ?? "Flexible"})
                </p>
              </div>
            </div>

            {profile.bio && (
              <p className="mt-5 rounded-xl border-2 border-[#111111] bg-[#F7F0D2]/30 p-4 text-xs leading-relaxed text-[#151515] shadow-[2px_2px_0_#111111]">
                {profile.bio}
              </p>
            )}

            {/* Current Practiced Skills */}
            <div className="mt-5">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#655F52]">
                Practiced Skills (Student-Reported)
              </h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {profile.skills?.length ? (
                  profile.skills.map((s, idx) => (
                    <span
                      key={`${s}-${idx}`}
                      className="rounded-lg border-2 border-[#111111] bg-[#F2BE4E]/30 px-2.5 py-1 text-xs font-bold text-[#151515] shadow-[1px_1px_0_#111111]"
                    >
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-[#655F52]">No skills listed yet.</span>
                )}
              </div>
            </div>

            {/* Learning Goals */}
            {profile.learningGoals && profile.learningGoals.length > 0 && (
              <div className="mt-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#655F52]">
                  Skills Wanting to Learn
                </h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {profile.learningGoals.map((g, idx) => (
                    <span
                      key={`${g}-${idx}`}
                      className="rounded-lg border-2 border-[#111111] bg-[#D83D63]/15 px-2.5 py-1 text-xs font-bold text-[#D83D63] shadow-[1px_1px_0_#111111]"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Preferred Project Categories */}
            {profile.preferredCategories && profile.preferredCategories.length > 0 && (
              <div className="mt-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#655F52]">
                  Preferred Project Categories
                </h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {profile.preferredCategories.map((c, idx) => (
                    <span
                      key={`${c}-${idx}`}
                      className="rounded-lg border-2 border-[#111111] bg-[#F7F0D2] px-2.5 py-1 text-xs font-bold text-[#151515] shadow-[1px_1px_0_#111111]"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Portfolio items preview */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#151515]">
              Portfolio Evidence ({portfolioItems.length})
            </h3>
            {portfolioItems.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-[#111111]/30 bg-white p-5 text-center text-xs text-[#655F52]">
                No portfolio projects published yet.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {portfolioItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border-2 border-[#111111] bg-white p-4 shadow-[3px_3px_0_#111111]"
                  >
                    <h4 className="font-black text-[#151515] text-xs">{item.title}</h4>
                    {item.role && (
                      <p className="mt-0.5 text-[11px] font-bold text-[#D83D63]">
                        Role: {item.role}
                      </p>
                    )}
                    <p className="mt-2 text-xs leading-relaxed text-[#655F52] line-clamp-3">
                      {item.description}
                    </p>
                    {item.skillsUsed?.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1">
                        {item.skillsUsed.map((sk, sIdx) => (
                          <span
                            key={`${sk}-${sIdx}`}
                            className="rounded bg-[#F7F0D2] border border-[#111111] px-1.5 py-0.5 text-[10px] text-[#151515] font-bold"
                          >
                            {sk}
                          </span>
                        ))}
                      </div>
                    )}
                    {item.projectUrl && (
                      <a
                        href={item.projectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-[#D83D63] hover:underline"
                      >
                        Project link <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
