// src/lib/adapters/applications-adapter.ts
// Typed integration adapter for Member 5 (RAG-Assisted Matching & Applications)
// Connects student dashboard and application history without conflicting with Member 5 schema.

import { applications, projects } from "@/data/mock-data";
import type { ApplicationStatus } from "@/types";

export interface StudentApplicationItem {
  id: string;
  projectId: string;
  projectTitle: string;
  businessName: string;
  category: string;
  status: ApplicationStatus;
  appliedAt: string;
  matchScore: number;
  coverNote?: string;
}

/**
 * Retrieves student applications.
 * Adapter integrates with Member 5's endpoint / contract once live,
 * with clean fallback for student dashboard display.
 */
export async function getStudentApplications(studentId: string): Promise<StudentApplicationItem[]> {
  // Query applications for the current student
  const studentApps = applications.filter((app) => app.studentId === studentId);

  return studentApps.map((app) => {
    const project = projects.find((p) => p.id === app.projectId);
    return {
      id: app.id,
      projectId: app.projectId,
      projectTitle: app.projectTitle,
      businessName: project?.businessName || "Local Business Partner",
      category: project?.category || "General",
      status: app.status,
      appliedAt: app.appliedAt,
      matchScore: app.matchScore,
      coverNote: app.message,
    };
  });
}
