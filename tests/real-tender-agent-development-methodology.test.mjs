import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const policyUrl = new URL("../docs/real-tender-agent-development-policy.json", import.meta.url);
const methodologyUrl = new URL("../docs/real-tender-agent-development-methodology.md", import.meta.url);
const agentsUrl = new URL("../AGENTS.md", import.meta.url);
const readPolicy = async () => JSON.parse(await readFile(policyUrl, "utf8"));

test("keeps strategy, real development methodology, and Agent-specific knowledge as separate layers", async () => {
  const policy = await readPolicy();
  assert.deepEqual(policy.knowledgeLayers.map((layer) => layer.id), [
    "agent-strategy-and-simulation",
    "real-agent-development-methodology",
    "agent-specific-knowledge",
  ]);
  assert.equal(policy.knowledgeLayers[0].defaultChangePolicy, "preserve");
  assert.equal(policy.knowledgeLayers[1].defaultChangePolicy, "primary-target");
});

test("requires experiment and methodology approval before production implementation", async () => {
  const policy = await readPolicy();
  const stages = policy.lifecycle.map((stage) => stage.id);
  assert.deepEqual(stages, [
    "approved-concept",
    "real-input-output-contract",
    "realistic-evidence-set",
    "isolated-experiment",
    "observed-output-inspection",
    "failure-analysis",
    "refine-and-repeat",
    "methodology-approval",
    "production-implementation",
    "realistic-production-verification",
    "regression-safeguards",
    "authorized-release",
    "lessons-fed-back",
  ]);
  assert.ok(stages.indexOf("isolated-experiment") < stages.indexOf("production-implementation"));
  assert.ok(stages.indexOf("methodology-approval") < stages.indexOf("production-implementation"));
  for (const stage of policy.lifecycle) {
    assert.ok(stage.exitEvidence.length >= 3, `${stage.id} must define observable exit evidence`);
  }
});

test("preserves the canonical value meanings and semantic blocking rule", async () => {
  const policy = await readPolicy();
  assert.deepEqual(policy.valueClasses.map((valueClass) => valueClass.id), [
    "SOURCE",
    "CALCULATED",
    "ESTIMATED",
    "ASSUMED",
    "MISSING",
  ]);
  assert.equal(policy.valueClasses.find((valueClass) => valueClass.id === "MISSING").numericValueAllowed, false);
  assert.ok(policy.semanticBlockingRule.blocksWhenAllAreTrue.length >= 5);
  assert.ok(policy.semanticBlockingRule.neverTreatAsMissing.includes("unrequested historical year"));
  assert.ok(policy.semanticBlockingRule.neverTreatAsMissing.includes("available deterministic calculation"));
});

test("protects canonical-result, Case identity, purpose-led UI, and failure-audit invariants", async () => {
  const policy = await readPolicy();
  const requiredInvariants = [
    "source-template-separation",
    "one-canonical-result-model",
    "semantic-blocking-only",
    "experiment-first-for-uncertain-intelligence",
    "purpose-led-primary-result",
    "case-agent-page-separation",
    "visualizations-explain-results",
    "actionable-non-dead-end-workflow",
    "methodology-feedback-loop",
  ];
  for (const invariant of requiredInvariants) assert.ok(policy.invariants.includes(invariant), invariant);
  assert.deepEqual(policy.failureAuditFields, [
    "whatHappened",
    "rootCause",
    "correction",
    "reusableRule",
    "regressionEvidence",
  ]);
  assert.ok(policy.minimumTestFamilies.includes("source-template-contamination"));
  assert.ok(policy.minimumTestFamilies.includes("case-identity-and-navigation"));
  assert.ok(policy.minimumTestFamilies.includes("recovery-and-truthful-terminal-state"));
});

test("makes the methodology discoverable from project instructions without rewriting strategy or domain knowledge", async () => {
  const [agents, methodology] = await Promise.all([
    readFile(agentsUrl, "utf8"),
    readFile(methodologyUrl, "utf8"),
  ]);
  assert.match(agents, /docs\/real-tender-agent-development-methodology\.md/);
  assert.match(agents, /AGENT_ARCHITECTURE_PLAN\.md/);
  assert.match(methodology, /balance-sheet-digitization-mvp\.md/);
  assert.match(methodology, /contract-logistics-incoterms-architecture\.md/);
  assert.match(methodology, /What happened \| Root cause \| Correction \| Reusable rule \| Regression evidence/);
});
