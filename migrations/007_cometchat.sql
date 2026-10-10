-- Messaging metadata only. CometChat, not Postgres, owns message history.
CREATE TABLE skillbridge.chat_users (
  profile_id uuid PRIMARY KEY,
  uid text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE skillbridge.chat_groups (
  project_id uuid PRIMARY KEY,
  guid text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Mapping tombstones intentionally survive source deletion so sync can revoke remote access.
CREATE TABLE skillbridge.chat_tokens (
  token_hash text PRIMARY KEY,
  profile_id uuid NOT NULL,
  session_id uuid NOT NULL,
  uid text NOT NULL,
  encrypted_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX chat_tokens_expiry_idx ON skillbridge.chat_tokens(expires_at);
CREATE INDEX chat_tokens_session_idx ON skillbridge.chat_tokens(session_id);
CREATE TABLE skillbridge.chat_sync_state (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  lock_id uuid,
  locked_until timestamptz,
  worker_at timestamptz,
  revision bigint NOT NULL DEFAULT 1,
  synced_revision bigint NOT NULL DEFAULT 0
);
INSERT INTO skillbridge.chat_sync_state(singleton) VALUES (true);
-- Durable invalidation, not remote calls. Approval still commits during an outage.
CREATE FUNCTION skillbridge.invalidate_chat_sync() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE skillbridge.chat_sync_state SET revision = revision + 1 WHERE singleton;
  RETURN NULL;
END;
$$;
CREATE TRIGGER chat_applications_changed AFTER INSERT OR UPDATE OR DELETE ON skillbridge.applications
  FOR EACH STATEMENT EXECUTE FUNCTION skillbridge.invalidate_chat_sync();
CREATE TRIGGER chat_projects_changed AFTER INSERT OR UPDATE OR DELETE ON skillbridge.projects
  FOR EACH STATEMENT EXECUTE FUNCTION skillbridge.invalidate_chat_sync();
CREATE TRIGGER chat_profiles_changed AFTER INSERT OR UPDATE OR DELETE ON skillbridge.profiles
  FOR EACH STATEMENT EXECUTE FUNCTION skillbridge.invalidate_chat_sync();
CREATE TRIGGER chat_students_changed AFTER INSERT OR UPDATE OR DELETE ON skillbridge.student_profiles
  FOR EACH STATEMENT EXECUTE FUNCTION skillbridge.invalidate_chat_sync();
REVOKE ALL ON skillbridge.chat_users, skillbridge.chat_groups, skillbridge.chat_tokens, skillbridge.chat_sync_state FROM PUBLIC;
