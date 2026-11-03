/**
 * Custom Promptfoo provider for the refund agent.
 *
 * The output is the agent's full trace as JSON ({ reply, toolCalls }), so
 * assertions can grade what the agent did, not only what it said.
 */
import { runAgent } from '../agent/refund-agent.ts';

interface CallContext {
  vars?: Record<string, unknown>;
}

interface ProviderResponse {
  output?: string;
  error?: string;
  cost?: number;
  metadata?: Record<string, unknown>;
}

export default class RefundAgentProvider {
  private readonly label: string;

  constructor(options: { id?: string; label?: string } = {}) {
    this.label = options.label ?? options.id ?? 'refund-agent';
  }

  id(): string {
    return this.label;
  }

  async callApi(prompt: string, context?: CallContext): Promise<ProviderResponse> {
    const accountId = context?.vars?.accountId;
    if (typeof accountId !== 'string' || accountId === '') {
      // A missing identity is a broken test, not a failed behaviour: report it as an error.
      return { error: 'vars.accountId is required: the agent acts on behalf of an account' };
    }
    const result = runAgent(prompt, accountId);
    return {
      output: JSON.stringify(result),
      cost: 0,
      metadata: { toolCallCount: result.toolCalls.length },
    };
  }
}
