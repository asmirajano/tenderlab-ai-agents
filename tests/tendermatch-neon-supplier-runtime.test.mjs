import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { once } from "node:events";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  TENDERMATCH_EXPLORATORY_ENGINE_VERSION,
  TENDERMATCH_EXPLORATORY_POLICY_VERSION,
  buildExploratoryEvaluationInventory,
  evaluateExploratoryPair,
  runtimeTenders,
  summarizeExploratoryEvaluations,
} from "../packages/tendermatch/src/index.ts";
import { createTenderMatchLocalServer } from "../scripts/serve-tendermatch-local.mjs";
import { parseSupplierListParameters, validateSupplierId } from "../scripts/lib/tendermatch-supplier-store.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const evaluatedAt = "2026-09-01T00:00:00.000Z";

function uuid(index) {
  return `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

function profile(index, overrides = {}) {
  const inferred = index < 29 ? 15 : 14;
  return {
    canonicalEntityId: uuid(index + 1),
    profileVersionId: uuid(index + 1001),
    profileVersion: "v2.1-policy-corrected-2026-09-01",
    batchId: uuid(9999),
    batchCode: "accio-neutral-suppliers-2026-09-01-v2.1-policy-corrected",
    legalName: `Supplier ${String(index + 1).padStart(3, "0")}`,
    displayName: `Supplier ${String(index + 1).padStart(3, "0")}`,
    countryCode: "CN",
    canonicalMarketplaceProfileUrl: null,
    operatingGeography: ["China"],
    mainActivity: "Industrial equipment",
    productPortfolio: ["equipment"],
    productCategories: ["industrial"],
    materialsSpecifications: [],
    capabilities: ["manufacturing"],
    capacity: null,
    certifications: null,
    exportMarkets: [],
    localPresence: null,
    serviceCapabilities: [],
    commercialTerms: null,
    comparableReferences: null,
    scaleIndicators: null,
    complianceAndIntegrity: null,
    unresolvedChecks: ["Independent verification required"],
    readinessStatus: index < 2 ? "ready_for_exploratory_matching" : index < 96 ? "usable_with_limitations" : "requires_enrichment",
    readinessReasons: [],
    readinessGateResults: {},
    readinessContractVersion: "v1",
    verificationStatus: "under_review",
    coverageSummary: {},
    evidenceClaimCount: 24,
    evidenceVerifiedCount: 0,
    evidenceInferredCount: inferred,
    evidenceUnknownCount: 24 - inferred,
    claimsWithSavedArtifact: 20,
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
    field: "products_portfolio",
    value: index < 1415 ? "industrial equipment" : null,
    status: index < 1415 ? "INFERRED" : "UNKNOWN",
    sourceTitle: "Saved supplier evidence",
    sourceUrl: null,
    retrievedAt: evaluatedAt,
    sourceRecordId: uuid(index + 30001),
    sourceArtifactId: index < 2070 ? uuid(index + 40001) : null,
    artifactAvailable: index < 2070,
    artifactStatus: index < 2070 ? "available" : "not-linked",
    artifactSha256: index < 2070 ? "a".repeat(64) : null,
    artifactLimitation: index < 2070 ? "" : "No saved artifact is linked.",
    supersedesClaimId: null,
    policyCorrectionCode: null,
    ...overrides,
  };
}

function contractData() {
  const profiles = Array.from({ length: 100 }, (_, index) => profile(index));
  const evidence = Array.from({ length: 2300 }, (_, index) => evidenceRecord(profiles[index % profiles.length], index));
  return { profiles, evidence };
}

function mockStore({ fail = false } = {}) {
  const { profiles, evidence } = contractData();
  return {
    async loadAll() {
      if (fail) throw new Error("mock connection string must never be returned");
      return { profiles, evidence };
    },
    async listSuppliers(filters) {
      let values = profiles.filter((entry) => !filters.readiness.length || filters.readiness.includes(entry.readinessStatus));
      if (filters.country) values = values.filter((entry) => entry.countryCode === filters.country);
      if (filters.afterName && filters.afterId) values = values.filter((entry) => entry.displayName.toLowerCase() > filters.afterName || (entry.displayName.toLowerCase() === filters.afterName && entry.canonicalEntityId > filters.afterId));
      const page = values.slice(0, filters.limit);
      const final = page.at(-1);
      return { profiles: page, nextCursor: page.length === filters.limit && final ? { afterName: final.displayName.toLowerCase(), afterId: final.canonicalEntityId } : null };
    },
    async supplierDetail(id) { return profiles.find((entry) => entry.canonicalEntityId === id) ?? null; },
    async supplierEvidence(id) { return evidence.filter((entry) => entry.canonicalEntityId === id); },
  };
}

async function listeningServer(store) {
  const runtime = await createTenderMatchLocalServer({ store, distDir: path.join(projectRoot, "apps/tender-apps/dist"), clock: () => evaluatedAt });
  runtime.server.listen(0, "127.0.0.1");
  await once(runtime.server, "listening");
  const address = runtime.server.address();
  return { ...runtime, origin: `http://127.0.0.1:${address.port}` };
}

