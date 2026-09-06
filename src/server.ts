import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { GetBalance } from './application/get-balance.js';
import { WithdrawFunds } from './application/withdraw-funds.js';
import { buildServer } from './app.js';
import { SqliteWalletDatabase } from './infrastructure/sqlite-wallet-database.js';

const databaseFile = process.env.DATABASE_FILE ?? 'data/wallet.db';
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

try {
  await server.listen({ host: '127.0.0.1', port: 3000 });
} catch (error) {
  server.log.error(error);
  process.exit(1);
}
