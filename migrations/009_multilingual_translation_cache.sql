BEGIN;
-- Multilingual support: a preferred language per profile and a cache for translated text.
-- This replaces the multilingual half of the former 007_community_and_multilingual.sql. Its community tables
-- duplicated the ones in 007_community_discussions.sql (already applied) and made db:migrate fail.
-- Purely additive and idempotent.
ALTER TABLE skillbridge.profiles
  ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'en';
CREATE TABLE IF NOT EXISTS skillbridge.translation_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_hash text NOT NULL,
  source_text text NOT NULL,
  source_lang text NOT NULL DEFAULT 'en',
  target_lang text NOT NULL,
  translated_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_hash, target_lang)
);
CREATE INDEX IF NOT EXISTS translation_cache_lookup_idx ON skillbridge.translation_cache(source_hash, target_lang);
REVOKE ALL ON skillbridge.translation_cache FROM PUBLIC;
COMMIT;
