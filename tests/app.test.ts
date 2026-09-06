import { afterEach, describe, expect, it } from 'vitest';
import { buildServer } from '../src/app.js';

const servers = new Set<Awaited<ReturnType<typeof buildServer>>>();

afterEach(async () => {
  await Promise.all([...servers].map((server) => server.close()));
  servers.clear();
});

describe('health endpoint', () => {
  it('reports that the service is available', async () => {
    const server = await buildServer();
    servers.add(server);

    const response = await server.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });
});
