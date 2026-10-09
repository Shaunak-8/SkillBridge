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
      if (!response.ok) throw new Error(result.error?.message || 'Unable to save profile.');
      window.location.assign(result.redirect);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save profile.'); }
    finally { setBusy(false); }
  }
  return (
    <main className="grid min-h-screen place-items-center bg-cream px-5 py-12">
      <Card className="w-full max-w-lg p-8 bg-white border-2 border-[#111111] shadow-[6px_6px_0_#111111]">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="flex size-9 items-center justify-center rounded-xl border-2 border-[#111111] bg-[#D83D63] text-white font-black text-xs shadow-[2px_2px_0_#111111]">
            SB
          </div>
          <span className="text-xl font-black text-[#151515] tracking-tight">
            SkillBridge
          </span>
        </div>
        <h1 className="text-2xl font-black text-[#151515]">Find your place</h1>
        <p className="mt-1.5 text-xs font-medium text-[#655F52]">
          Choose how you will collaborate. Your role cannot be changed after setup.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-5">
          <label className="block text-xs font-black uppercase tracking-wider text-[#151515]">
            Username
            <Input
              name="username"
              defaultValue={/^[a-zA-Z0-9_]{3,30}$/.test(name) ? name : ''}
              required
              pattern="[a-zA-Z0-9_]{3,30}"
              className="mt-1.5"
            />
          </label>

          <label className="block text-xs font-black uppercase tracking-wider text-[#151515]">
            Full name
            <Input name="fullName" required maxLength={100} className="mt-1.5" />
          </label>

          <fieldset>
            <legend className="mb-2.5 text-xs font-black uppercase tracking-wider text-[#151515]">
              I am joining as a
            </legend>
            <div className="grid grid-cols-2 gap-3">
              {['student', 'business'].map((role) => (
                <label
                  key={role}
                  className="btn-press flex cursor-pointer items-center gap-3 rounded-xl border-2 border-[#111111] bg-white p-4 font-black capitalize text-xs text-[#151515] shadow-[2px_2px_0_#111111] hover:bg-[#F7F0D2] transition has-[:checked]:bg-[#F2BE4E] has-[:checked]:shadow-[3px_3px_0_#111111]"
                >
                  <input
                    type="radio"
                    name="role"
                    value={role}
                    required
                    className="size-4 accent-[#D83D63]"
                  />
                  {role}
                </label>
              ))}
            </div>
          </fieldset>

          {message && (
            <p
              role="status"
              aria-live="polite"
              className="text-xs font-bold text-[#D83D63] bg-[#FCE8ED] p-2.5 rounded-lg border border-[#D83D63]/30"
            >
              {message}
            </p>
          )}

          <Button className="w-full" disabled={busy}>
            {busy ? 'Saving…' : 'Open my workspace'}
          </Button>
        </form>
      </Card>
    </main>
  );
}

