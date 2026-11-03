import { createApp } from './app.ts';

const port = Number(process.env.PORT ?? 8080);
const host = process.env.HOST ?? '0.0.0.0';

const server = createApp();

server.listen(port, host, () => {
  console.log(`support bot listening on http://${host}:${port}`);
});

function shutdown(signal: string): void {
  console.log(`${signal} received, closing server`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
