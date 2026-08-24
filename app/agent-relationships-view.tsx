"use client";

import { useMemo, useState, type CSSProperties } from "react";
import type {
  AgentRelationship,
  AgentRelationshipFamily,
  AgentRelationshipRequirement,
} from "../packages/catalog-schema/src/agent-specification";
import {
  agentRelationships,
  getAgentTier,
  tierLabels,
  type Agent,
} from "../packages/catalog-data/src";
import { case1ProcessGraph } from "./case-simulation/case-1-graph";
import { AgentDatasetImpactCell, datasetImpactIdsForAgent } from "./agent-dataset-impact";

type LayerMeta = Record<string, { name: string; color: string; mark: string }>;
type RelationshipFilter = "all" | AgentRelationshipFamily | "process";
type RelationshipScope = 1 | 2 | "ecosystem";
type ExplorerMode = "agent" | "process";

type RelationshipGroup = {
  id: string;
  family: AgentRelationshipFamily;
  source: Agent;
  target: Agent;
  relationships: AgentRelationship[];
  requirement: AgentRelationshipRequirement;
  rationale: string;
  evidence: string[];
  payloads: string[];
  status: AgentRelationship["status"];
};

const relationshipFamilyMeta: Record<AgentRelationshipFamily, { label: string; short: string; description: string }> = {
  capability: { label: "CAPABILITY / SUPPORT", short: "Capability", description: "Более широкая и специализированная функциональная ответственность." },
  dependency: { label: "REQUIRED INPUT", short: "Dependency", description: "Один Agent зависит от upstream capability другого Agent." },
  sequence: { label: "OUTPUT HANDOFF", short: "Sequential", description: "Конкретный результат передаётся следующему потребителю." },
  boundary: { label: "BOUNDARY / ALTERNATIVE", short: "Boundary", description: "Похожие роли требуют явного разделения ответственности, а не автоматического слияния." },
};

const requirementLabels: Record<AgentRelationshipRequirement, string> = {
  required: "REQUIRED",
  contextual: "CONTEXTUAL",
  conditional: "CONDITIONAL",
  review: "REVIEW",
};

function strongestRequirement(relationships: AgentRelationship[]): AgentRelationshipRequirement {
  const order: AgentRelationshipRequirement[] = ["required", "conditional", "contextual", "review"];
  return order.find((requirement) => relationships.some((relationship) => relationship.requirement === requirement)) ?? "review";
}

function strongestStatus(relationships: AgentRelationship[]): AgentRelationship["status"] {
  if (relationships.some((relationship) => relationship.status === "validated")) return "validated";
  if (relationships.some((relationship) => relationship.status === "working")) return "working";
  return "needs-review";
}

function groupResolvedRelationships(allAgents: Agent[]) {
  const agentByRegistryId = new Map(allAgents.map((agent) => [agent.registryId, agent]));
  const grouped = new Map<string, AgentRelationship[]>();

  for (const relationship of agentRelationships) {
    if (relationship.source.kind !== "agent" || relationship.target.kind !== "agent") continue;
    const source = agentByRegistryId.get(relationship.source.ref);
    const target = agentByRegistryId.get(relationship.target.ref);
    if (!source || !target || source.id === target.id) continue;
    const pair = relationship.family === "boundary"
      ? [source.registryId, target.registryId].sort().join("--")
      : `${source.registryId}--${target.registryId}`;
    const key = `${relationship.family}:${pair}`;
    grouped.set(key, [...(grouped.get(key) ?? []), relationship]);
  }

  return [...grouped.entries()].map(([id, relationships]): RelationshipGroup => {
    const first = relationships[0];
    const source = agentByRegistryId.get(first.source.ref)!;
    const target = agentByRegistryId.get(first.target.ref)!;
    return {
      id,
      family: first.family,
      source,
      target,
      relationships,
      requirement: strongestRequirement(relationships),
      rationale: relationships.map((relationship) => relationship.rationale).filter((value, index, values) => values.indexOf(value) === index).join(" "),
      evidence: relationships.flatMap((relationship) => relationship.evidence).filter((value, index, values) => values.indexOf(value) === index),
      payloads: relationships.flatMap((relationship) => [relationship.payload, ...(relationship.artifacts ?? [])]).filter((value): value is string => Boolean(value)).filter((value, index, values) => values.indexOf(value) === index),
      status: strongestStatus(relationships),
    };
  });
}

