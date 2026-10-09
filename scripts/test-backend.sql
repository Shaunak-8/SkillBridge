DO $$
DECLARE
  owner uuid;
  student uuid;
  project uuid;
  question uuid;
  answer_id uuid;
  suffix text := replace(gen_random_uuid()::text, '-', '');
BEGIN
  BEGIN
    INSERT INTO skillbridge.profiles(auth_user_id, username, email, role, onboarding_completed)
      VALUES ('test-business:' || suffix, 'b_' || left(suffix, 20), 'test@example.invalid', 'business', true) RETURNING id INTO owner;
    INSERT INTO skillbridge.profiles(auth_user_id, username, email, role, onboarding_completed)
      VALUES ('test-student:' || suffix, 's_' || left(suffix, 20), 'test@example.invalid', 'student', true) RETURNING id INTO student;
    INSERT INTO skillbridge.business_profiles(profile_id, business_name) VALUES (owner, 'Test business');
    INSERT INTO skillbridge.student_profiles(profile_id) VALUES (student) RETURNING id INTO student;
    INSERT INTO skillbridge.projects(owner_profile_id, title, summary, problem_statement, deliverables)
      VALUES (owner, 'Test project', 'Summary', 'Description', ARRAY['Website']) RETURNING id INTO project;
    BEGIN
      UPDATE skillbridge.projects SET status = 'published' WHERE id = project;
      RAISE EXCEPTION 'Unconfirmed project published';
    EXCEPTION WHEN check_violation THEN NULL; END;
    BEGIN
      INSERT INTO skillbridge.applications(project_id, student_id, cover_note) VALUES (project, student, 'Test application');
      RAISE EXCEPTION 'Draft accepted application';
    EXCEPTION WHEN check_violation THEN NULL; END;
    INSERT INTO skillbridge.project_questions(project_id, question) VALUES (project, 'What is the goal?') RETURNING id INTO question;
    BEGIN
      UPDATE skillbridge.projects SET owner_confirmed = true, confirmed_version = brief_version WHERE id = project;
      RAISE EXCEPTION 'Unanswered question accepted';
    EXCEPTION WHEN check_violation THEN NULL; END;
    INSERT INTO skillbridge.project_answers(question_id, project_id, answer) VALUES (question, project, 'Build a website');
    SELECT id INTO answer_id FROM skillbridge.project_answers WHERE question_id = question;
    IF NOT EXISTS (SELECT 1 FROM skillbridge.project_answers WHERE question_id = question AND business_user_id = owner AND id IS NOT NULL) THEN
      RAISE EXCEPTION 'Answer attribution failed';
    END IF;
    BEGIN
      UPDATE skillbridge.project_answers SET business_user_id = gen_random_uuid() WHERE question_id = question;
      RAISE EXCEPTION 'Forged answer ownership accepted';
    EXCEPTION WHEN check_violation THEN NULL; END;
    UPDATE skillbridge.projects SET owner_confirmed = true, confirmed_version = brief_version WHERE id = project;
    IF NOT EXISTS (SELECT 1 FROM skillbridge.projects WHERE id = project AND confirmed_at IS NOT NULL) THEN
      RAISE EXCEPTION 'Confirmation timestamp missing';
    END IF;
    UPDATE skillbridge.projects SET status = 'published' WHERE id = project;
    UPDATE skillbridge.projects SET title = 'Changed title' WHERE id = project;
    IF NOT EXISTS (SELECT 1 FROM skillbridge.projects WHERE id = project AND status = 'draft' AND NOT owner_confirmed AND confirmed_at IS NULL AND brief_version = 4) THEN
      RAISE EXCEPTION 'Material edit did not invalidate confirmation';
    END IF;
    UPDATE skillbridge.projects SET owner_confirmed = true, confirmed_version = brief_version WHERE id = project;
    UPDATE skillbridge.projects SET status = 'published' WHERE id = project;
    UPDATE skillbridge.project_answers SET answer = 'A revised website' WHERE question_id = question;
    IF NOT EXISTS (SELECT 1 FROM skillbridge.projects WHERE id = project AND status = 'draft' AND NOT owner_confirmed AND confirmed_at IS NULL AND brief_version = 5) THEN
      RAISE EXCEPTION 'Answer update did not invalidate confirmation';
    END IF;
    INSERT INTO skillbridge.project_answers(project_id, question_id, business_user_id, answer)
      SELECT q.project_id, q.id, owner, 'Upserted answer' FROM skillbridge.project_questions q
      JOIN skillbridge.projects p ON p.id = q.project_id
      WHERE q.project_id = project AND p.owner_profile_id = owner AND p.status IN ('draft', 'published') AND p.brief_version = 5
      ON CONFLICT(question_id) DO UPDATE SET answer = EXCLUDED.answer, business_user_id = EXCLUDED.business_user_id, updated_at = now();
    IF NOT EXISTS (SELECT 1 FROM skillbridge.project_answers WHERE question_id = question AND id = answer_id AND answer = 'Upserted answer') THEN
      RAISE EXCEPTION 'Answer upsert failed to preserve identity';
    END IF;
    UPDATE skillbridge.projects SET owner_confirmed = true, confirmed_version = brief_version WHERE id = project;
    UPDATE skillbridge.projects SET status = 'published' WHERE id = project;
    INSERT INTO skillbridge.applications(project_id, student_id, cover_note) VALUES (project, student, 'Test application');
    BEGIN
      INSERT INTO skillbridge.applications(project_id, student_id, cover_note) VALUES (project, student, 'Test application');
      RAISE EXCEPTION 'Duplicate application accepted';
    EXCEPTION WHEN unique_violation THEN NULL; END;
    BEGIN
      INSERT INTO skillbridge.student_portfolio_items(student_id, title, project_url) VALUES (gen_random_uuid(), 'Test', 'https://example.invalid');
      RAISE EXCEPTION 'Missing student accepted';
    EXCEPTION WHEN foreign_key_violation THEN NULL; END;
    UPDATE skillbridge.applications SET status = 'accepted' WHERE project_id = project;
    UPDATE skillbridge.projects SET status = 'in_progress' WHERE id = project;
    UPDATE skillbridge.projects SET status = 'completed' WHERE id = project;
    BEGIN
      UPDATE skillbridge.projects SET status = 'published' WHERE id = project;
      RAISE EXCEPTION 'Completed project reopened';
    EXCEPTION WHEN check_violation THEN NULL; END;
    IF abs(('[1,0,0]'::vector <=> '[1,0,0]'::vector)) > 0.000001 THEN RAISE EXCEPTION 'Vector search failed'; END IF;
    INSERT INTO skillbridge.knowledge_chunks(source_key, chunk_index, content, approved, embedding, embedding_model)
      VALUES ('test:' || suffix, 0, 'Approved guidance', true, '[1,0,0]', 'test-vector-3'),
      ('test:' || suffix, 1, 'Private guidance', false, '[1,0,0]', 'test-vector-3');
    IF (SELECT count(*) FROM skillbridge.knowledge_chunks WHERE source_key = 'test:' || suffix AND approved
        AND embedding_model = 'test-vector-3' AND (embedding <=> '[1,0,0]'::vector) < 0.001) <> 1 THEN
      RAISE EXCEPTION 'Approved knowledge vector retrieval failed';
    END IF;
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Rollback test fixtures';
  EXCEPTION WHEN SQLSTATE 'P0002' THEN NULL; END;
  IF EXISTS (SELECT 1 FROM skillbridge.profiles WHERE auth_user_id IN ('test-business:' || suffix, 'test-student:' || suffix)) THEN RAISE EXCEPTION 'Fixtures not rolled back'; END IF;
END $$;
