import { NextResponse } from 'next/server';
import { translateText } from '@/lib/ai/translator';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { text, targetLang, sourceLang } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ translatedText: '' });
    }

    const result = await translateText(text, targetLang || 'en', sourceLang || 'auto');
    return NextResponse.json(result);
  } catch (error) {
    console.error('Translation route error:', error);
    return NextResponse.json({ translatedText: '' }, { status: 500 });
  }
}
