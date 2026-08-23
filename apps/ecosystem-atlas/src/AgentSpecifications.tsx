import { useMemo, useState, type CSSProperties } from "react";
import {
  agentDatasetContributions,
  agentDatasetGaps,
  agentRelationships,
  agentRevisions,
  agents,
  layerById,
  platformSideLabels,
  projectAgentCaseEvidence,
  tenderDatasets,
  tierLabels,
} from "../../../packages/catalog-data/src";
import type { AgentRelationship, AgentSpecification } from "../../../packages/catalog-schema/src";
import { case1ProcessGraph } from "../../../app/case-simulation/case-1-graph";

const mainAppUrl = "https://tenderlab-ai-agents.web.app";
const caseEvidence = projectAgentCaseEvidence(case1ProcessGraph);
const datasetById = new Map(tenderDatasets.map((dataset) => [dataset.id, dataset]));

function FlaggedGap({ title, note }: { title: string; note: string }) {
  return <section className="spec-gap"><span>{title}</span><strong>NOT YET STRUCTURED</strong><p>{note}</p></section>;
}

function RelationshipList({ relationships, empty }: { relationships: AgentRelationship[]; empty: string }) {
  if (!relationships.length) return <p className="spec-empty">{empty}</p>;
  return <div className="spec-relationship-list">{relationships.map((relationship) => (
    <article key={relationship.id}>
      <div><b>{relationship.type}</b><i>{relationship.status}</i></div>
      <strong>{relationship.source.label} <em>→</em> {relationship.target.label}</strong>
      {relationship.payload && <p><small>PAYLOAD</small>{relationship.payload}</p>}
      <p>{relationship.rationale}</p>
    </article>
  ))}</div>;
}

