import { createHash } from "node:crypto";
import { evaluateExploratoryPair, TENDERMATCH_MATCH_ENGINE_VERSION, TENDERMATCH_MATCH_POLICY_VERSION } from "../../packages/tendermatch/src/exploratory-matching.ts";
import { normalizeSupplierFeaturesWithHash, normalizeTenderFeaturesWithHash } from "../../packages/tendermatch/src/retrieval-features.ts";
import { MemoryPairStore, runIncrementalScoring } from "../../packages/tendermatch/src/retrieval-pipeline.ts";
import { buildLexicalRetrievalIndex, retrieveFeatureCandidates } from "../../packages/tendermatch/src/retrieval-ranking.ts";
import { createAssessmentJob, LocalAssessmentQueue } from "../../packages/tendermatch/src/selective-assessment.ts";
import { deriveTenderFreshness } from "../../packages/tendermatch/src/engine.ts";

const digest = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const hashContent = (value) => createHash("sha256").update(value).digest("hex");
const bad = (message) => Object.assign(new Error(message), { statusCode: 400 });

export function parsePairQuery(params) {
  const query = { supplierId: params.get("supplierId"), tenderId: params.get("tenderId"), supplierIds: params.getAll("supplierIds"), tenderIds: params.getAll("tenderIds"), q: params.get("q") ?? "", sort: params.get("sort") ?? "pairScore", cursor: params.get("cursor"), limit: Number(params.get("limit") ?? 25) };
  if (!Number.isInteger(query.limit) || query.limit < 1 || query.limit > 200) throw bad("Pair limit must be 1–200.");
  if (!["pairScore", "retrievalScore", "dataCoverage"].includes(query.sort)) throw bad("Unsupported pair sort.");
  if (query.q.length > 200) throw bad("Pair search is limited to 200 characters.");
  const focused = Boolean(query.supplierId) !== Boolean(query.tenderId);
  const matrix = !query.supplierId && !query.tenderId && query.supplierIds.length > 0 && query.tenderIds.length > 0;
  if (!focused && !matrix) throw bad("Select one supplier, one tender, or a bounded matrix window.");
  if (focused && (query.supplierIds.length || query.tenderIds.length)) throw bad("Focused and matrix identities cannot be mixed.");
  if (matrix && (query.supplierIds.length > 25 || query.tenderIds.length > 8 || query.supplierIds.length * query.tenderIds.length > 200)) throw bad("Matrix queries are limited to 25 suppliers × 8 tenders.");
  return query;
}

