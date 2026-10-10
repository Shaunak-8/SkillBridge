import type { ProctorEvent, ProctorMode } from '@/lib/proctoring/types';
import { StudentApiError, type StudentApi } from './api';
import { chooseMode, clockOffset, remainingMs, resolveEntry, shiftEvents, type MyQuiz, type Phase } from './logic';

/**
 * The student quiz state machine, free of React so it can be tested with a fake API, camera and clock.
 * loading -> intro -> (blocked-in-app-browser) -> consent -> camera-check -> running -> submitted, plus unavailable and closed.
 * Everything time related uses the SERVER clock (offset = serverNow - device now, refreshed on every response).
 */
export interface Question { questionId: string; position: number; total: number; kind: 'mcq' | 'short'; prompt: string; options: string[] | null }
export type Busy = 'start' | 'answer' | 'submit' | null;
export type CameraState = 'idle' | 'asking' | 'ready' | 'denied';

export interface QuizState {
  phase: Phase; quiz: MyQuiz | null; resume: boolean; consentGiven: boolean;
  camera: CameraState; mode: ProctorMode | null;
  attemptId: string | null; deadlineMs: number | null; offsetMs: number;
  question: Question | null; busy: Busy; error: string;
}

export interface Deps {
  api: StudentApi;
  /** Resolves with the mode to report ('none' when the camera could not be used). */
  startCamera: () => Promise<ProctorMode>;
  stopCamera: () => Promise<void>;
  now: () => number;
  setTimer: (fn: () => void, ms: number) => unknown;
  clearTimer: (handle: unknown) => void;
}

const INITIAL: QuizState = {
  phase: 'loading', quiz: null, resume: false, consentGiven: false, camera: 'idle', mode: null,
  attemptId: null, deadlineMs: null, offsetMs: 0, question: null, busy: null, error: '',
};

const messageOf = (e: unknown): string => (e instanceof StudentApiError ? e.message : 'Something went wrong. Please try again.');
const statusOf = (e: unknown): number => (e instanceof StudentApiError ? e.status : -1);

export class QuizController {
  private state: QuizState = INITIAL;
  private readonly listeners = new Set<() => void>();
  private timer: unknown = null;
  private finishing = false;
  private disposed = false;
  /** Device clock reading when the camera session began, and when the attempt began (device clock). */
  private proctorOriginMs = 0;
  private attemptStartMs = 0;

  constructor(private readonly quizId: string, private readonly d: Deps) {}

  getState = (): QuizState => this.state;
  subscribe = (fn: () => void): (() => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };

  private set(patch: Partial<QuizState>): void {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }

  // ---- entry ----
  async init(): Promise<void> {
    this.disposed = false; // React StrictMode runs effect cleanup (dispose) and then the effect again
    this.set({ phase: 'loading', error: '' });
    let items: MyQuiz[];
    try { items = await this.d.api.myQuizzes(); } catch (e) { this.set({ phase: 'unavailable', error: messageOf(e) }); return; }
    if (this.disposed) return;
    const entry = resolveEntry(items, this.quizId);
    if (entry.kind === 'closed') this.set({ phase: 'closed' });
    else if (entry.kind === 'submitted') this.set({ phase: 'submitted', quiz: entry.quiz });
    else this.set({ phase: 'intro', quiz: entry.quiz, resume: entry.kind === 'resume' });
  }

  /** Called from a click, so the camera prompt (and desktop fullscreen) follow a real user gesture. */
  begin(inAppBrowser: boolean): void {
    if (this.state.phase !== 'intro') return;
    if (inAppBrowser) this.set({ phase: 'blocked-in-app-browser' });
    else this.proceed();
  }

  continueHere(): void { if (this.state.phase === 'blocked-in-app-browser') this.proceed(); }

  private proceed(): void {
    if (this.state.resume) void this.enterCamera();
    else this.set({ phase: 'consent' });
  }

  /** The consent checkbox gate: nothing happens unless it was ticked. */
  agree(ticked: boolean): void {
    if (!ticked || this.state.phase !== 'consent') return;
    this.set({ consentGiven: true });
    void this.enterCamera();
  }

  // ---- camera ----
  private async enterCamera(): Promise<void> {
    this.set({ phase: 'camera-check', error: '' });
    await this.runCamera();
  }

  async runCamera(): Promise<void> {
    if (this.state.camera === 'asking') return;
    this.set({ camera: 'asking', mode: null, error: '' });
    this.proctorOriginMs = this.d.now();
    let mode: ProctorMode;
    try { mode = await this.d.startCamera(); } catch { mode = 'none'; }
    if (this.disposed) return;
    this.set({ camera: mode === 'none' ? 'denied' : 'ready', mode });
  }

