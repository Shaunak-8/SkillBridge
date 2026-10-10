'use client';
import dynamic from 'next/dynamic';
import { Component, type ReactNode } from 'react';
import { publicChatConfig } from '@/lib/chat/config';
import { Button } from '@/components/ui';
const ChatWindow = dynamic(() => import('./ChatWindow'), { ssr: false, loading: () => <ChatLoading /> });
class ChatBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <div role="alert" className="rounded-2xl border border-line bg-white p-8"><p>Unable to load messaging. Your other workspace features are still available.</p><Button className="mt-4" onClick={() => this.setState({ failed: false })}>Retry</Button></div> : this.props.children;
  }
}
export function ChatLoading() { return <div role="status" aria-live="polite" className="animate-pulse rounded-2xl border border-line bg-white p-8"><div className="mb-4 h-5 w-40 rounded bg-slate-100" /><div className="h-64 rounded bg-slate-50" /><p className="mt-4 text-sm text-muted">Loading messages…</p></div>; }
export function Messages({ initialPeerUid }: { initialPeerUid?: string }) {
  return <section><h1 className="mb-2 text-2xl font-bold">Messages</h1><p className="mb-5 text-sm text-muted">Private conversations between applicants and businesses. Chat becomes available after an application is submitted.</p>
    {publicChatConfig() ? <ChatBoundary><ChatWindow key={initialPeerUid || 'inbox'} initialPeerUid={initialPeerUid} /></ChatBoundary> : <div className="rounded-2xl border border-line bg-white p-8">Messaging is not configured for this environment.</div>}
  </section>;
}
