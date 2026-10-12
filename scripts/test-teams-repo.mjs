// Runs the opt-in teams repo integration test (real SQL against a throwaway schema, dropped afterwards).
// Env is loaded here because vitest runs with NODE_ENV=test, which makes Next skip .env.local.
import nextEnv from '@next/env';
import { spawnSync } from 'node:child_process';
nextEnv.loadEnvConfig(process.cwd());
const result = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', 'tests/teams-repo.integration.test.ts'], {
  stdio: 'inherit', env: { ...process.env, TEAMS_INTEGRATION: '1' },
});
process.exit(result.status ?? 1);
