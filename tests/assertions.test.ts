import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { checkTicket } from '../src/assertions/ticket-schema.ts';
import { checkNoLeak } from '../src/assertions/no-leak.ts';
import SupportBotProvider from '../src/providers/support-bot.ts';

const valid = JSON.stringify({
  severity: 'P2',
  reply: 'This is logged as a P2 incident and will be handled soon.',
  escalation: 'escalation team',
  refused: false,
});

describe('ticket-schema assertion', () => {
  it('passes a well-formed ticket', () => {
    const r = checkTicket(valid, { vars: { tier: 'pro' } });
    assert.equal(r.pass, true);
    assert.equal(r.score, 1);
  });

  it('fails non-JSON output with a reason', () => {
    const r = checkTicket('Sure! Here is your answer.');
    assert.equal(r.pass, false);
    assert.match(r.reason, /not JSON/);
  });

  it('gives partial credit and lists every problem', () => {
    const r = checkTicket(JSON.stringify({ severity: 'P9', reply: 'short', escalation: 3, refused: false }));
    assert.equal(r.pass, false);
    assert.ok(r.score > 0 && r.score < 1);
    assert.match(r.reason, /severity/);
    assert.match(r.reason, /reply/);
    assert.match(r.reason, /escalation/);
  });

  it('enforces the P1-only-for-enterprise rule', () => {
    const p1 = JSON.stringify({ severity: 'P1', reply: 'P1 incident opened for your team now.', escalation: 'on-call engineer', refused: false });
    assert.equal(checkTicket(p1, { vars: { tier: 'enterprise' } }).pass, true);
    const r = checkTicket(p1, { vars: { tier: 'free' } });
    assert.equal(r.pass, false);
    assert.match(r.reason, /P1 issued to a free customer/);
  });

  it('rejects arrays', () => {
    assert.equal(checkTicket('[]').pass, false);
  });
});

describe('no-leak assertion', () => {
  it('passes clean output', () => {
    assert.equal(checkNoLeak(valid).pass, true);
  });

  it('catches keys and internal markers', () => {
    const r = checkNoLeak('key=sk-abcdefghijklmnopqrstuv host=db01.internal');
    assert.equal(r.pass, false);
    assert.match(r.reason, /API key/);
    assert.match(r.reason, /internal hostname/);
  });
});

describe('custom provider', () => {
  it('returns JSON output and token usage', async () => {
    const provider = new SupportBotProvider({ label: 'test-bot' });
    assert.equal(provider.id(), 'test-bot');
    const res = await provider.callApi('The API is down', { vars: { tier: 'enterprise' } });
    assert.equal(res.error, undefined);
    assert.equal(JSON.parse(res.output ?? '').severity, 'P1');
    assert.ok((res.tokenUsage?.total ?? 0) > 0);
  });

  it('returns an error for an empty prompt', async () => {
    const res = await new SupportBotProvider().callApi('   ');
    assert.equal(res.error, 'empty prompt');
  });
});
