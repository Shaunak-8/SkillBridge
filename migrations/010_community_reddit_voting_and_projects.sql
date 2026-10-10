BEGIN;

-- Add optional project association to community posts
ALTER TABLE IF EXISTS skillbridge.community_posts
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES skillbridge.projects(id) ON DELETE SET NULL;

-- Reddit-style upvotes (+1) and downvotes (-1)
CREATE TABLE IF NOT EXISTS skillbridge.community_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES skillbridge.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES skillbridge.profiles(id) ON DELETE CASCADE,
  vote_value smallint NOT NULL CHECK (vote_value IN (-1, 1)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

-- Backfill existing likes into upvotes without modifying or dropping legacy records
INSERT INTO skillbridge.community_votes (post_id, user_id, vote_value, created_at, updated_at)
SELECT post_id, user_id, 1, created_at, created_at
FROM skillbridge.community_reactions
WHERE reaction_type = 'like'
ON CONFLICT (post_id, user_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS community_votes_post_id_idx ON skillbridge.community_votes(post_id);
CREATE INDEX IF NOT EXISTS community_votes_user_id_idx ON skillbridge.community_votes(user_id);
CREATE INDEX IF NOT EXISTS community_posts_project_id_idx ON skillbridge.community_posts(project_id);

COMMIT;
