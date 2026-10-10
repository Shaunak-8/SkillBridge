// src/types/student.ts
// Shared contracts and DTOs for Workstream 4 (Student Profiles & Portfolio)
// Integrated with Member 5 (RAG-assisted Matching) and Member 6 (Shared Backend & Neon)

export type ProfileVisibility = "draft_private" | "public_to_businesses";

export interface AvailabilityConfig {
  hoursPerWeek: number;
  schedulePreference: "Flexible" | "Weekdays" | "Weekends" | "Evenings" | "Part-time";
  notes?: string;
}

export interface StudentPortfolioItemDTO {
  id: string;
  studentId: string;
  title: string;
  description: string;
  role?: string;
  skillsUsed: string[];
  projectUrl?: string;
  mediaUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentResumeDTO {
  id: string;
  fileName: string;
  fileUrl: string;
  createdAt: string;
}

export interface StudentProfileDTO {
  id: string;
  userId: string;
  displayName: string;
  bio: string;
  educationLevel: string;
  fieldOfStudy: string;
  studyYear: string;
  skills: string[];
  interests: string[];
  learningGoals: string[];
  preferredCategories: string[];
  availability: AvailabilityConfig;
  visibility: ProfileVisibility;
  portfolioItems?: StudentPortfolioItemDTO[];
  resume?: StudentResumeDTO;
  completenessScore?: number;
  createdAt: string;
  updatedAt: string;
}

export interface StudentProfileUpdateInput {
  displayName?: string;
  bio?: string;
  educationLevel?: string;
  fieldOfStudy?: string;
  studyYear?: string;
  skills?: string[];
  interests?: string[];
  learningGoals?: string[];
  preferredCategories?: string[];
  availability?: Partial<AvailabilityConfig>;
  visibility?: ProfileVisibility;
}

export interface PortfolioItemInput {
  title: string;
  description: string;
  role?: string;
  skillsUsed?: string[];
  projectUrl?: string;
  mediaUrl?: string;
}

export interface ProfileCompletenessResult {
  score: number; // 0 - 100
  checklist: Array<{
    id: string;
    label: string;
    completed: boolean;
    suggestion: string;
  }>;
}

// Predefined available project categories consistent with the platform
export const SUPPORTED_PROJECT_CATEGORIES = [
  "Web development",
  "Retail technology",
  "Digital marketing",
  "Graphic design",
  "Data & analytics",
  "Writing & content",
  "Customer experience",
  "Culinary & menu",
  "Events & community",
] as const;

export type SupportedProjectCategory = typeof SUPPORTED_PROJECT_CATEGORIES[number];
