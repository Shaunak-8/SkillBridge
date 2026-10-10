BEGIN;
-- AI-proctored quiz. Purely additive and idempotent. No semicolons inside comments (scripts/database.mjs splits on them).
-- Questions are generated from the business's own posted problem. Integrity events are advisory signals only. No video or images are stored.
CREATE TABLE IF NOT EXISTS skillbridge.project_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL UNIQUE REFERENCES skillbridge.projects(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed')),
  time_limit_seconds int NOT NULL DEFAULT 600 CHECK (time_limit_seconds BETWEEN 300 AND 1800),
  opened_at timestamptz,
  closes_at timestamptz,
  generated_by_model text,
  source_hash text NOT NULL,
  created_by uuid NOT NULL REFERENCES skillbridge.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS skillbridge.quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES skillbridge.project_quizzes(id) ON DELETE CASCADE,
  position int NOT NULL CHECK (position BETWEEN 1 AND 5),
  kind text NOT NULL CHECK (kind IN ('mcq', 'short')),
  prompt text NOT NULL CHECK (char_length(prompt) BETWEEN 10 AND 600),
  options jsonb,
  correct_index int,
  rubric text,
  UNIQUE (quiz_id, position),
  CHECK (kind <> 'mcq' OR (options IS NOT NULL AND correct_index BETWEEN 0 AND 3)),
  CHECK (kind <> 'short' OR rubric IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS skillbridge.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES skillbridge.project_quizzes(id) ON DELETE CASCADE,
  application_id uuid NOT NULL UNIQUE REFERENCES skillbridge.applications(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES skillbridge.student_profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'expired')),
  consent_at timestamptz NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  deadline_at timestamptz NOT NULL,
  submitted_at timestamptz,
  mcq_score int,
  mcq_max int,
  short_score int,
  short_max int,
  proctoring_mode text NOT NULL CHECK (proctoring_mode IN ('full', 'limited', 'none')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS skillbridge.quiz_answers (
  attempt_id uuid NOT NULL REFERENCES skillbridge.quiz_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES skillbridge.quiz_questions(id) ON DELETE CASCADE,
  answer_index int,
  answer_text text CHECK (char_length(answer_text) <= 2000),
  answered_at timestamptz NOT NULL DEFAULT now(),
  ai_score int,
  ai_feedback text,
  PRIMARY KEY (attempt_id, question_id)
);
CREATE TABLE IF NOT EXISTS skillbridge.quiz_integrity_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  attempt_id uuid NOT NULL REFERENCES skillbridge.quiz_attempts(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('no_face', 'multiple_faces', 'tab_hidden', 'app_background', 'fullscreen_exit', 'camera_lost', 'proctoring_unavailable', 'copy_paste')),
  at_ms int NOT NULL CHECK (at_ms >= 0),
  duration_ms int CHECK (duration_ms >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS quiz_attempts_quiz_idx ON skillbridge.quiz_attempts (quiz_id);
CREATE INDEX IF NOT EXISTS quiz_questions_quiz_idx ON skillbridge.quiz_questions (quiz_id);
CREATE INDEX IF NOT EXISTS quiz_integrity_events_attempt_idx ON skillbridge.quiz_integrity_events (attempt_id);
REVOKE ALL ON ALL TABLES IN SCHEMA skillbridge FROM PUBLIC;
COMMIT;
