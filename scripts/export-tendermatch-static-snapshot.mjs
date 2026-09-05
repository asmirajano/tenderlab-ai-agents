import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  TENDERMATCH_SUPPLIER_BATCH_CODE,
  TENDERMATCH_SUPPLIER_CONTRACT_VERSION,
  TENDERMATCH_SUPPLIER_EXPECTED_EVIDENCE_COUNT,
  TENDERMATCH_SUPPLIER_EXPECTED_PROFILE_COUNT,
  TENDERMATCH_SUPPLIER_PROFILE_VERSION,
} from "../packages/tendermatch/src/supplier-contract.ts";
import { runtimeTenders } from "../packages/tendermatch/src/pilot-data.ts";

const args = process.argv.slice(2);

function argument(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}

const origin = new URL(argument("--origin", "http://127.0.0.1:4177"));
const outputDir = resolve(argument("--output-dir", "apps/tender-apps/public/tendermatch/data"));
const runtimeFileName = "runtime-catalog-v2.json";
const evidenceFileName = "supplier-evidence-v1.3.json";
const manifestFileName = "pair-snapshot-v2.manifest.json";

async function fetchJson(pathname) {
  const response = await fetch(new URL(pathname, origin), { headers: { accept: "application/json" } });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body) throw new Error(`Snapshot export could not read ${pathname}: HTTP ${response.status}.`);
  return body;
}

function assertNoForbiddenFields(value, trail = []) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoForbiddenFields(entry, [...trail, String(index)]));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, entry] of Object.entries(value)) {
    if (/^(contact|contacts|contactName|email|emails|phone|phones|mobile|whatsapp|wechat|person|people|rawSource|rawContent)$/i.test(key)) {
      throw new Error(`Static snapshot contains forbidden browser field ${[...trail, key].join(".")}.`);
    }
    assertNoForbiddenFields(entry, [...trail, key]);
  }
}

function sha256(contents) {
  return createHash("sha256").update(contents).digest("hex");
}

const runtime = await fetchJson("/api/tendermatch/runtime");
const expectedEvaluations = runtimeTenders.length * TENDERMATCH_SUPPLIER_EXPECTED_PROFILE_COUNT;
if (
  runtime.status !== "ready"
  || runtime.schemaVersion !== "tendermatch-runtime-catalog/2.0.0"
  || runtime.mode !== "neon-read-only"
  || runtime.summary?.contractVersion !== TENDERMATCH_SUPPLIER_CONTRACT_VERSION
  || runtime.summary?.profileVersion !== TENDERMATCH_SUPPLIER_PROFILE_VERSION
  || runtime.summary?.batchCode !== TENDERMATCH_SUPPLIER_BATCH_CODE
  || runtime.suppliers?.length !== TENDERMATCH_SUPPLIER_EXPECTED_PROFILE_COUNT
  || runtime.summary?.evidenceCount !== TENDERMATCH_SUPPLIER_EXPECTED_EVIDENCE_COUNT
  || "evaluations" in runtime
  || runtime.evaluationSummary?.total !== expectedEvaluations
) {
  throw new Error("Local supplier runtime does not match the approved v1.3 static-release contract.");
}
if (runtime.suppliers.length > 100 || runtimeTenders.length > 100) throw new Error("Static pair projections support at most 100 entities per dimension; use the paginated service for larger inventories.");

// Export bounded compact partitions, never reconstruct the former verbose universe.
const partitions = [];
const index = { schemaVersion: "tendermatch-pair-index/1.0.0", detailMode: "evidence-on-demand", suppliers: {}, tenders: {} };
async function collectPartition(kind, id, position, expectedCount) {
  const query = new URLSearchParams({ [`${kind}Id`]: id, limit: "100" });
  const page = await fetchJson(`/api/tendermatch/pairs?${query}`);
  if (!Array.isArray(page.items) || page.items.length !== expectedCount || page.nextCursor || page.items.some((row) => row[`${kind}Id`] !== id || "criteria" in row || !Number.isInteger(row.pairScore))) throw new Error("Focused snapshot partition failed identity/count validation.");
  if (page.runId !== runtime.processing.runId) throw new Error("Snapshot run changed during export; retry from one immutable run.");
  const name = `pairs-v2/${kind}-${position}.json`;
  partitions.push([name, page]);
  index[`${kind}s`][id] = `/tendermatch/data/${name}`;
}
for (const [position, profile] of runtime.suppliers.entries()) await collectPartition("supplier", `supplier:NEON:${profile.canonicalEntityId}`, position, runtimeTenders.length);
for (const [position, tender] of runtimeTenders.entries()) await collectPartition("tender", tender.id, position, runtime.suppliers.length);

