"use client";

import { useMemo, useState } from "react";
import { agents, getAgentTier, platformSideLabels, tierLabels, type AgentTier, type PlatformSide } from "../../packages/catalog-data/src/agents";
import { eventAgentAuditLabels } from "../process-model";
import CaseOrchestrationMap, { type OrchestrationTimeBand } from "./case-orchestration-map";
import type { CaseAgentEngagement } from "./case-1-data";
import { case9, case9Engagements, case9Stages } from "./case-9-data";
import { case9ProcessGraph } from "./case-9-graph";

const sideClasses: Record<PlatformSide, string> = { "command-center": "side-command", "client-side": "side-client", backend: "side-backend" };
const agentById = new Map(agents.map((agent) => [agent.id, agent]));
const engagementByAgentId = new Map(case9Engagements.map((item) => [item.agentId, item]));
const timeBands: OrchestrationTimeBand[] = [
  { start: 0, end: 3, label: "D214–217 · CONDITION + NOTICE" },
  { start: 4, end: 9, label: "D214–285 · EVIDENCE + CLAIM" },
  { start: 10, end: 12, label: "D286–334 · ENGINEER DETERMINATION" },
  { start: 13, end: 15, label: "D337–402 · DISPUTE + DAB" },
  { start: 16, end: 18, label: "D405–456 · VARIATION + PAYMENT" },
];

function countByStatus(records: CaseAgentEngagement[]) {
  return {
    required: records.filter((item) => item.status === "required").length,
    conditional: records.filter((item) => item.status === "conditional").length,
    background: records.filter((item) => item.status === "background").length,
    "not-involved": records.filter((item) => item.status === "not-involved").length,
  };
}

