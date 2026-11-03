import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { diffRuns, gateExitCode, percentile, readCells, summarize, toMarkdown } from '../src/report/summary.ts';

/** Builds a minimal promptfoo output document with one row per entry. */
function outputFile(rows: Array<{ desc: string; success: boolean; error?: string; latencyMs?: number; safety?: number }>) {
  return {
    evalId: 'eval-test',
    results: {
      results: rows.map((r) => ({
        provider: { id: 'file://src/providers/support-bot.ts', label: 'support-bot-local' },
        testCase: { description: r.desc, vars: {} },
        success: r.success,
        score: r.success ? 1 : 0,
        error: r.error,
        latencyMs: r.latencyMs ?? 10,
        cost: 0.001,
        namedScores: { safety: r.safety ?? 1 },
        gradingResult: { pass: r.success, reason: r.success ? 'ok' : 'expected refused=true' },
      })),
    },
  };
}

describe('readCells', () => {
  it('keys cells by provider label and description', () => {
    const [cell] = readCells(outputFile([{ desc: 'refund refused', success: true }]));
    assert.equal(cell.key, 'support-bot-local :: refund refused');
    assert.equal(cell.pass, true);
  });

  it('rejects files that are not promptfoo output', () => {
    assert.throws(() => readCells({ hello: 'world' }), /missing results/);
  });
});

describe('summarize', () => {
  it('counts passes, failures and errors separately', () => {
    const s = summarize(
      readCells(
        outputFile([
          { desc: 'a', success: true },
          { desc: 'b', success: false },
          { desc: 'c', success: false, error: 'HTTP 503' },
        ]),
      ),
    );
    assert.deepEqual([s.total, s.passed, s.failed, s.errors], [3, 1, 1, 1]);
    assert.equal(Math.round(s.costUsd * 1000), 3);
  });

  it('averages named metrics', () => {
    const s = summarize(
      readCells(
        outputFile([
          { desc: 'a', success: true, safety: 1 },
          { desc: 'b', success: false, safety: 0 },
        ]),
      ),
    );
    assert.equal(s.metrics.safety, 0.5);
  });

  it('computes a nearest-rank p95', () => {
    const values = Array.from({ length: 20 }, (_, i) => i + 1);
    assert.equal(percentile(values, 95), 19);
    assert.equal(percentile([], 95), 0);
  });
});

describe('diffRuns and the gate', () => {
  const base = readCells(
    outputFile([
      { desc: 'a', success: true },
      { desc: 'b', success: false },
      { desc: 'gone', success: true },
    ]),
  );
  const head = readCells(
    outputFile([
      { desc: 'a', success: false },
      { desc: 'b', success: true },
      { desc: 'new', success: true },
    ]),
  );

  it('classifies every cell', () => {
    const d = diffRuns(base, head);
    assert.deepEqual(d.newlyFailing.map((c) => c.description), ['a']);
    assert.deepEqual(d.fixed.map((c) => c.description), ['b']);
    assert.deepEqual(d.added.map((c) => c.description), ['new']);
    assert.deepEqual(d.removed.map((c) => c.description), ['gone']);
  });

  it('fails the gate on a new failure even when the pass rate meets the floor', () => {
    const d = diffRuns(base, head);
    assert.equal(gateExitCode(summarize(head), d, { minPassRate: 0.5 }), 100);
    assert.equal(gateExitCode(summarize(head), null, { minPassRate: 0.5 }), 0);
  });

  it('treats errors and empty runs as unusable (exit 1)', () => {
    const errored = summarize(readCells(outputFile([{ desc: 'a', success: false, error: 'timeout' }])));
    assert.equal(gateExitCode(errored, null), 1);
    assert.equal(gateExitCode(summarize([]), null), 1);
  });

  it('renders a Markdown summary with the diff sections', () => {
    const md = toMarkdown(summarize(head), diffRuns(base, head));
    assert.match(md, /2\/3 passed/);
    assert.match(md, /\*\*Newly failing \(1\)\*\*/);
    assert.match(md, /\| safety \|/);
  });
});
