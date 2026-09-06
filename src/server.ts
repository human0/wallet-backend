import { buildServer } from './app.js';

const server = await buildServer();

try {
  await server.listen({ host: '127.0.0.1', port: 3000 });
} catch (error) {
  server.log.error(error);
  process.exit(1);
}
