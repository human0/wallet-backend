import { afterEach, describe, expect, it } from 'vitest';
import { Money } from '../../src/domain/money.js';
import { SqliteWalletDatabase } from '../../src/infrastructure/sqlite-wallet-database.js';

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

describe('SqliteWalletDatabase', () => {
  it('seeds the known assessment wallet', () => {
    const database = createDatabase();

    const wallet = database.findById('wallet-001');

    expect(wallet?.balance.toDecimalString()).toBe('1000.00');
  });

  it('persists a balance change and withdrawal event in one transaction', () => {
    const database = createDatabase();
    const wallet = database.findById('wallet-001');

    if (!wallet) {
      throw new Error('Seed wallet was not created');
    }
    wallet.withdraw(Money.fromDecimalString('250.00'));

    database.run(() => {
      database.save(wallet);
      database.append({
        id: 'event-001',
        walletId: 'wallet-001',
        amountMinor: 25000,
        currency: 'ZAR',
        occurredAt: new Date('2026-09-06T12:00:00.000Z'),
      });
    });

    expect(database.findById('wallet-001')?.balance.toDecimalString()).toBe(
      '750.00',
    );
    expect(database.listEvents()).toHaveLength(1);
  });

  it('rolls back a balance update when the transaction fails', () => {
    const database = createDatabase();
    const wallet = database.findById('wallet-001');
    if (!wallet) {
      throw new Error('Seed wallet was not created');
    }
    wallet.withdraw(Money.fromDecimalString('250.00'));

    expect(() =>
      database.run(() => {
        database.save(wallet);
        throw new Error('forced rollback');
      }),
    ).toThrow('forced rollback');

    expect(database.findById('wallet-001')?.balance.toDecimalString()).toBe(
      '1000.00',
    );
  });
});
