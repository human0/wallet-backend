import type { WithdrawalEvent } from '../application/ports.js';
import type { SqliteWalletDatabase } from './sqlite-wallet-database.js';

export type EventSink = (event: WithdrawalEvent) => Promise<void>;

export class OutboxPublisher {
  constructor(
    private readonly database: SqliteWalletDatabase,
    private readonly eventSink: EventSink,
  ) {}

  public async publishPending(): Promise<void> {
    const events = this.database.listPendingEvents();

    for (const event of events) {
      try {
        await this.eventSink(event);
        this.database.markEventPublished(event.id);
      } catch {
        // Left pending: the next poll retries it. One failing event must
        // not block delivery of the others in this batch.
      }
    }
  }
}
