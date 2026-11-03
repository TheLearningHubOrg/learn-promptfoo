/**
 * Custom Promptfoo provider that calls the support bot in-process.
 *
 * Promptfoo loads this file from promptfooconfig.yaml (`id: file://...`),
 * instantiates the default export and calls callApi() once per test cell.
 */
import { answer, parseTier } from '../support-bot.ts';

interface CallContext {
  vars?: Record<string, unknown>;
}

interface ProviderResponse {
  output?: string;
  error?: string;
  cost?: number;
  tokenUsage?: { prompt: number; completion: number; total: number };
}

export default class SupportBotProvider {
  private readonly label: string;

  constructor(options: { id?: string; label?: string } = {}) {
    this.label = options.label ?? options.id ?? 'support-bot';
  }

  id(): string {
    return this.label;
  }

  async callApi(prompt: string, context?: CallContext): Promise<ProviderResponse> {
    if (prompt.trim() === '') return { error: 'empty prompt' };
    const tier = parseTier(context?.vars?.tier);
    const reply = answer(prompt, tier);
    const output = JSON.stringify(reply);
    // Rough token estimate (4 characters per token) so cost and token reports have data.
    const promptTokens = Math.ceil(prompt.length / 4);
    const completionTokens = Math.ceil(output.length / 4);
    return {
      output,
      cost: 0,
      tokenUsage: {
        prompt: promptTokens,
        completion: completionTokens,
        total: promptTokens + completionTokens,
      },
    };
  }
}
