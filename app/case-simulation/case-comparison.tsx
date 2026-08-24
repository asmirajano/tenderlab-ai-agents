"use client";

import { Fragment, useMemo, useState } from "react";
import { agents } from "../../packages/catalog-data/src/agents";
import {
  caseComparisonRegistry,
  compareValues,
  comparisonDimensions,
  comparisonGroups,
  type CaseComparisonProfile,
  type ComparisonRelation,
  type ComparisonValue,
} from "./case-comparison-data";

const agentById = new Map(agents.map((agent) => [agent.id, agent]));
const relationMeta: Record<ComparisonRelation, { icon: string; label: string }> = {
  same: { icon: "✓", label: "Same" },
  similar: { icon: "≈", label: "Similar" },
  "different-path": { icon: "⇄", label: "Different path" },
  different: { icon: "≠", label: "Different" },
  critical: { icon: "⚠", label: "Critical" },
  "only-one": { icon: "+", label: "Only in one" },
};

function HighlightedValue({ value }: { value: ComparisonValue }) {
  if (!value.highlights?.length) return value.text;
  const escaped = value.highlights.map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(${escaped.join("|")})`, "gi");
  return <>{value.text.split(pattern).map((part, index) => value.highlights?.some((item) => item.toLocaleLowerCase() === part.toLocaleLowerCase()) ? <mark key={`${part}-${index}`}>{part}</mark> : <Fragment key={`${part}-${index}`}>{part}</Fragment>)}</>;
}

function AgentLinks({ ids, caseNumber, onOpenAgent, limit = 8 }: { ids: number[]; caseNumber: number; onOpenAgent: (agentId: number, caseNumber: number) => void; limit?: number }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? ids : ids.slice(0, limit);
  return <div className="case-comparison-agent-links">{visible.map((id) => {
    const agent = agentById.get(id);
    return agent ? <button type="button" key={id} onClick={() => onOpenAgent(id, caseNumber)}><span>{String(id).padStart(2, "0")}</span>{agent.name}</button> : null;
  })}{ids.length > limit && <button type="button" className="case-agent-more" onClick={() => setExpanded((current) => !current)}>{expanded ? "Свернуть" : `+${ids.length - limit}`}</button>}</div>;
}

function involvedIds(profile: CaseComparisonProfile) {
  return new Set(profile.engagements.filter((item) => item.status !== "not-involved").map((item) => item.agentId));
}

export default function CaseComparison({ onOpenAgent }: { onOpenAgent: (agentId: number, caseNumber: number) => void }) {
  const [leftId, setLeftId] = useState(caseComparisonRegistry[0]?.caseNumber ?? 1);
  const [rightId, setRightId] = useState(caseComparisonRegistry[1]?.caseNumber ?? caseComparisonRegistry[0]?.caseNumber ?? 1);
  const left = caseComparisonRegistry.find((item) => item.caseNumber === leftId) ?? caseComparisonRegistry[0];
  const right = caseComparisonRegistry.find((item) => item.caseNumber === rightId) ?? caseComparisonRegistry[1] ?? caseComparisonRegistry[0];

  const rows = useMemo(() => comparisonDimensions.map((dimension) => {
    const leftValue = left.attributes[dimension.id];
    const rightValue = right.attributes[dimension.id];
    return { dimension, leftValue, rightValue, relation: compareValues(leftValue, rightValue, dimension) };
  }), [left, right]);

  const counts = useMemo(() => rows.reduce<Record<ComparisonRelation, number>>((result, row) => {
    result[row.relation] += 1;
    return result;
  }, { same: 0, similar: 0, "different-path": 0, different: 0, critical: 0, "only-one": 0 }), [rows]);

  const agentImpact = useMemo(() => {
    const leftInvolved = involvedIds(left);
    const rightInvolved = involvedIds(right);
    const shared = [...leftInvolved].filter((id) => rightInvolved.has(id)).sort((a, b) => a - b);
    const leftOnly = [...leftInvolved].filter((id) => !rightInvolved.has(id)).sort((a, b) => a - b);
    const rightOnly = [...rightInvolved].filter((id) => !leftInvolved.has(id)).sort((a, b) => a - b);
    const leftMap = new Map(left.engagements.map((item) => [item.agentId, item]));
    const rightMap = new Map(right.engagements.map((item) => [item.agentId, item]));
    const changedRole = shared.filter((id) => {
      const a = leftMap.get(id);
      const b = rightMap.get(id);
      return a?.status !== b?.status || a?.stageId !== b?.stageId || a?.when !== b?.when;
    });
    return { shared, leftOnly, rightOnly, changedRole };
  }, [left, right]);

  const selectCase = (side: "left" | "right", value: number) => {
    if (side === "left") {
      if (value === rightId) setRightId(leftId);
      setLeftId(value);
    } else {
      if (value === leftId) setLeftId(rightId);
      setRightId(value);
    }
  };

  return <section className="case-comparison-section" aria-labelledby="case-comparison-title">
    <header className="case-comparison-heading">
      <div><span>STRATEGIC CASE COMPARISON</span><h2 id="case-comparison-title">Сравнить бизнес-маршруты</h2><p>Сначала условия и работа. Затем Events, Processes и Agent participation.</p></div>
      <div className="case-pair-selector" aria-label="Выберите Cases для сравнения">
        <label><span>CASE A</span><select value={left.caseNumber} onChange={(event) => selectCase("left", Number(event.target.value))}>{caseComparisonRegistry.map((item) => <option value={item.caseNumber} key={item.caseNumber}>Case {item.caseNumber} · {item.shortName}</option>)}</select></label>
        <i aria-hidden="true">↔</i>
        <label><span>CASE B</span><select value={right.caseNumber} onChange={(event) => selectCase("right", Number(event.target.value))}>{caseComparisonRegistry.map((item) => <option value={item.caseNumber} key={item.caseNumber}>Case {item.caseNumber} · {item.shortName}</option>)}</select></label>
      </div>
    </header>

    <div className="case-comparison-glance">
      <article className="case-glance-path" style={{ "--case-accent": left.color } as React.CSSProperties}><header><span>CASE {left.caseNumber}</span><b>{left.name}</b></header><div>{left.entryPath.map((step, index) => <Fragment key={step}><strong>{step}</strong>{index < left.entryPath.length - 1 && <i>→</i>}</Fragment>)}</div><p>{left.entrySummary}</p></article>
      <div className="case-glance-difference"><span>⚠ FUNDAMENTAL DIFFERENCE</span><strong>{left.attributes.relationship.key === right.attributes.relationship.key ? "Одинаковая relationship model" : `${left.relationshipSummary} ↔ ${right.relationshipSummary}`}</strong><p>{left.attributes.endpoint.key === right.attributes.endpoint.key ? "Общая Case boundary" : "Разные endpoints определяют разный downstream scope."}</p></div>
      <article className="case-glance-path" style={{ "--case-accent": right.color } as React.CSSProperties}><header><span>CASE {right.caseNumber}</span><b>{right.name}</b></header><div>{right.entryPath.map((step, index) => <Fragment key={step}><strong>{step}</strong>{index < right.entryPath.length - 1 && <i>→</i>}</Fragment>)}</div><p>{right.entrySummary}</p></article>
      <div className="case-convergence"><span>⇄ CONVERGENCE</span><p>Общее состояние: <b>Verified Company + structured Tender facts</b></p><small>Case {left.caseNumber}: {left.convergenceEvent} · Case {right.caseNumber}: {right.convergenceEvent}</small></div>
    </div>

    <div className="case-comparison-counts" aria-label="Итоги сравнения">{(Object.keys(relationMeta) as ComparisonRelation[]).map((relation) => counts[relation] ? <span className={`relation-${relation}`} key={relation}><b>{relationMeta[relation].icon} {relationMeta[relation].label}</b><i>{counts[relation]}</i></span> : null)}</div>

    <div className="case-comparison-table-scroll" role="region" aria-label="Подробное сравнение Cases">
      <table className="case-comparison-table">
        <thead><tr><th>Параметр</th><th><span>CASE {left.caseNumber}</span><b>{left.shortName}</b></th><th><span>CASE {right.caseNumber}</span><b>{right.shortName}</b></th><th>Ключевое различие</th></tr></thead>
        <tbody>{comparisonGroups.map((group) => <Fragment key={group.id}><tr className="case-comparison-group"><th colSpan={4}><span>{group.label}</span><small>{group.description}</small></th></tr>{rows.filter((row) => row.dimension.group === group.id).map((row) => <tr key={row.dimension.id} className={`case-relation-${row.relation}`}><th scope="row">{row.dimension.label}</th><td><HighlightedValue value={row.leftValue} /></td><td><HighlightedValue value={row.rightValue} /></td><td><span className={`case-relation-chip relation-${row.relation}`}><b>{relationMeta[row.relation].icon}</b>{relationMeta[row.relation].label}</span><small>{row.dimension.shortWhy}</small></td></tr>)}</Fragment>)}</tbody>
      </table>
    </div>

    <section className="case-agent-impact" aria-labelledby="agent-impact-title">
      <header><div><span>AGENT IMPACT</span><h3 id="agent-impact-title">Как бизнес-различия меняют оркестрацию</h3></div><p>Рассчитано из canonical Case engagement records.</p></header>
      <div className="case-agent-impact-metrics">
        <article><span>SHARED AGENTS</span><strong>{agentImpact.shared.length}</strong><p>Работают в обоих маршрутах.</p><AgentLinks ids={agentImpact.shared} caseNumber={left.caseNumber} onOpenAgent={onOpenAgent} /></article>
        <article><span>ONLY CASE {left.caseNumber}</span><strong>{agentImpact.leftOnly.length}</strong><p>{left.endpointSummary}</p><AgentLinks ids={agentImpact.leftOnly} caseNumber={left.caseNumber} onOpenAgent={onOpenAgent} /></article>
        <article><span>ONLY CASE {right.caseNumber}</span><strong>{agentImpact.rightOnly.length}</strong><p>{right.endpointSummary}</p><AgentLinks ids={agentImpact.rightOnly} caseNumber={right.caseNumber} onOpenAgent={onOpenAgent} /></article>
        <article><span>CHANGED ROLE / TIMING</span><strong>{agentImpact.changedRole.length}</strong><p>Тот же Agent, но другой stage, status или момент включения.</p><AgentLinks ids={agentImpact.changedRole} caseNumber={left.caseNumber} onOpenAgent={onOpenAgent} /></article>
      </div>
      <div className="case-orchestration-impact"><article><span>CASE {left.caseNumber}</span><b>{left.eventCount} Events · {left.processCount} Processes</b><p>{left.entrySummary} {left.endpointSummary}</p></article><i aria-hidden="true">≠</i><article><span>CASE {right.caseNumber}</span><b>{right.eventCount} Events · {right.processCount} Processes</b><p>{right.entrySummary} {right.endpointSummary}</p></article></div>
    </section>
  </section>;
}
