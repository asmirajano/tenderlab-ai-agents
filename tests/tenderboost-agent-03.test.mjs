import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  approveCampaignDraft,
  assessMatch,
  buildAllMatches,
  campaignSuggestions,
  createCampaignDraft,
  createCaseResult,
  demoSnapshot,
  demoSuppliers,
  demoTenders,
  deriveTenderFreshness,
  evaluateCampaignEligibility,
  loadCaseResult,
  recordCampaignEvent,
  saveCaseResult,
  setConsultantDecision,
  transitionCampaignLifecycle,
} from "../packages/tenderboost/src/index.ts";
import { clientProducts, tenderBoostProduct } from "../packages/catalog-data/src/client-products.ts";
import { realAgentImplementations } from "../packages/catalog-data/src/real-agent-development.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const currentNow = "2026-08-30T12:00:00+05:00";
const snapshotNow = "2026-08-15T12:00:00+05:00";

async function read(relativePath) {
  return readFile(path.join(projectRoot, relativePath), "utf8");
}

function selectedPositive(now = snapshotNow) {
  const match = buildAllMatches(demoTenders, demoSuppliers, now).find((candidate) => (candidate.matchScore.value ?? -1) > 0 && candidate.linkedStrengths.length > 0 && candidate.tenderFreshness.status !== "closed");
  assert.ok(match, "expected an open positive pair with evidence links");
  const tender = demoTenders.find((candidate) => candidate.id === match.tenderId);
  const supplier = demoSuppliers.find((candidate) => candidate.id === match.supplierId);
  assert.ok(tender && supplier);
  return { match, tender, supplier };
}

function controlledSupplier(supplier) {
  return {
    ...structuredClone(supplier),
    suppressionStatus: "NOT_SUPPRESSED",
    consentStatus: "RECORDED",
    risks: [],
    evidence: supplier.evidence.map((item) => ({ ...item, externalClaimEligible: item.reviewStatus === "LEGACY_VERIFIED" })),
  };
}

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

test("registers TenderBoost as practical page 03 under TL-A031 without creating Agent 003", async () => {
  assert.equal(clientProducts.length, 3);
  assert.equal(tenderBoostProduct.catalogOrder, 3);
  assert.equal(tenderBoostProduct.ownerAgentId, "agent:TL-A031");
  assert.equal(tenderBoostProduct.clientRoute, "/tenderboost");
  assert.notEqual(tenderBoostProduct.ownerAgentId, "agent:TL-A003");

  const implementation = realAgentImplementations.find((item) => item.id === "implementation:TEA-RAI-TENDERBOOST");
  assert.equal(implementation?.ownerAgentId, "agent:TL-A031");
  assert.equal(implementation?.maturity, "concept-or-simulation");
  assert.equal(implementation?.deploymentStatus, "not-deployed");
  assert.ok(implementation?.playbookRefs.includes("docs/tenderboost-agent-03-integration.md"));

  const agents = await read("packages/catalog-data/src/agents.ts");
  assert.equal((agents.match(/id:\s*31, name:\s*"Company-to-Tender Match Score Agent"/g) ?? []).length, 1);
});

test("retains the 16-tender and 10-supplier fixture only as a dated demonstration snapshot", () => {
  assert.equal(demoSnapshot.classification, "DATED DEMONSTRATION SNAPSHOT");
  assert.equal(demoSnapshot.sourceCommit, "04b0b2a723223d11617837ee0e7562fa48168cd9");
  assert.equal(demoTenders.length, 16);
  assert.equal(demoSuppliers.length, 10);
  assert.ok(demoTenders.every((item) => item.snapshotId === demoSnapshot.id));
  assert.ok(demoTenders.every((item) => item.deadlineAt.includes("T") && !Object.hasOwn(item, "daysLeft")));
  assert.ok(demoSuppliers.every((item) => item.suppressionStatus === "UNKNOWN" && item.consentStatus === "MISSING"));
  const matches = buildAllMatches(demoTenders, demoSuppliers, snapshotNow);
  assert.equal(matches.filter((item) => item.matchScore.value !== null).length, 18);
  assert.equal(matches.filter((item) => item.matchScore.value === null && item.matchScore.valueClass === "MISSING").length, 142);
  assert.equal(matches.filter((item) => item.matchScore.value === 0).length, 0, "the source fixture contains no genuine evaluated zero");
});

