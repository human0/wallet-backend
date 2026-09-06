import cors from '@fastify/cors';
import Fastify, { type FastifyInstance, type FastifyReply } from 'fastify';
import { z } from 'zod';
import { GetBalance } from './application/get-balance.js';
import { WalletNotFoundError } from './application/errors.js';
import { WithdrawFunds } from './application/withdraw-funds.js';
import { InsufficientFundsError, InvalidMoneyError } from './domain/errors.js';
import { Money } from './domain/money.js';

export type AppDependencies = {
  getBalance: GetBalance;
  withdrawFunds: WithdrawFunds;
};

const walletParamsSchema = z.object({ walletId: z.string().min(1) });
const withdrawalBodySchema = z.object({
  amount: z.string().regex(/^\d+(?:\.\d{1,2})?$/, {
    message: 'Amount must be a decimal string with up to two places',
  }),
});

export const buildServer = async (
  dependencies?: AppDependencies,
): Promise<FastifyInstance> => {
  const server = Fastify({ logger: true });

  await server.register(cors, { origin: true });

  server.get('/health', async () => ({ status: 'ok' }));

  if (dependencies) {
    registerWalletRoutes(server, dependencies);
  }

  return server;
};

const registerWalletRoutes = (
  server: FastifyInstance,
  dependencies: AppDependencies,
): void => {
  server.get('/wallets/:walletId/balance', async (request, reply) => {
    const params = walletParamsSchema.safeParse(request.params);

    if (!params.success) {
      return badRequest(reply, 'Wallet ID is required');
    }

    try {
      const wallet = dependencies.getBalance.execute(params.data.walletId);

      return reply.send({
        walletId: wallet.id,
        currency: 'ZAR',
        balance: wallet.balance.toDecimalString(),
      });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  server.post('/wallets/:walletId/withdrawals', async (request, reply) => {
    const params = walletParamsSchema.safeParse(request.params);
    const body = withdrawalBodySchema.safeParse(request.body);

    if (!params.success || !body.success) {
      return badRequest(
        reply,
        body.success
          ? 'Wallet ID is required'
          : (body.error.issues[0]?.message ?? 'Invalid request'),
      );
    }

    try {
      const result = dependencies.withdrawFunds.execute(
        params.data.walletId,
        Money.fromDecimalString(body.data.amount),
      );

      return reply.code(201).send({
        walletId: params.data.walletId,
        amount: result.amount.toDecimalString(),
        remainingBalance: result.remainingBalance.toDecimalString(),
        status: 'completed',
      });
    } catch (error) {
      return sendError(reply, error);
    }
  });
};

const badRequest = (reply: FastifyReply, message: string): unknown =>
  reply.code(400).send({ error: 'INVALID_REQUEST', message });

const sendError = (reply: FastifyReply, error: unknown): unknown => {
  if (error instanceof WalletNotFoundError) {
    return reply
      .code(404)
      .send({ error: 'WALLET_NOT_FOUND', message: error.message });
  }

  if (error instanceof InsufficientFundsError) {
    return reply
      .code(409)
      .send({ error: 'INSUFFICIENT_FUNDS', message: error.message });
  }

  if (error instanceof InvalidMoneyError) {
    return badRequest(reply, 'Invalid amount');
  }

  throw error;
};
