'use client';
import { useState } from 'react';
import { authClient } from '@/lib/auth/client';
import { Button } from '@/components/ui';
import { endChatSession } from '@/lib/chat/lifecycle';
export function AccountControls() {
  const { data } = authClient.useSession();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function act(link: boolean) {
    setBusy(true); setMessage('');
    try {
      if (!link) await endChatSession().catch(() => undefined);
      const result = link ? await authClient.linkSocial({ provider: 'google', callbackURL: `${window.location.origin}/auth/continue` }) : await authClient.signOut();
      if (result.error) throw new Error(link ? 'Unable to link Google. Check your account settings.' : 'Unable to sign out. Please retry.');
      if (!link) window.location.replace('/login');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Please try again.'); }
    finally { setBusy(false); }
  }
  return <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold">{data?.user.name}</span><Button variant="ghost" disabled={busy} onClick={() => act(true)}>Link Google</Button><Button variant="secondary" disabled={busy} onClick={() => act(false)}>Log out</Button><span role="status" className="text-xs text-red-700">{message}</span></div>;
}
