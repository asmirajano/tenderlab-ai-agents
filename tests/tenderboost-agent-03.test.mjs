import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  TENDERMATCH_SCHEMA_VERSION,
  assessMatch,
  buildAllMatches,
  createCaseResult,
  demoSuppliers,
  demoTenders,
  deriveTenderFreshness,
  evaluateConsultantReviewSupport,
  loadCaseResult,
  saveCaseResult,
  setConsultantDecision,
} from "../packages/tenderboost/src/index.ts";
import { agents } from "../packages/catalog-data/src/agents.ts";
import { clientProducts, tenderMatchProduct } from "../packages/catalog-data/src/client-products.ts";
import { realAgentImplementations } from "../packages/catalog-data/src/real-agent-development.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const snapshotNow = "2026-08-15T12:00:00+05:00";
const currentNow = "2026-08-30T12:00:00+05:00";

function read(relativePath) {
  return readFile(path.join(projectRoot, relativePath), "utf8");
}

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    values,
  };
}

function fixturePair() {
  return {
    tender: demoTenders.find((item) => item.reference === "514122"),
    supplier: demoSuppliers.find((item) => item.id === "supplier:TB:yutong"),
  };
}

test("places TenderMatch as practical page 03 under TL-A031 without creating or implying Agent 003", () => {
  assert.equal(agents.length, 64);
  assert.equal(clientProducts.length, 3);
  assert.equal(tenderMatchProduct.catalogOrder, 3);
  assert.equal(tenderMatchProduct.ownerAgentId, "agent:TL-A031");
  assert.notEqual(tenderMatchProduct.ownerAgentId, "agent:TL-A003");
  assert.equal(tenderMatchProduct.name, "TenderMatch");
  assert.equal(tenderMatchProduct.clientRoute, "/tendermatch");
  assert.match(tenderMatchProduct.descriptor, /Company × Tender evaluation/);

  const owner = agents.find((item) => item.registryId === "agent:TL-A031");
  assert.equal(owner?.name, "Company-to-Tender Match Score Agent");
  assert.equal(owner?.output.primary, "Объяснимая оценка Company × Tender");

  const implementation = realAgentImplementations.find((item) => item.id === "implementation:TEA-RAI-TENDERBOOST");
  assert.equal(implementation?.name, "TenderMatch · TenderApps Agent 03");
  assert.equal(implementation?.slug, "tendermatch");
  assert.equal(implementation?.ownerAgentId, "agent:TL-A031");
  assert.match(implementation?.primaryOutput ?? "", /evidence-gated audited result or explicit MISSING state/);
  assert.doesNotMatch(JSON.stringify(implementation), /campaign|outreach|crm|promotion|advertis/i);
});

test("keeps 18 assessed pairs and 142 unassessed pairs as MISSING rather than zero", () => {
  const matches = buildAllMatches(demoTenders, demoSuppliers, snapshotNow);
  assert.equal(matches.length, 160);
  assert.equal(matches.filter((item) => item.matchScore.value !== null).length, 18);
  assert.equal(matches.filter((item) => item.matchScore.value === null).length, 142);
  assert.equal(matches.filter((item) => item.matchScore.value === 0).length, 0);

  const { tender, supplier } = fixturePair();
  const unassessedSupplier = demoSuppliers.find((item) => item.id === "supplier:TB:huawei");
  const unassessed = assessMatch(tender, unassessedSupplier, snapshotNow);
  assert.equal(unassessed.matchScore.value, null);
  assert.equal(unassessed.matchScore.valueClass, "MISSING");
  assert.equal(unassessed.auditedMatch.value, null);
  assert.deepEqual(unassessed.auditedMatch.reasonCodes, ["PAIR_UNASSESSED"]);

  const zeroSupplier = {
    ...supplier,
    legacyTenderMatches: supplier.legacyTenderMatches.map((item) => item.tenderReference === tender.reference ? { ...item, score: 0 } : item),
  };
  const genuineZero = assessMatch(tender, zeroSupplier, snapshotNow);
  assert.equal(genuineZero.exactLegacyPair, true);
  assert.equal(genuineZero.matchScore.value, 0);
  assert.equal(genuineZero.matchScore.valueClass, "ESTIMATED");
  assert.notEqual(genuineZero.matchScore.value, unassessed.matchScore.value);
});

