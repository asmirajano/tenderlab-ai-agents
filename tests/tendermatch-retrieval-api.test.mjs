import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { once } from "node:events";
import test from "node:test";
import { createPairService, parsePairQuery } from "../scripts/lib/tendermatch-pair-service.mjs";
import { createPinnedSnapshotStore, createTenderMatchLocalServer } from "../scripts/serve-tendermatch-local.mjs";
import { runtimeTenders } from "../packages/tendermatch/src/pilot-data.ts";
import { MemoryPairStore } from "../packages/tendermatch/src/retrieval-pipeline.ts";

const at = "2026-09-01T11:09:44.745Z";
const snapshot = JSON.parse(await readFile(new URL("../apps/tender-apps/public/tendermatch/data/supplier-runtime-v1.3.json", import.meta.url), "utf8"));
const store = await createPinnedSnapshotStore();
const source = await store.loadAll();

test("compact service retains all pinned scores and reuses unchanged cached results", () => {
  const scoreStore = new MemoryPairStore();
  const first = createPairService({ ...source, tenders: runtimeTenders, evaluatedAt: at, scoreStore });
  const second = createPairService({ ...source, tenders: runtimeTenders, evaluatedAt: at, scoreStore });
  assert.equal(first.stats.computed, 1020);
  assert.equal(second.stats.computed, 0);
  assert.equal(second.stats.reused, 1020);
  assert.equal(second.stats.modelCalls, 0);
  for (const original of snapshot.evaluations) {
    const row = second.get(original.supplierId, original.tenderId);
    assert.equal(row.pairScore, original.value, original.key);
    assert.equal(row.dataCoverage, original.dataCoverage);
    assert.equal(row.evidenceConfidence, original.evidenceConfidence);
    assert.equal(row.denominator, 100);
    assert.equal("criteria" in row, false);
  }
});

test("focused keyset pagination is unique, scoped and selected details reconcile", () => {
  const service = createPairService({ ...source, tenders: runtimeTenders, evaluatedAt: at });
  const supplierId = service.supplierFeatures[0].id;
  const keys = new Set(); let cursor = null;
  do {
    const page = service.query({ supplierId, limit: 7, cursor });
    assert.equal(page.total, 60); assert.ok(page.items.length <= 7);
    for (const row of page.items) {
      assert.equal(keys.has(row.key), false); keys.add(row.key);
      const detail = service.detail(row.supplierId, row.tenderId, "2027-09-01T00:00:00.000Z");
      assert.equal(row.pairScore, detail.evaluation.value);
      assert.equal(detail.evaluation.freshness.status, "closed");
    }
    cursor = page.nextCursor;
  } while (cursor);
  assert.equal(keys.size, 60);
  assert.throws(() => service.query({}), /Select one supplier/);
  const firstPage = service.query({ supplierId, limit: 1 });
  assert.throws(() => service.query({ supplierId, sort: "dataCoverage", cursor: firstPage.nextCursor }), /different query/);
  assert.throws(() => parsePairQuery(new URLSearchParams("supplierId=x&limit=201")), /1–200/);
  assert.throws(() => parsePairQuery(new URLSearchParams("supplierId=x&tenderId=y")), /Select one supplier/);
});

test("retrieval ordering and full-assessment state never modify immutable Formula scores", () => {
  const service = createPairService({ ...source, tenders: runtimeTenders, evaluatedAt: at });
  const supplierId = service.supplierFeatures[0].id;
  const formula = service.query({ supplierId, limit: 100 });
  const retrieved = service.query({ supplierId, sort: "retrievalScore", limit: 100 });
  assert.equal(retrieved.retrieval.semanticState, "DISABLED");
  const originals = new Map(formula.items.map((row) => [row.key, row.pairScore]));
  for (const row of retrieved.items) {
    assert.equal(row.pairScore, originals.get(row.key));
    assert.equal(service.get(row.supplierId, row.tenderId).retrievalScore, null);
  }
  const eligible = formula.items.find((row) => row.eligibility.state === "ELIGIBLE");
  const first = service.requestAssessment(eligible.supplierId, eligible.tenderId, "consultant", at);
  const retry = service.requestAssessment(eligible.supplierId, eligible.tenderId, "consultant", at);
  assert.equal(first.id, retry.id);
  assert.equal(first.status, "DISABLED");
  assert.equal(service.get(eligible.supplierId, eligible.tenderId).pairScore, eligible.pairScore);
});

test("HTTP catalog never sends the pair universe; pages, selected detail and disabled assessment work", async (context) => {
  const app = await createTenderMatchLocalServer({ store, clock: () => at });
  await app.ready;
  app.server.listen(0, "127.0.0.1"); await once(app.server, "listening");
  context.after(() => app.server.close());
  const origin = `http://127.0.0.1:${app.server.address().port}`;
  const catalog = await fetch(`${origin}/api/tendermatch/runtime`).then((response) => response.json());
  assert.equal(catalog.schemaVersion, "tendermatch-runtime-catalog/2.0.0");
  assert.equal(catalog.mode, "local-pinned-service");
  assert.equal("evaluations" in catalog, false);
  assert.equal(catalog.evaluationSummary.total, 1020);
  assert.equal(catalog.processing.modelCalls, 0);
  assert.equal(catalog.summary.retrievedAt, snapshot.summary.retrievedAt);
  assert.ok(catalog.initialEvaluation.value > 0, "Overview keeps a representative supported pair rather than an arbitrary first zero");
  const query = new URLSearchParams({ supplierId: `supplier:NEON:${catalog.suppliers[0].canonicalEntityId}`, limit: "7" });
  const page = await fetch(`${origin}/api/tendermatch/pairs?${query}`).then((response) => response.json());
  assert.equal(page.items.length, 7); assert.ok(page.nextCursor);
  const pair = page.items[0];
  const detailQuery = new URLSearchParams({ supplierId: pair.supplierId, tenderId: pair.tenderId });
  const detail = await fetch(`${origin}/api/tendermatch/pair?${detailQuery}`).then((response) => response.json());
  assert.equal(detail.evaluation.value, pair.pairScore);
  assert.equal((await fetch(`${origin}/api/tendermatch/pairs`)).status, 400);
  const assessment = await fetch(`${origin}/api/tendermatch/assessments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ supplierId: pair.supplierId, tenderId: pair.tenderId, reason: "user-opened", requestId: "review-test" }) }).then((response) => response.json());
  assert.equal(assessment.assessment.state, "disabled"); assert.equal(assessment.modelCalls, 0);
  assert.equal((await fetch(`${origin}/api/tendermatch/assessments`, { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://unrelated.example" }, body: "{}" })).status, 403);
});
