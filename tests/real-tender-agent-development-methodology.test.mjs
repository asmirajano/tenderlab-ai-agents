import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const policyUrl = new URL("../docs/real-tender-agent-development-policy.json", import.meta.url);
const methodologyUrl = new URL("../docs/real-tender-agent-development-methodology.md", import.meta.url);
const agentsUrl = new URL("../AGENTS.md", import.meta.url);
const readPolicy = async () => JSON.parse(await readFile(policyUrl, "utf8"));

test("keeps the approved methodology separate from strategy and Agent-specific knowledge", async () => {
  const policy = await readPolicy();
  assert.equal(policy.schemaVersion, "2.0.0");
  assert.equal(policy.status, "approved-consolidated-methodology");
  assert.deepEqual(policy.knowledgeLayers.map((layer) => layer.id), [
    "agent-strategy-and-simulation",
    "real-agent-development-methodology",
    "agent-specific-knowledge",
  ]);
  assert.equal(policy.knowledgeLayers[0].defaultChangePolicy, "preserve");
  assert.equal(policy.knowledgeLayers[1].defaultChangePolicy, "primary-target");
  assert.deepEqual(policy.maturityLevels, [
    "CONCEPT_OR_SIMULATION",
    "ISOLATED_METHOD_VALIDATED",
    "VALIDATED_CLIENT_WORKFLOW",
    "CONTROLLED_PILOT",
    "ENTERPRISE_RUNTIME",
  ]);
});

test("requires contracts, experiment, approval, release evidence, and replay in order", async () => {
  const policy = await readPolicy();
  const stages = policy.lifecycle.map((stage) => stage.id);
  assert.deepEqual(stages, [
    "knowledge-layer-and-placement-gate",
    "purpose-and-authority-contract",
    "real-input-output-contract",
    "canonical-data-contract",
    "evidence-plan",
    "isolated-experiment",
    "actual-output-audit",
    "failure-layer-diagnosis",
    "correct-and-repeat",
    "methodology-approval",
    "production-integration",
    "human-workflow-integration",
    "production-verification",
    "release-evidence-gate",
    "authorized-deployment",
    "deployed-equivalent-replay",
    "knowledge-feedback",
  ]);
  assert.ok(stages.indexOf("isolated-experiment") < stages.indexOf("production-integration"));
  assert.ok(stages.indexOf("methodology-approval") < stages.indexOf("production-integration"));
  assert.ok(stages.indexOf("release-evidence-gate") < stages.indexOf("authorized-deployment"));
  assert.ok(stages.indexOf("deployed-equivalent-replay") > stages.indexOf("authorized-deployment"));
  for (const stage of policy.lifecycle) {
    assert.ok(stage.exitEvidence.length >= 3, `${stage.id} must define observable exit evidence`);
  }
});

test("preserves orthogonal source roles and value semantics without overwrite hierarchy", async () => {
  const policy = await readPolicy();
  assert.deepEqual(policy.valueClasses.map((valueClass) => valueClass.id), [
    "SOURCE",
    "CALCULATED",
    "ESTIMATED",
    "ASSUMED",
    "MISSING",
  ]);
  assert.equal(policy.valueClasses.find((valueClass) => valueClass.id === "MISSING").numericValueAllowed, false);
  assert.ok(policy.valueResolutionPolicy.dimensionsAreOrthogonal.includes("input origin"));
  assert.ok(policy.valueResolutionPolicy.dimensionsAreOrthogonal.includes("value class"));
  assert.equal(policy.valueResolutionPolicy.preserveCoexistingValues, true);
  assert.equal(policy.valueResolutionPolicy.neverSilentlyOverwriteReportedValue, true);
  assert.ok(policy.formatAwareIntermediateStructure.some((item) => item.includes("PDF coordinates")));
  assert.ok(policy.formatAwareIntermediateStructure.some((item) => item.includes("spreadsheet sheets")));
});

