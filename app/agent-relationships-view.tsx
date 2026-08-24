"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import type {
  AgentRelationship,
  AgentRelationshipFamily,
  AgentRelationshipRequirement,
} from "../packages/catalog-schema/src/agent-specification";
import { agentRelationships, getAgentTier, tierLabels, type Agent } from "../packages/catalog-data/src";
import { case1ProcessGraph } from "./case-simulation/case-1-graph";

type LayerMeta = Record<string, { name: string; color: string; mark: string }>;

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

type GraphNode = {
  agent: Agent;
  x: number;
  y: number;
  width: number;
  height: number;
  degree: number;
};

type Camera = { x: number; y: number; scale: number };

const GRAPH_WIDTH = 2440;
const GRAPH_HEIGHT = 1320;
const NODE_WIDTH = 214;
const NODE_HEIGHT = 64;
const MIN_SCALE = 0.68;
const MAX_SCALE = 2.7;

const familyMeta: Record<AgentRelationshipFamily, { label: string; short: string; color: string; description: string }> = {
  capability: { label: "PARENT / SPECIALIZED", short: "Parent / Child", color: "#826fe5", description: "Более узкая capability поддерживает более широкую bounded responsibility." },
  dependency: { label: "PRODUCER → CONSUMER", short: "Dependency", color: "#2a9bd8", description: "Consumer требует upstream input или capability другого Agent." },
  sequence: { label: "SEQUENTIAL / RELAY", short: "Sequential", color: "#149873", description: "Producer передаёт конкретный output следующему Agent." },
  boundary: { label: "BOUNDARY / OVERLAP", short: "Boundary", color: "#e69b27", description: "Роли похожи, но имеют различающиеся границы ответственности." },
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
    const pair = relationship.family === "boundary" ? [source.registryId, target.registryId].sort().join("--") : `${source.registryId}--${target.registryId}`;
    const key = `${relationship.family}:${pair}`;
    grouped.set(key, [...(grouped.get(key) ?? []), relationship]);
  }
  return [...grouped.entries()].map(([id, relationships]): RelationshipGroup => {
    const first = relationships[0];
    return {
      id,
      family: first.family,
      source: agentByRegistryId.get(first.source.ref)!,
      target: agentByRegistryId.get(first.target.ref)!,
      relationships,
      requirement: strongestRequirement(relationships),
      rationale: relationships.map((item) => item.rationale).filter((value, index, values) => values.indexOf(value) === index).join(" "),
      evidence: relationships.flatMap((item) => item.evidence).filter((value, index, values) => values.indexOf(value) === index),
      payloads: relationships.flatMap((item) => [item.payload, ...(item.artifacts ?? [])]).filter((value): value is string => Boolean(value)).filter((value, index, values) => values.indexOf(value) === index),
      status: strongestStatus(relationships),
    };
  });
}

function alternatingSlot(index: number) {
  if (index === 0) return 0;
  const distance = Math.ceil(index / 2);
  return index % 2 ? -distance : distance;
}

function computeGraphNodes(visibleAgents: Agent[], groups: RelationshipGroup[], layerMeta: LayerMeta): GraphNode[] {
  const visibleIds = new Set(visibleAgents.map((agent) => agent.id));
  const degree = new Map<number, number>();
  for (const group of groups) {
    if (!visibleIds.has(group.source.id) || !visibleIds.has(group.target.id)) continue;
    degree.set(group.source.id, (degree.get(group.source.id) ?? 0) + 1);
    degree.set(group.target.id, (degree.get(group.target.id) ?? 0) + 1);
  }
  const layerKeys = Object.keys(layerMeta).filter((layer) => visibleAgents.some((agent) => agent.layer === layer));
  const xStep = layerKeys.length > 1 ? (GRAPH_WIDTH - 280) / (layerKeys.length - 1) : 0;
  const nodes: GraphNode[] = [];
  layerKeys.forEach((layer, layerIndex) => {
    const layerAgents = visibleAgents.filter((agent) => agent.layer === layer).sort((left, right) => {
      const tierRank = { main: 0, specialized: 1, optional: 2 };
      return tierRank[getAgentTier(left.id)] - tierRank[getAgentTier(right.id)] || (degree.get(right.id) ?? 0) - (degree.get(left.id) ?? 0) || left.id - right.id;
    });
    const spacing = Math.min(106, 1090 / Math.max(1, layerAgents.length - 1));
    layerAgents.forEach((agent, index) => {
      const tier = getAgentTier(agent.id);
      nodes.push({ agent, x: 140 + layerIndex * xStep, y: GRAPH_HEIGHT / 2 + alternatingSlot(index) * spacing, width: tier === "main" ? NODE_WIDTH + 16 : NODE_WIDTH, height: tier === "main" ? NODE_HEIGHT + 6 : NODE_HEIGHT, degree: degree.get(agent.id) ?? 0 });
    });
  });
  return nodes;
}

