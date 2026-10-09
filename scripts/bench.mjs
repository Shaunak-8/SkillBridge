// Times key pages/APIs against a running server. Usage: node scripts/bench.mjs [label]
// Needs .env.test.local (STUDENT_*). Local test accounts only; never prints credentials.
import { readFileSync } from 'node:fs';

const base = process.env.BENCH_URL ?? 'http://localhost:3000';
const RUNS = 5;
const env = Object.fromEntries(readFileSync('.env.test.local', 'utf8').split(/\r?\n/).filter(Boolean).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));

const jar = new Map();
const absorb = r => r.headers.getSetCookie().forEach(c => { const p = c.split(';')[0], i = p.indexOf('='); jar.set(p.slice(0, i), p.slice(i + 1)); });
const cookie = () => [...jar].map(([k, v]) => `${k}=${v}`).join('; ');

async function time(path, withCookie) {
  const t0 = performance.now();
  const r = await fetch(base + path, { redirect: 'manual', headers: withCookie ? { cookie: cookie() } : {} });
  await r.arrayBuffer();
  if (withCookie) absorb(r);
  return { ms: performance.now() - t0, status: r.status };
}

async function measure(path, withCookie) {
  const first = await time(path, withCookie);
  const rest = [];
  for (let i = 0; i < RUNS; i++) rest.push((await time(path, withCookie)).ms);
  rest.sort((a, b) => a - b);
  return { first: first.ms, median: rest[Math.floor(rest.length / 2)], status: first.status };
}

const t0 = performance.now();
const login = await fetch(base + '/api/auth/sign-in/email', { method: 'POST', headers: { origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: env.STUDENT_EMAIL, password: env.STUDENT_PASSWORD }) });
absorb(login);
const loginMs = performance.now() - t0;

const rows = [];
for (const [label, path, auth] of [
  ['public  /projects (board)', '/projects', false],
  ['public  /api/projects/discover', '/api/projects/discover?pageSize=12', false],
  ['public  / (home)', '/', false],
  ['authed  /api/students/me', '/api/students/me', true],
  ['authed  /student/dashboard', '/student/dashboard', true],
  ['authed  /student/projects (recs)', '/student/projects', true],
  ['authed  /student/applications', '/student/applications', true],
]) rows.push([label, await measure(path, auth)]);

console.log(`\n== ${process.argv[2] ?? 'bench'} @ ${base} ==`);
console.log(`sign-in: ${loginMs.toFixed(0)} ms (status ${login.status})`);
console.log('path'.padEnd(36), 'first'.padStart(8), 'median'.padStart(8), 'status');
for (const [label, m] of rows) console.log(label.padEnd(36), `${m.first.toFixed(0)}ms`.padStart(8), `${m.median.toFixed(0)}ms`.padStart(8), String(m.status).padStart(6));
