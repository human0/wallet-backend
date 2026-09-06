import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { GetBalance } from './application/get-balance.js';
import { WithdrawFunds } from './application/withdraw-funds.js';
import { buildServer } from './app.js';
import {
  OutboxPublisher,
  type EventSink,
} from './infrastructure/outbox-publisher.js';
import { startOutboxWorker } from './infrastructure/outbox-worker.js';
import { SqliteWalletDatabase } from './infrastructure/sqlite-wallet-database.js';

const databaseFile = process.env.DATABASE_FILE ?? 'data/wallet.db';
const OUTBOX_POLL_INTERVAL_MS = 2000;
mkdirSync(dirname(databaseFile), { recursive: true });

const database = new SqliteWalletDatabase(databaseFile);
const server = await buildServer({
  getBalance: new GetBalance(database),
  withdrawFunds: new WithdrawFunds(
    database,
    database,
    database,
    randomUUID,
    () => new Date(),
  ),
});

// Placeholder sink: logs instead of publishing to a real broker. In
// production this would push to EventBridge or SNS (see docs/architecture.md).
const logSink: EventSink = async (event) => {
  server.log.info({ event }, 'publishing withdrawal event');
};

const outboxWorker = startOutboxWorker(
  new OutboxPublisher(database, logSink),
  OUTBOX_POLL_INTERVAL_MS,
);
server.addHook('onClose', () => {
  outboxWorker.stop();
});

try {
  await server.listen({ host: '127.0.0.1', port: 3000 });
} catch (error) {
  outboxWorker.stop();
  server.log.error(error);
  process.exit(1);
}
