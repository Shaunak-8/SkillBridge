// src/app/api/students/me/route.ts
// Workstream 4: Student profile API endpoint for the authenticated student

import { NextResponse } from "next/server";
import { requireStudentSession } from "@/lib/auth/session";
import { getStudentProfileByUserId, updateStudentProfile } from "@/lib/db/student-service";
import { validateProfileUpdate } from "@/lib/validation/student";

export async function GET() {
  try {
    const auth = await requireStudentSession();
    if (!auth.success) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: auth.message } },
        { status: auth.status }
      );
    }

    let profile = await getStudentProfileByUserId(auth.session.userId);

    // If student profile record does not exist yet, initialize it gracefully
    if (!profile) {
      profile = await updateStudentProfile(auth.session.userId, {
        displayName: auth.session.displayName,
      });
    }

    return NextResponse.json({ data: profile }, { status: 200 });
  } catch (err: any) {
    console.error("Error in GET /api/students/me:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to load student profile." } },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireStudentSession();
    if (!auth.success) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: auth.message } },
        { status: auth.status }
      );
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Invalid JSON request payload." } },
        { status: 400 }
      );
    }

    const validation = validateProfileUpdate(body);
    if (!validation.valid || !validation.sanitized) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_FAILED",
            message: "Validation failed for student profile updates.",
            details: validation.errors,
          },
        },
        { status: 400 }
      );
    }

    const updated = await updateStudentProfile(auth.session.userId, validation.sanitized);

    return NextResponse.json(
      {
        data: updated,
        message: "Profile updated successfully.",
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Error in PATCH /api/students/me:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update student profile." } },
      { status: 500 }
    );
  }
}
