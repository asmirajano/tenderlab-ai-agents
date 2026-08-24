import assert from "node:assert/strict";
import test from "node:test";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { readFile } from "node:fs/promises";

const projectRoot = process.cwd();
const load = (relativePath) => import(pathToFileURL(path.join(projectRoot, relativePath)).href);

test("models Case 9 as a post-award FIDIC claim through DAB, Variation and payment", async () => {
  const [{ case9, case9Engagements }, { case9ProcessGraph }] = await Promise.all([
    load("app/case-simulation/case-9-data.ts"),
    load("app/case-simulation/case-9-graph.ts"),
  ]);

  assert.match(case9.tenderType, /post-award contract administration/i);
  assert.match(case9.procurementMethod, /FIDIC Yellow Book/i);
  assert.match(case9.endpoint, /Variation Order.*paid|paid.*Variation Order/i);
  assert.match(case9.consultantIncome, /\$145 000/);
  assert.equal(case9Engagements.length, 64);
  assert.equal(new Set(case9Engagements.map((item) => item.agentId)).size, 64);
  const counts = Object.fromEntries(["required", "conditional", "background", "not-involved"].map((status) => [status, case9Engagements.filter((item) => item.status === status).length]));
  assert.deepEqual(counts, { required: 14, conditional: 2, background: 2, "not-involved": 46 });
  assert.equal(case9ProcessGraph.activities.length, 19);
  assert.equal(case9ProcessGraph.processes.length, 8);
  assert.equal(case9ProcessGraph.eventAudits.length, 19);
  assert.ok(case9ProcessGraph.agentExecutions.every((item) => item.input && item.action && item.output && item.handoff && item.datasetImpact?.length));
  assert.ok(case9ProcessGraph.processAgentExecutions.every((item) => item.input && item.output && item.handoff && item.datasetImpact?.length));
});

test("keeps pre-award Agents out and exercises post-award change, quantum, hearing and control roles", async () => {
  const { case9Engagements } = await load("app/case-simulation/case-9-data.ts");
  const byAgent = new Map(case9Engagements.map((item) => [item.agentId, item]));
  for (const agentId of [14, 15, 16, 35, 36, 53, 58, 59, 61]) assert.equal(byAgent.get(agentId)?.status, "not-involved");
  for (const agentId of [29, 38, 39, 50, 57, 60, 62, 63, 64]) assert.notEqual(byAgent.get(agentId)?.status, "not-involved");
  assert.equal(byAgent.get(22)?.activation, "standby");
  assert.equal(byAgent.get(46)?.activation, "triggered");
});

test("preserves Contractor, Engineer, Employer and DAB authority boundaries", async () => {
  const [{ case9EventBlueprints }, { case9ProcessGraph }] = await Promise.all([
    load("app/case-simulation/case-9-orchestration.ts"),
    load("app/case-simulation/case-9-graph.ts"),
  ]);
  assert.match(case9EventBlueprints.find((item) => item.step === 9)?.scopeBoundary ?? "", /Only Contractor authority/i);
  assert.match(case9EventBlueprints.find((item) => item.step === 13)?.scopeBoundary ?? "", /Engineer/i);
  assert.match(case9EventBlueprints.find((item) => item.step === 16)?.scopeBoundary ?? "", /DAB/i);
  assert.match(case9EventBlueprints.find((item) => item.step === 17)?.scopeBoundary ?? "", /Authorised parties.*Engineer/i);
  assert.ok(case9ProcessGraph.auditSummary.unresolvedFindings.some((item) => /Schedule \/ Delay Analysis Agent/i.test(item)));
  assert.ok(case9ProcessGraph.auditSummary.unresolvedFindings.some((item) => /Contract Claims/i.test(item)));
});

test("derives every participating Case 9 Agent from an Event or Process work node", async () => {
  const [{ case9Engagements }, { case9ProcessGraph }] = await Promise.all([
    load("app/case-simulation/case-9-data.ts"),
    load("app/case-simulation/case-9-graph.ts"),
  ]);
  const evidenced = new Set([
    ...case9ProcessGraph.agentExecutions.map((item) => item.agentId),
    ...case9ProcessGraph.processAgentExecutions.map((item) => item.agentId),
  ]);
  for (const engagement of case9Engagements) {
    if (engagement.status !== "not-involved") assert.ok(evidenced.has(engagement.agentId), `Agent ${engagement.agentId} lacks Case 9 execution evidence`);
  }
});

test("projects Case 9 into module, comparison, matrix and contextual Agent Detail", async () => {
  const [{ caseComparisonRegistry }, moduleSource, page, css] = await Promise.all([
    load("app/case-simulation/case-comparison-data.ts"),
    readFile(path.join(projectRoot, "app", "case-simulation", "case-9-module.tsx"), "utf8"),
    readFile(path.join(projectRoot, "app", "case-simulation", "page.tsx"), "utf8"),
    readFile(path.join(projectRoot, "app", "case-simulation", "case-simulation.css"), "utf8"),
  ]);
  assert.ok(caseComparisonRegistry.some((item) => item.caseNumber === 9));
  assert.match(moduleSource, /CaseOrchestrationMap/);
  assert.match(moduleSource, /Хронология событий — Case 9/);
  assert.match(moduleSource, /CONSULTANT MONETIZATION · DEMO/);
  assert.match(moduleSource, /POTENTIAL GAPS \/ REVIEW/);
  assert.match(moduleSource, /onOpenAgent\(agent\.id, event\.eventStep\)/);
  assert.match(page, /<Case9Module/);
  assert.match(page, /case-nine-column/);
  assert.match(page, /case9EngagementByAgentId/);
  assert.match(css, /\.case-nine-module/);
});
