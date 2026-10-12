BEGIN;
-- 009_community_schema_compat.sql backfills reactions from community_post_likes. That table existed only in
-- databases created by the removed 007_community_and_multilingual migration, so a brand-new database failed
-- at 009. Create it (empty) where it is missing; the shared database already has it, so this is a no-op there.
CREATE TABLE IF NOT EXISTS skillbridge.community_post_likes (
  post_id uuid NOT NULL REFERENCES skillbridge.community_posts(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES skillbridge.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, profile_id)
);
COMMIT;
