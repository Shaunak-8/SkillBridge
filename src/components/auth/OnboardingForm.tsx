'use client';
import { useState } from 'react';
import { Button, Card, Input } from '@/components/ui';

export function OnboardingForm({ name }: { name: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('');
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(data)) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      window.location.assign(result.redirect);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save profile.'); }
    finally { setBusy(false); }
  }
  return <main className="grid min-h-screen place-items-center bg-canvas px-5"><Card className="w-full max-w-lg p-8"><p className="font-bold text-brand">SkillBridge</p><h1 className="mt-5 text-2xl font-bold">Find your place</h1><p className="mt-2 text-sm text-muted">Choose how you will collaborate. Your role cannot be changed after setup.</p><form onSubmit={submit} className="mt-6 space-y-5">
    <label className="block text-sm font-semibold">Username<Input name="username" defaultValue={/^[a-zA-Z0-9_]{3,30}$/.test(name) ? name : ''} required pattern="[a-zA-Z0-9_]{3,30}" className="mt-2" /></label>
    <label className="block text-sm font-semibold">Full name<Input name="fullName" required maxLength={100} className="mt-2" /></label>
    <fieldset><legend className="mb-3 text-sm font-semibold">I am joining as a</legend><div className="grid grid-cols-2 gap-3">{['student', 'business'].map(role => <label key={role} className="flex cursor-pointer items-center gap-3 rounded-xl border border-line p-4 capitalize"><input type="radio" name="role" value={role} required />{role}</label>)}</div></fieldset>
    <p role="status" aria-live="polite" className="text-sm text-brand-dark">{message}</p><Button className="w-full" disabled={busy}>{busy ? 'Saving…' : 'Open my workspace'}</Button>
  </form></Card></main>;
}
