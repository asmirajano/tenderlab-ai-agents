import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  agentDatasetContributions,
  agentDatasetGaps,
  agentRelationships,
  agentRevisions,
  agents,
  layerById,
  platformSideLabels,
  projectAgentCaseEvidence,
  realAgentImplementationsForAgent,
  tenderDatasets,
  tierLabels,
  datasetImpactOperationByRelationship,
} from "../../../packages/catalog-data/src";
import type { AgentRelationship, AgentSpecification } from "../../../packages/catalog-schema/src";
import { case1ProcessGraph } from "../../../app/case-simulation/case-1-graph";

const mainAppUrl = "https://tenderlab-ai-agents.web.app";
const caseEvidence = projectAgentCaseEvidence(case1ProcessGraph);
const datasetById = new Map(tenderDatasets.map((dataset) => [dataset.id, dataset]));

function FlaggedGap({ title, note }: { title: string; note: string }) {
  return <section className="spec-gap"><div><span>{title}</span><strong>REVIEW REQUIRED</strong></div><p>{note}</p><i>NOT YET STRUCTURED</i></section>;
}

function SpecificationBlock({
  number,
  title,
  description,
  children,
  collapsible = false,
  open = false,
  tone = "default",
}: {
  number: string;
  title: string;
  description: string;
  children: ReactNode;
  collapsible?: boolean;
  open?: boolean;
  tone?: "default" | "operating" | "review";
}) {
  const heading = <div className="spec-block-heading"><span>{number}</span><div><h2>{title}</h2><p>{description}</p></div>{collapsible && <i aria-hidden="true">＋</i>}</div>;
  if (collapsible) return <details className={`spec-block spec-block-${tone}`} open={open}><summary>{heading}</summary><div className="spec-block-content">{children}</div></details>;
  return <section className={`spec-block spec-block-${tone}`}>{heading}<div className="spec-block-content">{children}</div></section>;
}

function AgentReference({ registryId, label }: { registryId: string; label: string }) {
  const referenced = agents.find((item) => item.registryId === registryId);
  if (!referenced) return <span>{label}</span>;
  return <a className="spec-agent-reference" href={`/agents/${referenced.slug}`}>{label} <small>({String(referenced.id).padStart(2, "0")})</small></a>;
}