export default function Case9Module({ onOpenAgent, onScrollToMatrix }: { onOpenAgent: (agentId: number, eventStep: number | null) => void; onScrollToMatrix: () => void }) {
  const [expanded, setExpanded] = useState(true);
  const [view, setView] = useState<"map" | "narrative">("map");
  const metrics = useMemo(() => countByStatus(case9Engagements), []);
  const conditionalTriggered = case9Engagements.filter((item) => item.status === "conditional" && item.activation === "triggered").length;
  const tierMetrics = useMemo(() => (["main", "specialized", "optional"] as AgentTier[]).map((tier) => {
    const records = agents.filter((agent) => getAgentTier(agent.id) === tier).map((agent) => engagementByAgentId.get(agent.id)!);
    return { tier, total: records.length, ...countByStatus(records) };
  }), []);
  const platformMetrics = useMemo(() => (["command-center", "client-side", "backend"] as PlatformSide[]).map((side) => {
    const records = agents.filter((agent) => agent.platformSides.includes(side)).map((agent) => engagementByAgentId.get(agent.id)!);
    return { side, total: records.length, engaged: records.filter((item) => item.status !== "not-involved").length };
  }), []);

  return <section className={`case-module case-nine-module ${expanded ? "is-expanded" : "is-collapsed"}`} aria-labelledby="case-9-module-title">
    <button type="button" className="case-module-toggle" aria-expanded={expanded} aria-controls="case-9-content" onClick={() => setExpanded((current) => !current)}>
      <span className="case-module-index">CASE 9</span>
      <span className="case-module-title"><small>DEMO · {case9.id}</small><strong id="case-9-module-title">{case9.name}</strong></span>
      <span className="case-module-summary">{metrics.required} Core · {metrics.conditional} Conditional · {metrics.background} Background · {metrics["not-involved"]} Skip</span>
      <span className="case-module-action">{expanded ? "Свернуть" : "Развернуть"}<i aria-hidden="true">{expanded ? "−" : "+"}</i></span>
    </button>

    <div className="case-module-content" id="case-9-content" hidden={!expanded}>
      <section className="case-dossier" aria-label="Параметры Case 9">
        <div className="case-dossier-title"><span>DEMO · {case9.id}</span><h2>{case9.name}</h2><p>{case9.situation}</p></div>
        <div className="case-dossier-facts">
          <article><small>CONTRACTOR / CLIENT</small><b>{case9.company}</b><span>{case9.companyCountry} · {case9.companyType}</span></article>
          <article><small>EMPLOYER / ORGANIZER</small><b>{case9.organizerCountry}</b><span>{case9.organizer} · {case9.funding}</span></article>
          <article><small>ТИП / ПРЕДМЕТ</small><b>{case9.tenderType}</b><span>{case9.subject}</span></article>
          <article><small>КОНТРАКТ / CLAIM</small><b>{case9.budget}</b><span>{case9.lot} · {case9.quantity}</span></article>
          <article><small>ПРОЦЕДУРА</small><b>{case9.procurementMethod}</b><span>{case9.submissionWindow} · {case9.deliveryWindow}</span></article>
        </div>
      </section>

      <section className="case-business-contract" aria-label="Business contract Case 9">
        <article><span>STARTING CONDITION</span><p>{case9.startingCondition}</p></article>
        <article><span>TRIGGER</span><p>{case9.trigger}</p></article>
        <article><span>CONSULTANT ROLE / AUTHORITY</span><p>{case9.consultantRole}</p></article>
        <article><span>MONETIZATION / INCOME</span><p>{case9.monetization}<b>{case9.consultantIncome}</b></p></article>
        <article><span>ENDPOINT</span><p>{case9.endpoint}</p></article>
        <article><span>KPI</span><p>{case9.kpi}</p></article>
      </section>

      <section className="case-audit-metrics" aria-label="Метрики Case 9">
        <article className="metric-total"><span>ВСЕГО АГЕНТОВ</span><strong>64</strong><small>canonical registry неизменён</small></article>
        <article className="metric-required"><span>EVENT / CORE</span><strong>{metrics.required}</strong><small>post-award claim executions</small></article>
        <article className="metric-conditional"><span>УСЛОВНЫЕ</span><strong>{metrics.conditional}</strong><small>{conditionalTriggered} сработал · {metrics.conditional - conditionalTriggered} standby</small></article>
        <article className="metric-background"><span>PROCESS / BACKGROUND</span><strong>{metrics.background}</strong><small>knowledge + governed state</small></article>
        <article className="metric-skipped"><span>НЕ УЧАСТВУЮТ</span><strong>{metrics["not-involved"]}</strong><small>pre-award workflow исключён</small></article>
        <article className="metric-gap"><span>ARCHITECTURE FINDINGS</span><strong>{case9ProcessGraph.auditSummary.unresolvedFindings.length}</strong><small>без изменения registry</small></article>
      </section>

      <section className="case-audit-breakdown">
        <div className="breakdown-block"><div className="section-kicker"><span>КЛАСС АГЕНТА</span><b>Case 9 participation</b></div><div className="tier-breakdown">{tierMetrics.map((item) => <article key={item.tier}><span className={`tier-dot tier-${item.tier}`} /><b>{tierLabels[item.tier]} <small>{item.total}</small></b><p><i>{item.required} core</i><i>{item.conditional} if</i><i>{item.background} bg</i><i>{item["not-involved"]} skip</i></p></article>)}</div></div>
        <div className="breakdown-block"><div className="section-kicker"><span>СТОРОНА ПЛАТФОРМЫ</span><b>пересекающиеся группы</b></div><div className="platform-breakdown">{platformMetrics.map((item) => <article key={item.side}><span className={sideClasses[item.side]}>{platformSideLabels[item.side]}</span><b>{item.engaged}<small> / {item.total}</small></b></article>)}</div></div>
      </section>

      <nav className="case-view-switcher" aria-label="Представление Case 9">
        <div><span>CASE VIEW</span><p>Одна модель данных — orchestration map, narrative и global matrix.</p></div>
        <div role="group" aria-label="Case 9 presentation">
          <button type="button" aria-pressed={view === "map"} onClick={() => setView("map")}><b>Map</b><small>Events + Processes + dependencies</small></button>
          <button type="button" aria-pressed={view === "narrative"} onClick={() => setView("narrative")}><b>Narrative</b><small>Condition → claim → DAB → payment</small></button>
          <button type="button" aria-pressed="false" onClick={onScrollToMatrix}><b>Matrix ↘</b><small>Cases × 64 Agents</small></button>
        </div>
      </nav>

      <div className="case-view-panel" hidden={view !== "map"}>
        <CaseOrchestrationMap graph={case9ProcessGraph} caseNumber={9} timeBands={timeBands} processNote="Notice, continuing records, causation, delay and quantum run in parallel. Human Contractor, Engineer and DAB authority gates cannot be replaced by Agents." onOpenAgent={onOpenAgent} />
      </div>

      <div className="case-view-panel" hidden={view !== "narrative"}>
        <section className="engagement-flow" aria-label="Этапы Case 9">
          <div className="section-heading"><div><p>CASE 9 · BUSINESS ROUTE</p><h2>От unforeseen condition до Variation Order, EOT и payment</h2></div><span>Claim support ≠ contractual determination.</span></div>
          <div className="stage-rail">{case9Stages.map((stage) => {
            const records = case9Engagements.filter((item) => item.stageId === stage.id);
            const required = records.filter((item) => item.status === "required").length;
            const conditional = records.filter((item) => item.status === "conditional").length;
            return <article className="stage-card" key={stage.id}><div><span>{stage.number}</span><small>{required} core{conditional ? ` · ${conditional} if` : ""}</small></div><h3>{stage.title}</h3><p>{stage.description}</p><footer><small>ПЕРЕДАЁТ ДАЛЬШЕ</small><b>{stage.handoff}</b></footer></article>;
          })}</div>
        </section>

        <section className="case-chronology" aria-labelledby="case-9-chronology-title">
          <div className="section-heading chronology-heading"><div><p>CASE 9 · VALIDATION NARRATIVE</p><h2 id="case-9-chronology-title">Хронология событий — Case 9</h2></div><span>Facts, entitlement, time, quantum and authority remain separate proof tracks.</span></div>
          <div className="chronology-review-note"><span>КРИТИЧЕСКАЯ ГРАНИЦА</span><p>Agents могут структурировать evidence, deadline, cost and decision records. Notice подписывает Contractor; entitlement определяет Engineer/DAB; Variation подписывают уполномоченные люди.</p></div>
          <ol className="chronology-list">{case9ProcessGraph.activities.map((event) => {
            const executions = case9ProcessGraph.agentExecutions.filter((item) => item.eventStep === event.eventStep);
            return <li className="chronology-event" key={event.id}><div className="chronology-marker" aria-hidden="true"><span>{String(event.eventStep).padStart(2, "0")}</span><i /></div><article>
              <header><div><small>{event.period} · {event.phase}</small><h3>{event.title}</h3></div><p><span>ИНИЦИАТОР</span><b>{event.initiator}</b></p></header>
              <p className="chronology-narrative">{event.narrative}</p>
              <div className="chronology-agents"><span>AGENTS</span><div>{executions.map((execution) => {
                const agent = agentById.get(execution.agentId);
                return agent ? <button type="button" className={`chronology-agent-button agent-audit-${execution.necessity}`} key={`${event.eventStep}-${agent.id}`} onClick={() => onOpenAgent(agent.id, event.eventStep)} title={execution.condition}><span>{String(agent.id).padStart(2, "0")} ·</span><b>{agent.name}</b><small>{eventAgentAuditLabels[execution.necessity]}{execution.activation === "standby" ? " · STANDBY" : ""}</small></button> : null;
              })}</div></div>
              <div className="chronology-handoff"><div><span>РЕЗУЛЬТАТ</span><p>{event.result}</p></div><i aria-hidden="true">→</i><div><span>ЧТО ДАЛЬШЕ</span><p>{event.next}</p></div></div>
            </article></li>;
          })}</ol>
        </section>
      </div>

      <section className="case-audit-findings case-audit-consolidated" aria-label="Консолидированный аудит Case 9">
        <div className="section-heading"><div><p>CASE 9 · CONSOLIDATED AUDIT</p><h2>19 Events + 8 Processes + post-award architecture test</h2></div><span>Case 9 остаётся working audit до вашего review.</span></div>
        <div className="case-audit-summary-metrics">
          <article><strong>{case9ProcessGraph.activities.length}<small>/19</small></strong><span>Events modelled</span></article>
          <article><strong>{case9ProcessGraph.processes.length}</strong><span>Processes modelled</span></article>
          <article><strong>{case9ProcessGraph.agentExecutions.length}</strong><span>Event × Agent proofs</span></article>
          <article><strong>{case9ProcessGraph.processAgentExecutions.length}</strong><span>Process × Agent proofs</span></article>
          <article className="is-review"><strong>{case9ProcessGraph.auditSummary.overlapFindings.length}</strong><span>Boundary findings</span></article>
          <article className="is-review"><strong>{case9ProcessGraph.auditSummary.unresolvedFindings.length}</strong><span>Architecture questions</span></article>
        </div>
        <div className="case-audit-summary-grid">
          <article className="is-wide"><span>RESPONSIBILITY BOUNDARIES</span><ul>{case9ProcessGraph.auditSummary.overlapFindings.map((item) => <li key={item}>{item}</li>)}</ul></article>
          <article className="is-wide"><span>POTENTIAL GAPS / REVIEW</span><ul>{case9ProcessGraph.auditSummary.unresolvedFindings.map((item) => <li key={item}>{item}</li>)}</ul></article>
          <article className="is-wide"><span>WHAT CASE 9 VALIDATES</span><ul>{case9ProcessGraph.auditSummary.canonicalRegistryImplications.map((item) => <li key={item}>{item}</li>)}</ul></article>
          <article className="is-wide"><span>CONSULTANT MONETIZATION · DEMO</span><p><b>{case9.consultantIncome}</b><small>{case9.monetization}</small></p></article>
          <article className="is-wide"><span>TERMINAL OUTCOME</span><p><b>{case9.outcome}</b><small>Revised works execution after payment is intentionally transferred beyond Case 9.</small></p></article>
        </div>
      </section>
    </div>
  </section>;
}
