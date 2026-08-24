"use client";

import { useMemo, useState } from "react";
import { agents, getAgentTier, platformSideLabels, tierLabels, type AgentTier, type PlatformSide } from "../../packages/catalog-data/src/agents";
import { eventAgentAuditLabels } from "../process-model";
import CaseOrchestrationMap, { type OrchestrationTimeBand } from "./case-orchestration-map";
import type { CaseAgentEngagement } from "./case-1-data";
import { case5, case5Engagements, case5Stages } from "./case-5-data";
import { case5ProcessGraph } from "./case-5-graph";

const sideClasses: Record<PlatformSide, string> = { "command-center": "side-command", "client-side": "side-client", backend: "side-backend" };
const agentById = new Map(agents.map((agent) => [agent.id, agent]));
const engagementByAgentId = new Map(case5Engagements.map((item) => [item.agentId, item]));
const timeBands: OrchestrationTimeBand[] = [
  { start: 0, end: 2, label: "D0–2 · DISCOVERY + MANDATE" },
  { start: 3, end: 5, label: "D2–10 · RFP + FEASIBILITY" },
  { start: 6, end: 9, label: "D8–24 · NETWORK + RFQ" },
  { start: 10, end: 12, label: "D24–35 · BID + PROPOSAL" },
  { start: 13, end: 14, label: "D52–78 · EVALUATION + FRAMEWORK" },
  { start: 15, end: 17, label: "D103–132 · CALL-OFF + ACCEPTANCE" },
];

function countByStatus(records: CaseAgentEngagement[]) {
  return {
    required: records.filter((item) => item.status === "required").length,
    conditional: records.filter((item) => item.status === "conditional").length,
    background: records.filter((item) => item.status === "background").length,
    "not-involved": records.filter((item) => item.status === "not-involved").length,
  };
}

