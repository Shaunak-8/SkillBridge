import { describe, expect, it } from 'vitest';
import { buildEnvironment } from '@/lib/proctoring/capabilities';
import { ProctorEngine } from '@/lib/proctoring/engine';
import { MAX_EVENTS_PER_ATTEMPT, MAX_EVENTS_PER_KIND } from '@/lib/proctoring/constants';

const base = { userAgent: '', canCamera: true, canFullscreen: true, canWakeLock: true };
const desktop = buildEnvironment({ ...base, coarsePointer: false, viewportWidth: 1280 }).profile;
const mobile = buildEnvironment({ ...base, coarsePointer: true, viewportWidth: 390, canFullscreen: false }).profile;

/** Feeds a constant face count every stepMs from `from` to `to` inclusive. */
function frames(engine: ProctorEngine, from: number, to: number, faceCount: number, stepMs = 200) {
  for (let t = from; t <= to; t += stepMs) engine.feedFrame({ t, faceCount });
}

describe('ProctorEngine face conditions', () => {
  it('ignores no-face shorter than the desktop grace period (2s)', () => {
    const e = new ProctorEngine(desktop);
    frames(e, 0, 1000, 1);
    frames(e, 1200, 3200, 0); // 2s gap
    frames(e, 3400, 6000, 1);
    expect(e.finalize(6000)).toEqual([]);
  });

  it('emits one no_face event with duration after 4s on desktop', () => {
    const e = new ProctorEngine(desktop);
    frames(e, 0, 1000, 1);
    frames(e, 1200, 5200, 0);
    frames(e, 5400, 8000, 1);
    expect(e.finalize(8000)).toEqual([{ kind: 'no_face', atMs: 1200, durationMs: 4000 }]);
  });

  it('uses the longer mobile grace (5s): 4s ignored, 6s flagged', () => {
    const short = new ProctorEngine(mobile);
    frames(short, 0, 4000, 0, 400);
    frames(short, 4400, 8000, 1, 400);
    expect(short.finalize(8000)).toEqual([]);

    const long = new ProctorEngine(mobile);
    frames(long, 0, 6000, 0, 400);
    frames(long, 6400, 9000, 1, 400);
    expect(long.finalize(9000)).toEqual([{ kind: 'no_face', atMs: 0, durationMs: 6000 }]);
  });

  it('closes an open no_face episode on finalize', () => {
    const e = new ProctorEngine(desktop);
    frames(e, 0, 5000, 0);
    expect(e.finalize(5000)).toEqual([{ kind: 'no_face', atMs: 0, durationMs: 5000 }]);
  });

  it('merges detector flicker into a single event', () => {
    const e = new ProctorEngine(desktop);
    frames(e, 0, 2000, 0);
    e.feedFrame({ t: 2200, faceCount: 1 }); // single-frame false positive
    frames(e, 2400, 5000, 0);
    frames(e, 5200, 7000, 1);
    expect(e.finalize(7000)).toEqual([{ kind: 'no_face', atMs: 0, durationMs: 5000 }]);
  });

  it('splits episodes separated by a sustained face', () => {
    const e = new ProctorEngine(desktop);
    frames(e, 0, 4000, 0);
    frames(e, 4200, 6000, 1);
    frames(e, 6200, 10200, 0);
    const events = e.finalize(10200);
    expect(events.map((x) => x.kind)).toEqual(['no_face', 'no_face']);
    expect(events[1].atMs).toBe(6200);
  });

  it('emits multiple_faces when two faces persist beyond the grace period', () => {
    const e = new ProctorEngine(desktop);
    frames(e, 0, 4000, 2);
    frames(e, 4200, 6000, 1);
    expect(e.finalize(6000)).toEqual([{ kind: 'multiple_faces', atMs: 0, durationMs: 4000 }]);
  });

  it('does not flag a brief second face', () => {
    const e = new ProctorEngine(desktop);
    frames(e, 0, 1000, 1);
    frames(e, 1200, 2000, 2);
    frames(e, 2200, 5000, 1);
    expect(e.finalize(5000)).toEqual([]);
  });

  it('ignores frames while the page is hidden and after the camera is lost', () => {
    const e = new ProctorEngine(desktop);
    e.feedVisibility({ t: 0, hidden: true });
    frames(e, 0, 10000, 0);
    e.feedVisibility({ t: 500, hidden: false });
    e.feedCameraLost(1000);
    frames(e, 1200, 9000, 0);
    expect(e.finalize(9000)).toEqual([{ kind: 'camera_lost', atMs: 1000 }]);
  });
});

