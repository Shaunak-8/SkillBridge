// Copies the MediaPipe wasm runtime into public/mediapipe/wasm so it is self-hosted.
// Idempotent, and never fails the install (postinstall).
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

try {
  const source = join(process.cwd(), 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
  const target = join(process.cwd(), 'public', 'mediapipe', 'wasm');
  if (existsSync(source)) {
    mkdirSync(target, { recursive: true });
    cpSync(source, target, { recursive: true, force: true });
    console.log('Copied MediaPipe wasm to public/mediapipe/wasm');
  } else {
    console.warn('MediaPipe wasm folder not found, skipping copy');
  }
} catch (error) {
  console.warn('MediaPipe asset copy skipped:', error instanceof Error ? error.message : error);
}
