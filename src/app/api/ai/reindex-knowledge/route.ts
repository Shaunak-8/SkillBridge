import { z } from "zod";
import { apiError, ApiFailure, requireApiIdentity } from "@/lib/api";
import { rateLimit, sameOrigin } from "@/lib/auth/security";
import { reindexKnowledge } from "@/lib/ai/knowledge-index";

const REINDEXES_PER_WINDOW = 3;
const bodySchema = z.object({ force: z.boolean().optional() }).strict();

// Admin-only: re-embeds the approved seed knowledge base into skillbridge.knowledge_chunks.
export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) throw new ApiFailure(403, "INVALID_ORIGIN", "Invalid request origin.");
    const current = await requireApiIdentity("admin");
    if (!(await rateLimit("ai-reindex-knowledge", current.profile.id, REINDEXES_PER_WINDOW)))
      throw new ApiFailure(429, "RATE_LIMITED", "Too many reindex requests. Try again later.");
    const text = (await request.text()).trim();
    let json: unknown = {};
    if (text) {
      try { json = JSON.parse(text); } catch { json = null; }
    }
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) throw new ApiFailure(400, "VALIDATION_ERROR", "Body must be a JSON object like { \"force\": true }.");
    const result = await reindexKnowledge({ force: parsed.data.force });
    return Response.json({ result });
  } catch (error) {
    if (!(error instanceof ApiFailure)) console.error("Knowledge reindex failed:", error instanceof Error ? error.message : "unknown");
    return apiError(error);
  }
}
