BEGIN;
-- Student teams for team projects (2-5 members), per-team task board and activity log.
-- Rules that must hold even if application code has a bug are enforced here: team size, exactly one leader,
-- one active team per student per project, invitation-only joining, task assignee membership.
--
-- Concurrency notes for application code:
--  * Run under READ COMMITTED (the default). The size cap re-counts after taking the team row lock.
--  * Any transaction that touches members AND tasks should lock the team row first
--    (SELECT ... FROM teams WHERE id = $1 FOR NO KEY UPDATE) to keep lock order consistent.
--  * Leadership transfer = demote the old leader, then promote the new one, in ONE transaction. The "team needs a
--    leader" check is deferred to commit, so the transaction may pass through a leaderless state.
--  * Teams are never hard-deleted in normal operation: disband them (members are released) or archive them.

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
CREATE INDEX IF NOT EXISTS teams_project_idx ON skillbridge.teams(project_id);

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

-- forming -> active | archived | disbanded, active -> archived | disbanded; archived and disbanded are final.
CREATE OR REPLACE FUNCTION skillbridge.teams_guard_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.project_id <> OLD.project_id THEN
    RAISE EXCEPTION 'A team cannot move to another project' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.status <> OLD.status AND NOT (
       (OLD.status = 'forming' AND NEW.status IN ('active', 'archived', 'disbanded'))
    OR (OLD.status = 'active' AND NEW.status IN ('archived', 'disbanded'))) THEN
    RAISE EXCEPTION 'A % team cannot become %', OLD.status, NEW.status USING ERRCODE = 'check_violation';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS teams_guard_update ON skillbridge.teams;
CREATE TRIGGER teams_guard_update BEFORE UPDATE ON skillbridge.teams
  FOR EACH ROW EXECUTE FUNCTION skillbridge.teams_guard_update();

-- A leader is a team_members row with role 'leader'; invitations are rows with status 'invited'.
-- A re-invitation (after decline, leave or removal) is an UPDATE of the same row: the application must reset
-- expires_at, responded_at, joined_at and left_at.
CREATE TABLE IF NOT EXISTS skillbridge.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  project_id uuid NOT NULL,
  student_id uuid NOT NULL REFERENCES skillbridge.student_profiles(id),
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'member')),
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'declined', 'removed', 'left')),
  invited_by uuid REFERENCES skillbridge.student_profiles(id) ON DELETE SET NULL,
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
CREATE INDEX IF NOT EXISTS team_members_student_idx
  ON skillbridge.team_members(student_id) INCLUDE (team_id, role, status) WHERE status IN ('active', 'invited');
CREATE INDEX IF NOT EXISTS team_members_team_idx ON skillbridge.team_members(team_id, status);

-- Serialized per team (NO KEY UPDATE lock on the team row, which does not conflict with foreign-key checks from
-- tasks and events) so concurrent invites or accepts cannot exceed 5. Pending invites count towards the cap until
-- they expire. clock_timestamp() is used because now() is the transaction start, which may predate the lock wait.
CREATE OR REPLACE FUNCTION skillbridge.team_members_enforce_rules() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  team_status text;
  project_status text;
  occupied integer;
BEGIN
  IF TG_OP = 'UPDATE' AND (NEW.team_id <> OLD.team_id OR NEW.project_id <> OLD.project_id OR NEW.student_id <> OLD.student_id) THEN
    RAISE EXCEPTION 'A membership cannot be moved to another team or student' USING ERRCODE = 'check_violation';
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NOT ((NEW.status = 'invited' AND NEW.role = 'member') OR (NEW.status = 'active' AND NEW.role = 'leader')) THEN
      RAISE EXCEPTION 'New memberships must be invitations or the team leader' USING ERRCODE = 'check_violation';
    END IF;
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT ((OLD.status = 'invited' AND NEW.status IN ('active', 'declined', 'removed'))
         OR (OLD.status = 'active' AND NEW.status IN ('removed', 'left'))
         OR (OLD.status IN ('declined', 'left', 'removed') AND NEW.status = 'invited')) THEN
      RAISE EXCEPTION 'A % membership cannot become %', OLD.status, NEW.status USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- A change of expiry also counts: refreshing an expired invitation makes it occupy a slot again.
  IF NEW.status IN ('invited', 'active')
     AND (TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status OR NEW.expires_at IS DISTINCT FROM OLD.expires_at) THEN
    SELECT t.status, p.status INTO team_status, project_status
      FROM skillbridge.teams t JOIN skillbridge.projects p ON p.id = t.project_id
      WHERE t.id = NEW.team_id FOR NO KEY UPDATE OF t;
    IF team_status NOT IN ('forming', 'active') OR project_status NOT IN ('published', 'in_progress') THEN
      RAISE EXCEPTION 'This team is not open for new members' USING ERRCODE = 'check_violation';
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.status = 'invited' AND NEW.status = 'active'
       AND OLD.expires_at IS NOT NULL AND OLD.expires_at <= clock_timestamp() THEN
      RAISE EXCEPTION 'The invitation has expired' USING ERRCODE = 'check_violation';
    END IF;
    -- A student applies once per project: their own live application blocks joining (or leading) a team.
    IF NEW.status = 'active' AND EXISTS (SELECT 1 FROM skillbridge.applications a
         WHERE a.project_id = NEW.project_id AND a.student_id = NEW.student_id AND a.team_id IS NULL
           AND a.status NOT IN ('declined', 'withdrawn')) THEN
      RAISE EXCEPTION 'This student already applied to the project on their own' USING ERRCODE = 'check_violation';
    END IF;
    SELECT count(*) INTO occupied FROM skillbridge.team_members m
      WHERE m.team_id = NEW.team_id AND m.id <> NEW.id
        AND (m.status = 'active' OR (m.status = 'invited' AND m.expires_at > clock_timestamp()));
    IF occupied >= 5 THEN
      RAISE EXCEPTION 'The team is full' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS team_members_enforce_rules ON skillbridge.team_members;
