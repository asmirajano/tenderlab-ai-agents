import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { once } from "node:events";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  TENDERMATCH_EXPLORATORY_ENGINE_VERSION,
  TENDERMATCH_EXPLORATORY_POLICY_VERSION,
  TENDERMATCH_SUPPLIER_BATCH_CODE,
  TENDERMATCH_SUPPLIER_CONSUMER_ROLE,
  TENDERMATCH_SUPPLIER_CONTRACT_VERSION,
  TENDERMATCH_SUPPLIER_CURRENT_EVIDENCE_VIEW,
  TENDERMATCH_SUPPLIER_CURRENT_PROFILE_VIEW,
  TENDERMATCH_SUPPLIER_PROFILE_VERSION,
  TENDERMATCH_SUPPLIER_VERSIONED_EVIDENCE_VIEW,
  TENDERMATCH_SUPPLIER_VERSIONED_PROFILE_VIEW,
  buildExploratoryEvaluationInventory,
  evaluateExploratoryPair,
  runtimeTenders,
  summarizeExploratoryEvaluations,
} from "../packages/tendermatch/src/index.ts";
import { createTenderMatchLocalServer } from "../scripts/serve-tendermatch-local.mjs";
import { parseSupplierListParameters, validateSupplierConnectionTarget, validateSupplierId } from "../scripts/lib/tendermatch-supplier-store.mjs";
import { validateTenderMatchRuntimePayload } from "../apps/tender-apps/src/tendermatch-supplier-api.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const evaluatedAt = "2026-09-01T10:00:00.000Z";

