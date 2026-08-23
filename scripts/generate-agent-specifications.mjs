import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { agents } from "../packages/catalog-data/src/agents.ts";
import {
  agentDatasetContributions,
  agentDatasetGaps,
  agentDeliverables,
} from "../packages/catalog-data/src/agent-dataset-relations.ts";
import { projectAgentCaseEvidence } from "../packages/catalog-data/src/agent-case-evidence.ts";
import { agentRelationships } from "../packages/catalog-data/src/agent-relationships.ts";
import { agentRevisions } from "../packages/catalog-data/src/agent-revisions.ts";
import { case1ProcessGraph } from "../app/case-simulation/case-1-graph.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectories = [
  path.join(projectRoot, "dist", "firebase", "agent-specifications"),
  path.join(projectRoot, "apps", "ecosystem-atlas", "dist", "agent-specifications"),
];
const caseEvidence = projectAgentCaseEvidence(case1ProcessGraph);

function specificationProjection(agent) {
  return {
    ...agent,
    relationships: agentRelationships.filter((item) => item.source.ref === agent.registryId || item.target.ref === agent.registryId),
    deliverable: agentDeliverables.find((item) => item.agentId === agent.registryId) ?? null,
    datasetRelationships: agentDatasetContributions.filter((item) => item.agentId === agent.registryId),
    datasetGaps: agentDatasetGaps.filter((item) => item.agentId === agent.registryId),
    caseEvidence: caseEvidence.filter((item) => item.agentId === agent.registryId),
    revisionHistory: agentRevisions.filter((item) => item.agentId === agent.registryId),
  };
}

const specifications = agents.map(specificationProjection);
const registryArtifact = {
  artifactType: "generated-agent-specification-registry",
  generatedAt: new Date().toISOString(),
  schemaVersion: "1.0.0",
  sourceOfTruth: "packages/catalog-data/src/agents.ts#agentSpecifications",
  maintenancePolicy: "GENERATED READ-ONLY ARTIFACT. Do not edit; regenerate from the typed canonical registry.",
  count: specifications.length,
  specifications,
};

function list(items) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- Not yet structured.";
}

function markdown(specification) {
  const { profile, governance, output } = specification;
  const relationshipRows = specification.relationships.length
    ? specification.relationships.map((item) => `| ${item.type} | ${item.source.label} | ${item.target.label} | ${item.status} | ${item.rationale.replaceAll("|", "\\|")} |`).join("\n")
    : "| — | — | — | — | No structured relationship. |";
  const datasetRows = specification.datasetRelationships.length
    ? specification.datasetRelationships.map((item) => `| ${item.relationshipType} | ${item.datasetId} | ${item.provides.join("; ").replaceAll("|", "\\|")} | ${item.status} |`).join("\n")
    : "| — | — | No canonical Dataset contribution assigned. | — |";
  const evidenceRows = specification.caseEvidence.length
    ? specification.caseEvidence.map((item) => `| ${item.caseId} | E${String(item.eventStep).padStart(2, "0")} | ${item.eventTitle.replaceAll("|", "\\|")} | ${item.validationStatus} |`).join("\n")
    : "| — | — | No current Case evidence. | — |";
  const revisionRows = specification.revisionHistory.map((item) => `| ${item.toVersion} | ${item.date} | ${item.status} | ${item.summary.replaceAll("|", "\\|")} |`).join("\n");

  return `<!-- GENERATED READ-ONLY ARTIFACT. Source: typed canonical Agent registry. -->
# ${String(specification.id).padStart(2, "0")} · ${specification.name}

## Identity

- **Registry ID:** ${specification.registryId}
- **Slug:** ${specification.slug}
- **Aliases / previous names:** ${[...new Set([...specification.aliases, ...specification.previousNames])].join("; ") || "None recorded"}
- **Layer:** ${specification.layer}
- **Class:** ${specification.tier}

## Governance

- **Specification version:** ${governance.specificationVersion}
- **Schema version:** ${governance.schemaVersion}
- **Status:** ${governance.status}
- **Updated:** ${governance.updatedAt}

## Plain-language Summary

${profile.simply}

## Purpose

${specification.description}

## Scope

${profile.responsibilityScope}

## Activities

${list(profile.activities)}

## Exclusions

${list(profile.exclusions)}

## Boundaries

${profile.responsibilityBoundary}

**Key distinction:** ${profile.keyDistinction}

## Activation

- **Trigger:** ${profile.trigger}
- **Skip condition:** ${profile.skipCondition}
- **Workflow stage:** ${profile.workflowStage}

## Inputs

${list(profile.typicalInputs)}

## Outputs

- **Primary:** ${output.primary}
- **Artifacts:** ${output.artifacts.join("; ")}
- **Declared consumers:** ${output.consumers}

## Authority

${profile.authority}

## Human Controls

**${specification.humanControls.status}:** ${specification.humanControls.note}

## Handoffs and Relationships

| Type | Source | Target | Status | Rationale |
| --- | --- | --- | --- | --- |
${relationshipRows}

## Datasets

| Relation | Dataset | Provides | Status |
| --- | --- | --- | --- |
${datasetRows}

## Error Behavior

**${specification.errorBehavior.status}:** ${specification.errorBehavior.note}

## Platform Role

${specification.platformSides.map((side) => `- **${side}:** ${specification.platformRationale[side] ?? "Rationale not structured."}`).join("\n")}

## Case Evidence

| Case | Event | Evidence context | Status |
| --- | --- | --- | --- |
${evidenceRows}

## Architecture Findings

${profile.validationFinding ?? "No Agent-level validation finding is currently recorded."}

## Implementation Requirements

**${specification.implementationRequirements.status}:** ${specification.implementationRequirements.note}

## Change History

| Version | Date | Status | Summary |
| --- | --- | --- | --- |
${revisionRows}
`;
}

if (specifications.length !== 64) throw new Error(`Expected 64 Agent Specifications, got ${specifications.length}.`);

for (const directory of outputDirectories) {
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "index.json"), `${JSON.stringify(registryArtifact, null, 2)}\n`, "utf8");
  await Promise.all(specifications.map((specification) =>
    writeFile(path.join(directory, `${specification.slug}.md`), markdown(specification), "utf8"),
  ));
}

console.log(`Generated ${specifications.length} versioned Agent Specifications in ${outputDirectories.length} deployment outputs.`);
