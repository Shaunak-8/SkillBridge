// src/app/api/students/me/portfolio/route.ts
// Workstream 4: Student portfolio listing and creation endpoint

import { NextResponse } from "next/server";
import { requireStudentSession } from "@/lib/auth/session";
import {
  createPortfolioItem,
  getPortfolioItemsByStudentId,
  getStudentProfileByUserId,
} from "@/lib/db/student-service";
import { validatePortfolioInput } from "@/lib/validation/student";

export async function GET() {
  try {
    const auth = await requireStudentSession();
    if (!auth.success) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: auth.message } },
        { status: auth.status }
      );
    }

    const profile = await getStudentProfileByUserId(auth.session.userId);
    if (!profile) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    const items = await getPortfolioItemsByStudentId(profile.id);
    return NextResponse.json({ data: items }, { status: 200 });
  } catch (err: any) {
    console.error("Error in GET /api/students/me/portfolio:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to load portfolio items." } },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireStudentSession();
    if (!auth.success) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: auth.message } },
        { status: auth.status }
      );
    }

    const profile = await getStudentProfileByUserId(auth.session.userId);
    if (!profile) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Student profile not found. Please setup profile first." } },
        { status: 404 }
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

    const validation = validatePortfolioInput(body);
    if (!validation.valid || !validation.sanitized) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_FAILED",
            message: "Portfolio item validation failed.",
            details: validation.errors,
          },
        },
        { status: 400 }
      );
    }

    const created = await createPortfolioItem(profile.id, validation.sanitized);

    return NextResponse.json(
      {
        data: created,
        message: "Portfolio project added successfully.",
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Error in POST /api/students/me/portfolio:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create portfolio item." } },
      { status: 500 }
    );
  }
}
