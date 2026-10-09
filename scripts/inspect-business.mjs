import nextEnv from '@next/env';
import { neon } from '@neondatabase/serverless';
nextEnv.loadEnvConfig(process.cwd());
const expected = {
  business_profiles: ['profile_id', 'business_name', 'business_type', 'location', 'preferred_language'],
  projects: ['id', 'owner_profile_id', 'title', 'summary', 'problem_statement', 'deliverables', 'required_skills', 'status', 'owner_confirmed', 'brief_version', 'confirmed_version', 'preferred_language', 'budget_label', 'mode', 'compensation', 'timeline', 'location_text', 'remote_ok', 'category', 'published_at', 'created_at', 'updated_at'],
  project_questions: ['id', 'project_id', 'question', 'required', 'position', 'question_type', 'options'],
  project_answers: ['id', 'question_id', 'project_id', 'answer', 'business_user_id'],
  applications: ['id', 'project_id'],
};
try {
  if (!process.env.DATABASE_URL) throw new Error('Missing configuration');
  const sql = neon(process.env.DATABASE_URL);
  const columns = await sql`SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='skillbridge'`;
  const missing = Object.entries(expected).flatMap(([table, names]) => names.filter(name => !columns.some(c => c.table_name === table && c.column_name === name)).map(name => `${table}.${name}`));
  if (missing.length) { console.error('Missing shared schema fields:', missing.join(', ')); process.exitCode = 1; }
  else console.log('All required business, project, verification, and application fields exist.');
  const guards = await sql`SELECT conname FROM pg_constraint WHERE connamespace='skillbridge'::regnamespace AND conname IN ('projects_confirmation_version','projects_publish_ready')`;
  const triggers = await sql`SELECT tgname FROM pg_trigger WHERE tgrelid='skillbridge.projects'::regclass AND NOT tgisinternal`;
  console.log('Publication constraints:', guards.map(g => g.conname).join(', '));
  console.log('Project triggers:', triggers.map(t => t.tgname).join(', '));
  if (guards.length !== 2 || !triggers.some(t => t.tgname === 'guard_project')) process.exitCode = 1;
} catch { console.error('Unable to inspect the shared schema. Check database configuration and connectivity.'); process.exitCode = 1; }
