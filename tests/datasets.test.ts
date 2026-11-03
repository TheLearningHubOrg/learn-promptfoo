/**
 * Guards the CSV dataset itself: every row's expectations must hold for the
 * bot, so a typo in the CSV fails here with a clear message instead of as a
 * confusing eval failure.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { answer, isTier } from '../src/support-bot.ts';

/** Minimal RFC 4180 parser: quoted fields, doubled quotes, commas inside quotes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch !== '\r') field += ch;
  }
  if (field !== '' || row.length > 0) rows.push([...row, field]);
  return rows;
}

function check(expectation: string, output: string): boolean {
  const [, type, value] = /^([a-z-]+):\s*([\s\S]*)$/.exec(expectation) ?? [];
  if (type === 'icontains') return output.toLowerCase().includes(value.toLowerCase());
  if (type === 'javascript') return Boolean(new Function('output', `return (${value});`)(output));
  throw new Error(`unsupported expectation in test helper: ${expectation}`);
}

describe('billing.csv dataset', () => {
  const [header, ...rows] = parseCsv(readFileSync(new URL('./cases/billing.csv', import.meta.url), 'utf8'));
  const col = (name: string) => header.indexOf(name);

  it('has the columns the config and prompt rely on', () => {
    for (const name of ['__description', 'tier', 'inquiry', '__expected1']) assert.notEqual(col(name), -1, name);
  });

  for (const row of rows) {
    it(row[col('__description')], () => {
      const tier = row[col('tier')];
      assert.ok(isTier(tier), `invalid tier ${tier}`);
      const output = JSON.stringify(answer(row[col('inquiry')], tier));
      header.forEach((name, i) => {
        if (name.startsWith('__expected') && row[i]) assert.ok(check(row[i], output), `${row[i]} on ${output}`);
      });
    });
  }
});
