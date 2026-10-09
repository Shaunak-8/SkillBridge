// src/app/api/students/[id]/matching/route.ts
// Integration contract with Member 5 (RAG-Assisted Matching & Applications)

import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { getStudentProfileById } from "@/lib/db/student-service";
import {
  generateStructuredProfileTextForMatching,
  transformToCandidateMatchingDTO,
} from "@/lib/validation/student";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Student profile ID is required." } },
        { status: 400 }
      );
    }

    const profile = await getStudentProfileById(id);
    if (!profile) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Student candidate not found." } },
        { status: 404 }
      );
    }

    // Visibility enforcement:
    // If visibility is draft_private, only the owner student can view it.
    if (profile.visibility === "draft_private") {
      const session = await getAuthSession();
      if (!session || session.userId !== profile.userId) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "This student profile is currently set to private." } },
          { status: 403 }
        );
      }
    }

    const portfolioItems = profile.portfolioItems || [];
    const candidateDTO = transformToCandidateMatchingDTO(profile, portfolioItems);
    const structuredProfileText = generateStructuredProfileTextForMatching(profile, portfolioItems);

    return NextResponse.json(
      {
        data: {
          candidate: candidateDTO,
          structuredText: structuredProfileText,
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Error in GET /api/students/[id]/matching:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to generate matching DTO." } },
      { status: 500 }
    );
  }
}
