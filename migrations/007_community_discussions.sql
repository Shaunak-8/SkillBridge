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

CREATE FUNCTION skillbridge.guard_community_post_update() RETURNS trigger LANGUAGE plpgsql AS $$
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

CREATE TRIGGER guard_community_post_update BEFORE UPDATE ON skillbridge.community_posts
  FOR EACH ROW EXECUTE FUNCTION skillbridge.guard_community_post_update();

CREATE FUNCTION skillbridge.guard_community_comment_update() RETURNS trigger LANGUAGE plpgsql AS $$
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

CREATE TRIGGER guard_community_comment_update BEFORE UPDATE ON skillbridge.community_comments
  FOR EACH ROW EXECUTE FUNCTION skillbridge.guard_community_comment_update();

REVOKE ALL ON ALL TABLES IN SCHEMA skillbridge FROM PUBLIC;
COMMIT;
