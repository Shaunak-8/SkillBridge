// src/lib/validation/student.ts
// Strict server & client validation rules, URL sanitization, and normalization logic

import type {
  AvailabilityConfig,
  CandidateMatchingDTO,
  PortfolioItemInput,
  ProfileCompletenessResult,
  StudentPortfolioItemDTO,
  StudentProfileDTO,
  StudentProfileUpdateInput,
} from "../../types/student";

/**
 * Normalizes a list of skill/interest/goal tags:
 * - Trims leading and trailing whitespace
 * - Collapses repeated inner whitespace
 * - Discards empty values
 * - Enforces case-insensitive deduplication while preserving original casing of first occurrence
 * - Caps maximum length per item and total items
 */
export function normalizeTagList(
  tags: unknown,
  maxItems = 25,
  maxItemLength = 40
): { valid: string[]; errors: string[] } {
  const errors: string[] = [];
  if (!Array.isArray(tags)) {
    return { valid: [], errors: ["Input must be an array of tags"] };
  }

  const seen = new Set<string>();
  const valid: string[] = [];

  for (const item of tags) {
    if (typeof item !== "string") continue;
    const cleaned = item.trim().replace(/\s+/g, " ");
    if (!cleaned) continue;

    if (cleaned.length > maxItemLength) {
      errors.push(`Tag "${cleaned.slice(0, 15)}..." exceeds max length of ${maxItemLength} characters`);
      continue;
    }

    const lower = cleaned.toLowerCase();
    if (seen.has(lower)) {
      // Duplicate ignoring case - silently deduplicate
      continue;
    }
    seen.add(lower);
    valid.push(cleaned);

    if (valid.length >= maxItems) break;
  }

  return { valid, errors };
}

/**
 * Safe URL validation:
 * Only allows http: or https: protocols.
 * Explicitly rejects javascript:, data:, file:, vbscript: schemes to prevent XSS.
 */
export function validateSafeUrl(urlStr?: string | null): { valid: boolean; error?: string; normalized?: string } {
  if (!urlStr || typeof urlStr !== "string" || !urlStr.trim()) {
    return { valid: true, normalized: undefined };
  }

  const trimmed = urlStr.trim();

  // Explicit safety block against script injection or data URI
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:") ||
    lower.startsWith("file:")
  ) {
    return { valid: false, error: "Only standard http:// and https:// links are permitted" };
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { valid: false, error: "Protocol must be http:// or https://" };
    }
    return { valid: true, normalized: parsed.toString() };
  } catch {
    return { valid: false, error: "Please enter a valid web URL starting with http:// or https://" };
  }
}

/**
 * Validates a portfolio item input
 */
export function validatePortfolioInput(input: Partial<PortfolioItemInput>): {
  valid: boolean;
  sanitized?: PortfolioItemInput;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  // Title validation
  const title = typeof input.title === "string" ? input.title.trim().replace(/\s+/g, " ") : "";
  if (!title) {
    errors.title = "Project title is required";
  } else if (title.length < 3) {
    errors.title = "Title must be at least 3 characters";
  } else if (title.length > 120) {
    errors.title = "Title cannot exceed 120 characters";
  }

  // Description validation
  const description = typeof input.description === "string" ? input.description.trim() : "";
  if (!description) {
    errors.description = "Project description is required";
  } else if (description.length < 10) {
    errors.description = "Please describe your project in at least 10 characters";
  } else if (description.length > 2000) {
    errors.description = "Description cannot exceed 2,000 characters";
  }

  // Role validation
  const role = typeof input.role === "string" ? input.role.trim().replace(/\s+/g, " ") : "";
  if (role.length > 120) {
    errors.role = "Role description cannot exceed 120 characters";
  }

  // Skills used validation
  const { valid: skillsUsed } = normalizeTagList(input.skillsUsed ?? [], 15, 30);

  // URL validations
  const projectUrlValidation = validateSafeUrl(input.projectUrl);
  if (!projectUrlValidation.valid) {
    errors.projectUrl = projectUrlValidation.error || "Invalid project URL";
  }

  const mediaUrlValidation = validateSafeUrl(input.mediaUrl);
  if (!mediaUrlValidation.valid) {
    errors.mediaUrl = mediaUrlValidation.error || "Invalid media preview URL";
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: {},
    sanitized: {
      title,
      description,
      role: role || undefined,
      skillsUsed,
      projectUrl: projectUrlValidation.normalized,
      mediaUrl: mediaUrlValidation.normalized,
    },
  };
}

