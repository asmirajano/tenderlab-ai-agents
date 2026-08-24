import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("classifies every Agent deliverable and validates typed Dataset contributions", async () => {
  const moduleUrl = pathToFileURL(path.join(projectRoot, "packages", "catalog-data", "src", "agent-dataset-relations.ts")).href;
  const registry = await import(moduleUrl);
  const result = registry.validateAgentDatasetRelationships();
  assert.deepEqual(result, {
    agents: 64,
    deliverables: 64,
    datasetContributions: 93,
    datasetGaps: 2,
    datasetGapFindings: 21,
    nonDatasetDeliverables: 8,
  });
  assert.equal(new Set(registry.agentDeliverables.map((item) => item.agentId)).size, 64);
  assert.ok(registry.agentDatasetContributions.every((item) => item.status === "proposed"));
  assert.ok(registry.agentDatasetContributions.every((item) => item.provenanceRequirement));
  assert.equal(registry.agentDatasetImpacts.length, registry.agentDatasetContributions.length);
  assert.deepEqual(new Set(registry.agentDatasetImpacts.map((item) => item.operation)), new Set(["CREATE", "UPDATE", "ENRICH"]));
});

test("projects Dataset impact without duplicating Dataset metadata", async () => {
  const moduleUrl = pathToFileURL(path.join(projectRoot, "packages", "catalog-data", "src", "agent-dataset-relations.ts")).href;
  const registry = await import(moduleUrl);
  const sourceAgentImpacts = registry.datasetImpactsForAgent("agent:TL-A013");
  assert.equal(sourceAgentImpacts.length, 3);
  assert.deepEqual(sourceAgentImpacts.map((item) => item.operation), ["CREATE", "UPDATE", "ENRICH"]);
  assert.ok(sourceAgentImpacts.every((item) => !Object.hasOwn(item, "datasetName") && !Object.hasOwn(item, "datasetSlug")));
  assert.ok(registry.agentsImpactingDataset("dataset:TEA-DS-TENDER-NOTICES").some((item) => item.agentId === "agent:TL-A013"));
});

test("resolves company discovery to the canonical Company × Tender assessment Dataset", async () => {
  const moduleUrl = pathToFileURL(path.join(projectRoot, "packages", "catalog-data", "src", "agent-dataset-relations.ts")).href;
  const registry = await import(moduleUrl);
  const discoveryId = "agent:TL-A014";
  const contributions = registry.datasetContributionsForAgent(discoveryId);
  assert.equal(contributions.length, 1);
  assert.equal(contributions[0]?.datasetId, "dataset:TEA-DS-COMPANY-TENDER-OPPORTUNITY-ASSESSMENTS");
  assert.equal(registry.datasetGapsForAgent(discoveryId).length, 0);
  assert.equal(registry.agentDatasetGapFindings.find((item) => item.agentId === discoveryId)?.status, "resolved");
});

test("builds stable cross-app Dataset profile links from Dataset slugs", async () => {
  const moduleUrl = pathToFileURL(path.join(projectRoot, "packages", "catalog-data", "src", "agent-dataset-relations.ts")).href;
  const registry = await import(moduleUrl);
  assert.equal(
    registry.tenderEcosystemDatasetUrl("dataset:TEA-DS-TENDER-NOTICES"),
    "https://tender-ecosystem-atlas.web.app/data?dataset=tender-notices",
  );
});

test("preserves resolved, rejected, and unresolved Dataset Gap audit findings", async () => {
  const moduleUrl = pathToFileURL(path.join(projectRoot, "packages", "catalog-data", "src", "agent-dataset-relations.ts")).href;
  const registry = await import(moduleUrl);
  assert.equal(registry.agentDatasetGapFindings.length, 21);
  assert.deepEqual(registry.agentDatasetGaps.map((item) => item.agentId).sort(), ["agent:TL-A034", "agent:TL-A057"]);
  assert.equal(registry.agentDatasetGapFindings.find((item) => item.agentId === "agent:TL-A039")?.status, "rejected");
  assert.equal(
    registry.datasetContributionsForAgent("agent:TL-A039")[0]?.datasetId,
    "dataset:TEA-DS-BIDS",
  );
});

test("resolves all 93 relationships through the canonical Dataset registry without duplicated Dataset metadata", async () => {
  const [relationsModule, datasetsModule] = await Promise.all([
    import(pathToFileURL(path.join(projectRoot, "packages", "catalog-data", "src", "agent-dataset-relations.ts")).href),
    import(pathToFileURL(path.join(projectRoot, "packages", "catalog-data", "src", "datasets.ts")).href),
  ]);
  const datasetIds = new Set(datasetsModule.tenderDatasets.map((item) => item.id));
  assert.equal(relationsModule.agentDatasetContributions.length, 93);
  for (const relation of relationsModule.agentDatasetContributions) {
    assert.ok(datasetIds.has(relation.datasetId), `${relation.id} must resolve to the canonical Dataset registry`);
    assert.match(relationsModule.tenderEcosystemDatasetUrl(relation.datasetId), /^https:\/\/tender-ecosystem-atlas\.web\.app\/data\?dataset=.+/);
    assert.equal(Object.hasOwn(relation, "datasetName"), false, `${relation.id} must not duplicate the canonical Dataset name`);
    assert.equal(Object.hasOwn(relation, "datasetSlug"), false, `${relation.id} must not duplicate the canonical Dataset slug`);
  }
});
