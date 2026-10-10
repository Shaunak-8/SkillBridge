'use client';

import { useState } from 'react';
import type { StudentResumeDTO } from '@/types/student';

export function ResumeSection({ initialResume }: { initialResume?: StudentResumeDTO }) {
  const [resume, setResume] = useState(initialResume);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMessage('');
    try {
      const form = new FormData();
      form.append('file', file);
      const response = await fetch('/api/student/resume', { method: 'POST', body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to upload resume.');
      setResume({
        id: result.resume.id,
        fileName: result.resume.file_name,
        fileUrl: result.resume.file_url,
        createdAt: result.resume.created_at,
      });
      setMessage('Resume saved to your profile.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to upload resume.');
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  }

  return (
    <section className="rounded-xl border-2 border-[#111111] bg-white p-6 shadow-[4px_4px_0_#111111]">
      <h2 className="font-black text-base text-[#151515]">Resume</h2>
      <p className="mt-1 text-xs font-medium text-[#655F52]">
        Add it once here. Businesses will receive the latest profile resume automatically with your applications.
      </p>
      {resume && (
        <p className="mt-3 rounded-lg bg-[#F7F0D2] p-3 text-xs font-bold text-[#151515]">
          Current resume: {resume.fileName}
        </p>
      )}
      <label className="mt-4 inline-flex cursor-pointer rounded-xl border-2 border-[#111111] bg-[#F2BE4E] px-4 py-2 text-xs font-black text-[#151515] shadow-[2px_2px_0_#111111]">
        {busy ? 'Uploading…' : resume ? 'Replace resume' : 'Upload resume'}
        <input type="file" accept=".pdf,.doc,.docx" onChange={upload} disabled={busy} className="sr-only" />
      </label>
      {message && <p className="mt-2 text-xs font-bold text-[#655F52]" role="status">{message}</p>}
    </section>
  );
}