function relationshipRole(group: RelationshipGroup, focusAgentId: number) {
  if (group.family === "capability") return group.source.id === focusAgentId ? "broader" : "specialized";
  if (group.family === "boundary") return "boundary";
  return group.source.id === focusAgentId ? "downstream" : "upstream";
}

function otherAgent(group: RelationshipGroup, focusAgentId: number) {
  return group.source.id === focusAgentId ? group.target : group.source;
}

function familyFilterMatches(group: RelationshipGroup, filter: RelationshipFilter) {
  return filter === "all" || filter === group.family;
}

export default function AgentRelationshipsView({
  allAgents,
  visibleAgents,
  layerMeta,
  onOpenAgent,
  comparisonIds,
  onToggleCompare,
}: {
  allAgents: Agent[];
  visibleAgents: Agent[];
  layerMeta: LayerMeta;
  onOpenAgent: (agent: Agent) => void;
  comparisonIds: number[];
  onToggleCompare: (agentId: number) => void;
}) {
  const [explorerMode, setExplorerMode] = useState<ExplorerMode>("agent");
  const [focusAgentId, setFocusAgentId] = useState(visibleAgents[0]?.id ?? 1);
  const [focusProcessId, setFocusProcessId] = useState(case1ProcessGraph.processes[0]?.id ?? "");
  const [relationshipFilter, setRelationshipFilter] = useState<RelationshipFilter>("all");
  const [scope, setScope] = useState<RelationshipScope>(1);
  const [selectedRelationshipId, setSelectedRelationshipId] = useState<string | null>(null);

  const agentById = useMemo(() => new Map(allAgents.map((agent) => [agent.id, agent])), [allAgents]);
  const visibleIds = useMemo(() => new Set(visibleAgents.map((agent) => agent.id)), [visibleAgents]);
  const relationshipGroups = useMemo(() => groupResolvedRelationships(allAgents), [allAgents]);
  const focusAgent = visibleIds.has(focusAgentId) ? agentById.get(focusAgentId) : visibleAgents[0];

  const directGroups = useMemo(() => {
    if (!focusAgent || relationshipFilter === "process") return [];
    return relationshipGroups.filter((group) => (
      (group.source.id === focusAgent.id || group.target.id === focusAgent.id)
      && visibleIds.has(otherAgent(group, focusAgent.id).id)
      && familyFilterMatches(group, relationshipFilter)
    ));
  }, [focusAgent, relationshipFilter, relationshipGroups, visibleIds]);

  const effectiveSelectedRelationshipId = directGroups.some((group) => group.id === selectedRelationshipId)
    ? selectedRelationshipId
    : (directGroups[0]?.id ?? null);

  const groupedByRole = useMemo(() => {
    const sections = { upstream: [] as RelationshipGroup[], downstream: [] as RelationshipGroup[], broader: [] as RelationshipGroup[], specialized: [] as RelationshipGroup[], boundary: [] as RelationshipGroup[] };
    if (!focusAgent) return sections;
    for (const group of directGroups) sections[relationshipRole(group, focusAgent.id)].push(group);
    for (const groups of Object.values(sections)) groups.sort((left, right) => otherAgent(left, focusAgent.id).id - otherAgent(right, focusAgent.id).id);
    return sections;
  }, [directGroups, focusAgent]);

  const broaderContext = useMemo(() => {
    if (!focusAgent || scope === 1 || relationshipFilter === "process") return [];
    const allowed = relationshipGroups.filter((group) => familyFilterMatches(group, relationshipFilter));
    const adjacency = new Map<number, Set<number>>();
    for (const group of allowed) {
      if (!visibleIds.has(group.source.id) || !visibleIds.has(group.target.id)) continue;
      adjacency.set(group.source.id, new Set([...(adjacency.get(group.source.id) ?? []), group.target.id]));
      adjacency.set(group.target.id, new Set([...(adjacency.get(group.target.id) ?? []), group.source.id]));
    }
    const distance = new Map<number, number>([[focusAgent.id, 0]]);
    const queue = [focusAgent.id];
    while (queue.length) {
      const current = queue.shift()!;
      const currentDistance = distance.get(current)!;
      if (scope === 2 && currentDistance >= 2) continue;
      for (const neighbor of adjacency.get(current) ?? []) {
        if (distance.has(neighbor)) continue;
        distance.set(neighbor, currentDistance + 1);
        queue.push(neighbor);
      }
    }
    return [...distance.entries()]
      .filter(([agentId, hops]) => agentId !== focusAgent.id && hops > 1)
      .map(([agentId, hops]) => ({ agent: agentById.get(agentId)!, hops }))
      .filter(({ agent }) => Boolean(agent))
      .sort((left, right) => left.hops - right.hops || left.agent.id - right.agent.id);
  }, [agentById, focusAgent, relationshipFilter, relationshipGroups, scope, visibleIds]);

  const selectedRelationship = directGroups.find((group) => group.id === effectiveSelectedRelationshipId) ?? null;
  const focusDatasetIds = new Set(datasetImpactIdsForAgent(focusAgent));
  const datasetPeers = allAgents.filter((agent) => agent.id !== focusAgent.id && datasetImpactIdsForAgent(agent).some((datasetId) => focusDatasetIds.has(datasetId)));
  const processMemberships = focusAgent ? case1ProcessGraph.processes.filter((process) => process.agentIds.includes(focusAgent.id)) : [];
  const selectedProcess = case1ProcessGraph.processes.find((process) => process.id === focusProcessId) ?? case1ProcessGraph.processes[0];
  const selectedProcessExecutions = selectedProcess
    ? case1ProcessGraph.processAgentExecutions.filter((execution) => execution.processId === selectedProcess.id && visibleIds.has(execution.agentId))
    : [];
  const unresolvedRelationshipCount = agentRelationships.filter((relationship) => relationship.source.kind !== "agent" || relationship.target.kind !== "agent").length;
  const boundaryPairCount = relationshipGroups.filter((group) => group.family === "boundary").length;
  const touchedAgentIds = new Set(relationshipGroups.flatMap((group) => [group.source.id, group.target.id]));
  const isolatedAgents = allAgents.filter((agent) => !touchedAgentIds.has(agent.id));

  if (!focusAgent) return null;

  const renderRelationshipCard = (group: RelationshipGroup) => {
    const relatedAgent = otherAgent(group, focusAgent.id);
    const selected = group.id === effectiveSelectedRelationshipId;
    return (
      <article className={`relationship-family-card family-${group.family} ${selected ? "is-selected" : ""}`.trim()} key={group.id} style={{ "--relation-layer": layerMeta[relatedAgent.layer].color } as CSSProperties}>
        <button type="button" className="relationship-explain" aria-pressed={selected} onClick={() => setSelectedRelationshipId(group.id)}>
          <span><i>{String(relatedAgent.id).padStart(2, "0")}</i>{relationshipFamilyMeta[group.family].label}</span>
          <strong>{relatedAgent.name}</strong>
          <p>{group.rationale}</p>
          <small><b>{requirementLabels[group.requirement]}</b><em>{group.status.replace("-", " ")}</em></small>
        </button>
        <button type="button" className="relationship-refocus" onClick={() => { setFocusAgentId(relatedAgent.id); setExplorerMode("agent"); }}>Focus Agent →</button>
      </article>
    );
  };

  const renderRoleSection = (id: keyof typeof groupedByRole, title: string, explanation: string) => {
    const groups = groupedByRole[id];
    return (
      <section className={`relationship-role-section role-${id}`}>
        <header><div><span>{title}</span><p>{explanation}</p></div><b>{groups.length}</b></header>
        <div>{groups.length ? groups.map(renderRelationshipCard) : <p className="relationship-empty">В текущем каноническом фильтре связь этого типа не подтверждена.</p>}</div>
      </section>
    );
  };

  return (
    <section className="agent-relationships-view" aria-label="Agent functional relationships explorer">
      <header className="relationships-toolbar">
        <div className="relationships-intro">
          <span>FUNCTIONAL RELATIONSHIPS</span>
          <h3>Agent family explorer</h3>
          <p>Фокус показывает ближайшую функциональную семью одного Agent: кто даёт input, кто использует output, кто шире или уже по scope и где проходят спорные границы.</p>
        </div>
        <div className="relationships-mode-switch" role="group" aria-label="Explore Agents or Processes">
          <button type="button" aria-pressed={explorerMode === "agent"} onClick={() => setExplorerMode("agent")}>Agent family</button>
          <button type="button" aria-pressed={explorerMode === "process"} onClick={() => { setExplorerMode("process"); setRelationshipFilter("process"); }}>Process team</button>
        </div>
        {explorerMode === "agent" ? (
          <label className="relationships-focus-select"><span>SELECT AGENT</span><select value={focusAgent.id} onChange={(event) => setFocusAgentId(Number(event.target.value))}>{visibleAgents.map((agent) => <option value={agent.id} key={agent.id}>{String(agent.id).padStart(2, "0")} · {agent.name}</option>)}</select></label>
        ) : (
          <label className="relationships-focus-select"><span>SELECT PROCESS</span><select value={selectedProcess?.id} onChange={(event) => setFocusProcessId(event.target.value)}>{case1ProcessGraph.processes.map((process) => <option value={process.id} key={process.id}>{process.id} · {process.name}</option>)}</select></label>
        )}
      </header>

      <div className="relationships-controls">
        <div className="relationship-filter" role="group" aria-label="Filter by functional relationship family">
          {(["all", "dependency", "capability", "sequence", "boundary", "process"] as RelationshipFilter[]).map((filter) => (
            <button type="button" aria-pressed={relationshipFilter === filter} onClick={() => { setRelationshipFilter(filter); if (filter === "process") setExplorerMode("process"); else setExplorerMode("agent"); }} key={filter}>
              {filter === "all" ? "All" : filter === "dependency" ? "Dependency" : filter === "capability" ? "Parent / Child" : filter === "sequence" ? "Sequential" : filter === "boundary" ? "Boundary" : "Process"}
            </button>
          ))}
        </div>
        <div className="relationship-scope" role="group" aria-label="Relationship expansion depth">
          <span>EXPAND</span>
          {([1, 2, "ecosystem"] as RelationshipScope[]).map((item) => <button type="button" aria-pressed={scope === item} onClick={() => setScope(item)} key={item}>{item === "ecosystem" ? "Ecosystem" : item === 1 ? "1-hop" : "2-hop"}</button>)}
        </div>
      </div>

      {explorerMode === "agent" ? (
        <>
          <div className="relationships-focus-layout">
            <div className="relationships-left-stack">
              {renderRoleSection("upstream", "UPSTREAM", "Кто предоставляет capability или данные до работы selected Agent?")}
              {renderRoleSection("broader", "PARENT / BROADER CAPABILITY", "Какая более широкая ответственность использует selected Agent как специализированную часть?")}
            </div>

            <article className="relationships-selected-agent" style={{ "--relation-layer": layerMeta[focusAgent.layer].color } as CSSProperties}>
              <div><span>SELECTED AGENT</span><b>{String(focusAgent.id).padStart(2, "0")} · {layerMeta[focusAgent.layer].name}</b></div>
              <i>{layerMeta[focusAgent.layer].mark}</i>
              <h4>{focusAgent.name}</h4>
              <p>{focusAgent.profile.simply}</p>
              <section><span>UNIQUE RESPONSIBILITY</span><strong>{focusAgent.profile.keyDistinction}</strong></section>
              <section><span>CANONICAL OUTPUT</span><strong>{focusAgent.output.primary}</strong><small>{focusAgent.output.consumers}</small></section>
              <section className="relationships-dataset-impact"><span>DATASET IMPACT</span><AgentDatasetImpactCell agent={focusAgent} compact /></section>
              <div className="relationships-selected-actions">
                <button type="button" onClick={() => onOpenAgent(focusAgent)}>Open profile ↗</button>
                <button type="button" aria-pressed={comparisonIds.includes(focusAgent.id)} onClick={() => onToggleCompare(focusAgent.id)}>{comparisonIds.includes(focusAgent.id) ? "✓ Selected" : "+ Compare"}</button>
              </div>
            </article>

            <div className="relationships-right-stack">
              {renderRoleSection("downstream", "DOWNSTREAM", "Кто использует результат selected Agent или продолжает relay?")}
              {renderRoleSection("specialized", "SPECIALIZED / CHILD CAPABILITIES", "Какие более узкие capabilities поддерживают selected Agent?")}
            </div>
          </div>

          <div className="relationships-lower-grid">
            {renderRoleSection("boundary", "ALTERNATIVES / RESPONSIBILITY BOUNDARIES", "Похожие Agents, которые нельзя считать взаимозаменяемыми без проверки границы.")}
            <section className="relationship-process-memberships">
              <header><div><span>PROCESSES</span><p>Case-scoped evidence: где этот Agent реально участвует как часть Process team.</p></div><b>{processMemberships.length}</b></header>
              <div>{processMemberships.length ? processMemberships.map((process) => <button type="button" onClick={() => { setFocusProcessId(process.id); setExplorerMode("process"); setRelationshipFilter("process"); }} key={process.id}><span>{process.id} · {process.kind}</span><strong>{process.name}</strong><small>{process.timing}</small></button>) : <p className="relationship-empty">В Process registry Case 1 участие не зафиксировано. Это не означает, что Agent не используется в Events или других Cases.</p>}</div>
            </section>
          </div>

          <section className="relationship-dataset-peers">
            <header><div><span>SHARED DATASET RESPONSIBILITY</span><p>Другие Agents, которые создают, обновляют или обогащают те же canonical Datasets. Совпадение — сигнал для проверки ownership, не автоматический overlap.</p></div><b>{datasetPeers.length}</b></header>
            <div>{datasetPeers.length ? datasetPeers.map((agent) => <button type="button" onClick={() => setFocusAgentId(agent.id)} key={agent.id}><span>{String(agent.id).padStart(2, "0")}</span><strong>{agent.name}</strong><small>{datasetImpactIdsForAgent(agent).filter((datasetId) => focusDatasetIds.has(datasetId)).length} shared</small></button>) : <p className="relationship-empty">Других Agents с тем же declared Dataset impact не найдено.</p>}</div>
          </section>

          {selectedRelationship && (
            <aside className={`relationship-detail-panel family-${selectedRelationship.family}`}>
              <header><div><span>WHY THIS RELATIONSHIP EXISTS</span><h4>{selectedRelationship.source.name} <i>→</i> {selectedRelationship.target.name}</h4></div><b>{relationshipFamilyMeta[selectedRelationship.family].label}</b></header>
              <div className="relationship-detail-grid">
                <section><span>RELATIONSHIP</span><strong>{relationshipFamilyMeta[selectedRelationship.family].description}</strong><small>{requirementLabels[selectedRelationship.requirement]} · {selectedRelationship.status.toUpperCase()}</small></section>
                <section><span>REASON</span><p>{selectedRelationship.rationale}</p></section>
                <section><span>PAYLOAD / ARTIFACT</span>{selectedRelationship.payloads.length ? <ul>{selectedRelationship.payloads.map((payload) => <li key={payload}>{payload}</li>)}</ul> : <p>Capability or boundary relationship; отдельный payload не заявлен.</p>}</section>
                <section><span>EVIDENCE</span><ul>{selectedRelationship.evidence.slice(0, 5).map((evidence) => <li key={evidence}>{evidence}</li>)}</ul></section>
              </div>
            </aside>
          )}

          {scope !== 1 && (
            <section className="relationship-broader-context">
              <header><div><span>{scope === 2 ? "2-HOP CONTEXT" : "BROADER ECOSYSTEM"}</span><p>Следующий круг связанности без отрисовки плотной «паутиной». Выберите Agent, чтобы сделать его новым фокусом.</p></div><b>{broaderContext.length}</b></header>
              <div>{broaderContext.length ? broaderContext.map(({ agent, hops }) => <button type="button" onClick={() => setFocusAgentId(agent.id)} style={{ "--relation-layer": layerMeta[agent.layer].color } as CSSProperties} key={agent.id}><span>{String(agent.id).padStart(2, "0")} · {hops} HOPS</span><strong>{agent.name}</strong><small>{agent.profile.simply}</small></button>) : <p className="relationship-empty">Дополнительные подтверждённые связи не найдены в текущих фильтрах.</p>}</div>
            </section>
          )}
        </>
      ) : selectedProcess ? (
        <section className="process-team-view">
          <header>
            <div><span>{selectedProcess.id} · {selectedProcess.kind.toUpperCase()} PROCESS</span><h3>{selectedProcess.name}</h3><p>{selectedProcess.purpose}</p></div>
            <dl><div><dt>OWNER</dt><dd>{case1ProcessGraph.actors.find((actor) => actor.id === selectedProcess.ownerActorId)?.shortName}</dd></div><div><dt>TRIGGER</dt><dd>{selectedProcess.trigger}</dd></div><div><dt>TIMING</dt><dd>{selectedProcess.timing}</dd></div><div><dt>STATE</dt><dd>{selectedProcess.state.toUpperCase()}</dd></div></dl>
          </header>
          <div className="process-team-flow">
            <section><span>PROCESS INPUTS</span>{selectedProcess.inputs.map((input) => <article key={input.name}><strong>{input.name}</strong><small>{input.sourceKind} · {input.availability}</small><b>{input.blocking ? "BLOCKING" : "NON-BLOCKING"}</b></article>)}</section>
            <i aria-hidden="true">→</i>
            <section className="process-team-agents"><span>AGENT TEAM</span>{selectedProcessExecutions.map((execution) => { const agent = agentById.get(execution.agentId)!; return <article key={execution.agentId} style={{ "--relation-layer": layerMeta[agent.layer].color } as CSSProperties}><div><b>{String(agent.id).padStart(2, "0")}</b><em>{tierLabels[getAgentTier(agent.id)]}</em></div><strong>{agent.name}</strong><p>{execution.role}</p><small><b>IN</b>{execution.input || "Process context"}</small><small><b>OUT</b>{execution.output || agent.output.primary}</small><button type="button" onClick={() => { setFocusAgentId(agent.id); setExplorerMode("agent"); setRelationshipFilter("all"); }}>Explore family →</button></article>; })}</section>
            <i aria-hidden="true">→</i>
            <section><span>PROCESS OUTPUTS</span>{selectedProcess.outputArtifactIds.map((artifactId) => { const artifact = case1ProcessGraph.artifacts.find((item) => item.id === artifactId); return <article key={artifactId}><strong>{artifact?.name ?? artifactId}</strong><small>{artifact?.persistence ?? "case-state"}</small><b>{selectedProcess.consumerRefs.join(" · ")}</b></article>; })}</section>
          </div>
          <p className="process-team-provenance"><b>CASE 1 CONTEXT:</b> Process membership is case-scoped evidence, not permanent ownership. Agents remain canonical roles and Processes remain separate first-class architectural nodes.</p>
        </section>
      ) : null}

      <footer className="relationships-validation-note">
        <div><span>ARCHITECTURE VALIDATION</span><strong>{relationshipGroups.length} resolved functional relation groups · {boundaryPairCount} boundary reviews · {unresolvedRelationshipCount} external/process endpoints</strong></div>
        <p>{isolatedAgents.length ? `${isolatedAgents.length} Agents remain isolated and require review.` : "Все 64 Agents имеют минимум одну resolved Agent-to-Agent relationship."} Mandatory/conditional companion и parallel collaboration не заявляются как постоянные связи без подтверждённого Process/Case evidence.</p>
      </footer>
    </section>
  );
}