const evidenceEntries = await Promise.all(runtime.suppliers.map(async (profile) => {
  const envelope = await fetchJson(`/api/tendermatch/suppliers/${encodeURIComponent(profile.canonicalEntityId)}/evidence`);
  if (envelope.supplierId !== profile.canonicalEntityId || !Array.isArray(envelope.evidence)) {
    throw new Error(`Evidence response does not belong to ${profile.canonicalEntityId}.`);
  }
  if (envelope.evidence.some((entry) => entry.canonicalEntityId !== profile.canonicalEntityId)) {
    throw new Error(`Evidence response contains a cross-supplier record for ${profile.canonicalEntityId}.`);
  }
  return [profile.canonicalEntityId, envelope.evidence];
}));

const evidenceBySupplier = Object.fromEntries(evidenceEntries.sort(([left], [right]) => left.localeCompare(right)));
const evidenceCount = Object.values(evidenceBySupplier).reduce((count, entries) => count + entries.length, 0);
if (evidenceCount !== TENDERMATCH_SUPPLIER_EXPECTED_EVIDENCE_COUNT) {
  throw new Error(`Static snapshot expected ${TENDERMATCH_SUPPLIER_EXPECTED_EVIDENCE_COUNT} evidence records; received ${evidenceCount}.`);
}

const publicSummary = Object.fromEntries(Object.entries(runtime.summary).filter(([key]) => key !== "consumerRole" && key !== "views"));
const staticRuntime = {
  ...runtime,
  mode: "static-pinned-snapshot",
  sourceMode: "approved-sanitized-v1.3-export",
  summary: {
    ...publicSummary,
    sourceMode: "approved-sanitized-v1.3-export",
  },
};
const staticEvidence = {
  schemaVersion: "tendermatch-static-supplier-evidence/1.0.0",
  mode: "static-pinned-snapshot",
  contractVersion: TENDERMATCH_SUPPLIER_CONTRACT_VERSION,
  profileVersion: TENDERMATCH_SUPPLIER_PROFILE_VERSION,
  batchCode: TENDERMATCH_SUPPLIER_BATCH_CODE,
  retrievedAt: publicSummary.retrievedAt,
  evidenceBySupplier,
};

assertNoForbiddenFields(staticRuntime);
assertNoForbiddenFields(staticEvidence);

const runtimeContents = `${JSON.stringify(staticRuntime)}\n`;
const evidenceContents = `${JSON.stringify(staticEvidence)}\n`;
const artifacts = [...partitions, ["pair-index-v2.json", index]].map(([name, value]) => [name, `${JSON.stringify(value)}\n`]);
artifacts.push([runtimeFileName, runtimeContents], [evidenceFileName, evidenceContents]);
for (const [, contents] of artifacts) assertNoForbiddenFields(JSON.parse(contents));
const manifest = {
  schemaVersion: "tendermatch-pair-snapshot/2.0.0",
  releaseMode: "static-pinned-snapshot",
  sourceMode: "approved-local-read-only-api",
  sourceAuthority: "Neon tender-entity-registry immutable v1.3 supplier projection",
  contractVersion: TENDERMATCH_SUPPLIER_CONTRACT_VERSION,
  profileVersion: TENDERMATCH_SUPPLIER_PROFILE_VERSION,
  batchCode: TENDERMATCH_SUPPLIER_BATCH_CODE,
  snapshotAsOf: publicSummary.retrievedAt,
  counts: {
    tenders: runtimeTenders.length,
    suppliers: staticRuntime.suppliers.length,
    evidence: evidenceCount,
    pairs: staticRuntime.evaluationSummary.total,
    eligible: staticRuntime.processing.eligible,
    modelCalls: 0,
    numericEvaluations: staticRuntime.evaluationSummary.numeric,
    missingEvaluations: staticRuntime.evaluationSummary.missing,
  },
  runId: staticRuntime.processing.runId,
  files: Object.fromEntries(artifacts.map(([name, contents]) => [name, { bytes: Buffer.byteLength(contents), sha256: sha256(contents) }])),
  detailMode: "single-pair-deterministic-on-demand",
  semanticEmbeddingState: "MISSING",
  assessmentProviderState: "DISABLED",
  publicDataBoundary: "Sanitized supplier profiles, non-contact evidence projections and Formula v1.1 coverage-adjusted pair scores only. No Match/Non-match verdict, credentials, contacts or raw source content.",
  refreshCommand: "pnpm run export:tendermatch-static-snapshot -- --origin http://127.0.0.1:4177",
};

await mkdir(resolve(outputDir, "pairs-v2"), { recursive: true });
await Promise.all([
  ...artifacts.map(([name, contents]) => writeFile(resolve(outputDir, name), contents, "utf8")),
  writeFile(resolve(outputDir, manifestFileName), `${JSON.stringify(manifest, null, 2)}\n`, "utf8"),
]);

console.log(`TenderMatch static snapshot exported: ${staticRuntime.suppliers.length} suppliers, ${evidenceCount} evidence records, ${staticRuntime.evaluationSummary.total} compact pair records. Historical verbose snapshot retained unchanged.`);
