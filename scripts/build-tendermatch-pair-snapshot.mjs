import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runtimeTenders } from "../packages/tendermatch/src/pilot-data.ts";
import { createPairService } from "./lib/tendermatch-pair-service.mjs";

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

/** Build projections from authorized frozen sources; never collect or update source facts. */
export async function buildPairSnapshot(sourceDir = resolve("apps/tender-apps/public/tendermatch/data"), outputDir = sourceDir) {
  const runtimeBytes = await readFile(join(sourceDir, "supplier-runtime-v1.3.json"), "utf8");
  const evidenceBytes = await readFile(join(sourceDir, "supplier-evidence-v1.3.json"), "utf8");
  const source = JSON.parse(runtimeBytes), evidence = JSON.parse(evidenceBytes);
  const service = createPairService({ tenders: runtimeTenders, profiles: source.suppliers, evidence: Object.values(evidence.evidenceBySupplier).flat(), evaluatedAt: source.summary.retrievedAt });
  if (source.suppliers.length > 100 || runtimeTenders.length > 100) throw new Error("Static demonstration partitions are capped at 100 entities per dimension. Use the paginated result service for a larger inventory.");
  // Preserve the published numerical evidence before making the new transport.
  for (const original of source.evaluations) {
    const compact = service.get(original.supplierId, original.tenderId);
    if (compact?.pairScore !== original.value || compact?.dataCoverage !== original.dataCoverage || compact?.evidenceConfidence !== original.evidenceConfidence) throw new Error(`Formula golden mismatch: ${original.key}`);
  }
  const files = {};
  async function emit(name, value) {
    const bytes = `${JSON.stringify(value)}\n`;
    await writeFile(join(outputDir, name), bytes);
    files[name] = { bytes: Buffer.byteLength(bytes), sha256: hash(bytes) };
  }
  await mkdir(join(outputDir, "pairs-v2"), { recursive: true });
  const index = { schemaVersion: "tendermatch-pair-index/1.0.0", detailMode: "evidence-on-demand", suppliers: {}, tenders: {} };
  for (const [position, profile] of source.suppliers.entries()) {
    const id = `supplier:NEON:${profile.canonicalEntityId}`, file = `pairs-v2/supplier-${position}.json`;
    await emit(file, service.query({ supplierId: id, limit: 100 }));
    index.suppliers[id] = `/tendermatch/data/${file}`;
  }
  for (const [position, tender] of runtimeTenders.entries()) {
    const file = `pairs-v2/tender-${position}.json`;
    await emit(file, service.query({ tenderId: tender.id, limit: 100 }));
    index.tenders[tender.id] = `/tendermatch/data/${file}`;
  }
  await emit("pair-index-v2.json", index);
  await emit("runtime-catalog-v2.json", { schemaVersion: "tendermatch-runtime-catalog/2.0.0", status: "ready", mode: "static-pinned-snapshot", summary: source.summary, suppliers: source.suppliers, initialEvaluation: service.initialEvaluation(), evaluationSummary: source.evaluationSummary, pairLeadersByTender: service.leaders(), pairLeadersBySupplier: service.supplierLeaders(), scoreDistribution: service.scoreDistribution(), processing: service.stats, assessmentProvider: { state: "disabled", reason: "No model provider exists in the static snapshot." } });
  const manifest = { schemaVersion: "tendermatch-pair-snapshot/2.0.0", sourceRuntimeSha256: hash(runtimeBytes.replace(/\r\n/g, "\n")), sourceEvidenceSha256: hash(evidenceBytes.replace(/\r\n/g, "\n")), runId: service.runId, sourceAsOf: source.summary.retrievedAt, counts: { suppliers: source.suppliers.length, tenders: runtimeTenders.length, pairs: source.evaluations.length, eligible: service.stats.eligible, modelCalls: 0 }, files, detailMode: "single-pair-deterministic-on-demand", semanticEmbeddingState: "MISSING", assessmentProviderState: "DISABLED" };
  await writeFile(join(outputDir, "pair-snapshot-v2.manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = await buildPairSnapshot();
  console.log(JSON.stringify({ counts: manifest.counts, partitions: Object.keys(manifest.files).length, bytes: Object.values(manifest.files).reduce((sum, file) => sum + file.bytes, 0) }));
}
