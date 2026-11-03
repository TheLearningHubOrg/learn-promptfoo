import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { answer, isTier } from './support-bot.ts';

export const MAX_BODY_BYTES = 16 * 1024;
export const MAX_INQUIRY_CHARS = 2000;

class HttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = chunk as Buffer;
    size += buf.length;
    if (size > MAX_BODY_BYTES) throw new HttpError(413, 'request body too large');
    chunks.push(buf);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'body must be valid JSON');
  }
}

function validateChat(body: unknown): { inquiry: string; tier: 'free' | 'pro' | 'enterprise' } {
  if (typeof body !== 'object' || body === null) throw new HttpError(400, 'body must be an object');
  const { inquiry, tier = 'free' } = body as Record<string, unknown>;
  if (typeof inquiry !== 'string' || inquiry.trim() === '') {
    throw new HttpError(400, 'inquiry must be a non-empty string');
  }
  if (inquiry.length > MAX_INQUIRY_CHARS) {
    throw new HttpError(400, `inquiry must be at most ${MAX_INQUIRY_CHARS} characters`);
  }
  if (!isTier(tier)) throw new HttpError(400, 'tier must be free, pro or enterprise');
  return { inquiry, tier };
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost');

  if (url.pathname === '/health') {
    if (req.method !== 'GET') throw new HttpError(405, 'method not allowed');
    sendJson(res, 200, { status: 'ok' });
    return;
  }

  if (url.pathname === '/chat') {
    if (req.method !== 'POST') throw new HttpError(405, 'method not allowed');
    const { inquiry, tier } = validateChat(await readJson(req));
    sendJson(res, 200, answer(inquiry, tier));
    return;
  }

  throw new HttpError(404, 'not found');
}

export function createApp(): Server {
  return createServer((req, res) => {
    handle(req, res).catch((err: unknown) => {
      const status = err instanceof HttpError ? err.status : 500;
      const message = err instanceof HttpError ? err.message : 'internal error';
      if (status === 500) console.error(err);
      if (!res.headersSent) sendJson(res, status, { error: message });
      else res.end();
    });
  });
}
