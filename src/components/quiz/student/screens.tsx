'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Button, Card } from '@/components/ui';
import { mutedCls, Notice } from '@/components/quiz/business/parts';
import type { ProctorMode } from '@/lib/proctoring/types';
import { cn } from '@/lib/utils/cn';
import type { Question } from './controller';
import { ANSWER_MAX_CHARS, faceStatus, isAnswered, minutesLabel, STATUS_DOT, type FaceStatus } from './logic';

/** Presentational screens, driven by props. Mobile first: one column, 48px+ buttons, 16px text, safe-area padding. */

export const APPLICATIONS_HREF = '/student/applications';
const BTN = 'min-h-12 w-full text-base sm:w-auto sm:text-sm';
const LINK_BTN = 'inline-flex min-h-12 w-full items-center justify-center rounded-xl px-4 text-base font-bold text-[#151515] underline underline-offset-4 sm:w-auto sm:text-sm';
const H1 = 'text-2xl font-black leading-tight tracking-tight text-[#151515]';
const LIST = 'list-disc space-y-2 pl-5 text-base leading-7 text-[#151515]';

export const Panel = ({ children }: { children: React.ReactNode }) => <Card className="p-4 sm:p-6">{children}</Card>;
const NotNow = () => <Link href={APPLICATIONS_HREF} className={LINK_BTN}>Not now</Link>;

// ---- intro ----
export function IntroScreen({ projectTitle, timeLimitSeconds, resume, onBegin }: { projectTitle: string; timeLimitSeconds: number; resume: boolean; onBegin: () => void }) {
  return <Panel>
    <h1 className={H1}>{resume ? 'Welcome back' : 'AI quiz'}</h1>
    <p className="mt-1 break-words text-base font-semibold text-[#655F52]">{projectTitle}</p>
    <p className="mt-4 text-base leading-7">
      {resume
        ? 'Your quiz is still open. We will check your camera again, then you carry on where you left off. Your timer kept running.'
        : `Optional. About ${minutesLabel(timeLimitSeconds)}. Uses your camera for simple checks.`}
    </p>
    <div className="mt-6 flex flex-col gap-2 sm:flex-row">
      <Button type="button" className={BTN} onClick={onBegin}>{resume ? 'Continue quiz' : 'Get started'}</Button>
      {!resume && <NotNow />}
    </div>
  </Panel>;
}

// ---- in-app browser ----
export function InAppBrowserNotice({ url, copied, onCopy, onContinue }: { url: string; copied: boolean; onCopy: () => void; onContinue: () => void }) {
  return <Panel>
    <h1 className={H1}>Open this in Chrome or Safari</h1>
    <p className="mt-3 text-base leading-7">This link opened inside another app (e.g. WhatsApp or Instagram). The camera check often fails there. Open it in Chrome or Safari for the smoothest quiz.</p>
    <div className="mt-6 flex flex-col gap-2">
      <Button type="button" className={BTN} onClick={onCopy}>{copied ? 'Link copied' : 'Copy link'}</Button>
      <Button type="button" variant="secondary" className={BTN} onClick={onContinue}>Continue here</Button>
    </div>
    <p role="status" className={cn(mutedCls, 'mt-3')}>{copied ? 'Paste the link into Chrome or Safari.' : 'Not sure? You can continue here. Your camera may still work.'}</p>
    {url && <p className="mt-3 select-all break-all rounded-xl border-2 border-[#111111] bg-white p-3 text-sm">{url}</p>}
  </Panel>;
}

// ---- consent ----
export function ConsentScreen({ timeLimitSeconds, onAgree }: { timeLimitSeconds: number; onAgree: () => void }) {
  const [ticked, setTicked] = useState(false);
  const h = 'mt-5 text-sm font-black uppercase tracking-wide text-[#655F52]';
  return <Panel>
    <h1 className={H1}>Before you start</h1>
    <h2 className={h}>What is checked</h2>
    <ul className={LIST}>
      <li>A camera check that a face is in view. It runs on YOUR device.</li>
      <li>Whether you switch tabs or apps.</li>
    </ul>
    <h2 className={h}>What is not kept</h2>
    <ul className={LIST}>
      <li>Nothing is recorded or uploaded: no video or photos are kept.</li>
      <li>Only simple flags are saved, like &ldquo;tab hidden for 5s&rdquo;.</li>
    </ul>
    <h2 className={h}>Who sees it</h2>
    <ul className={LIST}>
      <li>The business sees your score and these flags.</li>
      <li>Flags are advisory. A person at the business makes the decision.</li>
    </ul>
    <h2 className={h}>Good to know</h2>
    <ul className={LIST}>
      <li>The quiz is optional.</li>
      <li>You can refuse the camera and still take it with &ldquo;limited checks&rdquo;. The business will see that.</li>
      <li>5 questions, {minutesLabel(timeLimitSeconds)} in total. One attempt.</li>
      <li>Questions come one at a time. You cannot go back.</li>
    </ul>
    <label className="mt-6 flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border-2 border-[#111111] bg-white p-3 text-base font-bold">
      <input type="checkbox" checked={ticked} onChange={(e) => setTicked(e.target.checked)} className="size-6 shrink-0 accent-[#D83D63]" />
      <span>I understand and agree</span>
    </label>
    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
      <Button type="button" className={BTN} disabled={!ticked} onClick={() => { if (ticked) onAgree(); }}>Continue</Button>
      <NotNow />
    </div>
  </Panel>;
}

