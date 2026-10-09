BEGIN;
-- Adapt WS-3's raw proposal to the existing namespaced/versioned schema.
-- question/position/answer are retained to preserve WS-6 callers and triggers.
ALTER TABLE skillbridge.projects ADD COLUMN confirmed_at timestamptz;
ALTER TABLE skillbridge.project_questions
  ADD COLUMN question_type text NOT NULL DEFAULT 'short_text' CHECK (question_type IN ('yes_no', 'short_text', 'multiple_choice')),
  ADD COLUMN options jsonb,
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(),
  ADD CONSTRAINT question_options_array CHECK (options IS NULL OR jsonb_typeof(options) = 'array');
ALTER TABLE skillbridge.project_answers
  ADD COLUMN id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  ADD COLUMN business_user_id uuid REFERENCES skillbridge.profiles(id),
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
-- Metadata backfill must not invalidate existing owner confirmations.
ALTER TABLE skillbridge.project_answers DISABLE TRIGGER invalidate_answer;
UPDATE skillbridge.project_answers a SET business_user_id = p.owner_profile_id
  FROM skillbridge.projects p WHERE p.id = a.project_id;
ALTER TABLE skillbridge.project_answers ENABLE TRIGGER invalidate_answer;
ALTER TABLE skillbridge.project_answers ALTER COLUMN business_user_id SET NOT NULL;

CREATE FUNCTION skillbridge.guard_verification_answer() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner uuid;
BEGIN
  SELECT owner_profile_id INTO owner FROM skillbridge.projects WHERE id = NEW.project_id FOR UPDATE;
  IF NEW.business_user_id IS NULL THEN NEW.business_user_id := owner; END IF;
  IF NEW.business_user_id IS DISTINCT FROM owner THEN
    RAISE EXCEPTION 'Only project owner can answer' USING ERRCODE = '23514';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER check_answer_owner BEFORE INSERT OR UPDATE ON skillbridge.project_answers
  FOR EACH ROW EXECUTE FUNCTION skillbridge.guard_verification_answer();

CREATE FUNCTION skillbridge.confirmation_timestamp() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT NEW.owner_confirmed THEN NEW.confirmed_at := NULL;
  ELSIF TG_OP = 'INSERT' THEN NEW.confirmed_at := now();
  ELSIF NOT OLD.owner_confirmed OR OLD.confirmed_version IS DISTINCT FROM NEW.confirmed_version THEN NEW.confirmed_at := now();
  ELSE NEW.confirmed_at := OLD.confirmed_at;
  END IF;
  RETURN NEW;
END $$;
-- Runs after guard_project so version invalidation clears the timestamp as well.
CREATE TRIGGER z_confirmation_timestamp BEFORE INSERT OR UPDATE ON skillbridge.projects
  FOR EACH ROW EXECUTE FUNCTION skillbridge.confirmation_timestamp();
REVOKE ALL ON ALL TABLES IN SCHEMA skillbridge FROM PUBLIC;
COMMIT;
