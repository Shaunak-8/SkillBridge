'use client';
import { useEffect, useRef, useState } from 'react';
import { CometChat } from '@cometchat/chat-sdk-javascript';
import { CometChatConversations, CometChatMessageHeader, CometChatMessageList, CometChatMessageComposer, CometChatProvider } from '@cometchat/chat-uikit-react';
import { Button } from '@/components/ui';
import { loginChat } from '@/lib/chat/sdk';
import { clearLocalChat } from '@/lib/chat/lifecycle';
import { authorizedEntity, type ChatSession } from '@/lib/chat/policy';
import { ChatLoading } from './Messages';
type Selection = { user: CometChat.User };
const empty = 'No conversations yet. Apply to a project to chat privately with its business.';
export default function ChatWindow({ initialPeerUid }: { initialPeerUid?: string }) {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [selected, setSelected] = useState<Selection | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const sessionRef = useRef<ChatSession | null>(null);
  const initialOpened = useRef(false);
  useEffect(() => {
    let active = true;
    let updating = false;
    const controller = new AbortController();
    async function refresh() {
      if (updating) return;
      updating = true;
      try {
        let response = await fetch('/api/chat/session', { method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: controller.signal });
        // Poll read-only readiness while the worker provisions new applicants.
        // Repeated token POSTs during a slow sync exhaust the login allowance.
        for (let retry = 0; response.status === 409 && retry < 40 && active; retry++) {
          await new Promise(resolve => setTimeout(resolve, 3000));
          if (!active) return;
          const readiness = await fetch('/api/chat/session', { credentials: 'same-origin', cache: 'no-store', signal: controller.signal });
          if (!readiness.ok) { response = readiness; break; }
          if (!(await readiness.json()).syncPending) response = await fetch('/api/chat/session', { method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: controller.signal });
        }
        if (!response.ok) {
          const details = await response.json().catch(() => ({}));
          throw new Error(details.error?.code === 'CHAT_NOT_CONFIGURED' ? 'Messaging is not configured for this environment.'
            : details.error?.code === 'CHAT_SYNC_REQUIRED' ? 'Messaging maintenance is offline. Please retry shortly.'
            : response.status === 401 || response.status === 403 ? 'Access denied. Sign in with an authorized student or business account.'
            : 'Unable to connect to messaging. Please retry.');
        }
        const data: ChatSession = await response.json();
        if (!active) return;
        await loginChat(data);
        if (!active) return;
        sessionRef.current = data;
        setSession(data); setError('');
        setSelected(selection => {
          if (!selection) return null;
          return authorizedEntity(data, selection.user.getUid(), 'user') ? selection : null;
        });
        if (!initialOpened.current && initialPeerUid && authorizedEntity(data, initialPeerUid, 'user')) {
          const user = await CometChat.getUser(initialPeerUid);
          if (active && sessionRef.current === data) { setSelected({ user }); initialOpened.current = true; }
        }
      } catch (error) {
        if (!active) return;
        sessionRef.current = null; setSession(null); setSelected(null); void clearLocalChat();
        setError(error instanceof Error ? error.message : 'Unable to connect to messaging. Please retry.');
      } finally { updating = false; }
    }
    function ended() { active = false; controller.abort(); sessionRef.current = null; setSession(null); setSelected(null); setError('Your messaging session has ended. Sign in again to continue.'); }
    window.addEventListener('skillbridge-chat-ended', ended);
    void refresh();
    const interval = window.setInterval(() => { if (active) void refresh(); }, 60000);
    return () => { active = false; controller.abort(); window.clearInterval(interval); window.removeEventListener('skillbridge-chat-ended', ended); };
  }, [attempt, initialPeerUid]);
  async function open(id: string) {
    const current = sessionRef.current;
    if (!current || !authorizedEntity(current, id, 'user')) { setError('Access denied.'); return; }
    try {
      const selection = { user: await CometChat.getUser(id) };
      if (sessionRef.current && authorizedEntity(sessionRef.current, id, 'user')) setSelected(selection);
    } catch { setError('Unable to open this conversation. Please retry.'); }
  }
  if (error) return <div role="alert" className="rounded-2xl border border-line bg-white p-8"><p>{error}</p><Button className="mt-4" onClick={() => { setError(''); setAttempt(value => value + 1); }}>Retry</Button></div>;
  if (!session) return <ChatLoading />;
  if (!session.people.length) return <div className="rounded-2xl border border-line bg-white p-8">{empty}</div>;
  return <CometChatProvider><div className="flex h-[70vh] min-h-[420px] min-w-0 overflow-hidden rounded-2xl border border-line bg-white">
    <aside className={`${selected ? 'hidden md:flex' : 'flex'} w-full min-w-0 flex-col border-r border-line md:w-80 md:shrink-0`}>
      <div className="max-h-48 shrink-0 overflow-y-auto border-b border-line p-3"><p className="mb-2 text-xs font-bold uppercase text-muted">Start a conversation</p>
        {session.people.map(person => <button key={person.uid} className="block w-full truncate rounded-lg p-2 text-left text-sm hover:bg-brand-soft" onClick={() => void open(person.uid)}>{person.name || 'Application contact'}</button>)}
      </div><div className="min-h-0 flex-1"><CometChatConversations hideDeleteConversation hidePinConversation showSearchBar={false} options={() => []}
        itemView={(conversation: CometChat.Conversation) => {
          const entity = conversation.getConversationWith();
          if (conversation.getConversationType() !== 'user') return null;
          return authorizedEntity(session, (entity as CometChat.User).getUid(), 'user') ? <CometChatConversations.Item conversation={conversation} options={() => []} hideDeleteButton /> : null;
        }}
        onItemClick={(conversation: CometChat.Conversation) => {
          const entity = conversation.getConversationWith();
          if (conversation.getConversationType() === 'user') void open((entity as CometChat.User).getUid());
        }} emptyView={<p className="p-4 text-sm text-muted">{empty}</p>} /></div>
    </aside>
    <div className={`${selected ? 'flex' : 'hidden md:flex'} min-w-0 flex-1 flex-col`}>
      {selected ? <><CometChatMessageHeader {...selected} hideVoiceCallButton hideVideoCallButton showSearchOption={false} hidePinnedMessagesOption onBack={() => setSelected(null)} />
        <div className="min-h-0 flex-1"><CometChatMessageList {...selected} hideMessagePrivatelyOption /></div>
        <CometChatMessageComposer {...selected} hideAIButton hideVoiceRecordingButton hideStickersButton hideLiveReaction allowedFileTypes={['image/jpeg', 'image/png', 'application/pdf', 'text/plain']} />
      </> : <p className="m-auto p-6 text-center text-sm text-muted">Choose a business or applicant to start messaging.</p>}
    </div>
  </div></CometChatProvider>;
}