test("requires one complete Case-scoped result and multidimensional trust", async () => {
  const policy = await readPolicy();
  assert.equal(policy.canonicalResultContract.completeCompositeRequired, true);
  assert.equal(policy.canonicalResultContract.explicitCaseIdentityRequired, true);
  assert.equal(policy.canonicalResultContract.latestCaseFallbackAllowed, false);
  assert.ok(policy.canonicalResultContract.drives.includes("exports"));
  assert.ok(policy.canonicalResultContract.includes.includes("trust"));
  assert.deepEqual(policy.trustDimensions, [
    "RECOGNITION",
    "STRUCTURAL",
    "SEMANTIC",
    "ARITHMETIC_OR_DOMAIN",
    "HUMAN_REVIEW",
  ]);
  assert.equal(policy.trustPolicy.extractionConfidenceIsNotOverallTrust, true);
  assert.equal(policy.trustPolicy.contradictionsMustDowngradeOrBlock, true);
});

test("separates persistence, approval, and release while preserving truthful partial work", async () => {
  const policy = await readPolicy();
  assert.deepEqual(policy.workflowStates, [
    "DRAFT",
    "PRELIMINARY",
    "REVIEWED",
    "APPROVED",
    "RELEASED",
  ]);
  assert.equal(policy.workflowPolicy.persistenceApprovalAndReleaseAreSeparate, true);
  assert.equal(policy.workflowPolicy.truthfulPartialPersistenceAllowedByProductContract, true);
  assert.equal(policy.workflowPolicy.exportIsSecondaryToSavedCase, true);
  assert.ok(policy.semanticBlockingRule.blocksWhenAllAreTrue.length >= 5);
  assert.ok(policy.semanticBlockingRule.neverTreatAsMissing.includes("available deterministic calculation"));
});

test("diagnoses pipeline phases and binds release claims to artifact parity", async () => {
  const policy = await readPolicy();
  assert.ok(policy.failureLayers.includes("ASSET_OR_MODULE_LOADING"));
  assert.ok(policy.failureLayers.includes("OCR_OR_PERCEPTION"));
  assert.ok(policy.failureLayers.includes("SEMANTIC_MAPPING_OR_CLASSIFICATION"));
  assert.ok(policy.failureLayers.includes("EXPORT_OR_DOWNSTREAM_TRANSFORMATION"));
  assert.deepEqual(policy.failureAuditFields, [
    "whatHappened",
    "failureLayer",
    "rootCause",
    "correction",
    "reusableRule",
    "regressionEvidence",
  ]);
  assert.ok(policy.artifactParityFields.includes("inputIdentityOrSafeHash"));
  assert.ok(policy.artifactParityFields.includes("codeModelOrEngineVersion"));
  assert.ok(policy.artifactParityFields.includes("validationAndTrustVerdict"));
  assert.equal(policy.confidentialityPolicy.neverCommitOrPubliclyDeployProtectedEvidenceForRegression, true);
});

test("protects the consolidated regression families and general invariants", async () => {
  const policy = await readPolicy();
  const requiredInvariants = [
    "source-role-value-class-orthogonality",
    "format-aware-structure-before-semantic-mapping",
    "one-complete-canonical-result-model",
    "semantic-blocking-only",
    "explicit-case-identity-no-latest-fallback",
    "persistence-approval-release-separation",
    "multidimensional-trust",
    "artifact-parity-and-release-freshness",
    "deployed-equivalent-replay",
    "methodology-feedback-loop",
  ];
  for (const invariant of requiredInvariants) assert.ok(policy.invariants.includes(invariant), invariant);
  for (const family of [
    "structural-reconstruction-and-format-adapter",
    "confidence-contradiction-and-trust-verdict",
    "preliminary-approval-release-transitions",
    "artifact-identity-and-stale-release-evidence",
    "deployed-equivalent-replay",
  ]) assert.ok(policy.minimumTestFamilies.includes(family), family);
});

test("keeps the methodology discoverable without moving financial or logistics rules into the general layer", async () => {
  const [agents, methodology] = await Promise.all([
    readFile(agentsUrl, "utf8"),
    readFile(methodologyUrl, "utf8"),
  ]);
  assert.match(agents, /docs\/real-tender-agent-development-methodology\.md/);
  assert.match(agents, /AGENT_ARCHITECTURE_PLAN\.md/);
  assert.match(methodology, /approved consolidated methodology/);
  assert.match(methodology, /balance-sheet-digitization-mvp\.md/);
  assert.match(methodology, /contract-logistics-incoterms-architecture\.md/);
  assert.match(methodology, /What happened → Root cause → Correction → Reusable rule → Regression evidence/);
  assert.match(methodology, /FIN mappings, accounting equations, Incoterm logic/);
});