function graphPath(source: GraphNode, target: GraphNode) {
  if (source.agent.layer === target.agent.layer) {
    const direction = source.y < target.y ? 1 : -1;
    const bendX = source.x + direction * (source.width * 0.72 + 32);
    return `M ${source.x} ${source.y} C ${bendX} ${source.y}, ${bendX} ${target.y}, ${target.x} ${target.y}`;
  }
  const sourceRight = target.x > source.x;
  const sx = source.x + (sourceRight ? source.width / 2 : -source.width / 2);
  const tx = target.x + (sourceRight ? -target.width / 2 : target.width / 2);
  const midX = (sx + tx) / 2;
  return `M ${sx} ${source.y} C ${midX} ${source.y}, ${midX} ${target.y}, ${tx} ${target.y}`;
}

function compactName(name: string) {
  const words = name.replace(/ Agent$/, "").split(" ");
  if (words.length <= 3) return [words.join(" ")];
  const split = Math.ceil(words.length / 2);
  return [words.slice(0, split).join(" "), words.slice(split).join(" ")];
}

function shortestPath(start: number, end: number, groups: RelationshipGroup[]) {
  const adjacency = new Map<number, { id: number; edgeId: string }[]>();
  for (const group of groups) {
    adjacency.set(group.source.id, [...(adjacency.get(group.source.id) ?? []), { id: group.target.id, edgeId: group.id }]);
    adjacency.set(group.target.id, [...(adjacency.get(group.target.id) ?? []), { id: group.source.id, edgeId: group.id }]);
  }
  const queue = [start];
  const previous = new Map<number, { id: number; edgeId: string }>();
  const visited = new Set([start]);
  while (queue.length) {
    const current = queue.shift()!;
    if (current === end) break;
    for (const neighbor of adjacency.get(current) ?? []) {
      if (visited.has(neighbor.id)) continue;
      visited.add(neighbor.id);
      previous.set(neighbor.id, { id: current, edgeId: neighbor.edgeId });
      queue.push(neighbor.id);
    }
  }
  if (!visited.has(end)) return { nodeIds: new Set<number>(), edgeIds: new Set<string>() };
  const nodeIds = new Set<number>([end]);
  const edgeIds = new Set<string>();
  let cursor = end;
  while (cursor !== start) {
    const step = previous.get(cursor)!;
    nodeIds.add(step.id);
    edgeIds.add(step.edgeId);
    cursor = step.id;
  }
  return { nodeIds, edgeIds };
}

