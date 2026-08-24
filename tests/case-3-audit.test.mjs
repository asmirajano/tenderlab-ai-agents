import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import path from "node:path";
import { pathToFileURL } from "node:url";

const projectRoot = path.resolve(import.meta.dirname, "..");
const dataModule = await import(pathToFileURL(path.join(projectRoot, "app", "case-simulation", "case-3-data.ts")).href);
const graphModule = await import(pathToFileURL(path.join(projectRoot, "app", "case-simulation", "case-3-graph.ts")).href);
const comparisonModule = await import(pathToFileURL(path.join(projectRoot, "app", "case-simulation", "case-comparison-data.ts")).href);

const { case3, case3Engagements } = dataModule;
const { case3ProcessGraph } = graphModule;
const { caseComparisonRegistry } = comparisonModule;

test("models the approved Case 3 without changing the 64-Agent registry", () => {
  assert.equal(case3.name, "Консорциум по строительству водоочистной станции");
  assert.equal(case3.budget, "$48,00 млн");
  assert.equal(case3.tenderType, "Работы");
  assert.equal(case3Engagements.length, 64);
  assert.equal(new Set(case3Engagements.map((item) => item.agentId)).size, 64);

  const counts = Object.groupBy(case3Engagements, (item) => item.status);
  assert.equal(counts.required?.length, 49);
  assert.equal(counts.background?.length, 13);
  assert.equal(counts.conditional?.length, 1);
  assert.equal(counts["not-involved"]?.length, 1);
  assert.equal(case3Engagements.find((item) => item.agentId === 30)?.activation, "triggered");
  assert.equal(case3Engagements.find((item) => item.agentId === 42)?.status, "not-involved");
});

test("keeps Case 3 Events, Processes, waits, branches and convergence explicit", () => {
  assert.equal(case3ProcessGraph.activities.length, 22);
  assert.equal(case3ProcessGraph.processes.length, 9);
  assert.equal(new Set(case3ProcessGraph.activities.map((item) => item.id)).size, 22);

  const consentWait = case3ProcessGraph.activities.find((item) => item.eventStep === 8);
  assert.equal(consentWait?.kind, "wait");
  assert.deepEqual(consentWait?.agentNames, []);

  const retry = case3ProcessGraph.relationships.find((item) => item.from === "case3-activity-08" && item.to === "case3-activity-07");
  assert.equal(retry?.type, "retry");

  const joins = case3ProcessGraph.relationships.filter((item) => item.to === "case3-activity-18" && item.type === "joins-at");
  assert.deepEqual(new Set(joins.map((item) => item.from)), new Set(["case3-activity-16", "case3-activity-17"]));
  assert.ok(joins.every((item) => item.joinPolicy === "ALL" && item.blocking));
});

test("proves every Case 3 Agent execution and Process handoff", () => {
  assert.equal(case3ProcessGraph.eventAudits.length, 22);
  assert.ok(case3ProcessGraph.agentExecutions.length > 0);
  assert.ok(case3ProcessGraph.processAgentExecutions.length > 0);
  assert.ok(case3ProcessGraph.agentExecutions.every((item) => item.input && item.action && item.output && item.handoff && item.evidence.length && item.datasetImpact?.length));
  assert.ok(case3ProcessGraph.processAgentExecutions.every((item) => item.input && item.output && item.handoff && item.datasetImpact?.length));

  const participatingAgentIds = new Set([
    ...case3ProcessGraph.agentExecutions.map((item) => item.agentId),
    ...case3ProcessGraph.processAgentExecutions.map((item) => item.agentId),
  ]);
  const expectedAgentIds = case3Engagements.filter((item) => item.status !== "not-involved").map((item) => item.agentId);
  assert.equal(participatingAgentIds.size, 63);
  assert.deepEqual(expectedAgentIds.filter((id) => !participatingAgentIds.has(id)), []);

  const clarification = case3ProcessGraph.agentExecutions.find((item) => item.eventStep === 14 && item.agentId === 30);
  assert.equal(clarification?.necessity, "conditional");
  assert.equal(clarification?.activation, "triggered");
  assert.ok(clarification?.condition);

  const nodeIds = new Set([
    ...case3ProcessGraph.activities.map((item) => item.id),
    ...case3ProcessGraph.processes.map((item) => item.id),
  ]);
  assert.ok(case3ProcessGraph.processes.every((process) => process.consumerRefs.every((ref) => nodeIds.has(ref))));
});

test("records Case 3 architecture findings without inventing or renumbering Agents", () => {
  const summary = case3ProcessGraph.auditSummary;
  assert.deepEqual(summary.proposedMissingAgentIds, []);
  assert.deepEqual(summary.unresolvedFindings, []);
  assert.ok(summary.removedAssignments.some((item) => item.agentId === 42));
  assert.ok(summary.overlapFindings.length >= 7);
  assert.match(case3.endpoint, /mobilization baseline/i);
  assert.match(case3.kpi, /3 verified members/);
});

test("projects Case 3 into the module, Case Comparison and Cases × Agents matrix", () => {
  const page = fs.readFileSync(path.join(projectRoot, "app", "case-simulation", "page.tsx"), "utf8");
  const comparison = caseComparisonRegistry.find((item) => item.caseNumber === 3);
  assert.ok(comparison);
  assert.equal(comparison.engagements.length, 64);
  assert.match(page, /<Case3Module/);
  assert.match(page, /className="case-three-column"/);
  assert.match(page, /case3EngagementByAgentId/);
});
