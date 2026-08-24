import assert from "node:assert/strict";
import test from "node:test";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { readFile } from "node:fs/promises";

const projectRoot = process.cwd();
const load = (relativePath) => import(pathToFileURL(path.join(projectRoot, relativePath)).href);

test("models Case 8 as a PPP competitive-dialogue route through financial close", async () => {
  const [{ case8, case8Engagements }, { case8ProcessGraph }] = await Promise.all([
    load("app/case-simulation/case-8-data.ts"),
    load("app/case-simulation/case-8-graph.ts"),
  ]);

  assert.match(case8.tenderType, /PPP|концессия/i);
  assert.match(case8.procurementMethod, /competitive dialogue/i);
  assert.match(case8.endpoint, /financial close/i);
  assert.match(case8.consultantIncome, /\$580 000/);
  assert.equal(case8Engagements.length, 64);
  assert.equal(new Set(case8Engagements.map((item) => item.agentId)).size, 64);
  assert.equal(case8ProcessGraph.activities.length, 22);
  assert.equal(case8ProcessGraph.processes.length, 8);
  assert.equal(case8ProcessGraph.eventAudits.length, 22);
  assert.ok(case8ProcessGraph.agentExecutions.every((item) => item.input && item.output && item.handoff && item.datasetImpact?.length));
  assert.ok(case8ProcessGraph.processAgentExecutions.every((item) => item.input && item.output && item.handoff && item.datasetImpact?.length));
  assert.ok(case8ProcessGraph.auditSummary.unresolvedFindings.length >= 6);
});

test("preserves consortium, lender and post-NTP authority boundaries", async () => {
  const [{ case8Engagements }, { case8EventBlueprints }] = await Promise.all([
    load("app/case-simulation/case-8-data.ts"),
    load("app/case-simulation/case-8-orchestration.ts"),
  ]);
  const byAgent = new Map(case8Engagements.map((item) => [item.agentId, item]));
  for (const agentId of [22, 29, 59]) assert.equal(byAgent.get(agentId)?.activation, "triggered");
  for (const agentId of [12, 40, 41, 42, 43, 44, 45, 46, 60, 61]) assert.notEqual(byAgent.get(agentId)?.status, "not-involved");
  assert.equal(byAgent.get(62)?.status, "not-involved");
  assert.equal(byAgent.get(63)?.status, "not-involved");
  assert.match(case8EventBlueprints.find((item) => item.step === 6)?.scopeBoundary ?? "", /members.*consent|consent.*members/i);
  assert.match(case8EventBlueprints.find((item) => item.step === 12)?.scopeBoundary ?? "", /lenders alone approve debt/i);
  assert.match(case8EventBlueprints.find((item) => item.step === 22)?.scopeBoundary ?? "", /external Actor states/i);
});

test("derives every participating Case 8 Agent from an Event or Process node", async () => {
  const [{ case8Engagements }, { case8ProcessGraph }] = await Promise.all([
    load("app/case-simulation/case-8-data.ts"),
    load("app/case-simulation/case-8-graph.ts"),
  ]);
  const evidenced = new Set([
    ...case8ProcessGraph.agentExecutions.map((item) => item.agentId),
    ...case8ProcessGraph.processAgentExecutions.map((item) => item.agentId),
  ]);
  for (const engagement of case8Engagements) {
    if (engagement.status !== "not-involved") assert.ok(evidenced.has(engagement.agentId), `Agent ${engagement.agentId} lacks Case 8 execution evidence`);
  }
});

test("projects Case 8 into module, comparison, matrix and contextual Agent Detail", async () => {
  const [{ caseComparisonRegistry }, moduleSource, page, css] = await Promise.all([
    load("app/case-simulation/case-comparison-data.ts"),
    readFile(path.join(projectRoot, "app", "case-simulation", "case-8-module.tsx"), "utf8"),
    readFile(path.join(projectRoot, "app", "case-simulation", "page.tsx"), "utf8"),
    readFile(path.join(projectRoot, "app", "case-simulation", "case-simulation.css"), "utf8"),
  ]);
  assert.deepEqual(caseComparisonRegistry.slice(0, 8).map((item) => item.caseNumber), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.match(moduleSource, /CaseOrchestrationMap/);
  assert.match(moduleSource, /Хронология событий — Case 8/);
  assert.match(moduleSource, /CONSULTANT MONETIZATION · DEMO/);
  assert.match(moduleSource, /POTENTIAL GAPS \/ REVIEW/);
  assert.match(moduleSource, /onOpenAgent\(agent\.id, event\.eventStep\)/);
  assert.match(page, /<Case8Module/);
  assert.match(page, /case-eight-column/);
  assert.match(page, /case8EngagementByAgentId/);
  assert.match(page, /Cases 1–\d+ активны/);
  assert.match(css, /\.case-eight-module/);
});
