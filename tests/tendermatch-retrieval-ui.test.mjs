import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { pairQueryParameters, queryTenderMatchPairs, requestTenderMatchAssessment, validatePairPage } from "../apps/tender-apps/src/tendermatch-pair-api.ts";
import { loadTenderMatchRuntime } from "../apps/tender-apps/src/tendermatch-supplier-api.ts";
import { criterionPointsForDisplay, retrievalScoreLabel } from "../apps/tender-apps/src/tendermatch-pair-display.ts";

const row = { key: "tender:1::supplier:1", supplierId: "supplier:1", tenderId: "tender:1", pairScore: 0, denominator: 100, dataCoverage: 0, evidenceConfidence: 0, retrievalScore: null, mainLimitation: "MISSING_INPUTS", formulaVersion: "tendermatch-match-formula/1.1.0", eligibility: { state: "ELIGIBLE", reasonCodes: [] } };
const page = (items = [row]) => ({ items, total: items.length, offset: 0, limit: 25, nextCursor: null });

test("client query contract prohibits full-universe requests and bounds both matrix axes", () => {
  assert.throws(() => pairQueryParameters({}), /Select one supplier/);
  assert.throws(() => pairQueryParameters({ supplierId: "s", tenderId: "t" }), /Select one supplier/);
  assert.throws(() => pairQueryParameters({ supplierId: "s", limit: 201 }), /1–200/);
  assert.throws(() => pairQueryParameters({ supplierIds: ["s"], tenderIds: Array.from({ length: 9 }, (_, index) => `t${index}`) }), /25 suppliers × 8 tenders/);
  const params = pairQueryParameters({ supplierId: "supplier:1", limit: 25, cursor: "25", sort: "retrievalScore" });
  assert.equal(params.get("supplierId"), "supplier:1");
  assert.equal(params.get("cursor"), "25");
  assert.equal(params.get("sort"), "retrievalScore");
});

test("bounded response validates identity, uniqueness and numeric zero independently of retrieval", () => {
  assert.equal(validatePairPage(page(), { supplierId: "supplier:1" }).items[0].pairScore, 0);
  assert.equal(validatePairPage(page([{ ...row, retrievalScore: .99 }]), { supplierId: "supplier:1" }).items[0].pairScore, 0);
  assert.throws(() => validatePairPage(page([row, row]), { supplierId: "supplier:1" }), /Duplicate/);
  assert.throws(() => validatePairPage(page(), { supplierId: "another" }), /identity boundary/);
  assert.throws(() => validatePairPage(page([{ ...row, pairScore: 101 }]), { supplierId: "supplier:1" }), /0–100/);
  assert.throws(() => validatePairPage(page([{ ...row, pairScore: null }]), { supplierId: "supplier:1" }), /0–100/);
  assert.throws(() => validatePairPage(page([{ ...row, denominator: 65 }]), { supplierId: "supplier:1" }), /fixed 100-point/);
  assert.throws(() => validatePairPage(page([{ ...row, dataCoverage: null }]), { supplierId: "supplier:1" }), /Coverage/);
  assert.throws(() => validatePairPage({ ...page(), runId: "old-run" }, { supplierId: "supplier:1" }, "new-run"), /different scoring run/);
});

test("criterion display uses actual 100-point contributions without mutating stored weighted numerators", () => {
  const component = { weight: 35, fitLevel: 3, weightedPoints: 105 };
  assert.equal(criterionPointsForDisplay(component.weightedPoints, "tendermatch-match-formula/1.1.0"), 21);
  assert.equal(component.weightedPoints, 105);
  assert.equal(criterionPointsForDisplay(0, "tendermatch-match-formula/1.1.0"), 0);
  assert.equal(criterionPointsForDisplay(null, "tendermatch-match-formula/1.1.0"), null);
  assert.equal(criterionPointsForDisplay(undefined, "tendermatch-match-formula/1.1.0"), null);
  assert.equal(criterionPointsForDisplay(21, "historical-policy"), 21);
  assert.equal(retrievalScoreLabel(null), "Not ranked");
  assert.equal(retrievalScoreLabel(0), "0.0000");
  assert.equal(retrievalScoreLabel(1 / 61 + 1 / 62), "0.0325");
});

test("live focused page uses a single bounded API call and preserves the server cursor", async () => {
  const savedFetch = globalThis.fetch;
  const calls = [];
  try {
    globalThis.fetch = async (url) => { calls.push(url); return Response.json({ ...page(), total: 40, nextCursor: "opaque-next-page" }); };
    const actual = await queryTenderMatchPairs({ mode: "local-pinned-service" }, { supplierId: "supplier:1", limit: 25 });
    assert.equal(actual.nextCursor, "opaque-next-page");
    assert.equal(calls.length, 1);
    assert.match(calls[0], /^\/api\/tendermatch\/pairs\?/);
    assert.equal(new URL(calls[0], "http://localhost").searchParams.get("limit"), "25");
  } finally { globalThis.fetch = savedFetch; }
});

