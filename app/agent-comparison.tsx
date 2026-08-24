"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  agentSearchText,
  agents,
  getAgentTier,
  layerById,
  platformSideLabels,
  subagentParentIds,
  tierLabels,
  type Agent,
} from "../packages/catalog-data/src/agents";
import { AgentReviewBadge } from "./agent-workspace";
import { AgentReferenceButton, AgentReferenceList, AgentReferenceText } from "./agent-reference-text";
import { AgentDatasetImpactCell, datasetImpactIdsForAgent } from "./agent-dataset-impact";

export type ComparisonTone = "unique" | "overlap" | "boundary" | "duplicate";

export type PairAnalysis = {
  agentId: number;
  score: number;
  tone: ComparisonTone;
  label: string;
  evidence: string[];
};

const stopWords = new Set([
  "agent", "and", "the", "для", "или", "и", "в", "на", "по", "из", "с", "к", "а", "о", "до", "result", "output",
  "agents", "tender", "tenders", "company", "данные", "документы", "решения", "проверяет", "создает", "создаёт", "формирует",
]);

function words(value: string) {
  return new Set(value
    .toLocaleLowerCase("ru-RU")
    .replace(/[^a-zа-яё0-9]+/gi, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.has(word)));
}

function overlapRatio(left: Set<string>, right: Set<string>) {
  if (!left.size || !right.size) return 0;
  const shared = [...left].filter((item) => right.has(item)).length;
  return shared / Math.min(left.size, right.size);
}

function sharedValues<T>(left: Set<T>, right: Set<T>) {
  return [...left].filter((item) => right.has(item));
}

function splitConsumers(value: string) {
  return new Set(value.split("·").map((item) => item.trim()).filter(Boolean));
}

function parentsOf(agent: Agent) {
  return new Set(subagentParentIds[agent.id] ?? []);
}

function childrenOf(agent: Agent) {
  return agents.filter((candidate) => subagentParentIds[candidate.id]?.includes(agent.id));
}

export function analyzeAgentPair(left: Agent, right: Agent): PairAnalysis {
  const purposeOverlap = overlapRatio(
    words([left.description, left.profile.responsibilityScope, ...left.profile.activities, left.profile.keyDistinction].join(" ")),
    words([right.description, right.profile.responsibilityScope, ...right.profile.activities, right.profile.keyDistinction].join(" ")),
  );
  const outputOverlap = overlapRatio(
    words([left.output.primary, ...left.output.artifacts].join(" ")),
    words([right.output.primary, ...right.output.artifacts].join(" ")),
  );
  const sharedConsumers = sharedValues(splitConsumers(left.output.consumers), splitConsumers(right.output.consumers));
  const sharedParents = sharedValues(parentsOf(left), parentsOf(right));
  const sharedSides = left.platformSides.filter((side) => right.platformSides.includes(side));
  const sameLayer = left.layer === right.layer;
  const sameTier = getAgentTier(left.id) === getAgentTier(right.id);
  const score = Math.min(100, Math.round(
    purposeOverlap * 30 +
    outputOverlap * 30 +
    Math.min(sharedConsumers.length, 2) * 6 +
    Math.min(sharedParents.length, 2) * 7 +
    (sameLayer ? 8 : 0) +
    (sameTier ? 3 : 0) +
    Math.min(sharedSides.length, 2) * 3,
  ));

  let tone: ComparisonTone = "unique";
  let label = "Unique";
  if (score >= 65) {
    tone = "duplicate";
    label = "Potential duplication";
  } else if (score >= 45) {
    tone = "boundary";
    label = "Boundary issue";
  } else if (score >= 24) {
    tone = "overlap";
    label = "Overlap";
  }

  const evidence: string[] = [];
  if (purposeOverlap >= .25) evidence.push("схожая формулировка purpose");
  if (outputOverlap >= .25) evidence.push("сходные output terms");
  if (sameLayer) evidence.push(`общий слой ${layerById[left.layer].name}`);
  if (sharedConsumers.length) evidence.push(`общие consumers: ${sharedConsumers.slice(0, 2).join(", ")}`);
  if (sharedParents.length) evidence.push(`${sharedParents.length} общих Main parent`);
  if (sharedSides.length) evidence.push(`общая platform side: ${sharedSides.map((side) => platformSideLabels[side]).join(", ")}`);
  if (!evidence.length) evidence.push("явных общих сигналов в текущем registry не найдено");

  return { agentId: right.id, score, tone, label, evidence };
}

