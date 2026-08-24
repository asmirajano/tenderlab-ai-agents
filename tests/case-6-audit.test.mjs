import assert from "node:assert/strict";
import test from "node:test";

const load = (path) => import(new URL(`../${path}?test=${Date.now()}-${Math.random()}`, import.meta.url));

test("models Case 6 as a complete reverse-auction and administrative-remedy route", async () => {
  const [{ case6, case6Engagements }, { case6ProcessGraph }] = await Promise.all([
    load("app/case-simulation/case-6-data.ts"),
    load("app/case-simulation/case-6-graph.ts"),
  ]);

  assert.match(case6.procurementMethod, /обратный e-аукцион/i);
  assert.match(case6.endpoint, /contract/i);
  assert.equal(case6Engagements.length, 64);
  assert.equal(new Set(case6Engagements.map((item) => item.agentId)).size, 64);
  assert.equal(case6ProcessGraph.activities.length, 22);
  assert.equal(case6ProcessGraph.processes.length, 9);
  assert.equal(case6ProcessGraph.eventAudits.length, 22);
});

test("preserves live bidding, complaint and award authority as human or external actions", async () => {
  const { case6ProcessGraph } = await load("app/case-simulation/case-6-graph.ts");
  const narrative = case6ProcessGraph.activities.map((item) => `${item.title} ${item.narrative}`).join(" ");
  assert.match(narrative, /human|человек/i);
  assert.match(narrative, /complaint/i);
  assert.match(narrative, /review/i);
  assert.ok(case6ProcessGraph.agentExecutions.every((item) => item.input && item.action && item.output && item.handoff && item.datasetImpact?.length));
  assert.ok(case6ProcessGraph.processAgentExecutions.every((item) => item.input && item.output && item.handoff && item.datasetImpact?.length));
});

test("projects Case 6 into module, comparison and Cases × Agents matrix", async () => {
  const [{ caseComparisonRegistry }, { readFile }] = await Promise.all([
    load("app/case-simulation/case-comparison-data.ts"),
    import("node:fs/promises"),
  ]);
  const projectRoot = new URL("../", import.meta.url);
  const [page, module] = await Promise.all([
    readFile(new URL("app/case-simulation/page.tsx", projectRoot), "utf8"),
    readFile(new URL("app/case-simulation/case-6-module.tsx", projectRoot), "utf8"),
  ]);
  assert.deepEqual(caseComparisonRegistry.slice(0, 7).map((item) => item.caseNumber), [1, 2, 3, 4, 5, 6, 7]);
  assert.match(page, /Case6Module/);
  assert.match(page, /case6EngagementByAgentId/);
  assert.match(module, /CASE 6 · CONSOLIDATED AUDIT/);
});
