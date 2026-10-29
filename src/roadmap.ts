/**
 * The Learning Hub - Promptfoo Automated Evaluation & Red Teaming Roadmap.
 * 7-Stage progression covering deterministic assertions, OWASP red teaming, and CI/CD quality gates.
 */

export interface RoadmapStage {
  stageNumber: number;
  title: string;
  domainFocus: string;
  completed: boolean;
  keyTopics: string[];
}

export const PROMPTFOO_STAGES: RoadmapStage[] = [
  {
    stageNumber: 1,
    title: "The GenAI Quality Crisis & Promptfoo Architectural Mechanics",
    domainFocus: "Deterministic testing of stochastic LLMs, decoupled testing harness, and CLI execution flow.",
    completed: true,
    keyTopics: ["Stochastic Sampling Challenges", "Promptfoo Headless Architecture", "CI/CD Gate Integration", "Local Evaluation Cache"]
  },
  {
    stageNumber: 2,
    title: "Configuration Specification: promptfooconfig.yaml Deep Dive",
    domainFocus: "Prompts, providers (OpenAI, Anthropic, Ollama, custom hooks), test variables, and transforms.",
    completed: true,
    keyTopics: ["Multi-Prompt Permutations", "Dynamic Provider Matrix", "Variable Interpolation", "Transform Functions"]
  },
  {
    stageNumber: 3,
    title: "The Complete Assertion Engine: Heuristic, Semantic & LLM-Graded",
    domainFocus: "40+ assertion types: equals, contains, regex, is-json, similarity, latency, cost, and llm-rubric.",
    completed: true,
    keyTopics: ["Deterministic Assertions", "Embedding Cosine Similarity", "Latency & Cost Caps", "Custom Code Assertions"]
  },
  {
    stageNumber: 4,
    title: "Automated Adversarial Red Teaming & OWASP LLM Top 10 Probing",
    domainFocus: "OWASP LLM Top 10 automated red teaming (Prompt Injection, PII disclosure, Excessive Agency).",
    completed: true,
    keyTopics: ["Prompt Injection Probes", "PII & Secret Leaks", "Excessive Tool Agency", "Jailbreak Vulnerability Scoring"]
  },
  {
    stageNumber: 5,
    title: "Cross-Model Comparative Matrices & Cost-Performance Pareto Frontiers",
    domainFocus: "Side-by-side model matrix evaluation (GPT-4o vs Claude 3.5 Sonnet vs Llama 3) and Pareto frontiers.",
    completed: true,
    keyTopics: ["Model Evaluation Matrix", "Latency vs Cost Pareto", "Pass Rate Comparisons", "Token Spend Tracking"]
  },
  {
    stageNumber: 6,
    title: "Automated CI/CD Regression Gates & Pull Request Comment Bots",
    domainFocus: "GitHub Actions integration, PR blocking on regression, automated markdown summary comments.",
    completed: true,
    keyTopics: ["GitHub Actions Workflow", "PR Comment Scorecards", "Strict Pass Thresholds", "Automated Regression Halts"]
  },
  {
    stageNumber: 7,
    title: "Staff AI Quality & Security Architect Interview Handbook & Operational Runbook",
    domainFocus: "Staff-level architecture trade-offs, catastrophic LLM failure post-mortems, and operational cheatsheet.",
    completed: true,
    keyTopics: ["Enterprise Quality Governance", "Flaky Test Stabilization", "Disaster Recovery in GenAI", "Staff Architect Cheatsheet"]
  }
];

export function getCompletedCount(): number {
  return PROMPTFOO_STAGES.filter((s) => s.completed).length;
}

export function getProgressPercentage(): number {
  return Math.round((getCompletedCount() / PROMPTFOO_STAGES.length) * 100);
}
