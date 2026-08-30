import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  LEGACY_CAMPAIGN_SCHEMA_VERSION,
  LEGACY_CAMPAIGN_STORAGE_KEY,
  TENDERBOOST_DEMO_AS_OF,
  advanceLegacyCampaignSimulation,
  buildLegacyCampaignCadence,
  buildAllMatches,
  createCaseResult,
  createLegacyCampaign,
  demoSuppliers,
  demoTenders,
  deriveTenderFreshness,
  legacyCampaignActivationBlockers,
  legacyCampaignObjectiveRecommendation,
  loadLegacyCampaigns,
  markLegacyCampaignSaved,
  paritySummary,
  recommendedLegacyCampaignChannel,
  resetLegacyCampaignResponseSimulation,
  saveCaseResult,
  saveLegacyCampaigns,
  setConsultantDecision,
  startLegacyCampaignSimulation,
  tenderBoostParityManifest,
  toggleLegacyCampaignApproval,
} from "../packages/tenderboost/src/index.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const snapshotNow = "2026-08-15T12:00:00+05:00";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    values,
  };
}

function strongResult() {
  const tender = demoTenders.find((item) => item.reference === "514122");
  const supplier = demoSuppliers.find((item) => item.id === "supplier:TB:yutong");
  const result = createCaseResult("case:TM-DEMO:legacy-campaign-parity", tender, supplier, snapshotNow);
  return {
    tender,
    supplier,
    result: setConsultantDecision(result, "approved", "2026-08-15T12:15:00+05:00", {
      actorId: "consultant:parity-test",
      rationale: "Fixture-only approval for local lifecycle simulation coverage.",
    }),
  };
}

test("accounts for every frozen source surface with no missing parity items", () => {
  assert.equal(tenderBoostParityManifest.length, 90);
  assert.deepEqual(paritySummary(), {
    preserved: 26,
    "adapted-to-tenderapps-design": 14,
    "truth-corrected": 42,
    "intentionally-isolated-for-future-agent-separation": 8,
    missing: 0,
  });
  assert.equal(new Set(tenderBoostParityManifest.map((item) => item.id)).size, tenderBoostParityManifest.length);
  assert.equal(tenderBoostParityManifest.some((item) => item.status === "missing"), false);
  for (const source of ["01 Dashboard", "02 Market Radar / Tenders", "02 Market Radar / Suppliers", "03 Suppliers / Profiles", "03 Suppliers / Verification", "04 Tenders", "05 Full Match Matrix", "05 AutoMatch by Tenders", "05 AutoMatch by Suppliers", "06 Campaign Studio / Campaigns", "06 Campaign Studio / Follow-ups"]) {
    assert.ok(tenderBoostParityManifest.some((item) => item.sourceSurface === source), source);
  }
  for (const id of ["interaction-workspace-collapse", "content-objective-recommendation", "content-channel-recommendation", "content-sequence-channels", "interaction-explicit-campaign-save", "interaction-response-reset", "content-followup-next-action", "state-campaign-load-error", "state-campaign-autosave-error", "state-case-save-error", "data-deadline-baseline-vector"]) {
    const auditedItem = tenderBoostParityManifest.find((item) => item.id === id);
    assert.ok(auditedItem?.sourceEvidence, `${id} must retain a frozen-source locator or an explicit no-source statement`);
  }
});

test("reconstructs the exact frozen relative-deadline vector from absolute end-of-day deadlines", () => {
  assert.deepEqual(
    demoTenders.map((tender) => deriveTenderFreshness(tender, TENDERBOOST_DEMO_AS_OF).daysRemaining),
    [1, 1, 2, 2, 5, 5, 8, 8, 8, 8, 9, 11, 15, 16, 116, 135],
  );
});

test("keeps the frozen fixture cardinalities and explicit MISSING matrix cells", () => {
  const matches = buildAllMatches(demoTenders, demoSuppliers, snapshotNow);
  assert.equal(demoTenders.length, 16);
  assert.equal(demoSuppliers.length, 10);
  assert.equal(matches.length, 160);
  assert.equal(matches.filter((item) => item.matchScore.value !== null).length, 18);
  assert.equal(matches.filter((item) => item.matchScore.value === null).length, 142);
  assert.equal(matches.filter((item) => item.matchScore.value === 0).length, 0);
});

test("versions local campaign drafts and keeps approval separate from delivery", () => {
  const { tender, supplier, result } = strongResult();
  const draft = createLegacyCampaign(result, tender, supplier, "match-matrix", "consultant:parity-test", "2026-08-15T12:20:00+05:00");
  assert.equal(draft.schemaVersion, LEGACY_CAMPAIGN_SCHEMA_VERSION);
  assert.equal(draft.revision, 1);
  assert.equal(draft.stage, "draft");
  assert.equal(draft.communicationStatus, "NOT_SENT");
  assert.match(draft.draftCopy, /LOCAL DRAFT · NOT SENT/);
  assert.doesNotMatch(draft.draftCopy, /message sent|proposal sent|CRM action completed/i);

  const approved = toggleLegacyCampaignApproval(draft, "consultant:parity-test", "2026-08-15T12:25:00+05:00");
  assert.equal(approved.revision, 2);
  assert.equal(approved.stage, "approved");
  assert.equal(approved.communicationStatus, "NOT_SENT");
  assert.match(approved.approval.rationale, /not activation or delivery authorization/i);
  assert.equal(approved.events.at(-1).type, "CONTENT_APPROVED");
});