// ---- camera check ----
const FACE_TEXT: Record<FaceStatus, string> = {
  looking: 'Looking for your face…',
  one: 'Camera is on and we can see you. You are ready.',
  none: 'We cannot see a face yet.',
  many: 'More than one person is in view. Please make sure only you are in frame.',
  limited: 'Face check is not available on this device, so we will only note tab and app switches. You can still take the quiz.',
};
const FACE_TIPS = ['Face the light, with the light in front of you.', 'Hold your phone steady, or prop it up.', 'Make sure only you are in the frame.'];

export function cameraProblemText(code: string | null): string {
  if (code === 'NotAllowedError' || code === 'PermissionDeniedError' || code === 'SecurityError') return 'Camera permission was not given.';
  if (code === 'camera-unsupported') return 'This browser cannot use the camera here.';
  return 'We could not start the camera.';
}

export interface CameraCheckProps {
  camera: 'idle' | 'asking' | 'ready' | 'denied'; mode: ProctorMode | null; facesNow: number | null; errorCode: string | null;
  resume: boolean; busy: boolean; error: string; canFullscreen: boolean; isFullscreen: boolean;
  onTryAgain: () => void; onStart: () => void; onWithoutCamera: () => void; onFullscreen: () => void;
}

export function CameraCheckView(p: CameraCheckProps) {
  const face = faceStatus(p.mode ?? 'limited', p.facesNow);
  return <Panel>
    <h1 className={H1}>Camera check</h1>
    {(p.camera === 'asking' || p.camera === 'idle') && <p role="status" className="mt-3 text-base leading-7">Asking for camera permission. Tap Allow when your browser asks. The picture stays on your device.</p>}
    {p.camera === 'ready' && <div role="status" className="mt-3 text-base leading-7">
      <p className="font-semibold">{FACE_TEXT[face]}</p>
      {face === 'none' && <ul className={cn(LIST, 'mt-2')}>{FACE_TIPS.map((t) => <li key={t}>{t}</li>)}</ul>}
      <p className={cn(mutedCls, 'mt-2')}>{p.resume ? 'Your timer is already running.' : 'Your timer starts when you tap Start quiz.'}</p>
    </div>}
    {p.camera === 'denied' && <div role="status" className="mt-3 text-base leading-7">
      <p className="font-semibold">{cameraProblemText(p.errorCode)}</p>
      <p className={cn(mutedCls, 'mt-1')}>You can try again, or take the quiz without the camera. The business will see that it ran with limited checks.</p>
    </div>}
    {p.error && <Notice tone="error">{p.error}</Notice>}
    <div className="mt-5 flex flex-col gap-2 sm:flex-row">
      {p.camera === 'ready' && <Button type="button" className={BTN} disabled={p.busy} onClick={p.onStart}>{p.busy ? 'Starting…' : p.resume ? 'Resume quiz' : 'Start quiz'}</Button>}
      {p.camera === 'denied' && <>
        <Button type="button" className={BTN} disabled={p.busy} onClick={p.onTryAgain}>Try again</Button>
        <Button type="button" variant="secondary" className={BTN} disabled={p.busy} onClick={p.onWithoutCamera}>{p.busy ? 'Starting…' : 'Continue without camera (limited checks)'}</Button>
      </>}
      {p.canFullscreen && !p.isFullscreen && p.camera !== 'asking' && <Button type="button" variant="ghost" className={BTN} onClick={p.onFullscreen}>Enter fullscreen (optional)</Button>}
    </div>
  </Panel>;
}

// ---- running ----
export function CountdownBadge({ ms, label }: { ms: number; label: string }) {
  const amber = ms < 60_000;
  return <span role="timer" aria-label="Time left" className={cn('inline-flex min-h-11 min-w-[5.5rem] items-center justify-center rounded-xl border-2 border-[#111111] px-3 text-xl font-black tabular-nums', amber ? 'bg-[#F2BE4E] text-[#151515]' : 'bg-white text-[#151515]')}>{label}</span>;
}

export interface HeaderProps {
  position: number; total: number; remainingMs: number; timerLabel: string; mode: ProctorMode;
  showPreviewToggle: boolean; previewShown: boolean; onTogglePreview: () => void;
}