test("derives urgency from absolute deadlines and blocks stale or closed tender state", () => {
  const closed = deriveTenderFreshness(demoTenders[0], currentNow);
  assert.equal(closed.status, "closed");
  assert.equal(closed.daysRemaining, 0);
  assert.equal(closed.freshness, "stale");

  const future = deriveTenderFreshness(demoTenders.at(-1), currentNow);
  assert.equal(future.status, "open");
  assert.ok(future.daysRemaining > 100);
  assert.equal(future.freshness, "stale");

  const { supplier } = selectedPositive(currentNow);
  const closedMatch = assessMatch(demoTenders[0], supplier, currentNow);
  const eligibility = evaluateCampaignEligibility(closedMatch, supplier);
  assert.ok(eligibility.blockers.some((item) => item.code === "TENDER_CLOSED"));
  assert.ok(eligibility.blockers.some((item) => item.code === "SNAPSHOT_STALE"));
});

test("keeps Match, Readiness, Verification, Priority, and Decision distinct and links strengths to evidence IDs", () => {
  const { match, supplier } = selectedPositive();
  assert.equal(match.matchScore.valueClass, "ESTIMATED");
  assert.equal(match.supplierReadiness.valueClass, "ESTIMATED");
  assert.equal(match.verificationQuality.valueClass, "CALCULATED");
  assert.equal(match.campaignPriority.valueClass, "CALCULATED");
  assert.equal(match.consultantDecision, "pending");
  assert.notEqual(match.matchScore.method, match.supplierReadiness.method);
  assert.notEqual(match.campaignPriority.value, match.consultantDecision);
  assert.ok(match.linkedStrengths.length > 0);
  const evidenceIds = new Set(supplier.evidence.map((item) => item.id));
  for (const claim of match.linkedStrengths) {
    assert.ok(claim.evidenceIds.length > 0);
    assert.ok(claim.evidenceIds.every((id) => evidenceIds.has(id)));
    assert.equal(claim.externalClaimEligible, false, "legacy evidence must be refreshed before external use");
  }
});

test("keeps unassessed distinct from genuine zero and excludes both plus rejected or suppressed pairs", () => {
  const matches = buildAllMatches(demoTenders, demoSuppliers, currentNow);
  const unassessed = matches.find((item) => item.matchScore.value === null);
  assert.ok(unassessed);
  const unassessedSupplier = demoSuppliers.find((item) => item.id === unassessed.supplierId);
  assert.ok(unassessedSupplier);
  const unassessedEligibility = evaluateCampaignEligibility(unassessed, unassessedSupplier);
  assert.equal(unassessedEligibility.canPrepareDraft, false);
  assert.ok(unassessedEligibility.blockers.some((item) => item.code === "MATCH_UNASSESSED"));

  const { tender, supplier } = selectedPositive();
  const genuineZero = assessMatch(tender, supplier, snapshotNow);
  genuineZero.matchScore = { ...genuineZero.matchScore, value: 0, valueClass: "ESTIMATED", method: "synthetic evaluated-zero regression" };
  const zeroEligibility = evaluateCampaignEligibility(genuineZero, supplier);
  assert.equal(zeroEligibility.canPrepareDraft, false);
  assert.ok(zeroEligibility.blockers.some((item) => item.code === "ZERO_MATCH"));
  assert.equal(zeroEligibility.blockers.some((item) => item.code === "MATCH_UNASSESSED"), false);

  const rejected = assessMatch(tender, supplier, snapshotNow, "rejected");
  assert.equal(evaluateCampaignEligibility(rejected, supplier).canPrepareDraft, false);

  const suppressedSupplier = { ...supplier, suppressionStatus: "SUPPRESSED" };
  const positive = assessMatch(tender, suppressedSupplier, snapshotNow);
  assert.equal(evaluateCampaignEligibility(positive, suppressedSupplier).canPrepareDraft, false);

  assert.deepEqual(campaignSuggestions(demoTenders, demoSuppliers, currentNow), [], "every dated demo pair remains blocked by freshness, evidence, consent, or suppression review");
});

