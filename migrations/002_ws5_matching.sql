BEGIN;
-- WS5 matching and applications. Idempotent. No semicolons inside comments (scripts/database.mjs splits on them).
-- projects, student_profiles and student_portfolio_items are MINIMAL STAND-INS.
-- They are to be owned and extended later by Members 1-4 and 6. Only the columns WS5 needs exist here.
CREATE TABLE IF NOT EXISTS skillbridge.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_profile_id uuid NOT NULL REFERENCES skillbridge.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  summary text NOT NULL DEFAULT '',
  problem_statement text NOT NULL DEFAULT '',
  category text NOT NULL,
  required_skills text[] NOT NULL DEFAULT '{}',
  location_text text,
  remote_ok boolean NOT NULL DEFAULT false,
  timeline text,
  compensation text NOT NULL DEFAULT 'unpaid' CHECK (compensation IN ('paid', 'unpaid', 'expense_only', 'negotiable')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'in_progress', 'completed', 'closed', 'cancelled')),
  owner_confirmed boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status <> 'published' OR owner_confirmed)
);
CREATE INDEX IF NOT EXISTS projects_status_published_idx ON skillbridge.projects (status, published_at DESC);
CREATE INDEX IF NOT EXISTS projects_owner_idx ON skillbridge.projects (owner_profile_id);
CREATE TABLE IF NOT EXISTS skillbridge.student_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE REFERENCES skillbridge.profiles(id) ON DELETE CASCADE,
  bio text NOT NULL DEFAULT '',
  education_level text,
  study_year int,
  skills text[] NOT NULL DEFAULT '{}',
  interests text[] NOT NULL DEFAULT '{}',
  preferred_categories text[] NOT NULL DEFAULT '{}',
  availability_hours_per_week int CHECK (availability_hours_per_week BETWEEN 0 AND 80),
  remote_preference text NOT NULL DEFAULT 'either' CHECK (remote_preference IN ('remote', 'onsite', 'either')),
  location_text text,
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'matching', 'private')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS skillbridge.student_portfolio_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES skillbridge.student_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  skills_used text[] NOT NULL DEFAULT '{}',
  project_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS portfolio_student_idx ON skillbridge.student_portfolio_items (student_id);
CREATE TABLE IF NOT EXISTS skillbridge.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES skillbridge.projects(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES skillbridge.student_profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'viewed', 'shortlisted', 'accepted', 'declined', 'withdrawn')),
  cover_note text NOT NULL CHECK (char_length(cover_note) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, student_id)
);
CREATE INDEX IF NOT EXISTS applications_project_status_idx ON skillbridge.applications (project_id, status);
CREATE INDEX IF NOT EXISTS applications_student_idx ON skillbridge.applications (student_id);
REVOKE ALL ON ALL TABLES IN SCHEMA skillbridge FROM PUBLIC;
COMMIT;
