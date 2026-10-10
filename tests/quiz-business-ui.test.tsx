import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
vi.stubGlobal('React', React);
import { QuestionCard } from '@/components/quiz/business/QuestionCard';
import { QuizPanelView } from '@/components/quiz/business/QuizPanelView';
import { ConfirmBox } from '@/components/quiz/business/parts';
import { OpenQuizSummary, QuizReview } from '@/components/quiz/business/QuizReview';
import { QuizResultsView } from '@/components/quiz/business/QuizResults';
import type { DraftQuestion, Quiz, QuizQuestion, QuizState, ResultItem } from '@/components/quiz/business/types';

const noop = () => {};
const actions = { onGenerate: noop, onRegenerate: noop, onOpen: noop, onClose: noop, onSave: async () => true };
const quiz = (status: Quiz['status']): Quiz => ({
  id: 'q1', status, timeLimitSeconds: 600, openedAt: status === 'draft' ? null : '2026-10-10T08:00:00Z', closesAt: status === 'draft' ? null : '2026-10-13T08:00:00Z',
  questions: [
    ...[1, 2, 3, 4].map((n): QuizQuestion => ({ id: `m${n}`, position: n, kind: 'mcq', prompt: `Which first step suits the shop best (${n})?`, options: [`Opt A${n}`, `Opt B${n}`, `Opt C${n}`, `Opt D${n}`], correctIndex: 2, rubric: null })),
    { id: 's5', position: 5, kind: 'short', prompt: 'Explain how you would fix their stock tracking.', options: null, correctIndex: null, rubric: 'Counts stock, uses one shared sheet.' },
  ],
});
const state = (over: Partial<QuizState>): QuizState => ({ applicantCount: 5, minApplicants: 3, eligible: true, quiz: null, ...over });
const panel = (data: QuizState, extra: { busy?: '' | 'generate' | 'open'; error?: string } = {}) =>
  renderToStaticMarkup(<QuizPanelView projectId="p1" data={data} busy={extra.busy ?? ''} progress="Reading your problem…" error={extra.error ?? ''} {...actions} />);

const items: ResultItem[] = [
  { applicationId: 'a1', studentId: 's1', displayName: 'Asha <b>Rao</b>', status: 'submitted', mcqScore: 3, mcqMax: 4, shortScore: null, shortMax: 4, shortAnswer: 'I would count stock.', shortFeedback: null, timeTakenSeconds: 372, proctoringMode: 'full', integrity: { counts: { tab_hidden: 1, no_face: 1 }, totalAwayMs: 14_000 } },
  { applicationId: 'a2', studentId: 's2', displayName: 'Dev', status: 'submitted', mcqScore: 4, mcqMax: 4, shortScore: 3, shortMax: 4, shortAnswer: 'Use a sheet.', shortFeedback: 'Clear and practical.', timeTakenSeconds: 200, proctoringMode: 'limited', integrity: { counts: {}, totalAwayMs: 0 } },
  { applicationId: 'a3', studentId: 's3', displayName: 'Meera', status: 'not_taken', mcqScore: null, mcqMax: null, shortScore: null, shortMax: null, shortAnswer: null, shortFeedback: null, timeTakenSeconds: null, proctoringMode: null, integrity: { counts: {}, totalAwayMs: 0 } },
];

it('state (a): not eligible shows the unlock message and the count', () => {
  const html = panel(state({ applicantCount: 2, eligible: false }));
  expect(html).toContain('AI quiz unlocks when more than 3 people apply. 2 applied so far.');
  expect(html).not.toContain('Generate AI quiz');
});

it('state (b): eligible without a quiz explains in 3 lines and offers generation', () => {
  const html = panel(state({}));
  expect(html).toContain('5 questions, made only from the problem you posted.');
  expect(html).toContain('camera check');
  expect(html).toContain('You still decide who moves forward.');
  expect(html).toMatch(/<button[^>]*>Generate AI quiz<\/button>/);
  expect((html.match(/<li>/g) ?? []).length).toBe(3);
});

it('state (b): generation disables the button and shows stepped progress and errors', () => {
  const html = panel(state({}), { busy: 'generate', error: 'Too many attempts. Please wait a few minutes and try again.' });
  expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Generating…<\/button>/);
  expect(html).toContain('Reading your problem… This can take up to 15 seconds.');
  expect(html).toContain('role="alert"');
  expect(html).toContain('wait a few minutes');
});

it('state (c): draft review labels the AI answer, the marking guide and offers every action', () => {
  const html = panel(state({ quiz: quiz('draft') }));
  expect(html).toContain('AI-generated draft');
  expect(html).toContain('AI-suggested answer');
  expect(html).toContain('please check it');
  expect(html).toContain('Marking guide');
  expect(html).toContain('Counts stock, uses one shared sheet.');
  for (const label of ['Save changes', 'Regenerate', 'Open quiz to applicants']) expect(html).toContain(label);
  for (const minutes of [5, 10, 15, 20, 25, 30]) expect(html).toContain(`>${minutes} minutes<`);
  expect(html).not.toContain('>35 minutes<');
  expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Save changes<\/button>/);
  expect(html).toContain('sticky bottom-2');
});

