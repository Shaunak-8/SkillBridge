// src/components/student/StudentProfilePage.tsx
// Main client component orchestrating Student Profile Editor, Portfolio, Completeness, and Preview

"use client";

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  Briefcase,
  ExternalLink,
  Eye,
  Loader2,
  Lock,
  Pencil,
  Sparkles,
  UserCheck,
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

export function StudentProfilePage() {
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

        const res = await fetch("/api/students/me");
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error?.message || "Failed to load profile.");
        }

        const data: StudentProfileDTO = json.data;
        setProfile(data);
        setPortfolioItems(data.portfolioItems || []);
      } catch (err: any) {
        console.error("Error loading profile:", err);
        setError(err.message || "Could not load profile. Please refresh.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md border border-charcoal/20 bg-warmCanvas px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-charcoal">
              Student Workspace
            </span>
            {profile.visibility === "draft_private" ? (
              <span className="flex items-center gap-1 rounded-md border border-charcoal/15 bg-canvas px-2 py-0.5 text-[11px] font-semibold text-muted">
                <Lock size={11} /> Private Draft
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-md border border-sage/30 bg-sage/10 px-2 py-0.5 text-[11px] font-semibold text-sage-dark">
                <Eye size={11} /> Visible to Businesses
              </span>
            )}
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {profile.displayName}&apos;s Profile & Portfolio
          </h1>
          <p className="mt-1 text-xs text-muted max-w-2xl">
            Present your skills, weekly availability, and evidence of practical work to local businesses.
          </p>
        </div>

        {/* Mode Toggle: Edit Form vs Business Preview */}
        <div className="flex items-center gap-1.5 rounded-xl border-1.5 border-charcoal/20 bg-white p-1 shadow-brutal-sm">
          <button
            type="button"
            onClick={() => setActiveTab("edit")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
              activeTab === "edit"
                ? "bg-charcoal text-white shadow-xs"
                : "text-muted hover:text-ink"
            }`}
          >
            <Pencil size={13} />
            Edit Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
              activeTab === "preview"
                ? "bg-charcoal text-white shadow-xs"
                : "text-muted hover:text-ink"
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
            <div className="rounded-2xl border-1.5 border-charcoal/20 bg-white p-5 shadow-brutal">
              <h3 className="font-bold text-ink text-sm">Matching Availability</h3>
              <p className="mt-1 text-xs text-muted">
                Your committed weekly hours are visible to businesses when filtering matches.
              </p>
              <div className="mt-4 rounded-xl border border-charcoal/15 bg-warmCanvas p-3 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted">Hours/week:</span>
                  <span className="font-bold text-charcoal">{profile.availability?.hoursPerWeek ?? 10} hrs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Schedule:</span>
                  <span className="font-semibold text-charcoal">{profile.availability?.schedulePreference ?? "Flexible"}</span>
                </div>
                {profile.availability?.notes && (
                  <p className="pt-1 text-[11px] text-muted italic border-t border-line">
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
          <div className="rounded-2xl border-2 border-charcoal bg-white p-6 shadow-brutal-lg">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="grid size-16 shrink-0 place-items-center rounded-2xl border-1.5 border-charcoal bg-saffron/20 text-xl font-bold text-charcoal shadow-brutal-sm">
                  {profile.displayName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase() || "ST"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-ink">{profile.displayName}</h2>
                    <span className="rounded-md border border-charcoal/20 bg-warmCanvas px-2 py-0.5 text-[10px] font-bold text-charcoal">
                      Student
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    {[profile.educationLevel, profile.fieldOfStudy, profile.studyYear]
                      .filter(Boolean)
                      .join(" · ") || "Student at local institution"}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-charcoal/15 bg-warmCanvas px-3 py-2 text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Availability</p>
                <p className="text-xs font-bold text-saffron-dark">
                  {profile.availability?.hoursPerWeek ?? 10} hrs / wk ({profile.availability?.schedulePreference ?? "Flexible"})
                </p>
              </div>
            </div>

            {profile.bio && (
              <p className="mt-5 rounded-xl border border-charcoal/10 bg-warmCanvas/50 p-4 text-xs leading-relaxed text-charcoal">
                {profile.bio}
              </p>
            )}

            {/* Current Practiced Skills */}
            <div className="mt-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                Practiced Skills (Student-Reported)
              </h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {profile.skills?.length ? (
                  profile.skills.map((s, idx) => (
                    <span
                      key={`${s}-${idx}`}
                      className="rounded-lg border border-saffron/30 bg-saffron/10 px-2.5 py-1 text-xs font-semibold text-saffron-dark"
                    >
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted">No skills listed yet.</span>
                )}
              </div>
            </div>

            {/* Learning Goals */}
            {profile.learningGoals && profile.learningGoals.length > 0 && (
              <div className="mt-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                  Skills Wanting to Learn
                </h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {profile.learningGoals.map((g, idx) => (
                    <span
                      key={`${g}-${idx}`}
                      className="rounded-lg border border-terracotta/30 bg-terracotta/10 px-2.5 py-1 text-xs font-semibold text-terracotta-dark"
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
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                  Preferred Project Categories
                </h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {profile.preferredCategories.map((c, idx) => (
                    <span
                      key={`${c}-${idx}`}
                      className="rounded-lg border border-charcoal/15 bg-warmCanvas px-2.5 py-1 text-xs font-medium text-charcoal"
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
            <h3 className="text-sm font-bold uppercase tracking-wider text-charcoal">
              Portfolio Evidence ({portfolioItems.length})
            </h3>
            {portfolioItems.length === 0 ? (
              <div className="rounded-xl border border-charcoal/20 bg-white p-5 text-center text-xs text-muted">
                No portfolio projects published yet.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {portfolioItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border-1.5 border-charcoal/20 bg-white p-4 shadow-brutal-sm"
                  >
                    <h4 className="font-bold text-ink text-xs">{item.title}</h4>
                    {item.role && (
                      <p className="mt-0.5 text-[11px] font-semibold text-saffron-dark">
                        Role: {item.role}
                      </p>
                    )}
                    <p className="mt-2 text-xs leading-relaxed text-muted line-clamp-3">
                      {item.description}
                    </p>
                    {item.skillsUsed?.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1">
                        {item.skillsUsed.map((sk, sIdx) => (
                          <span
                            key={`${sk}-${sIdx}`}
                            className="rounded bg-warmCanvas border border-charcoal/10 px-1.5 py-0.5 text-[10px] text-charcoal font-medium"
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
                        className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline"
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
