import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
vi.stubGlobal('React', React);
vi.mock('@/lib/proctoring/useProctoring', () => ({
  useProctoring: () => ({
    videoRef: { current: null }, mode: 'none', cameraActive: false, facesNow: null, environment: null, error: null,
    start: async () => 'none', stop: async () => undefined,
  }),
}));
import { QuizFlow } from '@/components/quiz/student/QuizFlow';
import { InviteList } from '@/components/quiz/student/QuizInvites';
import {
  CameraCheckView, ConsentScreen, InAppBrowserNotice, IntroScreen, MessageScreen, QuestionView, RunnerHeader, SubmittedScreen,
  type CameraCheckProps, type QuestionViewProps,
} from '@/components/quiz/student/screens';
import type { MyQuiz } from '@/components/quiz/student/logic';

const noop = () => {};
const html = (el: React.ReactElement) => renderToStaticMarkup(el);

const cam = (over: Partial<CameraCheckProps> = {}): CameraCheckProps => ({
  camera: 'ready', mode: 'full', facesNow: 1, errorCode: null, resume: false, busy: false, error: '', canFullscreen: false, isFullscreen: false,
  onTryAgain: noop, onStart: noop, onWithoutCamera: noop, onFullscreen: noop, ...over,
});
const mcq: QuestionViewProps['question'] = { questionId: 'k2', position: 2, total: 5, kind: 'mcq', prompt: 'Which first step suits the shop best?', options: ['Opt A', 'Opt B', 'Opt C', 'Opt D'] };
const short: QuestionViewProps['question'] = { questionId: 'k5', position: 5, total: 5, kind: 'short', prompt: 'Explain how you would fix their stock tracking.', options: null };
const qv = (over: Partial<QuestionViewProps> = {}) => html(<QuestionView question={mcq} selected={null} text="" busy={false} submitting={false} error="" onSelect={noop} onText={noop} onNext={noop} {...over} />);
const header = (ms: number, label: string, mode: 'full' | 'limited' | 'none' = 'full') =>
  html(<RunnerHeader position={2} total={5} remainingMs={ms} timerLabel={label} mode={mode} showPreviewToggle previewShown={false} onTogglePreview={noop} />);

const invite = (over: Partial<MyQuiz> = {}): MyQuiz => ({
  applicationId: 'a1', projectId: 'p1', projectTitle: 'Shop stock', quizId: 'q1', closesAt: '2026-10-13T08:00:00Z', timeLimitSeconds: 600,
  attemptId: null, attemptStatus: null, ...over,
});

