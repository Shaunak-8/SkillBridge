'use client';

import { useState } from 'react';
import { ApplyFormComplex } from '@/components/student/ApplyFormComplex';
import type { StudentProfileDTO } from '@/types/student';
import { TeamApplyPanel } from './TeamApplyPanel';

type Mode = 'solo' | 'team';

/**
 * Solo or team choice for a project that accepts teams. Both panels stay mounted (the inactive one is hidden) so a
 * team created in the team panel, or a half-written solo pitch, survives switching back and forth.
 */
export function ApplyModeTabs({ project, profile }: { project: { id: string; title: string }; profile: StudentProfileDTO }) {
  const [mode, setMode] = useState<Mode>('solo');
  const choice = (value: Mode, label: string) => (
    <button
      type="button" aria-pressed={mode === value} onClick={() => setMode(value)}
      className={`min-h-11 flex-1 rounded-lg border-2 border-[#111111] px-4 py-2 text-sm font-black transition ${
        mode === value ? 'bg-[#F2BE4E] shadow-[2px_2px_0_#111111]' : 'bg-white hover:bg-[#F7F0D2]'}`}
    >{label}</button>
  );
  return (
    <div>
      <div role="group" aria-label="How do you want to apply?" className="mb-6 flex gap-3">
        {choice('solo', 'Apply solo')}
        {choice('team', 'Apply as a team (2–5)')}
      </div>
      <div hidden={mode !== 'solo'}><ApplyFormComplex project={project} profile={profile} /></div>
      <div hidden={mode !== 'team'}><TeamApplyPanel project={project} profile={profile} initialTeam={null} /></div>
    </div>
  );
}
