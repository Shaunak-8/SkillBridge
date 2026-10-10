-- Executed by scripts/test-teams.mjs inside a transaction that is always rolled back.
-- Constraint triggers are DEFERRED until commit, so the test forces them with SET CONSTRAINTS where it matters.
DO $$
DECLARE
  suffix text := replace(gen_random_uuid()::text, '-', '');
  owner uuid;
  sid uuid;
  s uuid[] := '{}';
  i integer;
  team_project uuid;
  solo_project uuid;
  draft_project uuid;
  team_a uuid;
  team_b uuid;
  team_c uuid;
  team_d uuid;
  task_a uuid;
  task_b uuid;
  task_d uuid;
  affected integer;
BEGIN
  INSERT INTO skillbridge.profiles(auth_user_id, username, email, role, onboarding_completed)
    VALUES ('tt-business:' || suffix, 'tb_' || left(suffix, 20), 'test@example.invalid', 'business', true) RETURNING id INTO owner;
  INSERT INTO skillbridge.business_profiles(profile_id, business_name) VALUES (owner, 'Test business');
  FOR i IN 1..8 LOOP
    INSERT INTO skillbridge.profiles(auth_user_id, username, email, role, onboarding_completed)
      VALUES ('tt-student' || i || ':' || suffix, 'ts' || i || '_' || left(suffix, 18), 'test@example.invalid', 'student', true) RETURNING id INTO sid;
    INSERT INTO skillbridge.student_profiles(profile_id) VALUES (sid) RETURNING id INTO sid;
    s := s || sid;
  END LOOP;
  INSERT INTO skillbridge.projects(owner_profile_id, title, summary, problem_statement, deliverables, mode)
    VALUES (owner, 'Team project', 'Summary', 'Problem', ARRAY['Website'], 'team') RETURNING id INTO team_project;
  INSERT INTO skillbridge.projects(owner_profile_id, title, summary, problem_statement, deliverables, mode)
    VALUES (owner, 'Solo project', 'Summary', 'Problem', ARRAY['Website'], 'individual') RETURNING id INTO solo_project;
  INSERT INTO skillbridge.projects(owner_profile_id, title, summary, problem_statement, deliverables, mode)
    VALUES (owner, 'Draft project', 'Summary', 'Problem', ARRAY['Website'], 'team') RETURNING id INTO draft_project;
  UPDATE skillbridge.projects SET owner_confirmed = true, confirmed_version = brief_version WHERE id IN (team_project, solo_project);
  UPDATE skillbridge.projects SET status = 'published' WHERE id IN (team_project, solo_project);

  -- Teams may only be created on a published team-mode project.
  BEGIN
    INSERT INTO skillbridge.teams(project_id, name) VALUES (solo_project, 'Nope');
    RAISE EXCEPTION 'Team created on an individual project';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO skillbridge.teams(project_id, name) VALUES (draft_project, 'Nope');
    RAISE EXCEPTION 'Team created on an unpublished project';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO skillbridge.teams(project_id, name) VALUES (team_project, 'x');
    RAISE EXCEPTION 'One-character team name accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;

  -- A team created without a leader is rejected when constraints are checked.
  BEGIN
    INSERT INTO skillbridge.teams(project_id, name) VALUES (team_project, 'Leaderless');
    SET CONSTRAINTS ALL IMMEDIATE;
    RAISE EXCEPTION 'Team without a leader accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;

  INSERT INTO skillbridge.teams(project_id, name, description) VALUES (team_project, 'Alpha', 'First team') RETURNING id INTO team_a;
  INSERT INTO skillbridge.team_members(team_id, project_id, student_id, role, status, joined_at)
    VALUES (team_a, team_project, s[1], 'leader', 'active', now());

  BEGIN
    INSERT INTO skillbridge.teams(project_id, name) VALUES (team_project, 'alpha');
    RAISE EXCEPTION 'Duplicate team name (case-insensitive) accepted in one project';
  EXCEPTION WHEN unique_violation THEN NULL; END;

  -- Leader and invitation rules.
  BEGIN
    INSERT INTO skillbridge.team_members(team_id, project_id, student_id, role, status, expires_at)
      VALUES (team_a, team_project, s[2], 'leader', 'invited', now() + interval '7 days');
    RAISE EXCEPTION 'Invited leader accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO skillbridge.team_members(team_id, project_id, student_id, role, status, joined_at)
      VALUES (team_a, team_project, s[2], 'leader', 'active', now());
    RAISE EXCEPTION 'Second active leader accepted';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN
    INSERT INTO skillbridge.team_members(team_id, project_id, student_id, role, status, expires_at)
      VALUES (team_a, team_project, s[2], 'member', 'invited', NULL);
    RAISE EXCEPTION 'Invite without an expiry accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO skillbridge.team_members(team_id, project_id, student_id, role, status, joined_at)
      VALUES (team_a, team_project, s[2], 'member', 'active', now());
    RAISE EXCEPTION 'Member joined without an invitation';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO skillbridge.team_members(team_id, project_id, student_id, role, status, expires_at)
      VALUES (team_a, solo_project, s[2], 'member', 'invited', now() + interval '7 days');
    RAISE EXCEPTION 'Member row with a project different from the team accepted';
  EXCEPTION WHEN foreign_key_violation THEN NULL; END;

  -- Size cap counts active and pending members: leader + 4 invites = 5, the 6th is rejected.
  FOR i IN 2..5 LOOP
    INSERT INTO skillbridge.team_members(team_id, project_id, student_id, role, status, invited_by, expires_at)
      VALUES (team_a, team_project, s[i], 'member', 'invited', s[1], now() + interval '7 days');
  END LOOP;
  BEGIN
    INSERT INTO skillbridge.team_members(team_id, project_id, student_id, role, status, invited_by, expires_at)
      VALUES (team_a, team_project, s[6], 'member', 'invited', s[1], now() + interval '7 days');
    RAISE EXCEPTION 'Sixth team member accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  -- A declined invite frees its slot.
  UPDATE skillbridge.team_members SET status = 'declined', responded_at = now() WHERE team_id = team_a AND student_id = s[5];
  INSERT INTO skillbridge.team_members(team_id, project_id, student_id, role, status, invited_by, expires_at)
    VALUES (team_a, team_project, s[6], 'member', 'invited', s[1], now() + interval '7 days');
  -- A declined invitation cannot be turned into membership without a new invitation.
  BEGIN
    UPDATE skillbridge.team_members SET status = 'active', joined_at = now() WHERE team_id = team_a AND student_id = s[5];
    RAISE EXCEPTION 'Declined invite became membership';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE skillbridge.team_members SET student_id = s[8] WHERE team_id = team_a AND student_id = s[4];
    RAISE EXCEPTION 'Membership moved to another student';
  EXCEPTION WHEN check_violation THEN NULL; END;

  -- An expired invite cannot be accepted and does not occupy a slot.
  UPDATE skillbridge.team_members SET expires_at = now() - interval '1 minute' WHERE team_id = team_a AND student_id = s[6];
  BEGIN
    UPDATE skillbridge.team_members SET status = 'active', joined_at = now() WHERE team_id = team_a AND student_id = s[6];
    RAISE EXCEPTION 'Expired invite accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  INSERT INTO skillbridge.team_members(team_id, project_id, student_id, role, status, invited_by, expires_at)
    VALUES (team_a, team_project, s[7], 'member', 'invited', s[1], now() + interval '7 days');
  -- The team is full again (leader + 3 invites + s7), so refreshing the expired invite must not sneak a sixth in.
  BEGIN
    UPDATE skillbridge.team_members SET expires_at = now() + interval '7 days' WHERE team_id = team_a AND student_id = s[6];
    RAISE EXCEPTION 'Refreshing an expired invite exceeded the team size';
  EXCEPTION WHEN check_violation THEN NULL; END;

  -- Accepting makes a member active; one active team per student per project.
  UPDATE skillbridge.team_members SET status = 'active', joined_at = now(), responded_at = now() WHERE team_id = team_a AND student_id = s[2];
  UPDATE skillbridge.team_members SET status = 'active', joined_at = now(), responded_at = now() WHERE team_id = team_a AND student_id = s[3];
  INSERT INTO skillbridge.teams(project_id, name) VALUES (team_project, 'Beta') RETURNING id INTO team_b;
  INSERT INTO skillbridge.team_members(team_id, project_id, student_id, role, status, joined_at)
    VALUES (team_b, team_project, s[8], 'leader', 'active', now());
  -- Being invited to two teams at once is fine; being active in both is not (members or leaders).
  INSERT INTO skillbridge.team_members(team_id, project_id, student_id, role, status, invited_by, expires_at)
    VALUES (team_b, team_project, s[2], 'member', 'invited', s[8], now() + interval '7 days');
  INSERT INTO skillbridge.team_members(team_id, project_id, student_id, role, status, invited_by, expires_at)
    VALUES (team_b, team_project, s[1], 'member', 'invited', s[8], now() + interval '7 days');
  BEGIN
    UPDATE skillbridge.team_members SET status = 'active', joined_at = now() WHERE team_id = team_b AND student_id = s[2];
    RAISE EXCEPTION 'Student active in two teams of the same project';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN
    UPDATE skillbridge.team_members SET status = 'active', joined_at = now() WHERE team_id = team_b AND student_id = s[1];
    RAISE EXCEPTION 'A leader of one team became an active member of another team on the same project';
  EXCEPTION WHEN unique_violation THEN NULL; END;

  -- Team status machine.
  UPDATE skillbridge.teams SET status = 'active' WHERE id = team_a;
  BEGIN
    UPDATE skillbridge.teams SET status = 'forming' WHERE id = team_a;
    RAISE EXCEPTION 'Active team went back to forming';
  EXCEPTION WHEN check_violation THEN NULL; END;

  -- Tasks only exist on active teams.
  BEGIN
    INSERT INTO skillbridge.team_tasks(team_id, title, created_by) VALUES (team_b, 'Too early', s[8]);
    RAISE EXCEPTION 'Task created on a team that has not started';
  EXCEPTION WHEN check_violation THEN NULL; END;
  INSERT INTO skillbridge.team_tasks(team_id, title, created_by, assignee_id) VALUES (team_a, 'Design the logo', s[1], s[2]) RETURNING id INTO task_a;
  INSERT INTO skillbridge.team_tasks(team_id, title, created_by, assignee_id) VALUES (team_a, 'Write copy', s[1], s[3]) RETURNING id INTO task_b;
  BEGIN
    INSERT INTO skillbridge.team_tasks(team_id, title, created_by, assignee_id) VALUES (team_a, 'Bad assignee', s[1], s[4]);
    RAISE EXCEPTION 'Task assigned to a member who has only been invited';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO skillbridge.team_tasks(team_id, title, created_by, assignee_id) VALUES (team_a, 'Outsider', s[1], s[8]);
    RAISE EXCEPTION 'Task assigned to a student outside the team';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO skillbridge.team_tasks(team_id, title, created_by) VALUES (team_a, '   ', s[1]);
    RAISE EXCEPTION 'Blank task title accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO skillbridge.team_tasks(team_id, title, created_by, status) VALUES (team_a, 'Bad status', s[1], 'finished');
    RAISE EXCEPTION 'Unknown task status accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE skillbridge.team_tasks SET team_id = team_b WHERE id = task_a;
    RAISE EXCEPTION 'Task moved to another team';
  EXCEPTION WHEN check_violation THEN NULL; END;
  UPDATE skillbridge.team_tasks SET status = 'done' WHERE id = task_b;
  IF NOT EXISTS (SELECT 1 FROM skillbridge.team_tasks WHERE id = task_b AND completed_at IS NOT NULL) THEN
    RAISE EXCEPTION 'completed_at not set when a task is done';
  END IF;
  UPDATE skillbridge.team_tasks SET status = 'in_progress' WHERE id = task_b;
  IF NOT EXISTS (SELECT 1 FROM skillbridge.team_tasks WHERE id = task_b AND completed_at IS NULL) THEN
    RAISE EXCEPTION 'completed_at not cleared when a task is reopened';
  END IF;
  UPDATE skillbridge.team_tasks SET status = 'done' WHERE id = task_b;

  -- Removing a member unassigns their open tasks but keeps credit for finished ones.
  UPDATE skillbridge.team_members SET status = 'removed', left_at = now() WHERE team_id = team_a AND student_id = s[3];
  UPDATE skillbridge.team_members SET status = 'left', left_at = now() WHERE team_id = team_a AND student_id = s[2];
  IF NOT EXISTS (SELECT 1 FROM skillbridge.team_tasks WHERE id = task_a AND assignee_id IS NULL) THEN
    RAISE EXCEPTION 'Open task not unassigned after the member left';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM skillbridge.team_tasks WHERE id = task_b AND assignee_id = s[3] AND status = 'done') THEN
    RAISE EXCEPTION 'Finished task lost its assignee when the member was removed';
  END IF;
  -- A removed member cannot slip back in; they need a fresh invitation (an update of the same row).
  BEGIN
    UPDATE skillbridge.team_members SET status = 'active', joined_at = now() WHERE team_id = team_a AND student_id = s[3];
    RAISE EXCEPTION 'Removed member rejoined without an invitation';
  EXCEPTION WHEN check_violation THEN NULL; END;
  UPDATE skillbridge.team_members SET status = 'invited', expires_at = now() + interval '7 days', left_at = NULL, joined_at = NULL, responded_at = NULL
    WHERE team_id = team_a AND student_id = s[3];

  -- Leadership transfer is two ordered statements inside one transaction.
  UPDATE skillbridge.team_members SET status = 'active', joined_at = now(), responded_at = now() WHERE team_id = team_a AND student_id = s[7];
  BEGIN
    UPDATE skillbridge.team_members SET role = 'leader' WHERE team_id = team_a AND student_id = s[7];
    RAISE EXCEPTION 'Two leaders after promoting before demoting';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN
    UPDATE skillbridge.team_members SET role = 'member' WHERE team_id = team_a AND student_id = s[1];
    SET CONSTRAINTS ALL IMMEDIATE;
    RAISE EXCEPTION 'Team left without a leader';
  EXCEPTION WHEN check_violation THEN NULL; END;
  UPDATE skillbridge.team_members SET role = 'member' WHERE team_id = team_a AND student_id = s[1];
  UPDATE skillbridge.team_members SET role = 'leader' WHERE team_id = team_a AND student_id = s[7];
  SET CONSTRAINTS ALL IMMEDIATE;
  SET CONSTRAINTS ALL DEFERRED;
  SELECT count(*) INTO affected FROM skillbridge.team_members WHERE team_id = team_a AND role = 'leader' AND status = 'active';
  IF affected <> 1 THEN RAISE EXCEPTION 'Leadership transfer left % leaders', affected; END IF;
  BEGIN
    UPDATE skillbridge.team_members SET status = 'left' WHERE team_id = team_a AND student_id = s[7];
    RAISE EXCEPTION 'Leader left without transferring leadership';
  EXCEPTION WHEN check_violation THEN NULL; END;

  -- Team applications: only from the leader, for a team of 2-5 active members, on the team's own project.
  BEGIN
    INSERT INTO skillbridge.applications(project_id, student_id, cover_note, team_id) VALUES (team_project, s[1], 'Not the leader', team_a);
    RAISE EXCEPTION 'Team application from a non-leader accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO skillbridge.applications(project_id, student_id, cover_note, team_id) VALUES (team_project, s[8], 'One-person team', team_b);
    RAISE EXCEPTION 'Team application with a single member accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO skillbridge.applications(project_id, student_id, cover_note, team_id) VALUES (solo_project, s[7], 'Wrong project', team_a);
    RAISE EXCEPTION 'Team application on a different project than the team accepted';
  EXCEPTION WHEN foreign_key_violation THEN NULL; END;
  INSERT INTO skillbridge.applications(project_id, student_id, cover_note, team_id) VALUES (team_project, s[7], 'Team application', team_a);
  -- Nobody applies twice: a solo application blocks joining a team, and team members cannot apply solo.
  INSERT INTO skillbridge.applications(project_id, student_id, cover_note) VALUES (team_project, s[4], 'My own application');
  BEGIN
    UPDATE skillbridge.team_members SET status = 'active', joined_at = now() WHERE team_id = team_a AND student_id = s[4];
    RAISE EXCEPTION 'Student with their own application joined a team';
  EXCEPTION WHEN check_violation THEN NULL; END;
  UPDATE skillbridge.applications SET status = 'withdrawn' WHERE project_id = team_project AND student_id = s[4];
  UPDATE skillbridge.team_members SET status = 'active', joined_at = now() WHERE team_id = team_a AND student_id = s[4];
  BEGIN
    INSERT INTO skillbridge.applications(project_id, student_id, cover_note) VALUES (team_project, s[1], 'Solo while on a team');
    RAISE EXCEPTION 'Team member applied on their own';
  EXCEPTION WHEN check_violation OR unique_violation THEN NULL; END;

  -- Accepting a team application activates the team and drops pending invitations (the roster is final).
  UPDATE skillbridge.team_members SET status = 'active', joined_at = now(), responded_at = now() WHERE team_id = team_b AND student_id = s[2];
  INSERT INTO skillbridge.applications(project_id, student_id, cover_note, team_id) VALUES (team_project, s[8], 'Team B application', team_b);
  UPDATE skillbridge.applications SET status = 'accepted' WHERE team_id = team_b;
  IF NOT EXISTS (SELECT 1 FROM skillbridge.teams WHERE id = team_b AND status = 'active') THEN
    RAISE EXCEPTION 'Accepted application did not activate the team';
  END IF;
  IF EXISTS (SELECT 1 FROM skillbridge.team_members WHERE team_id = team_b AND status = 'invited') THEN
    RAISE EXCEPTION 'Pending invitations survived the acceptance';
  END IF;
  -- Declining or withdrawing disbands the team and frees every member.
  UPDATE skillbridge.applications SET status = 'declined' WHERE team_id = team_a;
  IF NOT EXISTS (SELECT 1 FROM skillbridge.teams WHERE id = team_a AND status = 'disbanded') THEN
    RAISE EXCEPTION 'Declined application did not disband the team';
  END IF;
  SELECT count(*) INTO affected FROM skillbridge.team_members WHERE team_id = team_a AND status IN ('invited', 'active');
  IF affected <> 0 THEN RAISE EXCEPTION 'Declined team still has % open memberships', affected; END IF;
  INSERT INTO skillbridge.applications(project_id, student_id, cover_note) VALUES (team_project, s[1], 'Free to apply again');
  BEGIN
    DELETE FROM skillbridge.teams WHERE id = team_a;
    RAISE EXCEPTION 'Team with an application was deleted';
  EXCEPTION WHEN foreign_key_violation THEN NULL; END;

  -- Disbanding releases everyone, so students can join other teams and nobody can be added afterwards.
  INSERT INTO skillbridge.teams(project_id, name) VALUES (team_project, 'Gamma') RETURNING id INTO team_c;
  INSERT INTO skillbridge.team_members(team_id, project_id, student_id, role, status, joined_at)
    VALUES (team_c, team_project, s[5], 'leader', 'active', now());
  INSERT INTO skillbridge.team_members(team_id, project_id, student_id, role, status, invited_by, expires_at)
    VALUES (team_c, team_project, s[6], 'member', 'invited', s[5], now() + interval '7 days');
  UPDATE skillbridge.teams SET status = 'disbanded' WHERE id = team_c;
  SELECT count(*) INTO affected FROM skillbridge.team_members WHERE team_id = team_c AND status IN ('invited', 'active');
  IF affected <> 0 THEN RAISE EXCEPTION 'Disbanded team still has % open memberships', affected; END IF;
  BEGIN
    INSERT INTO skillbridge.team_members(team_id, project_id, student_id, role, status, invited_by, expires_at)
      VALUES (team_c, team_project, s[4], 'member', 'invited', s[5], now() + interval '7 days');
    RAISE EXCEPTION 'Invited into a disbanded team';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE skillbridge.team_members SET status = 'invited', expires_at = now() + interval '7 days' WHERE team_id = team_c AND student_id = s[6];
    RAISE EXCEPTION 'Re-invited into a disbanded team';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE skillbridge.teams SET status = 'active' WHERE id = team_c;
    RAISE EXCEPTION 'Disbanded team was revived';
  EXCEPTION WHEN check_violation THEN NULL; END;
  SET CONSTRAINTS ALL IMMEDIATE;
  SET CONSTRAINTS ALL DEFERRED;

  -- A former member of a disbanded team can lead a new one; archived teams are read-only history.
  INSERT INTO skillbridge.teams(project_id, name) VALUES (team_project, 'Delta') RETURNING id INTO team_d;
  INSERT INTO skillbridge.team_members(team_id, project_id, student_id, role, status, joined_at)
    VALUES (team_d, team_project, s[5], 'leader', 'active', now());
  UPDATE skillbridge.teams SET status = 'active' WHERE id = team_d;
  INSERT INTO skillbridge.team_tasks(team_id, title, created_by, assignee_id) VALUES (team_d, 'Plan', s[5], s[5]) RETURNING id INTO task_d;
  INSERT INTO skillbridge.team_events(team_id, actor_id, type, payload) VALUES (team_d, s[5], 'task_created', '{"title":"x"}');
  UPDATE skillbridge.teams SET status = 'archived' WHERE id = team_d;
  BEGIN
    UPDATE skillbridge.team_tasks SET status = 'done' WHERE id = task_d;
    RAISE EXCEPTION 'Task changed on an archived team';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO skillbridge.team_tasks(team_id, title, created_by) VALUES (team_d, 'Late', s[5]);
    RAISE EXCEPTION 'Task created on an archived team';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO skillbridge.team_events(team_id, actor_id, type) VALUES (team_d, s[5], '');
    RAISE EXCEPTION 'Event without a type accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;

  -- Deleting a team (only possible without an application) cascades to its members, tasks and events.
  DELETE FROM skillbridge.teams WHERE id = team_d;
  SELECT (SELECT count(*) FROM skillbridge.team_members WHERE team_id = team_d)
       + (SELECT count(*) FROM skillbridge.team_tasks WHERE team_id = team_d)
       + (SELECT count(*) FROM skillbridge.team_events WHERE team_id = team_d) INTO affected;
  IF affected <> 0 THEN RAISE EXCEPTION 'Team delete left % orphan rows', affected; END IF;

  -- Every deferred leader check must pass for the final state.
  SET CONSTRAINTS ALL IMMEDIATE;
END $$;
