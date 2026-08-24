import assert from "node:assert/strict";
import test from "node:test";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { readFile } from "node:fs/promises";

const projectRoot = process.cwd();
const load = (relativePath) => import(pathToFileURL(path.join(projectRoot, relativePath)).href);

test("models Case 7 as Buyer-side emergency procurement recovery", async () => {
  const [{ case7, case7Engagements }, { case7ProcessGraph }] = await Promise.all([
    load("app/case-simulation/case-7-data.ts"),
    load("app/case-simulation/case-7-graph.ts"),
  ]);

  assert.match(case7.tenderType, /emergency replacement/i);
  assert.match(case7.procurementMethod, /limited international RFQ/i);
  assert.match(case7.consultantRole, /не расторгает контракт/);
  assert.match(case7.endpoint, /performance-security claim/);
  assert.equal(case7Engagements.length, 64);
  assert.equal(new Set(case7Engagements.map((item) => item.agentId)).size, 64);
  assert.equal(case7ProcessGraph.activities.length, 19);
  assert.equal(case7ProcessGraph.processes.length, 7);
  assert.equal(case7ProcessGraph.eventAudits.length, 19);
  assert.ok(case7ProcessGraph.agentExecutions.every((item) => item.input && item.action && item.output && item.handoff && item.datasetImpact?.length));
  assert.ok(case7ProcessGraph.processAgentExecutions.every((item) => item.input && item.output && item.handoff && item.datasetImpact?.length));
});

test("preserves Buyer, supplier, Consultant and external authority boundaries", async () => {
  const [{ case7Engagements }, { case7EventBlueprints }] = await Promise.all([
    load("app/case-simulation/case-7-data.ts"),
    load("app/case-simulation/case-7-orchestration.ts"),
  ]);
  const byAgent = new Map(case7Engagements.map((item) => [item.agentId, item]));
  for (const agentId of [6, 8, 14, 30, 35, 51, 53, 58, 59, 60]) assert.equal(byAgent.get(agentId)?.status, "not-involved");
  for (const agentId of [11, 43, 44, 45, 46, 47, 48, 49, 50, 57, 61, 62, 63, 64]) assert.notEqual(byAgent.get(agentId)?.status, "not-involved");
  assert.equal(byAgent.get(22)?.activation, "standby");
  assert.equal(byAgent.get(29)?.activation, "triggered");
  assert.match(case7EventBlueprints.find((item) => item.step === 9)?.scopeBoundary ?? "", /Agent 30 cannot be repurposed/);
  assert.match(case7EventBlueprints.find((item) => item.step === 11)?.scopeBoundary ?? "", /only human evaluators score/);
  assert.match(case7EventBlueprints.find((item) => item.step === 17)?.scopeBoundary ?? "", /Buyer committee alone accepts/);
});

test("models branching, convergence and an explicit open claim handoff", async () => {
  const { case7ProcessGraph } = await load("app/case-simulation/case-7-graph.ts");
  const edges = case7ProcessGraph.relationships;
  assert.ok(edges.some((edge) => edge.from === "case7-activity-02" && edge.to === "case7-activity-03" && edge.type === "branches-to"));
  assert.ok(edges.some((edge) => edge.from === "case7-activity-02" && edge.to === "case7-activity-04" && edge.type === "branches-to"));
  assert.ok(edges.some((edge) => edge.to === "case7-activity-05" && edge.type === "joins-at" && edge.joinPolicy === "ALL"));
  assert.ok(edges.some((edge) => edge.from === "case7-activity-12" && edge.to === "case7-activity-13" && edge.blocking === false));
  assert.equal(case7ProcessGraph.processes.find((process) => process.id === "C7-P02")?.state, "waiting");
  assert.match(case7ProcessGraph.activities.at(-1)?.next ?? "", /legal team continues the claim/);
});

test("derives every participating Agent from Event or Process work nodes", async () => {
  const [{ case7Engagements }, { case7ProcessGraph }] = await Promise.all([
    load("app/case-simulation/case-7-data.ts"),
    load("app/case-simulation/case-7-graph.ts"),
  ]);
  const evidenced = new Set([
    ...case7ProcessGraph.agentExecutions.map((item) => item.agentId),
    ...case7ProcessGraph.processAgentExecutions.map((item) => item.agentId),
  ]);
  for (const engagement of case7Engagements) {
    if (engagement.status !== "not-involved") assert.ok(evidenced.has(engagement.agentId), `Agent ${engagement.agentId} lacks Case 7 execution evidence`);
  }
});

test("Case 7 module exposes business contract, map, narrative and audit findings", async () => {
  const [{ caseComparisonRegistry }, page, moduleSource, css] = await Promise.all([
    load("app/case-simulation/case-comparison-data.ts"),
    readFile(path.join(projectRoot, "app", "case-simulation", "page.tsx"), "utf8"),
    readFile(path.join(projectRoot, "app", "case-simulation", "case-7-module.tsx"), "utf8"),
    readFile(path.join(projectRoot, "app", "case-simulation", "case-simulation.css"), "utf8"),
  ]);
  assert.deepEqual(caseComparisonRegistry.slice(0, 8).map((item) => item.caseNumber), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.match(page, /<Case7Module/);
  assert.match(page, /case-seven-column/);
  assert.match(page, /case7EngagementByAgentId/);
  assert.match(page, /Cases 1–\d+ активны/);
  assert.match(moduleSource, /STARTING CONDITION/);
  assert.match(moduleSource, /MONETIZATION \/ INCOME/);
  assert.match(moduleSource, /CaseOrchestrationMap/);
  assert.match(moduleSource, /Хронология событий — Case 7/);
  assert.match(moduleSource, /POTENTIAL GAPS \/ REVIEW/);
  assert.match(css, /\.case-seven-module/);
});