export default function AgentRelationshipsView({ allAgents, visibleAgents, layerMeta, onOpenAgent, comparisonIds, onToggleCompare }: {
  allAgents: Agent[];
  visibleAgents: Agent[];
  layerMeta: LayerMeta;
  onOpenAgent: (agent: Agent) => void;
  comparisonIds: number[];
  onToggleCompare: (agentId: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const focusToggleRef = useRef<HTMLButtonElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; camera: Camera } | null>(null);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [selectedAgentIds, setSelectedAgentIds] = useState<number[]>([]);
  const [hoverAgentId, setHoverAgentId] = useState<number | null>(null);
  const [selectedRelationshipId, setSelectedRelationshipId] = useState<string | null>(null);
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, scale: 1 });

  const allGroups = useMemo(() => groupResolvedRelationships(allAgents), [allAgents]);
  const visibleIds = useMemo(() => new Set(visibleAgents.map((agent) => agent.id)), [visibleAgents]);
  const groups = useMemo(() => allGroups.filter((group) => visibleIds.has(group.source.id) && visibleIds.has(group.target.id)), [allGroups, visibleIds]);
  const nodes = useMemo(() => computeGraphNodes(visibleAgents, groups, layerMeta), [groups, layerMeta, visibleAgents]);
  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.agent.id, node])), [nodes]);
  const agentById = useMemo(() => new Map(allAgents.map((agent) => [agent.id, agent])), [allAgents]);
  const selectedRelationship = groups.find((group) => group.id === selectedRelationshipId) ?? null;
  const selectedProcess = case1ProcessGraph.processes.find((process) => process.id === selectedProcessId) ?? null;
  const hoveredAgent = hoverAgentId ? agentById.get(hoverAgentId) : null;
  const primaryAgent = selectedAgentIds[0] ? agentById.get(selectedAgentIds[0]) : null;
  const secondaryAgent = selectedAgentIds[1] ? agentById.get(selectedAgentIds[1]) : null;
  const pathSelection = useMemo(() => selectedAgentIds.length === 2 ? shortestPath(selectedAgentIds[0], selectedAgentIds[1], groups) : { nodeIds: new Set<number>(), edgeIds: new Set<string>() }, [groups, selectedAgentIds]);
  const directIds = useMemo(() => {
    const ids = new Set(selectedAgentIds);
    if (selectedProcess) selectedProcess.agentIds.forEach((id) => ids.add(id));
    for (const group of groups) {
      if (selectedAgentIds.includes(group.source.id)) ids.add(group.target.id);
      if (selectedAgentIds.includes(group.target.id)) ids.add(group.source.id);
    }
    pathSelection.nodeIds.forEach((id) => ids.add(id));
    return ids;
  }, [groups, pathSelection.nodeIds, selectedAgentIds, selectedProcess]);
  const directlyRelatedGroups = useMemo(() => primaryAgent ? groups.filter((group) => group.source.id === primaryAgent.id || group.target.id === primaryAgent.id) : [], [groups, primaryAgent]);
  const processRegions = useMemo(() => case1ProcessGraph.processes.map((process) => {
    const members = process.agentIds.map((id) => nodeById.get(id)).filter((node): node is GraphNode => Boolean(node));
    if (!members.length) return null;
    const minX = Math.max(18, Math.min(...members.map((node) => node.x - node.width / 2)) - 34);
    const maxX = Math.min(GRAPH_WIDTH - 18, Math.max(...members.map((node) => node.x + node.width / 2)) + 34);
    const minY = Math.max(42, Math.min(...members.map((node) => node.y - node.height / 2)) - 38);
    const maxY = Math.min(GRAPH_HEIGHT - 20, Math.max(...members.map((node) => node.y + node.height / 2)) + 38);
    return { process, x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }).filter((region): region is NonNullable<typeof region> => Boolean(region)), [nodeById]);

  const resetFocus = () => { setSelectedAgentIds([]); setSelectedRelationshipId(null); setSelectedProcessId(null); };
  const selectAgent = (agentId: number) => {
    setSelectedRelationshipId(null);
    setSelectedProcessId(null);
    setSelectedAgentIds((current) => {
      if (current.length === 0) return [agentId];
      if (current.length === 1) return current[0] === agentId ? [] : [current[0], agentId];
      if (current.includes(agentId)) return current.filter((id) => id !== agentId);
      return [agentId];
    });
  };
  const changeZoom = (factor: number) => {
    setCamera((current) => {
      const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, current.scale * factor));
      const ratio = scale / current.scale;
      return { scale, x: GRAPH_WIDTH / 2 - (GRAPH_WIDTH / 2 - current.x) * ratio, y: GRAPH_HEIGHT / 2 - (GRAPH_HEIGHT / 2 - current.y) * ratio };
    });
  };
  const onWheel = (event: ReactWheelEvent<SVGSVGElement>) => { event.preventDefault(); changeZoom(event.deltaY < 0 ? 1.12 : 0.89); };
  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, camera };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    const svg = svgRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !svg) return;
    const rect = svg.getBoundingClientRect();
    setCamera({ ...drag.camera, x: drag.camera.x + (event.clientX - drag.x) * (GRAPH_WIDTH / rect.width), y: drag.camera.y + (event.clientY - drag.y) * (GRAPH_HEIGHT / rect.height) });
  };
  const onPointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const hasSelection = Boolean(selectedAgentIds.length || selectedProcess || selectedRelationship);
  const unresolvedRelationshipCount = agentRelationships.filter((relationship) => relationship.source.kind !== "agent" || relationship.target.kind !== "agent").length;

  useEffect(() => {
    if (!isFocusMode) return;
    const previousBodyOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsFocusMode(false);
      window.requestAnimationFrame(() => focusToggleRef.current?.focus());
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isFocusMode]);

  return (
    <section
      className={`agent-relationships-view relationships-ecosystem ${isFocusMode ? "is-focus-mode" : ""}`.trim()}
      aria-label="Full Agent functional relationship map"
      aria-modal={isFocusMode || undefined}
      data-focus-mode={isFocusMode ? "active" : "inactive"}
      role={isFocusMode ? "dialog" : undefined}
    >
      <header className="relationships-map-header">
        <div><span>FUNCTIONAL ECOSYSTEM · 64 AGENTS</span><h3>Agent Relationships Map</h3><p>Полная архитектура видна одновременно. Положение каждого Agent вычислено из canonical layer, tier, centrality и relationship records; Process contours показывают case-scoped teams без превращения Processes в Agents.</p></div>
        <div className="relationships-map-header-actions">
          <dl><div><dt>VISIBLE</dt><dd>{visibleAgents.length}<small> / {allAgents.length}</small></dd></div><div><dt>RELATIONS</dt><dd>{groups.length}</dd></div><div><dt>PROCESSES</dt><dd>{processRegions.length}</dd></div></dl>
          <button
            ref={focusToggleRef}
            type="button"
            className="relationships-focus-mode-toggle"
            aria-label={isFocusMode ? "Выйти из Focus Mode" : "Открыть Relationships в Focus Mode"}
            aria-pressed={isFocusMode}
            onClick={() => setIsFocusMode((current) => !current)}
            title={isFocusMode ? "Свернуть карту (Esc)" : "Развернуть карту на весь экран"}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d={isFocusMode ? "M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" : "M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5"} /></svg>
            <b>{isFocusMode ? "Exit Focus" : "Focus Mode"}</b>
            {isFocusMode ? <small>Esc</small> : null}
          </button>
        </div>
      </header>

      <div className="relationships-map-legend" aria-label="Relationship map legend">
        {(Object.keys(familyMeta) as AgentRelationshipFamily[]).map((family) => <span className={`legend-${family}`} key={family}><i />{familyMeta[family].short}</span>)}
        <span className="legend-process"><i />Shared Process / parallel context</span><span className="legend-required"><i />Required connector</span><small>Клик Agent: family · второй клик: shortest path · клик связи: evidence · пустое поле: reset</small>
      </div>

      <div className="relationships-map-shell">
        <div className="relationships-map-controls" aria-label="Map zoom controls"><button type="button" onClick={() => changeZoom(1.18)} aria-label="Zoom in">+</button><button type="button" onClick={() => changeZoom(0.84)} aria-label="Zoom out">−</button><button type="button" onClick={() => setCamera({ x: 0, y: 0, scale: 1 })}>FIT</button>{hasSelection && <button type="button" onClick={resetFocus}>RESET FOCUS</button>}</div>
        {(hoveredAgent || primaryAgent || selectedProcess) && <aside className="relationships-map-hover-card">
          {selectedProcess ? <><span>{selectedProcess.id} · {selectedProcess.kind.toUpperCase()} PROCESS</span><strong>{selectedProcess.name}</strong><p>{selectedProcess.purpose}</p><small>{selectedProcess.agentIds.length} Agents · {selectedProcess.timing}</small></> : (hoveredAgent ?? primaryAgent) ? <><span>AGENT {String((hoveredAgent ?? primaryAgent)!.id).padStart(2, "0")} · {tierLabels[getAgentTier((hoveredAgent ?? primaryAgent)!.id)]}</span><strong>{(hoveredAgent ?? primaryAgent)!.name}</strong><p>{(hoveredAgent ?? primaryAgent)!.profile.simply}</p><small>{(hoveredAgent ?? primaryAgent)!.output.primary}</small></> : null}
        </aside>}

        <svg ref={svgRef} className="relationships-map-canvas" viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`} role="img" aria-label={`Functional relationship map with ${visibleAgents.length} Agents`} onWheel={onWheel} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onClick={(event) => { if (event.target === event.currentTarget) resetFocus(); }}>
          <defs>{(Object.keys(familyMeta) as AgentRelationshipFamily[]).map((family) => <marker id={`relationship-arrow-${family}`} key={family} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill={familyMeta[family].color} /></marker>)}</defs>
          <g className="relationships-map-world" transform={`translate(${camera.x} ${camera.y}) scale(${camera.scale})`}>
            {Object.entries(layerMeta).map(([layer, meta], index) => {
              const layerNodes = nodes.filter((node) => node.agent.layer === layer);
              if (!layerNodes.length) return null;
              const x = layerNodes[0].x;
              return <g className="relationships-layer-guide" key={layer}><line x1={x} y1="40" x2={x} y2={GRAPH_HEIGHT - 30} stroke={meta.color} /><text x={x} y="31" textAnchor="middle">{String(index + 1).padStart(2, "0")} · {meta.name.toUpperCase()}</text></g>;
            })}
            <g className="relationships-process-regions">{processRegions.map(({ process, x, y, width, height }, index) => {
              const active = selectedProcessId === process.id;
              const muted = hasSelection && !active && !process.agentIds.some((id) => directIds.has(id));
              return <g className={`${active ? "is-active" : ""} ${muted ? "is-muted" : ""}`.trim()} key={process.id} onClick={(event) => { event.stopPropagation(); setSelectedAgentIds([]); setSelectedRelationshipId(null); setSelectedProcessId(active ? null : process.id); }} role="button" tabIndex={0} aria-label={`${process.id}: ${process.name}`} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelectedProcessId(active ? null : process.id); }}><rect className="process-region-outline" x={x} y={y} width={width} height={height} rx="30" style={{ "--process-index": index } as CSSProperties} /><text className="process-region-label" x={x + 18} y={y + 24 + index * 17}>{process.id} · {process.kind.toUpperCase()} · {process.name}</text></g>;
            })}</g>
            <g className="relationships-map-edges">{groups.map((group) => {
              const source = nodeById.get(group.source.id)!;
              const target = nodeById.get(group.target.id)!;
              const direct = selectedAgentIds.some((id) => group.source.id === id || group.target.id === id);
              const onPath = pathSelection.edgeIds.has(group.id);
              const active = group.id === selectedRelationshipId || direct || onPath;
              const muted = hasSelection && !active && !directIds.has(group.source.id) && !directIds.has(group.target.id);
              const path = graphPath(source, target);
              return <g className={`relationship-map-edge family-${group.family} req-${group.requirement} ${active ? "is-active" : ""} ${muted ? "is-muted" : ""}`.trim()} key={group.id}><path className="relationship-edge-line" d={path} markerEnd={group.family === "boundary" ? undefined : `url(#relationship-arrow-${group.family})`} /><path className="relationship-edge-hit" d={path} onClick={(event) => { event.stopPropagation(); setSelectedRelationshipId(group.id); setSelectedProcessId(null); setSelectedAgentIds([group.source.id, group.target.id]); }}><title>{group.source.name} → {group.target.name}\n{familyMeta[group.family].label}\n{group.rationale}</title></path></g>;
            })}</g>
            <g className="relationships-map-nodes">{nodes.map((node) => {
              const { agent } = node;
              const selected = selectedAgentIds.includes(agent.id);
              const related = directIds.has(agent.id);
              const muted = hasSelection && !selected && !related;
              const tier = getAgentTier(agent.id);
              const lines = compactName(agent.name);
              return <g className={`relationship-map-node tier-${tier} ${selected ? "is-selected" : ""} ${related ? "is-related" : ""} ${muted ? "is-muted" : ""}`.trim()} transform={`translate(${node.x} ${node.y})`} style={{ "--node-layer": layerMeta[agent.layer].color } as CSSProperties} key={agent.id} role="button" tabIndex={0} aria-label={`Agent ${agent.id}: ${agent.name}`} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); selectAgent(agent.id); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") selectAgent(agent.id); }} onMouseEnter={() => setHoverAgentId(agent.id)} onMouseLeave={() => setHoverAgentId(null)}><title>Agent {String(agent.id).padStart(2, "0")} · {agent.name}\n{agent.profile.simply}\n{node.degree} canonical connections</title><rect x={-node.width / 2} y={-node.height / 2} width={node.width} height={node.height} rx="13" /><circle cx={-node.width / 2 + 25} cy="0" r="15" /><text className="node-id" x={-node.width / 2 + 25} y="4" textAnchor="middle">{String(agent.id).padStart(2, "0")}</text><text className="node-name" x={-node.width / 2 + 51} y={lines.length === 1 ? 4 : -4}>{lines.map((line, index) => <tspan x={-node.width / 2 + 51} dy={index ? 15 : 0} key={line}>{line}</tspan>)}</text><text className="node-degree" x={node.width / 2 - 10} y={-node.height / 2 + 13} textAnchor="end">{node.degree}</text></g>;
            })}</g>
          </g>
        </svg>
      </div>

      {(primaryAgent || selectedRelationship || selectedProcess) && <aside className="relationships-map-inspector">
        {selectedRelationship ? <><div className={`relationship-inspector-type family-${selectedRelationship.family}`}><span>{familyMeta[selectedRelationship.family].label}</span><b>{requirementLabels[selectedRelationship.requirement]} · {selectedRelationship.status.toUpperCase()}</b></div><section><span>RELATIONSHIP</span><h4>{selectedRelationship.source.name} <i>→</i> {selectedRelationship.target.name}</h4><p>{familyMeta[selectedRelationship.family].description}</p></section><section><span>WHY / EVIDENCE</span><p>{selectedRelationship.rationale}</p><small>{selectedRelationship.evidence.slice(0, 3).join(" · ")}</small></section><section><span>PAYLOAD / HANDOFF</span><p>{selectedRelationship.payloads.join(" · ") || "Capability or boundary relationship; отдельный payload не заявлен."}</p></section></> : selectedProcess ? <><div className="relationship-inspector-type family-process"><span>PROCESS → AGENTS</span><b>{selectedProcess.kind.toUpperCase()}</b></div><section><span>{selectedProcess.id}</span><h4>{selectedProcess.name}</h4><p>{selectedProcess.purpose}</p></section><section><span>TRIGGER / TIMING</span><p>{selectedProcess.trigger}</p><small>{selectedProcess.timing}</small></section><section><span>FUNCTIONAL TEAM</span><p>{selectedProcess.agentIds.map((id) => `${String(id).padStart(2, "0")} · ${agentById.get(id)?.name}`).join(" · ")}</p></section></> : primaryAgent ? <><div className="relationship-inspector-type family-agent"><span>SELECTED AGENT</span><b>{directlyRelatedGroups.length} DIRECT RELATIONS</b></div><section><span>AGENT {String(primaryAgent.id).padStart(2, "0")} · {layerMeta[primaryAgent.layer].name}</span><h4>{primaryAgent.name}</h4><p>{primaryAgent.profile.keyDistinction}</p></section><section><span>OUTPUT / DOWNSTREAM</span><p>{primaryAgent.output.primary}</p><small>{primaryAgent.output.consumers}</small></section><section className="relationship-inspector-actions"><span>{secondaryAgent ? `PATH TO AGENT ${String(secondaryAgent.id).padStart(2, "0")} · ${pathSelection.edgeIds.size} HOPS` : "SELECT ANOTHER AGENT TO TRACE A PATH"}</span><button type="button" onClick={() => onOpenAgent(primaryAgent)}>Open profile ↗</button><button type="button" aria-pressed={comparisonIds.includes(primaryAgent.id)} onClick={() => onToggleCompare(primaryAgent.id)}>{comparisonIds.includes(primaryAgent.id) ? "✓ Compare selected" : "+ Compare"}</button></section></> : null}
      </aside>}

      <footer className="relationships-map-validation"><span>CANONICAL MODEL</span><strong>{allGroups.length} resolved functional relation groups · {unresolvedRelationshipCount} external/process endpoints · {case1ProcessGraph.processes.length} explicit Process teams</strong><p>Связи и расположение не создаются вручную в UI. Isolated Agents сохраняются как isolated; Process membership остаётся case-scoped evidence, а не постоянной Agent ownership.</p></footer>
    </section>
  );
}