function uuid(index) {
  return `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

function profile(index, overrides = {}) {
  const stated = index < 5 ? 14 : 13;
  return {
    canonicalEntityId: uuid(index + 1),
    profileVersionId: uuid(index + 1001),
    profileVersion: TENDERMATCH_SUPPLIER_PROFILE_VERSION,
    batchId: uuid(9999),
    batchCode: TENDERMATCH_SUPPLIER_BATCH_CODE,
    sourceCandidateId: `candidate-${index + 1}`,
    legalName: `Supplier ${String(index + 1).padStart(2, "0")}`,
    displayName: `Supplier ${String(index + 1).padStart(2, "0")}`,
    countryCode: index % 2 ? "DE" : "JP",
    city: null,
    region: null,
    classification: index < 14 ? "GOODS" : "WORKS",
    productFamilies: index < 14 ? ["industrial equipment"] : [],
    worksSpecializations: index >= 14 ? ["construction works"] : [],
    industriesServed: ["infrastructure"],
    materials: [],
    certifications: [],
    operatingGeography: [],
    capacity: null,
    revenueOrTurnover: null,
    readinessStatus: "usable_with_limitations",
    readinessReasons: ["Independent review required"],
    readinessGateResults: {},
    readinessContractVersion: "v1.3",
    verificationStatus: "under_review",
    coverageSummary: {},
    evidenceClaimCount: 17,
    evidenceVerifiedCount: 0,
    evidenceInferredCount: 1,
    evidenceStatedUnverifiedCount: stated,
    evidenceUnknownCount: 16 - stated,
    claimsWithSavedArtifact: 1 + stated,
    sourceRecordIds: [],
    sourceArtifactIds: [],
    ...overrides,
  };
}

function evidenceRecord(profileRecord, index, overrides = {}) {
  return {
    canonicalEntityId: profileRecord.canonicalEntityId,
    profileVersionId: profileRecord.profileVersionId,
    claimId: uuid(index + 20001),
    externalClaimId: `claim-${index}`,
    field: "product_families",
    value: "industrial equipment",
    normalizedValue: ["industrial equipment"],
    status: "STATED_UNVERIFIED",
    sourceSystem: "safe-projection",
    sourceTitle: "Saved supplier evidence",
    sourceUrl: null,
    retrievedAt: evaluatedAt,
    sourceRecordId: uuid(index + 30001),
    sourceArtifactId: uuid(index + 40001),
    artifactAvailable: true,
    artifactStatus: "available",
    artifactSha256: "a".repeat(64),
    artifactLimitation: "",
    ...overrides,
  };
}

function contractData() {
  const profiles = Array.from({ length: 17 }, (_, index) => profile(index));
  const evidence = profiles.flatMap((entry, profileIndex) => Array.from({ length: 17 }, (_, claimIndex) => {
    const stated = entry.evidenceStatedUnverifiedCount;
    if (claimIndex === 0) return evidenceRecord(entry, profileIndex * 17 + claimIndex, { field: "identity_country", value: entry.countryCode, status: "INFERRED" });
    if (claimIndex <= stated) return evidenceRecord(entry, profileIndex * 17 + claimIndex, { field: claimIndex % 2 ? "product_families" : "industries_served" });
    return evidenceRecord(entry, profileIndex * 17 + claimIndex, { field: "certifications", value: null, normalizedValue: null, status: "UNKNOWN", sourceArtifactId: null, artifactAvailable: false, artifactStatus: "not-linked", artifactSha256: null, artifactLimitation: "No saved artifact is linked." });
  }));
  return { profiles, evidence };
}

function mockStore({ fail = false, drift = false } = {}) {
  const data = contractData();
  if (drift) data.profiles[0] = { ...data.profiles[0], profileVersion: "unapproved" };
  return {
    async loadAll() { if (fail) throw new Error("unavailable"); return data; },
    async listSuppliers(filters) {
      let values = data.profiles.filter((entry) => !filters.readiness.length || filters.readiness.includes(entry.readinessStatus));
      if (filters.country) values = values.filter((entry) => entry.countryCode === filters.country);
      if (filters.classification) values = values.filter((entry) => entry.classification === filters.classification);
      if (filters.afterName && filters.afterId) values = values.filter((entry) => entry.displayName.toLowerCase() > filters.afterName || (entry.displayName.toLowerCase() === filters.afterName && entry.canonicalEntityId > filters.afterId));
      const profiles = values.slice(0, filters.limit);
      const final = profiles.at(-1);
      return { profiles, nextCursor: profiles.length === filters.limit && final ? { afterName: final.displayName.toLowerCase(), afterId: final.canonicalEntityId } : null };
    },
    async supplierDetail(id) { return data.profiles.find((entry) => entry.canonicalEntityId === id) ?? null; },
    async supplierEvidence(id) { return data.evidence.filter((entry) => entry.canonicalEntityId === id); },
  };
}

async function listeningServer(store) {
  const runtime = await createTenderMatchLocalServer({ store, distDir: path.join(projectRoot, "apps/tender-apps/dist"), clock: () => evaluatedAt });
  runtime.server.listen(0, "127.0.0.1");
  await once(runtime.server, "listening");
  const address = runtime.server.address();
  return { ...runtime, origin: `http://127.0.0.1:${address.port}` };
}

test("Formula v1.1 emits a coverage-adjusted numeric score and keeps diagnostics separate", () => {
  const supplier = profile(0, { displayName: "Transformer Works", classification: "GOODS" });
  const tender = { ...runtimeTenders[0], title: "Supply of power transformers for a new substation", object: "GOODS", procurementType: "GOODS", description: "Electrical grid equipment" };
  const evidence = [
    evidenceRecord(supplier, 1, { field: "product_families", value: "Power transformer and switchgear" }),
    evidenceRecord(supplier, 2, { field: "industries_served", value: "Electrical transformer manufacturing" }),
    evidenceRecord(supplier, 3, { field: "capacity", value: "Production facilities: 12" }),
    evidenceRecord(supplier, 4, { field: "geographic_markets", value: "Global; Asia" }),
  ];
  const first = evaluateExploratoryPair(tender, supplier, evidence, evaluatedAt);
  assert.deepEqual(evaluateExploratoryPair(tender, supplier, evidence, evaluatedAt), first);
  assert.equal(first.engineVersion, TENDERMATCH_EXPLORATORY_ENGINE_VERSION);
  assert.equal(first.policyVersion, TENDERMATCH_EXPLORATORY_POLICY_VERSION);
  assert.equal(first.valueClass, "ESTIMATED");
  assert.ok(first.value >= 0);
  assert.equal(first.procurementApplicability.compatible, true);
  assert.ok(first.technicalRelevance.evidenceIds.length >= 2);
  assert.equal(first.dataCoverage, 65);
  assert.equal(first.evidenceConfidence, 50);
  assert.equal(first.pairStatus, "UNASSESSED");
  assert.equal(first.value, Math.round(first.assessedFitScore * first.dataCoverage / 100));
  assert.equal(first.supplierReadinessStatus, "usable_with_limitations");
  assert.equal(first.consultantDecision, "pending");
});