test("requires explicit events for active, follow-up, interested, and no-response lifecycle states", () => {
  const source = selectedPositive();
  const supplier = controlledSupplier(source.supplier);
  const tender = { ...source.tender, snapshotAsOf: snapshotNow };
  let result = createCaseResult("case:TB-TEST:LIFECYCLE", tender, supplier, snapshotNow);
  const stableMatchId = result.match.id;
  result = setConsultantDecision(result, supplier, "approved", snapshotNow, { actorId: "consultant:test", rationale: "Approved for lifecycle regression." });
  assert.equal(result.match.id, stableMatchId);
  assert.equal(result.match.version, "v2");
  assert.equal(result.match.decisionHistory.length, 1);
  assert.equal(result.match.decisionHistory[0].actorId, "consultant:test");
  assert.equal(result.match.decisionHistory[0].decidedAt, snapshotNow);
  assert.equal(result.match.decisionHistory[0].rationale, "Approved for lifecycle regression.");
  result = createCampaignDraft(result, tender, supplier, snapshotNow, "Email");
  result = approveCampaignDraft(result, supplier, "consultant:test", snapshotNow);
  assert.equal(result.campaign.version, "v2");

  assert.deepEqual(result.activation.blockers.map((item) => item.code), ["OUTREACH_EVENT_REQUIRED"]);
  assert.throws(() => transitionCampaignLifecycle(result, supplier, "active", snapshotNow), /outreach event/i);

  result = recordCampaignEvent(result, supplier, {
    type: "simulation-preview",
    mode: "simulation",
    occurredAt: snapshotNow,
    externalRecordId: null,
    note: "simulation only",
  }, snapshotNow);
  assert.equal(result.campaign.lifecycle, "approved");
  assert.equal(result.campaignEvents.length, 0);
  assert.equal(result.simulationEvents.length, 1);
  assert.throws(() => transitionCampaignLifecycle(result, supplier, "active", snapshotNow), /outreach event/i);
  assert.throws(() => recordCampaignEvent(result, supplier, {
    type: "outreach-sent",
    mode: "simulation",
    occurredAt: snapshotNow,
    externalRecordId: null,
    note: "invalid simulation",
  }, snapshotNow), /Simulation events cannot claim outreach/i);

  result = recordCampaignEvent(result, supplier, {
    type: "outreach-sent",
    mode: "manual-record",
    occurredAt: snapshotNow,
    externalRecordId: "external:test:message-1",
    note: "authorized test fixture",
  }, snapshotNow);
  assert.equal(result.activation.eligibleForActivation, true);
  result = transitionCampaignLifecycle(result, supplier, "active", snapshotNow);
  assert.equal(result.campaign.version, "v3");
  assert.equal(result.activation.blockers.some((item) => item.code === "CAMPAIGN_APPROVAL_REQUIRED"), false);
  assert.equal(result.activation.eligibleForActivation, true, "retained campaign approval remains valid after activation");
  result = transitionCampaignLifecycle(result, supplier, "follow-up", snapshotNow);
  assert.throws(() => transitionCampaignLifecycle(result, supplier, "interested", snapshotNow), /response event/i);
  result = recordCampaignEvent(result, supplier, {
    type: "response-interested",
    mode: "integration",
    occurredAt: snapshotNow,
    externalRecordId: "external:test:response-1",
    note: "authorized test fixture",
  }, snapshotNow);
  result = transitionCampaignLifecycle(result, supplier, "interested", snapshotNow);
  assert.equal(result.campaign.lifecycle, "interested");
});

