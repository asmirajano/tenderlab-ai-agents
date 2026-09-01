import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  TENDERMATCH_AUDITED_MATCH_POLICY_VERSION,
  TENDERMATCH_DEADLINE_CONTEXT_POLICY_VERSION,
  TENDERMATCH_ENGINE_VERSION,
  TENDERMATCH_SCHEMA_VERSION,
  TENDERBOOST_LEGACY_BASELINE_POLICY_VERSION,
  assessMatch,
  buildAllMatches,
  calculateDeadlineUrgency,
  createCaseResult,
  demoSuppliers,
  demoTenders,
  deriveTenderFreshness,
  evaluateAuditedMatch,
  loadCaseResult,
} from "../packages/tendermatch/src/index.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const snapshotNow = "2026-08-15T12:00:00+05:00";

function pair() {
  return {
    tender: demoTenders.find((item) => item.reference === "514122"),
    supplier: demoSuppliers.find((item) => item.id === "supplier:TB:yutong"),
  };
}

function mapping(assignments) {
  const { tender, supplier } = pair();
  return {
    key: `${tender.reference}::${supplier.id}`,
    sourceRole: "USER_ASSERTION",
    reviewStatus: "REVIEWED",
    reviewedAt: snapshotNow,
    assignments,
  };
}

function component(component, semanticBand, evidenceIds) {
  return { component, semanticBand, evidenceIds, rationale: `${component} deterministic boundary fixture` };
}

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

test("binds every current score surface to the TenderMatch 3.0 policies", () => {
  const { tender, supplier } = pair();
  const match = assessMatch(tender, supplier, snapshotNow);
  const result = createCaseResult("case:TM:policy", tender, supplier, snapshotNow);
  assert.equal(result.schemaVersion, TENDERMATCH_SCHEMA_VERSION);
  assert.equal(result.engineVersion, TENDERMATCH_ENGINE_VERSION);
  assert.equal(match.auditedMatch.policyVersion, TENDERMATCH_AUDITED_MATCH_POLICY_VERSION);
  assert.equal(match.deadlineUrgency.policyVersion, TENDERMATCH_DEADLINE_CONTEXT_POLICY_VERSION);
  assert.equal(match.legacyBaseline.policyVersion, TENDERBOOST_LEGACY_BASELINE_POLICY_VERSION);
  assert.equal("campaignPriority" in match, false);
  assert.equal("activation" in result, false);
});

test("calculates formula boundaries and monotonic component improvements", () => {
  const { tender, supplier } = pair();
  const technicalId = "evidence:TB:yutong:ambulanceline:2";
  const marketId = "evidence:TB:yutong:uzbekistanpresence:3";
  const low = evaluateAuditedMatch(tender, supplier, 80, mapping([
    component("technical-relevance", 60, [technicalId]),
    component("market-delivery", 60, [marketId]),
  ]));
  const technicalImproved = evaluateAuditedMatch(tender, supplier, 80, mapping([
    component("technical-relevance", 80, [technicalId]),
    component("market-delivery", 60, [marketId]),
  ]));
  const high = evaluateAuditedMatch(tender, supplier, 80, mapping([
    component("technical-relevance", 100, [technicalId]),
    component("market-delivery", 100, [marketId]),
  ]));
  assert.equal(low.value, 60);
  assert.equal(technicalImproved.value, 74);
  assert.equal(high.value, 100);
  assert.ok(low.value < technicalImproved.value && technicalImproved.value < high.value);
});

test("returns MISSING for absent, unverified, low-confidence, or double-counted evidence", () => {
  const { tender, supplier } = pair();
  const technicalId = "evidence:TB:yutong:ambulanceline:2";
  const marketId = "evidence:TB:yutong:uzbekistanpresence:3";

  const missing = evaluateAuditedMatch(tender, supplier, 80, mapping([
    component("technical-relevance", 100, ["evidence:missing"]),
    component("market-delivery", 100, [marketId]),
  ]));
  assert.equal(missing.value, null);
  assert.ok(missing.reasonCodes.includes("EVIDENCE_RECORD_NOT_FOUND"));

  const inferredSupplier = {
    ...supplier,
    evidence: supplier.evidence.map((item) => item.id === technicalId ? { ...item, reviewStatus: "INFERRED" } : item),
  };
  const unverified = evaluateAuditedMatch(tender, inferredSupplier, 80, mapping([
    component("technical-relevance", 100, [technicalId]),
    component("market-delivery", 100, [marketId]),
  ]));
  assert.equal(unverified.value, null);
  assert.ok(unverified.reasonCodes.includes("EVIDENCE_NOT_VERIFIED"));

  const lowConfidenceSupplier = {
    ...supplier,
    evidence: supplier.evidence.map((item) => item.id === technicalId ? { ...item, confidence: 74 } : item),
  };
  const lowConfidence = evaluateAuditedMatch(tender, lowConfidenceSupplier, 80, mapping([
    component("technical-relevance", 100, [technicalId]),
    component("market-delivery", 100, [marketId]),
  ]));
  assert.equal(lowConfidence.value, null);
  assert.ok(lowConfidence.reasonCodes.includes("EVIDENCE_CONFIDENCE_BELOW_THRESHOLD"));

  const reused = evaluateAuditedMatch(tender, supplier, 80, mapping([
    component("technical-relevance", 100, [technicalId]),
    component("market-delivery", 100, [technicalId]),
  ]));
  assert.equal(reused.value, null);
  assert.deepEqual(new Set(reused.reasonCodes), new Set(["EVIDENCE_RECORD_REUSED"]));
});

