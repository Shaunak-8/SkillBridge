'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui';
import type { InvitableStudent } from '@/lib/teams/types';
import { teamRequest } from './api';

const SEARCH_DEBOUNCE_MS = 300;

/** Leader's teammate search: students who opted in and are free to join a team for this project. */
export function TeamInviteBox({ teamId, projectId, onInvited }: { teamId: string; projectId: string; onInvited: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<InvitableStudent[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const text = query.trim();
  const searching = text.length >= 2;
  const visibleResults = searching ? results : [];

  useEffect(() => {
    if (!searching) return;
    let stale = false;
    const timer = setTimeout(async () => {
      const result = await teamRequest<{ students: InvitableStudent[] }>(`/api/projects/${projectId}/teams/candidates?q=${encodeURIComponent(text)}`);
      if (stale) return;
      if (result.ok) { setResults(result.data.students); setMessage(null); }
      else setMessage({ ok: false, text: result.error });
    }, SEARCH_DEBOUNCE_MS);
    return () => { stale = true; clearTimeout(timer); };
  }, [searching, text, projectId]);

  async function invite(student: InvitableStudent) {
    setBusyId(student.id); setMessage(null);
    const result = await teamRequest(`/api/teams/${teamId}/invites`, { method: 'POST', body: JSON.stringify({ studentId: student.id }) });
    setBusyId(null);
    if (!result.ok) { setMessage({ ok: false, text: result.error }); return; }
    setMessage({ ok: true, text: `Invitation sent to ${student.name}. It stays open for 7 days.` });
    setResults(current => current.filter(item => item.id !== student.id));
    onInvited();
  }

  return (
    <section className="rounded-xl border-2 border-[#111111] bg-white p-5 shadow-[4px_4px_0_#111111]">
      <h3 className="mb-1 text-lg font-black">Invite teammates</h3>
      <p className="mb-3 text-sm text-[#655F52]">Search students who are open to teaming up. A team has 2 to 5 members including you.</p>
      <label htmlFor="teammate-search" className="sr-only">Search students by name</label>
      <input
        id="teammate-search" type="search" value={query} onChange={event => setQuery(event.target.value)} maxLength={60}
        placeholder="Search by name (at least 2 letters)" autoComplete="off"
        className="w-full rounded-xl border-2 border-[#111111] bg-white px-3.5 py-2.5 text-sm font-medium outline-none focus:bg-[#F7F0D2]/20"
      />
      {message && <p role={message.ok ? 'status' : 'alert'} className={`mt-2 text-xs font-bold ${message.ok ? 'text-emerald-700' : 'text-[#D83D63]'}`}>{message.text}</p>}
      {visibleResults.length > 0 && (
        <ul className="mt-3 space-y-2">
          {visibleResults.map(student => (
            <li key={student.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-[#111111] px-3 py-2">
              <span className="text-sm"><strong>{student.name}</strong>{student.skills.length > 0 && <span className="text-[#655F52]"> · {student.skills.join(', ')}</span>}</span>
              <Button type="button" variant="secondary" disabled={busyId === student.id} onClick={() => invite(student)}>
                {busyId === student.id ? 'Inviting…' : 'Invite'}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
