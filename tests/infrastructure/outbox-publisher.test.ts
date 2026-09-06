import { afterEach, describe, expect, it } from 'vitest';
import { SqliteWalletDatabase } from '../../src/infrastructure/sqlite-wallet-database.js';
import { OutboxPublisher } from '../../src/infrastructure/outbox-publisher.js';

const databases = new Set<SqliteWalletDatabase>();

afterEach(() => {
  for (const database of databases) {
    database.close();
  }
  databases.clear();
});

const createDatabase = () => {
  const database = new SqliteWalletDatabase(':memory:');
  databases.add(database);
  return database;
};

describe('OutboxPublisher', () => {
  it('publishes pending events and marks them published', async () => {
    const database = createDatabase();
    database.append({
      id: 'event-001',
      walletId: 'wallet-001',
      amountMinor: 25000,
      currency: 'ZAR',
      occurredAt: new Date('2026-09-06T12:00:00.000Z'),
    });
    const published: string[] = [];
    const publisher = new OutboxPublisher(database, async (event) => {
      published.push(event.id);
    });

    await publisher.publishPending();

    expect(published).toEqual(['event-001']);
    expect(database.listPendingEvents()).toHaveLength(0);
  });

  it('leaves failed events pending for retry on the next poll', async () => {
    const database = createDatabase();
    database.append({
      id: 'event-001',
      walletId: 'wallet-001',
      amountMinor: 25000,
      currency: 'ZAR',
      occurredAt: new Date('2026-09-06T12:00:00.000Z'),
    });
    const publisher = new OutboxPublisher(database, async () => {
      throw new Error('event sink unavailable');
    });

    await publisher.publishPending();

    expect(database.listPendingEvents()).toHaveLength(1);
  });

  it('keeps publishing later events after an earlier one fails', async () => {
    const database = createDatabase();
    database.append({
      id: 'event-001',
      walletId: 'wallet-001',
      amountMinor: 25000,
      currency: 'ZAR',
      occurredAt: new Date('2026-09-06T12:00:00.000Z'),
    });
    database.append({
      id: 'event-002',
      walletId: 'wallet-001',
      amountMinor: 10000,
      currency: 'ZAR',
      occurredAt: new Date('2026-09-06T12:00:01.000Z'),
    });
    database.append({
      id: 'event-003',
      walletId: 'wallet-001',
      amountMinor: 5000,
      currency: 'ZAR',
      occurredAt: new Date('2026-09-06T12:00:02.000Z'),
    });
    const published: string[] = [];
    const publisher = new OutboxPublisher(database, async (event) => {
      if (event.id === 'event-002') {
        throw new Error('event sink unavailable');
      }
      published.push(event.id);
    });

    await publisher.publishPending();

    expect(published).toEqual(['event-001', 'event-003']);
    expect(database.listPendingEvents()).toEqual([
      expect.objectContaining({ id: 'event-002' }),
    ]);
  });
});
