import nextEnv from '@next/env';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
nextEnv.loadEnvConfig(process.cwd());
const secrets = ['DATABASE_URL', 'NEON_AUTH_COOKIE_SECRET', 'GEMINI_API_KEY', 'LLM_API_KEY', 'OPENAI_API_KEY', 'EMBEDDING_API_KEY', 'COMETCHAT_API_KEY', 'COMETCHAT_SYNC_SECRET'].map(name => process.env[name]).filter(Boolean);
let count = 0;
function scan(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) scan(path);
    else if (entry.name.endsWith('.js')) {
      count++;
      const content = readFileSync(path, 'utf8');
      if (secrets.some(secret => content.includes(secret))) throw new Error('Server credential found in client output.');
    }
  }
}
scan('.next/static');
console.log(`Checked ${count} client JavaScript files: no configured server credentials found.`);