test("keeps Match Support, readiness, evidence quality, deadline context, and consultant decision separate", () => {
  const { tender, supplier } = fixturePair();
  const base = assessMatch(tender, supplier, snapshotNow, "pending");
  const approved = assessMatch(tender, { ...supplier, readiness: { ...supplier.readiness, value: 1 } }, snapshotNow, "approved");
  assert.equal(base.auditedMatch.value, 100);
  assert.equal(approved.auditedMatch.value, base.auditedMatch.value);
  assert.equal(approved.verificationQuality.value, base.verificationQuality.value);
  assert.equal(approved.deadlineUrgency.value, base.deadlineUrgency.value);
  assert.notEqual(approved.supplierReadiness.value, base.supplierReadiness.value);
  assert.equal("campaignPriority" in base, false);
});

test("recomputes absolute deadline freshness with an injected clock", () => {
  const { tender } = fixturePair();
  const before = deriveTenderFreshness(tender, snapshotNow);
  const after = deriveTenderFreshness(tender, "2026-08-17T00:00:00+05:00");
  assert.equal(before.status, "urgent");
  assert.equal(after.status, "closed");
  assert.equal(after.daysRemaining, 0);
});

test("surfaces separately owned current-review findings without changing the score", () => {
  const { tender, supplier } = fixturePair();
  const current = assessMatch(tender, supplier, currentNow);
  const support = evaluateConsultantReviewSupport(current, supplier);
  const codes = new Set(support.findings.map((item) => item.code));
  assert.equal(current.auditedMatch.value, 100);
  assert.equal(support.readyForCurrentDecision, false);
  assert.ok(codes.has("TENDER_CLOSED"));
  assert.ok(codes.has("SNAPSHOT_STALE"));
  assert.ok(codes.has("EVIDENCE_REFRESH_REQUIRED"));
  assert.equal(support.findings.find((item) => item.code === "TENDER_CLOSED")?.ownerAgentId, "agent:TL-A017");
  assert.equal(support.findings.find((item) => item.code === "EVIDENCE_REFRESH_REQUIRED")?.ownerAgentId, "agent:TL-A003");

  const risky = { ...supplier, risks: [...supplier.risks, "Sanctions screening unresolved"] };
  const riskSupport = evaluateConsultantReviewSupport(assessMatch(tender, risky, snapshotNow), risky);
  assert.equal(riskSupport.findings.find((item) => item.code === "MATERIAL_RISK_HANDOFF")?.ownerAgentId, "agent:TL-A038");
});

test("records consultant decision revisions with actor, timestamp, and rationale without changing formula outputs", () => {
  const { tender, supplier } = fixturePair();
  const initial = createCaseResult("case:TM-DEMO:decision", tender, supplier, snapshotNow);
  const approved = setConsultantDecision(initial, "approved", "2026-08-15T13:00:00+05:00", {
    actorId: "consultant:one",
    rationale: "Reviewed both evidence components.",
  });
  assert.equal(approved.match.version, "v2");
  assert.equal(approved.caseIdentity.version, "v2");
  assert.equal(approved.match.consultantDecision, "approved");
  assert.equal(approved.match.decisionHistory.length, 1);
  assert.deepEqual(approved.match.decisionHistory[0], {
    id: "match-decision:TM:case-tm-demo-decision:1",
    version: "v1",
    decision: "approved",
    actorId: "consultant:one",
    decidedAt: "2026-08-15T13:00:00+05:00",
    rationale: "Reviewed both evidence components.",
    sourceRole: "USER_ASSERTION",
    valueClass: "SOURCE",
  });
  assert.equal(approved.match.auditedMatch.value, initial.match.auditedMatch.value);
  assert.equal(approved.match.deadlineUrgency.value, initial.match.deadlineUrgency.value);
});

test("reconstructs only an explicit TenderMatch Case and makes a saved pre-deadline Case closed after the deadline", () => {
  const { tender, supplier } = fixturePair();
  const storage = memoryStorage();
  const original = createCaseResult("case:TM-DEMO:stale-resume", tender, supplier, snapshotNow);
  saveCaseResult(storage, original);
  assert.ok(storage.values.has("tenderapps:tendermatch:case:case%3ATM-DEMO%3Astale-resume"));
  assert.equal(loadCaseResult(storage, "case:TM-DEMO:missing", { tender, supplier, nowIso: currentNow }), null);
  const resumed = loadCaseResult(storage, original.caseIdentity.id, { tender, supplier, nowIso: currentNow });
  assert.equal(resumed?.match.tenderFreshness.status, "closed");
  assert.equal(resumed?.match.tenderFreshness.freshness, "stale");
  assert.equal(resumed?.match.auditedMatch.value, original.match.auditedMatch.value);
  assert.ok(resumed?.reviewSupport.findings.some((item) => item.code === "TENDER_CLOSED"));
});

