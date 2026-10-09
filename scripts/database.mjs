import nextEnv from '@next/env';
import { neon } from '@neondatabase/serverless';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { sqlStatements } from './sql-statements.mjs';

nextEnv.loadEnvConfig(process.cwd());
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing');
const connection = new URL(process.env.DATABASE_URL);
if (process.argv.includes('--migrate')) connection.hostname = connection.hostname.replace('-pooler.', '.');
const sql = neon(connection.toString());
try {
  const tables = await sql`SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog', 'information_schema') ORDER BY 1,2`;
  console.log('Existing tables:', tables);
  if (process.argv.includes('--details')) {
    console.log('Application columns:', await sql`SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default
      FROM information_schema.columns WHERE table_schema = 'skillbridge' ORDER BY table_name, ordinal_position`);
    console.log('Application constraints:', await sql`SELECT conrelid::regclass::text AS table_name, conname, pg_get_constraintdef(oid) AS definition
      FROM pg_constraint WHERE connamespace = 'skillbridge'::regnamespace ORDER BY conrelid, conname`);
    console.log('Application row counts:', await sql`SELECT relname, n_live_tup FROM pg_stat_user_tables WHERE schemaname = 'skillbridge'`);
    console.log('Extensions:', await sql`SELECT extname, extversion FROM pg_extension`);
  }
  if (process.argv.includes('--migrate')) {
    await sql`CREATE SCHEMA IF NOT EXISTS skillbridge`;
    await sql`CREATE TABLE IF NOT EXISTS skillbridge.schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`;
    const folder = new URL('../migrations/', import.meta.url);
    for (const name of readdirSync(folder).filter(name => /^\d+.*\.sql$/.test(name)).sort()) {
      const text = readFileSync(new URL(name, folder), 'utf8').replaceAll('\r\n', '\n'); // checksum must not depend on git autocrlf
      const checksum = createHash('sha256').update(text).digest('hex');
      const [applied] = await sql`SELECT checksum FROM skillbridge.schema_migrations WHERE name = ${name}`;
      if (applied) {
        if (applied.checksum !== checksum) throw new Error(`Applied migration changed: ${name}`);
        console.log(`Already applied: ${name}`);
        continue;
      }
      await sql.transaction([
        ...sqlStatements(text).map(statement => sql.query(statement)),
        sql`INSERT INTO skillbridge.schema_migrations(name, checksum) VALUES (${name}, ${checksum})`,
      ]);
      console.log(`Applied transactionally: ${name}`);
    }
  }
  console.log('Auth schema present:', tables.some(t => t.table_schema === 'neon_auth'));
} catch (error) {
  console.error('Database operation failed:', error.code || error.name, error.code ? error.message : 'Check connection and network access.');
  process.exitCode = 1;
}
