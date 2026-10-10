'use client';
import { Fragment, useEffect, useState } from 'react';
import { Button, Card } from '@/components/ui';
import { quizApi } from './api';
import {
  arrangeResults, durationLabel, integritySummary, MODE_HELP, modeLabel, scoreLabel, shortScoreLabel, statusLabel,
  type ResultFilter, type ResultSort,
} from './format';
import { btnCls, fieldCls, labelCls, mutedCls, Notice, StatusChip } from './parts';
import type { AttemptStatus, ProctoringMode, ResultItem } from './types';

const STATUS_TONE: Record<AttemptStatus, 'default' | 'green' | 'amber' | 'blue'> = { not_taken: 'default', in_progress: 'blue', submitted: 'green', expired: 'amber' };
const MODE_TONE: Record<ProctoringMode, 'default' | 'green' | 'amber'> = { full: 'green', limited: 'amber', none: 'default' };
export const ADVISORY_NOTE = 'Flags are advisory signals only. They can come from poor lighting, a phone call or a weak camera, and are never proof of cheating. You decide.';

export function IntegrityHelp() {
  return <details className="rounded-xl border-2 border-[#111111] bg-[#FDFBF7] px-3 py-1 text-sm">
    <summary className="flex min-h-11 cursor-pointer items-center font-bold">What do the flags mean?</summary>
    <p className="pb-3 leading-6">{ADVISORY_NOTE} A tab switch or a moment without a face in view is a prompt to look closer, not a verdict. Nothing here ranks applicants or removes anyone from your list.</p>
  </details>;
}

function Details({ item }: { item: ResultItem }) {
  const taken = item.status !== 'not_taken';
  return <div className="space-y-3 text-sm leading-6">
    {taken ? <>
      <div><p className="font-bold">Short answer</p><p className="whitespace-pre-line break-words">{item.shortAnswer?.trim() ? item.shortAnswer : 'No answer written.'}</p></div>
      <div><p className="font-bold">AI feedback on the short answer</p><p className="break-words">{item.shortFeedback ?? 'Not graded. Read the answer yourself.'}</p></div>
      {item.proctoringMode && <p className={mutedCls}>{MODE_HELP[item.proctoringMode]}</p>}
      <p className={mutedCls}>{ADVISORY_NOTE}</p>
    </> : <p className={mutedCls}>This applicant has not taken the quiz. The quiz is optional.</p>}
  </div>;
}

const Chips = ({ item }: { item: ResultItem }) => <>
  <StatusChip tone={STATUS_TONE[item.status]}>{statusLabel(item.status)}</StatusChip>
  {item.proctoringMode && <StatusChip tone={MODE_TONE[item.proctoringMode]}>Checks: {modeLabel(item.proctoringMode)}</StatusChip>}
</>;

const flagsText = (i: ResultItem) => (i.status === 'not_taken' ? '-' : integritySummary(i.integrity, i.proctoringMode));

function ResultCard({ item, open, onToggle }: { item: ResultItem; open: boolean; onToggle: () => void }) {
  return <Card className="p-4">
    <h4 className="break-words text-base font-bold">{item.displayName}</h4>
    <div className="mt-2 flex flex-wrap gap-2"><Chips item={item} /></div>
    {item.status !== 'not_taken' && <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
      <div><dt className="text-xs font-bold text-[#655F52]">Multiple choice</dt><dd className="font-semibold">{scoreLabel(item.mcqScore, item.mcqMax)}</dd></div>
      <div><dt className="text-xs font-bold text-[#655F52]">Short answer</dt><dd className="font-semibold">{shortScoreLabel(item)}</dd></div>
      <div><dt className="text-xs font-bold text-[#655F52]">Time taken</dt><dd className="font-semibold">{durationLabel(item.timeTakenSeconds)}</dd></div>
      <div className="col-span-2"><dt className="text-xs font-bold text-[#655F52]">Integrity signals (advisory)</dt><dd className="break-words font-semibold">{flagsText(item)}</dd></div>
    </dl>}
    <Button type="button" variant="secondary" className={`${btnCls} mt-3`} aria-expanded={open} onClick={onToggle}>{open ? 'Hide details' : 'Show answer and feedback'}</Button>
    {open && <div className="mt-3 border-t-2 border-[#111111]/20 pt-3"><Details item={item} /></div>}
  </Card>;
}

