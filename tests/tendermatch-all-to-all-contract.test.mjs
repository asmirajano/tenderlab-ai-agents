import assert from "node:assert/strict";
import test from "node:test";
import {
  TENDERMATCH_ALL_TO_ALL_CONTRACT_VERSION, TENDERMATCH_RESULT_PAGE_MAX,
  reconcileListedSupplierUniverse, validateOpenTenderUniverse, classifyAllToAllPair, summarizeAllToAllUniverse,
  validateAllToAllScoreProjection, allToAllInputIdentity, planAllToAllInvalidation, boundedAllToAllPage,
} from "../packages/tendermatch/src/all-to-all-contract.ts";

// Deliberately synthetic contract fixtures. These are not execution evidence or Neon counts.
const goods = { id: "supplier:goods", registryVersion: "registry/v1", profile: { version: "profile/v1", classification: "GOODS", readinessStatus: "requires_enrichment", evidenceSnapshot: "evidence:empty" } };
const works = { ...goods, id: "supplier:works", profile: { ...goods.profile, classification: "WORKS" } };
const missing = { id: "supplier:missing-profile", registryVersion: "registry/v1", profile: null };
const tender = { id: "tender:goods", version: "source/v1", status: "OPEN", procurementType: "GOODS", deadlineAt: "2000-01-01T00:00:00Z" };

test("all-listed census reconciles exact IDs and reports narrower active/approved/consumer subsets", () => {
  const result = reconcileListedSupplierUniverse({ canonicalListedCount: 3, canonicalListedIds: [goods.id, works.id, missing.id], loadedSupplierIds: [missing.id, works.id, goods.id], activeSupplierIds: [goods.id, works.id], approvedSupplierIds: [goods.id], consumerVisibleSupplierIds: [works.id] });
  assert.deepEqual([result.listed, result.loaded, result.active, result.approved, result.consumerVisible], [3, 3, 2, 1, 1]);
  assert.equal(result.contractVersion, TENDERMATCH_ALL_TO_ALL_CONTRACT_VERSION);
  const unspecified = reconcileListedSupplierUniverse({ canonicalListedCount: 0, canonicalListedIds: [], loadedSupplierIds: [] });
  assert.equal(unspecified.active, null); assert.equal(unspecified.consumerVisible, null);
});

test("curated subset, same-count wrong identities, duplicate census and contradictory source counts fail closed", () => {
  const base = { canonicalListedCount: 3, canonicalListedIds: [goods.id, works.id, missing.id], loadedSupplierIds: [goods.id, works.id, missing.id] };
  assert.throws(() => reconcileListedSupplierUniverse({ ...base, loadedSupplierIds: [goods.id] }), /2 missing.*curated subset/);
  assert.throws(() => reconcileListedSupplierUniverse({ ...base, loadedSupplierIds: [goods.id, works.id, "supplier:unexpected"] }), /1 missing.*1 unexpected/);
  assert.throws(() => reconcileListedSupplierUniverse({ ...base, canonicalListedCount: 4 }), /count and ID census/);
  assert.throws(() => reconcileListedSupplierUniverse({ ...base, canonicalListedIds: [goods.id, goods.id, works.id] }), /duplicate/);
  assert.throws(() => reconcileListedSupplierUniverse({ ...base, loadedSupplierIds: [goods.id, goods.id, works.id] }), /duplicate/);
  assert.throws(() => reconcileListedSupplierUniverse({ ...base, approvedSupplierIds: ["not-listed"] }), /outside/);
});

test("exact OPEN status includes expired and absent deadlines and all countries without source mutation", () => {
  const source = [tender, { ...tender, id: "tender:no-deadline", deadlineAt: null }, { ...tender, id: "tender:future", deadlineAt: "2100-01-01T00:00:00Z", country: "Outside the old pilot" }];
  const before = structuredClone(source);
  assert.equal(validateOpenTenderUniverse(source, 3).count, 3);
  assert.equal(summarizeAllToAllUniverse([goods], source).byState.ELIGIBLE, 3);
  assert.deepEqual(source, before);
  for (const status of ["CLOSED", "CANCELLED", "AWARDED", "UNKNOWN", "open"]) assert.throws(() => validateOpenTenderUniverse([{ ...tender, status }], 1), /exact authoritative OPEN/);
  assert.throws(() => validateOpenTenderUniverse(source, 4), /count.*population/);
  assert.throws(() => validateOpenTenderUniverse([tender, tender], 2), /duplicate/);
});