test("keeps unassessed MISSING separate from genuine evaluated zero", () => {
  const { tender, supplier } = pair();
  const unassessedSupplier = demoSuppliers.find((item) => item.id === "supplier:TB:huawei");
  const unassessed = assessMatch(tender, unassessedSupplier, snapshotNow);
  const zeroSupplier = {
    ...supplier,
    legacyTenderMatches: supplier.legacyTenderMatches.map((item) => item.tenderReference === tender.reference ? { ...item, score: 0 } : item),
  };
  const zero = assessMatch(tender, zeroSupplier, snapshotNow);
  assert.equal(unassessed.matchScore.value, null);
  assert.equal(unassessed.auditedMatch.value, null);
  assert.equal(zero.matchScore.value, 0);
  assert.equal(zero.exactLegacyPair, true);
});

test("reports exactly the audited experiment cardinalities and expected six results", () => {
  const matches = buildAllMatches(demoTenders, demoSuppliers, snapshotNow);
  const audited = matches.filter((item) => item.auditedMatch.value !== null);
  assert.equal(matches.filter((item) => item.exactLegacyPair).length, 18);
  assert.equal(matches.filter((item) => item.exactLegacyPair && item.auditedMatch.value === null).length, 12);
  assert.equal(matches.filter((item) => !item.exactLegacyPair).length, 142);
  assert.deepEqual(audited.map((item) => [item.key, item.auditedMatch.value]), [
    ["UP/ICB/26/01::supplier:TB:yutong", 100],
    ["514122::supplier:TB:yutong", 100],
    ["DPA14004203 / ICB 514062::supplier:TB:ncs_testing", 94],
    ["G05::supplier:TB:kingpeng", 94],
    ["ZR-SPACE-252528-GO-RFB::supplier:TB:chery", 86],
    ["514110::supplier:TB:united_imaging", 72],
  ]);
});

test("keeps deadline urgency monotonic, clock-derived, and separate from Match Support", () => {
  const { tender, supplier } = pair();
  const earlyFreshness = deriveTenderFreshness(tender, "2026-08-01T00:00:00+05:00");
  const nearFreshness = deriveTenderFreshness(tender, "2026-08-15T00:00:00+05:00");
  const closedFreshness = deriveTenderFreshness(tender, "2026-08-17T00:00:00+05:00");
  assert.ok(calculateDeadlineUrgency(earlyFreshness).value < calculateDeadlineUrgency(nearFreshness).value);
  assert.equal(calculateDeadlineUrgency(closedFreshness).value, null);
  const earlyMatch = assessMatch(tender, supplier, "2026-08-01T00:00:00+05:00");
  const nearMatch = assessMatch(tender, supplier, "2026-08-15T00:00:00+05:00");
  assert.equal(earlyMatch.auditedMatch.value, nearMatch.auditedMatch.value);
  assert.notEqual(earlyMatch.deadlineUrgency.value, nearMatch.deadlineUrgency.value);
});

test("rejects unknown saved schemas instead of guessing a migration", () => {
  const { tender, supplier } = pair();
  const storage = memoryStorage();
  const caseId = "case:TM:unsupported";
  const unsupported = createCaseResult(caseId, tender, supplier, snapshotNow);
  unsupported.schemaVersion = "99.0.0";
  storage.setItem(`tenderapps:tendermatch:case:${encodeURIComponent(caseId)}`, JSON.stringify(unsupported));
  assert.throws(() => loadCaseResult(storage, caseId, { tender, supplier, nowIso: snapshotNow }), /unsupported and requires an explicit migration/);
});

test("documents the formula, experiment, version migration, and matching-only invariants", async () => {
  const [modelCard, playbook] = await Promise.all([
    readFile(path.join(projectRoot, "docs/tendermatch-scoring-model-card.md"), "utf8"),
    readFile(path.join(projectRoot, "docs/tendermatch-agent-03-integration.md"), "utf8"),
  ]);
  assert.match(modelCard, /tendermatch-match-formula\/1\.0\.0/);
  assert.match(modelCard, /Match Score = 100 × Σ\(weight × fit \/ 5\) \/ Σ\(assessed weights\)/);
  assert.match(modelCard, /Numeric preliminary Match Scores \| 48/);
  assert.match(modelCard, /Blocked \/ ineligible \| 37/);
  assert.match(modelCard, /Unassessed \| 935/);
  assert.match(modelCard, /Supplier readiness, deadline, consultant decision and general company size do not change Match Score/);
  assert.match(playbook, /The 64-Agent matching gate is passed: \*\*yes\*\*/);
  assert.match(playbook, /Canonical owner: `agent:TL-A031`/);
  assert.match(playbook, /### Terminology and protected-exception matrix/);
  assert.match(playbook, /No active filesystem path may contain `tenderboost`/);
  assert.match(playbook, /`tenderapps:tenderboost:case:<Case ID>` for historical reads/);
  assert.match(playbook, /Stable IDs remain unchanged lineage identifiers; they are never display names/);
  assert.match(playbook, /TenderBoost must be qualified as frozen, legacy, source, migration, or compatibility provenance/);
});