function ResultTable({ items, openId, onToggle }: { items: ResultItem[]; openId: string; onToggle: (id: string) => void }) {
  const th = 'px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-[#655F52]';
  return <Card className="overflow-hidden"><table className="w-full table-fixed text-sm">
    <thead className="border-b-2 border-[#111111] bg-[#FDFBF7]"><tr>
      <th className={`${th} w-[18%]`}>Applicant</th><th className={`${th} w-[16%]`}>Status</th><th className={`${th} w-[9%]`}>MCQ</th><th className={`${th} w-[11%]`}>Short</th>
      <th className={`${th} w-[9%]`}>Time</th><th className={th}>Integrity signals (advisory)</th><th className={`${th} w-[13%]`}><span className="sr-only">Details</span></th>
    </tr></thead>
    <tbody>{items.map((i) => <Fragment key={i.applicationId}>
      <tr className="border-t border-[#111111]/20 align-top">
        <td className="break-words px-3 py-2 font-bold">{i.displayName}</td>
        <td className="px-3 py-2"><div className="flex flex-wrap gap-1"><Chips item={i} /></div></td>
        <td className="px-3 py-2">{scoreLabel(i.mcqScore, i.mcqMax)}</td><td className="px-3 py-2">{shortScoreLabel(i)}</td>
        <td className="px-3 py-2">{durationLabel(i.timeTakenSeconds)}</td><td className="break-words px-3 py-2">{flagsText(i)}</td>
        <td className="px-3 py-2"><Button type="button" variant="secondary" className="min-h-11 px-3 text-sm" aria-expanded={openId === i.applicationId} onClick={() => onToggle(i.applicationId)}>{openId === i.applicationId ? 'Hide' : 'Details'}</Button></td>
      </tr>
      {openId === i.applicationId && <tr className="bg-[#FDFBF7]"><td colSpan={7} className="px-3 py-3"><Details item={i} /></td></tr>}
    </Fragment>)}</tbody>
  </table></Card>;
}

/** Pure view of the results (also what the tests render). Filter and sort are for convenience, never a ranking. */
export function QuizResultsView({ items }: { items: ResultItem[] }) {
  const [filter, setFilter] = useState<ResultFilter>('all');
  const [sort, setSort] = useState<ResultSort>('default');
  const [openId, setOpenId] = useState('');
  const shown = arrangeResults(items, filter, sort);
  const toggle = (id: string) => setOpenId((cur) => (cur === id ? '' : id));
  const submitted = items.filter((i) => i.status === 'submitted').length;
  return <div className="mt-6">
    <h3 className="text-lg font-black">Quiz results</h3>
    <p className={mutedCls}>{submitted} of {items.length} applicants submitted. The quiz is one optional signal. You make the final decision.</p>
    <div className="mt-3"><IntegrityHelp /></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <div><label htmlFor="quiz-filter" className={labelCls}>Show</label><select id="quiz-filter" className={fieldCls} value={filter} onChange={(e) => setFilter(e.target.value as ResultFilter)}>
        <option value="all">Everyone</option><option value="taken">Took the quiz</option><option value="not_taken">Not taken</option></select></div>
      <div><label htmlFor="quiz-sort" className={labelCls}>Order</label><select id="quiz-sort" className={fieldCls} value={sort} onChange={(e) => setSort(e.target.value as ResultSort)}>
        <option value="default">Latest submissions first</option><option value="score">Highest score first</option></select></div>
    </div>
    {shown.length === 0 ? <Notice>No applicants match this view.</Notice> : <>
      <div className="mt-4 space-y-4 md:hidden">{shown.map((i) => <ResultCard key={i.applicationId} item={i} open={openId === i.applicationId} onToggle={() => toggle(i.applicationId)} />)}</div>
      <div className="mt-4 hidden md:block"><ResultTable items={shown} openId={openId} onToggle={toggle} /></div>
    </>}
  </div>;
}

export function QuizResults({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<ResultItem[] | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    quizApi(projectId).results().then((r) => { if (live) { setItems(r); setError(''); } }).catch((e: unknown) => { if (live) setError(e instanceof Error ? e.message : 'Could not load results.'); });
    return () => { live = false; };
  }, [projectId, attempt]);
  if (error) return <div className="mt-6"><Notice tone="error">{error}</Notice><Button type="button" variant="secondary" className={`${btnCls} mt-3`} onClick={() => { setError(''); setAttempt((n) => n + 1); }}>Try again</Button></div>;
  if (!items) return <p role="status" className={`${mutedCls} mt-6`}>Loading results{'…'}</p>;
  return <QuizResultsView items={items} />;
}
