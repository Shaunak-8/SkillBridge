import "server-only";
import { BriefInput } from "@/lib/business/contracts";
import { translateText } from "@/lib/ai/translator";
import { DEFAULT_GEMINI_MODEL } from "@/lib/ai/model";

export interface RefinementResult {
  explanation: string;
  explanationEnglish?: string;
  updatedBrief?: Partial<BriefInput>;
  changesMade: boolean;
}

export async function refineProjectBrief(
  currentBrief: BriefInput,
  userQuery: string
): Promise<RefinementResult> {
  const grokApiKey = process.env.GROK_API_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.LLM_API_KEY;

  if (!userQuery || !userQuery.trim()) {
    return {
      explanation: "Please speak or type a question or change request.",
      explanationEnglish: "Please speak or type a question or change request.",
      changesMade: false,
    };
  }

  const preferredLanguage = currentBrief.preferred_language || "en";

  const systemInstruction = `You are a helpful business tech consultant for non-technical local business owners.
The user has an existing project brief (Preferred language: ${preferredLanguage}).
The user may ask questions or request changes in their local language (e.g. Hindi) or English.

Current Brief:
${JSON.stringify(currentBrief, null, 2)}

Your task:
1. Provide a direct, easy-to-understand response ("explanation") in simple everyday language. If the preferred language is Hindi ('hi') or another local language, provide "explanation" in that language, and also provide "explanationEnglish" in clear English.
2. If the user requested a change (e.g. "make it cheaper", "shorten timeline", "remove WhatsApp"), update the appropriate brief fields (title, summary, deliverables, required_skills, budget_label, timeline).
3. Return a JSON object with:
   - "explanation": string (Answer in preferred local language or English)
   - "explanationEnglish": string (Answer in clear English)
   - "changesMade": boolean (true if brief fields were updated)
   - "updatedBrief": object (optional, containing updated fields of the brief)
`;

  // Try Grok API if key is present
  if (grokApiKey) {
    try {
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${grokApiKey}`,
        },
        body: JSON.stringify({
          model: process.env.GROK_MODEL || "grok-beta",
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: userQuery },
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          return {
            explanation: parsed.explanation || "Brief reviewed.",
            explanationEnglish: parsed.explanationEnglish || parsed.explanation || "Brief reviewed.",
            updatedBrief: parsed.updatedBrief,
            changesMade: Boolean(parsed.changesMade),
          };
        }
      }
    } catch (e) {
      console.warn("Grok API refinement failed, falling back to Gemini:", e);
    }
  }

  // Gemini API branch
  if (geminiApiKey) {
    try {
      const modelName = process.env.LLM_MODEL || DEFAULT_GEMINI_MODEL;
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": geminiApiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${systemInstruction}\n\nUser Question/Request: ${userQuery}` }],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.3,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const cleanedText = rawText.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/\s*```$/, "").trim();
          const parsed = JSON.parse(cleanedText);
          return {
            explanation: parsed.explanation || "Here is the response to your request.",
            explanationEnglish: parsed.explanationEnglish || parsed.explanation || "Here is the response to your request.",
            updatedBrief: parsed.updatedBrief,
            changesMade: Boolean(parsed.changesMade),
          };
        }
      }
    } catch (e) {
      console.warn("Gemini API refinement failed:", e);
    }
  }

  // Fallback if no LLM key or requests fail
  return {
    explanation: `Thank you for your question: "${userQuery}". You can edit any field directly in the editor below.`,
    explanationEnglish: `Thank you for your question: "${userQuery}". You can edit any field directly in the editor below.`,
    changesMade: false,
  };
}
