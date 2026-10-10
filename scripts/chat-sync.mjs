import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const watch = process.argv.includes('--watch');
async function sync() {
  if (process.env.NEXT_PUBLIC_ENABLE_CHAT !== 'true') { console.log('Messaging is disabled; no CometChat requests made.'); return; }
  if (!process.env.COMETCHAT_SYNC_SECRET) throw new Error('COMETCHAT_SYNC_SECRET is missing');
  const endpoint = new URL('/api/chat/sync', process.env.APP_URL || 'http://localhost:3000');
  const response = await fetch(endpoint, { method: 'POST', headers: { authorization: `Bearer ${process.env.COMETCHAT_SYNC_SECRET}` }, signal: AbortSignal.timeout(240000) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Chat sync failed (${response.status}, ${result.error?.code || 'UNKNOWN'}).`);
  console.log('Chat membership and token cleanup synchronized.');
}
do {
  const startedAt = Date.now();
  try { await sync(); } catch (error) { console.error(error.message); if (!watch) process.exitCode = 1; }
  // Keep a 30-second start cadence, not a 30-second pause after a slow sync.
  // Otherwise a 78-second sync plus that pause exceeds the 90-second heartbeat
  // window and blocks valid chat sessions despite a healthy running worker.
  if (watch) await new Promise(resolve => setTimeout(resolve, Math.max(1000, 30000 - (Date.now() - startedAt))));
} while (watch);
