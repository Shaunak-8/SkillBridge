import 'server-only';
import { projectDraftSchema, ValidatedGenerateInput, ValidatedProjectDraft } from "./schemas";
import { buildFallbackDraft, buildUserPrompt, SYSTEM_PROMPT } from "./prompt";
import { retrieveKnowledge } from "./retrieval";

export interface GenerationResult {
  draft: ValidatedProjectDraft;
  isFallback: boolean;
  providerUsed: string;
  fallbackReason?: string;
  retrievedSourceIds: string[];
  ragContextUsed: boolean;
  retrievedFrom: "neon_pgvector" | "offline_seed_fallback";
}

export async function generateProjectDraft(
  input: ValidatedGenerateInput
): Promise<GenerationResult> {
  // Step 1: Execute Semantic Knowledge Retrieval (Neon pgvector or Seed fallback)
  const retrievalResult = await retrieveKnowledge(
    input.rawProblemText,
    input.preferredLanguage || "en",
    3
  );

  const retrievedChunks = retrievalResult.chunks;
  const retrievedSourceIds = retrievalResult.retrievedSourceIds;
  const ragContextUsed = retrievedChunks.length > 0;
  const retrievedFrom = retrievalResult.retrievedFrom;

  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.LLM_API_KEY ||
    process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      draft: buildFallbackDraft(input.rawProblemText, input.category, input.format),
      isFallback: true,
      providerUsed: "Offline Fallback",
      fallbackReason: "Missing GEMINI_API_KEY environment variable.",
      retrievedSourceIds,
      ragContextUsed,
      retrievedFrom,
    };
  }

  const userPrompt = buildUserPrompt(input, retrievedChunks);
  const isGemini = Boolean(process.env.GEMINI_API_KEY || process.env.LLM_PROVIDER !== "openai");

  if (isGemini) {
    const modelName = process.env.LLM_MODEL || "gemini-2.5-flash-lite";
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

    const controller = new AbortController();
    const timeoutMs = parseInt(process.env.LLM_TIMEOUT_MS || "15000", 10);
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: userPrompt }],
            },
          ],
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        }),
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        let errorMsg = `Gemini API returned HTTP status ${res.status}`;
        if (res.status === 429) {
          errorMsg = "Gemini API rate limit exceeded (HTTP 429).";
        } else if (res.status === 401 || res.status === 403) {
          errorMsg = `Gemini API authentication failed (HTTP ${res.status}). Check GEMINI_API_KEY.`;
        }
        throw new Error(errorMsg);
      }

      const data = await res.json();
      const rawJsonResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawJsonResponse) {
        throw new Error("Empty text content in Gemini API response.");
      }

      const cleanedText = rawJsonResponse
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/, "")
        .replace(/\s*```$/, "")
        .trim();

      const parsedJson = JSON.parse(cleanedText);
      const validationResult = projectDraftSchema.safeParse(parsedJson);

      if (validationResult.success) {
        return {
          draft: validationResult.data,
          isFallback: false,
          providerUsed: `Google Gemini (${modelName})`,
          retrievedSourceIds,
          ragContextUsed,
          retrievedFrom,
        };
      } else {

        return {
          draft: buildFallbackDraft(input.rawProblemText, input.category, input.format),
          isFallback: true,
          providerUsed: `Google Gemini (${modelName} Schema Fallback)`,
          fallbackReason: "Model response did not match required project brief JSON schema.",
          retrievedSourceIds,
          ragContextUsed,
          retrievedFrom,
        };
      }
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      const isTimeout = (error instanceof Error ? error.name : '') === "AbortError";
      const failureReason = isTimeout
        ? `Gemini API request timed out after ${timeoutMs / 1000}s.`
        : (error instanceof Error ? error.message : '') || "Failed to reach Gemini API endpoint.";



      return {
        draft: buildFallbackDraft(input.rawProblemText, input.category, input.format),
        isFallback: true,
        providerUsed: `Google Gemini (${modelName} Error Fallback)`,
        fallbackReason: failureReason,
        retrievedSourceIds,
        ragContextUsed,
        retrievedFrom,
      };
    }
  } else {
    // OpenAI fallback branch if explicitly configured via LLM_PROVIDER=openai
    const endpoint = process.env.LLM_ENDPOINT || "https://api.openai.com/v1/chat/completions";
    const modelName = process.env.LLM_MODEL || "gpt-4o-mini";

    const controller = new AbortController();
    const timeoutMs = parseInt(process.env.LLM_TIMEOUT_MS || "15000", 10);
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.2,
        }),
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`OpenAI API returned HTTP status ${res.status}`);
      }

      const data = await res.json();
      const rawJsonResponse = data?.choices?.[0]?.message?.content;

      if (!rawJsonResponse) {
        throw new Error("Empty response from OpenAI API.");
      }

      const cleanedText = rawJsonResponse
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/, "")
        .replace(/\s*```$/, "")
        .trim();

      const parsedJson = JSON.parse(cleanedText);
      const validationResult = projectDraftSchema.safeParse(parsedJson);

      if (validationResult.success) {
        return {
          draft: validationResult.data,
          isFallback: false,
          providerUsed: `OpenAI (${modelName})`,
          retrievedSourceIds,
          ragContextUsed,
          retrievedFrom,
        };
      } else {
        return {
          draft: buildFallbackDraft(input.rawProblemText, input.category, input.format),
          isFallback: true,
          providerUsed: `OpenAI (${modelName} Schema Fallback)`,
          fallbackReason: "Model response did not match required project brief JSON schema.",
          retrievedSourceIds,
          ragContextUsed,
          retrievedFrom,
        };
      }
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      const isTimeout = error instanceof Error && error.name === "AbortError";
      const failureReason = isTimeout
        ? `OpenAI API request timed out after ${timeoutMs / 1000}s.`
        : (error instanceof Error ? error.message : '') || "Failed to reach OpenAI API endpoint.";

      return {
        draft: buildFallbackDraft(input.rawProblemText, input.category, input.format),
        isFallback: true,
        providerUsed: `OpenAI (${modelName} Error Fallback)`,
        fallbackReason: failureReason,
        retrievedSourceIds,
        ragContextUsed,
        retrievedFrom,
      };
    }
  }
}
