import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));

import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '@/lib/i18n/languages';
import { getTranslation, DICTIONARIES } from '@/lib/i18n/dictionaries';
import { translateText } from '@/lib/ai/translator';

describe('Multilingual System & I18n', () => {
  it('supports English and 6 Indian languages with valid BCP-47 tags', () => {
    const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
    expect(codes).toContain('en');
    expect(codes).toContain('hi');
    expect(codes).toContain('te');
    expect(codes).toContain('mr');
    expect(codes).toContain('ta');
    expect(codes).toContain('kn');
    expect(codes).toContain('bn');

    for (const lang of SUPPORTED_LANGUAGES) {
      expect(lang.bcp47).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
      expect(lang.name).toBeDefined();
      expect(lang.nativeName).toBeDefined();
    }
  });

  it('provides translations for critical UI keys in all supported languages', () => {
    const requiredKeys = [
      'explore_projects',
      'community',
      'how_it_works',
      'log_in',
      'get_started',
      'community_title',
      'publish_post',
      'the_problem',
      'expected_deliverables',
      'required_skills',
      'apply_now',
      'listen_to_brief',
    ];

    for (const lang of SUPPORTED_LANGUAGES) {
      for (const key of requiredKeys) {
        const text = getTranslation(lang.code, key);
        expect(text).toBeDefined();
        expect(text.length).toBeGreaterThan(0);
      }
    }
  });

  it('falls back gracefully to English when language or key is unmapped', () => {
    const fallbackText = getTranslation('non-existent-lang', 'explore_projects');
    expect(fallbackText).toBe('Explore Projects');

    const unmappedKey = getTranslation('hi', 'non.existent.key.test');
    expect(unmappedKey).toBe('non.existent.key.test');
  });

  describe('translateText & Caching', () => {
    it('returns empty string for blank input', async () => {
      const res = await translateText('');
      expect(res.translatedText).toBe('');
    });

    it('returns original text immediately if source and target language match', async () => {
      const res = await translateText('Hello World', 'en', 'en');
      expect(res.translatedText).toBe('Hello World');
    });

    it('caches repeated translations in memory cache to prevent redundant API calls', async () => {
      // First call
      const res1 = await translateText('Unique Test Input for Cache', 'hi', 'en');
      expect(res1).toBeDefined();

      // Second call for exact same text and language returns fromCache
      const res2 = await translateText('Unique Test Input for Cache', 'hi', 'en');
      expect(res2).toBeDefined();
      expect(res2.fromCache).toBe(true);
    });
  });
});
