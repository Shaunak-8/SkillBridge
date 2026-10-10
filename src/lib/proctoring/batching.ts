import { MAX_EVENTS_PER_ATTEMPT, MAX_EVENTS_PER_BATCH } from './constants';
import type { MaybePromise, ProctorEvent } from './types';

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Queues events and sends them in batches of at most `maxBatch`. Flushes are serialized.
 * If a send fails, the unsent events are kept (bounded) and retried on the next flush.
 */
export class EventBatcher {
  private pending: ProctorEvent[] = [];
  private chain: Promise<void> = Promise.resolve();

  constructor(
    private readonly send: (batch: ProctorEvent[]) => MaybePromise<void>,
    private readonly maxBatch = MAX_EVENTS_PER_BATCH,
    private readonly maxPending = MAX_EVENTS_PER_ATTEMPT,
  ) {}

  get size(): number {
    return this.pending.length;
  }

  add(events: readonly ProctorEvent[]): void {
    this.pending = [...this.pending, ...events].slice(0, this.maxPending);
  }

  flush(): Promise<void> {
    this.chain = this.chain.then(() => this.run());
    return this.chain;
  }

  private async run(): Promise<void> {
    const batches = chunk(this.pending, this.maxBatch);
    this.pending = [];
    for (let i = 0; i < batches.length; i++) {
      try {
        await this.send(batches[i]);
      } catch {
        this.pending = [...batches.slice(i).flat(), ...this.pending].slice(0, this.maxPending);
        return;
      }
    }
  }
}