test("keeps gates, missing evidence and unavailable artifacts diagnostic while always scoring", () => {
  const supplier = profile(0, { classification: "GOODS" });
  const goodsTender = { ...runtimeTenders[0], title: "Supply of hospital diagnostic equipment", object: "GOODS", procurementType: "GOODS" };
  const strong = [evidenceRecord(supplier, 1, { value: "medical diagnostic equipment" }), evidenceRecord(supplier, 2, { field: "industries_served", value: "medical healthcare diagnostics" }), evidenceRecord(supplier, 3, { field: "capacity", value: "Production facilities: 12" }), evidenceRecord(supplier, 4, { field: "geographic_markets", value: "Global; Asia" })];
  const cases = [
    evaluateExploratoryPair({ ...goodsTender, procurementType: "WORKS", object: "WORKS" }, supplier, strong, evaluatedAt),
    evaluateExploratoryPair(goodsTender, supplier, [evidenceRecord(supplier, 5, { value: "office furniture" }), evidenceRecord(supplier, 6, { field: "capacity", value: "Factory: 1" }), evidenceRecord(supplier, 7, { field: "geographic_markets", value: "Global" })], evaluatedAt),
    evaluateExploratoryPair(goodsTender, supplier, [evidenceRecord(supplier, 8, { value: null, normalizedValue: null, status: "UNKNOWN", artifactAvailable: false })], evaluatedAt),
    evaluateExploratoryPair(goodsTender, supplier, strong.map((entry) => ({ ...entry, artifactAvailable: false, sourceArtifactId: null })), evaluatedAt),
  ];
  assert.ok(cases.every((entry) => entry.pairStatus === "UNASSESSED"));
  assert.ok(cases.every((entry) => Number.isInteger(entry.value)));
  assert.equal(cases[0].value, 0);
  assert.equal(cases[2].value, 0);
  assert.ok(cases[0].reasonCodes.includes("PROCUREMENT_TYPE_SUPPLIER_ROLE"));
  assert.ok(cases[3].reasonCodes.includes("CITED_ARTIFACT_UNAVAILABLE"));
  assert.deepEqual(cases[3].evidenceCoverage, { cited: 4, availableArtifacts: 0, unavailableArtifacts: 4 });
});

test("keeps capacity and turnover separate from technical fit", () => {
  const supplier = profile(0);
  const tender = { ...runtimeTenders[0], title: "Supply industrial equipment", object: "GOODS", procurementType: "GOODS" };
  const evidence = [evidenceRecord(supplier, 1, { field: "capacity", value: "1,000 units" }), evidenceRecord(supplier, 2, { field: "financial", value: "USD 10m" })];
  const result = evaluateExploratoryPair(tender, supplier, evidence, evaluatedAt);
  assert.equal(result.value, 12);
  assert.equal(result.capacity.state, "stated-unverified");
  assert.equal(result.capacity.usedInTechnicalFit, false);
  assert.equal(result.turnover.usedInTechnicalFit, false);
});

