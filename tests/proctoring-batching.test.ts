import { describe, expect, it, vi } from 'vitest';
import { chunk, EventBatcher } from '@/lib/proctoring/batching';
import { meetsMinFps } from '@/lib/proctoring/mediapipe';
import { MAX_EVENTS_PER_ATTEMPT, MAX_EVENTS_PER_BATCH } from '@/lib/proctoring/constants';
import type { ProctorEvent } from '@/lib/proctoring/types';

const events = (n: number): ProctorEvent[] =>
  Array.from({ length: n }, (_, i) => ({ kind: 'copy_paste', atMs: i * 1000 }));

describe('chunk', () => {
  it('splits into groups of at most size', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 20)).toEqual([]);
  });
});

describe('EventBatcher', () => {
  it('sends at most 20 events per batch', async () => {
    const send = vi.fn();
    const b = new EventBatcher(send);
    b.add(events(45));
    await b.flush();
    expect(send.mock.calls.map(([batch]) => batch.length)).toEqual([20, 20, 5]);
    expect(MAX_EVENTS_PER_BATCH).toBe(20);
  });

  it('does not send when empty and clears after a successful flush', async () => {
    const send = vi.fn();
    const b = new EventBatcher(send);
    await b.flush();
    b.add(events(3));
    await b.flush();
    await b.flush();
    expect(send).toHaveBeenCalledTimes(1);
    expect(b.size).toBe(0);
  });

  it('keeps unsent events when a send fails and retries them in order', async () => {
    const send = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
    const b = new EventBatcher(send);
    b.add(events(25));
    await b.flush();
    expect(b.size).toBe(25);
    await b.flush();
    expect(send.mock.calls[1][0][0].atMs).toBe(0);
    expect(b.size).toBe(0);
  });

  it('never queues more than the per-attempt cap', () => {
    const b = new EventBatcher(vi.fn());
    b.add(events(MAX_EVENTS_PER_ATTEMPT + 50));
    expect(b.size).toBe(MAX_EVENTS_PER_ATTEMPT);
  });

  it('serializes overlapping flushes', async () => {
    const order: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const send = vi.fn(async (batch: ProctorEvent[]) => {
      order.push(`start${batch.length}`);
      if (batch.length === 1) await gate;
      order.push(`end${batch.length}`);
    });
    const b = new EventBatcher(send);
    b.add(events(1));
    const first = b.flush();
    await Promise.resolve();
    await Promise.resolve();
    b.add(events(2));
    const second = b.flush();
    release();
    await Promise.all([first, second]);
    expect(order).toEqual(['start1', 'end1', 'start2', 'end2']);
  });
});

describe('meetsMinFps', () => {
  it('accepts >= 1 fps and rejects slower detection', () => {
    expect(meetsMinFps(5, 5000)).toBe(true);
    expect(meetsMinFps(4, 5000)).toBe(false);
    expect(meetsMinFps(0, 0)).toBe(true);
  });
});