test("restores objective rationale, recommended channel, cadence channels, and explicit save provenance", () => {
  const { tender, supplier, result } = strongResult();
  const recommendation = legacyCampaignObjectiveRecommendation(result.match);
  assert.ok(recommendation.id);
  assert.match(recommendation.reason, /evidence|match|consultant|intelligence/i);
  const recommendedChannel = recommendedLegacyCampaignChannel(result, supplier, recommendation.id);
  assert.ok(recommendedChannel);
  const cadence = buildLegacyCampaignCadence(result, recommendedChannel);
  assert.ok(cadence.length >= 1);
  assert.ok(cadence.every((step) => step.channel && step.action && Number.isInteger(step.day)));
  assert.equal(cadence[0].channel, recommendedChannel);

  const draft = createLegacyCampaign(result, tender, supplier, "consultant", "consultant:parity-test", "2026-08-15T12:20:00+05:00");
  const saved = markLegacyCampaignSaved(draft, "consultant:parity-test", "2026-08-15T12:21:00+05:00");
  assert.equal(saved.revision, draft.revision + 1);
  assert.equal(saved.lastSavedAt, "2026-08-15T12:21:00+05:00");
  assert.equal(saved.events.at(-1).type, "DRAFT_SAVED");
  assert.equal(saved.communicationStatus, "NOT_SENT");
});

test("requires a simulation-start event before follow-up, interested, or no-response states", () => {
  const { tender, supplier, result } = strongResult();
  const draft = createLegacyCampaign(result, tender, supplier, "consultant", "consultant:parity-test", "2026-08-15T12:20:00+05:00");
  const approved = toggleLegacyCampaignApproval(draft, "consultant:parity-test", "2026-08-15T12:25:00+05:00");
  assert.throws(() => advanceLegacyCampaignSimulation(approved, "no-response", "consultant:parity-test", "2026-08-15T12:30:00+05:00"), /simulation-start event/i);

  const active = startLegacyCampaignSimulation(approved, result, supplier, "consultant:parity-test", "2026-08-15T12:30:00+05:00");
  assert.equal(active.stage, "active-simulation");
  assert.equal(active.communicationStatus, "NOT_SENT");
  assert.equal(active.events.at(-1).type, "SIMULATION_STARTED");
  assert.equal(active.events.at(-1).simulationOnly, true);

  const followup = advanceLegacyCampaignSimulation(active, "follow-up", "consultant:parity-test", "2026-08-15T12:35:00+05:00");
  const noResponse = advanceLegacyCampaignSimulation(followup, "no-response", "consultant:parity-test", "2026-08-15T12:40:00+05:00");
  assert.equal(noResponse.stage, "no-response-simulation");
  assert.equal(noResponse.events.at(-1).type, "SIMULATED_NO_RESPONSE");
  assert.match(noResponse.events.at(-1).rationale, /no sent communication/i);
  const closed = advanceLegacyCampaignSimulation(noResponse, "closed", "consultant:parity-test", "2026-08-15T12:45:00+05:00");
  assert.equal(closed.stage, "closed");
  assert.equal(closed.communicationStatus, "NOT_SENT");
});

test("records a page-level simulated response and a reversible versioned reset with next-action metadata", () => {
  const { tender, supplier, result } = strongResult();
  const draft = createLegacyCampaign(result, tender, supplier, "consultant", "consultant:parity-test", "2026-08-15T12:20:00+05:00");
  const approved = toggleLegacyCampaignApproval(draft, "consultant:parity-test", "2026-08-15T12:25:00+05:00");
  const active = startLegacyCampaignSimulation(approved, result, supplier, "consultant:parity-test", "2026-08-15T12:30:00+05:00");
  assert.match(active.nextAction, /response|follow-up/i);
  assert.ok(active.nextFollowUpAt);
  const response = advanceLegacyCampaignSimulation(active, "interested", "consultant:parity-test", "2026-08-15T12:35:00+05:00");
  const reset = resetLegacyCampaignResponseSimulation(response, "consultant:parity-test", "2026-08-15T12:40:00+05:00");
  assert.equal(reset.stage, "follow-up-simulation");
  assert.equal(reset.revision, response.revision + 1);
  assert.equal(reset.events.at(-1).type, "SIMULATED_RESPONSE_RESET");
  assert.equal(reset.events.at(-1).simulationOnly, true);
  assert.match(reset.nextAction, /response|close/i);
  assert.ok(reset.nextFollowUpAt);
  assert.equal(reset.communicationStatus, "NOT_SENT");
});

