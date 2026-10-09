import { NextResponse } from "next/server";
import { generateInputSchema } from "@/lib/ai/schemas";
import { generateProjectDraft } from "@/lib/ai/generator";
import { GenerateProjectDraftResponse } from "@/types/ai";

export async function POST(request: Request): Promise<NextResponse<GenerateProjectDraftResponse>> {
  try {
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_JSON",
            message: "Request body must be a valid JSON object.",
          },
        },
        { status: 400 }
      );
    }

    const validationResult = generateInputSchema.safeParse(body);

    if (!validationResult.success) {
      const firstIssue = validationResult.error.issues[0];
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: firstIssue ? firstIssue.message : "Invalid input parameters provided.",
          },
        },
        { status: 400 }
      );
    }

    const inputData = validationResult.data;

    const result = await generateProjectDraft(inputData);

    return NextResponse.json(
      {
        success: true,
        draft: result.draft,
        isFallback: result.isFallback,
        providerUsed: result.providerUsed,
        warning: result.isFallback ? result.fallbackReason : undefined,
        retrievedSourceIds: result.retrievedSourceIds,
        ragContextUsed: result.ragContextUsed,
        retrievedFrom: result.retrievedFrom,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unhandled API error in /api/ai/project-draft:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while generating the project draft.",
        },
      },
      { status: 500 }
    );
  }
}
