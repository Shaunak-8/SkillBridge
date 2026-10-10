import { COPY_PASTE_DEBOUNCE_MS, MAX_EVENTS_PER_ATTEMPT, MAX_EVENTS_PER_KIND, MERGE_GAP_MS } from './constants';
import type { ProctorEvent, ProctorEventKind, ProctorProfile, ProctorSummary } from './types';

interface Span {
  start: number;
  last: number;
}

type FaceKind = 'no_face' | 'multiple_faces';

/**
 * Pure state machine: turns raw signals (face counts, visibility, fullscreen...) into a short
 * list of advisory events. No DOM, no timers, no I/O. All times are ms since attempt start.
 *
 * - Continuous conditions (no face, 2+ faces, hidden page) become ONE event with durationMs,
 *   emitted when the condition ends or on finalize().
 * - Conditions shorter than the profile's grace period never produce an event.
 * - A face episode is only split after MERGE_GAP_MS of the opposite state, so detector flicker merges.
 * - Per-kind and per-attempt caps bound the output; overflow is counted in summary().dropped.
 */
export class ProctorEngine {
  private undrained: ProctorEvent[] = [];
  private counts: Partial<Record<ProctorEventKind, number>> = {};
  private emittedTotal = 0;
  private dropped = 0;
  private totalAwayMs = 0;

  private spans: Record<FaceKind, Span | null> = { no_face: null, multiple_faces: null };
  private hiddenSince: number | null = null;
  private fullscreenSeen = false;
  private fullscreenExitSince: number | null = null;
  private cameraLost = false;
  private unavailable = false;
  private lastCopyPasteAt = Number.NEGATIVE_INFINITY;

  constructor(private readonly profile: ProctorProfile) {}

  feedFrame({ t, faceCount }: { t: number; faceCount: number }): void {
    if (this.cameraLost || this.hiddenSince !== null) return;
    this.stepFace('no_face', faceCount === 0, t);
    this.stepFace('multiple_faces', faceCount >= 2, t);
  }

  feedVisibility({ t, hidden }: { t: number; hidden: boolean }): void {
    if (hidden && this.hiddenSince === null) {
      this.closeFaceSpans();
      this.hiddenSince = t;
    } else if (!hidden && this.hiddenSince !== null) {
      this.closeHidden(t);
    }
  }

  /** Desktop only. An exit is only meaningful after fullscreen was actually entered. */
  feedFullscreen({ t, active }: { t: number; active: boolean }): void {
    if (!this.profile.requireFullscreen) return;
    if (active) {
      this.fullscreenSeen = true;
      this.closeFullscreenExit(t);
    } else if (this.fullscreenSeen && this.fullscreenExitSince === null) {
      this.fullscreenExitSince = t;
    }
  }

  feedCameraLost(t: number): void {
    if (this.cameraLost) return;
    this.closeFaceSpans();
    this.cameraLost = true;
    this.emit('camera_lost', t);
  }

  /** MediaPipe failed to start or runs below the minimum frame rate. Reported once. */
  feedUnavailable(t: number): void {
    if (this.unavailable) return;
    this.unavailable = true;
    this.emit('proctoring_unavailable', t);
  }

  feedCopyPaste(t: number): void {
    if (t - this.lastCopyPasteAt < COPY_PASTE_DEBOUNCE_MS) return;
    this.lastCopyPasteAt = t;
    this.emit('copy_paste', t);
  }

  /** Returns events completed since the last drain and clears them. */
  drain(): ProctorEvent[] {
    const out = this.undrained;
    this.undrained = [];
    return out;
  }

  /** Closes every open condition at time t and returns all remaining undrained events. */
  finalize(t: number): ProctorEvent[] {
    this.closeFaceSpans();
    if (this.hiddenSince !== null) this.closeHidden(t);
    this.closeFullscreenExit(t);
    return this.drain();
  }

  summary(): ProctorSummary {
    return { counts: { ...this.counts }, totalAwayMs: this.totalAwayMs, dropped: this.dropped };
  }

  private stepFace(kind: FaceKind, active: boolean, t: number): void {
    const span = this.spans[kind];
    if (active) {
      this.spans[kind] = { start: span ? span.start : t, last: t };
    } else if (span && t - span.last >= MERGE_GAP_MS) {
      this.closeFaceSpan(kind);
    }
  }

  private closeFaceSpan(kind: FaceKind): void {
    const span = this.spans[kind];
    this.spans[kind] = null;
    if (!span) return;
    const duration = span.last - span.start;
    if (duration >= this.profile.noFaceGraceMs) this.emit(kind, span.start, duration);
  }

  private closeFaceSpans(): void {
    this.closeFaceSpan('no_face');
    this.closeFaceSpan('multiple_faces');
  }

  private closeHidden(t: number): void {
    const since = this.hiddenSince;
    this.hiddenSince = null;
    if (since === null) return;
    const duration = t - since;
    if (duration < this.profile.hiddenGraceMs) return;
    this.totalAwayMs += duration;
    this.emit(this.profile.isMobile ? 'app_background' : 'tab_hidden', since, duration);
  }

  private closeFullscreenExit(t: number): void {
    const since = this.fullscreenExitSince;
    this.fullscreenExitSince = null;
    if (since !== null) this.emit('fullscreen_exit', since, t - since);
  }

  private emit(kind: ProctorEventKind, atMs: number, durationMs?: number): void {
    const kindCount = this.counts[kind] ?? 0;
    if (this.emittedTotal >= MAX_EVENTS_PER_ATTEMPT || kindCount >= MAX_EVENTS_PER_KIND) {
      this.dropped += 1;
      return;
    }
    this.counts[kind] = kindCount + 1;
    this.emittedTotal += 1;
    const event: ProctorEvent = { kind, atMs: Math.max(0, Math.round(atMs)) };
    if (durationMs !== undefined) event.durationMs = Math.max(0, Math.round(durationMs));
    this.undrained.push(event);
  }
}
