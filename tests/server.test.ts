import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createApp } from '../src/app.ts';

const server = createApp();
let base = '';

before(async () => {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

function post(body: string): Promise<Response> {
  return fetch(`${base}/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body });
}

describe('HTTP server', () => {
  it('GET /health answers ok', async () => {
    const res = await fetch(`${base}/health`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { status: 'ok' });
  });

  it('POST /chat returns a ticket', async () => {
    const res = await post(JSON.stringify({ inquiry: 'Cluster unreachable', tier: 'enterprise' }));
    assert.equal(res.status, 200);
    const body = (await res.json()) as { severity: string };
    assert.equal(body.severity, 'P1');
  });

  it('defaults the tier to free', async () => {
    const res = await post(JSON.stringify({ inquiry: 'Cluster unreachable' }));
    assert.equal(((await res.json()) as { severity: string }).severity, 'P3');
  });

  it('rejects invalid JSON, bad fields and oversized bodies', async () => {
    assert.equal((await post('{nope')).status, 400);
    assert.equal((await post(JSON.stringify({ inquiry: '' }))).status, 400);
    assert.equal((await post(JSON.stringify({ inquiry: 'hi', tier: 'admin' }))).status, 400);
    assert.equal((await post(JSON.stringify({ inquiry: 'x'.repeat(20_000) }))).status, 413);
  });

  it('returns 404 and 405 for unknown routes and methods', async () => {
    assert.equal((await fetch(`${base}/nope`)).status, 404);
    assert.equal((await fetch(`${base}/chat`)).status, 405);
  });
});