test("builds exactly 1,020 unique, deterministic evaluation identities for 60 × 17", () => {
  const { profiles, evidence } = contractData();
  const inventory = buildExploratoryEvaluationInventory(runtimeTenders, profiles, evidence, evaluatedAt);
  assert.equal(runtimeTenders.length, 60);
  assert.equal(profiles.length, 17);
  assert.equal(inventory.length, 1020);
  assert.equal(new Set(inventory.map((entry) => entry.key)).size, 1020);
  assert.deepEqual(buildExploratoryEvaluationInventory(runtimeTenders, profiles, evidence, evaluatedAt), inventory);
  assert.equal(summarizeExploratoryEvaluations(inventory).total, 1020);
  assert.ok(inventory.every((entry) => entry.tenderSnapshotId && entry.tenderVersion && entry.supplierProfileVersionId && entry.supplierBatchCode));
});

test("serves the pinned safe v1.3 contract with keyset filters and explicit failure states", async (context) => {
  const runtime = await listeningServer(mockStore());
  context.after(() => runtime.server.close());
  await runtime.ready;
  const health = await fetch(`${runtime.origin}/api/tendermatch/health`).then((response) => response.json());
  assert.deepEqual({ contract: health.contractVersion, profile: health.profileVersion, batch: health.batchCode, suppliers: health.supplierCount, evidence: health.evidenceCount, pairs: health.evaluationCount }, { contract: TENDERMATCH_SUPPLIER_CONTRACT_VERSION, profile: TENDERMATCH_SUPPLIER_PROFILE_VERSION, batch: TENDERMATCH_SUPPLIER_BATCH_CODE, suppliers: 17, evidence: 289, pairs: 1020 });
  const expectedViews = { currentProfiles: TENDERMATCH_SUPPLIER_CURRENT_PROFILE_VIEW, currentEvidence: TENDERMATCH_SUPPLIER_CURRENT_EVIDENCE_VIEW, versionedProfiles: TENDERMATCH_SUPPLIER_VERSIONED_PROFILE_VIEW, versionedEvidence: TENDERMATCH_SUPPLIER_VERSIONED_EVIDENCE_VIEW };
  assert.equal(health.consumerRole, TENDERMATCH_SUPPLIER_CONSUMER_ROLE);
  assert.deepEqual(health.views, expectedViews);
  const ready = await fetch(`${runtime.origin}/api/tendermatch/runtime`).then((response) => response.json());
  assert.equal(ready.summary.consumerRole, TENDERMATCH_SUPPLIER_CONSUMER_ROLE);
  assert.deepEqual(ready.summary.views, expectedViews);
  assert.deepEqual(ready.summary.classification, { GOODS: 14, WORKS: 3 });
  assert.deepEqual(ready.summary.readiness, { ready_for_exploratory_matching: 0, usable_with_limitations: 17, requires_enrichment: 0, exclude_from_current_matching_run: 0 });
  assert.deepEqual(ready.summary.profileClaims, { VERIFIED: 0, INFERRED: 17, STATED_UNVERIFIED: 226, UNKNOWN: 46 });
  assert.deepEqual(ready.summary.evidenceStatuses, { VERIFIED: 0, INFERRED: 17, STATED_UNVERIFIED: 226, UNKNOWN: 46 });
  assert.deepEqual(ready.summary.artifacts, { available: 243, unavailable: 46 });
  assert.equal(ready.evaluations.length, 1020);
  assert.equal(validateTenderMatchRuntimePayload(ready), ready);
  assert.throws(() => validateTenderMatchRuntimePayload({}), /outside the pinned TenderMatch v1\.3 runtime contract/);

  const first = await fetch(`${runtime.origin}/api/tendermatch/suppliers?limit=2`).then((response) => response.json());
  assert.equal(first.profiles.length, 2);
  const second = await fetch(`${runtime.origin}/api/tendermatch/suppliers?limit=2&afterName=${encodeURIComponent(first.nextCursor.afterName)}&afterId=${first.nextCursor.afterId}`).then((response) => response.json());
  assert.notEqual(second.profiles[0].canonicalEntityId, first.profiles[0].canonicalEntityId);
  assert.equal((await fetch(`${runtime.origin}/api/tendermatch/suppliers?limit=100&classification=WORKS`).then((response) => response.json())).profiles.length, 3);
  assert.equal((await fetch(`${runtime.origin}/api/tendermatch/suppliers?limit=100&country=jp`).then((response) => response.json())).profiles.length, 9);
  const detail = await fetch(`${runtime.origin}/api/tendermatch/suppliers/${first.profiles[0].canonicalEntityId}`).then((response) => response.json());
  const evidence = await fetch(`${runtime.origin}/api/tendermatch/suppliers/${first.profiles[0].canonicalEntityId}/evidence`).then((response) => response.json());
  assert.equal(detail.profile.verificationStatus, "under_review");
  assert.equal(evidence.evidence.length, 17);
  assert.doesNotMatch(JSON.stringify({ detail, evidence }), /(?:email|phone|contact|address|named_people|raw[_-]?content|messag(?:e|ing))\s*["':]/i);
  assert.equal((await fetch(`${runtime.origin}/api/tendermatch/suppliers/not-a-uuid`)).status, 400);
  assert.equal((await fetch(`${runtime.origin}/api/tendermatch/suppliers?limit=101`)).status, 400);
  assert.equal((await fetch(`${runtime.origin}/api/tendermatch/suppliers?classification=SERVICES`)).status, 400);

  for (const failingStore of [mockStore({ fail: true }), mockStore({ drift: true })]) {
    const failed = await listeningServer(failingStore);
    context.after(() => failed.server.close());
    await assert.rejects(failed.ready);
    const offline = await fetch(`${failed.origin}/api/tendermatch/runtime`);
    assert.equal(offline.status, 503);
    assert.match(JSON.stringify(await offline.json()), /No offline supplier fixture was substituted/);
  }
});

test("validates target, keyset inputs, filtering and browser-secret containment", async () => {
  assert.equal(validateSupplierConnectionTarget("postgresql://user:redacted@ep-dark-dew-b15ctyr1.example/tender_entity_registry?sslmode=verify-full"), true);
  assert.throws(() => validateSupplierConnectionTarget("postgresql://user:redacted@wrong.example/tender_entity_registry?sslmode=verify-full"), /fingerprint/);
  assert.throws(() => validateSupplierConnectionTarget("postgresql://user:redacted@ep-dark-dew-b15ctyr1.example/tender_entity_registry?sslmode=require"), /verify-full/);
  assert.deepEqual(parseSupplierListParameters(new URLSearchParams("limit=50&country=jp&classification=GOODS")), { limit: 50, readiness: [], country: "JP", classification: "GOODS", afterName: null, afterId: null });
  assert.throws(() => parseSupplierListParameters(new URLSearchParams("limit=0")), /limit/);
  assert.throws(() => parseSupplierListParameters(new URLSearchParams("afterName=a")), /together/);
  assert.throws(() => validateSupplierId("bad"), /valid canonical supplier UUID/);

  const client = await readFile(path.join(projectRoot, "apps/tender-apps/src/tendermatch-supplier-api.ts"), "utf8");
  const app = await readFile(path.join(projectRoot, "apps/tender-apps/src/tendermatch-app.tsx"), "utf8");
  assert.doesNotMatch(`${client}\n${app}`, /TENDERMATCH_SUPPLIER_DATABASE_URL|postgres(?:ql)?:\/\//i);
  assert.doesNotMatch(app, /demoSuppliers/);
  assert.match(app, /NO HISTORICAL FIXTURE FALLBACK/);
  assert.match(client, /supplier-runtime-v1\.3\.json/);
  assert.match(client, /supplier-evidence-v1\.3\.json/);

  async function files(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    return (await Promise.all(entries.map((entry) => entry.isDirectory() ? files(path.join(directory, entry.name)) : [path.join(directory, entry.name)]))).flat();
  }
  const built = (await files(path.join(projectRoot, "apps/tender-apps/dist"))).filter((entry) => /\.(?:html|js|css|map)$/i.test(entry));
  for (const file of built) {
    const contents = await readFile(file, "utf8");
    assert.doesNotMatch(contents, /TENDERMATCH_SUPPLIER_DATABASE_URL|tendermatch_supplier_consumer_dev|postgres(?:ql)?:\/\//i, path.relative(projectRoot, file));
  }
});
