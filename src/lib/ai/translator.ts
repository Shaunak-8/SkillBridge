import "server-only";
import { createHash } from "node:crypto";
import { database } from "@/lib/db";
import { DEFAULT_GEMINI_MODEL } from "./model";

export interface TranslationResult {
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  fromCache?: boolean;
  provider?: string;
}

const memoryTranslationCache = new Map<string, string>();

function hashText(text: string): string {
  return createHash("sha256").update(text.trim()).digest("hex");
}

/**
 * Translates text with caching in skillbridge.translation_cache and memory.
 * Supports:
 * 1. Database & in-memory translation cache lookup (0ms overhead)
 * 2. Google Cloud Translation API (if GOOGLE_TRANSLATION_API_KEY is configured)
 * 3. Gemini / LLM Translation fallback (using GEMINI_API_KEY)
 * 4. Safe fallback to original text if translation unavailable
 */
export async function translateText(
  text: string,
  targetLang: string = "en",
  sourceLang: string = "auto"
): Promise<TranslationResult> {
  if (!text || !text.trim()) {
    return { translatedText: "", sourceLang, targetLang };
  }

  // Same language: return immediately
  if (sourceLang === targetLang && targetLang !== "auto") {
    return { translatedText: text, sourceLang, targetLang };
  }

  const textHash = hashText(text);

  // 1. Check in-memory or database translation cache
  const memoryKey = `${textHash}:${targetLang}`;
  if (memoryTranslationCache.has(memoryKey)) {
    return {
      translatedText: memoryTranslationCache.get(memoryKey)!,
      sourceLang,
      targetLang,
      fromCache: true,
      provider: "memory-cache",
    };
  }

  if (process.env.DATABASE_URL) {
    try {
      const cached = await database()`
        SELECT translated_text, source_lang FROM skillbridge.translation_cache
        WHERE source_hash = ${textHash} AND target_lang = ${targetLang}
        LIMIT 1
      `;
      if (cached.length > 0 && cached[0].translated_text) {
        memoryTranslationCache.set(memoryKey, cached[0].translated_text);
        return {
          translatedText: cached[0].translated_text,
          sourceLang: cached[0].source_lang || sourceLang,
          targetLang,
          fromCache: true,
          provider: "database-cache",
        };
      }
    } catch {
      // If cache table not yet migrated or DB error, continue to live provider
    }
  }

  let translatedOutput = text;
  let resolvedSource = sourceLang;
  let providerUsed = "fallback";

  // 2. Try Google Cloud Translation API if configured
  const googleApiKey = process.env.GOOGLE_TRANSLATION_API_KEY;
  if (googleApiKey) {
    try {
      const gUrl = `https://translation.googleapis.com/language/translate/v2?key=${googleApiKey}`;
      const gRes = await fetch(gUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: text,
          target: targetLang,
          source: sourceLang === "auto" ? undefined : sourceLang,
          format: "text",
        }),
      });

      if (gRes.ok) {
        const gData = await gRes.json();
        const translation = gData?.data?.translations?.[0];
        if (translation?.translatedText) {
          translatedOutput = translation.translatedText;
          resolvedSource = translation.detectedSourceLanguage || sourceLang;
          providerUsed = "google-cloud-translation";
        }
      }
    } catch (gErr) {
      console.warn("Google Cloud Translation error, falling back to Gemini:", gErr);
    }
  }

  // 3. Fallback to Gemini / LLM Translation if Google Cloud did not translate
  if (providerUsed === "fallback") {
    const apiKey = process.env.GEMINI_API_KEY || process.env.LLM_API_KEY;
    if (apiKey) {
      try {
        const modelName = process.env.LLM_MODEL || DEFAULT_GEMINI_MODEL;
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

        const prompt = `Translate the following text into ${targetLang === 'en' ? 'English' : targetLang}. 
Return ONLY a JSON object with:
{
  "translatedText": "the translation string here"
}

Text to translate:
"${text}"`;

        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.1,
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const cleaned = rawText.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/\s*```$/, "").trim();
            const parsed = JSON.parse(cleaned);
            if (parsed.translatedText) {
              translatedOutput = parsed.translatedText;
              providerUsed = "gemini";
            }
          }
        }
      } catch (llmErr) {
        console.warn("Gemini translation error:", llmErr);
      }
    }
  }

  // 4. Save to cache
  if (translatedOutput) {
    memoryTranslationCache.set(memoryKey, translatedOutput);
    if (process.env.DATABASE_URL && translatedOutput !== text) {
      try {
        await database()`
          INSERT INTO skillbridge.translation_cache (source_hash, source_text, source_lang, target_lang, translated_text)
          VALUES (${textHash}, ${text}, ${resolvedSource}, ${targetLang}, ${translatedOutput})
          ON CONFLICT (source_hash, target_lang) DO UPDATE SET translated_text = EXCLUDED.translated_text
        `;
      } catch {
        // Non-fatal if cache insert fails
      }
    }
  }

  return {
    translatedText: translatedOutput,
    sourceLang: resolvedSource,
    targetLang,
    fromCache: false,
    provider: providerUsed,
  };
}
