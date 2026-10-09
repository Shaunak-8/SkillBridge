import { NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError, ApiFailure, requireApiIdentity } from '@/lib/api';
import { rateLimit, sameOrigin } from '@/lib/auth/security';
import { languages } from '@/lib/business/contracts';
import { translateText } from '@/lib/ai/translator';

const MAX_TEXT_CHARS = 4000; // same limit as the problem field
const TRANSLATIONS_PER_WINDOW = 30;
const codes = languages.map((l) => l.value) as [string, ...string[]];
const bodySchema = z.object({
  text: z.string().max(MAX_TEXT_CHARS),
  targetLang: z.enum(codes).default('en'),
  sourceLang: z.union([z.enum(codes), z.literal('auto')]).default('auto'),
});

// Business accounts only: translation calls a paid model, so it is not open to anonymous callers.
export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) throw new ApiFailure(403, 'INVALID_ORIGIN', 'Invalid request origin.');
    const current = await requireApiIdentity('business');
    if (!(await rateLimit('ai-translate', current.profile.id, TRANSLATIONS_PER_WINDOW)))
      throw new ApiFailure(429, 'RATE_LIMITED', 'Too many translations. Try again later.');
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new ApiFailure(400, 'VALIDATION_ERROR', `Send { text, targetLang, sourceLang } with text up to ${MAX_TEXT_CHARS} characters and a supported language.`);
    const { text, targetLang, sourceLang } = parsed.data;
    if (!text.trim()) return NextResponse.json({ translatedText: '', sourceLang, targetLang });
    return NextResponse.json(await translateText(text, targetLang, sourceLang));
  } catch (error) {
    return apiError(error);
  }
}
