import { TENDERMATCH_MATCH_ENGINE_VERSION } from "./exploratory-matching.ts";
import { sha256Content, stableStringify } from "./retrieval-features.ts";

/** A new execution contract, not a replacement for the deployed pinned fixture. */
export const TENDERMATCH_ALL_TO_ALL_CONTRACT_VERSION = "tendermatch-all-listed-open/1.0.0" as const;
export const TENDERMATCH_ALL_TO_ALL_INPUT_VERSION = "tendermatch-all-to-all-source-identity/1.0.0" as const;
export const TENDERMATCH_OPEN_PREDICATE = "authoritative tender status = 'OPEN'; no geography or deadline filter" as const;
export const TENDERMATCH_RESULT_PAGE_MAX = 100 as const;

export type ListedSupplier = {
  id: string;
  registryVersion: string;
  profile: { version: string; classification: string | null; readinessStatus: string | null; evidenceSnapshot: string } | null;
};
export type AuthoritativeTender = {
  id: string; version: string; status: string; procurementType: string | null; deadlineAt: string | null;
};
export type AllToAllEligibility = {
  state: "ELIGIBLE" | "OUTSIDE_SCORING_SCOPE" | "INELIGIBLE" | "NEEDS_EVIDENCE";
  reason: "FORMULA_GOODS_WORKS_APPLICABLE" | "CURRENT_SCOPE_GOODS_WORKS_ONLY" | "SUPPLIER_PROFILE_MISSING" | "SUPPLIER_CLASSIFICATION_MISSING" | "PROCUREMENT_TYPE_SUPPLIER_ROLE" | "EXCLUSION_RESTRICTION";
};

