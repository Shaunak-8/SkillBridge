import { cookies } from 'next/headers';
import { database } from '@/lib/db';
import { currentProfile } from '@/lib/auth/profile';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n/languages';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const preferredLanguage = typeof body.preferred_language === 'string' ? body.preferred_language.toLowerCase().trim() : 'en';

    if (!SUPPORTED_LANGUAGES.some((l) => l.code === preferredLanguage)) {
      return Response.json({ error: 'Unsupported language' }, { status: 400 });
    }

    // Set cookie on response
    const cookieStore = await cookies();
    cookieStore.set('skillbridge_locale', preferredLanguage, {
      path: '/',
      maxAge: 31536000,
      sameSite: 'lax',
    });

    // If user is authenticated, update preferred_language in database
    const current = await currentProfile();
    if (current?.profile?.id) {
      await database()`
        UPDATE skillbridge.profiles
        SET preferred_language = ${preferredLanguage}, updated_at = now()
        WHERE id = ${current.profile.id}
      `;
    }

    return Response.json({ success: true, locale: preferredLanguage });
  } catch (error) {
    console.error('Failed to update language preference:', error);
    return Response.json({ error: 'Failed to update language' }, { status: 500 });
  }
}
