import { evaluateExploratoryPair, runtimeTenders, type ExploratoryMatchEvaluation } from "../../../packages/tendermatch/src/index.ts";
import { loadSupplierEvidence, type TenderMatchRuntimeCatalog } from "./tendermatch-supplier-api.ts";
import type { CompactPairRecord } from "../../../packages/tendermatch/src/retrieval-pipeline.ts";

/** Transport projection only: it contains no criterion narrative or model output. */
export type TenderMatchCompactPair = CompactPairRecord & { assessmentState?: string; humanDisposition?: string };
export type PairPage = { items: TenderMatchCompactPair[]; runId?: string; total: number; offset: number; limit: number; nextCursor: string | null; retrieval?: { semanticState: "READY" | "DISABLED" | "MISSING"; shortlistLimit: number } };
export type PairQuery = { supplierId?: string; tenderId?: string; supplierIds?: string[]; tenderIds?: string[]; q?: string; sort?: "pairScore" | "retrievalScore" | "dataCoverage"; limit?: number; cursor?: string };
export type AssessmentState = { state: "disabled" | "pending" | "queued" | "running" | "complete" | "failed"; reason: string; id?: string };
type PairIndex = { schemaVersion: "tendermatch-pair-index/1.0.0"; suppliers: Record<string, string>; tenders: Record<string, string> };
const MAX_PAGE = 200;
const MAX_STATIC_PARTITION = 100;
const partitionCache = new Map<string, Pick<PairPage, "items" | "retrieval" | "runId">>();

async function jsonResponse(response: Response) {
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? `Pair service returned HTTP ${response.status}.`);
  return body;
}

export function pairQueryParameters(query: PairQuery) {
  const limit = query.limit ?? 25;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE) throw new RangeError("Pair pages must contain 1–200 records.");
  const focused = Boolean(query.supplierId) !== Boolean(query.tenderId);
  const boundedMatrix = !query.supplierId && !query.tenderId && Boolean(query.supplierIds?.length) && Boolean(query.tenderIds?.length);
  if (!focused && !boundedMatrix) throw new TypeError("Select one supplier, one tender, or a bounded matrix window.");
  if (focused && (query.supplierIds?.length || query.tenderIds?.length)) throw new TypeError("Focused and matrix identities cannot be mixed.");
  if (boundedMatrix && (query.tenderIds!.length > 8 || query.supplierIds!.length > 25 || query.tenderIds!.length * query.supplierIds!.length > MAX_PAGE)) throw new RangeError("Matrix queries are limited to 25 suppliers × 8 tenders.");
  const params = new URLSearchParams({ limit: String(limit), sort: query.sort ?? "pairScore" });
  if (query.supplierId) params.set("supplierId", query.supplierId);
  if (query.tenderId) params.set("tenderId", query.tenderId);
  for (const id of query.supplierIds ?? []) params.append("supplierIds", id);
  for (const id of query.tenderIds ?? []) params.append("tenderIds", id);
  if (query.q) params.set("q", query.q);
  if (query.cursor) params.set("cursor", query.cursor);
  return params;
}

export function validatePairPage(value: unknown, query: PairQuery, expectedRunId?: string): PairPage {
  const page = value as PairPage;
  if (!page || !Array.isArray(page.items) || page.items.length > (query.limit ?? 25) || !Number.isInteger(page.total) || page.total < page.items.length || !Number.isInteger(page.offset) || page.offset < 0) throw new TypeError("Invalid bounded pair page.");
  if (expectedRunId && (page.runId !== expectedRunId || page.items.some((row) => row.runId !== expectedRunId))) throw new TypeError("Pair page belongs to a different scoring run. Reload the workspace to refresh its snapshot.");
  const keys = new Set<string>();
  for (const row of page.items) {
    if (keys.has(row.key) || row.key !== `${row.tenderId}::${row.supplierId}`) throw new TypeError("Duplicate or inconsistent pair identity.");
    keys.add(row.key);
    if (!Number.isInteger(row.pairScore) || row.pairScore < 0 || row.pairScore > 100 || row.denominator !== 100) throw new TypeError("Pair Score must remain numeric 0–100 with the fixed 100-point denominator; scope is separate.");
    if (![row.dataCoverage, row.evidenceConfidence].every((value) => Number.isFinite(value) && value >= 0 && value <= 100)) throw new TypeError("Coverage and evidence confidence must remain separate 0–100 values.");
    if (!["ELIGIBLE", "INELIGIBLE", "OUTSIDE_SCORING_SCOPE"].includes(row.eligibility?.state)) throw new TypeError("Pair eligibility is missing or unsupported.");
    if (query.supplierId && row.supplierId !== query.supplierId || query.tenderId && row.tenderId !== query.tenderId || query.supplierIds && !query.supplierIds.includes(row.supplierId) || query.tenderIds && !query.tenderIds.includes(row.tenderId)) throw new TypeError("Pair response crossed the requested identity boundary.");
  }
  return page;
}

async function staticPartition(path: string, snapshotVersion: string, signal?: AbortSignal) {
  if (!path.startsWith("/tendermatch/data/") || path.includes("..")) throw new TypeError("Static partition must belong to the pinned local snapshot.");
  const cacheKey = `${snapshotVersion}:${path}`;
  const cached = partitionCache.get(cacheKey);
  if (cached) return cached;
  const data = await jsonResponse(await fetch(path, { signal, cache: "no-store", credentials: "same-origin" })) as Pick<PairPage, "items" | "retrieval" | "runId">;
  if (!Array.isArray(data.items) || data.items.length > MAX_STATIC_PARTITION) throw new TypeError("Static demo partition exceeds its declared 100-record limit; use the paginated service for larger inventories.");
  partitionCache.set(cacheKey, data);
  while (partitionCache.size > 8) partitionCache.delete(partitionCache.keys().next().value!);
  return data;
}