test("blocks hold to active even when campaign approval and an outreach event exist", () => {
  const source = selectedPositive();
  const supplier = controlledSupplier(source.supplier);
  const tender = { ...source.tender, snapshotAsOf: snapshotNow };
  let result = createCaseResult("case:TB-TEST:HOLD-ACTIVE", tender, supplier, snapshotNow);
  result = setConsultantDecision(result, supplier, "approved", snapshotNow, { actorId: "consultant:one", rationale: "Initial positive review." });
  result = createCampaignDraft(result, tender, supplier, snapshotNow, "Email");
  result = approveCampaignDraft(result, supplier, "consultant:one", snapshotNow);
  result = setConsultantDecision(result, supplier, "hold", "2026-08-15T13:00:00+05:00", { actorId: "consultant:two", rationale: "Hold pending compliance clarification." });
  assert.equal(result.match.version, "v3");
  assert.equal(result.match.decisionHistory.length, 2);
  assert.equal(result.match.decisionHistory.at(-1).rationale, "Hold pending compliance clarification.");
  result = recordCampaignEvent(result, supplier, {
    type: "outreach-sent",
    mode: "manual-record",
    occurredAt: "2026-08-15T13:05:00+05:00",
    externalRecordId: "external:test:hold-message",
    note: "Regression event only.",
  }, "2026-08-15T13:05:00+05:00");
  assert.ok(result.activation.blockers.some((item) => item.code === "CONSULTANT_APPROVAL_REQUIRED"));
  assert.equal(result.activation.eligibleForActivation, false);
  assert.throws(() => transitionCampaignLifecycle(result, supplier, "active", "2026-08-15T13:06:00+05:00"), /not been approved by a consultant/i);
});

test("exercises the real no-response branch only after explicit outreach and observation events", () => {
  const source = selectedPositive();
  const supplier = controlledSupplier(source.supplier);
  const tender = { ...source.tender, snapshotAsOf: snapshotNow };
  let result = createCaseResult("case:TB-TEST:NO-RESPONSE", tender, supplier, snapshotNow);
  result = setConsultantDecision(result, supplier, "approved", snapshotNow, { actorId: "consultant:test", rationale: "Approved for no-response regression." });
  result = createCampaignDraft(result, tender, supplier, snapshotNow, "Email");
  result = approveCampaignDraft(result, supplier, "consultant:test", snapshotNow);
  result = recordCampaignEvent(result, supplier, {
    type: "outreach-sent",
    mode: "integration",
    occurredAt: snapshotNow,
    externalRecordId: "external:test:no-response-send",
    note: "Authorized regression fixture.",
  }, snapshotNow);
  result = transitionCampaignLifecycle(result, supplier, "active", snapshotNow);
  result = transitionCampaignLifecycle(result, supplier, "follow-up", snapshotNow);
  assert.throws(() => transitionCampaignLifecycle(result, supplier, "no-response", snapshotNow), /observation event/i);
  result = recordCampaignEvent(result, supplier, {
    type: "no-response-observed",
    mode: "manual-record",
    occurredAt: "2026-08-20T12:00:00+05:00",
    externalRecordId: "external:test:no-response-observation",
    note: "Observation recorded by authorized regression fixture.",
  }, "2026-08-20T12:00:00+05:00");
  result = transitionCampaignLifecycle(result, supplier, "no-response", "2026-08-20T12:01:00+05:00");
  assert.equal(result.campaign.lifecycle, "no-response");
  assert.ok(result.campaignEvents.some((item) => item.type === "no-response-observed"));
});

test("generates truthful no-send copy from the canonical Case result", () => {
  const { tender, supplier } = selectedPositive();
  let result = createCaseResult("case:TB-TEST:COPY", tender, supplier, snapshotNow);
  result = createCampaignDraft(result, tender, supplier, snapshotNow, "LinkedIn");
  assert.match(result.campaign.copy, /LINKEDIN DRAFT · NOT SENT/);
  assert.match(result.campaign.copy, /Absolute deadline:/);
  assert.match(result.campaign.copy, /No current reviewed evidence is approved for external use/);
  assert.doesNotMatch(result.campaign.copy, /proposal sent|message sent|response received/i);
  assert.equal(result.campaign.copyEvidenceIds.length, 0);
});

