'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Card } from '@/components/ui';
import { closesLabel } from '@/components/quiz/business/format';
import { createStudentApi } from './api';
import { inviteState, minutesLabel, type MyQuiz } from './logic';

const LINK = 'mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl border-2 border-[#111111] bg-[#D83D63] px-4 text-base font-bold text-white shadow-[3px_3px_0_#111111] sm:w-auto sm:text-sm';

/** Presentational list, so it can be rendered without fetching. */
export function InviteList({ items }: { items: readonly MyQuiz[] }) {
  if (!items.length) return null;
  return <div className="mb-4 space-y-4" aria-label="Quiz invitations">
    {items.map((i) => {
      const state = inviteState(i);
      return <Card key={i.quizId + i.applicationId} variant="accent" className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2"><Badge tone="gold">AI quiz</Badge><Badge>Optional</Badge></div>
        <p className="mt-3 break-words text-base font-bold leading-6">The business invited you to an AI quiz for {i.projectTitle}</p>
        <p className="mt-1 text-sm text-muted">Closes {closesLabel(i.closesAt)} · {minutesLabel(i.timeLimitSeconds)} to answer</p>
        <p className="mt-1 text-sm text-muted">Optional. About {minutesLabel(i.timeLimitSeconds)}. Uses your camera for simple checks.</p>
        {state === 'submitted'
          ? <p className="mt-4"><Badge tone="green">Submitted</Badge></p>
          : <Link href={`/student/quiz/${i.quizId}`} className={LINK}>{state === 'resume' ? 'Resume' : 'Start quiz'}</Link>}
      </Card>;
    })}
  </div>;
}

/** Quiz invitations for the signed-in student. Shows nothing when there are none or the lookup fails (the list below still works). */
export function QuizInvites() {
  const [items, setItems] = useState<MyQuiz[]>([]);
  useEffect(() => {
    let live = true;
    createStudentApi().myQuizzes().then((r) => { if (live) setItems(r); }).catch(() => undefined);
    return () => { live = false; };
  }, []);
  return <InviteList items={items} />;
}
