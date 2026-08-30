import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  TENDERBOOST_AUDITED_MATCH_POLICY_VERSION,
  TENDERBOOST_CAMPAIGN_PRIORITY_POLICY_VERSION,
  TENDERBOOST_LEGACY_BASELINE_POLICY_VERSION,
  TENDERBOOST_SCHEMA_VERSION,
  assessMatch,
  auditedDemoPairMappingByKey,
  buildAllMatches,
  calculateDeadlineUrgency,
  createCaseResult,
  demoSuppliers,
  demoTenders,
  deriveTenderFreshness,
  evaluateAuditedMatch,
  evaluateCampaignEligibility,
  loadCaseResult,
  setConsultantDecision,
} from "../packages/tenderboost/src/index.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const snapshotNow = "2026-08-15T12:00:00+05:00";

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

function pair(tenderReference, supplierKey) {
  const tender = demoTenders.find((item) => item.reference === tenderReference);
  const supplier = demoSuppliers.find((item) => item.id === `supplier:TB:${supplierKey}`);
  assert.ok(tender && supplier, `missing fixture pair ${tenderReference} / ${supplierKey}`);
  return { tender, supplier, mapping: auditedDemoPairMappingByKey.get(`${tenderReference}::${supplier.id}`) };
}

test("freezes the Stage 1 baseline separately from audited policy versions", () => {
  const { tender, supplier } = pair("UP/ICB/26/01", "yutong");
  const pending = assessMatch(tender, supplier, snapshotNow, "pending");
  const approved = assessMatch(tender, supplier, snapshotNow, "approved");
  assert.equal(pending.legacyBaseline.policyVersion, TENDERBOOST_LEGACY_BASELINE_POLICY_VERSION);
  assert.equal(pending.auditedMatch.policyVersion, TENDERBOOST_AUDITED_MATCH_POLICY_VERSION);
  assert.equal(pending.campaignPriority.policyVersion, TENDERBOOST_CAMPAIGN_PRIORITY_POLICY_VERSION);
  assert.equal(pending.legacyBaseline.matchScore, 95);
  assert.equal(pending.legacyBaseline.globalVerificationQuality, 91);
  assert.equal(pending.legacyBaseline.campaignPriority, 92);
  assert.notEqual(pending.legacyBaseline.campaignPriority, approved.legacyBaseline.campaignPriority, "frozen baseline retains its historical decision weight");
  assert.equal(pending.campaignPriority.value, approved.campaignPriority.value, "audited priority excludes consultant decision");
});

test("audits all 18 assessed pairs without manufacturing scores for the other 142", () => {
  const matches = buildAllMatches(demoTenders, demoSuppliers, snapshotNow);
  const assessed = matches.filter((item) => item.exactLegacyPair);
  const audited = assessed.filter((item) => item.auditedMatch.value !== null);
  const incomplete = assessed.filter((item) => item.auditedMatch.value === null);
  const unassessed = matches.filter((item) => !item.exactLegacyPair);
  assert.equal(assessed.length, 18);
  assert.equal(audited.length, 6);
  assert.equal(incomplete.length, 12);
  assert.equal(unassessed.length, 142);
  assert.ok(unassessed.every((item) => item.matchScore.value === null && item.auditedMatch.value === null));
  assert.ok(unassessed.every((item) => item.auditedMatch.reasonCodes.includes("PAIR_UNASSESSED")));
  assert.equal(matches.some((item) => item.matchScore.value === 0 || item.auditedMatch.value === 0), false);
  assert.deepEqual(
    Object.fromEntries(audited.map((item) => [item.key, [item.matchScore.value, item.auditedMatch.value, item.auditedMatch.legacyDelta]])),
    {
      "UP/ICB/26/01::supplier:TB:yutong": [95, 100, 5],
      "514110::supplier:TB:united_imaging": [92, 72, -20],
      "514122::supplier:TB:yutong": [92, 100, 8],
      "DPA14004203 / ICB 514062::supplier:TB:ncs_testing": [92, 94, 2],
      "ZR-SPACE-252528-GO-RFB::supplier:TB:chery": [88, 86, -2],
      "G05::supplier:TB:kingpeng": [85, 94, 9],
    },
  );
});