describe('ProctorEngine visibility', () => {
  it('ignores a 1s hidden period and flags a 3s one (desktop => tab_hidden)', () => {
    const e = new ProctorEngine(desktop);
    e.feedVisibility({ t: 1000, hidden: true });
    e.feedVisibility({ t: 2000, hidden: false });
    expect(e.drain()).toEqual([]);
    e.feedVisibility({ t: 5000, hidden: true });
    e.feedVisibility({ t: 8000, hidden: false });
    expect(e.drain()).toEqual([{ kind: 'tab_hidden', atMs: 5000, durationMs: 3000 }]);
    expect(e.summary().totalAwayMs).toBe(3000);
  });

  it('reports app_background on mobile and closes open hidden spans on finalize', () => {
    const e = new ProctorEngine(mobile);
    e.feedVisibility({ t: 1000, hidden: true });
    e.feedVisibility({ t: 1100, hidden: true }); // duplicate signal is harmless
    expect(e.finalize(9000)).toEqual([{ kind: 'app_background', atMs: 1000, durationMs: 8000 }]);
  });

  it('closes an in-progress face episode when the page is hidden', () => {
    const e = new ProctorEngine(desktop);
    frames(e, 0, 4000, 0);
    e.feedVisibility({ t: 4100, hidden: true });
    expect(e.drain()).toEqual([{ kind: 'no_face', atMs: 0, durationMs: 4000 }]);
  });
});

describe('ProctorEngine other signals', () => {
  it('fullscreen exit counts only on desktop and only after fullscreen was entered', () => {
    const d = new ProctorEngine(desktop);
    d.feedFullscreen({ t: 0, active: false }); // never entered: ignored
    d.feedFullscreen({ t: 100, active: true });
    d.feedFullscreen({ t: 5000, active: false });
    d.feedFullscreen({ t: 7000, active: true });
    expect(d.drain()).toEqual([{ kind: 'fullscreen_exit', atMs: 5000, durationMs: 2000 }]);

    const m = new ProctorEngine(mobile);
    m.feedFullscreen({ t: 100, active: true });
    m.feedFullscreen({ t: 5000, active: false });
    expect(m.finalize(9000)).toEqual([]);
  });

  it('camera_lost and proctoring_unavailable are reported once', () => {
    const e = new ProctorEngine(desktop);
    e.feedCameraLost(100);
    e.feedCameraLost(200);
    e.feedUnavailable(300);
    e.feedUnavailable(400);
    expect(e.drain()).toEqual([
      { kind: 'camera_lost', atMs: 100 },
      { kind: 'proctoring_unavailable', atMs: 300 },
    ]);
  });

  it('debounces copy/paste bursts', () => {
    const e = new ProctorEngine(desktop);
    e.feedCopyPaste(1000);
    e.feedCopyPaste(1200);
    e.feedCopyPaste(1900);
    e.feedCopyPaste(2500);
    expect(e.drain().map((x) => x.atMs)).toEqual([1000, 2500]);
  });

  it('drain clears and finalize returns only what is not yet drained', () => {
    const e = new ProctorEngine(desktop);
    e.feedCopyPaste(1000);
    expect(e.drain()).toHaveLength(1);
    expect(e.drain()).toEqual([]);
    e.feedCopyPaste(3000);
    expect(e.finalize(4000)).toHaveLength(1);
  });
});

describe('ProctorEngine caps', () => {
  it('caps a single kind and reports the overflow as dropped', () => {
    const e = new ProctorEngine(desktop);
    for (let i = 0; i < MAX_EVENTS_PER_KIND + 15; i++) e.feedCopyPaste(i * 2000);
    expect(e.drain()).toHaveLength(MAX_EVENTS_PER_KIND);
    expect(e.summary()).toMatchObject({ counts: { copy_paste: MAX_EVENTS_PER_KIND }, dropped: 15 });
  });

  it('never emits more than the per-attempt maximum', () => {
    const e = new ProctorEngine(desktop);
    let t = 0;
    for (let i = 0; i < 400; i++) {
      e.feedVisibility({ t, hidden: true });
      t += 3000;
      e.feedVisibility({ t, hidden: false });
      t += 100;
      e.feedCopyPaste(t);
      frames(e, t, t + 3200, 0);
      frames(e, t + 3400, t + 5400, 1);
      t += 6000;
    }
    const total = Object.values(e.summary().counts).reduce((a, b) => a + (b ?? 0), 0);
    expect(total).toBeLessThanOrEqual(MAX_EVENTS_PER_ATTEMPT);
    expect(e.summary().dropped).toBeGreaterThan(0);
  });
});
