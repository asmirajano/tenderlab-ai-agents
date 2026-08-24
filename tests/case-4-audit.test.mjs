import assert from "node:assert/strict";
import test from "node:test";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { readFile } from "node:fs/promises";

const projectRoot = process.cwd();
const load = (relativePath) => import(pathToFileURL(path.join(projectRoot, relativePath)).href);

test("models Case 4 as a complete QCBS consultancy route without changing the Agent registry", async () => {
  const [{ case4, case4Engagements }, { case4ProcessGraph }] = await Promise.all([
    load("app/case-simulation/case-4-data.ts"),
    load("app/case-simulation/case-4-graph.ts"),
  ]);

  assert.equal(case4.tenderType, "Консультационные услуги");
  assert.match(case4.procurementMethod, /QCBS/);
  assert.equal(case4Engagements.length, 64);
  assert.equal(new Set(case4Engagements.map((item) => item.agentId)).size, 64);
  assert.equal(case4ProcessGraph.activities.length, 15);
  assert.equal(case4ProcessGraph.processes.length, 6);
  assert.equal(case4ProcessGraph.eventAudits.length, 15);
  assert.ok(case4ProcessGraph.agentExecutions.every((item) => item.input && item.output && item.handoff && item.datasetImpact?.length));
  assert.ok(case4ProcessGraph.processAgentExecutions.every((item) => item.input && item.output && item.handoff && item.datasetImpact?.length));
  assert.ok(case4ProcessGraph.auditSummary.unresolvedFindings.length >= 4);
});

test("preserves QCBS authority, two-envelope control and honest non-participation", async () => {
  const [{ case4Engagements }, { case4EventBlueprints }] = await Promise.all([
    load("app/case-simulation/case-4-data.ts"),
    load("app/case-simulation/case-4-orchestration.ts"),
  ]);
  const byAgent = new Map(case4Engagements.map((item) => [item.agentId, item]));
  for (const agentId of [43, 44, 45, 46, 50, 62]) assert.equal(byAgent.get(agentId)?.status, "not-involved");
  assert.equal(byAgent.get(22)?.activation, "triggered");
  assert.equal(byAgent.get(29)?.activation, "triggered");
  assert.equal(byAgent.get(42)?.activation, "standby");
  assert.match(case4EventBlueprints.find((item) => item.step === 6)?.scopeBoundary ?? "", /Buyer/);
  assert.match(case4EventBlueprints.find((item) => item.step === 13)?.narrative ?? "", /independently sealed packages/i);
  assert.match(case4EventBlueprints.find((item) => item.step === 14)?.narrative ?? "", /threshold 75/);
});

test("projects Case 4 into the Case module, comparison registry and Cases × Agents matrix", async () => {
  const [{ caseComparisonRegistry }, page, moduleSource] = await Promise.all([
    load("app/case-simulation/case-comparison-data.ts"),
    readFile(path.join(projectRoot, "app", "case-simulation", "page.tsx"), "utf8"),
    readFile(path.join(projectRoot, "app", "case-simulation", "case-4-module.tsx"), "utf8"),
  ]);
  assert.deepEqual(caseComparisonRegistry.map((item) => item.caseNumber), [1, 2, 3, 4]);
  assert.match(page, /<Case4Module/);
  assert.match(page, /case-four-column/);
  assert.match(page, /Cases 1–4 активны/);
  assert.match(moduleSource, /CaseOrchestrationMap/);
  assert.match(moduleSource, /Хронология событий — Case 4/);
  assert.match(moduleSource, /POTENTIAL GAPS \/ REVIEW/);
});
