import nextEnv from '@next/env';
import { neon } from '@neondatabase/serverless';
import { randomBytes } from 'node:crypto';
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);
const suffix = randomBytes(8).toString('hex');
try {
  await sql.query(`DO $$
  DECLARE affected integer;
  BEGIN
    BEGIN
      INSERT INTO skillbridge.profiles(auth_user_id, username, email) VALUES ('test_${suffix}', 'test_${suffix}', 'test@example.invalid');
      BEGIN
        INSERT INTO skillbridge.profiles(auth_user_id, username, email) VALUES ('duplicate_${suffix}', 'test_${suffix}', 'test@example.invalid');
        RAISE EXCEPTION 'Duplicate username was accepted';
      EXCEPTION WHEN unique_violation THEN NULL;
      END;
      BEGIN
        INSERT INTO skillbridge.profiles(auth_user_id, username, email) VALUES ('id_${suffix}', 'other_${suffix}', 'test@example.invalid');
        INSERT INTO skillbridge.profiles(auth_user_id, username, email) VALUES ('id_${suffix}', 'third_${suffix}', 'test@example.invalid');
        RAISE EXCEPTION 'Duplicate auth id was accepted';
      EXCEPTION WHEN unique_violation THEN NULL;
      END;
      UPDATE skillbridge.profiles SET role='student', onboarding_completed=true WHERE auth_user_id='test_${suffix}' AND NOT onboarding_completed;
      GET DIAGNOSTICS affected = ROW_COUNT;
      IF affected <> 1 THEN RAISE EXCEPTION 'Initial onboarding failed'; END IF;
      UPDATE skillbridge.profiles SET role='business' WHERE auth_user_id='test_${suffix}' AND NOT onboarding_completed;
      GET DIAGNOSTICS affected = ROW_COUNT;
      IF affected <> 0 THEN RAISE EXCEPTION 'Completed role was overwritten'; END IF;
      BEGIN
        INSERT INTO skillbridge.profiles(auth_user_id, username, email, role) VALUES ('bad_${suffix}', 'bad_${suffix}', 'test@example.invalid', 'owner');
        RAISE EXCEPTION 'Invalid role accepted';
      EXCEPTION WHEN check_violation THEN NULL;
      END;
      RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='Rollback test fixtures';
    EXCEPTION WHEN SQLSTATE 'P0002' THEN NULL;
    END;
    IF EXISTS(SELECT 1 FROM skillbridge.profiles WHERE auth_user_id='test_${suffix}') THEN RAISE EXCEPTION 'Test data not rolled back'; END IF;
  END $$;`);
  console.log('PASS: duplicate username, unique auth ID, onboarding, immutable role, invalid role, fixture rollback.');
} catch (error) { console.error('Database tests failed:', error.code || error.name); process.exitCode = 1; }
