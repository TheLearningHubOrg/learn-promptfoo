/**
 * Summarises a Promptfoo output file (`promptfoo eval -o results.json`) and
 * compares it with a baseline run, for PR comments and CI gates.
 *
 * Only the fields used here are typed; everything is read defensively so a
 * new field or a missing one in a future output version does not crash CI.
 */

export interface Cell {
  /** Stable identity across runs: provider plus test description (or vars). */
  key: string;
  provider: string;
  description: string;
  pass: boolean;
  error: boolean;
  score: number;
  reason: string;
  latencyMs: number;
  costUsd: number;
  namedScores: Record<string, number>;
}

export interface RunSummary {
  total: number;
  passed: number;
  failed: number;
  errors: number;
  passRate: number;
  costUsd: number;
  p95LatencyMs: number;
  /** Mean score per named metric (the `metric:` field on assertions). */
  metrics: Record<string, number>;
}

export interface RunDiff {
  newlyFailing: Cell[];
  fixed: Cell[];
  stillFailing: Cell[];
  added: Cell[];
  removed: Cell[];
}

type Json = Record<string, unknown>;

const asObject = (value: unknown): Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Json) : {};
const asNumber = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);
const asString = (value: unknown): string => (typeof value === 'string' ? value : '');

/** Extracts one Cell per (prompt, provider, test) result from a parsed output file. */
export function readCells(doc: unknown): Cell[] {
  const rows = asObject(asObject(doc).results).results;
  if (!Array.isArray(rows)) throw new Error('not a promptfoo output file: missing results.results[]');

  return rows.map((raw) => {
    const row = asObject(raw);
    const provider = asObject(row.provider);
    const testCase = asObject(row.testCase);
    const grading = asObject(row.gradingResult);
    const providerName = asString(provider.label) || asString(provider.id) || 'unknown-provider';
    const description =
      asString(testCase.description) || asString(row.description) || JSON.stringify(testCase.vars ?? row.vars ?? {});
    const error = asString(row.error);
    const namedScores: Record<string, number> = {};
    for (const [name, score] of Object.entries(asObject(row.namedScores))) namedScores[name] = asNumber(score);

    return {
      key: `${providerName} :: ${description}`,
      provider: providerName,
      description,
      pass: row.success === true,
      error: error !== '',
      score: asNumber(row.score),
      reason: error || asString(grading.reason),
      latencyMs: asNumber(row.latencyMs),
      costUsd: asNumber(row.cost),
      namedScores,
    };
  });
}

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)];
}

export function summarize(cells: Cell[]): RunSummary {
  const errors = cells.filter((c) => c.error).length;
  const passed = cells.filter((c) => c.pass).length;
  const sums: Record<string, { total: number; count: number }> = {};
  for (const cell of cells) {
    for (const [name, score] of Object.entries(cell.namedScores)) {
      const entry = (sums[name] ??= { total: 0, count: 0 });
      entry.total += score;
      entry.count += 1;
    }
  }
  const metrics: Record<string, number> = {};
  for (const [name, { total, count }] of Object.entries(sums)) metrics[name] = total / count;

  return {
    total: cells.length,
    passed,
    failed: cells.length - passed - errors,
    errors,
    passRate: cells.length === 0 ? 0 : passed / cells.length,
    costUsd: cells.reduce((sum, c) => sum + c.costUsd, 0),
    p95LatencyMs: percentile(
      cells.map((c) => c.latencyMs),
      95,
    ),
    metrics,
  };
}

/** Compares two runs cell by cell. A cell "fails" when it did not pass (assertion failure or error). */
export function diffRuns(base: Cell[], head: Cell[]): RunDiff {
  const baseByKey = new Map(base.map((c) => [c.key, c]));
  const headKeys = new Set(head.map((c) => c.key));
  const diff: RunDiff = { newlyFailing: [], fixed: [], stillFailing: [], added: [], removed: [] };

  for (const cell of head) {
    const before = baseByKey.get(cell.key);
    if (!before) diff.added.push(cell);
    else if (before.pass && !cell.pass) diff.newlyFailing.push(cell);
    else if (!before.pass && cell.pass) diff.fixed.push(cell);
    else if (!before.pass && !cell.pass) diff.stillFailing.push(cell);
  }
  for (const cell of base) if (!headKeys.has(cell.key)) diff.removed.push(cell);
  return diff;
}

export interface GateOptions {
  /** Minimum pass rate, 0..1. Default 1: every cell must pass. */
  minPassRate?: number;
}

/**
 * Exit code for CI, mirroring promptfoo's own convention:
 * 0 = gate passed, 100 = quality failure, 1 = the run itself is unusable.
 */
export function gateExitCode(summary: RunSummary, diff: RunDiff | null, options: GateOptions = {}): number {
  if (summary.total === 0) return 1;
  if (summary.errors > 0) return 1;
  if (diff && diff.newlyFailing.length > 0) return 100;
  return summary.passRate >= (options.minPassRate ?? 1) ? 0 : 100;
}

const pct = (ratio: number): string => `${(ratio * 100).toFixed(1)}%`;

export function toMarkdown(summary: RunSummary, diff: RunDiff | null = null): string {
  const lines = [
    `### Promptfoo eval: ${summary.passed}/${summary.total} passed (${pct(summary.passRate)})`,
    '',
    `| Failed | Errors | Cost (USD) | p95 latency |`,
    `| --- | --- | --- | --- |`,
    `| ${summary.failed} | ${summary.errors} | ${summary.costUsd.toFixed(4)} | ${summary.p95LatencyMs} ms |`,
  ];
  const metricNames = Object.keys(summary.metrics).sort();
  if (metricNames.length > 0) {
    lines.push('', '| Metric | Mean score |', '| --- | --- |');
    for (const name of metricNames) lines.push(`| ${name} | ${summary.metrics[name].toFixed(2)} |`);
  }
  if (diff) {
    const section = (title: string, cells: Cell[]): void => {
      if (cells.length === 0) return;
      lines.push('', `**${title} (${cells.length})**`, '');
      for (const c of cells) lines.push(`- \`${c.key}\`${c.reason ? `: ${c.reason}` : ''}`);
    };
    section('Newly failing', diff.newlyFailing);
    section('Fixed', diff.fixed);
    section('Still failing', diff.stillFailing);
    section('New cells', diff.added);
    section('Removed cells', diff.removed);
  }
  return lines.join('\n');
}
