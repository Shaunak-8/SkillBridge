BEGIN;
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS skillbridge.business_profiles (
  profile_id uuid PRIMARY KEY REFERENCES skillbridge.profiles(id),
  business_name text NOT NULL CHECK (length(trim(business_name)) BETWEEN 1 AND 200),
  business_type text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  preferred_language text NOT NULL DEFAULT 'en',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS skillbridge.student_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE REFERENCES skillbridge.profiles(id),
  bio text NOT NULL DEFAULT '',
  skills text[] NOT NULL DEFAULT '{}',
  interests text[] NOT NULL DEFAULT '{}',
  availability text NOT NULL DEFAULT '',
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'matching', 'private')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE skillbridge.student_profiles ADD COLUMN IF NOT EXISTS availability text NOT NULL DEFAULT '';
CREATE TABLE IF NOT EXISTS skillbridge.student_portfolio_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES skillbridge.student_profiles(id),
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 200),
  description text NOT NULL DEFAULT '',
  project_url text CHECK (project_url ~ '^https?://'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS portfolio_student_idx ON skillbridge.student_portfolio_items(student_id);
CREATE TABLE IF NOT EXISTS skillbridge.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_profile_id uuid NOT NULL REFERENCES skillbridge.profiles(id),
  title text NOT NULL DEFAULT '' CHECK (length(title) <= 200),
  summary text NOT NULL DEFAULT '',
  problem_statement text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  location_text text DEFAULT '',
  preferred_language text NOT NULL DEFAULT 'en',
  required_skills text[] NOT NULL DEFAULT '{}',
  deliverables text[] NOT NULL DEFAULT '{}',
  timeline text DEFAULT '',
  budget_label text NOT NULL DEFAULT '',
  mode text NOT NULL DEFAULT 'individual' CHECK (mode IN ('individual', 'team')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'in_progress', 'completed', 'closed', 'cancelled')),
  brief_version integer NOT NULL DEFAULT 1 CHECK (brief_version > 0),
  confirmed_version integer,
  owner_confirmed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
CHECK (NOT owner_confirmed OR (confirmed_version IS NOT NULL AND confirmed_version = brief_version)),
  CHECK (status NOT IN ('published', 'in_progress', 'completed') OR
    (owner_confirmed AND confirmed_version IS NOT NULL AND confirmed_version = brief_version
     AND length(trim(title)) > 0 AND length(trim(summary)) > 0
     AND length(trim(problem_statement)) > 0 AND cardinality(deliverables) > 0))
);
ALTER TABLE skillbridge.projects
  ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS deliverables text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS budget_label text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'individual' CHECK (mode IN ('individual', 'team')),
  ADD COLUMN IF NOT EXISTS brief_version integer NOT NULL DEFAULT 1 CHECK (brief_version > 0),
  ADD COLUMN IF NOT EXISTS confirmed_version integer;
ALTER TABLE skillbridge.projects ALTER COLUMN category SET DEFAULT '';
UPDATE skillbridge.projects SET confirmed_version = brief_version WHERE owner_confirmed AND confirmed_version IS NULL;
ALTER TABLE skillbridge.projects ADD CONSTRAINT projects_confirmation_version
  CHECK (NOT owner_confirmed OR (confirmed_version IS NOT NULL AND confirmed_version = brief_version));
-- Existing published rows remain intact. All future inserts and updates must pass this check.
ALTER TABLE skillbridge.projects ADD CONSTRAINT projects_publish_ready
  CHECK (status NOT IN ('published', 'in_progress', 'completed') OR
    (owner_confirmed AND confirmed_version IS NOT NULL AND confirmed_version = brief_version
     AND length(trim(title)) > 0 AND length(trim(summary)) > 0
     AND length(trim(problem_statement)) > 0 AND cardinality(deliverables) > 0)) NOT VALID;
CREATE INDEX IF NOT EXISTS projects_owner_idx ON skillbridge.projects(owner_profile_id);
CREATE INDEX IF NOT EXISTS projects_status_created_idx ON skillbridge.projects(status, created_at DESC);
CREATE TABLE skillbridge.project_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES skillbridge.projects(id),
  question text NOT NULL CHECK (length(trim(question)) > 0),
  required boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  UNIQUE (project_id, id)
);
CREATE INDEX IF NOT EXISTS questions_project_idx ON skillbridge.project_questions(project_id);
CREATE TABLE skillbridge.project_answers (
  question_id uuid PRIMARY KEY,
  project_id uuid NOT NULL,
  answer text NOT NULL CHECK (length(trim(answer)) > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (project_id, question_id) REFERENCES skillbridge.project_questions(project_id, id)
);
CREATE INDEX IF NOT EXISTS answers_project_idx ON skillbridge.project_answers(project_id);
CREATE TABLE IF NOT EXISTS skillbridge.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES skillbridge.projects(id),
  student_id uuid NOT NULL REFERENCES skillbridge.student_profiles(id),
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'viewed', 'reviewing', 'shortlisted', 'accepted', 'declined', 'withdrawn')),
  cover_note text NOT NULL CHECK (length(cover_note) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, student_id)
);
ALTER TABLE skillbridge.applications DROP CONSTRAINT IF EXISTS applications_status_check;
ALTER TABLE skillbridge.applications ADD CONSTRAINT applications_status_check
  CHECK (status IN ('submitted', 'viewed', 'reviewing', 'shortlisted', 'accepted', 'declined', 'withdrawn'));