function ProfileList({ items, agent, onOpenAgent }: { items: string[]; agent: Agent; onOpenAgent?: (agent: Agent) => void }) {
  return <AgentReferenceList className="comparison-profile-list" items={items} subjectAgentId={agent.id} onOpenAgent={onOpenAgent} />;
}

function StructuredOverlapCell({ agent, onOpenAgent }: { agent: Agent; onOpenAgent?: (agent: Agent) => void }) {
  return (
    <div className="comparison-explicit-overlaps">
      {agent.profile.potentialOverlaps.map((finding) => (
        <article key={`${agent.id}-${finding.agentIds.join("-")}`}>
          <span className="comparison-overlap-references">{finding.agentIds.map((id) => {
            const counterpart = agents.find((candidate) => candidate.id === id);
            return counterpart ? <AgentReferenceButton key={id} agent={counterpart} onOpenAgent={onOpenAgent} /> : <i key={id}>{id}</i>;
          })}</span>
          <p><AgentReferenceText text={finding.note} subjectAgentId={agent.id} onOpenAgent={onOpenAgent} /></p>
        </article>
      ))}
    </div>
  );
}

function Signal({ analysis, compact = false, onOpenAgent }: { analysis: PairAnalysis; compact?: boolean; onOpenAgent?: (agent: Agent) => void }) {
  const counterpart = agents.find((agent) => agent.id === analysis.agentId)!;
  return (
    <div className={`comparison-signal signal-${analysis.tone} ${compact ? "is-compact" : ""}`.trim()}>
      <span>{analysis.label}<b>{analysis.score}/100</b></span>
      <strong><AgentReferenceButton agent={counterpart} onOpenAgent={onOpenAgent} /></strong>
      <p>{analysis.evidence.join(" · ")}</p>
    </div>
  );
}

function RelationshipCell({ agent, compact = false, onOpenAgent }: { agent: Agent; compact?: boolean; onOpenAgent?: (agent: Agent) => void }) {
  const parents = [...parentsOf(agent)].map((id) => agents.find((candidate) => candidate.id === id)).filter((item): item is Agent => Boolean(item));
  const children = childrenOf(agent);
  const renderAgents = (items: Agent[], limit: number) => <>{items.slice(0, limit).map((item) => <AgentReferenceButton key={item.id} agent={item} onOpenAgent={onOpenAgent} />)}{items.length > limit ? <span>+{items.length - limit}</span> : null}</>;
  return (
    <div className={`comparison-relationships ${compact ? "is-compact" : ""}`.trim()}>
      {parents.length ? <p><b>Supports Main</b>{renderAgents(parents, compact ? 2 : 4)}</p> : null}
      {children.length ? <p><b>Supported by</b>{renderAgents(children, compact ? 2 : 4)}</p> : null}
      <p><b>Output consumed by</b><AgentReferenceText text={agent.output.consumers} subjectAgentId={agent.id} onOpenAgent={onOpenAgent} /></p>
    </div>
  );
}

export type AgentValidationRow = {
  id: string;
  label: string;
  render: (agent: Agent) => ReactNode;
};

export function buildAgentAnalysisMap(subjects: Agent[], candidates: Agent[] = subjects) {
  return new Map(subjects.map((agent) => {
    const matches = candidates
      .filter((candidate) => candidate.id !== agent.id)
      .map((candidate) => analyzeAgentPair(agent, candidate))
      .sort((left, right) => right.score - left.score);
    return [agent.id, matches];
  }));
}

