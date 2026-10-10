'use client';
import { useState } from 'react';
import { Badge, Button } from '@/components/ui';
import { QUIZ_OPEN_WINDOW_HOURS } from '@/lib/quiz/constants';
import { QuestionCard } from './QuestionCard';
import { btnCls, ConfirmBox, fieldCls, labelCls, mutedCls, Notice } from './parts';
import type { QuestionPayload, Quiz } from './types';
import { draftsFromQuiz, timeLimitChoices, toPayload, validateDrafts } from './validate';

export type Busy = '' | 'generate' | 'save' | 'open' | 'close';
interface Props {
  quiz: Quiz; busy: Busy; progress: string;
  /** Resolves true when the server accepted the save. */
  onSave: (patch: { timeLimitSeconds: number; questions: QuestionPayload[] }) => Promise<boolean>;
  onRegenerate: () => void; onOpen: () => void;
  /** False when the applicant count has dropped to 3 or fewer: the draft can be edited but not opened. */
  canOpen?: boolean;
}

/** What applicants will be told and shown, stated plainly before the business opens the quiz. */
export function OpenQuizSummary() {
  return <ul className="list-disc space-y-1 pl-5">
    <li>Applicants see a notice and must agree before they start.</li>
    <li>Their camera and tab-switch checks run during the quiz. No video or photos are recorded or sent.</li>
    <li>They have {QUIZ_OPEN_WINDOW_HOURS} hours to start, then the quiz closes.</li>
    <li>It is optional. Applicants who skip it are shown as "Not taken".</li>
    <li>The checks are advisory only. You make the final decision.</li>
  </ul>;
}

export function QuizReview({ quiz, busy, progress, onSave, onRegenerate, onOpen, canOpen = true }: Props) {
  const initial = draftsFromQuiz(quiz);
  const [drafts, setDrafts] = useState(initial);
  const [limit, setLimit] = useState(quiz.timeLimitSeconds);
  const [editing, setEditing] = useState<number[]>([]);
  const [confirm, setConfirm] = useState<'' | 'open' | 'regenerate'>('');
  const [saved, setSaved] = useState({ drafts: JSON.stringify(toPayload(initial)), limit: quiz.timeLimitSeconds });
  const check = validateDrafts(drafts);
  const dirty = JSON.stringify(toPayload(drafts)) !== saved.drafts || limit !== saved.limit;
  const working = busy !== '';

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2"><Badge tone="gold">AI-generated draft</Badge><Badge>Not visible to applicants yet</Badge></div>
      <p className={`${mutedCls} mt-2`}>Read every question. The AI picked the answers it thinks are right, but it can be wrong. Edit anything before you open the quiz.</p>
      <div className="mt-4"><label htmlFor="quiz-limit" className={labelCls}>Time limit</label>
        <select id="quiz-limit" className={fieldCls} value={limit} disabled={working} onChange={(e) => setLimit(Number(e.target.value))}>
          {timeLimitChoices().map((s) => <option key={s} value={s}>{s / 60} minutes</option>)}
        </select>
      </div>
      <div className="mt-4 space-y-4">{drafts.map((q, i) => (
        <QuestionCard key={quiz.questions[i]?.id ?? i} index={i} q={q} problems={check.byQuestion[i] ?? []} editing={editing.includes(i)}
          onToggleEdit={() => setEditing((e) => (e.includes(i) ? e.filter((x) => x !== i) : [...e, i]))}
          onChange={(next) => setDrafts((d) => d.map((x, j) => (j === i ? next : x)))} />
      ))}</div>
      {check.quizProblem && <Notice tone="error">{check.quizProblem}</Notice>}
      {dirty && <Notice>You have unsaved changes. Save them before opening the quiz.</Notice>}
      {!canOpen && <Notice>Fewer than 4 people have applied now, so this quiz cannot be opened until more apply.</Notice>}
      {busy === 'generate' && <Notice>{progress}</Notice>}

      {confirm === 'open' && <ConfirmBox title="Open this quiz to applicants?" confirmLabel="Yes, open quiz" busy={busy === 'open'} onConfirm={onOpen} onCancel={() => setConfirm('')}>
        <p className="mb-2 font-semibold">This is what applicants will see and be told:</p><OpenQuizSummary />
      </ConfirmBox>}
      {confirm === 'regenerate' && <ConfirmBox title="Write a new set of questions?" confirmLabel="Yes, regenerate" busy={busy === 'generate'} onConfirm={() => { setConfirm(''); onRegenerate(); }} onCancel={() => setConfirm('')}>
        <p>This replaces all 5 questions, including any edits you made. It takes up to 15 seconds.</p>
      </ConfirmBox>}

      <div className="sticky bottom-2 z-10 mt-5 flex flex-col gap-2 rounded-xl border-2 border-[#111111] bg-white p-3 shadow-[3px_3px_0_#111111] sm:flex-row sm:flex-wrap">
        <Button type="button" variant="secondary" className={btnCls} disabled={working || !dirty || !check.ok}
          onClick={async () => {
            const snapshot = { drafts: JSON.stringify(toPayload(drafts)), limit };
            if (await onSave({ timeLimitSeconds: limit, questions: toPayload(drafts) })) setSaved(snapshot);
          }}>{busy === 'save' ? 'Saving…' : 'Save changes'}</Button>
        <Button type="button" variant="secondary" className={btnCls} disabled={working} onClick={() => setConfirm('regenerate')}>Regenerate</Button>
        <Button type="button" variant="primary" className={btnCls} disabled={working || dirty || !check.ok || !canOpen} onClick={() => setConfirm('open')}>Open quiz to applicants</Button>
      </div>
    </div>
  );
}
