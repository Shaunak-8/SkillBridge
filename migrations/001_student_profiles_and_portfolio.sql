-- Migration: 001_student_profiles_and_portfolio.sql
-- Workstream 4: Student Profiles & Portfolio
-- Coordinates with Member 6 (Shared Backend & Schema) and Member 5 (RAG-Assisted Matching)

-- 1. Ensure UUID generation extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Shared user_profiles table (Member 6 foundation)
CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('student', 'business', 'admin')),
  display_name TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Student profiles table
CREATE TABLE IF NOT EXISTS student_profiles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE,
  bio TEXT NOT NULL DEFAULT '',
  education_level TEXT NOT NULL DEFAULT '',
  field_of_study TEXT NOT NULL DEFAULT '',
  study_year TEXT NOT NULL DEFAULT '',
  skills TEXT[] NOT NULL DEFAULT '{}',
  interests TEXT[] NOT NULL DEFAULT '{}',
  learning_goals TEXT[] NOT NULL DEFAULT '{}',
  preferred_categories TEXT[] NOT NULL DEFAULT '{}',
  hours_per_week INTEGER NOT NULL DEFAULT 10 CHECK (hours_per_week >= 0 AND hours_per_week <= 80),
  schedule_preference TEXT NOT NULL DEFAULT 'Flexible',
  availability_notes TEXT NOT NULL DEFAULT '',
  visibility TEXT NOT NULL DEFAULT 'public_to_businesses' CHECK (visibility IN ('draft_private', 'public_to_businesses')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Student portfolio items table
CREATE TABLE IF NOT EXISTS student_portfolio_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  student_id TEXT NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) >= 3 AND char_length(title) <= 120),
  description TEXT NOT NULL CHECK (char_length(description) >= 10 AND char_length(description) <= 2000),
  role TEXT DEFAULT '',
  skills_used TEXT[] NOT NULL DEFAULT '{}',
  project_url TEXT,
  media_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Indexes for fast lookups and matching filters
CREATE INDEX IF NOT EXISTS idx_student_profiles_user_id ON student_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_student_profiles_visibility ON student_profiles(visibility);
CREATE INDEX IF NOT EXISTS idx_student_portfolio_student_id ON student_portfolio_items(student_id);
CREATE INDEX IF NOT EXISTS idx_student_profiles_skills ON student_profiles USING GIN(skills);
CREATE INDEX IF NOT EXISTS idx_student_profiles_preferred_categories ON student_profiles USING GIN(preferred_categories);

-- 6. Trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_student_profiles_updated_at ON student_profiles;
CREATE TRIGGER trg_student_profiles_updated_at
BEFORE UPDATE ON student_profiles
FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

DROP TRIGGER IF EXISTS trg_student_portfolio_items_updated_at ON student_portfolio_items;
CREATE TRIGGER trg_student_portfolio_items_updated_at
BEFORE UPDATE ON student_portfolio_items
FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

-- Seed verification data for local testing (matches Member 6 seed requirements)
INSERT INTO user_profiles (id, role, display_name, email)
VALUES 
  ('s1', 'student', 'Aarav Mehta', 'aarav@example.com'),
  ('s2', 'student', 'Maya Shah', 'maya@example.com'),
  ('s3', 'student', 'Kabir Rao', 'kabir@example.com')
ON CONFLICT (id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  role = EXCLUDED.role;

INSERT INTO student_profiles (
  id, user_id, bio, education_level, field_of_study, study_year,
  skills, interests, learning_goals, preferred_categories,
  hours_per_week, schedule_preference, visibility
) VALUES (
  'sp-s1', 's1',
  'I turn messy workflows into simple, friendly digital products.',
  'Undergraduate', 'Computer Science & Engineering', '3rd Year',
  ARRAY['React', 'Next.js', 'UI/UX Design', 'TypeScript', 'Tailwind CSS'],
  ARRAY['Local retail apps', 'Accessibility', 'Order management workflows'],
  ARRAY['PostgreSQL optimization', 'Mobile responsiveness', 'API design'],
  ARRAY['Web development', 'Retail technology', 'Customer experience'],
  12, 'Weekdays & Evenings', 'public_to_businesses'
) ON CONFLICT (user_id) DO UPDATE SET
  bio = EXCLUDED.bio,
  skills = EXCLUDED.skills,
  preferred_categories = EXCLUDED.preferred_categories;

INSERT INTO student_portfolio_items (
  id, student_id, title, description, role, skills_used, project_url
) VALUES (
  'port-1', 'sp-s1',
  'Local Kirana Order Counter Web App',
  'Built a lightweight, touch-friendly order taking dashboard for a neighbourhood grocery store to replace paper chits and whatsapp messages during morning rush hours.',
  'Lead Frontend Builder & Workflow Designer',
  ARRAY['React', 'TypeScript', 'Tailwind CSS', 'IndexedDB'],
  'https://github.com/example/kirana-counter'
) ON CONFLICT (id) DO NOTHING;
