BEGIN;
-- WS5 matching and applications. Purely additive on top of 002_shared_backend and idempotent.
-- No semicolons inside comments (scripts/database.mjs splits on them).
-- Inline CHECKs only apply when the column is newly added (a no-op where the column already exists).
ALTER TABLE skillbridge.projects
  ADD COLUMN IF NOT EXISTS remote_ok boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS compensation text NOT NULL DEFAULT 'unpaid' CHECK (compensation IN ('paid', 'unpaid', 'expense_only', 'negotiable')),
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS embedding vector(768),
  ADD COLUMN IF NOT EXISTS embedding_model text,
  ADD COLUMN IF NOT EXISTS embedded_at timestamptz;
ALTER TABLE skillbridge.student_profiles
  ADD COLUMN IF NOT EXISTS education_level text,
  ADD COLUMN IF NOT EXISTS study_year int,
  ADD COLUMN IF NOT EXISTS preferred_categories text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS availability_hours_per_week int CHECK (availability_hours_per_week BETWEEN 0 AND 80),
  ADD COLUMN IF NOT EXISTS remote_preference text NOT NULL DEFAULT 'either' CHECK (remote_preference IN ('remote', 'onsite', 'either')),
  ADD COLUMN IF NOT EXISTS location_text text,
  ADD COLUMN IF NOT EXISTS embedding vector(768),
  ADD COLUMN IF NOT EXISTS embedding_model text,
  ADD COLUMN IF NOT EXISTS embedded_at timestamptz;
ALTER TABLE skillbridge.student_portfolio_items
  ADD COLUMN IF NOT EXISTS skills_used text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS projects_status_published_idx ON skillbridge.projects (status, published_at DESC);
CREATE INDEX IF NOT EXISTS applications_project_status_idx ON skillbridge.applications (project_id, status);
CREATE INDEX IF NOT EXISTS projects_embedding_idx ON skillbridge.projects USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS student_profiles_embedding_idx ON skillbridge.student_profiles USING hnsw (embedding vector_cosine_ops);
REVOKE ALL ON ALL TABLES IN SCHEMA skillbridge FROM PUBLIC;
COMMIT;
