import "server-only";

export interface TranslationResult {
  translatedText: string;
  sourceLang: string;
  targetLang: string;
}

export async function translateText(
  text: string,
  targetLang: string = "en",
  sourceLang: string = "auto"
): Promise<TranslationResult> {
  if (!text || !text.trim()) {
    return { translatedText: "", sourceLang, targetLang };
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.LLM_API_KEY;

  if (!apiKey) {
    return { translatedText: text, sourceLang, targetLang };
  }

  try {
    const modelName = process.env.LLM_MODEL || "gemini-2.5-flash-lite";
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
        return {
          translatedText: parsed.translatedText || text,
          sourceLang,
          targetLang,
        };
      }
    }
  } catch (e) {
    console.warn("Translation failed:", e);
  }

  return { translatedText: text, sourceLang, targetLang };
}