test("static focused access loads one bounded partition and never other suppliers", async () => {
  const savedFetch = globalThis.fetch;
  const calls = [];
  try {
    globalThis.fetch = async (url) => {
      calls.push(url);
      return Response.json(url.endsWith("pair-index-v2.json") ? { schemaVersion: "tendermatch-pair-index/1.0.0", suppliers: { "supplier:1": "/tendermatch/data/pairs-v2/ui-test-supplier.json", "supplier:2": "/tendermatch/data/pairs-v2/other.json" }, tenders: {} } : { items: [row], retrieval: { semanticState: "DISABLED", shortlistLimit: 20 } });
    };
    const actual = await queryTenderMatchPairs({ mode: "static-pinned-snapshot", suppliers: [], summary: { retrievedAt: "2026-09-01", profileVersion: "1.3" }, evaluationSummary: { engineVersion: "1.1" } }, { supplierId: "supplier:1" });
    assert.equal(actual.items.length, 1);
    assert.equal(actual.items[0].pairScore, 0);
    assert.equal(actual.retrieval.semanticState, "DISABLED");
    assert.equal(calls.length, 2);
    assert.ok(calls.every((url) => !url.includes("other.json")));
  } finally { globalThis.fetch = savedFetch; }
});

test("static partition cache is invalidated by scoring run identity, not only source date", async () => {
  const savedFetch = globalThis.fetch;
  const partitionPath = "/tendermatch/data/pairs-v2/ui-run-cache.json";
  let activeRun = "run-old", partitionCalls = 0;
  const runtime = { mode: "static-pinned-snapshot", suppliers: [], summary: { retrievedAt: "2026-09-01", profileVersion: "1.3" }, evaluationSummary: { engineVersion: "1.1" } };
  try {
    globalThis.fetch = async (url) => {
      if (url.endsWith("pair-index-v2.json")) return Response.json({ schemaVersion: "tendermatch-pair-index/1.0.0", suppliers: { "supplier:1": partitionPath }, tenders: {} });
      partitionCalls += 1;
      return Response.json({ runId: activeRun, items: [{ ...row, runId: activeRun }] });
    };
    await queryTenderMatchPairs({ ...runtime, processing: { runId: activeRun } }, { supplierId: "supplier:1" });
    activeRun = "run-new";
    const actual = await queryTenderMatchPairs({ ...runtime, processing: { runId: activeRun } }, { supplierId: "supplier:1" });
    assert.equal(partitionCalls, 2);
    assert.equal(actual.runId, activeRun);
    assert.equal(actual.items[0].runId, activeRun);
    await assert.rejects(() => queryTenderMatchPairs({ ...runtime, processing: { runId: "unexpected-run" } }, { supplierId: "supplier:1" }), /different scoring run/);
  } finally { globalThis.fetch = savedFetch; }
});

test("static full assessment is truthfully disabled with zero requests and score mutation", async () => {
  const savedFetch = globalThis.fetch;
  let calls = 0;
  try {
    globalThis.fetch = async () => { calls += 1; throw new Error("Unexpected model or API request"); };
    const before = structuredClone(row);
    const state = await requestTenderMatchAssessment({ mode: "static-pinned-snapshot" }, row.supplierId, row.tenderId);
    assert.equal(state.state, "disabled");
    assert.match(state.reason, /No model was called/);
    assert.equal(calls, 0);
    assert.deepEqual(row, before);
  } finally { globalThis.fetch = savedFetch; }
});

test("live runtime error never silently switches to a pinned static source", async () => {
  const savedFetch = globalThis.fetch;
  const calls = [];
  try {
    globalThis.fetch = async (url) => { calls.push(url); return Response.json({ error: "Service unavailable" }, { status: 503 }); };
    await assert.rejects(() => loadTenderMatchRuntime(), /Service unavailable/);
    assert.deepEqual(calls, ["/api/tendermatch/runtime"]);
  } finally { globalThis.fetch = savedFetch; }
});

test("active UI uses compact pages and selected detail while presenting all independent dimensions", async () => {
  const main = await readFile(new URL("../apps/tender-apps/src/tendermatch-app.tsx", import.meta.url), "utf8");
  const views = await readFile(new URL("../apps/tender-apps/src/tendermatch-pair-workspace.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(main, /runtime\.evaluations|buildExploratoryEvaluationInventory/);
  assert.match(main, /runtime\.initialEvaluation/);
  assert.match(main, /loadTenderMatchPair\(runtime/);
  assert.match(main, /detailCache\.current\.size > 12/);
  assert.match(main, /criterionPointsForDisplay\(component\.weightedPoints, match\.engineVersion\)/);
  for (const dimension of ["Pair Score", "Data Coverage", "Evidence Confidence", "Retrieval relevance", "Full TORS/AI", "Human disposition"]) assert.ok(views.includes(dimension));
  assert.match(views, /Export this window CSV/);
  assert.match(views, /Export this window Excel/);
  assert.match(views, /nextCursor/);
  assert.match(views, /role="status"/);
  assert.match(views, /role="alert"/);
  assert.match(views, /reciprocal-rank fusion, not a percentage or Pair Score/);
  assert.match(views, /Bounded pages or pinned partitions/);
  assert.doesNotMatch(views, /Not embedded|Only the visible window is loaded/);
});