  // ---- start ----
  /**
   * POSTs the attempt with the mode the camera check reported. `withoutCamera` is the explicit "Continue without camera" choice.
   * Consent is sent only after the checkbox was ticked (or on resume, where it was given when the attempt began).
   */
  async startQuiz(opts: { withoutCamera?: boolean } = {}): Promise<void> {
    const s = this.state;
    if (s.busy || s.phase !== 'camera-check' || !(s.consentGiven || s.resume)) return;
    const withoutCamera = Boolean(opts.withoutCamera) && s.camera === 'denied';
    if (s.camera !== 'ready' && !withoutCamera) return;
    this.set({ busy: 'start', error: '' });
    try {
      if (withoutCamera) await this.d.stopCamera();
      const r = await this.d.api.start(this.quizId, { consent: true, proctoringMode: chooseMode(s.mode, withoutCamera) });
      this.set({ attemptId: r.attemptId });
      this.applyClock(r.deadlineAt, r.serverNow);
      this.attemptStartMs = this.state.deadlineMs! - this.state.offsetMs - (s.quiz?.timeLimitSeconds ?? 0) * 1000;
    } catch (e) {
      if (statusOf(e) === 409) { await this.settleConflict(messageOf(e)); return; }
      this.set({ busy: null, error: messageOf(e) });
      return;
    }
    await this.loadCurrent();
  }

  /** The server says we cannot start: re-read our quiz list to learn whether it closed or is already done. */
  private async settleConflict(message: string): Promise<void> {
    try {
      const entry = resolveEntry(await this.d.api.myQuizzes(), this.quizId);
      if (entry.kind === 'closed') { this.set({ phase: 'closed', busy: null }); return; }
      if (entry.kind === 'submitted') { this.set({ phase: 'submitted', busy: null }); return; }
    } catch { /* fall through to the message */ }
    this.set({ busy: null, error: message });
  }

  // ---- running ----
  private applyClock(deadlineIso: string, serverNowIso: string): void {
    const offsetMs = clockOffset(serverNowIso, this.d.now());
    const deadlineMs = new Date(deadlineIso).getTime();
    this.set({ offsetMs, deadlineMs });
    if (this.timer !== null) this.d.clearTimer(this.timer);
    this.timer = this.d.setTimer(() => { void this.finish(); }, remainingMs(deadlineMs, offsetMs, this.d.now()));
  }

  async loadCurrent(): Promise<void> {
    const id = this.state.attemptId;
    if (!id) return;
    let c;
    try { c = await this.d.api.current(id); } catch (e) { this.set({ busy: null, error: messageOf(e) }); return; }
    if (this.disposed) return;
    if (c.done) { await this.finish(); return; }
    this.applyClock(c.deadlineAt, c.serverNow);
    const { questionId, position, total, kind, prompt, options } = c;
    this.set({ phase: 'running', busy: null, error: '', question: { questionId, position, total, kind, prompt, options } });
  }

  /** Saves the answer to the current question, then shows the next one (or submits after the last). Typed text is never cleared here. */
  async answer(a: { answerIndex?: number; answerText?: string }): Promise<void> {
    const { question, attemptId, busy } = this.state;
    if (!question || !attemptId || busy) return;
    this.set({ busy: 'answer', error: '' });
    let r;
    try {
      r = await this.d.api.answer(attemptId, { questionId: question.questionId, ...a });
    } catch (e) {
      // 409: the deadline passed or we are no longer on this question. Ask the server where we are instead of guessing.
      if (statusOf(e) === 409) { await this.loadCurrent(); return; }
      this.set({ busy: null, error: messageOf(e) });
      return;
    }
    this.applyClock(r.deadlineAt, r.serverNow);
    if (r.next === null) { await this.finish(); return; }
    await this.loadCurrent();
  }

  /** Stops the camera (tracks released, last events flushed), then submits. Runs once: the deadline timer and the button share it. */
  async finish(): Promise<void> {
    const id = this.state.attemptId;
    if (this.finishing || !id) return;
    this.finishing = true;
    if (this.timer !== null) this.d.clearTimer(this.timer);
    this.timer = null;
    this.set({ busy: 'submit', error: '' });
    try { await this.d.stopCamera(); } catch { /* releasing the camera must never block the submit */ }
    try {
      await this.d.api.submit(id);
    } catch (e) {
      this.finishing = false; // let the student retry
      this.set({ busy: null, error: messageOf(e) });
      return;
    }
    this.set({ phase: 'submitted', busy: null, question: null });
  }

  // ---- proctoring events ----
  /** onEvents for useProctoring. Throws on network/server trouble so the batcher retries; other refusals are advisory data and dropped. */
  async handleEvents(batch: ProctorEvent[]): Promise<void> {
    const id = this.state.attemptId;
    if (!id) return;
    const events = shiftEvents(batch, this.proctorOriginMs - this.attemptStartMs);
    if (!events.length) return;
    try {
      await this.d.api.events(id, events);
    } catch (e) {
      const s = statusOf(e);
      if (s >= 400 && s < 500 && s !== 429) return;
      throw e;
    }
  }

  dispose(): void {
    this.disposed = true;
    if (this.timer !== null) this.d.clearTimer(this.timer);
    this.timer = null;
    void this.d.stopCamera().catch(() => undefined);
  }
}
