-- Isolated test fixture matching the shared schema inspected on 2026-10-09.
-- This file is NOT a migration. Never run it against Neon.
CREATE SCHEMA skillbridge;
CREATE TABLE skillbridge.rate_limits(key text PRIMARY KEY,hits integer NOT NULL,expires_at timestamptz NOT NULL);
CREATE TABLE skillbridge.profiles (id uuid PRIMARY KEY, role text, full_name text NOT NULL DEFAULT '');
CREATE TABLE skillbridge.student_profiles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), profile_id uuid UNIQUE NOT NULL REFERENCES skillbridge.profiles(id),
 bio text NOT NULL DEFAULT '', skills text[] NOT NULL DEFAULT '{}', interests text[] NOT NULL DEFAULT '{}', preferred_categories text[] NOT NULL DEFAULT '{}',
 availability_hours_per_week integer, remote_preference text NOT NULL DEFAULT 'either', visibility text NOT NULL DEFAULT 'private', updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE skillbridge.student_portfolio_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL REFERENCES skillbridge.student_profiles(id),
 title text NOT NULL, description text NOT NULL DEFAULT '', skills_used text[] NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE skillbridge.business_profiles (
 profile_id uuid PRIMARY KEY REFERENCES skillbridge.profiles(id), business_name text NOT NULL,
 business_type text NOT NULL DEFAULT '', location text NOT NULL DEFAULT '', preferred_language text NOT NULL DEFAULT 'en',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE skillbridge.projects (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_profile_id uuid NOT NULL REFERENCES skillbridge.profiles(id),
 title text NOT NULL, summary text NOT NULL DEFAULT '', problem_statement text NOT NULL DEFAULT '', category text NOT NULL DEFAULT '',
 required_skills text[] NOT NULL DEFAULT '{}', location_text text, remote_ok boolean NOT NULL DEFAULT false, timeline text,
 compensation text NOT NULL DEFAULT 'unpaid' CHECK (compensation IN ('unpaid','paid','negotiable')),
 status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','in_progress','completed','closed','cancelled')),
 owner_confirmed boolean NOT NULL DEFAULT false, published_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 preferred_language text NOT NULL DEFAULT 'en', deliverables text[] NOT NULL DEFAULT '{}', budget_label text NOT NULL DEFAULT '', mode text NOT NULL DEFAULT 'individual',
 brief_version integer NOT NULL DEFAULT 1, confirmed_version integer,
 CHECK (NOT owner_confirmed OR (confirmed_version IS NOT NULL AND confirmed_version=brief_version)),
 CHECK (status NOT IN ('published','in_progress','completed') OR
   (owner_confirmed AND confirmed_version=brief_version AND length(trim(title))>0 AND length(trim(summary))>0 AND length(trim(problem_statement))>0 AND cardinality(deliverables)>0))
);
CREATE TABLE skillbridge.project_questions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL REFERENCES skillbridge.projects(id), question text NOT NULL,
 required boolean NOT NULL DEFAULT true, position integer NOT NULL DEFAULT 0, question_type text NOT NULL DEFAULT 'short_text', options jsonb, UNIQUE(project_id,id)
);
CREATE TABLE skillbridge.project_answers (
 question_id uuid PRIMARY KEY, project_id uuid NOT NULL, answer text NOT NULL CHECK(length(trim(answer))>0), updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(project_id,question_id) REFERENCES skillbridge.project_questions(project_id,id)
);
CREATE TABLE skillbridge.applications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL REFERENCES skillbridge.projects(id),
 student_id uuid NOT NULL REFERENCES skillbridge.student_profiles(id), cover_note text NOT NULL,
 status text NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','viewed','reviewing','shortlisted','accepted','declined','withdrawn')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(project_id,student_id)
);
-- Shared guard's version and required-answer rules are included to exercise SQL/trigger interaction.
CREATE FUNCTION skillbridge.guard_project() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' THEN
  IF ROW(NEW.title,NEW.summary,NEW.problem_statement,NEW.category,NEW.location_text,NEW.preferred_language,NEW.required_skills,NEW.deliverables,NEW.timeline,NEW.budget_label,NEW.mode)
   IS DISTINCT FROM ROW(OLD.title,OLD.summary,OLD.problem_statement,OLD.category,OLD.location_text,OLD.preferred_language,OLD.required_skills,OLD.deliverables,OLD.timeline,OLD.budget_label,OLD.mode)
   OR NEW.brief_version IS DISTINCT FROM OLD.brief_version THEN
   NEW.brief_version := OLD.brief_version+1; NEW.owner_confirmed := false; NEW.confirmed_version := NULL; NEW.status := 'draft';
  END IF;
  IF NEW.owner_profile_id IS DISTINCT FROM OLD.owner_profile_id THEN RAISE EXCEPTION 'Project owner is immutable'; END IF;
 END IF;
 IF NEW.owner_confirmed AND EXISTS (SELECT 1 FROM skillbridge.project_questions q WHERE q.project_id=NEW.id AND q.required
   AND NOT EXISTS (SELECT 1 FROM skillbridge.project_answers a WHERE a.question_id=q.id)) THEN RAISE EXCEPTION 'Required questions are unanswered'; END IF;
 NEW.updated_at := now(); RETURN NEW;
END $$;
CREATE TRIGGER guard_project BEFORE INSERT OR UPDATE ON skillbridge.projects FOR EACH ROW EXECUTE FUNCTION skillbridge.guard_project();