function FullSpecification({ agent }: { agent: AgentSpecification }) {
  const relationships = agentRelationships.filter((item) => item.source.ref === agent.registryId || item.target.ref === agent.registryId);
  const handoffs = relationships.filter((item) => item.type === "handoff");
  const otherRelationships = relationships.filter((item) => item.type !== "handoff");
  const datasets = agentDatasetContributions.filter((item) => item.agentId === agent.registryId);
  const gaps = agentDatasetGaps.filter((item) => item.agentId === agent.registryId);
  const evidence = caseEvidence.filter((item) => item.agentId === agent.registryId);
  const revisions = agentRevisions.filter((item) => item.agentId === agent.registryId);
  const layer = layerById[agent.layer];

  return <article className="agent-specification" style={{ "--item-color": layer.color } as CSSProperties}>
    <header className="spec-identity">
      <div className="spec-id"><span>{String(agent.id).padStart(2, "0")}</span><small>{agent.registryId}</small></div>
      <div><p>CANONICAL AGENT SPECIFICATION · V{agent.governance.specificationVersion}</p><h1>{agent.name}</h1><strong>{agent.profile.simply}</strong></div>
      <a href={`${mainAppUrl}/agents?agent=${agent.id}`}>Open Quick Profile ↗</a>
    </header>

    <section className="spec-governance"><div><span>STATUS</span><b>{agent.governance.status}</b></div><div><span>CLASS</span><b>{tierLabels[agent.tier]}</b></div><div><span>LAYER</span><b>{layer.number} · {layer.name}</b></div><div><span>SCHEMA</span><b>{agent.governance.schemaVersion}</b></div><div><span>UPDATED</span><b>{agent.governance.updatedAt}</b></div></section>

    <section className="spec-section spec-purpose"><span>PURPOSE</span><h2>{agent.description}</h2><p>{agent.profile.responsibilityScope}</p></section>

    <div className="spec-two-column">
      <section className="spec-section"><span>ACTIVITIES / WHAT IT DOES</span><ul>{agent.profile.activities.map((item) => <li key={item}>{item}</li>)}</ul></section>
      <section className="spec-section spec-exclusions"><span>EXPLICIT EXCLUSIONS</span><ul>{agent.profile.exclusions.map((item) => <li key={item}>{item}</li>)}</ul></section>
    </div>

    <div className="spec-two-column">
      <section className="spec-section"><span>RESPONSIBILITY BOUNDARY</span><p>{agent.profile.responsibilityBoundary}</p></section>
      <section className="spec-section"><span>KEY DISTINCTION</span><p>{agent.profile.keyDistinction}</p></section>
    </div>

    <section className="spec-section"><span>ACTIVATION</span><div className="spec-contract-grid"><article><small>TRIGGER</small><p>{agent.profile.trigger}</p></article><article><small>SKIP CONDITION</small><p>{agent.profile.skipCondition}</p></article><article><small>WORKFLOW STAGE</small><p>{agent.profile.workflowStage}</p></article></div></section>

    <section className="spec-section"><span>INPUTS</span><div className="spec-chip-list">{agent.profile.typicalInputs.map((item) => <i key={item}>{item}</i>)}</div></section>

    <section className="spec-output"><div><span>PRIMARY OUTPUT</span><h2>{agent.output.primary}</h2><div className="spec-chip-list">{agent.output.artifacts.map((item) => <i key={item}>{item}</i>)}</div></div><aside><span>DECLARED CONSUMERS</span><p>{agent.output.consumers}</p></aside></section>

    <section className="spec-section"><span>AUTHORITY</span><p>{agent.profile.authority}</p></section>
    <FlaggedGap title="HUMAN CONTROLS" note={agent.humanControls.note} />

    <section className="spec-section"><span>HANDOFFS</span><RelationshipList relationships={handoffs} empty="No handoff relationship is currently structured." /></section>
    <section className="spec-section"><span>AGENT RELATIONSHIPS</span><RelationshipList relationships={otherRelationships} empty="No Agent relationship is currently structured." /></section>

    <section className="spec-section"><span>DATASET RELATIONSHIPS</span>{datasets.length ? <div className="spec-dataset-list">{datasets.map((item) => <article key={item.id}><b>{item.relationshipType}</b><strong>{datasetById.get(item.datasetId)?.name.en ?? item.datasetId}</strong><p>{item.provides.join(" · ")}</p><small>{item.status}</small></article>)}</div> : <p className="spec-empty">No canonical Dataset contribution is assigned.</p>}{gaps.map((gap) => <div className="spec-finding" key={gap.id}><b>POTENTIAL DATASET GAP</b><strong>{gap.proposedName}</strong><p>{gap.whyExistingDatasetsDoNotFit}</p></div>)}</section>

    <FlaggedGap title="ERROR BEHAVIOR" note={agent.errorBehavior.note} />

    <section className="spec-section"><span>PLATFORM ROLE</span><div className="spec-platform-list">{agent.platformSides.map((side) => <article key={side}><b>{platformSideLabels[side]}</b><p>{agent.platformRationale[side]}</p></article>)}</div></section>

    <section className="spec-section"><span>CASE / EVENT EVIDENCE</span>{evidence.length ? <div className="spec-evidence-list">{evidence.map((item) => <details key={item.id}><summary><b>E{String(item.eventStep).padStart(2, "0")}</b><span>{item.eventTitle}</span><i>{item.validationStatus}</i></summary><p><small>ROLE</small>{item.role}</p><p><small>INPUT</small>{item.input}</p><p><small>OUTPUT</small>{item.output}</p><p><small>HANDOFF</small>{item.handoff}</p></details>)}</div> : <p className="spec-empty">Agent is not currently evidenced in the approved Case 1 execution graph.</p>}</section>

    <section className="spec-section"><span>ARCHITECTURE FINDINGS</span>{agent.profile.validationFinding ? <div className="spec-finding"><b>OPEN FINDING</b><p>{agent.profile.validationFinding}</p></div> : <p>No Agent-level validation finding is currently recorded.</p>}</section>
    <FlaggedGap title="IMPLEMENTATION REQUIREMENTS" note={agent.implementationRequirements.note} />

    <section className="spec-section"><span>REALISTIC EXAMPLE · DEMO</span><h2>{agent.example.company}</h2><strong>{agent.example.item}</strong><p>{agent.example.result}</p></section>

    <section className="spec-section"><span>CHANGE HISTORY</span><div className="spec-revision-list">{revisions.map((revision) => <article key={revision.id}><div><b>V{revision.toVersion}</b><i>{revision.date} · {revision.status}</i></div><strong>{revision.summary}</strong><p>{revision.rationale}</p><small>{revision.changedFields.join(" · ")}</small></article>)}</div></section>

    <footer className="spec-artifacts"><span>GENERATED DOCUMENTATION</span><a href={`/agent-specifications/${agent.slug}.md`}>Markdown ↗</a><a href="/agent-specifications/index.json">Canonical JSON ↗</a><small>Generated artifacts are read-only projections; this page and TenderLab consume the same registry.</small></footer>
  </article>;
}

export function AgentSpecificationsPage({ requestedSlug }: { requestedSlug?: string }) {
  const initialAgent = agents.find((agent) => agent.slug === requestedSlug) ?? agents[0];
  const [selectedId, setSelectedId] = useState(initialAgent.id);
  const [query, setQuery] = useState("");
  const selected = agents.find((agent) => agent.id === selectedId) ?? agents[0];
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return agents;
    return agents.filter((agent) => [agent.name, agent.description, agent.profile.simply, agent.profile.responsibilityScope, ...agent.aliases].join(" ").toLowerCase().includes(normalized));
  }, [query]);

  return <div className="agent-spec-workspace">
    <aside className="spec-catalogue">
      <div><span>CANONICAL REGISTRY</span><h1>64 Agent Specifications</h1><p>Quick profiles and analytical views are projections of these same records.</p></div>
      <label><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find Agent" /></label>
      <nav>{filtered.map((agent) => <a className={selected.id === agent.id ? "active" : ""} href={`/agents/${agent.slug}`} onClick={(event) => { event.preventDefault(); setSelectedId(agent.id); window.history.replaceState(null, "", `/agents/${agent.slug}`); }} key={agent.registryId}><b>{String(agent.id).padStart(2, "0")}</b><span>{agent.name}<small>V{agent.governance.specificationVersion} · {agent.governance.status}</small></span></a>)}</nav>
    </aside>
    <FullSpecification agent={selected} />
  </div>;
}
