BEGIN;
-- Student teams for team projects (2-5 members), per-team task board and activity log.
-- Business rules that must hold even if application code has a bug are enforced here:
-- team size, one leader, one active team per student per project, task assignee membership.

CREATE TABLE IF NOT EXISTS skillbridge.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES skillbridge.projects(id),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 80),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 500),
  status text NOT NULL DEFAULT 'forming' CHECK (status IN ('forming', 'active', 'archived', 'disbanded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, project_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS teams_project_name_idx
  ON skillbridge.teams(project_id, lower(btrim(name))) WHERE status <> 'disbanded';

CREATE OR REPLACE FUNCTION skillbridge.teams_require_open_team_project() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM skillbridge.projects WHERE id = NEW.project_id AND mode = 'team' AND status = 'published') THEN
    RAISE EXCEPTION 'Teams can only be created on a published team project' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS teams_require_open_team_project ON skillbridge.teams;
CREATE TRIGGER teams_require_open_team_project BEFORE INSERT ON skillbridge.teams
  FOR EACH ROW EXECUTE FUNCTION skillbridge.teams_require_open_team_project();

-- A leader is a team_members row with role 'leader'; invitations are rows with status 'invited'.
CREATE TABLE IF NOT EXISTS skillbridge.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  project_id uuid NOT NULL,
  student_id uuid NOT NULL REFERENCES skillbridge.student_profiles(id),
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'member')),
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'declined', 'removed', 'left')),
  invited_by uuid REFERENCES skillbridge.student_profiles(id),
  invited_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  responded_at timestamptz,
  joined_at timestamptz,
  left_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (team_id, project_id) REFERENCES skillbridge.teams(id, project_id) ON DELETE CASCADE,
  UNIQUE (team_id, student_id),
  CHECK (role <> 'leader' OR status = 'active'),
  CHECK (status <> 'invited' OR expires_at IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS team_members_one_leader_idx
  ON skillbridge.team_members(team_id) WHERE role = 'leader' AND status = 'active';
CREATE UNIQUE INDEX IF NOT EXISTS team_members_one_active_per_project_idx
  ON skillbridge.team_members(project_id, student_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS team_members_student_idx ON skillbridge.team_members(student_id, status);
CREATE INDEX IF NOT EXISTS team_members_team_idx ON skillbridge.team_members(team_id, status);

-- Serialized per team (row lock on the team) so two concurrent invites or accepts cannot exceed 5.
-- Pending invites count towards the cap until they expire; expired invites cannot be accepted.
CREATE OR REPLACE FUNCTION skillbridge.team_members_enforce_rules() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  occupied integer;
BEGIN
  IF NEW.status IN ('invited', 'active') THEN
    PERFORM 1 FROM skillbridge.teams WHERE id = NEW.team_id FOR UPDATE;
    IF TG_OP = 'UPDATE' AND OLD.status = 'invited' AND NEW.status = 'active'
       AND OLD.expires_at IS NOT NULL AND OLD.expires_at <= now() THEN
      RAISE EXCEPTION 'The invitation has expired' USING ERRCODE = 'check_violation';
    END IF;
    SELECT count(*) INTO occupied FROM skillbridge.team_members m
      WHERE m.team_id = NEW.team_id AND m.id <> NEW.id
        AND (m.status = 'active' OR (m.status = 'invited' AND m.expires_at > now()));
    IF occupied >= 5 THEN
      RAISE EXCEPTION 'The team is full' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS team_members_enforce_rules ON skillbridge.team_members;
CREATE TRIGGER team_members_enforce_rules BEFORE INSERT OR UPDATE ON skillbridge.team_members
  FOR EACH ROW EXECUTE FUNCTION skillbridge.team_members_enforce_rules();

CREATE TABLE IF NOT EXISTS skillbridge.team_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES skillbridge.teams(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 2000),
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  assignee_id uuid REFERENCES skillbridge.student_profiles(id),
  created_by uuid NOT NULL REFERENCES skillbridge.student_profiles(id),
  due_date date,
  completed_at timestamptz,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS team_tasks_team_status_idx ON skillbridge.team_tasks(team_id, status);
CREATE INDEX IF NOT EXISTS team_tasks_assignee_idx ON skillbridge.team_tasks(team_id, assignee_id);

CREATE OR REPLACE FUNCTION skillbridge.team_tasks_enforce_rules() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.assignee_id IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.assignee_id IS DISTINCT FROM OLD.assignee_id) THEN
    IF NOT EXISTS (SELECT 1 FROM skillbridge.team_members
                   WHERE team_id = NEW.team_id AND student_id = NEW.assignee_id AND status = 'active') THEN
      RAISE EXCEPTION 'A task can only be assigned to an active team member' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  IF NEW.status = 'done' THEN
    NEW.completed_at := CASE WHEN TG_OP = 'UPDATE' AND OLD.status = 'done' THEN OLD.completed_at ELSE now() END;
  ELSE
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS team_tasks_enforce_rules ON skillbridge.team_tasks;
CREATE TRIGGER team_tasks_enforce_rules BEFORE INSERT OR UPDATE ON skillbridge.team_tasks
  FOR EACH ROW EXECUTE FUNCTION skillbridge.team_tasks_enforce_rules();

-- When a member leaves or is removed their open tasks become unassigned; finished work keeps its assignee.
CREATE OR REPLACE FUNCTION skillbridge.team_members_release_tasks() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE skillbridge.team_tasks SET assignee_id = NULL, version = version + 1, updated_at = now()
    WHERE team_id = NEW.team_id AND assignee_id = NEW.student_id AND status <> 'done';
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS team_members_release_tasks ON skillbridge.team_members;
CREATE TRIGGER team_members_release_tasks AFTER UPDATE OF status ON skillbridge.team_members
  FOR EACH ROW WHEN (OLD.status = 'active' AND NEW.status <> 'active')
  EXECUTE FUNCTION skillbridge.team_members_release_tasks();

CREATE TABLE IF NOT EXISTS skillbridge.team_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES skillbridge.teams(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES skillbridge.student_profiles(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (char_length(type) BETWEEN 1 AND 50),
  payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS team_events_team_idx ON skillbridge.team_events(team_id, created_at DESC);

-- A team applies through its leader: one application per team.
ALTER TABLE skillbridge.applications ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES skillbridge.teams(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS applications_team_idx ON skillbridge.applications(team_id) WHERE team_id IS NOT NULL;

REVOKE ALL ON skillbridge.teams, skillbridge.team_members, skillbridge.team_tasks, skillbridge.team_events FROM PUBLIC;
COMMIT;
