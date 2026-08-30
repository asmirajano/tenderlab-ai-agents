import {
  assertUniqueCatalogueRecords,
  realAgentImplementationIdPattern,
  realAgentLessonIdPattern,
  realAgentPatternIdPattern,
} from "../../catalog-schema/src/index.ts";
import { actorTypes, tenderSides } from "./actors.ts";
import { clientProducts, practicalAgentOverviewRequiredParts } from "./client-products.ts";
import { dataFamilies, dataSources, tenderDatasets } from "./datasets.ts";
import { glossaryTerms } from "./glossary.ts";
import { validateAgentDatasetRelationships } from "./agent-dataset-relations.ts";
import { agentRelationships } from "./agent-relationships.ts";
import { agentRevisions } from "./agent-revisions.ts";
import { agentSpecifications } from "./agents.ts";
import {
  realAgentImplementations,
  realAgentLessons,
  realAgentReusablePatterns,
} from "./real-agent-development.ts";

function assertUniqueValues(values: string[], label: string) {
  if (new Set(values).size !== values.length) throw new Error(`${label} must be unique.`);
}

export function validateRealAgentDevelopmentKnowledge() {
  assertUniqueValues(realAgentImplementations.map((item) => item.id), "Real Agent implementation IDs");
  assertUniqueValues(realAgentImplementations.map((item) => item.slug), "Real Agent implementation slugs");
  assertUniqueValues(realAgentReusablePatterns.map((item) => item.id), "Real Agent pattern IDs");
  assertUniqueValues(realAgentReusablePatterns.map((item) => item.slug), "Real Agent pattern slugs");
  assertUniqueValues(realAgentLessons.map((item) => item.id), "Real Agent lesson IDs");

  const agentIds = new Set(agentSpecifications.map((item) => item.registryId));
  const productsById = new Map(clientProducts.map((item) => [item.id, item]));
  const implementationIds = new Set(realAgentImplementations.map((item) => item.id));
  const patternIds = new Set(realAgentReusablePatterns.map((item) => item.id));
  const lessonIds = new Set(realAgentLessons.map((item) => item.id));

  assertUniqueValues(clientProducts.map((item) => item.id), "Client product IDs");
  assertUniqueValues(clientProducts.map((item) => item.clientRoute), "Client product routes");
  assertUniqueValues(clientProducts.map((item) => String(item.catalogOrder)), "Client product catalog orders");
  const orderedProducts = [...clientProducts].sort((left, right) => left.catalogOrder - right.catalogOrder);
  if (orderedProducts.some((item, index) => item.catalogOrder !== index + 1)) throw new Error("Client product catalog order must be contiguous and one-based.");
  for (const product of clientProducts) {
    if (!agentIds.has(product.ownerAgentId)) throw new Error(`${product.id} references unknown Agent ${product.ownerAgentId}`);
    if (!product.surfaceStatus || !product.dataNotice) throw new Error(`${product.id} needs truthful surface and data status metadata.`);
    const overview = product.overviewContract;
    if (!overview?.implementationSourcePath || !overview.compositionSourcePath || !overview.renderedEvidencePath) throw new Error(`${product.id} needs a practical-Agent Overview implementation and rendered-evidence contract.`);
    if (overview.requiredParts.join("|") !== practicalAgentOverviewRequiredParts.join("|")) throw new Error(`${product.id} practical-Agent Overview parts are missing or out of order.`);
    if (overview.renderedGate.finishedOutputMinimumAreaRatio < 1.25) throw new Error(`${product.id} practical-Agent Overview output is not required to be visually dominant.`);
    if (overview.renderedGate.desktopViewports.length < 2 || !overview.renderedGate.trustBoundaryMustBeVisible) throw new Error(`${product.id} practical-Agent Overview lacks rendered browser gates.`);
  }

  for (const item of realAgentImplementations) {
    if (!realAgentImplementationIdPattern.test(item.id)) throw new Error(`Invalid Real Agent implementation ID ${item.id}`);
    if (!agentIds.has(item.ownerAgentId)) throw new Error(`${item.id} references unknown Agent ${item.ownerAgentId}`);
    const product = productsById.get(item.clientProductId);
    if (!product) throw new Error(`${item.id} references unknown client product ${item.clientProductId}`);
    if (product.ownerAgentId !== item.ownerAgentId) throw new Error(`${item.id} disagrees with its client product owner.`);
    if (!item.methodRefs.length || !item.playbookRefs.length) throw new Error(`${item.id} needs methodology and playbook references.`);
    if (!item.primaryInputs.length || !item.primaryOutput || !item.knownLimitations.length) throw new Error(`${item.id} needs an inspectable product contract and limitations.`);
    for (const patternId of item.patternIds) if (!patternIds.has(patternId)) throw new Error(`${item.id} references unknown pattern ${patternId}`);
    for (const lessonId of item.lessonIds) if (!lessonIds.has(lessonId)) throw new Error(`${item.id} references unknown lesson ${lessonId}`);
    if (item.runtimeReadiness === "static-client-workflow" && item.maturity === "enterprise-runtime") throw new Error(`${item.id} inflates static workflow maturity.`);
  }

  for (const pattern of realAgentReusablePatterns) {
    if (!realAgentPatternIdPattern.test(pattern.id)) throw new Error(`Invalid Real Agent pattern ID ${pattern.id}`);
    if (!pattern.confirmedByImplementationIds.length || !pattern.methodologyGateIds.length) throw new Error(`${pattern.id} needs evidence and methodology gates.`);
    for (const id of pattern.confirmedByImplementationIds) {
      if (!implementationIds.has(id)) throw new Error(`${pattern.id} references unknown implementation ${id}`);
      if (!realAgentImplementations.find((item) => item.id === id)?.patternIds.includes(pattern.id)) throw new Error(`${pattern.id} is missing its reverse implementation link.`);
    }
    for (const lessonId of pattern.lessonIds) if (!lessonIds.has(lessonId)) throw new Error(`${pattern.id} references unknown lesson ${lessonId}`);
  }

  for (const lesson of realAgentLessons) {
    if (!realAgentLessonIdPattern.test(lesson.id)) throw new Error(`Invalid Real Agent lesson ID ${lesson.id}`);
    if (!lesson.implementationIds.length || !lesson.regressionRefs.length) throw new Error(`${lesson.id} needs implementation and regression evidence.`);
    if (lesson.evidenceScope === "multiple-implementations" && lesson.implementationIds.length < 2) throw new Error(`${lesson.id} overstates its evidence scope.`);
    if (lesson.classification === "agent-specific" && !lesson.playbookRefs.length) throw new Error(`${lesson.id} needs an owning playbook.`);
    for (const id of lesson.implementationIds) {
      if (!implementationIds.has(id)) throw new Error(`${lesson.id} references unknown implementation ${id}`);
      if (!realAgentImplementations.find((item) => item.id === id)?.lessonIds.includes(lesson.id)) throw new Error(`${lesson.id} is missing its reverse implementation link.`);
    }
  }

  return {
    implementations: realAgentImplementations.length,
    patterns: realAgentReusablePatterns.length,
    lessons: realAgentLessons.length,
  };
}

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
    realAgentDevelopment: validateRealAgentDevelopmentKnowledge(),
  };
}
