"use client";

import {
  datasetGapsForAgent,
  datasetImpactsForAgent,
  deliverableDispositionLabels,
  deliverableForAgent,
  tenderDatasets,
  tenderEcosystemDatasetUrl,
  type Agent,
} from "../packages/catalog-data/src";

const datasetById = new Map(tenderDatasets.map((dataset) => [dataset.id, dataset]));

export function datasetImpactIdsForAgent(agent: Agent) {
  return datasetImpactsForAgent(agent.registryId).map((impact) => impact.datasetId);
}

export function AgentDatasetImpactCell({
  agent,
  compact = false,
  sharedDatasetIds = new Set<string>(),
}: {
  agent: Agent;
  compact?: boolean;
  sharedDatasetIds?: Set<string>;
}) {
  const impacts = datasetImpactsForAgent(agent.registryId);
  const gaps = datasetGapsForAgent(agent.registryId);
  const deliverable = deliverableForAgent(agent.registryId);

  if (!impacts.length) return (
    <div className={`agent-dataset-impact is-empty ${compact ? "is-compact" : ""}`.trim()}>
      <b>{deliverable ? deliverableDispositionLabels[deliverable.disposition] : "NOT STRUCTURED"}</b>
      <p>{gaps[0]?.proposedName ?? deliverable?.rationale ?? "No canonical Dataset relationship is declared."}</p>
      {gaps.length > 0 && <em>OPEN DATASET GAP</em>}
    </div>
  );

  return (
    <div className={`agent-dataset-impact ${compact ? "is-compact" : ""}`.trim()}>
      {impacts.map((impact) => {
        const dataset = datasetById.get(impact.datasetId);
        const href = tenderEcosystemDatasetUrl(impact.datasetId);
        if (!dataset) return null;
        const shared = sharedDatasetIds.has(impact.datasetId);
        return (
          <article className={shared ? "is-shared" : ""} key={impact.id}>
            <span className={`dataset-operation operation-${impact.operation.toLowerCase()}`}>{impact.operation}</span>
            {href ? <a href={href} target="_blank" rel="noreferrer">{dataset.name.en}<i>↗</i></a> : <strong>{dataset.name.en}</strong>}
            {!compact && <small>{impact.fields.slice(0, 3).join(" · ")}{impact.fields.length > 3 ? ` · +${impact.fields.length - 3}` : ""}</small>}
            {shared && <em>SHARED DATASET</em>}
          </article>
        );
      })}
    </div>
  );
}

export function AgentCardDatasetSummary({ agent }: { agent: Agent }) {
  const impacts = datasetImpactsForAgent(agent.registryId);
  const datasets = impacts.map((impact) => datasetById.get(impact.datasetId)).filter(Boolean);
  const deliverable = deliverableForAgent(agent.registryId);
  return (
    <div className="agent-card-datasets" aria-label={`${agent.name} Dataset impact`}>
      <span>DATASETS</span>
      {datasets.length ? <p>{datasets.slice(0, 2).map((dataset) => dataset!.name.en).join(" · ")}{datasets.length > 2 ? ` · +${datasets.length - 2}` : ""}</p> : <p>{deliverable ? deliverableDispositionLabels[deliverable.disposition] : "Not structured"}</p>}
    </div>
  );
}