export async function queryTenderMatchPairs(runtime: TenderMatchRuntimeCatalog, query: PairQuery, signal?: AbortSignal): Promise<PairPage> {
  const params = pairQueryParameters(query);
  if (runtime.mode !== "static-pinned-snapshot") return validatePairPage(await jsonResponse(await fetch(`/api/tendermatch/pairs?${params}`, { signal, credentials: "same-origin", cache: "no-store" })), query, runtime.processing?.runId);
  const index = await jsonResponse(await fetch("/tendermatch/data/pair-index-v2.json", { signal, credentials: "same-origin", cache: "no-store" })) as PairIndex;
  if (index.schemaVersion !== "tendermatch-pair-index/1.0.0") throw new TypeError("Unsupported static pair index.");
  const paths = query.supplierId ? [index.suppliers[query.supplierId]] : query.tenderId ? [index.tenders[query.tenderId]] : query.tenderIds!.map((id) => index.tenders[id]);
  if (paths.some((path) => !path)) throw new Error("The requested identity is not in this pinned pair snapshot.");
  const snapshotVersion = `${runtime.processing?.runId ?? "unversioned"}:${runtime.summary.retrievedAt}:${runtime.summary.profileVersion}:${runtime.evaluationSummary.engineVersion}`;
  const partitions = await Promise.all(paths.map((path) => staticPartition(path, snapshotVersion, signal)));
  const expectedRunId = runtime.processing?.runId;
  if (expectedRunId && partitions.some((part) => part.runId !== expectedRunId)) throw new TypeError("Pinned pair partition belongs to a different scoring run. Reload the workspace to refresh its snapshot.");
  const search = query.q?.trim().toLowerCase();
  const names = new Map(runtime.suppliers.map((profile) => [`supplier:NEON:${profile.canonicalEntityId}`, JSON.stringify([profile]).toLowerCase()]));
  const rows = partitions.flatMap((part) => part.items).filter((row) => (!query.supplierIds || query.supplierIds.includes(row.supplierId)) && (!query.tenderIds || query.tenderIds.includes(row.tenderId)) && (!search || `${names.get(row.supplierId)} ${runtimeTenders.find((tender) => tender.id === row.tenderId)?.title} ${row.tenderId}`.toLowerCase().includes(search)));
  const field = query.sort ?? "pairScore";
  rows.sort((left, right) => (right[field] ?? -1) - (left[field] ?? -1) || left.key.localeCompare(right.key));
  const offset = Number(query.cursor ?? 0), limit = query.limit ?? 25;
  if (!Number.isSafeInteger(offset) || offset < 0) throw new TypeError("Invalid static page cursor.");
  return validatePairPage({ items: rows.slice(offset, offset + limit), runId: runtime.processing?.runId, total: rows.length, offset, limit, nextCursor: offset + limit < rows.length ? String(offset + limit) : null, ...(partitions.length === 1 ? { retrieval: partitions[0].retrieval } : {}) }, query, runtime.processing?.runId);
}

export async function loadTenderMatchPair(runtime: TenderMatchRuntimeCatalog, supplierId: string, tenderId: string, signal?: AbortSignal, nowIso = new Date().toISOString()): Promise<ExploratoryMatchEvaluation> {
  let evaluation: ExploratoryMatchEvaluation;
  if (runtime.mode === "static-pinned-snapshot") {
    const tender = runtimeTenders.find((record) => record.id === tenderId);
    const profile = runtime.suppliers.find((record) => `supplier:NEON:${record.canonicalEntityId}` === supplierId);
    if (!tender || !profile) throw new Error("Selected pair is outside the pinned snapshot.");
    const evidence = await loadSupplierEvidence(profile.canonicalEntityId, signal, runtime.mode);
    evaluation = evaluateExploratoryPair(tender, profile, evidence, nowIso);
  } else {
    const params = new URLSearchParams({ supplierId, tenderId });
    evaluation = (await jsonResponse(await fetch(`/api/tendermatch/pair?${params}`, { signal, cache: "no-store", credentials: "same-origin" }))).evaluation;
  }
  if (evaluation.supplierId !== supplierId || evaluation.tenderId !== tenderId || evaluation.key !== `${tenderId}::${supplierId}`) throw new TypeError("Selected-pair detail identity mismatch.");
  return evaluation;
}

export async function requestTenderMatchAssessment(runtime: TenderMatchRuntimeCatalog, supplierId: string, tenderId: string): Promise<AssessmentState> {
  if (runtime.mode === "static-pinned-snapshot") return { state: "disabled", reason: "Full TORS/AI is unavailable in this local snapshot. No model was called. Formula v1.1 and human disposition are unchanged." };
  const body = await jsonResponse(await fetch("/api/tendermatch/assessments", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ supplierId, tenderId, reason: "user-opened", requestId: `user-opened:${supplierId}:${tenderId}:${runtime.summary.retrievedAt}` }) }));
  const state = body.assessment ?? body;
  if (!["disabled", "pending", "queued", "running", "complete", "failed"].includes(state.state)) throw new TypeError("Unknown full-assessment state.");
  return state;
}
