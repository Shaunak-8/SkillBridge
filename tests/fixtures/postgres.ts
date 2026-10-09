import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
export const fixtureOwner = '00000000-0000-4000-8000-000000000001';
export async function fixtureDatabase() {
  const pg = new PGlite();
  await pg.exec(readFileSync('tests/fixtures/business-schema.sql','utf8'));
  await pg.exec(`ALTER TABLE skillbridge.projects ADD COLUMN confirmed_at timestamptz;
    ALTER TABLE skillbridge.project_answers ADD COLUMN id uuid DEFAULT gen_random_uuid(), ADD COLUMN business_user_id uuid, ADD COLUMN created_at timestamptz DEFAULT now();`);
  const shared = readFileSync('migrations/002_shared_backend.sql','utf8');
  await pg.exec(shared.slice(shared.indexOf('CREATE FUNCTION skillbridge.guard_project()'),shared.indexOf('CREATE TRIGGER guard_project')).replace('CREATE FUNCTION','CREATE OR REPLACE FUNCTION'));
  const begin = shared.indexOf('CREATE FUNCTION skillbridge.invalidate_verification()');
  const end = shared.indexOf('CREATE FUNCTION skillbridge.guard_application()',begin);
  await pg.exec(shared.slice(begin,end));
  const verification = readFileSync('migrations/003_guided_verification.sql','utf8');
  await pg.exec(verification.slice(verification.indexOf('CREATE FUNCTION skillbridge.guard_verification_answer()'),verification.indexOf('REVOKE ALL')));
  await pg.query('INSERT INTO skillbridge.profiles(id,role,full_name) VALUES($1,\'business\',\'Fixture owner\')',[fixtureOwner]);
  const sql = (parts: TemplateStringsArray,...values: unknown[]) => {
    const query = parts.reduce((s,p,i) => s+p+(i<values.length ? `$${i+1}` : ''),'');
    // Defer execution, matching Neon transaction's query objects.
    return { then: (resolve: (rows: Record<string,unknown>[]) => unknown, reject: (error: unknown) => unknown) => pg.query(query,values).then(result => resolve(result.rows as Record<string,unknown>[]),reject) };
  };
  sql.transaction = async (queries: ReturnType<typeof sql>[]) => {
    await pg.exec('BEGIN');
    try { const results=[]; for(const query of queries) results.push(await query); await pg.exec('COMMIT'); return results; }
    catch(error) { await pg.exec('ROLLBACK'); throw error; }
  };
  return { pg, sql };
}
