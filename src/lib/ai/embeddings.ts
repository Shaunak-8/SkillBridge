import "server-only";

export const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "gemini-embedding-001";
export const EMBEDDING_DIMENSIONS = 768;

/**
 * Generate an embedding for a query using the Gemini embedding API.
 * Uses taskType RETRIEVAL_QUERY for query-side embeddings.
 * Model: gemini-embedding-001 (768 dimensions, supported as of 2026).
 */
export async function generateQueryEmbedding(text: string): Promise<number[] | null> {
  return _embedText(text, "RETRIEVAL_QUERY");
}

/**
 * Generate an embedding for a document/chunk using the Gemini embedding API.
 * Uses taskType RETRIEVAL_DOCUMENT for document-side embeddings.
 * Model: gemini-embedding-001 (768 dimensions, supported as of 2026).
 */
export async function generateDocumentEmbedding(text: string): Promise<number[] | null> {
  return _embedText(text, "RETRIEVAL_DOCUMENT");
}

async function _embedText(
  text: string,
  taskType: "RETRIEVAL_QUERY" | "RETRIEVAL_DOCUMENT"
): Promise<number[] | null> {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.EMBEDDING_API_KEY ||
    process.env.LLM_API_KEY;

  if (!apiKey || !text || !text.trim()) {
    return null;
  }

  try {
    // gemini-embedding-001 is the current supported model (768 dims).
    // text-embedding-004 was shut down on 2026-01-14.
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      signal: controller.signal,
      body: JSON.stringify({
        model: `models/${EMBEDDING_MODEL}`,
        content: {
          parts: [{ text: text.trim().substring(0, 2048) }],
        },
        taskType,
        outputDimensionality: EMBEDDING_DIMENSIONS,
      }),
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      // Status only: error bodies may echo request content.
      console.warn(`Gemini Embedding API returned HTTP ${res.status}`);
      return null;
    }

    const values = (await res.json())?.embedding?.values;
    if (Array.isArray(values) && values.length === EMBEDDING_DIMENSIONS) return values as number[];
    console.warn("Embedding rejected: unexpected dimensions.");
    return null;
  } catch (error) {
    console.warn("Embedding generation failed:", error instanceof Error ? error.name : "unknown");
    return null;
  }
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function keywordSimilarity(queryText: string, keywords: string[]): number {
  if (!queryText || !keywords || keywords.length === 0) return 0;

  const normalizedQuery = queryText.toLowerCase();
  let matches = 0;

  for (const kw of keywords) {
    if (normalizedQuery.includes(kw.toLowerCase())) {
      matches += 1;
    }
  }

  if (matches === 0) return 0;
  return Math.min(1.0, 0.4 + matches * 0.2);
}