test("migrates legacy TenderBoost Cases into the matching-only schema without overwriting the legacy record", () => {
  const { tender, supplier } = fixturePair();
  const storage = memoryStorage();
  const caseId = "case:TB-DEMO:historical";
  const historical = createCaseResult(caseId, tender, supplier, snapshotNow);
  historical.schemaVersion = "2.0.0";
  historical.campaign = { id: "campaign:historical" };
  historical.campaignEvents = [{ id: "event:historical" }];
  const legacyKey = `tenderapps:tenderboost:case:${encodeURIComponent(caseId)}`;
  storage.setItem(legacyKey, JSON.stringify(historical));

  const migrated = loadCaseResult(storage, caseId, { tender, supplier, nowIso: currentNow });
  assert.equal(migrated?.schemaVersion, TENDERMATCH_SCHEMA_VERSION);
  assert.equal(migrated?.migration.status, "compatible-historical");
  assert.equal(migrated?.migration.fromSchemaVersion, "2.0.0");
  assert.equal(migrated?.migration.sourceProductName, "TenderBoost AI");
  assert.equal("campaign" in migrated, false);
  assert.equal("campaignEvents" in migrated, false);
  assert.ok(storage.values.has(legacyKey));
  assert.equal(storage.values.has(`tenderapps:tendermatch:case:${encodeURIComponent(caseId)}`), false);
  saveCaseResult(storage, migrated);
  assert.ok(storage.values.has(`tenderapps:tendermatch:case:${encodeURIComponent(caseId)}`));
  assert.ok(storage.values.has(legacyKey));
});

test("uses the canonical TenderMatch route, safe compatibility aliases, truthful shared-shell metadata, and no active downstream action UI", async () => {
  const [main, page, styles, registry, firebase] = await Promise.all([
    read("apps/tender-apps/src/main.tsx"),
    read("apps/tender-apps/src/tenderboost-app.tsx"),
    read("apps/tender-apps/src/tenderboost.css"),
    read("apps/tender-apps/src/practical-agent-registry.tsx"),
    read("firebase.json"),
  ]);
  assert.match(main, /"\/tendermatch": <TenderMatchApp/);
  assert.match(main, /"\/tenderboost": "\/tendermatch"/);
  assert.match(main, /"\/tenderboost-ai": "\/tendermatch"/);
  assert.match(registry, /displayName: "TenderMatch"/);
  assert.match(registry, /Evidence-linked Company × Tender evaluation/);
  assert.match(page, /TENDERAPPS AGENT 03/);
  assert.match(page, /Tender<em>Match<\/em>/);
  assert.match(page, /SCHEMATIC · NON-GEOSPATIAL/);
  assert.match(page, /data-map-mode="schematic-non-geospatial"/);
  assert.doesNotMatch(`${page}\n${registry}\n${styles}`, /Campaign Studio|campaign brief|outreach|CRM action|response tracking/i);
  assert.doesNotMatch(page, /Command Center|\/products/);
  assert.doesNotMatch(`${page}\n${styles}`, /leaflet|openstreetmap|wikimedia/i);
  assert.doesNotMatch(firebase, /tenderboost-ai\.web\.app/);
});

test("retains Campaign Studio only as an unregistered future capability candidate", async () => {
  const candidate = await read("docs/campaign-studio-future-capability-candidate.md");
  assert.match(candidate, /unplaced future capability candidate/i);
  assert.match(candidate, /outside TenderMatch and `agent:TL-A031`/);
  assert.match(candidate, /No assumption is made that it requires Agent 65/);
  assert.equal(clientProducts.some((item) => /campaign/i.test(`${item.name} ${item.descriptor}`)), false);
  assert.equal(realAgentImplementations.some((item) => /campaign/i.test(`${item.name} ${item.descriptor} ${item.tor}`)), false);
});
