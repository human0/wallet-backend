import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';

export const buildServer = async (): Promise<FastifyInstance> => {
  const server = Fastify({ logger: true });

  await server.register(cors, { origin: true });

  server.get('/health', async () => ({ status: 'ok' }));

  return server;
};
