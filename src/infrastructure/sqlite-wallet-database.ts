import SqliteDatabase from 'better-sqlite3';
import {
  type TransactionRunner,
  type WalletRepository,
  type WithdrawalEvent,
  type WithdrawalEventRepository,
} from '../application/ports.js';
import { Money } from '../domain/money.js';
import { Wallet } from '../domain/wallet.js';

type WalletRow = {
  id: string;
  currency: 'ZAR';
  balance_minor: number;
};

type EventRow = {
  id: string;
  wallet_id: string;
  amount_minor: number;
  currency: 'ZAR';
  occurred_at: string;
};

const INITIAL_WALLET_ID = 'wallet-001';
const INITIAL_BALANCE_MINOR = 100000;

export class SqliteWalletDatabase
  implements WalletRepository, WithdrawalEventRepository, TransactionRunner
{
  private readonly connection: SqliteDatabase.Database;

  constructor(filename: string) {
    this.connection = new SqliteDatabase(filename);
    this.connection.pragma('foreign_keys = ON');
    this.createSchema();
    this.seedWallet();
  }

  public findById(walletId: string): Wallet | undefined {
    const row = this.connection
      .prepare(
        'SELECT id, currency, balance_minor FROM wallets WHERE id = @walletId',
      )
      .get({ walletId }) as WalletRow | undefined;

    if (!row) {
      return undefined;
    }

    return new Wallet(row.id, Money.fromMinorUnits(row.balance_minor));
  }

  public save(wallet: Wallet): void {
    const result = this.connection
      .prepare(
        `UPDATE wallets
         SET balance_minor = @balanceMinor
         WHERE id = @walletId`,
      )
      .run({
        walletId: wallet.id,
        balanceMinor: wallet.balance.minorUnits,
      });

    if (result.changes !== 1) {
      throw new Error(`Wallet could not be saved: ${wallet.id}`);
    }
  }

  public append(event: WithdrawalEvent): void {
    this.connection
      .prepare(
        `INSERT INTO outbox_events
          (id, wallet_id, amount_minor, currency, occurred_at)
         VALUES
          (@id, @walletId, @amountMinor, @currency, @occurredAt)`,
      )
      .run({
        id: event.id,
        walletId: event.walletId,
        amountMinor: event.amountMinor,
        currency: event.currency,
        occurredAt: event.occurredAt.toISOString(),
      });
  }

  public listEvents(): WithdrawalEvent[] {
    return this.queryEvents(
      `SELECT id, wallet_id, amount_minor, currency, occurred_at
       FROM outbox_events
       ORDER BY occurred_at, id`,
    );
  }

  public listPendingEvents(): WithdrawalEvent[] {
    return this.queryEvents(
      `SELECT id, wallet_id, amount_minor, currency, occurred_at
       FROM outbox_events
       WHERE published_at IS NULL
       ORDER BY occurred_at, id`,
    );
  }

  public markEventPublished(eventId: string): void {
    this.connection
      .prepare(
        `UPDATE outbox_events
         SET published_at = @publishedAt
         WHERE id = @eventId`,
      )
      .run({ eventId, publishedAt: new Date().toISOString() });
  }

  public run<T>(operation: () => T): T {
    const transaction = this.connection.transaction(operation);
    return transaction();
  }

  public close(): void {
    this.connection.close();
  }

  private queryEvents(sql: string): WithdrawalEvent[] {
    const rows = this.connection.prepare(sql).all() as EventRow[];

    return rows.map((row) => ({
      id: row.id,
      walletId: row.wallet_id,
      amountMinor: row.amount_minor,
      currency: row.currency,
      occurredAt: new Date(row.occurred_at),
    }));
  }

  private createSchema(): void {
    this.connection.exec(`
      CREATE TABLE IF NOT EXISTS wallets (
        id TEXT PRIMARY KEY,
        currency TEXT NOT NULL CHECK (currency = 'ZAR'),
        balance_minor INTEGER NOT NULL CHECK (balance_minor >= 0)
      );

      CREATE TABLE IF NOT EXISTS outbox_events (
        id TEXT PRIMARY KEY,
        wallet_id TEXT NOT NULL REFERENCES wallets(id),
        amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
        currency TEXT NOT NULL CHECK (currency = 'ZAR'),
        occurred_at TEXT NOT NULL,
        published_at TEXT
      );
    `);
  }

  private seedWallet(): void {
    this.connection
      .prepare(
        `INSERT OR IGNORE INTO wallets (id, currency, balance_minor)
         VALUES (@walletId, 'ZAR', @balanceMinor)`,
      )
      .run({
        walletId: INITIAL_WALLET_ID,
        balanceMinor: INITIAL_BALANCE_MINOR,
      });
  }
}