describe('screen copy', () => {
  it('intro: optional, minutes, camera, and a way out', () => {
    const out = html(<IntroScreen projectTitle="Shop stock" timeLimitSeconds={600} resume={false} onBegin={noop} />);
    expect(out).toContain('Optional. About 10 minutes. Uses your camera for simple checks.');
    expect(out).toContain('Not now');
    expect(out).toContain('href="/student/applications"');
    const resumed = html(<IntroScreen projectTitle="Shop stock" timeLimitSeconds={600} resume onBegin={noop} />);
    expect(resumed).toContain('Continue quiz');
    expect(resumed).not.toContain('Not now');
  });
  it('consent: plain-language bullets, required checkbox (unticked, Continue disabled) and a Not now link', () => {
    const out = html(<ConsentScreen timeLimitSeconds={600} onAgree={noop} />);
    for (const text of [
      'on YOUR device', 'switch tabs or apps', 'no video or photos are kept', 'Nothing is recorded or uploaded', 'tab hidden for 5s',
      'The business sees your score and these flags', 'advisory', 'makes the decision', 'The quiz is optional', 'limited checks',
      '10 minutes', 'One attempt', 'one at a time', 'cannot go back', 'I understand and agree',
    ]) expect(out, text).toContain(text);
    expect(out).toMatch(/<input[^>]*type="checkbox"/);
    expect(out).not.toMatch(/<input[^>]*checked/);
    expect(out).toMatch(/<button[^>]*disabled=""[^>]*>Continue<\/button>/);
    expect(out).toContain('href="/student/applications"');
  });
  it('in-app browser: explains, offers Copy link and Continue here', () => {
    const out = html(<InAppBrowserNotice url="https://x.test/student/quiz/q1" copied={false} onCopy={noop} onContinue={noop} />);
    expect(out).toContain('This link opened inside another app (e.g. WhatsApp or Instagram)');
    expect(out).toContain('The camera check often fails there');
    expect(out).toContain('Chrome or Safari');
    expect(out).toContain('Copy link');
    expect(out).toContain('Continue here');
    expect(out).toContain('https://x.test/student/quiz/q1');
    expect(html(<InAppBrowserNotice url="" copied onCopy={noop} onContinue={noop} />)).toContain('Link copied');
  });
  it('camera check: asking, ready, no face tips, many faces, limited, denied choice, resume', () => {
    expect(html(<CameraCheckView {...cam({ camera: 'asking', mode: null })} />)).toContain('Asking for camera permission');
    const ready = html(<CameraCheckView {...cam()} />);
    expect(ready).toContain('Camera is on and we can see you');
    expect(ready).toContain('Start quiz');
    const none = html(<CameraCheckView {...cam({ facesNow: 0 })} />);
    for (const t of ['We cannot see a face yet', 'Face the light', 'Hold your phone steady', 'only you']) expect(none).toContain(t);
    expect(none).toContain('Start quiz'); // never blocked
    expect(html(<CameraCheckView {...cam({ facesNow: 2 })} />)).toContain('More than one person is in view');
    const limited = html(<CameraCheckView {...cam({ mode: 'limited', facesNow: null })} />);
    expect(limited).toContain('Face check is not available on this device');
    expect(limited).toContain('Start quiz');
    expect(limited).not.toMatch(/warning|error|failed/i);
    const denied = html(<CameraCheckView {...cam({ camera: 'denied', mode: 'none', errorCode: 'NotAllowedError' })} />);
    expect(denied).toContain('Camera permission was not given.');
    expect(denied).toContain('Continue without camera (limited checks)');
    expect(denied).toContain('Try again');
    expect(denied).not.toContain('Start quiz');
    expect(html(<CameraCheckView {...cam({ resume: true })} />)).toContain('Resume quiz');
  });
  it('fullscreen is offered only when allowed and not already on', () => {
    expect(html(<CameraCheckView {...cam({ canFullscreen: true })} />)).toContain('Enter fullscreen');
    expect(html(<CameraCheckView {...cam({ canFullscreen: true, isFullscreen: true })} />)).not.toContain('Enter fullscreen');
    expect(html(<CameraCheckView {...cam()} />)).not.toContain('Enter fullscreen');
  });
  it('end states: submitted, closed, unavailable with retry', () => {
    const done = html(<SubmittedScreen />);
    expect(done).toContain('Submitted.');
    expect(done).toContain('The business will review your answers.');
    expect(done).toContain('href="/student/applications"');
    expect(html(<MessageScreen title="This quiz is not available" body="It may have closed." />)).not.toContain('Try again');
    expect(html(<MessageScreen title="We could not load your quiz" body="x" onRetry={noop} />)).toContain('Try again');
  });
});

describe('running screen', () => {
  it('renders only the current question, as four large radio cards', () => {
    const out = qv();
    expect(out).toContain('Which first step suits the shop best?');
    expect(out.match(/type="radio"/g)).toHaveLength(4);
    for (const o of ['Opt A', 'Opt B', 'Opt C', 'Opt D']) expect(out).toContain(o);
    expect(out.match(/min-h-14/g)!.length).toBeGreaterThanOrEqual(4);
    expect(out).not.toContain('Explain how you would fix');
  });
  it('Next is disabled until an option is picked, and the last question says Submit', () => {
    expect(qv()).toMatch(/<button[^>]*disabled=""[^>]*>Next<\/button>/);
    expect(qv({ selected: 1 })).not.toMatch(/<button[^>]*disabled=""/);
    expect(qv({ selected: 1 })).toContain('>Next<');
    expect(qv({ question: short, text: 'Count it weekly' })).toContain('>Submit<');
    expect(qv({ question: short, text: '  ' })).toMatch(/<button[^>]*disabled=""[^>]*>Submit<\/button>/);
  });
  it('short answer: 16px textarea, 6 rows, counter to 2000, keeps the typed text', () => {
    const out = qv({ question: short, text: 'Count it weekly' });
    expect(out).toMatch(/<textarea[^>]*rows="6"/);
    expect(out).toMatch(/<textarea[^>]*maxLength="2000"/);
    expect(out).toMatch(/<textarea[^>]*class="[^"]*text-base/);
    expect(out).toContain('Count it weekly');
    expect(out).toContain('15/2000');
  });
  it('shows a retryable inline error without dropping the answer, and a calm saving state', () => {
    const out = qv({ question: short, text: 'My long answer', error: 'We could not connect. Check your connection and try again. Your answer is still here.' });
    expect(out).toContain('My long answer');
    expect(out).toContain('Your answer is still here.');
    expect(out).toContain('>Try again<');
    expect(qv({ selected: 0, busy: true })).toContain('Saving…');
    expect(qv({ selected: 0, busy: true, submitting: true })).toContain('Submitting your answers…');
  });
  it('header: position, mm:ss, status dot, amber under a minute (never red)', () => {
    const normal = header(125_000, '02:05');
    expect(normal).toContain('Question 2 of 5');
    expect(normal).toContain('02:05');
    expect(normal).toContain('Camera checks on');
    expect(normal).toContain('bg-white');
    const amber = header(59_000, '00:59');
    expect(amber).toContain('bg-[#F2BE4E]');
    expect(amber).not.toMatch(/text-red|bg-red/);
    expect(header(1, '00:01', 'limited')).toContain('Limited checks');
    expect(header(1, '00:01', 'none')).toContain('Camera off');
    expect(normal).toContain('Show preview');
  });
});

