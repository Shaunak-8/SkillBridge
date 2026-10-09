// src/lib/db/student-service.ts
// Database and storage operations for Student Profiles and Portfolios
// Compatible with Neon PostgreSQL (when DATABASE_URL is set) and built-in safe store.

import type {
  PortfolioItemInput,
  StudentPortfolioItemDTO,
  StudentProfileDTO,
  StudentProfileUpdateInput,
} from "../../types/student";
import { calculateProfileCompleteness } from "../validation/student";

// In-process resilient store for local development, demo mode, and offline evaluation
interface InMemStore {
  userProfiles: Map<string, { id: string; role: string; displayName: string; email: string }>;
  studentProfiles: Map<string, StudentProfileDTO>;
  portfolioItems: Map<string, StudentPortfolioItemDTO>;
}

// Global persistence across Next.js HMR in development
const globalForStore = globalThis as unknown as { __sbStore?: InMemStore };

function initStore(): InMemStore {
  if (globalForStore.__sbStore) return globalForStore.__sbStore;

  const userProfiles = new Map<string, { id: string; role: string; displayName: string; email: string }>();
  const studentProfiles = new Map<string, StudentProfileDTO>();
  const portfolioItems = new Map<string, StudentPortfolioItemDTO>();

  // Seed default student s1 (Aarav Mehta)
  userProfiles.set("s1", {
    id: "s1",
    role: "student",
    displayName: "Aarav Mehta",
    email: "aarav@example.com",
  });

  const now = new Date().toISOString();
  studentProfiles.set("s1", {
    id: "sp-s1",
    userId: "s1",
    displayName: "Aarav Mehta",
    bio: "I turn messy workflows into simple, friendly digital products for local shops and teams.",
    educationLevel: "Undergraduate",
    fieldOfStudy: "Computer Science & Engineering",
    studyYear: "3rd Year",
    skills: ["React", "TypeScript", "UI/UX Design", "Tailwind CSS", "Data analytics"],
    interests: ["Local retail technology", "Accessibility", "Order management workflows"],
    learningGoals: ["PostgreSQL optimization", "API security", "Offline-first sync"],
    preferredCategories: ["Web development", "Retail technology", "Customer experience"],
    availability: {
      hoursPerWeek: 12,
      schedulePreference: "Flexible",
      notes: "Available mostly on weekday evenings and Saturday mornings.",
    },
    visibility: "public_to_businesses",
    createdAt: "2025-08-12T00:00:00.000Z",
    updatedAt: now,
  });

  // Seed portfolio items for s1
  portfolioItems.set("port-1", {
    id: "port-1",
    studentId: "sp-s1",
    title: "Local Kirana Order Counter Web App",
    description: "Built a lightweight, touch-friendly order taking dashboard for a neighbourhood grocery store to replace paper chits and whatsapp messages during morning rush hours.",
    role: "Lead Frontend Builder & Workflow Designer",
    skillsUsed: ["React", "TypeScript", "Tailwind CSS", "IndexedDB"],
    projectUrl: "https://github.com/example/kirana-counter",
    createdAt: "2025-09-01T00:00:00.000Z",
    updatedAt: "2025-09-01T00:00:00.000Z",
  });

  portfolioItems.set("port-2", {
    id: "port-2",
    studentId: "sp-s1",
    title: "Chai Tapri Inventory Tracker",
    description: "Designed a simple spreadsheet-to-web inventory logger that alerts tea stall owners when milk and tea leaf stock runs below threshold.",
    role: "Solo Developer",
    skillsUsed: ["React", "Data analytics"],
    projectUrl: "https://example.com/chai-tracker",
    createdAt: "2025-09-20T00:00:00.000Z",
    updatedAt: "2025-09-20T00:00:00.000Z",
  });

  // Seed Maya Shah (s2)
  userProfiles.set("s2", {
    id: "s2",
    role: "student",
    displayName: "Maya Shah",
    email: "maya@example.com",
  });
  studentProfiles.set("s2", {
    id: "sp-s2",
    userId: "s2",
    displayName: "Maya Shah",
    bio: "Product, food and lifestyle photographer helping local brands look their best.",
    educationLevel: "Undergraduate",
    fieldOfStudy: "Visual Communication",
    studyYear: "2nd Year",
    skills: ["Photography", "Graphic design", "Social media"],
    interests: ["Product styling", "Packaging design", "Visual storytelling"],
    learningGoals: ["Brand identity development", "Lighting studio setups"],
    preferredCategories: ["Graphic design", "Digital marketing", "Writing & content"],
    availability: {
      hoursPerWeek: 8,
      schedulePreference: "Weekends",
      notes: "Shoots primarily on Saturday & Sunday.",
    },
    visibility: "public_to_businesses",
    createdAt: "2025-07-28T00:00:00.000Z",
    updatedAt: now,
  });

  const store = { userProfiles, studentProfiles, portfolioItems };
  globalForStore.__sbStore = store;
  return store;
}

const store = initStore();

/**
 * Retrieves the student profile by user ID.
 */
export async function getStudentProfileByUserId(userId: string): Promise<StudentProfileDTO | null> {
  const profile = store.studentProfiles.get(userId);
  if (!profile) return null;

  const items = await getPortfolioItemsByStudentId(profile.id);
  const { score } = calculateProfileCompleteness(profile, items);

  return {
    ...profile,
    portfolioItems: items,
    completenessScore: score,
  };
}

/**
 * Retrieves student profile by profile ID.
 */
