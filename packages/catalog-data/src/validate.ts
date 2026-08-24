import { assertUniqueCatalogueRecords } from "../../catalog-schema/src";
import { actorTypes, tenderSides } from "./actors";
import { dataFamilies, dataSources, tenderDatasets } from "./datasets";
import { glossaryTerms } from "./glossary";
import { validateAgentDatasetRelationships } from "./agent-dataset-relations";
import { agentRelationships } from "./agent-relationships";
import { agentRevisions } from "./agent-revisions";
import { agentSpecifications } from "./agents";

export function validateAgentSpecifications() {
  if (agentSpecifications.length !== 64) throw new Error(`Expected 64 Agent Specifications, got ${agentSpecifications.length}`);
  if (new Set(agentSpecifications.map((agent) => agent.id)).size !== 64) throw new Error("Agent numeric IDs must be unique.");
  if (new Set(agentSpecifications.map((agent) => agent.registryId)).size !== 64) throw new Error("Agent registry IDs must be unique.");
  if (new Set(agentSpecifications.map((agent) => agent.slug)).size !== 64) throw new Error("Agent slugs must be unique.");
  for (const agent of agentSpecifications) {
    if (!agent.name || !agent.description || !agent.profile.simply || !agent.profile.responsibilityScope) throw new Error(`${agent.registryId} lost required migrated content.`);
    if (!agent.output.primary || !agent.output.artifacts.length) throw new Error(`${agent.registryId} needs a concrete output contract.`);
    if (!agent.governance.specificationVersion || !agent.governance.updatedAt) throw new Error(`${agent.registryId} needs governance metadata.`);
    if (!agent.example) throw new Error(`${agent.registryId} lost its canonical demo example.`);
  }
  const knownIds = new Set(agentSpecifications.map((agent) => agent.registryId));
  if (agentRelationships.some((relationship) => relationship.source.kind === "agent" && !knownIds.has(relationship.source.ref))) throw new Error("Agent relationship has an unknown source Agent.");
  if (agentRelationships.some((relationship) => relationship.target.kind === "agent" && !knownIds.has(relationship.target.ref))) throw new Error("Agent relationship has an unknown target Agent.");
  if (agentRelationships.some((relationship) => !relationship.family || !relationship.requirement || !relationship.evidence.length)) throw new Error("Agent relationship lost canonical family, requirement, or evidence semantics.");
  if (agentRevisions.some((revision) => !knownIds.has(revision.agentId))) throw new Error("Agent revision has an unknown Agent.");
  return { specifications: agentSpecifications.length, relationships: agentRelationships.length, revisions: agentRevisions.length };
}

export function validateEcosystemCatalogues() {
  assertUniqueCatalogueRecords(tenderSides, "Tender sides");
  assertUniqueCatalogueRecords(actorTypes, "Actor types");
  assertUniqueCatalogueRecords(dataFamilies, "Data families");
  assertUniqueCatalogueRecords(tenderDatasets, "Tender datasets");
  assertUniqueCatalogueRecords(dataSources, "Data sources");
  assertUniqueCatalogueRecords(glossaryTerms, "Glossary");

  const sideIds = new Set(tenderSides.map((item) => item.id));
  const familyIds = new Set(dataFamilies.map((item) => item.id));

  for (const item of actorTypes) {
    for (const sideId of item.sideIds) {
      if (!sideIds.has(sideId)) throw new Error(`Actor ${item.id} references unknown side ${sideId}`);
    }
  }

  for (const item of tenderDatasets) {
    if (!familyIds.has(item.familyId)) throw new Error(`Dataset ${item.id} references unknown family ${item.familyId}`);
    if (!item.demo || item.demo.columns.length < 3) throw new Error(`Dataset ${item.id} needs at least three demo columns`);
    if (item.demo.rows.length !== 3) throw new Error(`Dataset ${item.id} needs exactly three demo rows`);
    if (item.demo.rows.some((row) => row.length !== item.demo.columns.length)) throw new Error(`Dataset ${item.id} has a malformed demo row`);
    if ([...item.demo.columns, ...item.demo.rows.flat()].some((value) => !value.trim())) throw new Error(`Dataset ${item.id} has an empty demo value`);
  }

  return {
    agentSpecifications: validateAgentSpecifications(),
    sides: tenderSides.length,
    actorTypes: actorTypes.length,
    dataFamilies: dataFamilies.length,
    datasets: tenderDatasets.length,
    sources: dataSources.length,
    glossaryTerms: glossaryTerms.length,
    agentDatasetRelationships: validateAgentDatasetRelationships(),
  };
}
