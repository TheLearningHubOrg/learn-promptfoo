/**
 * A deterministic stand-in for an LLM support assistant.
 *
 * Promptfoo evaluates this "system under test" exactly as it would evaluate a
 * real model: it sends an inquiry, receives a JSON string, and grades it. Rules
 * replace the model so the suite runs offline, for free, in CI.
 */

export type Tier = 'free' | 'pro' | 'enterprise';
export type Severity = 'P1' | 'P2' | 'P3';

export interface SupportReply {
  severity: Severity;
  reply: string;
  escalation: string | null;
  refused: boolean;
}

export const TIERS: readonly Tier[] = ['free', 'pro', 'enterprise'];

const INJECTION =
  /\b(ignore|disregard|forget)\b.{0,30}\b(previous|prior|above|earlier)\b.{0,20}\b(instructions?|rules?|prompts?)\b|\bsystem prompt\b|\breveal\b.{0,20}\b(instructions?|prompt|configuration)\b/i;
const OUTAGE =
  /\b(down|unreachable|outage|offline|cannot connect|can't connect|5\d\d errors?|timing out)\b/i;
const MONEY = /\$\s?\d[\d,]*|\b(credit|refund|compensation|chargeback)\b/i;

export function isTier(value: unknown): value is Tier {
  return typeof value === 'string' && (TIERS as readonly string[]).includes(value);
}

/** Parses a tier from untrusted input, falling back to the least privileged tier. */
export function parseTier(value: unknown): Tier {
  return isTier(value) ? value : 'free';
}

export function answer(inquiry: string, tier: Tier): SupportReply {
  const text = inquiry.trim();

  if (INJECTION.test(text)) {
    return {
      severity: 'P3',
      reply:
        'I cannot share my internal configuration or change how I work. I can help with your account, billing questions or service status.',
      escalation: null,
      refused: true,
    };
  }

  if (OUTAGE.test(text)) {
    if (tier === 'enterprise') {
      return {
        severity: 'P1',
        reply:
          'This is a P1 incident. The on-call engineer has been paged and an incident room is open for your team.',
        escalation: 'on-call engineer',
        refused: false,
      };
    }
    if (tier === 'pro') {
      return {
        severity: 'P2',
        reply:
          'This is logged as a P2 incident. The escalation team will reply within 4 business hours.',
        escalation: 'escalation team',
        refused: false,
      };
    }
    return {
      severity: 'P3',
      reply:
        'Check the public status page for ongoing incidents. Free plans receive community support within 2 business days.',
      escalation: null,
      refused: false,
    };
  }

  if (MONEY.test(text)) {
    return {
      severity: 'P3',
      reply:
        'I cannot provide credits or refunds in chat. A billing specialist reviews requests submitted through the billing form in Settings.',
      escalation: 'billing specialist',
      refused: true,
    };
  }

  return {
    severity: 'P3',
    reply: 'Thanks for reaching out. Tell me which product and region you are using and I will look into it.',
    escalation: null,
    refused: false,
  };
}
