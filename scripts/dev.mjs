import nextEnv from '@next/env';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

nextEnv.loadEnvConfig(process.cwd(), true);
const origin = new URL(process.env.APP_URL || 'https://localhost:3000');
const args = ['dev', '--port', origin.port || '3000', ...process.argv.slice(2)];
if (origin.protocol === 'https:') {
  const directory = resolve('.local-certificates');
  const key = resolve(directory, 'localhost-key.pem');
  const cert = resolve(directory, 'localhost.pem');
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const valid = existsSync(key) && existsSync(cert)
    && spawnSync('openssl', ['x509', '-in', cert, '-checkend', '86400', '-noout'], { stdio: 'ignore' }).status === 0;
  if (!valid) {
    process.umask(0o077);
    const generated = spawnSync('openssl', [
      'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '90',
      '-keyout', key, '-out', cert, '-subj', '/CN=localhost',
      '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1,IP:::1',
    ], { stdio: 'ignore' });
    if (generated.status !== 0) {
      console.error('Unable to generate the local HTTPS certificate. Install OpenSSL or provide .local-certificates/localhost.pem and localhost-key.pem.');
      process.exit(1);
    }
  }
  args.push('--experimental-https', '--experimental-https-key', key, '--experimental-https-cert', cert);
  console.log(`Open ${origin.origin}. Your browser may ask you to accept this local development certificate once.`);
} else {
  console.warn('HTTP development may prevent Safari from saving login cookies. Use APP_URL=https://localhost:3000 for cross-browser authentication.');
}
const child = spawn(process.execPath, [resolve('node_modules/next/dist/bin/next'), ...args], { stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', code => { process.exitCode = code ?? 0; });