test("retains current evidence and deadline blockers even after local content approval", () => {
  const { tender, supplier, result } = strongResult();
  const closedResult = createCaseResult("case:TM-DEMO:closed-campaign", tender, supplier, "2026-08-30T12:00:00+05:00");
  const held = setConsultantDecision(closedResult, "hold", "2026-08-30T12:05:00+05:00", {
    actorId: "consultant:parity-test",
    rationale: "Hold after the source deadline.",
  });
  const blockers = legacyCampaignActivationBlockers(held, supplier);
  assert.ok(blockers.includes("CURRENT_MATCH_APPROVAL_REQUIRED"));
  assert.ok(blockers.includes("TENDER_CLOSED"));
  assert.ok(blockers.includes("TENDER_OR_SNAPSHOT_NOT_CURRENT"));
  assert.ok(blockers.includes("CURRENT_REVIEW_BLOCKERS_UNRESOLVED"));
  assert.equal(result.match.consultantDecision, "approved");
});

test("persists the isolated legacy module under its own safe storage key", () => {
  const { tender, supplier, result } = strongResult();
  const storage = memoryStorage();
  const draft = createLegacyCampaign(result, tender, supplier, "suggested", "consultant:parity-test", "2026-08-15T12:20:00+05:00");
  saveLegacyCampaigns(storage, [draft]);
  assert.ok(storage.values.has(LEGACY_CAMPAIGN_STORAGE_KEY));
  assert.equal(loadLegacyCampaigns(storage)[0].communicationStatus, "NOT_SENT");
  const unsafe = [{ ...draft, communicationStatus: "SENT" }];
  storage.setItem(LEGACY_CAMPAIGN_STORAGE_KEY, JSON.stringify(unsafe));
  assert.throws(() => loadLegacyCampaigns(storage), /unsupported or unsafe schema/i);
});

test("surfaces storage failures without mutating valid in-memory campaign or Case state", () => {
  const { tender, supplier, result } = strongResult();
  const draft = createLegacyCampaign(result, tender, supplier, "suggested", "consultant:parity-test", "2026-08-15T12:20:00+05:00");
  const inMemory = [draft];
  const failingWrite = { getItem: () => null, setItem: () => { throw new Error("quota denied"); }, removeItem: () => {} };
  assert.throws(() => saveLegacyCampaigns(failingWrite, inMemory), /quota denied/);
  assert.throws(() => saveCaseResult(failingWrite, result), /quota denied/);
  assert.strictEqual(inMemory[0], draft);
  assert.equal(inMemory[0].communicationStatus, "NOT_SENT");
  const failingRead = { getItem: () => { throw new Error("storage unavailable"); }, setItem: () => {}, removeItem: () => {} };
  assert.throws(() => loadLegacyCampaigns(failingRead), /storage unavailable/);
  assert.strictEqual(inMemory[0], draft);
});

test("renders every original view family in the TenderApps page without standalone shell or external maps", async () => {
  const page = await readFile(path.join(projectRoot, "apps/tender-apps/src/tenderboost-app.tsx"), "utf8");
  const styles = await readFile(path.join(projectRoot, "apps/tender-apps/src/tenderboost.css"), "utf8");
  for (const label of ["Overview", "Radar · Tenders", "Radar · Suppliers", "Supplier Profiles", "Verification", "Tenders", "Full Matrix", "By Tender", "By Supplier", "Case Audit", "Legacy Campaigns", "Legacy Follow-ups"]) assert.match(page, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  for (const content of ["Global Tender Demand", "Global Supplier Market", "Full Match Matrix", "AutoMatch by Tenders", "AutoMatch by Suppliers", "Suggested Campaign Drafts", "Campaign Pipeline", "Follow-ups", "ProposalPrep AI"]) assert.match(page, new RegExp(content));
  for (const content of ["AI RECOMMENDED", "Use recommendation", "Recommended:", "Save changes", "Simulate response", "Reset response simulation", "NEXT ACTION", "Next follow-up", "Campaign autosave failed", "Campaign workspace load failed", "Case save failed"]) assert.match(page, new RegExp(content));
  assert.match(page, /aria-controls="tb3-campaign-workspace-body"/);
  assert.match(page, /Day \{step\.day\} · \{step\.channel\}/);
  assert.match(page, /role="status"><b>\{record\.lastSavedAt/);
  assert.match(page, /role="alert"/);
  assert.match(page, /MISSING—not 0\/100/);
  assert.match(page, /NOT SENT · no event recorded/);
  assert.match(page, /data-map-mode="schematic-non-geospatial"/);
  assert.match(page, /viewSurfaceRef\.current\?\.focus\(\)/);
  assert.match(page, /role="region"[\s\S]+tabIndex=\{-1\}/);
  assert.match(styles, /\.tb3-view-surface:focus \{ outline: none; \}/);
  assert.match(styles, /\.tb3-product-intro aside > b \{ grid-column: 2; grid-row: 1; \}/);
  assert.match(styles, /\.tb3-product-intro aside strong \{ grid-column: 2; grid-row: 2; \}/);
  assert.doesNotMatch(page, /Agent Command Center|tb-topbar|tb-sidebar/);
  assert.doesNotMatch(`${page}\n${styles}`, /tileLayer|openstreetmap|wikimedia|leaflet/i);
});
