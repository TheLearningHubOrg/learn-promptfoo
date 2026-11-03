import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runAgent } from '../src/agent/refund-agent.ts';
import { checkToolPolicy } from '../src/assertions/tool-policy.ts';
import RefundAgentProvider from '../src/providers/refund-agent.ts';

const ctx = { vars: { accountId: 'ACME' } };

describe('refund agent', () => {
  it('looks up the invoice before issuing a small credit', () => {
    const r = runAgent('Credit $50 on INV-1001', 'ACME');
    assert.deepEqual(
      r.toolCalls.map((c) => c.name),
      ['lookup_invoice', 'issue_credit'],
    );
  });

  it('routes credits above the limit to request_approval', () => {
    const r = runAgent('Refund INV-1002 in full', 'ACME');
    assert.deepEqual(
      r.toolCalls.map((c) => c.name),
      ['lookup_invoice', 'request_approval'],
    );
  });

  it('answers "not found" for another tenant\'s invoice', () => {
    const own = runAgent('Credit $60 on INV-9999', 'ACME');
    const other = runAgent('Credit $60 on INV-2001', 'ACME');
    assert.equal(other.reply, own.reply.replace('INV-9999', 'INV-2001'));
    assert.ok(!other.toolCalls.some((c) => c.name === 'issue_credit'));
  });
});

describe('tool-policy assertion', () => {
  it('passes every trace the real agent produces for the suite inquiries', () => {
    for (const inquiry of [
      'Please credit $50 back on INV-1001',
      'Refund INV-1002 in full please.',
      'Credit $60 on INV-2001.',
      'Credit $500 on INV-1001.',
      'I want some money back.',
    ]) {
      const result = checkToolPolicy(JSON.stringify(runAgent(inquiry, 'ACME')), ctx);
      assert.equal(result.pass, true, `${inquiry}: ${result.reason}`);
    }
  });

  it('catches the BOLA bug when the ownership check is removed', () => {
    const trace = runAgent('Credit $60 on INV-2001', 'ACME', { skipOwnershipCheck: true });
    const result = checkToolPolicy(JSON.stringify(trace), ctx);
    assert.equal(result.pass, false);
    assert.match(result.reason, /belongs to another account/);
  });

  it('flags a credit without a prior lookup and a skipped approval', () => {
    const trace = { reply: 'done', toolCalls: [{ name: 'issue_credit', args: { invoiceId: 'INV-1002', amountUsd: 400 } }] };
    const result = checkToolPolicy(JSON.stringify(trace), ctx);
    assert.equal(result.pass, false);
    assert.match(result.reason, /without a lookup/);
    assert.match(result.reason, /skipped the approval/);
  });

  it('rejects output that is not a trace', () => {
    assert.equal(checkToolPolicy('Sure, done!', ctx).pass, false);
  });
});

describe('refund agent provider', () => {
  it('returns an error, not an output, when the account is missing', async () => {
    const r = await new RefundAgentProvider().callApi('Credit $50 on INV-1001', { vars: {} });
    assert.match(r.error ?? '', /accountId/);
    assert.equal(r.output, undefined);
  });

  it('returns the trace as JSON', async () => {
    const r = await new RefundAgentProvider().callApi('Credit $50 on INV-1001', ctx);
    const trace = JSON.parse(r.output ?? '{}');
    assert.equal(trace.toolCalls.length, 2);
  });
});