export function RunnerHeader(p: HeaderProps) {
  const dot = p.mode === 'full' ? 'bg-[#137333]' : p.mode === 'limited' ? 'bg-[#F2BE4E]' : 'bg-[#655F52]';
  return <header className="sticky top-0 z-20 border-b-2 border-[#111111] bg-canvas px-4 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
    <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-3">
      <p className="text-lg font-black">Question {p.position} of {p.total}</p>
      <CountdownBadge ms={p.remainingMs} label={p.timerLabel} />
    </div>
    <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-3">
      <p className="flex items-center gap-2 text-sm font-semibold text-[#151515]"><span aria-hidden className={cn('size-3 rounded-full border border-[#111111]', dot)} />{STATUS_DOT[p.mode]}</p>
      {p.showPreviewToggle && <button type="button" onClick={p.onTogglePreview} className="min-h-11 px-2 text-sm font-bold underline underline-offset-4">{p.previewShown ? 'Hide preview' : 'Show preview'}</button>}
    </div>
  </header>;
}

export interface QuestionViewProps {
  question: Question; selected: number | null; text: string; busy: boolean; submitting: boolean; error: string;
  onSelect: (index: number) => void; onText: (text: string) => void; onNext: () => void;
}

export function QuestionView({ question: q, selected, text, busy, submitting, error, onSelect, onText, onNext }: QuestionViewProps) {
  const last = q.position === q.total;
  const ready = isAnswered(q.kind, selected, text);
  return <>
    <Card className="p-4 sm:p-6">
      <h1 className="whitespace-pre-line break-words text-xl font-bold leading-8 text-[#151515]">{q.prompt}</h1>
      {q.kind === 'mcq' ? (
        <div role="radiogroup" aria-label="Answer options" className="mt-5 space-y-3">
          {(q.options ?? []).map((option, i) => (
            <label key={i} className={cn('flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border-2 border-[#111111] p-3 text-base leading-6', selected === i ? 'bg-[#FCE8ED] font-bold shadow-[3px_3px_0_#111111]' : 'bg-white')}>
              <input type="radio" name={`q-${q.questionId}`} checked={selected === i} onChange={() => onSelect(i)} disabled={busy} className="size-6 shrink-0 accent-[#D83D63]" />
              <span className="min-w-0 break-words">{option}</span>
            </label>
          ))}
        </div>
      ) : (
        <div className="mt-5">
          <label htmlFor="short-answer" className="mb-1 block text-sm font-bold">Your answer</label>
          <textarea id="short-answer" rows={6} maxLength={ANSWER_MAX_CHARS} value={text} disabled={busy} onChange={(e) => onText(e.target.value)}
            className="block w-full resize-none rounded-xl border-2 border-[#111111] bg-white p-3 text-base leading-6 text-[#151515] outline-none focus:shadow-[3px_3px_0_#111111]" />
          <p className="mt-1 text-right text-sm tabular-nums text-[#655F52]">{text.length}/{ANSWER_MAX_CHARS}</p>
        </div>
      )}
    </Card>
    {error && <Notice tone="error">{error}</Notice>}
    {submitting && <Notice>Submitting your answers…</Notice>}
    <div className="sticky bottom-0 -mx-4 mt-4 border-t-2 border-[#111111] bg-canvas px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
      <Button type="button" className="min-h-14 w-full text-base" disabled={!ready || busy} onClick={onNext}>
        {busy ? (submitting ? 'Submitting…' : 'Saving…') : error ? 'Try again' : last ? 'Submit' : 'Next'}
      </Button>
    </div>
  </>;
}

// ---- end states ----
export function SubmittedScreen() {
  return <Panel>
    <h1 className={H1}>Submitted.</h1>
    <p className="mt-3 text-base leading-7">The business will review your answers.</p>
    <div className="mt-6"><Link href={APPLICATIONS_HREF} className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border-2 border-[#111111] bg-white px-4 text-base font-bold shadow-[3px_3px_0_#111111] sm:w-auto sm:text-sm">Back to my applications</Link></div>
  </Panel>;
}

export function MessageScreen({ title, body, onRetry }: { title: string; body: string; onRetry?: () => void }) {
  return <Panel>
    <h1 className={H1}>{title}</h1>
    <p className="mt-3 text-base leading-7">{body}</p>
    <div className="mt-6 flex flex-col gap-2 sm:flex-row">
      {onRetry && <Button type="button" className={BTN} onClick={onRetry}>Try again</Button>}
      <Link href={APPLICATIONS_HREF} className={LINK_BTN}>Back to my applications</Link>
    </div>
  </Panel>;
}

export const LoadingScreen = () => <Panel><p role="status" className="text-base">Loading your quiz…</p></Panel>;
