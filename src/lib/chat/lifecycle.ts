'use client';
import { chatEnabled } from './config';
let generation = 0;
let cleanup: (() => Promise<void>) | null = null;
export function chatGeneration() { return generation; }
export function registerChatCleanup(handler: () => Promise<void>) { cleanup = handler; }
export async function clearLocalChat() { generation++; await cleanup?.().catch(() => undefined); }
export async function endChatSession(broadcast = true) {
  if (!chatEnabled()) return;
  const clearing = clearLocalChat();
  if (broadcast) { try { localStorage.setItem('skillbridge-chat-logout', `${Date.now()}:${Math.random()}`); } catch { /* Storage can be unavailable in privacy mode. */ } }
  window.dispatchEvent(new Event('skillbridge-chat-ended'));
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      Promise.allSettled([clearing, fetch('/api/chat/logout', { method: 'POST', credentials: 'same-origin', keepalive: true, signal: AbortSignal.timeout(5000) })]),
      new Promise(resolve => { timeout = setTimeout(resolve, 5000); }),
    ]);
  } finally { clearTimeout(timeout); }
}
