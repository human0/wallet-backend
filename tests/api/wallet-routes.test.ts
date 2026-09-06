import { afterEach, describe, expect, it } from 'vitest';
import { GetBalance } from '../../src/application/get-balance.js';
import { WithdrawFunds } from '../../src/application/withdraw-funds.js';
import { buildServer } from '../../src/app.js';
import { SqliteWalletDatabase } from '../../src/infrastructure/sqlite-wallet-database.js';

const databases = new Set<SqliteWalletDatabase>();
const servers = new Set<Awaited<ReturnType<typeof buildServer>>>();

afterEach(async () => {
  await Promise.all([...servers].map((server) => server.close()));
  servers.clear();

  for (const database of databases) {
    database.close();
  }
  databases.clear();
});

const createServer = async () => {
  const database = new SqliteWalletDatabase(':memory:');
  databases.add(database);
  const server = await buildServer({
    getBalance: new GetBalance(database),
    withdrawFunds: new WithdrawFunds(
      database,
      database,
      database,
      () => 'event-001',
      () => new Date('2026-09-06T12:00:00.000Z'),
    ),
  });
  servers.add(server);
  return server;
};

describe('wallet routes', () => {
  it('returns the seeded wallet balance', async () => {
    const server = await createServer();

    const response = await server.inject({
      method: 'GET',
      url: '/wallets/wallet-001/balance',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      walletId: 'wallet-001',
      currency: 'ZAR',
      balance: '1000.00',
    });
  });

  it('withdraws funds and returns the remaining balance', async () => {
    const server = await createServer();

    const response = await server.inject({
      method: 'POST',
      url: '/wallets/wallet-001/withdrawals',
      payload: { amount: '250.00' },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      walletId: 'wallet-001',
      amount: '250.00',
      remainingBalance: '750.00',
      status: 'completed',
    });
  });

  it('returns a conflict when funds are insufficient', async () => {
    const server = await createServer();

    const response = await server.inject({
      method: 'POST',
      url: '/wallets/wallet-001/withdrawals',
      payload: { amount: '1000.01' },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: 'INSUFFICIENT_FUNDS',
      message: 'Insufficient funds',
    });
  });

  it('rejects malformed withdrawal amounts', async () => {
    const server = await createServer();

    const response = await server.inject({
      method: 'POST',
      url: '/wallets/wallet-001/withdrawals',
      payload: { amount: '10.999' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: 'INVALID_REQUEST',
      message: 'Amount must be a decimal string with up to two places',
    });
  });

  it('returns not found for an unknown wallet', async () => {
    const server = await createServer();

    const response = await server.inject({
      method: 'GET',
      url: '/wallets/missing-wallet/balance',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: 'WALLET_NOT_FOUND',
      message: 'Wallet not found: missing-wallet',
    });
  });
});
