BEGIN;
-- WS4 student profile and portfolio fields that skillbridge tables lack. Purely additive and idempotent.
-- Mapping onto existing columns: availability_hours_per_week, availability (schedule preference), study_year (1-5), skills_used.
-- No semicolons inside comments (scripts/database.mjs splits on them).
ALTER TABLE skillbridge.student_profiles
  ADD COLUMN IF NOT EXISTS field_of_study text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS learning_goals text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS availability_notes text NOT NULL DEFAULT '';
ALTER TABLE skillbridge.student_portfolio_items
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS media_url text CHECK (media_url ~ '^https?://');
COMMIT;