export function buildAgentValidationRows(
  analyses: Map<number, PairAnalysis[]>,
  density: "comparison" | "matrix" = "comparison",
  onOpenAgent?: (agent: Agent) => void,
): AgentValidationRow[] {
  const compact = density === "matrix";
  const subjectAgents = [...analyses.keys()].map((id) => agents.find((agent) => agent.id === id)).filter((agent): agent is Agent => Boolean(agent));
  const datasetUseCounts = new Map<string, number>();
  if (!compact) for (const subject of subjectAgents) for (const datasetId of new Set(datasetImpactIdsForAgent(subject))) datasetUseCounts.set(datasetId, (datasetUseCounts.get(datasetId) ?? 0) + 1);
  const sharedDatasetIds = new Set([...datasetUseCounts].filter(([, count]) => count > 1).map(([datasetId]) => datasetId));
  return [
    { id: "simply", label: "Simply / простыми словами", render: (agent) => <strong><AgentReferenceText text={agent.profile.simply} subjectAgentId={agent.id} onOpenAgent={onOpenAgent} /></strong> },
    { id: "purpose", label: "Core purpose", render: (agent) => <AgentReferenceText text={agent.description} subjectAgentId={agent.id} onOpenAgent={onOpenAgent} /> },
    { id: "scope", label: "Responsibility / scope", render: (agent) => <AgentReferenceText text={agent.profile.responsibilityScope} subjectAgentId={agent.id} onOpenAgent={onOpenAgent} /> },
    { id: "does", label: "What it does", render: (agent) => <ProfileList items={agent.profile.activities} agent={agent} onOpenAgent={onOpenAgent} /> },
    { id: "not-do", label: "What it explicitly should NOT do", render: (agent) => <ProfileList items={agent.profile.exclusions} agent={agent} onOpenAgent={onOpenAgent} /> },
    { id: "inputs", label: "Typical inputs", render: (agent) => <ProfileList items={agent.profile.typicalInputs} agent={agent} onOpenAgent={onOpenAgent} /> },
    { id: "outputs", label: "Typical outputs", render: (agent) => <div className="comparison-output"><strong><AgentReferenceText text={agent.output.primary} subjectAgentId={agent.id} onOpenAgent={onOpenAgent} /></strong>{agent.output.artifacts.map((artifact) => <span key={artifact}><AgentReferenceText text={artifact} subjectAgentId={agent.id} onOpenAgent={onOpenAgent} /></span>)}</div> },
    { id: "dataset-impact", label: "Dataset impact", render: (agent) => <AgentDatasetImpactCell agent={agent} compact={compact} sharedDatasetIds={sharedDatasetIds} /> },
    { id: "trigger", label: "Trigger / activation", render: (agent) => <div className="comparison-trigger"><strong><AgentReferenceText text={agent.profile.trigger} subjectAgentId={agent.id} onOpenAgent={onOpenAgent} /></strong><p><b>SKIP</b><AgentReferenceText text={agent.profile.skipCondition} subjectAgentId={agent.id} onOpenAgent={onOpenAgent} /></p></div> },
    { id: "authority", label: "Decisions / authority", render: (agent) => <AgentReferenceText text={agent.profile.authority} subjectAgentId={agent.id} onOpenAgent={onOpenAgent} /> },
    { id: "boundary", label: "Responsibility boundary", render: (agent) => <AgentReferenceText text={agent.profile.responsibilityBoundary} subjectAgentId={agent.id} onOpenAgent={onOpenAgent} /> },
    { id: "distinction", label: "Key distinction", render: (agent) => <strong><AgentReferenceText text={agent.profile.keyDistinction} subjectAgentId={agent.id} onOpenAgent={onOpenAgent} /></strong> },
    { id: "overlap", label: "Potential overlap", render: (agent) => <StructuredOverlapCell agent={agent} onOpenAgent={onOpenAgent} /> },
    { id: "stage", label: "Primary workflow stage", render: (agent) => agent.profile.workflowStage },
    { id: "classification", label: "Layer / category", render: (agent) => <div className="comparison-classification"><span style={{ "--comparison-color": layerById[agent.layer].color } as CSSProperties}>{layerById[agent.layer].number} · {layerById[agent.layer].name}</span><b>{tierLabels[getAgentTier(agent.id)]}</b></div> },
    { id: "platform", label: "Platform side", render: (agent) => <div className="comparison-platform">{agent.platformSides.map((side) => <span key={side}>{platformSideLabels[side]}</span>)}</div> },
    { id: "workflow", label: "Related workflow role", render: (agent) => <RelationshipCell agent={agent} compact={compact} onOpenAgent={onOpenAgent} /> },
    { id: "definition-status", label: "Definition status", render: (agent) => <div className={`comparison-definition-status status-${agent.profile.definitionStatus}`}><b>{agent.profile.definitionStatus === "structured" ? "STRUCTURED" : "NEEDS REVIEW"}</b><p><AgentReferenceText text={agent.profile.validationFinding ?? "Все обязательные границы и canonical profile fields структурированы."} subjectAgentId={agent.id} onOpenAgent={onOpenAgent} /></p></div> },
    { id: "risk", label: "Cross-profile similarity signal", render: (agent) => {
      const strongest = analyses.get(agent.id)?.[0];
      return strongest ? <><Signal analysis={strongest} compact={compact} onOpenAgent={onOpenAgent} /><small className="comparison-caution">Heuristic only · не является решением о merge/delete.</small></> : "—";
    } },
  ];
}

