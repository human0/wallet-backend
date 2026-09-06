export type PendingEventPublisher = {
  publishPending(): Promise<void>;
};

export type OutboxWorkerHandle = {
  stop(): void;
};

export const startOutboxWorker = (
  publisher: PendingEventPublisher,
  intervalMs: number,
): OutboxWorkerHandle => {
  const timer = setInterval(() => {
    void publisher.publishPending().catch(() => {
      // A failed poll is retried on the next interval; nothing to do here.
    });
  }, intervalMs);

  return {
    stop: () => clearInterval(timer),
  };
};