function identity(value: string, label: string) {
  if (typeof value !== "string" || !value.trim() || value !== value.trim() || value.length > 512) throw new Error(`${label} must be an explicit bounded identity.`);
  return value;
}
function count(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${label} must be a nonnegative safe integer.`);
  return value;
}
function uniqueIds(values: readonly string[], label: string) {
  const ids = new Set(values.map((value) => identity(value, label)));
  if (ids.size !== values.length) throw new Error(`${label} contains duplicate canonical IDs.`);
  return ids;
}
function cardinality(suppliers: number, tenders: number) {
  return count(count(suppliers, "Supplier count") * count(tenders, "Tender count"), "Cartesian cardinality");
}

/** Call with independent canonical census evidence, not a count of the consumer view itself.
 * A complete consumer projection is allowed; an incomplete one is never relabelled all-listed.
 */
export function reconcileListedSupplierUniverse(input: {
  canonicalListedCount: number; canonicalListedIds: readonly string[]; loadedSupplierIds: readonly string[];
  activeSupplierIds?: readonly string[]; approvedSupplierIds?: readonly string[]; consumerVisibleSupplierIds?: readonly string[];
}) {
  const canonical = uniqueIds(input.canonicalListedIds, "Canonical listed supplier census");
  const loaded = uniqueIds(input.loadedSupplierIds, "Loaded supplier projection");
  if (canonical.size !== count(input.canonicalListedCount, "Canonical listed count")) throw new Error("Canonical supplier count and ID census disagree.");
  const subset = (values: readonly string[] | undefined, label: string) => {
    if (values === undefined) return null;
    const ids = uniqueIds(values, label);
    if ([...ids].some((id) => !canonical.has(id))) throw new Error(`${label} includes an ID outside the canonical listed census.`);
    return ids.size;
  };
  const active = subset(input.activeSupplierIds, "Active supplier subset");
  const approved = subset(input.approvedSupplierIds, "Approved supplier subset");
  const consumerVisible = subset(input.consumerVisibleSupplierIds, "Consumer-visible supplier subset");
  const missing = [...canonical].filter((id) => !loaded.has(id));
  const unexpected = [...loaded].filter((id) => !canonical.has(id));
  if (missing.length || unexpected.length) throw new Error(`Full supplier universe is incomplete: ${missing.length} missing canonical IDs; ${unexpected.length} unexpected IDs. A curated subset cannot satisfy all-listed processing.`);
  return { contractVersion: TENDERMATCH_ALL_TO_ALL_CONTRACT_VERSION, listed: canonical.size, loaded: loaded.size, active, approved, consumerVisible,
    identityHash: sha256Content(stableStringify([...canonical].sort())), complete: true as const };
}

/** Validate the authoritative query result after bounded reads have finished.
 * OPEN with a passed or absent deadline is still OPEN; freshness is a separate gate.
 * Soft-delete/record-visibility semantics must be resolved in the authoritative source contract,
 * not silently invented in this transport validator.
 */
export function validateOpenTenderUniverse(tenders: readonly AuthoritativeTender[], authoritativeOpenCount: number) {
  uniqueIds(tenders.map((row) => row.id), "OPEN tender population");
  if (tenders.length !== count(authoritativeOpenCount, "Authoritative OPEN count")) throw new Error("OPEN tender query count and complete loaded population disagree.");
  for (const tender of tenders) {
    identity(tender.version, "Tender source version");
    if (tender.status !== "OPEN") throw new Error("Only exact authoritative OPEN tender records belong to this universe.");
  }
  return { count: tenders.length, predicate: TENDERMATCH_OPEN_PREDICATE, complete: true as const };
}

/** Missing profiles stay considered, not discarded or guessed into GOODS/WORKS.
 * Known compatible profiles with no evidence remain eligible for Formula's supported-points
 * calculation; their missing criterion fit is not changed to zero by this gate.
 */
export function classifyAllToAllPair(supplier: ListedSupplier, tender: AuthoritativeTender): AllToAllEligibility {
  if (tender.status !== "OPEN") throw new Error("An all-to-all pair requires authoritative OPEN status.");
  if (!["GOODS", "WORKS"].includes(tender.procurementType ?? "")) return { state: "OUTSIDE_SCORING_SCOPE", reason: "CURRENT_SCOPE_GOODS_WORKS_ONLY" };
  if (!supplier.profile) return { state: "NEEDS_EVIDENCE", reason: "SUPPLIER_PROFILE_MISSING" };
  if (!supplier.profile.classification?.trim() || supplier.profile.classification === "UNKNOWN") return { state: "NEEDS_EVIDENCE", reason: "SUPPLIER_CLASSIFICATION_MISSING" };
  if (supplier.profile.classification !== tender.procurementType) return { state: "INELIGIBLE", reason: "PROCUREMENT_TYPE_SUPPLIER_ROLE" };
  if (supplier.profile.readinessStatus === "exclude_from_current_matching_run") return { state: "INELIGIBLE", reason: "EXCLUSION_RESTRICTION" };
  return { state: "ELIGIBLE", reason: "FORMULA_GOODS_WORKS_APPLICABLE" };
}

/** Cardinality and reason accounting only. This does not calculate Formula, run a model,
 * allocate a Cartesian matrix, or claim that eligible pairs have actually been scored.
 */
export function summarizeAllToAllUniverse(suppliers: readonly ListedSupplier[], tenders: readonly AuthoritativeTender[]) {
  uniqueIds(suppliers.map((row) => row.id), "Listed supplier population");
  for (const supplier of suppliers) {
    identity(supplier.registryVersion, "Supplier registry version");
    if (supplier.profile) identity(supplier.profile.version, "Supplier profile version");
  }
  validateOpenTenderUniverse(tenders, tenders.length);
  const byState: Record<AllToAllEligibility["state"], number> = { ELIGIBLE: 0, OUTSIDE_SCORING_SCOPE: 0, INELIGIBLE: 0, NEEDS_EVIDENCE: 0 };
  const byReason: Partial<Record<AllToAllEligibility["reason"], number>> = {};
  const total = cardinality(suppliers.length, tenders.length);
  for (const supplier of suppliers) for (const tender of tenders) {
    const gate = classifyAllToAllPair(supplier, tender);
    byState[gate.state] += 1;
    byReason[gate.reason] = (byReason[gate.reason] ?? 0) + 1;
  }
  if (Object.values(byState).reduce((sum, value) => sum + value, 0) !== total) throw new Error("All-to-all reason accounting does not reconcile.");
  return { contractVersion: TENDERMATCH_ALL_TO_ALL_CONTRACT_VERSION, formulaVersion: TENDERMATCH_MATCH_ENGINE_VERSION,
    supplierCount: suppliers.length, openTenderCount: tenders.length, consideredPairs: total, byState, byReason };
}

export type AllToAllScoreProjection = {
  eligibility: AllToAllEligibility; scoringState: "SCORED" | "NOT_SCORED"; pairScore: number | null;
  assessedOnlyFit: number | null; coverage: number | null; evidenceConfidence: number | null;
  criteria: readonly { fitLevel: number | null; points: number | null }[];
};

/** Transport truth gate. Formula v1.1 may produce a supported-points score of zero while
 * criterion fit stays null. Scope/profile gaps are NOT_SCORED, never an invented Non-match.
 * Deliberately does not recompute Formula or overwrite its fixed-denominator result.
 */
export function validateAllToAllScoreProjection(value: AllToAllScoreProjection) {
  const metrics = [value.pairScore, value.assessedOnlyFit, value.coverage, value.evidenceConfidence];
  if (value.scoringState === "NOT_SCORED") {
    if (metrics.some((metric) => metric !== null) || value.criteria.length) throw new Error("Unscored pairs require absent score metrics and no fabricated criteria.");
  } else {
    if (value.scoringState !== "SCORED" || value.eligibility.state !== "ELIGIBLE") throw new Error("Only eligible pairs may claim Formula-scored results.");
    if (metrics.some((metric) => metric === null || !Number.isInteger(metric) || metric < 0 || metric > 100)) throw new Error("Scored Formula metrics must remain separate 0–100 integer values.");
    if (value.criteria.length !== 5) throw new Error("Formula v1.1 requires its complete five-criterion audit.");
    for (const criterion of value.criteria) {
      if (criterion.fitLevel === null) {
        if (criterion.points !== null) throw new Error("Missing criterion fit must preserve absent criterion points, not fit=0.");
      } else if (!Number.isInteger(criterion.fitLevel) || criterion.fitLevel < 0 || criterion.fitLevel > 5 || criterion.points === null || !Number.isFinite(criterion.points) || criterion.points < 0 || criterion.fitLevel === 0 && criterion.points !== 0) throw new Error("Invalid supported criterion value.");
    }
  }
  return value;
}

/** Whitelisted identity envelope: clocks belong to run evidence, not reusable input identity.
 * Callers supply an explicit source-content projection (including status, formula operands,
 * evidence and real source dates when relevant), never remove arbitrary timestamp keys from it.
 */
export function allToAllInputIdentity(input: {
  kind: "supplier" | "tender"; id: string; sourceVersion: string; sourceContent: unknown; evidenceIdentity: string;
  runId?: string; retrievedAt?: string; normalizedAt?: string;
}) {
  if (!["supplier", "tender"].includes(input.kind)) throw new Error("Unsupported source identity kind.");
  identity(input.id, "Source ID"); identity(input.sourceVersion, "Source version"); identity(input.evidenceIdentity, "Evidence identity");
  if (input.sourceContent === undefined || input.sourceContent === null) throw new Error("Explicit source-content projection is required.");
  return sha256Content(stableStringify({ policyVersion: TENDERMATCH_ALL_TO_ALL_INPUT_VERSION, kind: input.kind, id: input.id,
    sourceVersion: input.sourceVersion, sourceContent: input.sourceContent, evidenceIdentity: input.evidenceIdentity }));
}

type VersionedInventory = { suppliers: readonly { id: string; inputIdentity: string }[]; tenders: readonly { id: string; inputIdentity: string }[]; formulaVersion: string };
/** Plan affected current pairs without allocating the Cartesian universe. */
export function planAllToAllInvalidation(previous: VersionedInventory, current: VersionedInventory) {
  const indexed = (items: readonly { id: string; inputIdentity: string }[], label: string) => {
    uniqueIds(items.map((item) => item.id), label);
    return new Map(items.map((item) => [item.id, identity(item.inputIdentity, "Versioned input identity")]));
  };
  identity(previous.formulaVersion, "Previous formula version"); identity(current.formulaVersion, "Current formula version");
  const previousSuppliers = indexed(previous.suppliers, "Previous suppliers"), previousTenders = indexed(previous.tenders, "Previous tenders");
  const currentSuppliers = indexed(current.suppliers, "Current suppliers"), currentTenders = indexed(current.tenders, "Current tenders");
  const formulaChanged = previous.formulaVersion !== current.formulaVersion;
  const changedSupplierIds = [...currentSuppliers].filter(([id, key]) => formulaChanged || previousSuppliers.get(id) !== key).map(([id]) => id).sort();
  const changedTenderIds = [...currentTenders].filter(([id, key]) => formulaChanged || previousTenders.get(id) !== key).map(([id]) => id).sort();
  const removedSupplierIds = [...previousSuppliers.keys()].filter((id) => !currentSuppliers.has(id)).sort();
  const removedTenderIds = [...previousTenders.keys()].filter((id) => !currentTenders.has(id)).sort();
  const consideredPairs = cardinality(currentSuppliers.size, currentTenders.size);
  const affectedPairs = cardinality(changedSupplierIds.length, currentTenders.size) + cardinality(currentSuppliers.size - changedSupplierIds.length, changedTenderIds.length);
  return { consideredPairs, affectedPairs, reusablePairs: consideredPairs - affectedPairs, changedSupplierIds, changedTenderIds, removedSupplierIds, removedTenderIds, formulaChanged };
}

export type AllToAllRankedRow = {
  supplierId: string; tenderId: string; pairScore: number | null; dataCoverage: number | null; retrievalScore: number | null;
};
export type AllToAllPageQuery = {
  runId: string; supplierId?: string; tenderId?: string; sort?: "pairScore" | "dataCoverage" | "retrievalScore";
  filterIdentity?: string; limit?: number; cursor?: string;
};
const rowKey = (row: AllToAllRankedRow) => stableStringify([row.supplierId, row.tenderId]);
const compareText = (left: string, right: string) => left < right ? -1 : left > right ? 1 : 0;

/** Server-side/reference pagination contract. SQL adapters implement the same keyset order.
 * At most limit+1 rows are retained for the result window; no universe response is permitted.
 */
export function boundedAllToAllPage<T extends AllToAllRankedRow>(rows: Iterable<T>, query: AllToAllPageQuery) {
  identity(query.runId, "Run ID");
  if (Boolean(query.supplierId) === Boolean(query.tenderId)) throw new Error("Exactly one supplier or tender focus is required; universe pages are prohibited.");
  identity(query.supplierId ?? query.tenderId!, "Focused identity");
  const limit = query.limit ?? 25, sort = query.sort ?? "pairScore";
  if (!Number.isInteger(limit) || limit < 1 || limit > TENDERMATCH_RESULT_PAGE_MAX) throw new Error("Result limit must be 1–100.");
  if (!["pairScore", "dataCoverage", "retrievalScore"].includes(sort)) throw new Error("Unsupported ranking field.");
  const scope = sha256Content(stableStringify([TENDERMATCH_ALL_TO_ALL_CONTRACT_VERSION, query.runId, query.supplierId, query.tenderId, sort, query.filterIdentity ?? ""]));
  let cursor: { scope: string; key: string; value: number | null } | null = null;
  if (query.cursor) {
    try {
      if (query.cursor.length > 4096) throw new Error("oversized");
      cursor = JSON.parse(decodeURIComponent(query.cursor));
      if (!cursor || cursor.scope !== scope || typeof cursor.key !== "string" || !(cursor.value === null || typeof cursor.value === "number" && Number.isFinite(cursor.value))) throw new Error("invalid");
    } catch { throw new Error("Invalid keyset cursor or different run/focus/filter/sort scope."); }
  }
  const compare = (left: { value: number | null; key: string }, right: { value: number | null; key: string }) => {
    if (left.value === null && right.value !== null) return 1;
    if (left.value !== null && right.value === null) return -1;
    return (right.value ?? 0) - (left.value ?? 0) || compareText(left.key, right.key);
  };
  const window: { row: T; value: number | null; key: string }[] = [];
  const keys = new Set<string>(); let total = 0; let cursorFound = cursor === null;
  for (const row of rows) {
    identity(row.supplierId, "Result supplier ID"); identity(row.tenderId, "Result tender ID");
    if (query.supplierId && row.supplierId !== query.supplierId || query.tenderId && row.tenderId !== query.tenderId) throw new Error("Result row crossed the requested focus boundary.");
    const entry = { row, value: row[sort], key: rowKey(row) };
    if (!(entry.value === null || typeof entry.value === "number" && Number.isFinite(entry.value))) throw new Error("Ranking values must be finite or explicitly missing.");
    if (keys.has(entry.key)) throw new Error("Focused results contain duplicate pair identities.");
    keys.add(entry.key); total += 1;
    if (cursor && entry.key === cursor.key && entry.value === cursor.value) cursorFound = true;
    if (cursor && compare(entry, cursor) <= 0) continue;
    let lo = 0, hi = window.length;
    while (lo < hi) { const mid = (lo + hi) >>> 1; if (compare(entry, window[mid]) < 0) hi = mid; else lo = mid + 1; }
    window.splice(lo, 0, entry); if (window.length > limit + 1) window.pop();
  }
  if (!cursorFound) throw new Error("Keyset cursor no longer belongs to the pinned focused result set.");
  const items = window.slice(0, limit), last = items.at(-1);
  return { runId: query.runId, items: items.map((entry) => entry.row), total, limit,
    nextCursor: window.length > limit && last ? encodeURIComponent(JSON.stringify({ scope, key: last.key, value: last.value })) : null };
}
