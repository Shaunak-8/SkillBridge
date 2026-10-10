-- Bring databases created by the earlier community migration up to the
-- shared community schema used by the current application.
BEGIN;

ALTER TABLE IF EXISTS skillbridge.community_posts
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
      CASE
        WHEN EXISTS (
          SELECT 1 FROM skillbridge.profiles pr
          WHERE pr.id = COALESCE(p.author_id, p.author_profile_id)
            AND pr.role = 'business'
        ) THEN 'business'
        ELSE 'student'
      END
    ),
    tags = CASE
      WHEN cardinality(p.tags) > 0 THEN p.tags
      ELSE COALESCE(p.skills_highlighted, '{}')
    END
WHERE p.author_id IS NULL
   OR p.body IS NULL
   OR p.category IS NULL
   OR p.community_type IS NULL
   OR p.tags IS NULL;

ALTER TABLE IF EXISTS skillbridge.community_comments
  ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES skillbridge.profiles(id),
  ADD COLUMN IF NOT EXISTS parent_comment_id uuid,
  ADD COLUMN IF NOT EXISTS body text,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

UPDATE skillbridge.community_comments c
SET author_id = COALESCE(c.author_id, c.author_profile_id),
    body = COALESCE(c.body, c.content)
WHERE c.author_id IS NULL OR c.body IS NULL;

CREATE TABLE IF NOT EXISTS skillbridge.community_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES skillbridge.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES skillbridge.profiles(id),
  reaction_type text NOT NULL DEFAULT 'like' CHECK (reaction_type = 'like'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id, reaction_type)
);

INSERT INTO skillbridge.community_reactions (post_id, user_id, reaction_type, created_at)
SELECT l.post_id, l.profile_id, 'like', l.created_at
FROM skillbridge.community_post_likes l
ON CONFLICT (post_id, user_id, reaction_type) DO NOTHING;

CREATE INDEX IF NOT EXISTS community_posts_shared_created_idx
  ON skillbridge.community_posts(community_type, created_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS community_posts_author_id_idx
  ON skillbridge.community_posts(author_id);
CREATE INDEX IF NOT EXISTS community_reactions_post_idx
  ON skillbridge.community_reactions(post_id);

COMMIT;