test("calculates components only from existing distinct qualifying evidence records", () => {
  const { tender, supplier, mapping } = pair("UP/ICB/26/01", "yutong");
  const audited = evaluateAuditedMatch(tender, supplier, 95, mapping);
  const evidenceIds = new Set(supplier.evidence.map((item) => item.id));
  assert.equal(audited.value, 100);
  assert.equal(audited.components.length, 2);
  assert.ok(audited.components.every((component) => component.value !== null));
  assert.ok(audited.evidenceIds.every((id) => evidenceIds.has(id)));
  assert.equal(new Set(audited.evidenceIds).size, audited.evidenceIds.length);

  const duplicated = structuredClone(mapping);
  duplicated.assignments[1].evidenceIds = [...duplicated.assignments[0].evidenceIds];
  const rejected = evaluateAuditedMatch(tender, supplier, 95, duplicated);
  assert.equal(rejected.value, null);
  assert.ok(rejected.reasonCodes.includes("EVIDENCE_RECORD_REUSED"));
});

test("is monotonic across declared semantic bands and does not count irrelevant evidence", () => {
  const { tender, supplier, mapping } = pair("UP/ICB/26/01", "yutong");
  const scores = [60, 80, 100].map((semanticBand) => {
    const changed = structuredClone(mapping);
    changed.assignments.find((item) => item.component === "technical-relevance").semanticBand = semanticBand;
    return evaluateAuditedMatch(tender, supplier, 95, changed).value;
  });
  assert.deepEqual(scores, [72, 86, 100]);

  const withIrrelevant = structuredClone(supplier);
  withIrrelevant.evidence.push({
    ...structuredClone(supplier.evidence[0]),
    id: "evidence:TB:yutong:irrelevant:999",
    field: "unrelated",
    value: "Unrelated high-confidence fact",
    confidence: 100,
  });
  assert.equal(evaluateAuditedMatch(tender, withIrrelevant, 95, mapping).value, 100);
  assert.equal(assessMatch(tender, withIrrelevant, snapshotNow).verificationQuality.value, assessMatch(tender, supplier, snapshotNow).verificationQuality.value);
});

test("returns reason-coded MISSING for absent, unknown, inferred, or low-confidence evidence", () => {
  const partial = pair("ACCESS/GOVTECH/GD-1", "huawei");
  const partialResult = evaluateAuditedMatch(partial.tender, partial.supplier, 85, partial.mapping);
  assert.equal(partialResult.value, null);
  assert.ok(partialResult.reasonCodes.includes("EVIDENCE_NOT_VERIFIED"));
  assert.ok(partialResult.missingInputs.includes("Distinct reviewed evidence for market or delivery relevance"));

  const strong = pair("UP/ICB/26/01", "yutong");
  const lowConfidence = structuredClone(strong.supplier);
  const technicalId = strong.mapping.assignments.find((item) => item.component === "technical-relevance").evidenceIds[0];
  lowConfidence.evidence.find((item) => item.id === technicalId).confidence = 74;
  const lowResult = evaluateAuditedMatch(strong.tender, lowConfidence, 95, strong.mapping);
  assert.equal(lowResult.value, null);
  assert.ok(lowResult.reasonCodes.includes("EVIDENCE_CONFIDENCE_BELOW_THRESHOLD"));
});

test("keeps urgency monotonic and keeps readiness and decision outside audited priority", () => {
  const { tender, supplier } = pair("UP/ICB/26/01", "yutong");
  const far = calculateDeadlineUrgency(deriveTenderFreshness(tender, "2026-08-15T12:00:00+05:00"));
  const near = calculateDeadlineUrgency(deriveTenderFreshness(tender, "2026-08-22T12:00:00+05:00"));
  const closed = calculateDeadlineUrgency(deriveTenderFreshness(tender, "2026-08-25T12:00:00+05:00"));
  assert.ok(near.value > far.value);
  assert.equal(closed.value, null);
  assert.equal(closed.valueClass, "MISSING");

  const base = assessMatch(tender, supplier, snapshotNow, "pending");
  const lowReadinessSupplier = { ...structuredClone(supplier), readiness: { ...supplier.readiness, value: 1 } };
  const lowReadiness = assessMatch(tender, lowReadinessSupplier, snapshotNow, "approved");
  assert.equal(base.campaignPriority.value, lowReadiness.campaignPriority.value);
  assert.equal(base.campaignPriority.method.includes("readiness and consultant decision are deliberately excluded"), true);
});

