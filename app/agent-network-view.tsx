"use client";

import { useMemo, useState } from "react";
import { case1ProcessGraph } from "./case-simulation/case-1-graph";
import type { Agent } from "../packages/catalog-data/src/agents";
import { AgentReviewBadge, AgentReviewControl } from "./agent-workspace";
import { AgentReferenceText } from "./agent-reference-text";

type NetworkFilter = "all" | "supports" | "case" | "orchestrates";
type LayerMeta = Record<string, { name: string; color: string; mark: string }>;

type NetworkRelation = {
  agentId: number;
  kinds: Set<Exclude<NetworkFilter, "all">>;
  direction: "upstream" | "downstream";
  labels: string[];
  eventIds: string[];
};

function mergeRelation(target: Map<string, NetworkRelation>, relation: NetworkRelation) {
  const key = `${relation.direction}:${relation.agentId}`;
  const current = target.get(key);
  if (!current) {
    target.set(key, relation);
    return;
  }
  relation.kinds.forEach((kind) => current.kinds.add(kind));
  current.labels = [...new Set([...current.labels, ...relation.labels])];
  current.eventIds = [...new Set([...current.eventIds, ...relation.eventIds])];
}

export default function AgentNetworkView({
  allAgents,
  visibleAgents,
  supportMap,
  layerMeta,
  onOpenAgent,
  comparisonIds,
  onToggleCompare,
}: {
  allAgents: Agent[];
  visibleAgents: Agent[];
  supportMap: Record<number, number[]>;
  layerMeta: LayerMeta;
  onOpenAgent: (agent: Agent) => void;
  comparisonIds: number[];
  onToggleCompare: (agentId: number) => void;
}) {
  const [networkFilter, setNetworkFilter] = useState<NetworkFilter>("all");
  const [focusAgentId, setFocusAgentId] = useState(visibleAgents[0]?.id ?? 1);
  const agentById = useMemo(() => new Map(allAgents.map((agent) => [agent.id, agent])), [allAgents]);
  const agentByName = useMemo(() => new Map(allAgents.map((agent) => [agent.name, agent])), [allAgents]);
  const visibleIds = useMemo(() => new Set(visibleAgents.map((agent) => agent.id)), [visibleAgents]);

  const focusAgent = visibleIds.has(focusAgentId) ? agentById.get(focusAgentId) : visibleAgents[0];
  const network = useMemo(() => {
    if (!focusAgent) return { upstream: [] as NetworkRelation[], downstream: [] as NetworkRelation[], activities: [] as typeof case1ProcessGraph.activities };
    const relations = new Map<string, NetworkRelation>();
    const observedActivities = case1ProcessGraph.activities.filter((activity) => activity.agentNames.includes(focusAgent.name));
    const observedActivityIds = new Set(observedActivities.map((activity) => activity.id));

    for (const parentId of supportMap[focusAgent.id] ?? []) {
      if (visibleIds.has(parentId)) mergeRelation(relations, { agentId: parentId, kinds: new Set(["supports"]), direction: "upstream", labels: ["Functional Main support"], eventIds: [] });
    }
    for (const [childIdText, parentIds] of Object.entries(supportMap)) {
      const childId = Number(childIdText);
      if (parentIds.includes(focusAgent.id) && visibleIds.has(childId)) mergeRelation(relations, { agentId: childId, kinds: new Set(["supports"]), direction: "downstream", labels: ["Supporting capability"], eventIds: [] });
    }

    for (const edge of case1ProcessGraph.relationships) {
      if (observedActivityIds.has(edge.to)) {
        const sourceActivity = case1ProcessGraph.activities.find((activity) => activity.id === edge.from)!;
        for (const name of sourceActivity.agentNames) {
          const agent = agentByName.get(name);
          if (agent && agent.id !== focusAgent.id && visibleIds.has(agent.id)) mergeRelation(relations, { agentId: agent.id, kinds: new Set(["case"]), direction: "upstream", labels: [edge.label], eventIds: [`E${String(sourceActivity.eventStep).padStart(2, "0")}`] });
        }
      }
      if (observedActivityIds.has(edge.from)) {
        const targetActivity = case1ProcessGraph.activities.find((activity) => activity.id === edge.to)!;
        for (const name of targetActivity.agentNames) {
          const agent = agentByName.get(name);
          if (agent && agent.id !== focusAgent.id && visibleIds.has(agent.id)) mergeRelation(relations, { agentId: agent.id, kinds: new Set(["case"]), direction: "downstream", labels: [edge.label], eventIds: [`E${String(targetActivity.eventStep).padStart(2, "0")}`] });
        }
      }
    }

    const orchestratorId = case1ProcessGraph.orchestratorAgentIds[0];
    if (focusAgent.id === orchestratorId) {
      const engagedNames = new Set(case1ProcessGraph.activities.flatMap((activity) => activity.agentNames));
      for (const name of engagedNames) {
        const agent = agentByName.get(name);
        if (agent && agent.id !== focusAgent.id && visibleIds.has(agent.id)) mergeRelation(relations, { agentId: agent.id, kinds: new Set(["orchestrates"]), direction: "downstream", labels: ["Case 1 bounded execution"], eventIds: case1ProcessGraph.activities.filter((activity) => activity.agentNames.includes(name)).map((activity) => `E${String(activity.eventStep).padStart(2, "0")}`) });
      }
    } else if (observedActivities.length && visibleIds.has(orchestratorId)) {
      mergeRelation(relations, { agentId: orchestratorId, kinds: new Set(["orchestrates"]), direction: "upstream", labels: ["Case 1 orchestration context"], eventIds: observedActivities.map((activity) => `E${String(activity.eventStep).padStart(2, "0")}`) });
    }

    const filtered = [...relations.values()].filter((relation) => networkFilter === "all" || relation.kinds.has(networkFilter));
    return {
      upstream: filtered.filter((relation) => relation.direction === "upstream").sort((a, b) => a.agentId - b.agentId),
      downstream: filtered.filter((relation) => relation.direction === "downstream").sort((a, b) => a.agentId - b.agentId),
      activities: observedActivities,
    };
  }, [agentByName, focusAgent, networkFilter, supportMap, visibleIds]);

  if (!focusAgent) return null;

  const renderRelation = (relation: NetworkRelation) => {
    const agent = agentById.get(relation.agentId)!;
    const meta = layerMeta[agent.layer];
    return (
      <button type="button" className="network-agent-node" onClick={() => setFocusAgentId(agent.id)} style={{ "--layer-color": meta.color } as React.CSSProperties} key={`${relation.direction}-${agent.id}`}>
        <span><i>{String(agent.id).padStart(2, "0")}</i><small>{meta.name}</small></span>
        <strong>{agent.name}</strong>
        <p>{relation.labels.slice(0, 2).join(" · ")}</p>
        <div>{[...relation.kinds].map((kind) => <em className={`relation-${kind}`} key={kind}>{kind === "supports" ? "SUPPORT" : kind === "case" ? "CASE HANDOFF" : "ORCHESTRATES"}</em>)}<AgentReviewBadge agentId={agent.id} />{relation.eventIds.length > 0 && <b>{relation.eventIds.slice(0, 4).join(" · ")}{relation.eventIds.length > 4 ? ` +${relation.eventIds.length - 4}` : ""}</b>}</div>
      </button>
    );
  };

  return (
    <section className="agent-network-view" aria-label="Agent Orchestration Network">
      <header className="network-toolbar">
        <div><span>AGENT ORCHESTRATION NETWORK</span><p>Functional support и наблюдаемые Case 1 handoffs показаны разными типами связей.</p></div>
        <label><span>FOCUS AGENT</span><select value={focusAgent.id} onChange={(event) => setFocusAgentId(Number(event.target.value))}>{visibleAgents.map((agent) => <option value={agent.id} key={agent.id}>{String(agent.id).padStart(2, "0")} · {agent.name}</option>)}</select></label>
        <div className="network-filter" role="group" aria-label="Relationship type">
          {(["all", "supports", "case", "orchestrates"] as NetworkFilter[]).map((filter) => <button type="button" aria-pressed={networkFilter === filter} onClick={() => setNetworkFilter(filter)} key={filter}>{filter === "all" ? "All relations" : filter === "supports" ? "Support" : filter === "case" ? "Case handoff" : "Orchestration"}</button>)}
        </div>
      </header>

      <div className="network-map">
        <section className="network-column network-upstream"><header><span>INPUTS / UPSTREAM</span><b>{network.upstream.length}</b></header><div>{network.upstream.length ? network.upstream.map(renderRelation) : <p className="network-empty">Нет связей в текущем фильтре.</p>}</div></section>
        <div className="network-direction" aria-hidden="true"><span>→</span><small>INPUT</small></div>
        <article className="network-focus-card" style={{ "--layer-color": layerMeta[focusAgent.layer].color } as React.CSSProperties}>
          <div><span>{String(focusAgent.id).padStart(2, "0")} · {layerMeta[focusAgent.layer].name}</span><b>FOCUS</b></div>
          <i>{layerMeta[focusAgent.layer].mark}</i>
          <h3>{focusAgent.name}</h3>
          <p>{focusAgent.profile.simply}</p>
          <div className="network-focus-boundary"><span>KEY DISTINCTION</span><strong><AgentReferenceText text={focusAgent.profile.keyDistinction} subjectAgentId={focusAgent.id} onOpenAgent={onOpenAgent} /></strong></div>
          <AgentReviewControl agentId={focusAgent.id} canonicalRegistryId={focusAgent.registryId} />
          <section><span>RESULT / OUTPUT</span><strong>{focusAgent.output.primary}</strong><small><AgentReferenceText text={focusAgent.output.consumers} subjectAgentId={focusAgent.id} onOpenAgent={onOpenAgent} /></small></section>
          <div className="network-focus-actions">
            <button type="button" onClick={() => onOpenAgent(focusAgent)}>Open canonical profile ↗</button>
            <button type="button" aria-pressed={comparisonIds.includes(focusAgent.id)} onClick={() => onToggleCompare(focusAgent.id)}>{comparisonIds.includes(focusAgent.id) ? "✓ Selected" : "+ Compare"}</button>
          </div>
        </article>
        <div className="network-direction" aria-hidden="true"><span>→</span><small>OUTPUT</small></div>
        <section className="network-column network-downstream"><header><span>OUTPUTS / DOWNSTREAM</span><b>{network.downstream.length}</b></header><div>{network.downstream.length ? network.downstream.map(renderRelation) : <p className="network-empty">Нет связей в текущем фильтре.</p>}</div></section>
      </div>

      <div className="network-case-evidence">
        <header><span>CASE 1 · OBSERVED PARTICIPATION</span><b>{network.activities.length} events</b></header>
        {network.activities.length ? <div>{network.activities.map((activity) => <article key={activity.id}><span>E{String(activity.eventStep).padStart(2, "0")}</span><b>{activity.title}</b><small>{activity.period} · {activity.stateLabel}</small></article>)}</div> : <p>Этот Agent не был активирован в текущем Case 1. Functional relationships остаются видимыми независимо от case participation.</p>}
      </div>
      <p className="network-provenance"><b>SEMANTICS:</b> Support = canonical functional grouping · Case handoff = observed in Case 1 · Orchestration = bounded execution, not permanent ownership.</p>
    </section>
  );
}
