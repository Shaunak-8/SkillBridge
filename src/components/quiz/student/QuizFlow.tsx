'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useProctoring } from '@/lib/proctoring/useProctoring';
import { cn } from '@/lib/utils/cn';
import { createStudentApi } from './api';
import { QuizController, type Question, type QuizState } from './controller';
import { formatTimer, remainingMs } from './logic';
import {
  CameraCheckView, ConsentScreen, InAppBrowserNotice, IntroScreen, LoadingScreen, MessageScreen, QuestionView, RunnerHeader, SubmittedScreen,
} from './screens';

const TICK_MS = 250;
const subscribeTick = (cb: () => void) => { const id = setInterval(cb, TICK_MS); return () => clearInterval(id); };
const tickSnapshot = () => Math.floor(Date.now() / TICK_MS);
const useTick = () => useSyncExternalStore(subscribeTick, tickSnapshot, () => 0);

/** Clipboard API first, then the old textarea trick for browsers (and in-app webviews) that block it. */
async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* fall back */ }
  try {
    const area = document.createElement('textarea');
    area.value = text; area.setAttribute('readonly', ''); area.style.cssText = 'position:fixed;top:0;opacity:0;font-size:16px';
    document.body.appendChild(area); area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  } catch { return false; }
}

/** Ticks only while mounted (the running screen), so the other screens never re-render every 250ms. */
function LiveHeader({ s, mode, showToggle, previewShown, onToggle }: { s: QuizState; mode: 'full' | 'limited' | 'none'; showToggle: boolean; previewShown: boolean; onToggle: () => void }) {
  const nowMs = useTick() * TICK_MS; // quantized to 250ms: the display is at most a quarter second behind
  const ms = s.deadlineMs === null ? 0 : remainingMs(s.deadlineMs, s.offsetMs, nowMs);
  const q = s.question;
  return <RunnerHeader position={q?.position ?? 1} total={q?.total ?? 5} remainingMs={ms} timerLabel={formatTimer(ms)} mode={mode}
    showPreviewToggle={showToggle} previewShown={previewShown} onTogglePreview={onToggle} />;
}

/** Keyed by question id: the typed answer lives here, so a failed save never clears it. */
function RunningView({ ctrl, s, question }: { ctrl: QuizController; s: QuizState; question: Question }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [text, setText] = useState('');
  const send = () => void ctrl.answer(question.kind === 'mcq' ? { answerIndex: selected ?? undefined } : { answerText: text });
  return <QuestionView question={question} selected={selected} text={text} busy={s.busy !== null} submitting={s.busy === 'submit'} error={s.error}
    onSelect={setSelected} onText={setText} onNext={send} />;
}

export function QuizFlow({ quizId }: { quizId: string }) {
  // The controller outlives renders; it reaches the latest proctoring handle through this ref, only inside callbacks (never during render).
  const proctoringRef = useRef<ReturnType<typeof useProctoring> | null>(null);
  // eslint-disable-next-line react-hooks/refs -- the ref is read lazily when the student taps a button
  const [ctrl] = useState(() => new QuizController(quizId, {
    api: createStudentApi(),
    startCamera: () => proctoringRef.current?.start() ?? Promise.resolve('none' as const),
    stopCamera: () => proctoringRef.current?.stop() ?? Promise.resolve(),
    now: () => Date.now(),
    setTimer: (fn, ms) => setTimeout(fn, ms),
    clearTimer: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
  }));
  const proctoring = useProctoring({ onEvents: (batch) => ctrl.handleEvents(batch) });
  useEffect(() => { proctoringRef.current = proctoring; });
  useEffect(() => { void ctrl.init(); return () => ctrl.dispose(); }, [ctrl]);
  const s = useSyncExternalStore(ctrl.subscribe, ctrl.getState, ctrl.getState);

  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [previewChoice, setPreviewChoice] = useState<boolean | null>(null);
  const env = proctoring.environment;
  const running = s.phase === 'running';
  const previewShown = previewChoice ?? (env ? !env.isMobile : false);

  useEffect(() => {
    const sync = () => setIsFullscreen(Boolean(document.fullscreenElement));
    sync();
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  useEffect(() => {
    if (!running) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [running]);

  const videoBox = s.phase === 'camera-check' && s.camera === 'ready'
    ? 'mx-auto mb-4 aspect-[4/3] w-full max-w-xs overflow-hidden rounded-xl border-2 border-[#111111] bg-black'
    : running && previewShown && proctoring.cameraActive
      ? 'pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] right-3 z-10 h-20 w-16 overflow-hidden rounded-lg border-2 border-[#111111] bg-black opacity-90'
      : 'sr-only'; // still rendered, so the detector keeps getting frames

  const quiz = s.quiz;
  let screen: React.ReactNode;
  switch (s.phase) {
    case 'unavailable': screen = <MessageScreen title="We could not load your quiz" body={s.error || 'Please try again.'} onRetry={() => void ctrl.init()} />; break;
    case 'closed': screen = <MessageScreen title="This quiz is not available" body="It may have closed, or your application is no longer active." />; break;
    case 'intro':
      screen = <IntroScreen projectTitle={quiz?.projectTitle ?? ''} timeLimitSeconds={quiz?.timeLimitSeconds ?? 600} resume={s.resume} onBegin={() => ctrl.begin(Boolean(env?.inAppBrowser))} />; break;
    case 'blocked-in-app-browser':
      screen = <InAppBrowserNotice url={typeof window === 'undefined' ? '' : window.location.href} copied={copied}
        onCopy={() => void copyText(window.location.href).then(setCopied)} onContinue={() => ctrl.continueHere()} />; break;
    case 'consent': screen = <ConsentScreen timeLimitSeconds={quiz?.timeLimitSeconds ?? 600} onAgree={() => ctrl.agree(true)} />; break;
    case 'camera-check':
      screen = <CameraCheckView camera={s.camera} mode={s.mode} facesNow={proctoring.facesNow} errorCode={proctoring.error} resume={s.resume}
        busy={s.busy === 'start'} error={s.error} canFullscreen={Boolean(env?.canFullscreen && !env.isMobile)} isFullscreen={isFullscreen}
        onTryAgain={() => void ctrl.runCamera()} onStart={() => void ctrl.startQuiz()} onWithoutCamera={() => void ctrl.startQuiz({ withoutCamera: true })}
        onFullscreen={() => void document.documentElement.requestFullscreen?.().catch(() => undefined)} />; break;
    case 'running':
      screen = s.question ? <RunningView key={s.question.questionId} ctrl={ctrl} s={s} question={s.question} /> : <LoadingScreen />; break;
    case 'submitted': screen = <SubmittedScreen />; break;
    default: screen = <LoadingScreen />;
  }

  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-[#151515]">
      {running && <LiveHeader s={s} mode={proctoring.mode} showToggle={proctoring.cameraActive} previewShown={previewShown} onToggle={() => setPreviewChoice(!previewShown)} />}
      <main className={cn('mx-auto w-full max-w-xl flex-1 px-4 pt-5', running ? 'pb-4' : 'pb-[max(1.5rem,env(safe-area-inset-bottom))]')}>
        <div className={videoBox}>
          <video ref={proctoring.videoRef} muted playsInline autoPlay aria-label="Your camera preview. It stays on your device." className="h-full w-full -scale-x-100 object-cover" />
        </div>
        {screen}
      </main>
    </div>
  );
}
