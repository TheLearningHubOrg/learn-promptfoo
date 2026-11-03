/**
 * A deterministic, tool-using billing agent.
 *
 * It stands in for an LLM agent so the agent suite (promptfooconfig.agent.yaml)
 * runs offline. What matters for evaluation is the shape of its output: the
 * final reply plus the ordered list of tool calls it made, which is exactly
 * what a real agent framework can return as a trace.
 */

export interface Invoice {
  id: string;
  accountId: string;
  amountUsd: number;
}

export type ToolName = 'lookup_invoice' | 'issue_credit' | 'request_approval';

export interface ToolCall {
  name: ToolName;
  args: Record<string, string | number>;
}

export interface AgentResult {
  reply: string;
  toolCalls: ToolCall[];
}

/** Credits above this amount need a human approver. */
export const AUTO_APPROVE_LIMIT_USD = 100;

/** The agent's "database". Tests and graders import it, so they agree on ground truth. */
export const INVOICES: ReadonlyMap<string, Invoice> = new Map(
  [
    { id: 'INV-1001', accountId: 'ACME', amountUsd: 80 },
    { id: 'INV-1002', accountId: 'ACME', amountUsd: 450 },
    { id: 'INV-2001', accountId: 'GLOBEX', amountUsd: 60 },
  ].map((invoice) => [invoice.id, invoice]),
);

const INVOICE_ID = /\bINV-\d{4}\b/i;
const AMOUNT = /\$\s?(\d+(?:\.\d{1,2})?)/;

export interface AgentOptions {
  /** Turn the ownership check off to watch the BOLA test catch it. */
  skipOwnershipCheck?: boolean;
}

export function runAgent(inquiry: string, accountId: string, options: AgentOptions = {}): AgentResult {
  const toolCalls: ToolCall[] = [];
  const invoiceMatch = INVOICE_ID.exec(inquiry);

  if (!invoiceMatch) {
    return {
      reply: 'I can look into a credit for you. Which invoice number is this about (for example INV-1001)?',
      toolCalls,
    };
  }

  const invoiceId = invoiceMatch[0].toUpperCase();
  toolCalls.push({ name: 'lookup_invoice', args: { invoiceId } });
  const invoice = INVOICES.get(invoiceId);

  if (!invoice) {
    return { reply: `I cannot find invoice ${invoiceId} on your account.`, toolCalls };
  }
  if (!options.skipOwnershipCheck && invoice.accountId !== accountId) {
    // Same wording as "not found", so the reply does not confirm that the invoice exists.
    return { reply: `I cannot find invoice ${invoiceId} on your account.`, toolCalls };
  }

  const amountMatch = AMOUNT.exec(inquiry);
  const amountUsd = amountMatch ? Number(amountMatch[1]) : invoice.amountUsd;

  if (amountUsd <= 0 || amountUsd > invoice.amountUsd) {
    return {
      reply: `I cannot credit $${amountUsd} because invoice ${invoiceId} was for $${invoice.amountUsd}.`,
      toolCalls,
    };
  }

  if (amountUsd > AUTO_APPROVE_LIMIT_USD) {
    toolCalls.push({ name: 'request_approval', args: { invoiceId, amountUsd } });
    return {
      reply: `A credit of $${amountUsd} needs approval from a billing manager. I have sent the request and you will get an email when it is decided.`,
      toolCalls,
    };
  }

  toolCalls.push({ name: 'issue_credit', args: { invoiceId, amountUsd } });
  return {
    reply: `Done: a credit of $${amountUsd} for invoice ${invoiceId} will appear on your next statement.`,
    toolCalls,
  };
}
