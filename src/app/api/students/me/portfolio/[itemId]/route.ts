// src/app/api/students/me/portfolio/[itemId]/route.ts
// Workstream 4: Update and delete portfolio item with server-side ownership enforcement

import { NextResponse } from "next/server";
import { requireStudentSession } from "@/lib/auth/session";
import {
  deletePortfolioItem,
  getStudentProfileByUserId,
  updatePortfolioItem,
} from "@/lib/db/student-service";
import { validatePortfolioInput } from "@/lib/validation/student";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const auth = await requireStudentSession();
    if (!auth.success) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: auth.message } },
        { status: auth.status }
      );
    }

    const { itemId } = await params;
    if (!itemId) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Portfolio item ID is required." } },
        { status: 400 }
      );
    }

    const profile = await getStudentProfileByUserId(auth.session.userId);
    if (!profile) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Student profile not found." } },
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
            message: "Validation failed for portfolio item update.",
            details: validation.errors,
          },
        },
        { status: 400 }
      );
    }

    // Attempt update with profile ownership verification
    const updated = await updatePortfolioItem(profile.id, itemId, validation.sanitized);
    if (!updated) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN_OR_NOT_FOUND",
            message: "Portfolio item not found or you are not authorized to edit it.",
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        data: updated,
        message: "Portfolio item updated successfully.",
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Error in PATCH /api/students/me/portfolio/[itemId]:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update portfolio item." } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const auth = await requireStudentSession();
    if (!auth.success) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: auth.message } },
        { status: auth.status }
      );
    }

    const { itemId } = await params;
    if (!itemId) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Portfolio item ID is required." } },
        { status: 400 }
      );
    }

    const profile = await getStudentProfileByUserId(auth.session.userId);
    if (!profile) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Student profile not found." } },
        { status: 404 }
      );
    }

    const result = await deletePortfolioItem(profile.id, itemId);

    if (result.notFound) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Portfolio item not found." } },
        { status: 404 }
      );
    }

    if (result.unauthorized) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "You are not authorized to delete this portfolio item." } },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Portfolio project deleted successfully.",
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Error in DELETE /api/students/me/portfolio/[itemId]:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to delete portfolio item." } },
      { status: 500 }
    );
  }
}
