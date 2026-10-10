'use client';
import { useState } from 'react';
import { Badge, Button, Card } from '@/components/ui';
import { closesLabel } from './format';
import { btnCls, ConfirmBox, mutedCls, Notice } from './parts';
import { QuizResults } from './QuizResults';
import { QuizReview, type Busy } from './QuizReview';
import type { QuestionPayload, QuizState } from './types';

export interface PanelActions {
  onGenerate: () => void; onRegenerate: () => void; onOpen: () => void; onClose: () => void;
  onSave: (patch: { timeLimitSeconds: number; questions: QuestionPayload[] }) => Promise<boolean>;
}
interface Props extends PanelActions { projectId: string; data: QuizState; busy: Busy; progress: string; error: string }

const Shell = ({ children }: { children: React.ReactNode }) => (
  <Card className="mb-6 p-4 sm:p-5"><div className="mb-3 flex flex-wrap items-center gap-2"><h2 className="text-xl font-black">AI quiz</h2><Badge tone="gold">Optional</Badge></div>{children}</Card>
);

/** All five panel states, driven purely by props so they can be rendered and tested without fetching. */
export function QuizPanelView({ projectId, data, busy, progress, error, ...act }: Props) {
  const [confirmClose, setConfirmClose] = useState(false);
  const { quiz } = data;
  const err = error ? <Notice tone="error">{error}</Notice> : null;

  if (!quiz && !data.eligible) return <Shell><p className={mutedCls}>AI quiz unlocks when more than {data.minApplicants} people apply. {data.applicantCount} applied so far.</p>{err}</Shell>;

  if (!quiz) return <Shell>
    <ul className={`${mutedCls} list-disc space-y-1 pl-5`}>
      <li>5 questions, made only from the problem you posted.</li>
      <li>Applicants take it on their own device with a camera check.</li>
      <li>It is one more signal. You still decide who moves forward.</li>
    </ul>
    <Button type="button" className={`${btnCls} mt-4`} disabled={busy === 'generate'} onClick={act.onGenerate}>{busy === 'generate' ? 'Generating…' : 'Generate AI quiz'}</Button>
    {busy === 'generate' && <Notice>{progress} This can take up to 15 seconds.</Notice>}
    {err}
  </Shell>;

  if (quiz.status === 'draft') return <Shell>
    <QuizReview key={quiz.questions.map((q) => q.id).join('|')} quiz={quiz} busy={busy} progress={progress} canOpen={data.eligible}
      onSave={act.onSave} onRegenerate={act.onRegenerate} onOpen={act.onOpen} />
    {err}
  </Shell>;

  const open = quiz.status === 'open';
  return <Shell>
    <div className="flex flex-wrap items-center gap-2"><Badge tone={open ? 'green' : 'default'}>{open ? 'Open to applicants' : 'Closed'}</Badge></div>
    <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
      <div><dt className="text-xs font-bold text-[#655F52]">{open ? 'Closes' : 'Closed on'}</dt><dd className="font-semibold">{closesLabel(quiz.closesAt)}</dd></div>
      <div><dt className="text-xs font-bold text-[#655F52]">Applicants</dt><dd className="font-semibold">{data.applicantCount}</dd></div>
      <div><dt className="text-xs font-bold text-[#655F52]">Time limit</dt><dd className="font-semibold">{quiz.timeLimitSeconds / 60} minutes</dd></div>
    </dl>
    {open && !confirmClose && <Button type="button" variant="secondary" className={`${btnCls} mt-4`} disabled={busy !== ''} onClick={() => setConfirmClose(true)}>Close quiz</Button>}
    {open && confirmClose && <ConfirmBox title="Close this quiz?" confirmLabel="Yes, close quiz" danger busy={busy === 'close'} onConfirm={() => { setConfirmClose(false); act.onClose(); }} onCancel={() => setConfirmClose(false)}>
      <p>Applicants will no longer be able to start it. Results already in stay here.</p>
    </ConfirmBox>}
    {err}
    <QuizResults projectId={projectId} />
  </Shell>;
}
