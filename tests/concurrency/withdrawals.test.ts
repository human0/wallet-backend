import { afterEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { GetBalance } from '../../src/application/get-balance.js';
import { WithdrawFunds } from '../../src/application/withdraw-funds.js';
import { InsufficientFundsError } from '../../src/domain/errors.js';
import { Money } from '../../src/domain/money.js';
import { SqliteWalletDatabase } from '../../src/infrastructure/sqlite-wallet-database.js';

const databases = new Set<SqliteWalletDatabase>();

afterEach(() => {
  for (const database of databases) {
    database.close();
  }
  databases.clear();
});

describe('concurrent withdrawals', () => {
  it('never allows the wallet balance to go negative under overlapping withdrawal attempts', async () => {
    const database = new SqliteWalletDatabase(':memory:');
    databases.add(database);
    const withdrawFunds = new WithdrawFunds(
      database,
      database,
      database,
      randomUUID,
      () => new Date(),
    );

    // Seeded wallet starts at 1000.00. Fire 20 overlapping withdrawals of
    // 100.00 each - 2000.00 total demand against 1000.00 available - so
    // at most 10 can legitimately succeed.
    const attempts = Array.from({ length: 20 }, () =>
      Promise.resolve().then(() => {
        try {
          return withdrawFunds.execute(
            'wallet-001',
            Money.fromDecimalString('100.00'),
          );
        } catch (error) {
          if (error instanceof InsufficientFundsError) {
            return null;
          }
          throw error;
        }
      }),
    );

    const results = await Promise.all(attempts);
    const succeeded = results.filter((result) => result !== null);

    const finalBalance = new GetBalance(database).execute('wallet-001')
      .balance;

    expect(succeeded).toHaveLength(10);
    expect(finalBalance.minorUnits).toBeGreaterThanOrEqual(0);
    expect(finalBalance.toDecimalString()).toBe('0.00');
  });
});