export function AgentComparisonModal({
  selectedIds,
  onAdd,
  onRemove,
  onClose,
  onOpenAgent,
}: {
  selectedIds: number[];
  onAdd: (agentId: number) => void;
  onRemove: (agentId: number) => void;
  onClose: () => void;
  onOpenAgent?: (agent: Agent) => void;
}) {
  const [query, setQuery] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);
  const selectedAgents = useMemo(
    () => selectedIds.map((id) => agents.find((agent) => agent.id === id)).filter((agent): agent is Agent => Boolean(agent)),
    [selectedIds],
  );
  const analyses = useMemo(() => buildAgentAnalysisMap(selectedAgents), [selectedAgents]);
  const addOptions = agents.filter((agent) => !selectedIds.includes(agent.id) && (
    !query.trim() || `${agent.id} ${agentSearchText(agent)}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
  )).slice(0, 8);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape" && !document.querySelector(".drawer-shell")) onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const rows = buildAgentValidationRows(analyses, "comparison", onOpenAgent);

  return (
    <div className="comparison-modal-shell" role="presentation">
      <div className="comparison-modal" role="dialog" aria-modal="true" aria-labelledby="comparison-title">
        <header>
          <div><span>AGENT ARCHITECTURE VALIDATION</span><h2 id="comparison-title">Agent Comparison</h2><p>Side-by-side audit of responsibility boundaries, outputs and duplication signals.</p></div>
          <div className="comparison-legend" aria-label="Comparison signal legend"><span className="signal-unique">Unique</span><span className="signal-overlap">Overlap</span><span className="signal-boundary">Boundary issue</span><span className="signal-duplicate">Potential duplication</span></div>
          <button ref={closeRef} type="button" className="comparison-close" onClick={onClose} aria-label="Закрыть сравнение">×</button>
        </header>

        <section className="comparison-selection" aria-label="Selected agents and add agent search">
          <div className="comparison-selected-chips">{selectedAgents.map((agent) => <button type="button" onClick={() => onRemove(agent.id)} key={agent.id}><b>{String(agent.id).padStart(2, "0")}</b>{agent.name}<span>×</span></button>)}</div>
          <label><span>ADD AGENT</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ID, name or responsibility" /></label>
          {query && <div className="comparison-add-results">{addOptions.map((agent) => <button type="button" key={agent.id} onClick={() => { onAdd(agent.id); setQuery(""); }}><b>{String(agent.id).padStart(2, "0")}</b><span>{agent.name}</span><small>{layerById[agent.layer].name} · {tierLabels[getAgentTier(agent.id)]}</small></button>)}{!addOptions.length && <p>Агент не найден.</p>}</div>}
        </section>

        <div className="comparison-table-scroll">
          <table className="comparison-table">
            <thead><tr><th>DIMENSION</th>{selectedAgents.map((agent) => <th key={agent.id}><span>{String(agent.id).padStart(2, "0")} · {layerById[agent.layer].name}</span><strong>{agent.name}</strong><AgentReviewBadge agentId={agent.id} /><button type="button" onClick={() => onRemove(agent.id)}>Remove</button></th>)}</tr></thead>
            <tbody>
              <tr className="comparison-review-row"><th scope="row">My review status</th>{selectedAgents.map((agent) => <td key={agent.id}><AgentReviewBadge agentId={agent.id} /></td>)}</tr>
              {rows.map((row) => <tr key={row.id}><th scope="row">{row.label}</th>{selectedAgents.map((agent) => <td key={agent.id}>{row.render(agent)}</td>)}</tr>)}
            </tbody>
          </table>
        </div>
        <footer><p><b>DATA COVERAGE:</b> All profile dimensions come from the canonical 64-Agent registry. Explicit overlap notes are architecture findings; similarity scores remain transparent heuristics for human review, not merge decisions.</p><button type="button" onClick={onClose}>Close comparison</button></footer>
      </div>
    </div>
  );
}

export function AgentComparisonBar({
  selectedIds,
  onCompare,
  onClear,
}: {
  selectedIds: number[];
  onCompare: () => void;
  onClear: () => void;
}) {
  if (!selectedIds.length) return null;
  return (
    <aside className="comparison-bar" aria-label="Agent comparison selection">
      <div><span>COMPARISON SET</span><strong>{selectedIds.length} agents selected</strong><p>{selectedIds.slice(0, 4).map((id) => agents.find((agent) => agent.id === id)?.name).join(" · ")}{selectedIds.length > 4 ? ` · +${selectedIds.length - 4}` : ""}</p></div>
      <button type="button" className="comparison-clear" onClick={onClear}>Clear</button>
      <button type="button" className="comparison-run" onClick={onCompare} disabled={selectedIds.length < 2}>Compare <span>↗</span></button>
    </aside>
  );
}