test("persists and reconstructs only the explicitly requested Case ID", () => {
  const { tender, supplier } = selectedPositive();
  const storage = new MemoryStorage();
  const first = createCaseResult("case:TB-TEST:ONE", tender, supplier, snapshotNow);
  const second = createCaseResult("case:TB-TEST:TWO", tender, supplier, snapshotNow);
  saveCaseResult(storage, first);
  saveCaseResult(storage, second);
  const firstLoaded = loadCaseResult(storage, first.caseIdentity.id, { tender, supplier, nowIso: snapshotNow });
  const secondLoaded = loadCaseResult(storage, second.caseIdentity.id, { tender, supplier, nowIso: snapshotNow });
  assert.equal(firstLoaded?.caseIdentity.id, first.caseIdentity.id);
  assert.equal(secondLoaded?.caseIdentity.id, second.caseIdentity.id);
  assert.equal(firstLoaded?.resultIdentity.version, "v2", "resuming produces an explicit result revision");
  assert.equal(firstLoaded?.match.version, "v2", "clock-derived match state is revisioned");
  assert.equal(loadCaseResult(storage, "case:TB-TEST:MISSING", { tender, supplier, nowIso: snapshotNow }), null);
  assert.equal([...storage.values.keys()].some((key) => /latest/i.test(key)), false);
});

test("recomputes freshness from an injected clock when a persisted Case is resumed", () => {
  const { tender, supplier } = selectedPositive();
  const storage = new MemoryStorage();
  const savedBeforeDeadline = createCaseResult("case:TB-TEST:STALE-RESUME", tender, supplier, snapshotNow);
  assert.notEqual(savedBeforeDeadline.match.tenderFreshness.status, "closed");
  saveCaseResult(storage, savedBeforeDeadline);
  const resumed = loadCaseResult(storage, savedBeforeDeadline.caseIdentity.id, {
    tender,
    supplier,
    nowIso: "2027-01-01T12:00:00+05:00",
  });
  assert.equal(resumed?.match.tenderFreshness.status, "closed");
  assert.equal(resumed?.match.tenderFreshness.freshness, "stale");
  assert.equal(resumed?.match.tenderFreshness.daysRemaining, 0);
  assert.equal(resumed?.match.campaignPriority.value, null);
  assert.ok(resumed?.activation.blockers.some((item) => item.code === "TENDER_CLOSED"));
});

test("integrates the route and shared shell without a Command Center backlink or external map dependency", async () => {
  const [main, page, styles, registry, shell, firebase] = await Promise.all([
    read("apps/tender-apps/src/main.tsx"),
    read("apps/tender-apps/src/tenderboost-app.tsx"),
    read("apps/tender-apps/src/tenderboost.css"),
    read("apps/tender-apps/src/practical-agent-registry.tsx"),
    read("apps/tender-apps/src/client-shell.css"),
    read("firebase.json"),
  ]);
  assert.match(main, /"\/tenderboost": <TenderBoostApp/);
  assert.match(main, /"\/tenderboost-ai": "\/tenderboost"/);
  assert.match(main, /route\.surfaceStatus/);
  assert.match(registry, /productId: "product:TA-TENDERBOOST"/);
  assert.match(registry, /Evidence-linked match to campaign brief/);
  assert.match(page, /data-map-mode="schematic-non-geospatial"/);
  assert.match(page, /SCHEMATIC · NON-GEOSPATIAL/);
  assert.match(page, /not a live map, distance model, coordinate plot, or routing result/);
  assert.match(page, /No send integration connected/);
  assert.match(page, /Simulation events are stored separately/);
  assert.doesNotMatch(`${main}\n${page}`, /Command Center|top-navigation|Participation Boost proposal sent/);
  assert.doesNotMatch(`${main}\n${page}`, /from ["']leaflet["']|import\(["']leaflet["']\)|https?:\/\/(?:[^\s"']*openstreetmap|[^\s"']*wikimedia)/i);
  assert.match(styles, /@media \(max-width: 1120px\)/);
  assert.match(styles, /@media \(max-width: 1040px\)[\s\S]*?\.tb3-page \{ padding-top: 170px; \}/);
  assert.match(styles, /@media \(max-width: 560px\)/);
  assert.match(styles, /@media \(max-width: 560px\)[\s\S]*?\.tb3-page \{ padding-top: 148px; \}/);
  assert.match(shell, /--boost-content-max-width:\s*1640px/);
  assert.doesNotMatch(firebase, /tenderboost-ai\.web\.app|tenderboost-ai/);
});