CREATE TRIGGER team_members_enforce_rules BEFORE INSERT OR UPDATE ON skillbridge.team_members
  FOR EACH ROW EXECUTE FUNCTION skillbridge.team_members_enforce_rules();

-- Every forming or active team must have an active leader when the transaction commits (deferred so a
-- leadership transfer can demote and promote in two statements).
CREATE OR REPLACE FUNCTION skillbridge.team_requires_leader() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  tid uuid;
BEGIN
  IF TG_TABLE_NAME = 'teams' THEN tid := NEW.id;
  ELSIF TG_OP = 'DELETE' THEN tid := OLD.team_id;
  ELSE tid := NEW.team_id;
  END IF;
  IF EXISTS (SELECT 1 FROM skillbridge.teams t
             WHERE t.id = tid AND t.status IN ('forming', 'active')
               AND NOT EXISTS (SELECT 1 FROM skillbridge.team_members m
                               WHERE m.team_id = t.id AND m.role = 'leader' AND m.status = 'active')) THEN
    RAISE EXCEPTION 'A team needs an active leader' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS team_members_require_leader ON skillbridge.team_members;
CREATE CONSTRAINT TRIGGER team_members_require_leader AFTER INSERT OR UPDATE OR DELETE ON skillbridge.team_members
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION skillbridge.team_requires_leader();
DROP TRIGGER IF EXISTS teams_require_leader ON skillbridge.teams;
CREATE CONSTRAINT TRIGGER teams_require_leader AFTER INSERT OR UPDATE ON skillbridge.teams
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION skillbridge.team_requires_leader();

-- Disbanding releases everyone: members are removed (the leader becomes an ordinary former member) and pending
-- invitations are declined, so nobody stays blocked from joining another team on the project.
CREATE OR REPLACE FUNCTION skillbridge.teams_release_members() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE skillbridge.team_members
    SET role = 'member',
        status = CASE WHEN status = 'invited' THEN 'declined' ELSE 'removed' END,
        responded_at = CASE WHEN status = 'invited' THEN now() ELSE responded_at END,
        left_at = CASE WHEN status = 'active' THEN now() ELSE left_at END
    WHERE team_id = NEW.id AND status IN ('invited', 'active');
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS teams_release_members ON skillbridge.teams;
CREATE TRIGGER teams_release_members AFTER UPDATE OF status ON skillbridge.teams
  FOR EACH ROW WHEN (NEW.status = 'disbanded' AND OLD.status <> 'disbanded')
  EXECUTE FUNCTION skillbridge.teams_release_members();

CREATE TABLE IF NOT EXISTS skillbridge.team_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES skillbridge.teams(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 2000),
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  assignee_id uuid REFERENCES skillbridge.student_profiles(id) ON DELETE SET NULL,
  created_by uuid REFERENCES skillbridge.student_profiles(id) ON DELETE SET NULL,
  due_date date,
  completed_at timestamptz,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS team_tasks_team_status_idx ON skillbridge.team_tasks(team_id, status);
CREATE INDEX IF NOT EXISTS team_tasks_open_assignee_idx
  ON skillbridge.team_tasks(assignee_id) WHERE assignee_id IS NOT NULL AND status <> 'done';
CREATE INDEX IF NOT EXISTS team_tasks_team_assignee_idx ON skillbridge.team_tasks(team_id, assignee_id);

