/**
 * Usage:
 *   node src/report/main.ts results.json [baseline.json] [--min-pass-rate 0.95]
 *
 * Prints a Markdown summary (and a diff when a baseline is given) to stdout,
 * then exits 0 (gate passed), 100 (quality failure) or 1 (unusable run).
 */
import { readFileSync } from 'node:fs';
import { diffRuns, gateExitCode, readCells, summarize, toMarkdown } from './summary.ts';

function load(path: string) {
  return readCells(JSON.parse(readFileSync(path, 'utf8')));
}

const args = process.argv.slice(2);
const flagIndex = args.indexOf('--min-pass-rate');
const minPassRate = flagIndex === -1 ? 1 : Number(args[flagIndex + 1]);
const files = flagIndex === -1 ? args : args.filter((_, i) => i !== flagIndex && i !== flagIndex + 1);

if (files.length === 0 || Number.isNaN(minPassRate)) {
  console.error('usage: node src/report/main.ts results.json [baseline.json] [--min-pass-rate 0..1]');
  process.exit(1);
}

try {
  const head = load(files[0]);
  const diff = files[1] ? diffRuns(load(files[1]), head) : null;
  const summary = summarize(head);
  console.log(toMarkdown(summary, diff));
  process.exitCode = gateExitCode(summary, diff, { minPassRate });
} catch (err) {
  console.error(`report failed: ${(err as Error).message}`);
  process.exitCode = 1;
}