/**
 * Validates student profile updates
 */
export function validateProfileUpdate(input: Partial<StudentProfileUpdateInput>): {
  valid: boolean;
  sanitized?: StudentProfileUpdateInput;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  const sanitized: StudentProfileUpdateInput = {};

  if (input.displayName !== undefined) {
    const name = String(input.displayName).trim().replace(/\s+/g, " ");
    if (!name) {
      errors.displayName = "Display name cannot be empty";
    } else if (name.length < 2) {
      errors.displayName = "Display name must be at least 2 characters";
    } else if (name.length > 80) {
      errors.displayName = "Display name cannot exceed 80 characters";
    } else {
      sanitized.displayName = name;
    }
  }

  if (input.bio !== undefined) {
    const bio = String(input.bio).trim();
    if (bio.length > 1000) {
      errors.bio = "Bio cannot exceed 1,000 characters";
    } else {
      sanitized.bio = bio;
    }
  }

  if (input.educationLevel !== undefined) {
    sanitized.educationLevel = String(input.educationLevel).trim().slice(0, 80);
  }

  if (input.fieldOfStudy !== undefined) {
    sanitized.fieldOfStudy = String(input.fieldOfStudy).trim().slice(0, 100);
  }

  if (input.studyYear !== undefined) {
    sanitized.studyYear = String(input.studyYear).trim().slice(0, 40);
  }

  if (input.skills !== undefined) {
    const { valid: skills } = normalizeTagList(input.skills, 25, 40);
    sanitized.skills = skills;
  }

  if (input.interests !== undefined) {
    const { valid: interests } = normalizeTagList(input.interests, 20, 40);
    sanitized.interests = interests;
  }

  if (input.learningGoals !== undefined) {
    const { valid: learningGoals } = normalizeTagList(input.learningGoals, 20, 40);
    sanitized.learningGoals = learningGoals;
  }

  if (input.preferredCategories !== undefined) {
    const { valid: categories } = normalizeTagList(input.preferredCategories, 10, 50);
    sanitized.preferredCategories = categories;
  }

  if (input.availability !== undefined) {
    const raw = input.availability;
    const hours = typeof raw.hoursPerWeek === "number" ? Math.max(0, Math.min(80, Math.floor(raw.hoursPerWeek))) : 10;
    const allowedPrefs: AvailabilityConfig["schedulePreference"][] = [
      "Flexible",
      "Weekdays",
      "Weekends",
      "Evenings",
      "Part-time",
    ];
    const pref = allowedPrefs.includes(raw.schedulePreference as any)
      ? (raw.schedulePreference as AvailabilityConfig["schedulePreference"])
      : "Flexible";
    const notes = typeof raw.notes === "string" ? raw.notes.trim().slice(0, 200) : undefined;

    sanitized.availability = {
      hoursPerWeek: hours,
      schedulePreference: pref,
      notes,
    };
  }

  if (input.visibility !== undefined) {
    if (input.visibility === "draft_private" || input.visibility === "public_to_businesses") {
      sanitized.visibility = input.visibility;
    } else {
      errors.visibility = "Visibility must be draft_private or public_to_businesses";
    }
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, sanitized, errors: {} };
}

/**
 * Calculates transparent profile completeness score and actionable guidance.
 * Does NOT block browsing or claim verification of student skills.
 */
