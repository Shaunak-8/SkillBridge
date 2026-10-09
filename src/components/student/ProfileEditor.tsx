// src/components/student/ProfileEditor.tsx
// Workstream 4: Student Profile Editor with validation, availability, and visibility controls

import React, { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  RotateCcw,
  Save,
  Sparkles,
  User,
} from "lucide-react";
import {
  SUPPORTED_PROJECT_CATEGORIES,
  type AvailabilityConfig,
  type ProfileVisibility,
  type StudentProfileDTO,
  type StudentProfileUpdateInput,
} from "@/types/student";
import { validateProfileUpdate } from "@/lib/validation/student";
import { SkillTagInput } from "./SkillTagInput";

interface ProfileEditorProps {
  initialProfile: StudentProfileDTO;
  onProfileUpdated: (updated: StudentProfileDTO) => void;
}

export function ProfileEditor({ initialProfile, onProfileUpdated }: ProfileEditorProps) {
  // Form fields
  const [displayName, setDisplayName] = useState(initialProfile.displayName || "");
  const [bio, setBio] = useState(initialProfile.bio || "");
  const [educationLevel, setEducationLevel] = useState(initialProfile.educationLevel || "Undergraduate");
  const [fieldOfStudy, setFieldOfStudy] = useState(initialProfile.fieldOfStudy || "");
  const [studyYear, setStudyYear] = useState(initialProfile.studyYear || "3rd Year");
  const [skills, setSkills] = useState<string[]>(initialProfile.skills || []);
  const [learningGoals, setLearningGoals] = useState<string[]>(initialProfile.learningGoals || []);
  const [interests, setInterests] = useState<string[]>(initialProfile.interests || []);
  const [preferredCategories, setPreferredCategories] = useState<string[]>(
    initialProfile.preferredCategories || []
  );
  const [hoursPerWeek, setHoursPerWeek] = useState<number>(
    initialProfile.availability?.hoursPerWeek ?? 10
  );
  const [schedulePreference, setSchedulePreference] = useState<AvailabilityConfig["schedulePreference"]>(
    initialProfile.availability?.schedulePreference || "Flexible"
  );
  const [availabilityNotes, setAvailabilityNotes] = useState(
    initialProfile.availability?.notes || ""
  );
  const [visibility, setVisibility] = useState<ProfileVisibility>(
    initialProfile.visibility || "public_to_businesses"
  );

  // Status & feedback
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Detect unsaved changes
  const hasChanges =
    displayName !== initialProfile.displayName ||
    bio !== initialProfile.bio ||
    educationLevel !== initialProfile.educationLevel ||
    fieldOfStudy !== initialProfile.fieldOfStudy ||
    studyYear !== initialProfile.studyYear ||
    JSON.stringify(skills) !== JSON.stringify(initialProfile.skills) ||
    JSON.stringify(learningGoals) !== JSON.stringify(initialProfile.learningGoals) ||
    JSON.stringify(interests) !== JSON.stringify(initialProfile.interests) ||
    JSON.stringify(preferredCategories) !== JSON.stringify(initialProfile.preferredCategories) ||
    hoursPerWeek !== (initialProfile.availability?.hoursPerWeek ?? 10) ||
    schedulePreference !== (initialProfile.availability?.schedulePreference || "Flexible") ||
    availabilityNotes !== (initialProfile.availability?.notes || "") ||
    visibility !== initialProfile.visibility;

  const handleReset = () => {
    setDisplayName(initialProfile.displayName || "");
    setBio(initialProfile.bio || "");
    setEducationLevel(initialProfile.educationLevel || "Undergraduate");
    setFieldOfStudy(initialProfile.fieldOfStudy || "");
    setStudyYear(initialProfile.studyYear || "3rd Year");
    setSkills(initialProfile.skills || []);
    setLearningGoals(initialProfile.learningGoals || []);
    setInterests(initialProfile.interests || []);
    setPreferredCategories(initialProfile.preferredCategories || []);
    setHoursPerWeek(initialProfile.availability?.hoursPerWeek ?? 10);
    setSchedulePreference(initialProfile.availability?.schedulePreference || "Flexible");
    setAvailabilityNotes(initialProfile.availability?.notes || "");
    setVisibility(initialProfile.visibility || "public_to_businesses");
    setFieldErrors({});
    setGlobalError(null);
  };

  const toggleCategory = (cat: string) => {
    if (preferredCategories.includes(cat)) {
      setPreferredCategories(preferredCategories.filter((c) => c !== cat));
    } else {
      setPreferredCategories([...preferredCategories, cat]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setGlobalError(null);
    setSaveSuccess(false);

    const updatePayload: StudentProfileUpdateInput = {
      displayName: displayName.trim(),
      bio: bio.trim(),
      educationLevel: educationLevel.trim(),
      fieldOfStudy: fieldOfStudy.trim(),
      studyYear: studyYear.trim(),
      skills,
      learningGoals,
      interests,
      preferredCategories,
      availability: {
        hoursPerWeek,
        schedulePreference,
        notes: availabilityNotes.trim() || undefined,
      },
      visibility,
    };

    const validation = validateProfileUpdate(updatePayload);
    if (!validation.valid || !validation.sanitized) {
      setFieldErrors(validation.errors);
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/students/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.sanitized),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to update profile.");
      }

      onProfileUpdated(json.data);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setGlobalError(err.message || "Failed to save profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Feedback alerts */}
      {saveSuccess && (
        <div className="flex items-center gap-2 rounded-xl border border-sage/40 bg-sage/10 p-3.5 text-xs font-semibold text-sage-dark animate-in fade-in">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>Profile changes saved successfully!</span>
        </div>
      )}

      {globalError && (
        <div className="flex items-center gap-2 rounded-xl border border-terracotta/40 bg-terracotta/10 p-3.5 text-xs font-semibold text-terracotta-dark">
          <AlertCircle size={16} className="shrink-0" />
          <span>{globalError}</span>
        </div>
      )}

      {/* SECTION 1: BASIC INFORMATION */}
      <div className="rounded-2xl border-1.5 border-charcoal/20 bg-white p-6 shadow-brutal space-y-4">
        <div className="flex items-center gap-2 border-b border-line pb-3">
          <User size={18} className="text-charcoal" />
          <h2 className="font-bold text-ink">About You</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Display Name */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-charcoal">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Aarav Mehta"
              className="mt-1.5 w-full rounded-xl border-1.5 border-charcoal/20 bg-warmCanvas px-3.5 py-2.5 text-xs text-ink placeholder:text-muted outline-none focus:border-charcoal focus:ring-2 focus:ring-charcoal/10"
            />
            {fieldErrors.displayName && (
              <p className="mt-1 text-xs text-terracotta">{fieldErrors.displayName}</p>
            )}
          </div>

          {/* Short Bio */}
          <div className="sm:col-span-2">
            <div className="flex justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-charcoal">
                Short Bio / Introduction
              </label>
              <span className="text-[11px] text-muted">{bio.length}/1000</span>
            </div>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell businesses what kinds of problems you enjoy working on..."
              maxLength={1000}
              className="mt-1.5 w-full rounded-xl border-1.5 border-charcoal/20 bg-warmCanvas px-3.5 py-2.5 text-xs text-ink placeholder:text-muted outline-none focus:border-charcoal focus:ring-2 focus:ring-charcoal/10"
            />
            <p className="mt-1 text-[11px] text-muted">
              Use plain language. Avoid buzzwords so local business owners can easily understand.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 2: EDUCATION & BACKGROUND */}
      <div className="rounded-2xl border-1.5 border-charcoal/20 bg-white p-6 shadow-brutal space-y-4">
        <div className="flex items-center gap-2 border-b border-line pb-3">
          <GraduationCap size={18} className="text-charcoal" />
          <h2 className="font-bold text-ink">Education & Study</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-charcoal">
              Education Level
            </label>
            <select
              value={educationLevel}
              onChange={(e) => setEducationLevel(e.target.value)}
              className="mt-1.5 w-full rounded-xl border-1.5 border-charcoal/20 bg-warmCanvas px-3 py-2.5 text-xs text-ink outline-none focus:border-charcoal focus:ring-2 focus:ring-charcoal/10"
            >
              <option value="Undergraduate">Undergraduate (Degree)</option>
              <option value="Diploma">Diploma / Polytechnic</option>
              <option value="Postgraduate">Postgraduate (Masters)</option>
              <option value="Higher Secondary">Higher Secondary (12th)</option>
              <option value="Self-Taught">Self-Taught / Independent</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-charcoal">
              Course / Field of Study
            </label>
            <input
              type="text"
              value={fieldOfStudy}
              onChange={(e) => setFieldOfStudy(e.target.value)}
              placeholder="e.g. Computer Science, Commerce, Design"
              className="mt-1.5 w-full rounded-xl border-1.5 border-charcoal/20 bg-warmCanvas px-3.5 py-2.5 text-xs text-ink placeholder:text-muted outline-none focus:border-charcoal focus:ring-2 focus:ring-charcoal/10"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-charcoal">
              Current Year
            </label>
            <select
              value={studyYear}
              onChange={(e) => setStudyYear(e.target.value)}
              className="mt-1.5 w-full rounded-xl border-1.5 border-charcoal/20 bg-warmCanvas px-3 py-2.5 text-xs text-ink outline-none focus:border-charcoal focus:ring-2 focus:ring-charcoal/10"
            >
              <option value="1st Year">1st Year (FY)</option>
              <option value="2nd Year">2nd Year (SY)</option>
              <option value="3rd Year">3rd Year (TY)</option>
              <option value="Final Year">Final Year</option>
              <option value="Recent Graduate">Recent Graduate</option>
            </select>
          </div>
        </div>
      </div>

      {/* SECTION 3: SKILLS, LEARNING GOALS & INTERESTS */}
      <div className="rounded-2xl border-1.5 border-charcoal/20 bg-white p-6 shadow-brutal space-y-6">
        <div className="flex items-center gap-2 border-b border-line pb-3">
          <Sparkles size={18} className="text-saffron-dark" />
          <div>
            <h2 className="font-bold text-ink">Skills & Goals</h2>
            <p className="text-[11px] text-muted">
              Current skills represent abilities you have actually practiced; learning goals represent what you wish to explore.
            </p>
          </div>
        </div>

        {/* Current Skills */}
        <SkillTagInput
          label="Current Practiced Skills"
          placeholder="e.g. React, Excel, Social Media, Inventory Management"
          helperText="Skills you have hands-on experience with in projects, coursework, or hobbies (Student-reported)."
          tags={skills}
          onChange={setSkills}
          maxTags={20}
          tone="saffron"
        />

        {/* Learning Goals */}
        <SkillTagInput
          label="Skills You Want to Learn (Learning Goals)"
          placeholder="e.g. PostgreSQL, Video Editing, Customer Interviews"
          helperText="Technologies or skills you aspire to learn next. Kept distinct so businesses don't confuse aspirations with existing mastery."
          tags={learningGoals}
          onChange={setLearningGoals}
          maxTags={12}
          tone="terracotta"
        />

        {/* General Interests */}
        <SkillTagInput
          label="Interests & Passions"
          placeholder="e.g. Local commerce, Kirana digitisation, Food culture, Eco packaging"
          helperText="Subjects or industries that fascinate you."
          tags={interests}
          onChange={setInterests}
          maxTags={12}
          tone="sage"
        />

        {/* Preferred Project Categories */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-charcoal">
            Preferred Project Categories
          </label>
          <p className="text-xs text-muted">
            Select the types of projects you would love to work on with businesses:
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {SUPPORTED_PROJECT_CATEGORIES.map((cat) => {
              const selected = preferredCategories.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                    selected
                      ? "border-charcoal bg-charcoal text-white shadow-brutal-sm"
                      : "border-charcoal/20 bg-warmCanvas text-ink hover:border-charcoal/40"
                  }`}
                >
                  {cat} {selected && "✓"}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECTION 4: REALISTIC AVAILABILITY */}
      <div className="rounded-2xl border-1.5 border-charcoal/20 bg-white p-6 shadow-brutal space-y-4">
        <div className="flex items-center gap-2 border-b border-line pb-3">
          <Clock size={18} className="text-charcoal" />
          <div>
            <h2 className="font-bold text-ink">Realistic Weekly Availability</h2>
            <p className="text-[11px] text-muted">
              Honest commitments prevent burnout and build trust with business partners.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Hours per week */}
          <div>
            <div className="flex justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-charcoal">
                Hours Per Week
              </label>
              <span className="text-xs font-bold text-saffron-dark">{hoursPerWeek} hrs / week</span>
            </div>
            <input
              type="range"
              min={2}
              max={40}
              step={1}
              value={hoursPerWeek}
              onChange={(e) => setHoursPerWeek(Number(e.target.value))}
              className="mt-3 w-full accent-saffron"
            />
            <div className="mt-2 flex gap-2">
              {[5, 10, 15, 20].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setHoursPerWeek(preset)}
                  className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                    hoursPerWeek === preset
                      ? "border-charcoal bg-saffron text-charcoal"
                      : "border-charcoal/20 bg-warmCanvas text-muted hover:text-ink"
                  }`}
                >
                  {preset} hrs
                </button>
              ))}
            </div>
          </div>

          {/* Schedule Preference */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-charcoal">
              Preferred Working Schedule
            </label>
            <select
              value={schedulePreference}
              onChange={(e) =>
                setSchedulePreference(e.target.value as AvailabilityConfig["schedulePreference"])
              }
              className="mt-1.5 w-full rounded-xl border-1.5 border-charcoal/20 bg-warmCanvas px-3 py-2.5 text-xs text-ink outline-none focus:border-charcoal focus:ring-2 focus:ring-charcoal/10"
            >
              <option value="Flexible">Flexible (Adapts to project)</option>
              <option value="Weekdays">Weekdays (Mon–Fri)</option>
              <option value="Weekends">Weekends only (Sat–Sun)</option>
              <option value="Evenings">Evenings after college</option>
              <option value="Part-time">Part-time structured blocks</option>
            </select>

            <input
              type="text"
              value={availabilityNotes}
              onChange={(e) => setAvailabilityNotes(e.target.value)}
              placeholder="e.g. Free after 4 PM on weekdays"
              maxLength={200}
              className="mt-3 w-full rounded-xl border border-charcoal/20 bg-warmCanvas px-3 py-2 text-xs text-ink placeholder:text-muted outline-none focus:border-charcoal"
            />
          </div>
        </div>
      </div>

      {/* SECTION 5: VISIBILITY CONTROLS */}
      <div className="rounded-2xl border-1.5 border-charcoal/20 bg-white p-6 shadow-brutal space-y-4">
        <div className="flex items-center gap-2 border-b border-line pb-3">
          {visibility === "public_to_businesses" ? (
            <Eye size={18} className="text-sage" />
          ) : (
            <EyeOff size={18} className="text-muted" />
          )}
          <div>
            <h2 className="font-bold text-ink">Profile Visibility</h2>
            <p className="text-[11px] text-muted">Control who can discover your profile for matching.</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-xl border-1.5 p-3.5 transition ${
              visibility === "public_to_businesses"
                ? "border-charcoal bg-warmCanvas shadow-brutal-sm"
                : "border-charcoal/20 bg-white hover:bg-canvas"
            }`}
          >
            <input
              type="radio"
              name="visibility"
              value="public_to_businesses"
              checked={visibility === "public_to_businesses"}
              onChange={() => setVisibility("public_to_businesses")}
              className="mt-1 accent-charcoal"
            />
            <div>
              <p className="text-xs font-bold text-ink">Visible to Businesses (Recommended)</p>
              <p className="mt-0.5 text-[11px] text-muted leading-relaxed">
                Local businesses can view your skills, portfolio, and match you with open projects.
              </p>
            </div>
          </label>

          <label
            className={`flex cursor-pointer items-start gap-3 rounded-xl border-1.5 p-3.5 transition ${
              visibility === "draft_private"
                ? "border-charcoal bg-warmCanvas shadow-brutal-sm"
                : "border-charcoal/20 bg-white hover:bg-canvas"
            }`}
          >
            <input
              type="radio"
              name="visibility"
              value="draft_private"
              checked={visibility === "draft_private"}
              onChange={() => setVisibility("draft_private")}
              className="mt-1 accent-charcoal"
            />
            <div>
              <p className="text-xs font-bold text-ink">Draft / Private</p>
              <p className="mt-0.5 text-[11px] text-muted leading-relaxed">
                Hidden from business searches and candidate recommendations until you are ready.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* SAVE / RESET ACTIONS BAR */}
      <div className="sticky bottom-4 z-20 flex items-center justify-between rounded-2xl border-2 border-charcoal bg-white/95 p-4 shadow-brutal-lg backdrop-blur-md">
        <div className="flex items-center gap-2">
          {hasChanges ? (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-terracotta-dark">
              <span className="size-2 rounded-full bg-terracotta animate-pulse" />
              Unsaved changes
            </span>
          ) : (
            <span className="text-xs text-muted">All changes saved</span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {hasChanges && (
            <button
              type="button"
              onClick={handleReset}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 rounded-xl border border-charcoal/25 bg-white px-3.5 py-2 text-xs font-semibold text-charcoal hover:bg-canvas transition"
            >
              <RotateCcw size={13} />
              Reset
            </button>
          )}

          <button
            type="submit"
            disabled={isSaving || !hasChanges}
            className="btn-press inline-flex items-center gap-2 rounded-xl border-1.5 border-charcoal bg-saffron px-5 py-2.5 text-xs font-bold text-charcoal shadow-brutal hover:bg-saffron-dark hover:text-white transition disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Profile
          </button>
        </div>
      </div>
    </form>
  );
}
