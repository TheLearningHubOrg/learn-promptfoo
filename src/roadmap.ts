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
    title: "Promptfoo Fundamentals: Mental Model, Install & First Eval",
    domainFocus: "The eval matrix (prompts x providers x tests), promptfoo init/eval/view, caching and exit codes.",
    completed: true,
    keyTopics: ["Eval Matrix", "CLI Workflow", "Result Storage", "Exit Codes"]
  },
  {
    stageNumber: 2,
    title: "Configuration: Prompts, Providers, Tests & Variables",
    domainFocus: "promptfooconfig.yaml: prompt files, provider ids, vars, defaultTest, transforms and evaluateOptions.",
    completed: true,
    keyTopics: ["Prompt Templates", "Provider IDs", "Test Variables", "Transforms"]
  },
  {
    stageNumber: 3,
    title: "Assertions & Grading: Deterministic, Custom Code & Model-Graded",
    domainFocus: "Built-in assertions, not- negation, assert-set, weights and thresholds, JavaScript assertions, llm-rubric.",
    completed: true,
    keyTopics: ["Deterministic Assertions", "Custom Code Assertions", "Model-Graded Rubrics", "Weighted Scoring"]
  },
  {
    stageNumber: 4,
    title: "Red Teaming & LLM Security Testing",
    domainFocus: "promptfoo redteam setup/generate/run, plugins, strategies, OWASP LLM Top 10 mapping.",
    completed: true,
    keyTopics: ["Plugins", "Strategies", "OWASP Mapping", "Vulnerability Reports"]
  },
  {
    stageNumber: 5,
    title: "Custom Providers, Datasets, RAG & Agent Evaluation",
    domainFocus: "file:// and http providers, CSV datasets, dataset generation, RAG context assertions, tool-call checks.",
    completed: true,
    keyTopics: ["Custom Providers", "HTTP Provider", "Dataset Ingestion", "RAG Metrics"]
  },
  {
    stageNumber: 6,
    title: "CI/CD Quality Gates, Model Comparison & Scale",
    domainFocus: "GitHub Actions gates, model comparison, concurrency and rate limits, sandboxed runners.",
    completed: true,
    keyTopics: ["GitHub Actions", "Model Comparison", "Concurrency Control", "Sandboxed Runs"]
  },
  {
    stageNumber: 7,
    title: "Staff AI Quality Engineer Interview Handbook & Cheatsheet",
    domainFocus: "Interview Q&As on eval design, flaky tests, red team operations and governance.",
    completed: true,
    keyTopics: ["Eval Design", "Flaky Test Stabilization", "Security Testing", "Cheatsheet"]
  }
];

export function getCompletedCount(): number {
  return PROMPTFOO_STAGES.filter((s) => s.completed).length;
}

export function getProgressPercentage(): number {
  return Math.round((getCompletedCount() / PROMPTFOO_STAGES.length) * 100);
}
