import nextEnv from '@next/env';
import { neon } from '@neondatabase/serverless';
import { readFileSync, readdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { sqlStatements } from './sql-statements.mjs';
nextEnv.loadEnvConfig(process.cwd());
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing');
const sql = neon(process.env.DATABASE_URL);
// Applies every migration to a throwaway schema, runs the teams scenarios and rolls everything back,
// so shared data is never touched.
const schema = `sb_test_${randomBytes(6).toString('hex')}`;
const folder = new URL('../migrations/', import.meta.url);
const statements = readdirSync(folder).filter(name => /^\d+.*\.sql$/.test(name)).sort()
  .flatMap(name => sqlStatements(readFileSync(new URL(name, folder), 'utf8').replaceAll('skillbridge', schema)));
try {
  try {
    await sql.transaction([
      ...statements.map(statement => sql.query(statement)),
      sql.query(`ALTER TABLE ${schema}.projects VALIDATE CONSTRAINT projects_publish_ready`),
      sql.query(readFileSync(new URL('./test-teams.sql', import.meta.url), 'utf8').replaceAll('skillbridge', schema)),
      sql.query("DO $$ BEGIN RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Rollback clean-schema test'; END $$;"),
    ]);
    throw new Error('Teams test unexpectedly committed');
  } catch (error) {
    if (error.code !== 'P0002') throw error;
  }
  const [result] = await sql`SELECT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname = ${schema}) AS exists`;
  if (result.exists) throw new Error('Clean test schema was not rolled back');
  console.log('PASS: team invariants (size cap, leader rules, one team per project, task assignment, cascade) hold on a clean schema; rolled back.');
} catch (error) { console.error('Teams database tests failed:', error.code || error.name, error.message); process.exitCode = 1; }