CREATE INDEX IF NOT EXISTS applications_student_idx ON skillbridge.applications(student_id);
CREATE TABLE skillbridge.knowledge_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key text NOT NULL,
  chunk_index integer NOT NULL CHECK (chunk_index >= 0),
  content text NOT NULL CHECK (length(trim(content)) > 0),
  language text NOT NULL DEFAULT 'en',
  metadata jsonb NOT NULL DEFAULT '{}',
  approved boolean NOT NULL DEFAULT false,
  embedding vector,
  embedding_model text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((embedding IS NULL) = (embedding_model IS NULL)),
  UNIQUE (source_key, chunk_index)
);
CREATE INDEX IF NOT EXISTS knowledge_approved_language_idx ON skillbridge.knowledge_chunks(language) WHERE approved;

CREATE FUNCTION skillbridge.guard_project() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF ROW(NEW.title, NEW.summary, NEW.problem_statement, NEW.category, NEW.location_text, NEW.preferred_language, NEW.required_skills, NEW.deliverables, NEW.timeline, NEW.budget_label, NEW.mode)
      IS DISTINCT FROM ROW(OLD.title, OLD.summary, OLD.problem_statement, OLD.category, OLD.location_text, OLD.preferred_language, OLD.required_skills, OLD.deliverables, OLD.timeline, OLD.budget_label, OLD.mode) THEN
      IF OLD.status NOT IN ('draft', 'published') THEN
        RAISE EXCEPTION 'Brief is locked after a project starts' USING ERRCODE = '23514';
      END IF;
      NEW.brief_version := OLD.brief_version + 1;
      NEW.owner_confirmed := false;
      NEW.confirmed_version := NULL;
      NEW.status := 'draft';
    ELSIF NEW.brief_version IS DISTINCT FROM OLD.brief_version THEN
      IF OLD.status NOT IN ('draft', 'published') THEN
        RAISE EXCEPTION 'Brief is locked after a project starts' USING ERRCODE = '23514';
      END IF;
      NEW.brief_version := OLD.brief_version + 1;
      NEW.owner_confirmed := false;
      NEW.confirmed_version := NULL;
      NEW.status := 'draft';
    ELSE
      NEW.brief_version := OLD.brief_version;
    END IF;
    IF NEW.owner_profile_id IS DISTINCT FROM OLD.owner_profile_id THEN
      RAISE EXCEPTION 'Project owner is immutable' USING ERRCODE = '23514';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
      (OLD.status = 'draft' AND NEW.status IN ('published', 'cancelled')) OR
      (OLD.status = 'published' AND NEW.status IN ('draft', 'in_progress', 'closed', 'cancelled')) OR
      (OLD.status = 'in_progress' AND NEW.status IN ('completed', 'cancelled'))
    ) THEN RAISE EXCEPTION 'Invalid project transition' USING ERRCODE = '23514'; END IF;
  ELSIF NEW.status NOT IN ('draft', 'published') THEN
    RAISE EXCEPTION 'New projects must be draft or published' USING ERRCODE = '23514';
  END IF;
  IF NEW.owner_confirmed AND EXISTS (
    SELECT 1 FROM skillbridge.project_questions q
    WHERE q.project_id = NEW.id AND q.required
      AND NOT EXISTS (SELECT 1 FROM skillbridge.project_answers a WHERE a.question_id = q.id)
  ) THEN RAISE EXCEPTION 'Required questions are unanswered' USING ERRCODE = '23514'; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER guard_project BEFORE INSERT OR UPDATE ON skillbridge.projects
  FOR EACH ROW EXECUTE FUNCTION skillbridge.guard_project();

CREATE FUNCTION skillbridge.invalidate_verification() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.project_id <> OLD.project_id THEN
    RAISE EXCEPTION 'Verification project is immutable' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'DELETE' THEN target := OLD.project_id; ELSE target := NEW.project_id; END IF;
  UPDATE skillbridge.projects SET brief_version = brief_version + 1 WHERE id = target;
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE TRIGGER invalidate_question BEFORE INSERT OR UPDATE OR DELETE ON skillbridge.project_questions
  FOR EACH ROW EXECUTE FUNCTION skillbridge.invalidate_verification();
CREATE TRIGGER invalidate_answer BEFORE INSERT OR UPDATE OR DELETE ON skillbridge.project_answers
  FOR EACH ROW EXECUTE FUNCTION skillbridge.invalidate_verification();

CREATE FUNCTION skillbridge.guard_application() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE project_status text;
BEGIN
  SELECT status INTO project_status FROM skillbridge.projects WHERE id = NEW.project_id FOR UPDATE;
  IF TG_OP = 'INSERT' AND project_status <> 'published' THEN
    RAISE EXCEPTION 'Applications require a published project' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'UPDATE' AND (NEW.project_id <> OLD.project_id OR NEW.student_id <> OLD.student_id) THEN
    RAISE EXCEPTION 'Application identity is immutable' USING ERRCODE = '23514';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER guard_application BEFORE INSERT OR UPDATE ON skillbridge.applications
  FOR EACH ROW EXECUTE FUNCTION skillbridge.guard_application();
REVOKE ALL ON ALL TABLES IN SCHEMA skillbridge FROM PUBLIC;
COMMIT;