test("keeps the experimental fit deterministic, evidence-linked and separate from readiness and human disposition", () => {
  const supplier = profile(0, { displayName: "Transformer Works", readinessStatus: "requires_enrichment" });
  const tender = { ...runtimeTenders[0], title: "Supply of power transformers for a new substation", object: "GOODS", procurementType: "GOODS", description: "Electrical grid equipment" };
  const evidence = [
    evidenceRecord(supplier, 1, { field: "products_portfolio", value: "Power transformer and switchgear", artifactAvailable: true }),
    evidenceRecord(supplier, 2, { field: "manufacturing_capabilities_capacity", value: "Electrical transformer manufacturing", artifactAvailable: true }),
  ];
  const first = evaluateExploratoryPair(tender, supplier, evidence, evaluatedAt);
  const repeat = evaluateExploratoryPair(tender, supplier, evidence, evaluatedAt);
  assert.deepEqual(repeat, first);
  assert.equal(first.engineVersion, TENDERMATCH_EXPLORATORY_ENGINE_VERSION);
  assert.equal(first.policyVersion, TENDERMATCH_EXPLORATORY_POLICY_VERSION);
  assert.equal(first.valueClass, "ESTIMATED");
  assert.ok(first.value >= 0);
  assert.deepEqual(first.technicalRelevance.evidenceIds.sort(), evidence.map((entry) => entry.claimId).sort());
  assert.equal(first.supplierReadinessStatus, "requires_enrichment");
  assert.equal(first.consultantDecision, "pending");
  assert.equal(first.marketDelivery.value, null);
  assert.equal(first.verificationStatus, "under_review");
  assert.ok(first.reasonCodes.includes("NO_VERIFIED_SUPPLIER_CLAIMS"));
});

test("returns explicit MISSING for weak, unknown or foreign evidence and never converts UNKNOWN to zero", () => {
  const supplier = profile(5);
  const tender = { ...runtimeTenders[0], title: "Supply of hospital diagnostic equipment", object: "GOODS", procurementType: "GOODS" };
  const weak = evaluateExploratoryPair(tender, supplier, [evidenceRecord(supplier, 3, { value: "office furniture" })], evaluatedAt);
  const unknown = evaluateExploratoryPair(tender, supplier, [evidenceRecord(supplier, 4, { value: null, status: "UNKNOWN" })], evaluatedAt);
  const foreign = evaluateExploratoryPair(tender, supplier, [evidenceRecord(profile(6), 5, { value: "medical diagnostic equipment" })], evaluatedAt);
  for (const result of [weak, unknown, foreign]) {
    assert.equal(result.value, null);
    assert.equal(result.valueClass, "MISSING");
    assert.equal(result.label, "insufficient-evidence");
    assert.equal(result.technicalRelevance.value, null);
  }
  assert.deepEqual(foreign.technicalRelevance.evidenceIds, []);
});