test("whole universe accounts for missing profiles and every outside-scope OPEN tender without Non-match", () => {
  const tenders = [tender, { ...tender, id: "tender:works", procurementType: "WORKS" }, ...["CONSULTING", "SERVICES", "OTHER"].map((procurementType) => ({ ...tender, id: `tender:${procurementType}`, procurementType }))];
  const summary = summarizeAllToAllUniverse([goods, works, missing], tenders);
  assert.deepEqual(summary.byState, { ELIGIBLE: 2, OUTSIDE_SCORING_SCOPE: 9, INELIGIBLE: 2, NEEDS_EVIDENCE: 2 });
  assert.equal(summary.consideredPairs, 15);
  assert.equal(Object.values(summary.byReason).reduce((sum, value) => sum + value, 0), 15);
  assert.equal(summary.byReason.SUPPLIER_PROFILE_MISSING, 2);
  assert.doesNotMatch(JSON.stringify(summary), /NON_MATCH|NO_MATCH|Bid\/No-Bid/);
  assert.throws(() => summarizeAllToAllUniverse([goods, goods], tenders), /duplicate/);
});

test("scope, missing classification, explicit exclusion and insufficient criterion evidence remain distinct", () => {
  assert.deepEqual(classifyAllToAllPair(missing, tender), { state: "NEEDS_EVIDENCE", reason: "SUPPLIER_PROFILE_MISSING" });
  assert.equal(classifyAllToAllPair({ ...goods, profile: { ...goods.profile, classification: null } }, tender).reason, "SUPPLIER_CLASSIFICATION_MISSING");
  assert.equal(classifyAllToAllPair({ ...goods, profile: { ...goods.profile, classification: "UNKNOWN" } }, tender).reason, "SUPPLIER_CLASSIFICATION_MISSING");
  assert.equal(classifyAllToAllPair(goods, tender).state, "ELIGIBLE");
  assert.equal(classifyAllToAllPair({ ...goods, profile: { ...goods.profile, readinessStatus: "exclude_from_current_matching_run" } }, tender).reason, "EXCLUSION_RESTRICTION");
  assert.equal(classifyAllToAllPair(works, tender).reason, "PROCUREMENT_TYPE_SUPPLIER_ROLE");
  assert.equal(classifyAllToAllPair(missing, { ...tender, procurementType: "CONSULTING" }).state, "OUTSIDE_SCORING_SCOPE");
});

test("a scored zero preserves missing criterion fit while unscored scope/profile gaps stay null", () => {
  const zero = { eligibility: classifyAllToAllPair(goods, tender), scoringState: "SCORED", pairScore: 0, assessedOnlyFit: 0, coverage: 0, evidenceConfidence: 0, criteria: Array.from({ length: 5 }, () => ({ fitLevel: null, points: null })) };
  assert.equal(validateAllToAllScoreProjection(zero).pairScore, 0);
  assert.equal(validateAllToAllScoreProjection(zero).criteria[0].fitLevel, null);
  const supportedZero = { ...zero, criteria: [{ fitLevel: 0, points: 0 }, ...zero.criteria.slice(1)], coverage: 35 };
  assert.equal(validateAllToAllScoreProjection(supportedZero).criteria[0].fitLevel, 0);
  assert.throws(() => validateAllToAllScoreProjection({ ...zero, criteria: [{ fitLevel: null, points: 0 }, ...zero.criteria.slice(1)] }), /Missing criterion fit/);
  assert.throws(() => validateAllToAllScoreProjection({ ...zero, criteria: [{ fitLevel: 0, points: 5 }, ...zero.criteria.slice(1)] }), /Invalid supported/);
  const outside = { eligibility: classifyAllToAllPair(goods, { ...tender, procurementType: "OTHER" }), scoringState: "NOT_SCORED", pairScore: null, assessedOnlyFit: null, coverage: null, evidenceConfidence: null, criteria: [] };
  assert.equal(validateAllToAllScoreProjection(outside).pairScore, null);
  assert.throws(() => validateAllToAllScoreProjection({ ...outside, pairScore: 0 }), /absent score/);
  assert.throws(() => validateAllToAllScoreProjection({ ...zero, eligibility: outside.eligibility }), /Only eligible/);
  assert.throws(() => validateAllToAllScoreProjection({ ...zero, criteria: [] }), /five-criterion/);
});

test("versioned source identity ignores run clocks but retains real source timestamps and evidence changes", () => {
  const base = { kind: "tender", id: tender.id, sourceVersion: tender.version, sourceContent: { title: "Power transformers", deadlineAt: tender.deadlineAt, status: "OPEN" }, evidenceIdentity: "evidence:v1", runId: "run1", retrievedAt: "2026-09-05T12:00:00Z", normalizedAt: "2026-09-05T12:00:01Z" };
  const hash = allToAllInputIdentity(base);
  assert.equal(hash, allToAllInputIdentity({ ...base, runId: "run2", retrievedAt: "2026-09-06T12:00:00Z", normalizedAt: "2026-09-06T12:00:01Z" }));
  for (const change of [{ sourceVersion: "source/v2" }, { evidenceIdentity: "evidence:v2" }, { sourceContent: { ...base.sourceContent, deadlineAt: "2100-01-01T00:00:00Z" } }, { sourceContent: { ...base.sourceContent, status: "CLOSED" } }, { sourceContent: { ...base.sourceContent, title: "Water pipes" } }]) assert.notEqual(hash, allToAllInputIdentity({ ...base, ...change }));
  assert.throws(() => allToAllInputIdentity({ ...base, sourceContent: null }), /Explicit source-content/);
});