-- Tasks change only while the team is active. The assignee must be an active member: the member row is locked
-- FOR SHARE so a concurrent removal cannot slip in between the check and the commit. Application code bumps
-- version itself (UPDATE ... WHERE version = $expected SET version = version + 1) for optimistic concurrency.
CREATE OR REPLACE FUNCTION skillbridge.team_tasks_enforce_rules() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  team_status text;
  assigning boolean;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.team_id <> OLD.team_id THEN
    RAISE EXCEPTION 'A task cannot move to another team' USING ERRCODE = 'check_violation';
  END IF;
  assigning := NEW.assignee_id IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.assignee_id IS DISTINCT FROM OLD.assignee_id);
  IF TG_OP = 'INSERT' OR assigning OR NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT status INTO team_status FROM skillbridge.teams WHERE id = NEW.team_id;
    IF team_status IS DISTINCT FROM 'active' THEN
      RAISE EXCEPTION 'Tasks can only change while the team is active' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  IF assigning THEN
    PERFORM 1 FROM skillbridge.team_members
      WHERE team_id = NEW.team_id AND student_id = NEW.assignee_id AND status = 'active' FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'A task can only be assigned to an active team member' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  IF NEW.status = 'done' THEN
    NEW.completed_at := CASE WHEN TG_OP = 'UPDATE' AND OLD.status = 'done' THEN OLD.completed_at ELSE now() END;
  ELSE
    NEW.completed_at := NULL;
  END IF;
  IF TG_OP = 'UPDATE' THEN NEW.updated_at := now(); END IF;
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
-- Keyset pagination cursor is (created_at, id): created_at alone repeats within one transaction.
CREATE INDEX IF NOT EXISTS team_events_team_idx ON skillbridge.team_events(team_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS team_events_actor_idx ON skillbridge.team_events(actor_id) WHERE actor_id IS NOT NULL;

-- A team applies through its leader: one application per team, for the team's own project.
ALTER TABLE skillbridge.applications ADD COLUMN IF NOT EXISTS team_id uuid;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'applications_team_project_fkey' AND conrelid = 'skillbridge.applications'::regclass) THEN
    ALTER TABLE skillbridge.applications ADD CONSTRAINT applications_team_project_fkey
      FOREIGN KEY (team_id, project_id) REFERENCES skillbridge.teams(id, project_id);
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS applications_team_idx ON skillbridge.applications(team_id) WHERE team_id IS NOT NULL;

-- Only the active leader of a team of 2-5 active members can apply on its behalf.
CREATE OR REPLACE FUNCTION skillbridge.applications_validate_team() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  members integer;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.team_id IS NOT DISTINCT FROM NEW.team_id THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM skillbridge.team_members
                 WHERE team_id = NEW.team_id AND student_id = NEW.student_id AND role = 'leader' AND status = 'active') THEN
    RAISE EXCEPTION 'A team application must come from the team leader' USING ERRCODE = 'check_violation';
  END IF;
  SELECT count(*) INTO members FROM skillbridge.team_members WHERE team_id = NEW.team_id AND status = 'active';
  IF members < 2 OR members > 5 THEN
    RAISE EXCEPTION 'A team needs 2 to 5 members to apply' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS applications_validate_team ON skillbridge.applications;
CREATE TRIGGER applications_validate_team BEFORE INSERT OR UPDATE OF team_id ON skillbridge.applications
  FOR EACH ROW WHEN (NEW.team_id IS NOT NULL) EXECUTE FUNCTION skillbridge.applications_validate_team();

-- An active member of a forming or active team cannot also apply to that project on their own.
CREATE OR REPLACE FUNCTION skillbridge.applications_block_member_solo() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM skillbridge.team_members m JOIN skillbridge.teams t ON t.id = m.team_id
             WHERE m.project_id = NEW.project_id AND m.student_id = NEW.student_id AND m.status = 'active'
               AND t.status IN ('forming', 'active')) THEN
    RAISE EXCEPTION 'You are on a team for this project; apply through your team' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS applications_block_member_solo ON skillbridge.applications;
CREATE TRIGGER applications_block_member_solo BEFORE INSERT ON skillbridge.applications
  FOR EACH ROW WHEN (NEW.team_id IS NULL) EXECUTE FUNCTION skillbridge.applications_block_member_solo();

-- The business decision drives the team: acceptance activates it and freezes the roster as the business saw it
-- (pending invitations are declined); a declined or withdrawn application disbands it and frees every member.
CREATE OR REPLACE FUNCTION skillbridge.applications_sync_team() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'accepted' THEN
    UPDATE skillbridge.team_members SET status = 'declined', responded_at = now()
      WHERE team_id = NEW.team_id AND status = 'invited';
    UPDATE skillbridge.teams SET status = 'active' WHERE id = NEW.team_id AND status = 'forming';
  ELSIF NEW.status IN ('declined', 'withdrawn') THEN
    UPDATE skillbridge.teams SET status = 'disbanded' WHERE id = NEW.team_id AND status IN ('forming', 'active');
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS applications_sync_team ON skillbridge.applications;
CREATE TRIGGER applications_sync_team AFTER UPDATE OF status ON skillbridge.applications
  FOR EACH ROW WHEN (NEW.team_id IS NOT NULL AND NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION skillbridge.applications_sync_team();

REVOKE ALL ON skillbridge.teams, skillbridge.team_members, skillbridge.team_tasks, skillbridge.team_events FROM PUBLIC;
COMMIT;