describe('QuizFlow shell', () => {
  it('renders a loading state in a full-height page with a muted inline camera element ready for start()', () => {
    const out = html(<QuizFlow quizId="q1" />);
    expect(out).toContain('Loading your quiz');
    expect(out).toContain('min-h-dvh');
    expect(out).toMatch(/<video[^>]*muted/);
    expect(out).toMatch(/<video[^>]*playsInline/i);
  });
});

describe('invitations', () => {
  it('shows start, resume and submitted cards with the optional line', () => {
    const out = html(<InviteList items={[invite(), invite({ quizId: 'q2', attemptStatus: 'in_progress', attemptId: 't' }), invite({ quizId: 'q3', attemptStatus: 'submitted', attemptId: 't3' })]} />);
    expect(out).toContain('The business invited you to an AI quiz for Shop stock');
    expect(out).toContain('Optional. About 10 minutes. Uses your camera for simple checks.');
    expect(out).toContain('Closes');
    expect(out).toContain('>Start quiz<');
    expect(out).toContain('>Resume<');
    expect(out).toContain('Submitted');
    expect(out).toContain('href="/student/quiz/q1"');
    expect(out).not.toContain('href="/student/quiz/q3"');
  });
  it('renders nothing when there are no invitations', () => {
    expect(html(<InviteList items={[]} />)).toBe('');
  });
});

describe('what students never see, and mobile sanity', () => {
  const everything = () => [
    html(<IntroScreen projectTitle="Shop stock" timeLimitSeconds={600} resume={false} onBegin={noop} />),
    html(<InAppBrowserNotice url="https://x.test" copied={false} onCopy={noop} onContinue={noop} />),
    html(<CameraCheckView {...cam()} />),
    html(<CameraCheckView {...cam({ camera: 'denied', mode: 'none' })} />),
    html(<CameraCheckView {...cam({ canFullscreen: true })} />),
    qv(), qv({ question: short, text: 'abc', error: 'x' }), header(59_000, '00:59'),
    html(<SubmittedScreen />), html(<MessageScreen title="t" body="b" onRetry={noop} />),
    html(<InviteList items={[invite(), invite({ quizId: 'q3', attemptStatus: 'submitted', attemptId: 't3' })]} />),
    html(<QuizFlow quizId="q1" />),
  ];
  it('no correctness or score wording on any screen the student sees while taking the quiz', () => {
    for (const markup of everything()) expect(markup).not.toMatch(/correct|score|points|grade/i);
  });
  it('every button is a 44px+ tap target (min-h-11/12/14) and every field uses 16px text', () => {
    const all = [...everything(), html(<ConsentScreen timeLimitSeconds={600} onAgree={noop} />)];
    for (const markup of all) {
      for (const tag of markup.match(/<button[^>]*>/g) ?? []) expect(tag, tag).toMatch(/min-h-(11|12|14)/);
      for (const tag of markup.match(/<textarea[^>]*>/g) ?? []) expect(tag).toMatch(/text-base/);
    }
  });
  it('single column, no fixed widths past the viewport, no horizontal scroll helpers, safe-area padding', () => {
    const all = [...everything(), html(<ConsentScreen timeLimitSeconds={600} onAgree={noop} />)].join('\n');
    expect(all).not.toMatch(/\bw-\[\d{3,}px\]|\bmin-w-\[\d{3,}px\]|overflow-x-(auto|scroll)|\bgrid-cols-[2-9]\b|hover:(?!bg|underline)/);
    expect(all).toContain('env(safe-area-inset-top)');
    expect(all).toContain('env(safe-area-inset-bottom)');
    expect(all).toContain('break-words');
  });
});