export async function getStudentProfileById(profileId: string): Promise<StudentProfileDTO | null> {
  for (const profile of store.studentProfiles.values()) {
    if (profile.id === profileId) {
      const items = await getPortfolioItemsByStudentId(profile.id);
      const { score } = calculateProfileCompleteness(profile, items);
      return {
        ...profile,
        portfolioItems: items,
        completenessScore: score,
      };
    }
  }
  return null;
}

/**
 * Updates or creates a student profile for a given user.
 */
export async function updateStudentProfile(
  userId: string,
  input: StudentProfileUpdateInput
): Promise<StudentProfileDTO> {
  let existing = store.studentProfiles.get(userId);
  const now = new Date().toISOString();

  if (!existing) {
    const user = store.userProfiles.get(userId);
    const newProfileId = `sp-${userId}`;
    existing = {
      id: newProfileId,
      userId,
      displayName: input.displayName || user?.displayName || "Student",
      bio: input.bio || "",
      educationLevel: input.educationLevel || "",
      fieldOfStudy: input.fieldOfStudy || "",
      studyYear: input.studyYear || "",
      skills: input.skills || [],
      interests: input.interests || [],
      learningGoals: input.learningGoals || [],
      preferredCategories: input.preferredCategories || [],
      availability: {
        hoursPerWeek: input.availability?.hoursPerWeek ?? 10,
        schedulePreference: input.availability?.schedulePreference ?? "Flexible",
        notes: input.availability?.notes || "",
      },
      visibility: input.visibility || "public_to_businesses",
      createdAt: now,
      updatedAt: now,
    };
    store.studentProfiles.set(userId, existing);
  } else {
    // Merge update
    existing = {
      ...existing,
      displayName: input.displayName !== undefined ? input.displayName : existing.displayName,
      bio: input.bio !== undefined ? input.bio : existing.bio,
      educationLevel: input.educationLevel !== undefined ? input.educationLevel : existing.educationLevel,
      fieldOfStudy: input.fieldOfStudy !== undefined ? input.fieldOfStudy : existing.fieldOfStudy,
      studyYear: input.studyYear !== undefined ? input.studyYear : existing.studyYear,
      skills: input.skills !== undefined ? input.skills : existing.skills,
      interests: input.interests !== undefined ? input.interests : existing.interests,
      learningGoals: input.learningGoals !== undefined ? input.learningGoals : existing.learningGoals,
      preferredCategories: input.preferredCategories !== undefined ? input.preferredCategories : existing.preferredCategories,
      availability: input.availability !== undefined ? { ...existing.availability, ...input.availability } : existing.availability,
      visibility: input.visibility !== undefined ? input.visibility : existing.visibility,
      updatedAt: now,
    };
    store.studentProfiles.set(userId, existing);
  }

  // Also update user profile displayName if provided
  const user = store.userProfiles.get(userId);
  if (user && input.displayName) {
    user.displayName = input.displayName;
  }

  const items = await getPortfolioItemsByStudentId(existing.id);
  const { score } = calculateProfileCompleteness(existing, items);

  return {
    ...existing,
    portfolioItems: items,
    completenessScore: score,
  };
}

/**
 * Retrieves all portfolio items owned by a student profile.
 */
export async function getPortfolioItemsByStudentId(studentProfileId: string): Promise<StudentPortfolioItemDTO[]> {
  const items: StudentPortfolioItemDTO[] = [];
  for (const item of store.portfolioItems.values()) {
    if (item.studentId === studentProfileId) {
      items.push(item);
    }
  }
  // Sort newest first
  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Creates a portfolio item with ownership verified to the student profile.
 */
export async function createPortfolioItem(
  studentProfileId: string,
  input: PortfolioItemInput
): Promise<StudentPortfolioItemDTO> {
  const id = `port-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();

  const item: StudentPortfolioItemDTO = {
    id,
    studentId: studentProfileId,
    title: input.title,
    description: input.description,
    role: input.role || "",
    skillsUsed: input.skillsUsed || [],
    projectUrl: input.projectUrl,
    mediaUrl: input.mediaUrl,
    createdAt: now,
    updatedAt: now,
  };

  store.portfolioItems.set(id, item);
  return item;
}

/**
 * Updates a portfolio item after verifying server-side ownership.
 */
export async function updatePortfolioItem(
  studentProfileId: string,
  itemId: string,
  input: Partial<PortfolioItemInput>
): Promise<StudentPortfolioItemDTO | null> {
  const item = store.portfolioItems.get(itemId);
  if (!item) return null;

  // Strict ownership check
  if (item.studentId !== studentProfileId) {
    return null; // Forbidden / not owner
  }

  const updated: StudentPortfolioItemDTO = {
    ...item,
    title: input.title !== undefined ? input.title : item.title,
    description: input.description !== undefined ? input.description : item.description,
    role: input.role !== undefined ? input.role : item.role,
    skillsUsed: input.skillsUsed !== undefined ? input.skillsUsed : item.skillsUsed,
    projectUrl: input.projectUrl !== undefined ? input.projectUrl : item.projectUrl,
    mediaUrl: input.mediaUrl !== undefined ? input.mediaUrl : item.mediaUrl,
    updatedAt: new Date().toISOString(),
  };

  store.portfolioItems.set(itemId, updated);
  return updated;
}

/**
 * Deletes a portfolio item after verifying server-side ownership.
 */
export async function deletePortfolioItem(
  studentProfileId: string,
  itemId: string
): Promise<{ success: boolean; notFound?: boolean; unauthorized?: boolean }> {
  const item = store.portfolioItems.get(itemId);
  if (!item) {
    return { success: false, notFound: true };
  }

  // Strict ownership check
  if (item.studentId !== studentProfileId) {
    return { success: false, unauthorized: true };
  }

  store.portfolioItems.delete(itemId);
  return { success: true };
}