export function calculateProfileCompleteness(
  profile: Partial<StudentProfileDTO>,
  portfolioItems: StudentPortfolioItemDTO[] = []
): ProfileCompletenessResult {
  const checklist = [
    {
      id: "basics",
      label: "Basic education details",
      completed: Boolean(
        profile.displayName?.trim() &&
        (profile.educationLevel?.trim() || profile.fieldOfStudy?.trim())
      ),
      suggestion: "Add your current college or field of study so businesses know your background.",
    },
    {
      id: "bio",
      label: "Short introduction",
      completed: Boolean(profile.bio && profile.bio.trim().length >= 20),
      suggestion: "Add a short introduction (at least 20 characters) explaining what excites you about practical projects.",
    },
    {
      id: "skills",
      label: "Current practiced skills",
      completed: Boolean(profile.skills && profile.skills.length >= 2),
      suggestion: "Add at least 2 skills you have practiced in class, personal projects, or internships.",
    },
    {
      id: "preferences",
      label: "Interests or project categories",
      completed: Boolean(
        (profile.interests && profile.interests.length > 0) ||
        (profile.preferredCategories && profile.preferredCategories.length > 0)
      ),
      suggestion: "Choose project categories or topics you would like to work on.",
    },
    {
      id: "availability",
      label: "Realistic weekly availability",
      completed: Boolean(profile.availability && profile.availability.hoursPerWeek > 0),
      suggestion: "State how many hours per week you can realistically contribute without burning out.",
    },
    {
      id: "portfolio",
      label: "At least one portfolio project",
      completed: portfolioItems.length > 0,
      suggestion: "Add a project you worked on with a description of your specific role and skills used.",
    },
  ];

  const completedCount = checklist.filter((item) => item.completed).length;
  const score = Math.round((completedCount / checklist.length) * 100);

  return { score, checklist };
}

/**
 * Builds candidate matching DTO for Member 5's RAG and retrieval engine.
 * Ensures strictly sanitized output with zero leakage of email, phone, or private notes.
 */
export function transformToCandidateMatchingDTO(
  profile: StudentProfileDTO,
  portfolioItems: StudentPortfolioItemDTO[] = []
): CandidateMatchingDTO {
  return {
    studentProfileId: profile.id,
    displayName: profile.displayName,
    educationLevel: profile.educationLevel,
    fieldOfStudy: profile.fieldOfStudy,
    studyYear: profile.studyYear,
    skills: profile.skills,
    interests: profile.interests,
    learningGoals: profile.learningGoals,
    preferredCategories: profile.preferredCategories,
    availability: {
      hoursPerWeek: profile.availability?.hoursPerWeek ?? 10,
      schedulePreference: profile.availability?.schedulePreference ?? "Flexible",
    },
    portfolioEvidence: portfolioItems.map((item) => ({
      title: item.title,
      role: item.role || "Contributor",
      description: item.description,
      skillsUsed: item.skillsUsed,
      projectUrl: item.projectUrl,
    })),
    visibility: profile.visibility,
    isVerified: false,
  };
}

/**
 * Transforms a student profile and portfolio into concise, structured plain text
 * for Member 5's embedding model and semantic search.
 * Deterministic and free of personal contact details.
 */
export function generateStructuredProfileTextForMatching(
  profile: StudentProfileDTO,
  portfolioItems: StudentPortfolioItemDTO[] = []
): string {
  const sections: string[] = [];

  sections.push(`STUDENT CANDIDATE OVERVIEW (Self-reported)`);
  sections.push(`Name: ${profile.displayName}`);
  sections.push(
    `Education: ${[profile.educationLevel, profile.fieldOfStudy, profile.studyYear].filter(Boolean).join(" - ") || "Not specified"}`
  );

  if (profile.bio) {
    sections.push(`Summary: ${profile.bio}`);
  }

  if (profile.skills && profile.skills.length > 0) {
    sections.push(`Current Practiced Skills: ${profile.skills.join(", ")}`);
  }

  if (profile.learningGoals && profile.learningGoals.length > 0) {
    sections.push(`Aspirational Learning Goals (Not yet mastered): ${profile.learningGoals.join(", ")}`);
  }

  if (profile.interests && profile.interests.length > 0) {
    sections.push(`Interests: ${profile.interests.join(", ")}`);
  }

  if (profile.preferredCategories && profile.preferredCategories.length > 0) {
    sections.push(`Preferred Project Categories: ${profile.preferredCategories.join(", ")}`);
  }

  const hours = profile.availability?.hoursPerWeek ?? 0;
  const schedule = profile.availability?.schedulePreference ?? "Flexible";
  sections.push(`Availability: ${hours} hours/week (${schedule})`);

  if (portfolioItems.length > 0) {
    sections.push(`\nPORTFOLIO EVIDENCE:`);
    portfolioItems.forEach((item, idx) => {
      sections.push(
        `Project ${idx + 1}: ${item.title} | Role: ${item.role || "Contributor"} | Tech: ${item.skillsUsed.join(", ")} | Description: ${item.description}`
      );
    });
  }

  return sections.join("\n");
}
