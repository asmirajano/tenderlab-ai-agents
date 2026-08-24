import assert from "node:assert/strict";
import test from "node:test";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { readFile } from "node:fs/promises";

const projectRoot = process.cwd();
const load = (relativePath) => import(pathToFileURL(path.join(projectRoot, relativePath)).href);

test("models Case 5 as a full performance-based non-consulting services framework", async () => {
  const [{ case5, case5Engagements }, { case5ProcessGraph }] = await Promise.all([
    load("app/case-simulation/case-5-data.ts"),
    load("app/case-simulation/case-5-graph.ts"),
  ]);

  assert.equal(case5.tenderType, "Неконсультационные услуги");
  assert.match(case5.procurementMethod, /performance-based framework/i);
  assert.match(case5.endpoint, /payment certificate/);
  assert.equal(case5Engagements.length, 64);
  assert.equal(new Set(case5Engagements.map((item) => item.agentId)).size, 64);
  assert.equal(case5ProcessGraph.activities.length, 20);
  assert.equal(case5ProcessGraph.processes.length, 7);
  assert.equal(case5ProcessGraph.eventAudits.length, 20);
  assert.ok(case5ProcessGraph.agentExecutions.every((item) => item.input && item.output && item.handoff && item.datasetImpact?.length));
  assert.ok(case5ProcessGraph.processAgentExecutions.every((item) => item.input && item.output && item.handoff && item.datasetImpact?.length));
  assert.ok(case5ProcessGraph.auditSummary.unresolvedFindings.length >= 5);
});

test("preserves framework, call-off and Actor-authority boundaries", async () => {
  const [{ case5Engagements }, { case5EventBlueprints }] = await Promise.all([
    load("app/case-simulation/case-5-data.ts"),
    load("app/case-simulation/case-5-orchestration.ts"),
  ]);
  const byAgent = new Map(case5Engagements.map((item) => [item.agentId, item]));
  assert.equal(byAgent.get(41)?.status, "not-involved");
  assert.equal(byAgent.get(50)?.status, "not-involved");
  for (const agentId of [22, 29, 59]) assert.equal(byAgent.get(agentId)?.activation, "triggered");
  for (const agentId of [11, 42, 43, 44, 45, 46, 62, 63, 64]) assert.notEqual(byAgent.get(agentId)?.status, "not-involved");
  assert.match(case5EventBlueprints.find((item) => item.step === 17)?.scopeBoundary ?? "", /Framework award ≠ guaranteed revenue/);
  assert.match(case5EventBlueprints.find((item) => item.step === 18)?.scopeBoundary ?? "", /external Buyer action/);
  assert.match(case5EventBlueprints.find((item) => item.step === 20)?.scopeBoundary ?? "", /Buyer owns acceptance/);
});

test("derives all participating Agents from Event or Process work nodes", async () => {
  const [{ case5Engagements }, { case5ProcessGraph }] = await Promise.all([
    load("app/case-simulation/case-5-data.ts"),
    load("app/case-simulation/case-5-graph.ts"),
  ]);
  const evidenced = new Set([
    ...case5ProcessGraph.agentExecutions.map((item) => item.agentId),
    ...case5ProcessGraph.processAgentExecutions.map((item) => item.agentId),
  ]);
  for (const engagement of case5Engagements) {
    if (engagement.status !== "not-involved") assert.ok(evidenced.has(engagement.agentId), `Agent ${engagement.agentId} lacks Case 5 execution evidence`);
  }
});

test("projects Case 5 into module, comparison, matrix and Agent Detail context", async () => {
  const [{ caseComparisonRegistry }, page, moduleSource, css] = await Promise.all([
    load("app/case-simulation/case-comparison-data.ts"),
    readFile(path.join(projectRoot, "app", "case-simulation", "page.tsx"), "utf8"),
    readFile(path.join(projectRoot, "app", "case-simulation", "case-5-module.tsx"), "utf8"),
    readFile(path.join(projectRoot, "app", "case-simulation", "case-simulation.css"), "utf8"),
  ]);
  assert.deepEqual(caseComparisonRegistry.map((item) => item.caseNumber), [1, 2, 3, 4, 5, 6, 7]);
  assert.match(page, /<Case5Module/);
  assert.match(page, /case-five-column/);
  assert.match(page, /case5EngagementByAgentId/);
  assert.match(page, /Cases 1–\d+ активны/);
  assert.match(moduleSource, /CaseOrchestrationMap/);
  assert.match(moduleSource, /Хронология событий — Case 5/);
  assert.match(moduleSource, /POTENTIAL GAPS \/ REVIEW/);
  assert.match(css, /\.case-five-module/);
});
