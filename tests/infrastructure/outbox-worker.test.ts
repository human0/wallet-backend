import { afterEach, describe, expect, it, vi } from 'vitest';
import { startOutboxWorker } from '../../src/infrastructure/outbox-worker.js';

describe('startOutboxWorker', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('polls the publisher on the configured interval until stopped', async () => {
    vi.useFakeTimers();
    let callCount = 0;
    const publisher = {
      publishPending: async () => {
        callCount += 1;
      },
    };

    const worker = startOutboxWorker(publisher, 1000);
    await vi.advanceTimersByTimeAsync(3500);
    worker.stop();
    await vi.advanceTimersByTimeAsync(5000);

    expect(callCount).toBe(3);
  });

  it('keeps polling on the next interval even if one poll rejects', async () => {
    vi.useFakeTimers();
    let callCount = 0;
    const publisher = {
      publishPending: async () => {
        callCount += 1;
        throw new Error('sink unavailable');
      },
    };

    const worker = startOutboxWorker(publisher, 1000);
    await vi.advanceTimersByTimeAsync(2500);
    worker.stop();

    expect(callCount).toBe(2);
  });
});