test("surfaces suppression, consent, material risk, approval, outreach, stale, and closed blockers separately", () => {
  const { tender, supplier } = pair("UP/ICB/26/01", "yutong");
  const blockedSupplier = {
    ...structuredClone(supplier),
    suppressionStatus: "UNKNOWN",
    consentStatus: "MISSING",
    risks: ["Unresolved debarment screening"],
  };
  const match = assessMatch(tender, blockedSupplier, "2027-01-01T12:00:00+05:00");
  const codes = new Set(evaluateCampaignEligibility(match, blockedSupplier).blockers.map((item) => item.code));
  for (const code of ["TENDER_CLOSED", "SNAPSHOT_STALE", "SUPPRESSION_REVIEW_REQUIRED", "CONSENT_REQUIRED", "MATERIAL_RISK_REVIEW", "CONSULTANT_APPROVAL_REQUIRED", "CAMPAIGN_APPROVAL_REQUIRED", "OUTREACH_EVENT_REQUIRED"]) {
    assert.ok(codes.has(code), `expected ${code}`);
  }
});

test("migrates schema 1.0.0 Cases explicitly while preserving decision provenance", () => {
  const { tender, supplier } = pair("UP/ICB/26/01", "yutong");
  const storage = new MemoryStorage();
  let current = createCaseResult("case:TB-TEST:SCHEMA-MIGRATION", tender, supplier, snapshotNow);
  current = setConsultantDecision(current, supplier, "hold", snapshotNow, { actorId: "consultant:migration", rationale: "Retain this historical review." });
  const historical = structuredClone(current);
  historical.schemaVersion = "1.0.0";
  historical.engineVersion = "tenderboost-match-campaign/1.0.0";
  delete historical.migration;
  delete historical.match.auditedMatch;
  delete historical.match.legacyBaseline;
  delete historical.match.deadlineUrgency;
  storage.setItem(`tenderapps:tenderboost:case:${encodeURIComponent(historical.caseIdentity.id)}`, JSON.stringify(historical));

  const migrated = loadCaseResult(storage, historical.caseIdentity.id, { tender, supplier, nowIso: "2026-08-16T12:00:00+05:00" });
  assert.equal(migrated.schemaVersion, TENDERBOOST_SCHEMA_VERSION);
  assert.equal(migrated.migration.status, "compatible-historical");
  assert.equal(migrated.migration.fromSchemaVersion, "1.0.0");
  assert.equal(migrated.match.consultantDecision, "hold");
  assert.equal(migrated.match.decisionHistory[0].actorId, "consultant:migration");
  assert.equal(migrated.match.auditedMatch.value, 100);

  const unsupported = { ...structuredClone(migrated), schemaVersion: "9.0.0" };
  storage.setItem(`tenderapps:tenderboost:case:${encodeURIComponent(unsupported.caseIdentity.id)}`, JSON.stringify(unsupported));
  assert.throws(() => loadCaseResult(storage, unsupported.caseIdentity.id, { tender, supplier, nowIso: snapshotNow }), /unsupported.*explicit migration/i);
});

test("documents the complete formula inventory, experiment result, and safe maturity", async () => {
  const [modelCard, playbook] = await Promise.all([
    readFile(path.join(projectRoot, "docs/tenderboost-scoring-model-card.md"), "utf8"),
    readFile(path.join(projectRoot, "docs/tenderboost-agent-03-integration.md"), "utf8"),
  ]);
  assert.match(modelCard, /48% Match \+ 18% readiness \+ 16% global verification \+ 11% deadline factor \+ 7% human relevance/);
  assert.match(modelCard, /Technical relevance × 0\.70 \+ Market\/delivery relevance × 0\.30/);
  assert.match(modelCard, /Audited Match Support × 0\.65 \+ Pair Evidence Quality × 0\.20 \+ Deadline Urgency × 0\.15/);
  assert.match(modelCard, /six numeric audited results/i);
  assert.match(modelCard, /concept-or-simulation/);
  assert.match(playbook, /A missing audited component could have been interpreted as weak fit/);
});