it('state (c): draft cannot be opened when applicants dropped to 3 or fewer', () => {
  const html = renderToStaticMarkup(<QuizReview quiz={quiz('draft')} busy="" progress="" canOpen={false} onSave={async () => true} onRegenerate={noop} onOpen={noop} />);
  expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Open quiz to applicants<\/button>/);
  expect(html).toContain('cannot be opened until more apply');
});

it('open confirmation states what students will see', () => {
  const html = renderToStaticMarkup(<OpenQuizSummary />);
  for (const text of ['agree before they start', 'camera and tab-switch checks', 'No video or photos', '72 hours', 'optional', 'advisory only', 'final decision']) expect(html).toContain(text);
  const box = renderToStaticMarkup(<ConfirmBox title="Open this quiz to applicants?" confirmLabel="Yes, open quiz" onConfirm={noop} onCancel={noop}><OpenQuizSummary /></ConfirmBox>);
  expect(box).toContain('role="alertdialog"'); expect(box).toContain('Yes, open quiz'); expect(box).toContain('Not yet');
});

it('question editor shows 4 options with a correct-answer radio, 16px inputs and validation messages', () => {
  const q: DraftQuestion = { kind: 'mcq', prompt: 'short', options: ['a', 'a', '', 'd'], correctIndex: 0, rubric: '' };
  const html = renderToStaticMarkup(<QuestionCard index={0} q={q} problems={['Fill in all 4 options.']} editing onToggleEdit={noop} onChange={noop} />);
  expect((html.match(/type="radio"/g) ?? []).length).toBe(4);
  expect(html).toContain('maxLength="600"'); expect(html).toContain('maxLength="300"');
  expect(html).toContain('Fill in all 4 options.'); expect(html).toContain('text-base'); expect(html).toContain('aria-expanded="true"');
  const short = renderToStaticMarkup(<QuestionCard index={4} q={{ kind: 'short', prompt: 'Explain it well please', options: ['', '', '', ''], correctIndex: 0, rubric: 'guide guide guide' }} problems={[]} editing onToggleEdit={noop} onChange={noop} />);
  expect(short).toContain('maxLength="1000"'); expect(short).not.toContain('type="radio"');
});

it('states (d) and (e): open and closed show status, dates, counts and the right action', () => {
  const open = panel(state({ quiz: quiz('open') }));
  expect(open).toContain('Open to applicants'); expect(open).toContain('Closes'); expect(open).toContain('Applicants'); expect(open).toMatch(/<button[^>]*>Close quiz<\/button>/);
  expect(open).toContain('Loading results');
  const closed = panel(state({ quiz: quiz('closed'), eligible: true }));
  expect(closed).toContain('Closed on'); expect(closed).not.toContain('Close quiz'); expect(closed).not.toContain('Save changes');
});

it('results: per-applicant score, status, integrity text and an advisory explanation', () => {
  const html = renderToStaticMarkup(<QuizResultsView items={items} />);
  expect(html).toContain('Asha &lt;b&gt;Rao&lt;/b&gt;'); expect(html).not.toContain('<b>Rao');
  expect(html).toContain('3/4'); expect(html).toContain('Not graded'); expect(html).toContain('3/4'); expect(html).toContain('6m 12s');
  expect(html).toContain('2 flags: no face seen ×1, tab hidden ×1, 14s away');
  for (const text of ['Submitted', 'Not taken', 'Checks: Full', 'Checks: Limited']) expect(html).toContain(text);
  expect(html).toContain('advisory signals only'); expect(html).toContain('poor lighting, a phone call or a weak camera'); expect(html).toContain('never proof of cheating');
  expect(html).toContain('2 of 3 applicants submitted');
});

it('results: responsive cards below md and a table from md', () => {
  const html = renderToStaticMarkup(<QuizResultsView items={items} />);
  expect(html).toContain('md:hidden'); expect(html).toContain('hidden md:block'); expect(html).toContain('<table');
});

it('copy never uses rejection or accusation wording', () => {
  const all = [
    panel(state({ applicantCount: 1, eligible: false })), panel(state({})), panel(state({ quiz: quiz('draft') })), panel(state({ quiz: quiz('open') })),
    renderToStaticMarkup(<QuizResultsView items={items} />), renderToStaticMarkup(<OpenQuizSummary />),
  ].join(' ');
  expect(all).not.toMatch(/rejected|reject|cheated|fraud|disqualif/i);
  expect(all).not.toMatch(/auto-?(reject|rank)/i);
});

it('mobile sanity: every button is a 44px target, no pixel width beyond 360, no horizontal scroll classes', () => {
  const all = [panel(state({})), panel(state({ quiz: quiz('draft') })), panel(state({ quiz: quiz('open') })), renderToStaticMarkup(<QuizResultsView items={items} />)].join(' ');
  const buttons = all.match(/<button[^>]*>/g) ?? [];
  expect(buttons.length).toBeGreaterThan(5);
  for (const b of buttons) expect(b).toContain('min-h-11');
  for (const m of all.matchAll(/(?:min-w|w)-\[(\d+)px\]/g)) expect(Number(m[1])).toBeLessThanOrEqual(360);
  expect(all).not.toMatch(/overflow-x-(scroll|auto)/);
  expect(all).not.toMatch(/\bw-(screen|\d{3,})\b/);
});
