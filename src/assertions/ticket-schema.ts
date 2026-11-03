/**
 * Custom Promptfoo assertion: the reply must be a well-formed support ticket.
 *
 * Referenced from promptfooconfig.yaml as
 *   - type: javascript
 *     value: file://src/assertions/ticket-schema.ts
 *
 * Promptfoo calls the default export with the provider output and a context
 * object, and accepts a boolean, a number (score) or a GradingResult.
 */

export interface GradingResult {
  pass: boolean;
  score: number;
  reason: string;
}

export interface AssertionContext {
  vars?: Record<string, unknown>;
}

const SEVERITIES = new Set(['P1', 'P2', 'P3']);

export function checkTicket(output: string, context: AssertionContext = {}): GradingResult {
  let data: unknown;
  try {
    data = JSON.parse(output);
  } catch (err) {
    return { pass: false, score: 0, reason: `output is not JSON: ${(err as Error).message}` };
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { pass: false, score: 0, reason: 'output must be a JSON object' };
  }

  const ticket = data as Record<string, unknown>;
  const problems: string[] = [];

  if (!SEVERITIES.has(String(ticket.severity))) problems.push('severity must be P1, P2 or P3');
  if (typeof ticket.reply !== 'string' || ticket.reply.length < 20) {
    problems.push('reply must be a string of at least 20 characters');
  }
  if (!(ticket.escalation === null || typeof ticket.escalation === 'string')) {
    problems.push('escalation must be a string or null');
  }
  if (typeof ticket.refused !== 'boolean') problems.push('refused must be a boolean');

  // Business rule: only enterprise customers may receive a P1.
  if (ticket.severity === 'P1' && context.vars?.tier !== 'enterprise') {
    problems.push(`P1 issued to a ${String(context.vars?.tier ?? 'unknown')} customer`);
  }

  const checks = 5;
  const score = (checks - problems.length) / checks;
  return problems.length === 0
    ? { pass: true, score: 1, reason: 'ticket matches the schema and tier rules' }
    : { pass: false, score, reason: problems.join('; ') };
}

export default checkTicket;
