BEGIN;

CREATE TABLE IF NOT EXISTS skillbridge.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES skillbridge.profiles(id),
  community_type text NOT NULL CHECK (community_type IN ('student', 'business')),
  title text NOT NULL CHECK (length(trim(title)) > 0 AND length(title) <= 200),
  body text NOT NULL CHECK (length(trim(body)) > 0 AND length(body) <= 10000),
  category text NOT NULL CHECK (length(trim(category)) > 0 AND length(category) <= 50),
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Older deployments used author_profile_id/content/post_type. Add the
-- current columns before creating indexes and triggers so this migration is
-- safe against those existing tables.
ALTER TABLE skillbridge.community_posts
  ADD COLUMN IF NOT EXISTS author_profile_id uuid,
  ADD COLUMN IF NOT EXISTS post_type text,
  ADD COLUMN IF NOT EXISTS content text,
  ADD COLUMN IF NOT EXISTS skills_highlighted text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES skillbridge.profiles(id),
  ADD COLUMN IF NOT EXISTS community_type text,
  ADD COLUMN IF NOT EXISTS body text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

UPDATE skillbridge.community_posts p
SET author_id = COALESCE(p.author_id, p.author_profile_id),
    body = COALESCE(p.body, p.content),
    category = COALESCE(p.category, p.post_type, 'general'),
    community_type = COALESCE(
      p.community_type,
      CASE WHEN EXISTS (
        SELECT 1 FROM skillbridge.profiles pr
        WHERE pr.id = COALESCE(p.author_id, p.author_profile_id) AND pr.role = 'business'
      ) THEN 'business' ELSE 'student' END
    ),
    tags = CASE WHEN cardinality(p.tags) > 0 THEN p.tags ELSE COALESCE(p.skills_highlighted, '{}') END
WHERE p.author_id IS NULL OR p.body IS NULL OR p.category IS NULL OR p.community_type IS NULL;

CREATE INDEX IF NOT EXISTS community_posts_community_created_idx ON skillbridge.community_posts(community_type, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS community_posts_author_idx ON skillbridge.community_posts(author_id);

CREATE TABLE IF NOT EXISTS skillbridge.community_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES skillbridge.community_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES skillbridge.profiles(id),
  parent_comment_id uuid REFERENCES skillbridge.community_comments(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (length(trim(body)) > 0 AND length(body) <= 5000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE skillbridge.community_comments
  ADD COLUMN IF NOT EXISTS author_profile_id uuid,
  ADD COLUMN IF NOT EXISTS content text,
  ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES skillbridge.profiles(id),
  ADD COLUMN IF NOT EXISTS parent_comment_id uuid,
  ADD COLUMN IF NOT EXISTS body text,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

UPDATE skillbridge.community_comments c
SET author_id = COALESCE(c.author_id, c.author_profile_id),
    body = COALESCE(c.body, c.content)
WHERE c.author_id IS NULL OR c.body IS NULL;

CREATE INDEX IF NOT EXISTS community_comments_post_idx ON skillbridge.community_comments(post_id);

CREATE TABLE IF NOT EXISTS skillbridge.community_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES skillbridge.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES skillbridge.profiles(id),
  reaction_type text NOT NULL CHECK (reaction_type IN ('like')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id, reaction_type)
);

CREATE TABLE IF NOT EXISTS skillbridge.community_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES skillbridge.profiles(id),
  post_id uuid REFERENCES skillbridge.community_posts(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES skillbridge.community_comments(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (length(trim(reason)) > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR 
    (post_id IS NULL AND comment_id IS NOT NULL)
  )
);

CREATE OR REPLACE FUNCTION skillbridge.guard_community_post_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.community_type IS DISTINCT FROM OLD.community_type THEN
    RAISE EXCEPTION 'community_type is immutable' USING ERRCODE = '23514';
  END IF;
  IF NEW.author_id IS DISTINCT FROM OLD.author_id THEN
    RAISE EXCEPTION 'author_id is immutable' USING ERRCODE = '23514';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS guard_community_post_update ON skillbridge.community_posts;
CREATE TRIGGER guard_community_post_update BEFORE UPDATE ON skillbridge.community_posts
  FOR EACH ROW EXECUTE FUNCTION skillbridge.guard_community_post_update();

CREATE OR REPLACE FUNCTION skillbridge.guard_community_comment_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.post_id IS DISTINCT FROM OLD.post_id THEN
    RAISE EXCEPTION 'post_id is immutable' USING ERRCODE = '23514';
  END IF;
  IF NEW.author_id IS DISTINCT FROM OLD.author_id THEN
    RAISE EXCEPTION 'author_id is immutable' USING ERRCODE = '23514';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS guard_community_comment_update ON skillbridge.community_comments;
CREATE TRIGGER guard_community_comment_update BEFORE UPDATE ON skillbridge.community_comments
  FOR EACH ROW EXECUTE FUNCTION skillbridge.guard_community_comment_update();

REVOKE ALL ON ALL TABLES IN SCHEMA skillbridge FROM PUBLIC;
COMMIT;
