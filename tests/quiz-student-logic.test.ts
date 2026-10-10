import { describe, expect, it } from 'vitest';
import {
  chooseMode, clockOffset, faceStatus, formatTimer, inviteState, isAnswered, mapError, minutesLabel, remainingMs, resolveEntry, shiftEvents, timerTone,
  type MyQuiz,
} from '@/components/quiz/student/logic';

const quiz = (over: Partial<MyQuiz> = {}): MyQuiz => ({
  applicationId: 'a1', projectId: 'p1', projectTitle: 'Shop stock', quizId: 'q1', closesAt: '2026-10-13T08:00:00Z', timeLimitSeconds: 600,
  attemptId: null, attemptStatus: null, ...over,
});

describe('countdown math (server clock)', () => {
  it('ignores a device clock that is 10 minutes behind', () => {
    const deviceNow = 1_000_000_000_000;
    const serverNow = deviceNow + 600_000; // server is 10 min ahead of this device
    const offset = clockOffset(new Date(serverNow).toISOString(), deviceNow);
    expect(offset).toBe(600_000);
    const deadline = serverNow + 90_000;
    expect(remainingMs(deadline, offset, deviceNow)).toBe(90_000);
    expect(remainingMs(deadline, offset, deviceNow + 30_000)).toBe(60_000);
  });
  it('ignores a device clock that is ahead and never goes negative', () => {
    const deviceNow = 2_000_000_000_000;
    const offset = clockOffset(new Date(deviceNow - 300_000).toISOString(), deviceNow);
    expect(offset).toBe(-300_000);
    expect(remainingMs(deviceNow - 300_000 + 5_000, offset, deviceNow)).toBe(5_000);
    expect(remainingMs(deviceNow - 300_000 + 5_000, offset, deviceNow + 60_000)).toBe(0);
  });
  it('formats mm:ss rounding up and turns amber under 60s', () => {
    expect(formatTimer(600_000)).toBe('10:00');
    expect(formatTimer(61_000)).toBe('01:01');
    expect(formatTimer(59_001)).toBe('01:00');
    expect(formatTimer(999)).toBe('00:01');
    expect(formatTimer(0)).toBe('00:00');
    expect(formatTimer(-5)).toBe('00:00');
    expect(timerTone(60_000)).toBe('normal');
    expect(timerTone(59_999)).toBe('amber');
  });
  it('labels minutes', () => {
    expect(minutesLabel(600)).toBe('10 minutes');
    expect(minutesLabel(60)).toBe('1 minute');
    expect(minutesLabel(10)).toBe('1 minute');
  });
});

describe('entry and resume', () => {
  it('maps the student quiz list to a starting point', () => {
    expect(resolveEntry([], 'q1').kind).toBe('closed');
    expect(resolveEntry([quiz({ quizId: 'other' })], 'q1').kind).toBe('closed');
    expect(resolveEntry([quiz()], 'q1').kind).toBe('fresh');
    expect(resolveEntry([quiz({ attemptId: 't1', attemptStatus: 'in_progress' })], 'q1').kind).toBe('resume');
    expect(resolveEntry([quiz({ attemptId: 't1', attemptStatus: 'submitted' })], 'q1').kind).toBe('submitted');
    expect(resolveEntry([quiz({ attemptId: 't1', attemptStatus: 'expired' })], 'q1').kind).toBe('submitted');
  });
  it('maps invitation states', () => {
    expect(inviteState({ attemptStatus: null })).toBe('start');
    expect(inviteState({ attemptStatus: 'in_progress' })).toBe('resume');
    expect(inviteState({ attemptStatus: 'submitted' })).toBe('submitted');
    expect(inviteState({ attemptStatus: 'expired' })).toBe('submitted');
  });
});

describe('proctoring helpers', () => {
  it('an explicit "continue without camera" always reports none', () => {
    expect(chooseMode('full', false)).toBe('full');
    expect(chooseMode('limited', false)).toBe('limited');
    expect(chooseMode('full', true)).toBe('none');
    expect(chooseMode(null, false)).toBe('none');
  });
  it('face status is calm and limited without the detector', () => {
    expect(faceStatus('limited', 1)).toBe('limited');
    expect(faceStatus('none', null)).toBe('limited');
    expect(faceStatus('full', null)).toBe('looking');
    expect(faceStatus('full', 0)).toBe('none');
    expect(faceStatus('full', 1)).toBe('one');
    expect(faceStatus('full', 3)).toBe('many');
  });
  it('shifts event times to the attempt start and drops pre-quiz events', () => {
    const out = shiftEvents([{ kind: 'no_face', atMs: 1000, durationMs: 4000 }, { kind: 'tab_hidden', atMs: 9000 }], -5000);
    expect(out).toEqual([{ kind: 'tab_hidden', atMs: 4000 }]);
    expect(shiftEvents([{ kind: 'tab_hidden', atMs: 100 }], 2000)).toEqual([{ kind: 'tab_hidden', atMs: 2100 }]);
  });
});

describe('answers and errors', () => {
  it('knows when a question is answered', () => {
    expect(isAnswered('mcq', null, '')).toBe(false);
    expect(isAnswered('mcq', 0, '')).toBe(true);
    expect(isAnswered('short', null, '   ')).toBe(false);
    expect(isAnswered('short', null, 'Count stock')).toBe(true);
    expect(isAnswered('short', null, 'x'.repeat(2001))).toBe(false);
  });
  it('maps statuses to calm messages', () => {
    expect(mapError(0).kind).toBe('network');
    expect(mapError(0).message).toContain('still here');
    expect(mapError(401).kind).toBe('auth');
    expect(mapError(409, 'That is not the current question.')).toEqual({ kind: 'conflict', message: 'That is not the current question.' });
    expect(mapError(429).kind).toBe('rate');
    expect(mapError(503).kind).toBe('server');
    expect(mapError(400, 'Choose one of the options.').message).toBe('Choose one of the options.');
    for (const s of [0, 401, 409, 429, 500, 503, 400]) expect(mapError(s).message).not.toMatch(/error|fail|invalid/i);
  });
});