export default function Case5Module({ onOpenAgent, onScrollToMatrix }: { onOpenAgent: (agentId: number, eventStep: number | null) => void; onScrollToMatrix: () => void }) {
  const [expanded, setExpanded] = useState(true);
  const [view, setView] = useState<"map" | "narrative">("map");
  const metrics = useMemo(() => countByStatus(case5Engagements), []);
  const conditionalTriggered = case5Engagements.filter((item) => item.status === "conditional" && item.activation === "triggered").length;
  const tierMetrics = useMemo(() => (["main", "specialized", "optional"] as AgentTier[]).map((tier) => {
    const records = agents.filter((agent) => getAgentTier(agent.id) === tier).map((agent) => engagementByAgentId.get(agent.id)!);
    return { tier, total: records.length, ...countByStatus(records) };
  }), []);
  const platformMetrics = useMemo(() => (["command-center", "client-side", "backend"] as PlatformSide[]).map((side) => {
    const records = agents.filter((agent) => agent.platformSides.includes(side)).map((agent) => engagementByAgentId.get(agent.id)!);
    return { side, total: records.length, engaged: records.filter((item) => item.status !== "not-involved").length };
  }), []);

  return <section className={`case-module case-five-module ${expanded ? "is-expanded" : "is-collapsed"}`} aria-labelledby="case-5-module-title">
    <button type="button" className="case-module-toggle" aria-expanded={expanded} aria-controls="case-5-content" onClick={() => setExpanded((current) => !current)}>
      <span className="case-module-index">CASE 5</span>
      <span className="case-module-title"><small>DEMO · {case5.id}</small><strong id="case-5-module-title">{case5.name}</strong></span>
      <span className="case-module-summary">{metrics.required} Core · {metrics.conditional} Conditional · {metrics.background} Background · {metrics["not-involved"]} Skip</span>
      <span className="case-module-action">{expanded ? "Свернуть" : "Развернуть"}<i aria-hidden="true">{expanded ? "−" : "+"}</i></span>
    </button>

    <div className="case-module-content" id="case-5-content" hidden={!expanded}>
      <section className="case-dossier" aria-label="Параметры Case 5">
        <div className="case-dossier-title"><span>DEMO · {case5.id}</span><h2>{case5.name}</h2><p>{case5.situation}</p></div>
        <div className="case-dossier-facts">
          <article><small>КОМПАНИЯ</small><b>{case5.company}</b><span>{case5.companyCountry} · {case5.companyType}</span></article>
          <article><small>ОРГАНИЗАТОР</small><b>{case5.organizerCountry}</b><span>{case5.organizer} · {case5.funding}</span></article>
          <article><small>ТИП / ПРЕДМЕТ</small><b>{case5.tenderType}</b><span>{case5.subject}</span></article>
          <article><small>ЛОТ / БЮДЖЕТ</small><b>{case5.budget}</b><span>{case5.lot} · {case5.quantity}</span></article>
          <article><small>ПРОЦЕДУРА</small><b>{case5.procurementMethod}</b><span>Подача: {case5.submissionWindow} · исполнение: {case5.deliveryWindow}</span></article>
        </div>
      </section>

      <section className="case-audit-metrics" aria-label="Метрики Case 5">
        <article className="metric-total"><span>ВСЕГО АГЕНТОВ</span><strong>64</strong><small>canonical registry неизменён</small></article>
        <article className="metric-required"><span>EVENT / CORE</span><strong>{metrics.required}</strong><small>конкретные Event executions</small></article>
        <article className="metric-conditional"><span>УСЛОВНЫЕ</span><strong>{metrics.conditional}</strong><small>{conditionalTriggered} сработали · {metrics.conditional - conditionalTriggered} standby</small></article>
        <article className="metric-background"><span>PROCESS / BACKGROUND</span><strong>{metrics.background}</strong><small>persistent/parallel work</small></article>
        <article className="metric-skipped"><span>НЕ УЧАСТВУЮТ</span><strong>{metrics["not-involved"]}</strong><small>JV и landed-price не нужны</small></article>
        <article className="metric-gap"><span>ARCHITECTURE FINDINGS</span><strong>{case5ProcessGraph.auditSummary.unresolvedFindings.length}</strong><small>без изменения registry</small></article>
      </section>

      <section className="case-audit-breakdown">
        <div className="breakdown-block"><div className="section-kicker"><span>КЛАСС АГЕНТА</span><b>Case 5 participation</b></div><div className="tier-breakdown">{tierMetrics.map((item) => <article key={item.tier}><span className={`tier-dot tier-${item.tier}`} /><b>{tierLabels[item.tier]} <small>{item.total}</small></b><p><i>{item.required} core</i><i>{item.conditional} if</i><i>{item.background} bg</i><i>{item["not-involved"]} skip</i></p></article>)}</div></div>
        <div className="breakdown-block"><div className="section-kicker"><span>СТОРОНА ПЛАТФОРМЫ</span><b>пересекающиеся группы</b></div><div className="platform-breakdown">{platformMetrics.map((item) => <article key={item.side}><span className={sideClasses[item.side]}>{platformSideLabels[item.side]}</span><b>{item.engaged}<small> / {item.total}</small></b></article>)}</div></div>
      </section>

      <nav className="case-view-switcher" aria-label="Представление Case 5">
        <div><span>CASE VIEW</span><p>Одна модель данных — orchestration map, narrative и global matrix.</p></div>
        <div role="group" aria-label="Case 5 presentation">
          <button type="button" aria-pressed={view === "map"} onClick={() => setView("map")}><b>Map</b><small>Events + Processes + dependencies</small></button>
          <button type="button" aria-pressed={view === "narrative"} onClick={() => setView("narrative")}><b>Narrative</b><small>RFP → first accepted call-off</small></button>
          <button type="button" aria-pressed="false" onClick={onScrollToMatrix}><b>Matrix ↘</b><small>Cases × 64 Agents</small></button>
        </div>
      </nav>

      <div className="case-view-panel" hidden={view !== "map"}>
        <CaseOrchestrationMap graph={case5ProcessGraph} caseNumber={5} timeBands={timeBands} processNote="RFP and bidder evidence branch first; technical/commercial proposals rejoin at controlled submission; framework award waits for a Buyer-authorised call-off before execution." onOpenAgent={onOpenAgent} />
      </div>

      <div className="case-view-panel" hidden={view !== "narrative"}>
        <section className="engagement-flow" aria-label="Этапы Case 5">
          <div className="section-heading"><div><p>CASE 5 · BUSINESS ROUTE</p><h2>От performance RFP до первого accepted call-off</h2></div><span>Non-consulting services · framework ceiling ≠ guaranteed revenue.</span></div>
          <div className="stage-rail">{case5Stages.map((stage) => {
            const records = case5Engagements.filter((item) => item.stageId === stage.id);
            const required = records.filter((item) => item.status === "required").length;
            const conditional = records.filter((item) => item.status === "conditional").length;
            return <article className="stage-card" key={stage.id}><div><span>{stage.number}</span><small>{required} core{conditional ? ` · ${conditional} if` : ""}</small></div><h3>{stage.title}</h3><p>{stage.description}</p><footer><small>ПЕРЕДАЁТ ДАЛЬШЕ</small><b>{stage.handoff}</b></footer></article>;
          })}</div>
        </section>

        <section className="case-chronology" aria-labelledby="case-5-chronology-title">
          <div className="section-heading chronology-heading"><div><p>CASE 5 · VALIDATION NARRATIVE</p><h2 id="case-5-chronology-title">Хронология событий — Case 5</h2></div><span>Framework award, call-off, acceptance and payment are separate Buyer authority transitions.</span></div>
          <div className="chronology-review-note"><span>КРИТИЧЕСКАЯ ГРАНИЦА</span><p>Contract ceiling ≠ revenue. Only an authorised call-off creates executable scope; only Buyer acceptance creates a payment certificate.</p></div>
          <ol className="chronology-list">{case5ProcessGraph.activities.map((event) => {
            const executions = case5ProcessGraph.agentExecutions.filter((item) => item.eventStep === event.eventStep);
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

      <section className="case-audit-findings case-audit-consolidated" aria-label="Консолидированный аудит Case 5">
        <div className="section-heading"><div><p>CASE 5 · CONSOLIDATED AUDIT</p><h2>20 Events + 7 Processes + five architecture questions</h2></div><span>Case 5 остаётся working audit до вашего review.</span></div>
        <div className="case-audit-summary-metrics">
          <article><strong>{case5ProcessGraph.activities.length}<small>/20</small></strong><span>Events modelled</span></article>
          <article><strong>{case5ProcessGraph.processes.length}</strong><span>Processes modelled</span></article>
          <article><strong>{case5ProcessGraph.agentExecutions.length}</strong><span>Event × Agent proofs</span></article>
          <article><strong>{case5ProcessGraph.processAgentExecutions.length}</strong><span>Process × Agent proofs</span></article>
          <article className="is-review"><strong>{case5ProcessGraph.auditSummary.overlapFindings.length}</strong><span>Boundary findings</span></article>
          <article className="is-review"><strong>{case5ProcessGraph.auditSummary.unresolvedFindings.length}</strong><span>Architecture questions</span></article>
        </div>
        <div className="case-audit-summary-grid">
          <article className="is-wide"><span>RESPONSIBILITY BOUNDARIES</span><ul>{case5ProcessGraph.auditSummary.overlapFindings.map((item) => <li key={item}>{item}</li>)}</ul></article>
          <article className="is-wide"><span>POTENTIAL GAPS / REVIEW</span><ul>{case5ProcessGraph.auditSummary.unresolvedFindings.map((item) => <li key={item}>{item}</li>)}</ul></article>
          <article className="is-wide"><span>WHAT CASE 5 VALIDATES</span><ul>{case5ProcessGraph.auditSummary.canonicalRegistryImplications.map((item) => <li key={item}>{item}</li>)}</ul></article>
          <article className="is-wide"><span>TERMINAL OUTCOME</span><p><b>{case5.outcome}</b><small>Future call-offs and continuing 36-month framework operations are intentionally handed off beyond Case 5.</small></p></article>
        </div>
      </section>
    </div>
  </section>;
}
