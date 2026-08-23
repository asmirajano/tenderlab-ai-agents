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
    datasetContributions: 74,
    datasetGaps: 21,
    nonDatasetDeliverables: 25,
  });
  assert.equal(new Set(registry.agentDeliverables.map((item) => item.agentId)).size, 64);
  assert.ok(registry.agentDatasetContributions.every((item) => item.status === "proposed"));
  assert.ok(registry.agentDatasetContributions.every((item) => item.provenanceRequirement));
});

test("does not confuse company discovery with procurement evaluation shortlists", async () => {
  const moduleUrl = pathToFileURL(path.join(projectRoot, "packages", "catalog-data", "src", "agent-dataset-relations.ts")).href;
  const registry = await import(moduleUrl);
  const discoveryId = "agent:TL-A014";
  assert.equal(registry.datasetContributionsForAgent(discoveryId).length, 0);
  assert.equal(registry.datasetGapsForAgent(discoveryId)[0]?.proposedName, "Company × Tender Discovery Results");
});

test("builds stable cross-app Dataset profile links from Dataset slugs", async () => {
  const moduleUrl = pathToFileURL(path.join(projectRoot, "packages", "catalog-data", "src", "agent-dataset-relations.ts")).href;
  const registry = await import(moduleUrl);
  assert.equal(
    registry.tenderEcosystemDatasetUrl("dataset:TEA-DS-TENDER-NOTICES"),
    "https://tender-ecosystem-atlas.web.app/data?dataset=tender-notices",
  );
});

test("resolves all 74 relationships through the canonical Dataset registry without duplicated Dataset metadata", async () => {
  const [relationsModule, datasetsModule] = await Promise.all([
    import(pathToFileURL(path.join(projectRoot, "packages", "catalog-data", "src", "agent-dataset-relations.ts")).href),
    import(pathToFileURL(path.join(projectRoot, "packages", "catalog-data", "src", "datasets.ts")).href),
  ]);
  const datasetIds = new Set(datasetsModule.tenderDatasets.map((item) => item.id));
  assert.equal(relationsModule.agentDatasetContributions.length, 74);
  for (const relation of relationsModule.agentDatasetContributions) {
    assert.ok(datasetIds.has(relation.datasetId), `${relation.id} must resolve to the canonical Dataset registry`);
    assert.match(relationsModule.tenderEcosystemDatasetUrl(relation.datasetId), /^https:\/\/tender-ecosystem-atlas\.web\.app\/data\?dataset=.+/);
    assert.equal(Object.hasOwn(relation, "datasetName"), false, `${relation.id} must not duplicate the canonical Dataset name`);
    assert.equal(Object.hasOwn(relation, "datasetSlug"), false, `${relation.id} must not duplicate the canonical Dataset slug`);
  }
});
