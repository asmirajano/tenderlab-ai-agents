import assert from "node:assert/strict";
import test from "node:test";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { readFile } from "node:fs/promises";

const projectRoot = process.cwd();
const load = (relativePath) => import(pathToFileURL(path.join(projectRoot, relativePath)).href);

test("models Case 10 as a security-sensitive integrity No-Bid followed by official cancellation", async () => {
  const [{ case10, case10Engagements }, { case10ProcessGraph }] = await Promise.all([
    load("app/case-simulation/case-10-data.ts"),
    load("app/case-simulation/case-10-graph.ts"),
  ]);

  assert.match(case10.tenderType, /cybersecurity/i);
  assert.match(case10.endpoint, /No-Bid.*zero bid files transmitted/i);
  assert.match(case10.endpoint, /official cancellation/i);
  assert.match(case10.consultantIncome, /€165 000/);
  assert.equal(case10Engagements.length, 64);
  assert.equal(new Set(case10Engagements.map((item) => item.agentId)).size, 64);
  const counts = Object.fromEntries(["required", "conditional", "background", "not-involved"].map((status) => [status, case10Engagements.filter((item) => item.status === status).length]));
  assert.deepEqual(counts, { required: 44, conditional: 2, background: 0, "not-involved": 18 });
  assert.equal(case10ProcessGraph.activities.length, 19);
  assert.equal(case10ProcessGraph.processes.length, 8);
  assert.equal(case10ProcessGraph.eventAudits.length, 19);
  assert.ok(case10ProcessGraph.agentExecutions.every((item) => item.input && item.action && item.output && item.handoff && item.datasetImpact?.length));
  assert.ok(case10ProcessGraph.processAgentExecutions.every((item) => item.input && item.output && item.handoff && item.datasetImpact?.length));
});

test("makes Award Intelligence and OCR/Translation required while preserving the stopped bid branch", async () => {
  const { case10Engagements } = await load("app/case-simulation/case-10-data.ts");
  const byAgent = new Map(case10Engagements.map((item) => [item.agentId, item]));
  for (const agentId of [19, 22]) assert.equal(byAgent.get(agentId)?.status, "required");
  assert.equal(byAgent.get(29)?.status, "conditional");
  assert.equal(byAgent.get(29)?.activation, "triggered");
  assert.equal(byAgent.get(41)?.status, "conditional");
  assert.equal(byAgent.get(41)?.activation, "standby");
  for (const agentId of [47, 51, 53, 54, 56, 58, 59, 60, 61, 62, 63]) assert.equal(byAgent.get(agentId)?.status, "not-involved");
});

test("preserves consent, Buyer, Board and external-investigator authority boundaries", async () => {
  const [{ case10EventBlueprints }, { case10ProcessGraph }] = await Promise.all([
    load("app/case-simulation/case-10-orchestration.ts"),
    load("app/case-simulation/case-10-graph.ts"),
  ]);
  assert.match(case10EventBlueprints.find((item) => item.step === 10)?.scopeBoundary ?? "", /consent/i);
  assert.match(case10EventBlueprints.find((item) => item.step === 14)?.scopeBoundary ?? "", /Buyer/i);
  assert.match(case10EventBlueprints.find((item) => item.step === 16)?.scopeBoundary ?? "", /Board/i);
  assert.match(case10EventBlueprints.find((item) => item.step === 18)?.scopeBoundary ?? "", /external|financier/i);
  assert.ok(case10ProcessGraph.auditSummary.unresolvedFindings.some((item) => /Beneficial Ownership/i.test(item)));
  assert.ok(case10ProcessGraph.auditSummary.unresolvedFindings.some((item) => /Cybersecurity/i.test(item)));
  assert.ok(case10ProcessGraph.auditSummary.unresolvedFindings.some((item) => /Privacy/i.test(item)));
});

test("derives every participating Case 10 Agent from an Event or Process work node", async () => {
  const [{ case10Engagements }, { case10ProcessGraph }] = await Promise.all([
    load("app/case-simulation/case-10-data.ts"),
    load("app/case-simulation/case-10-graph.ts"),
  ]);
  const evidenced = new Set([
    ...case10ProcessGraph.agentExecutions.map((item) => item.agentId),
    ...case10ProcessGraph.processAgentExecutions.map((item) => item.agentId),
  ]);
  for (const engagement of case10Engagements) {
    if (engagement.status !== "not-involved") assert.ok(evidenced.has(engagement.agentId), `Agent ${engagement.agentId} lacks Case 10 execution evidence`);
  }
});

test("projects Case 10 into module, comparison, matrix, cumulative conclusion and contextual Agent Detail", async () => {
  const [{ caseComparisonRegistry }, { cumulativeValidation }, moduleSource, page, css] = await Promise.all([
    load("app/case-simulation/case-comparison-data.ts"),
    load("app/case-simulation/case-program-conclusion-data.ts"),
    readFile(path.join(projectRoot, "app", "case-simulation", "case-10-module.tsx"), "utf8"),
    readFile(path.join(projectRoot, "app", "case-simulation", "page.tsx"), "utf8"),
    readFile(path.join(projectRoot, "app", "case-simulation", "case-simulation.css"), "utf8"),
  ]);
  assert.equal(caseComparisonRegistry.length, 10);
  assert.ok(caseComparisonRegistry.some((item) => item.caseNumber === 10));
  assert.equal(cumulativeValidation.requiredAtLeastOnce.length, 64);
  assert.equal(cumulativeValidation.neverRequired.length, 0);
  assert.match(moduleSource, /CaseOrchestrationMap/);
  assert.match(moduleSource, /Хронология событий — Case 10/);
  assert.match(moduleSource, /MONETIZATION/);
  assert.match(moduleSource, /onOpenAgent\(agent\.id, event\.eventStep\)/);
  assert.match(page, /<Case10Module/);
  assert.match(page, /<CaseProgramConclusion/);
  assert.match(page, /case-ten-column/);
  assert.match(page, /case10EngagementByAgentId/);
  assert.doesNotMatch(page, /futureCases/);
  assert.match(css, /\.case-ten-module/);
  assert.match(css, /\.case-ten-column/);
});
