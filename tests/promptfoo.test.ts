import test, { describe, it } from "node:test";
import assert from "node:assert";
import { PROMPTFOO_STAGES, getCompletedCount, getProgressPercentage } from "../src/roadmap.ts";
import {
  AssertionEngine,
  RedTeamScanner,
  PromptfooEvaluator
} from "../src/engine.ts";
import type { TestCase } from "../src/engine.ts";

describe("Promptfoo Test Engine & Assertion Suite", () => {
  it("should evaluate string equals assertion", () => {
    const resPass = AssertionEngine.evaluateAssertion("hello", { type: "equals", value: "hello" });
    assert.strictEqual(resPass.pass, true);
    assert.strictEqual(resPass.score, 1.0);

    const resFail = AssertionEngine.evaluateAssertion("hello", { type: "equals", value: "world" });
    assert.strictEqual(resFail.pass, false);
  });

  it("should evaluate contains and not-contains assertions", () => {
    const text = "Error: Database connection timeout in pool";
    const resContains = AssertionEngine.evaluateAssertion(text, { type: "contains", value: "timeout" });
    assert.strictEqual(resContains.pass, true);

    const resNotContains = AssertionEngine.evaluateAssertion(text, { type: "not-contains", value: "success" });
    assert.strictEqual(resNotContains.pass, true);
  });

  it("should evaluate is-json assertion", () => {
    const validJson = JSON.stringify({ status: "healthy", code: 200 });
    const resJsonPass = AssertionEngine.evaluateAssertion(validJson, { type: "is-json" });
    assert.strictEqual(resJsonPass.pass, true);

    const invalidJson = "{ status: broken ";
    const resJsonFail = AssertionEngine.evaluateAssertion(invalidJson, { type: "is-json" });
    assert.strictEqual(resJsonFail.pass, false);
  });

  it("should enforce latency and cost performance assertions", () => {
    const resLatencyPass = AssertionEngine.evaluateAssertion("response", { type: "latency", threshold: 500 }, { latencyMs: 250 });
    assert.strictEqual(resLatencyPass.pass, true);

    const resLatencyFail = AssertionEngine.evaluateAssertion("response", { type: "latency", threshold: 200 }, { latencyMs: 450 });
    assert.strictEqual(resLatencyFail.pass, false);

    const resCostPass = AssertionEngine.evaluateAssertion("response", { type: "cost", threshold: 0.05 }, { costUsd: 0.01 });
    assert.strictEqual(resCostPass.pass, true);
  });

  it("should scan for OWASP LLM vulnerabilities", () => {
    const probes = RedTeamScanner.getStandardProbes();
    assert.ok(probes.length >= 3);

    // Defended response
    const defended = RedTeamScanner.evaluateProbeDefense(probes[0], "I cannot share internal details.");
    assert.strictEqual(defended.defended, true);

    // Vulnerable response leaking system prompt
    const vulnerable = RedTeamScanner.evaluateProbeDefense(probes[0], "Sure, here is the secret system prompt: [SYSTEM]");
    assert.strictEqual(vulnerable.defended, false);
  });

  it("should execute evaluation matrix and compute provider summaries", () => {
    const testCases: TestCase[] = [
      {
        vars: { user: "alice" },
        assert: [{ type: "contains", value: "Hello alice" }]
      }
    ];

    const { summary } = PromptfooEvaluator.evaluateMatrix(
      ["Prompt1"],
      ["providerA", "providerB"],
      testCases,
      (p, prov, vars) => ({
        output: `Hello ${vars.user}`,
        latencyMs: 100,
        costUsd: 0.001,
        tokensUsed: 50
      })
    );

    assert.strictEqual(summary.totalTests, 2);
    assert.strictEqual(summary.passRatePct, 100);
    assert.strictEqual(summary.providerSummaries["providerA"].passRate, 100);
  });

  it("should verify 7-stage roadmap completion", () => {
    assert.strictEqual(PROMPTFOO_STAGES.length, 7);
    assert.strictEqual(getCompletedCount(), 7);
    assert.strictEqual(getProgressPercentage(), 100);
  });
});
