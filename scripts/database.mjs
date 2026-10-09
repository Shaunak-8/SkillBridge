import nextEnv from '@next/env';
import { neon } from '@neondatabase/serverless';
import { readFileSync, readdirSync } from 'node:fs';

nextEnv.loadEnvConfig(process.cwd());
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing');
const sql = neon(process.env.DATABASE_URL);
try {
  const tables = await sql`SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog', 'information_schema') ORDER BY 1,2`;
  console.log('Existing tables:', tables);
  if (process.argv.includes('--migrate')) {
    // Additive, namespaced migration; Auth-managed tables are never changed.
    const dir = new URL('../migrations/', import.meta.url);
    for (const file of readdirSync(dir).filter(f => f.endsWith('.sql')).sort()) {
      const text = readFileSync(new URL(file, dir), 'utf8');
      const statements = text.split(';').map(s => s.trim()).filter(s => s && s !== 'BEGIN' && s !== 'COMMIT');
      await sql.transaction(statements.map(statement => sql.query(statement)));
      console.log(`Applied ${file} transactionally.`);
    }
  }
  console.log('Auth schema present:', tables.some(t => t.table_schema === 'neon_auth'));
} catch (error) {
  console.error('Database operation failed:', error.code || error.name);
  process.exitCode = 1;
}
