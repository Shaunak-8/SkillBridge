'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui';
import type { StudentProfileDTO } from '@/types/student';

interface ApplicationProject {
  id: string;
  title: string;
}

/** `teamId` submits the application on behalf of that team (the leader's account applies; the API verifies it). */
export function ApplyFormComplex({ project, profile, teamId }: { project: ApplicationProject; profile: StudentProfileDTO; teamId?: string }) {
  const [step, setStep] = useState(1);
  const [pitch, setPitch] = useState('');
  const [answers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Validation
  const hasMissingProfile = !profile.displayName || !profile.educationLevel || !profile.skills || profile.skills.length === 0;

  if (hasMissingProfile) {
    return (
      <div className="rounded-xl border-2 border-[#111111] bg-[#F7F0D2] p-6 shadow-[4px_4px_0_#111111]">
        <h2 className="text-lg font-black text-[#151515] mb-2">Complete your profile before applying</h2>
        <ul className="space-y-1 mb-4 text-sm font-medium text-[#655F52]">
          <li>{profile.displayName ? '✓' : '✗'} Name</li>
          <li>{profile.educationLevel ? '✓' : '✗'} Education</li>
          <li>{profile.skills?.length > 0 ? '✓' : '✗'} Skills</li>
        </ul>
        <Link href="/student/profile">
          <Button className="w-full">Complete Profile</Button>
        </Link>
      </div>
    );
  }

  const submit = async () => {
    setBusy(true); setMsg(null);
    try {
      const payload = {
        cover_note: pitch || 'Applied',
        pitch,
        answers: Object.entries(answers).map(([q, a]) => ({ question_id: q, answer_text: a })),
        availability_hours: profile.availability?.hoursPerWeek,
        ...(teamId ? { team_id: teamId } : {}),
      };

      const res = await fetch(`/api/projects/${project.id}/applications`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(payload) 
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setStep(3);
      } else {
        setMsg({ ok: false, text: data?.error ?? "Could not send application." });
      }
    } catch { 
      setMsg({ ok: false, text: "Network error. Try again." }); 
    }
    setBusy(false);
  };

  if (step === 3) {
    return (
      <div className="rounded-xl border-2 border-[#111111] bg-[#dbf5ed] p-6 shadow-[4px_4px_0_#111111] text-center">
        <h2 className="text-xl font-black text-emerald-800 mb-2">Application submitted successfully.</h2>
        <p className="text-sm font-medium text-emerald-700 mb-6">The business will review your application.</p>
        <Link href="/student/applications">
          <Button>View My Applications</Button>
        </Link>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-black">Review Application</h2>
        <p className="text-sm text-muted">Once submitted, this business will be able to view the information included in this application.</p>
        
        <div className="rounded-xl border-2 border-[#111111] bg-white p-6 shadow-[4px_4px_0_#111111] space-y-4">
          <h3 className="font-bold text-lg border-b-2 border-line pb-2">Your Profile</h3>
          <p className="text-sm"><strong>Name:</strong> {profile.displayName}</p>
          <p className="text-sm"><strong>Education:</strong> {profile.educationLevel}</p>
          <p className="text-sm"><strong>Skills:</strong> {profile.skills?.join(', ')}</p>

          <h3 className="font-bold text-lg border-b-2 border-line pb-2 mt-6">Profile evidence</h3>
          <p className="text-sm">Your saved resume, portfolio, interests, goals, and availability will be shared from your student profile.</p>

          <h3 className="font-bold text-lg border-b-2 border-line pb-2 mt-6">Pitch</h3>
          <p className="text-sm whitespace-pre-wrap">{pitch}</p>
        </div>

        {msg && <p role="alert" className="text-xs font-bold text-[#D83D63]">{msg.text}</p>}

        <div className="flex justify-between mt-6">
          <Button type="button" onClick={() => setStep(1)} className="bg-gray-200 text-black border-line">Edit Application</Button>
          <Button type="button" onClick={submit} disabled={busy}>{busy ? 'Submitting...' : 'Submit Application'}</Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="space-y-8">
      <div className="rounded-xl border-2 border-[#111111] bg-white p-6 shadow-[4px_4px_0_#111111]">
        <h3 className="font-black text-lg mb-4">Your student profile</h3>
        <p className="text-sm text-muted">Your saved resume and portfolio are attached automatically. You only need to add a short project-specific pitch below.</p>
      </div>

      <div className="rounded-xl border-2 border-[#111111] bg-white p-6 shadow-[4px_4px_0_#111111]">
        <h3 className="font-black text-lg mb-4">Why are you a good fit for this project?</h3>
        <textarea
          required
          rows={5}
          value={pitch}
          onChange={(e) => setPitch(e.target.value)}
          placeholder="Briefly explain your relevant skills, experience, and why you want to work on this project."
          className="w-full rounded-xl border-2 border-[#111111] bg-white px-3.5 py-2.5 text-sm font-medium focus:bg-[#F7F0D2]/20 outline-none"
        />
      </div>
      
      {msg && <p role="alert" className="text-xs font-bold text-[#D83D63]">{msg.text}</p>}

      <div className="flex justify-end">
         <Button type="submit">
           Review Application
         </Button>
      </div>
    </form>
  );
}
