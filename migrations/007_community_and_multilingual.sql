BEGIN;

-- ========================================================
-- Migration 007: Community System & Multilingual Caching
-- ========================================================

-- 1. Add preferred_language to skillbridge.profiles if not present
ALTER TABLE skillbridge.profiles
  ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'en';

-- 2. Community Posts Table
CREATE TABLE IF NOT EXISTS skillbridge.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_profile_id uuid NOT NULL REFERENCES skillbridge.profiles(id) ON DELETE CASCADE,
  post_type text NOT NULL CHECK (post_type IN ('completed_project', 'achievement', 'project_update', 'business_milestone', 'general')),
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 200),
  content text NOT NULL CHECK (length(trim(content)) BETWEEN 1 AND 10000),
  project_id uuid REFERENCES skillbridge.projects(id) ON DELETE SET NULL,
  media_urls text[] NOT NULL DEFAULT '{}',
  skills_highlighted text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS community_posts_author_idx ON skillbridge.community_posts(author_profile_id);
CREATE INDEX IF NOT EXISTS community_posts_created_idx ON skillbridge.community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS community_posts_type_idx ON skillbridge.community_posts(post_type);
CREATE INDEX IF NOT EXISTS community_posts_project_idx ON skillbridge.community_posts(project_id);

-- 3. Community Post Likes Table (Unique per user and post)
CREATE TABLE IF NOT EXISTS skillbridge.community_post_likes (
  post_id uuid NOT NULL REFERENCES skillbridge.community_posts(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES skillbridge.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, profile_id)
);

CREATE INDEX IF NOT EXISTS community_likes_post_idx ON skillbridge.community_post_likes(post_id);
CREATE INDEX IF NOT EXISTS community_likes_profile_idx ON skillbridge.community_post_likes(profile_id);

-- 4. Community Post Comments Table
CREATE TABLE IF NOT EXISTS skillbridge.community_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES skillbridge.community_posts(id) ON DELETE CASCADE,
  author_profile_id uuid NOT NULL REFERENCES skillbridge.profiles(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (length(trim(content)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS community_comments_post_idx ON skillbridge.community_comments(post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS community_comments_author_idx ON skillbridge.community_comments(author_profile_id);

-- 5. Translation Cache Table (Avoids redundant external LLM/Translation API calls)
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

COMMIT;
