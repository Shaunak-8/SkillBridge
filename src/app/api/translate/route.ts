import { NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError, ApiFailure } from '@/lib/api';
import { currentProfile } from '@/lib/auth/profile';
import { rateLimit, sameOrigin } from '@/lib/auth/security';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n/languages';
import { translateText } from '@/lib/ai/translator';

const MAX_TEXT_CHARS = 10000;
const TRANSLATIONS_PER_WINDOW = 60;
const supportedCodes = SUPPORTED_LANGUAGES.map((l) => l.code) as [string, ...string[]];

const bodySchema = z.object({
  text: z.string().max(MAX_TEXT_CHARS),
  targetLang: z.enum(supportedCodes).default('en'),
  sourceLang: z.string().default('auto'),
});

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) {
      throw new ApiFailure(403, 'INVALID_ORIGIN', 'Invalid request origin.');
    }

    const auth = await currentProfile();
    const identifier = auth?.profile?.id || 'visitor';

    if (!(await rateLimit('public-translate', identifier, TRANSLATIONS_PER_WINDOW))) {
      throw new ApiFailure(429, 'RATE_LIMITED', 'Too many translations. Please try again later.');
    }

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      throw new ApiFailure(
        400,
        'VALIDATION_ERROR',
        `Send { text, targetLang, sourceLang } with text up to ${MAX_TEXT_CHARS} characters and a valid language code.`
      );
    }

    const { text, targetLang, sourceLang } = parsed.data;
    if (!text.trim()) {
      return NextResponse.json({ translatedText: '', translated: '', sourceLang, targetLang });
    }

    const result = await translateText(text, targetLang, sourceLang);

    return NextResponse.json({
      translatedText: result.translatedText,
      translated: result.translatedText,
      sourceLang: result.sourceLang,
      targetLang: result.targetLang,
      fromCache: result.fromCache,
    });
  } catch (error) {
    return apiError(error);
  }
}