/** Bounded local/pinned implementation. PostgreSQL replaces these maps at rollout. */
export function createPairService({ tenders, profiles, evidence, evaluatedAt, scoreStore = new MemoryPairStore() }) {
  const tenderMap = new Map(tenders.map((row) => [row.id, row]));
  const profileMap = new Map(profiles.map((row) => [`supplier:NEON:${row.canonicalEntityId}`, row]));
  if (tenderMap.size !== tenders.length || profileMap.size !== profiles.length) throw new Error("Duplicate source identity.");
  const supplierEvidence = new Map(profiles.map((profile) => [profile.canonicalEntityId, evidence.filter((row) => row.canonicalEntityId === profile.canonicalEntityId)]));
  const tenderFeatures = tenders.map((tender) => normalizeTenderFeaturesWithHash(tender, hashContent));
  const supplierFeatures = profiles.map((profile) => normalizeSupplierFeaturesWithHash(profile, supplierEvidence.get(profile.canonicalEntityId), hashContent));
  const tenderIndex = buildLexicalRetrievalIndex(tenderFeatures), supplierIndex = buildLexicalRetrievalIndex(supplierFeatures);
  const assessmentQueue = new LocalAssessmentQueue();
  const runId = `run:TM:${digest([TENDERMATCH_MATCH_ENGINE_VERSION, ...tenderFeatures.map((row) => row.featureKey), ...supplierFeatures.map((row) => row.featureKey)])}`;
  const bySupplier = new Map(supplierFeatures.map((row) => [row.id, []]));
  const byTender = new Map(tenderFeatures.map((row) => [row.id, []]));
  const byKey = new Map();
  const processing = runIncrementalScoring({ tenders: tenderFeatures, suppliers: supplierFeatures, store: scoreStore, runId, evaluatedAt, batchSize: 500, hashContent });
  for (const record of scoreStore.current(runId)) {
    byKey.set(record.key, record);
    bySupplier.get(record.supplierId).push(record);
    byTender.get(record.tenderId).push(record);
  }
  const totals = { total: byKey.size, numeric: 0, missing: 0, byStatus: { BINGO_MATCH: 0, STRONG_CANDIDATE: 0, POTENTIAL_MATCH: 0, NEEDS_VERIFICATION: 0, NO_MATCH: 0, BLOCKED_INELIGIBLE: 0, UNASSESSED: byKey.size }, byReason: {}, engineVersion: TENDERMATCH_MATCH_ENGINE_VERSION, policyVersion: TENDERMATCH_MATCH_POLICY_VERSION, evaluatedAt };
  for (const record of byKey.values()) {
    if (typeof record.pairScore === "number") totals.numeric += 1; else totals.missing += 1;
    totals.byReason[record.mainLimitation] = (totals.byReason[record.mainLimitation] ?? 0) + 1;
  }
  function detail(supplierId, tenderId, clock = evaluatedAt) {
    const tender = tenderMap.get(tenderId), profile = profileMap.get(supplierId);
    if (!tender || !profile) throw Object.assign(new Error("Pair not found in the selected run."), { statusCode: 404 });
    const evaluation = evaluateExploratoryPair(tender, profile, supplierEvidence.get(profile.canonicalEntityId), clock);
    const compact = byKey.get(`${tenderId}::${supplierId}`);
    if (evaluation.value !== compact.pairScore || evaluation.dataCoverage !== compact.dataCoverage || evaluation.evidenceConfidence !== compact.evidenceConfidence) throw new Error("Selected detail disagrees with its immutable Formula record.");
    return { evaluation, compact, runId };
  }
  const transport = (record, relevance) => ({ ...record, retrievalScore: relevance?.retrievalScore ?? null, retrieval: relevance ?? null, assessmentState: "not-requested", humanDisposition: "pending" });
  function shortlist(supplierId, tenderId, limit = 20) {
    const supplierFocused = Boolean(supplierId);
    const index = supplierFocused ? tenderIndex : supplierIndex;
    const source = supplierFocused ? supplierIndex.features.get(supplierId) : tenderIndex.features.get(tenderId);
    if (!source) throw Object.assign(new Error("Unknown retrieval identity."), { statusCode: 404 });
    return retrieveFeatureCandidates(source, index, { direction: supplierFocused ? "supplier-to-tenders" : "tender-to-suppliers", candidateLimit: 200, limit,
      eligible: (id) => byKey.get(supplierFocused ? `${id}::${supplierId}` : `${tenderId}::${id}`)?.eligibility.state === "ELIGIBLE" });
  }
  function requestAssessment(supplierId, tenderId, actor, now) {
    const selected = detail(supplierId, tenderId, now), record = selected.compact;
    const job = assessmentQueue.enqueue(createAssessmentJob({ tenantId: "local-pinned-demo", runId, supplierId, tenderId, pairCacheKey: record.cacheKey, supplierVersion: record.supplierVersion, tenderVersion: record.tenderVersion, evidenceSnapshot: record.evidenceSnapshot, formulaVersion: record.formulaVersion,
      eligible: record.eligibility.state === "ELIGIBLE" && selected.evaluation.freshness.status !== "closed", openedBy: actor }, now, null));
    return { state: "disabled", status: job.state, id: job.id, policyVersion: job.policyVersion, reasons: job.reasons, reason: job.state === "NOT_ESCALATED" ? "This pair is outside current assessment eligibility. Formula score remains inspectable; no model was called." : "Full TORS/AI is unavailable: no provider is configured. No model was called; Formula v1.1 and human disposition are unchanged." };
  }
  function query(input) {
    const query = { supplierId: null, tenderId: null, supplierIds: [], tenderIds: [], q: "", sort: "pairScore", limit: 25, cursor: null, ...input };
    // Parse again for callers other than HTTP; no unbounded convenience path.
    const params = new URLSearchParams();
    for (const name of ["supplierId", "tenderId", "q", "sort", "limit"]) if (query[name]) params.set(name, String(query[name]));
    for (const name of ["supplierIds", "tenderIds"]) for (const id of query[name]) params.append(name, id);
    parsePairQuery(params);
    let candidates;
    if (query.supplierId) candidates = bySupplier.get(query.supplierId);
    else if (query.tenderId) candidates = byTender.get(query.tenderId);
    else candidates = query.tenderIds.flatMap((id) => byTender.get(id) ?? []).filter((row) => query.supplierIds.includes(row.supplierId));
    if (!candidates) throw Object.assign(new Error("Unknown focused identity."), { statusCode: 404 });
    const search = query.q.toLowerCase().trim();
    const ranking = query.supplierId || query.tenderId ? shortlist(query.supplierId, query.tenderId, 200) : { results: [], semanticState: "DISABLED" };
    const relevance = new Map(ranking.results.map((row) => [`${row.tenderId}::${row.supplierId}`, row]));
    const rows = candidates.filter((row) => !search || `${tenderMap.get(row.tenderId).title} ${tenderMap.get(row.tenderId).reference} ${profileMap.get(row.supplierId).displayName}`.toLowerCase().includes(search)).map((row) => transport(row, relevance.get(row.key)));
    rows.sort((a, b) => (b[query.sort] ?? -1) - (a[query.sort] ?? -1) || a.key.localeCompare(b.key));
    const scope = digest([runId, query.supplierId, query.tenderId, query.supplierIds, query.tenderIds, query.q, query.sort]);
    let offset = 0;
    if (query.cursor) {
      let cursor;
      try { cursor = JSON.parse(Buffer.from(query.cursor, "base64url").toString("utf8")); } catch { throw bad("Invalid pair cursor."); }
      if (cursor.scope !== scope) throw bad("Pair cursor belongs to a different query or evaluation run.");
      const index = rows.findIndex((row) => row.key === cursor.key && row[query.sort] === cursor.value);
      if (index < 0) throw bad("Pair cursor is stale.");
      offset = index + 1;
    }
    const items = rows.slice(offset, offset + query.limit), final = items.at(-1);
    return { schemaVersion: "tendermatch-pair-page/1.0.0", runId, items, total: rows.length, offset, limit: query.limit, sort: query.sort, retrieval: { semanticState: ranking.semanticState, shortlistLimit: 20 }, nextCursor: final && offset + items.length < rows.length ? Buffer.from(JSON.stringify({ scope, key: final.key, value: final[query.sort] })).toString("base64url") : null };
  }
  function leaders() { return Object.fromEntries([...byTender].map(([id, rows]) => [id, transport([...rows].sort((a, b) => b.pairScore - a.pairScore || a.key.localeCompare(b.key))[0])])); }
  function supplierLeaders() { return Object.fromEntries([...bySupplier].map(([id, rows]) => [id, transport([...rows].sort((a, b) => b.pairScore - a.pairScore || a.key.localeCompare(b.key))[0])])); }
  function initialEvaluation(clock = evaluatedAt) {
    const ordered = [...byKey.values()].sort((a, b) => b.pairScore - a.pairScore || b.dataCoverage - a.dataCoverage || a.key.localeCompare(b.key));
    const selected = ordered.find((row) => row.eligibility.state === "ELIGIBLE" && deriveTenderFreshness(tenderMap.get(row.tenderId), clock).status !== "closed") ?? ordered[0];
    if (!selected) throw new Error("An Overview preview requires at least one pair.");
    return detail(selected.supplierId, selected.tenderId, clock).evaluation;
  }
  function scoreDistribution() { return [["Score 0", 0, 0], ["Score 1–20", 1, 20], ["Score 21–40", 21, 40], ["Score 41–60", 41, 60], ["Score 61–80", 61, 80], ["Score 81–100", 81, 100]].map(([label, min, max]) => ({ label, count: [...byKey.values()].filter((row) => row.pairScore >= min && row.pairScore <= max).length })); }
  return { runId, totals, detail, query, leaders, supplierLeaders, initialEvaluation, scoreDistribution, shortlist, requestAssessment, bySupplier, byTender, tenderFeatures, supplierFeatures, get: (supplierId, tenderId) => byKey.get(`${tenderId}::${supplierId}`), stats: { ...processing, normalizedTenders: tenderFeatures.length, normalizedSuppliers: supplierFeatures.length, pairRecords: byKey.size, fullAssessments: 0, modelCalls: 0 } };
}
