BEGIN;

CREATE TABLE IF NOT EXISTS skillbridge.resumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES skillbridge.student_profiles(id),
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Associate applications with a resume
ALTER TABLE skillbridge.applications 
  ADD COLUMN IF NOT EXISTS resume_id uuid REFERENCES skillbridge.resumes(id),
  ADD COLUMN IF NOT EXISTS pitch text,
  ADD COLUMN IF NOT EXISTS availability_hours int,
  ADD COLUMN IF NOT EXISTS available_from timestamptz;

CREATE TABLE IF NOT EXISTS skillbridge.application_portfolio_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES skillbridge.applications(id) ON DELETE CASCADE,
  portfolio_item_id uuid NOT NULL REFERENCES skillbridge.student_portfolio_items(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id, portfolio_item_id)
);

CREATE TABLE IF NOT EXISTS skillbridge.application_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES skillbridge.applications(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES skillbridge.project_questions(id) ON DELETE CASCADE,
  answer_text text,
  answer_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id, question_id)
);

CREATE INDEX IF NOT EXISTS resumes_student_idx ON skillbridge.resumes(student_id);
CREATE INDEX IF NOT EXISTS app_portfolios_app_idx ON skillbridge.application_portfolio_items(application_id);
CREATE INDEX IF NOT EXISTS app_answers_app_idx ON skillbridge.application_answers(application_id);

REVOKE ALL ON ALL TABLES IN SCHEMA skillbridge FROM PUBLIC;

COMMIT;
