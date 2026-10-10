'use client';
import { useEffect, useRef } from 'react';
import { authClient } from '@/lib/auth/client';
import { chatEnabled } from '@/lib/chat/config';
import { clearLocalChat } from '@/lib/chat/lifecycle';
/** Lightweight dashboard guard: no SDK import or initialization. */
export function ChatSessionGuard() {
  const { data, isPending } = authClient.useSession();
  const previous = useRef<string | undefined>(undefined);
  const userId = data?.user.id;
  useEffect(() => {
    if (!chatEnabled() || isPending) return;
    if (previous.current && previous.current !== userId || !userId) {
      void clearLocalChat(); window.dispatchEvent(new Event('skillbridge-chat-ended'));
    }
    previous.current = userId;
  }, [userId, isPending]);
  useEffect(() => {
    if (!chatEnabled()) return;
    function storage(event: StorageEvent) {
      if (event.key === 'skillbridge-chat-logout') { void clearLocalChat(); window.dispatchEvent(new Event('skillbridge-chat-ended')); }
    }
    window.addEventListener('storage', storage);
    return () => window.removeEventListener('storage', storage);
  }, []);
  return null;
}