test("incremental plan reuses unchanged pairs and confines supplier/tender/evidence deltas without duplicate intersection", () => {
  const previous = { formulaVersion: "formula/1.1.0", suppliers: [{ id: "s1", inputIdentity: "s1v1" }, { id: "s2", inputIdentity: "s2v1" }], tenders: [{ id: "t1", inputIdentity: "t1v1" }, { id: "t2", inputIdentity: "t2v1" }, { id: "t3", inputIdentity: "t3v1" }] };
  assert.deepEqual([planAllToAllInvalidation(previous, previous).affectedPairs, planAllToAllInvalidation(previous, previous).reusablePairs], [0, 6]);
  const newSupplier = { ...previous, suppliers: [...previous.suppliers, { id: "s3", inputIdentity: "s3v1" }] };
  assert.deepEqual([planAllToAllInvalidation(previous, newSupplier).affectedPairs, planAllToAllInvalidation(previous, newSupplier).reusablePairs], [3, 6]);
  const changedEvidence = { ...previous, suppliers: [{ id: "s1", inputIdentity: "s1evidencev2" }, previous.suppliers[1]] };
  assert.equal(planAllToAllInvalidation(previous, changedEvidence).affectedPairs, 3);
  const tenderChange = { ...previous, tenders: [{ id: "t1", inputIdentity: "t1v2" }, ...previous.tenders.slice(1)] };
  assert.equal(planAllToAllInvalidation(previous, tenderChange).affectedPairs, 2);
  const overlap = planAllToAllInvalidation(previous, { ...changedEvidence, tenders: tenderChange.tenders });
  assert.deepEqual([overlap.affectedPairs, overlap.reusablePairs], [4, 2]);
  const closedTender = planAllToAllInvalidation(previous, { ...previous, tenders: previous.tenders.slice(1) });
  assert.deepEqual([closedTender.consideredPairs, closedTender.affectedPairs, closedTender.removedTenderIds], [4, 0, ["t1"]]);
  assert.equal(planAllToAllInvalidation(previous, { ...previous, formulaVersion: "formula/2" }).affectedPairs, 6);
});

test("bounded keyset pages preserve zero/null distinction, stable ties and separate retrieval ordering", () => {
  const rows = [0, 30, 30, null, 80].map((pairScore, index) => ({ supplierId: "s1", tenderId: `t${index}`, pairScore, dataCoverage: 20, retrievalScore: index / 10 }));
  const query = { runId: "run:pinned", supplierId: "s1", limit: 2 };
  const first = boundedAllToAllPage(rows, query), second = boundedAllToAllPage([...rows].reverse(), { ...query, cursor: first.nextCursor }), third = boundedAllToAllPage(rows, { ...query, cursor: second.nextCursor });
  assert.deepEqual([...first.items, ...second.items, ...third.items].map((row) => row.pairScore), [80, 30, 30, 0, null]);
  assert.equal(third.nextCursor, null); assert.equal(first.total, 5);
  assert.equal(new Set([...first.items, ...second.items, ...third.items].map((row) => row.tenderId)).size, 5);
  const retrieval = boundedAllToAllPage(rows, { ...query, sort: "retrievalScore" });
  assert.deepEqual(retrieval.items.map((row) => row.tenderId), ["t4", "t3"]);
  assert.equal(retrieval.items[1].pairScore, null);
  assert.equal(rows[1].pairScore, 30);
});

test("keyset refuses universe reads, oversized bounds, cross-scope cursors, duplicates and stale results", () => {
  const rows = [0, 1, 2].map((score) => ({ supplierId: "s1", tenderId: `t${score}`, pairScore: score, dataCoverage: 0, retrievalScore: null }));
  const query = { runId: "run:one", supplierId: "s1", filterIdentity: "filter:a", limit: 1 };
  const first = boundedAllToAllPage(rows, query);
  for (const change of [{ runId: "run:two" }, { sort: "dataCoverage" }, { filterIdentity: "filter:b" }, { supplierId: undefined, tenderId: "t1" }]) assert.throws(() => boundedAllToAllPage(rows, { ...query, ...change, cursor: first.nextCursor }), /cursor/);
  assert.throws(() => boundedAllToAllPage(rows, { runId: "r" }), /focus/);
  assert.throws(() => boundedAllToAllPage(rows, { ...query, tenderId: "t1" }), /focus/);
  assert.throws(() => boundedAllToAllPage(rows, { ...query, limit: TENDERMATCH_RESULT_PAGE_MAX + 1 }), /1–100/);
  assert.throws(() => boundedAllToAllPage([...rows, rows[0]], query), /duplicate/);
  assert.throws(() => boundedAllToAllPage([{ ...rows[0], supplierId: "another" }], query), /focus boundary/);
  assert.throws(() => boundedAllToAllPage(rows.slice(0, 2), { ...query, cursor: first.nextCursor }), /no longer/);
  assert.throws(() => boundedAllToAllPage(rows, { ...query, cursor: "broken" }), /cursor/);
});