test("builds exactly 6,000 unique, reproducible evaluation identities for 60 × 100", () => {
  const { profiles, evidence } = contractData();
  const inventory = buildExploratoryEvaluationInventory(runtimeTenders, profiles, evidence, evaluatedAt);
  const repeat = buildExploratoryEvaluationInventory(runtimeTenders, profiles, evidence, evaluatedAt);
  assert.equal(runtimeTenders.length, 60);
  assert.equal(profiles.length, 100);
  assert.equal(inventory.length, 6000);
  assert.equal(new Set(inventory.map((entry) => entry.key)).size, 6000);
  assert.deepEqual(repeat, inventory);
  assert.equal(summarizeExploratoryEvaluations(inventory).total, 6000);
  assert.ok(inventory.every((entry) => entry.tenderSnapshotId && entry.tenderVersion && entry.supplierProfileVersionId && entry.supplierBatchCode));
});

test("serves the safe same-origin supplier contract with keyset inputs and explicit failure states", async (context) => {
  const runtime = await listeningServer(mockStore());
  context.after(() => runtime.server.close());
  await runtime.ready;

  const health = await fetch(`${runtime.origin}/api/tendermatch/health`).then((response) => response.json());
  assert.deepEqual({ profiles: health.supplierCount, evidence: health.evidenceCount, pairs: health.evaluationCount }, { profiles: 100, evidence: 2300, pairs: 6000 });
  const ready = await fetch(`${runtime.origin}/api/tendermatch/runtime`).then((response) => response.json());
  assert.deepEqual(ready.summary.readiness, { ready_for_exploratory_matching: 2, usable_with_limitations: 94, requires_enrichment: 4, exclude_from_current_matching_run: 0 });
  assert.deepEqual(ready.summary.profileClaims, { VERIFIED: 0, INFERRED: 1429, UNKNOWN: 971 });
  assert.deepEqual(ready.summary.evidenceStatuses, { VERIFIED: 0, INFERRED: 1415, UNKNOWN: 885 });
  assert.deepEqual(ready.summary.artifacts, { available: 2070, unavailable: 230 });
  assert.equal(ready.evaluations.length, 6000);

  const firstResponse = await fetch(`${runtime.origin}/api/tendermatch/suppliers?limit=2`);
  const first = await firstResponse.json();
  assert.equal(first.profiles.length, 2);
  assert.ok(first.nextCursor.afterName && first.nextCursor.afterId);
  const second = await fetch(`${runtime.origin}/api/tendermatch/suppliers?limit=2&afterName=${encodeURIComponent(first.nextCursor.afterName)}&afterId=${first.nextCursor.afterId}`).then((response) => response.json());
  assert.notEqual(second.profiles[0].canonicalEntityId, first.profiles[0].canonicalEntityId);
  const readiness = await fetch(`${runtime.origin}/api/tendermatch/suppliers?limit=100&readiness=requires_enrichment`).then((response) => response.json());
  assert.equal(readiness.profiles.length, 4);
  const detail = await fetch(`${runtime.origin}/api/tendermatch/suppliers/${first.profiles[0].canonicalEntityId}`).then((response) => response.json());
  const evidence = await fetch(`${runtime.origin}/api/tendermatch/suppliers/${first.profiles[0].canonicalEntityId}/evidence`).then((response) => response.json());
  assert.equal(detail.profile.verificationStatus, "under_review");
  assert.ok(evidence.evidence.length > 0);
  const payload = JSON.stringify({ detail, evidence });
  assert.doesNotMatch(payload, /(?:email|phone|contact|raw[_-]?content)\s*[":]/i);
  assert.equal((await fetch(`${runtime.origin}/api/tendermatch/suppliers/not-a-uuid`)).status, 400);
  assert.equal((await fetch(`${runtime.origin}/api/tendermatch/suppliers?limit=101`)).status, 400);

  const failed = await listeningServer(mockStore({ fail: true }));
  context.after(() => failed.server.close());
  await assert.rejects(failed.ready);
  const offline = await fetch(`${failed.origin}/api/tendermatch/runtime`);
  assert.equal(offline.status, 503);
  assert.match(JSON.stringify(await offline.json()), /No offline supplier fixture was substituted/);
  assert.doesNotMatch(JSON.stringify(await fetch(`${failed.origin}/api/tendermatch/health`).then((response) => response.json())), /connection string/i);
});

test("validates keyset/filter parameters and keeps database access out of the browser bundle", async () => {
  assert.deepEqual(parseSupplierListParameters(new URLSearchParams("limit=50&country=cn")), { limit: 50, readiness: [], country: "CN", category: null, afterName: null, afterId: null });
  assert.deepEqual(parseSupplierListParameters(new URLSearchParams("limit=10&category=industrial%20equipment")), { limit: 10, readiness: [], country: null, category: "industrial equipment", afterName: null, afterId: null });
  assert.throws(() => parseSupplierListParameters(new URLSearchParams("limit=0")), /limit/);
  assert.throws(() => parseSupplierListParameters(new URLSearchParams("afterName=a")), /together/);
  assert.throws(() => validateSupplierId("bad"), /valid canonical supplier UUID/);

  const client = await readFile(path.join(projectRoot, "apps/tender-apps/src/tendermatch-supplier-api.ts"), "utf8");
  const app = await readFile(path.join(projectRoot, "apps/tender-apps/src/tendermatch-app.tsx"), "utf8");
  assert.doesNotMatch(`${client}\n${app}`, /TENDERMATCH_SUPPLIER_DATABASE_URL|postgres(?:ql)?:\/\//i);
  assert.doesNotMatch(app, /demoSuppliers/);
  assert.match(app, /No fixture fallback was applied/);
  assert.match(app, /Server cache ready/);
  assert.doesNotMatch(app, /Replay inventory/);

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

test("binds the durable pilot evidence to the conservative live-contract result and a truthful browser-QA limitation", async () => {
  const evidence = JSON.parse(await readFile(path.join(projectRoot, "docs/evidence/tendermatch-neon-supplier-matching-pilot.json"), "utf8"));
  assert.deepEqual(
    {
      profiles: evidence.supplierContract.profiles,
      safeEvidence: evidence.supplierContract.safeEvidenceRecords,
      tenders: evidence.tenderSnapshot.records,
      pairs: evidence.matching.uniquePairs,
      numeric: evidence.matching.numericExploratory,
      missing: evidence.matching.missing,
    },
    { profiles: 100, safeEvidence: 2300, tenders: 60, pairs: 6000, numeric: 4, missing: 5996 },
  );
  assert.equal(evidence.matching.engineVersion, TENDERMATCH_EXPLORATORY_ENGINE_VERSION);
  assert.equal(evidence.matching.policyVersion, TENDERMATCH_EXPLORATORY_POLICY_VERSION);
  assert.deepEqual(evidence.supplierContract.safeEvidenceClaims, { VERIFIED: 0, INFERRED: 1415, UNKNOWN: 885 });
  assert.equal(evidence.security.contactsExposed, false);
  assert.equal(evidence.security.rawSourceContentExposed, false);
  assert.equal(evidence.security.secretRecorded, false);

  const browserEvidence = await readFile(path.join(projectRoot, "docs/evidence/tendermatch-neon-supplier-browser-qa.md"), "utf8");
  assert.match(browserEvidence, /does \*\*not\*\* claim completed automated desktop, tablet, or mobile screenshot QA/);
  assert.match(browserEvidence, /Manual or future policy-permitted browser inspection is still required/);
});