function RelationshipList({ relationships, empty }: { relationships: AgentRelationship[]; empty: string }) {
  if (!relationships.length) return <p className="spec-empty">{empty}</p>;
  return <div className="spec-relationship-list">{relationships.map((relationship) => (
    <article key={relationship.id}>
      <div><b>{relationship.type}</b><i>{relationship.status}</i></div>
      <strong><AgentReference registryId={relationship.source.ref} label={relationship.source.label} /> <em>→</em> <AgentReference registryId={relationship.target.ref} label={relationship.target.label} /></strong>
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
  const implementations = realAgentImplementationsForAgent(agent.registryId);
  const layer = layerById[agent.layer];

  return <article className="agent-specification" style={{ "--item-color": layer.color } as CSSProperties}>
    <header className="spec-identity">
      <div className="spec-id"><span>{String(agent.id).padStart(2, "0")}</span><small>{agent.registryId}</small></div>
      <div><p>CANONICAL AGENT SPECIFICATION · V{agent.governance.specificationVersion}</p><h1>{agent.name}</h1><strong>{agent.profile.simply}</strong></div>
      <a href={`${mainAppUrl}/agents?agent=${agent.id}`}>Open Quick Profile ↗</a>
    </header>

    <section className="spec-governance" aria-label="Identity and governance metadata"><div><span>STATUS</span><b className={`spec-state spec-state-${agent.governance.status}`}>{agent.governance.status}</b></div><div><span>CLASS</span><b>{tierLabels[agent.tier]}</b></div><div><span>LAYER</span><b>{layer.number} · {layer.name}</b></div><div><span>SCHEMA</span><b>{agent.governance.schemaVersion}</b></div><div><span>UPDATED</span><b>{agent.governance.updatedAt}</b></div></section>

    <div className="spec-body">
      <SpecificationBlock number="01" title="Purpose & Responsibility" description="Why this Agent exists, what it owns, and where its mandate stops.">
        <section className="spec-section spec-purpose"><span>PURPOSE</span><h3>{agent.description}</h3><p>{agent.profile.responsibilityScope}</p></section>
        <div className="spec-two-column spec-activity-grid">
          <section className="spec-section"><span>ACTIVITIES / WHAT IT DOES</span><ul>{agent.profile.activities.map((item) => <li key={item}>{item}</li>)}</ul></section>
          <section className="spec-section spec-exclusions"><span>EXPLICIT EXCLUSIONS</span><ul>{agent.profile.exclusions.map((item) => <li key={item}>{item}</li>)}</ul></section>
        </div>
        <div className="spec-two-column spec-boundary-grid">
          <section className="spec-section"><span>RESPONSIBILITY BOUNDARY</span><p>{agent.profile.responsibilityBoundary}</p></section>
          <section className="spec-section"><span>KEY DISTINCTION</span><p>{agent.profile.keyDistinction}</p></section>
        </div>
      </SpecificationBlock>

      <SpecificationBlock number="02" title="Operating Contract" description="Activation rules, required inputs, concrete output and downstream use." tone="operating">
        <section className="spec-section"><span>ACTIVATION</span><div className="spec-contract-grid"><article><small>TRIGGER</small><p>{agent.profile.trigger}</p></article><article><small>SKIP CONDITION</small><p>{agent.profile.skipCondition}</p></article><article><small>WORKFLOW STAGE</small><p>{agent.profile.workflowStage}</p></article></div></section>
        <section className="spec-section"><span>INPUTS</span><div className="spec-chip-list">{agent.profile.typicalInputs.map((item) => <i key={item}>{item}</i>)}</div></section>
        <section className="spec-output"><div><span>PRIMARY OUTPUT</span><h3>{agent.output.primary}</h3><div className="spec-chip-list">{agent.output.artifacts.map((item) => <i key={item}>{item}</i>)}</div></div><aside><span>DECLARED CONSUMERS</span><p>{agent.output.consumers}</p></aside></section>
      </SpecificationBlock>

      <SpecificationBlock number="03" title="Authority & Human Control" description="What the Agent may decide, what remains human-owned, and which controls need review.">
        <section className="spec-section spec-authority"><span>AUTHORITY</span><p>{agent.profile.authority}</p></section>
        <FlaggedGap title="HUMAN CONTROLS" note={agent.humanControls.note} />
        <section className="spec-section"><span>PLATFORM ROLE</span><div className="spec-platform-list">{agent.platformSides.map((side) => <article key={side}><b>{platformSideLabels[side]}</b><p>{agent.platformRationale[side]}</p></article>)}</div></section>
      </SpecificationBlock>

      <SpecificationBlock number="04" title="Relationships & Handoffs" description={`${handoffs.length} governed handoffs · ${otherRelationships.length} supporting relationships`} collapsible open>
        <section className="spec-section"><span>HANDOFFS</span><RelationshipList relationships={handoffs} empty="No handoff relationship is currently structured." /></section>
        <section className="spec-section"><span>AGENT RELATIONSHIPS</span><RelationshipList relationships={otherRelationships} empty="No Agent relationship is currently structured." /></section>
      </SpecificationBlock>

      <SpecificationBlock number="05" title="Data & Persistent Outputs" description={`${datasets.length} canonical Dataset relationships · ${gaps.length} open data gaps`} collapsible>
        <section className="spec-section"><span>DATASET IMPACT</span>{datasets.length ? <div className="spec-dataset-list">{datasets.map((item) => <article key={item.id}><div><b>{datasetImpactOperationByRelationship[item.relationshipType]}</b><small>{item.relationshipType} · {item.status}</small></div><strong>{datasetById.get(item.datasetId)?.name.en ?? item.datasetId}</strong><p>{item.provides.join(" · ")}</p></article>)}</div> : <p className="spec-empty">No persistent canonical Dataset relationship is assigned to this deliverable.</p>}{gaps.map((gap) => <div className="spec-finding" key={gap.id}><b>POTENTIAL DATASET GAP</b><strong>{gap.proposedName}</strong><p>{gap.whyExistingDatasetsDoNotFit}</p></div>)}</section>
      </SpecificationBlock>

      <SpecificationBlock number="06" title="Validation & Evidence" description={`${evidence.length} Case/Event evidence records · architecture review state`} collapsible tone="review">
        <section className="spec-section"><span>CASE / EVENT / PROCESS EVIDENCE</span>{evidence.length ? <div className="spec-evidence-list">{evidence.map((item) => <details key={item.id}><summary><b>{item.nodeKind === "event" ? `E${String(item.eventStep).padStart(2, "0")}` : item.nodeRef}</b><span>{item.eventTitle}</span><i>{item.validationStatus}</i></summary><p><small>ROLE</small>{item.role}</p><p><small>INPUT</small>{item.input}</p><p><small>OUTPUT</small>{item.output}</p><p><small>HANDOFF</small>{item.handoff}</p></details>)}</div> : <p className="spec-empty">Agent is not currently evidenced in the approved Case 1 Event/Process graph.</p>}</section>
        <section className="spec-section"><span>ARCHITECTURE FINDINGS</span>{agent.profile.validationFinding ? <div className="spec-finding"><b>OPEN FINDING</b><p>{agent.profile.validationFinding}</p></div> : <p className="spec-confirmed">No Agent-level validation finding is currently recorded.</p>}</section>
      </SpecificationBlock>

      <SpecificationBlock number="07" title="Technical & Governance" description="Failure behavior, implementation requirements and canonical revision history." collapsible>
        <FlaggedGap title="ERROR BEHAVIOR" note={agent.errorBehavior.note} />
        <FlaggedGap title="IMPLEMENTATION REQUIREMENTS" note={agent.implementationRequirements.note} />
        <section className="spec-section"><span>CHANGE HISTORY</span><div className="spec-revision-list">{revisions.map((revision) => <article key={revision.id}><div><b>V{revision.toVersion}</b><i>{revision.date} · {revision.status}</i></div><strong>{revision.summary}</strong><p>{revision.rationale}</p><small>{revision.changedFields.join(" · ")}</small></article>)}</div></section>
      </SpecificationBlock>

      {implementations.length > 0 && <SpecificationBlock number="08" title="Real Implementations" description="Client-facing products that implement this canonical capability without redefining the Agent.">
        <section className="spec-section"><span>IMPLEMENTATION REGISTRY</span><div className="spec-implementation-list">{implementations.map((implementation) => <article key={implementation.id}><div><b>{implementation.maturity.replaceAll("-", " ")}</b><i>{implementation.deploymentStatus.replaceAll("-", " ")}</i></div><h3>{implementation.name}</h3><p>{implementation.primaryOutput}</p><footer><small>{implementation.id}</small><a href={`/real-agents/implementations#${implementation.slug}`}>Open implementation dossier →</a></footer></article>)}</div></section>
      </SpecificationBlock>}

      <SpecificationBlock number={implementations.length > 0 ? "09" : "08"} title="Realistic Example" description="A simulated case showing the specification in practical use.">
        <section className="spec-section spec-example"><span>DEMO · SIMULATED</span><h3>{agent.example.company}</h3><strong>{agent.example.item}</strong><p>{agent.example.result}</p></section>
      </SpecificationBlock>
    </div>

    <footer className="spec-artifacts"><span>GENERATED DOCUMENTATION</span><a href={`/agent-specifications/${agent.slug}.md`}>Markdown ↗</a><a href="/agent-specifications/index.json">Canonical JSON ↗</a><small>Generated artifacts are read-only projections; this page and TenderLab consume the same registry.</small></footer>
  </article>;
}

export function AgentSpecificationsPage({ requestedSlug }: { requestedSlug?: string }) {
  const initialAgent = agents.find((agent) => agent.slug === requestedSlug) ?? agents[0];
  const [selectedId, setSelectedId] = useState(initialAgent.id);
  const [query, setQuery] = useState("");
  const activeAgentRef = useRef<HTMLAnchorElement>(null);
  const selected = agents.find((agent) => agent.id === selectedId) ?? agents[0];
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return agents;
    return agents.filter((agent) => [
      agent.id,
      String(agent.id).padStart(2, "0"),
      agent.registryId,
      agent.name,
      agent.description,
      agent.profile.simply,
      agent.profile.responsibilityScope,
      ...agent.aliases,
    ].join(" ").toLowerCase().includes(normalized));
  }, [query]);

  useEffect(() => {
    activeAgentRef.current?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  return <div className="agent-spec-workspace">
    <aside className="spec-catalogue">
      <header className="spec-catalogue-header"><span>CANONICAL REGISTRY</span><h1>64 Agent Specifications</h1><p>Navigate the canonical Full Specifications.</p></header>
      <div className="spec-catalogue-search">
        <label><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ID, name or alias" aria-label="Search Agent Specifications by ID, name or alias" /></label>
        <small>{filtered.length} of {agents.length}</small>
        {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear Agent search">×</button>}
      </div>
      <nav aria-label="Agent Specification Navigator">{filtered.map((agent) => {
        const isActive = selected.id === agent.id;
        const statusClass = agent.governance.status.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        return <a ref={isActive ? activeAgentRef : undefined} className={isActive ? "active" : ""} aria-current={isActive ? "page" : undefined} href={`/agents/${agent.slug}`} onClick={(event) => { event.preventDefault(); setSelectedId(agent.id); window.history.replaceState(null, "", `/agents/${agent.slug}`); }} key={agent.registryId}>
          <b>{String(agent.id).padStart(2, "0")}</b>
          <span><strong>{agent.name}</strong><small><i>v{agent.governance.specificationVersion}</i><em className={`status-${statusClass}`}>{agent.governance.status}</em></small></span>
        </a>;
      })}</nav>
    </aside>
    <FullSpecification agent={selected} />
  </div>;
}
