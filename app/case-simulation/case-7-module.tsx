"use client";

import { useMemo, useState } from "react";
import { agents, getAgentTier, platformSideLabels, tierLabels, type AgentTier, type PlatformSide } from "../../packages/catalog-data/src/agents";
import { eventAgentAuditLabels } from "../process-model";
import CaseOrchestrationMap, { type OrchestrationTimeBand } from "./case-orchestration-map";
import { useCaseExpansion } from "./case-expansion";
import type { CaseAgentEngagement } from "./case-1-data";
import { case7, case7Engagements, case7Stages } from "./case-7-data";
import { case7ProcessGraph } from "./case-7-graph";

const sideClasses: Record<PlatformSide, string> = { "command-center": "side-command", "client-side": "side-client", backend: "side-backend" };
const agentById = new Map(agents.map((agent) => [agent.id, agent]));
const engagementByAgentId = new Map(case7Engagements.map((item) => [item.agentId, item]));
const timeBands: OrchestrationTimeBand[] = [
  { start: 0, end: 1, label: "D0 · FAILURE + CONTROL" },
  { start: 2, end: 3, label: "D0–2 · REMEDY + REQUIREMENT" },
  { start: 4, end: 7, label: "D2–4 · GATE + SOURCING + RFQ" },
  { start: 8, end: 10, label: "D6–7 · OFFERS + EVALUATION" },
  { start: 11, end: 11, label: "D7–9 · TWO AUTHORITY TRACKS" },
  { start: 12, end: 14, label: "D9–20 · DELIVERY + ACCEPTANCE" },
  { start: 15, end: 16, label: "D20–35 · PAYMENT + LEARNING" },
];

function countByStatus(records: CaseAgentEngagement[]) {
  return {
    required: records.filter((item) => item.status === "required").length,
    conditional: records.filter((item) => item.status === "conditional").length,
    background: records.filter((item) => item.status === "background").length,
    "not-involved": records.filter((item) => item.status === "not-involved").length,
  };
}

export default function Case7Module({ onOpenAgent, onScrollToMatrix }: { onOpenAgent: (agentId: number, eventStep: number | null) => void; onScrollToMatrix: () => void }) {
  const [expanded, setExpanded] = useCaseExpansion("case-7", true);
  const [view, setView] = useState<"map" | "narrative">("map");
  const metrics = useMemo(() => countByStatus(case7Engagements), []);
  const conditionalTriggered = case7Engagements.filter((item) => item.status === "conditional" && item.activation === "triggered").length;
  const tierMetrics = useMemo(() => (["main", "specialized", "optional"] as AgentTier[]).map((tier) => {
    const records = agents.filter((agent) => getAgentTier(agent.id) === tier).map((agent) => engagementByAgentId.get(agent.id)!);
    return { tier, total: records.length, ...countByStatus(records) };
  }), []);
  const platformMetrics = useMemo(() => (["command-center", "client-side", "backend"] as PlatformSide[]).map((side) => {
    const records = agents.filter((agent) => agent.platformSides.includes(side)).map((agent) => engagementByAgentId.get(agent.id)!);
    return { side, total: records.length, engaged: records.filter((item) => item.status !== "not-involved").length };
  }), []);

  return <section className={`case-module case-seven-module ${expanded ? "is-expanded" : "is-collapsed"}`} aria-labelledby="case-7-module-title">
    <button type="button" className="case-module-toggle" aria-expanded={expanded} aria-controls="case-7-content" onClick={() => setExpanded((current) => !current)}>
      <span className="case-module-index">CASE 7</span>
      <span className="case-module-title"><small>DEMO · {case7.id}</small><strong id="case-7-module-title">{case7.name}</strong></span>
      <span className="case-module-summary">{metrics.required} Core · {metrics.conditional} Conditional · {metrics.background} Background · {metrics["not-involved"]} Skip</span>
      <span className="case-module-action">{expanded ? "Свернуть" : "Развернуть"}<i aria-hidden="true">{expanded ? "−" : "+"}</i></span>
    </button>

    <div className="case-module-content" id="case-7-content" hidden={!expanded}>
      <section className="case-dossier" aria-label="Параметры Case 7">
        <div className="case-dossier-title"><span>DEMO · {case7.id}</span><h2>{case7.name}</h2><p>{case7.situation}</p></div>
        <div className="case-dossier-facts">
          <article><small>PROCUREMENT CLIENT</small><b>{case7.company}</b><span>{case7.companyCountry} · {case7.companyType}</span></article>
          <article><small>ОРГАНИЗАТОР</small><b>{case7.organizerCountry}</b><span>{case7.organizer} · {case7.funding}</span></article>
          <article><small>ТИП / ПРЕДМЕТ</small><b>{case7.tenderType}</b><span>{case7.subject}</span></article>
          <article><small>ЛОТ / БЮДЖЕТ</small><b>{case7.budget}</b><span>{case7.lot} · {case7.quantity}</span></article>
          <article><small>ПРОЦЕДУРА</small><b>{case7.procurementMethod}</b><span>Quotation: {case7.submissionWindow} · delivery: {case7.deliveryWindow}</span></article>
        </div>
      </section>

      <section className="case-business-contract" aria-label="Business contract Case 7">
        <article><span>STARTING CONDITION</span><p>{case7.startingCondition}</p></article>
        <article><span>TRIGGER</span><p>{case7.trigger}</p></article>
        <article><span>CONSULTANT ROLE / AUTHORITY</span><p>{case7.consultantRole}</p></article>
        <article><span>MONETIZATION / INCOME</span><p>{case7.monetization}<b>{case7.consultantIncome}</b></p></article>
        <article><span>ENDPOINT</span><p>{case7.endpoint}</p></article>
        <article><span>KPI</span><p>{case7.kpi}</p></article>
      </section>

      <section className="case-audit-metrics" aria-label="Метрики Case 7">
        <article className="metric-total"><span>ВСЕГО АГЕНТОВ</span><strong>64</strong><small>canonical registry неизменён</small></article>
        <article className="metric-required"><span>EVENT / CORE</span><strong>{metrics.required}</strong><small>Buyer/recovery executions</small></article>
        <article className="metric-conditional"><span>УСЛОВНЫЕ</span><strong>{metrics.conditional}</strong><small>{conditionalTriggered} сработал · {metrics.conditional - conditionalTriggered} standby</small></article>
        <article className="metric-background"><span>PROCESS / BACKGROUND</span><strong>{metrics.background}</strong><small>market, awards and knowledge</small></article>
        <article className="metric-skipped"><span>НЕ УЧАСТВУЮТ</span><strong>{metrics["not-involved"]}</strong><small>bidder-side work намеренно excluded</small></article>
        <article className="metric-gap"><span>ARCHITECTURE QUESTIONS</span><strong>{case7ProcessGraph.auditSummary.unresolvedFindings.length}</strong><small>без изменения registry</small></article>
      </section>

      <section className="case-audit-breakdown">
        <div className="breakdown-block"><div className="section-kicker"><span>КЛАСС АГЕНТА</span><b>Case 7 participation</b></div><div className="tier-breakdown">{tierMetrics.map((item) => <article key={item.tier}><span className={`tier-dot tier-${item.tier}`} /><b>{tierLabels[item.tier]} <small>{item.total}</small></b><p><i>{item.required} core</i><i>{item.conditional} if</i><i>{item.background} bg</i><i>{item["not-involved"]} skip</i></p></article>)}</div></div>
        <div className="breakdown-block"><div className="section-kicker"><span>СТОРОНА ПЛАТФОРМЫ</span><b>пересекающиеся группы</b></div><div className="platform-breakdown">{platformMetrics.map((item) => <article key={item.side}><span className={sideClasses[item.side]}>{platformSideLabels[item.side]}</span><b>{item.engaged}<small> / {item.total}</small></b></article>)}</div></div>
      </section>

      <nav className="case-view-switcher" aria-label="Представление Case 7">
        <div><span>CASE VIEW</span><p>Одна модель данных — recovery map, narrative and global matrix.</p></div>
        <div role="group" aria-label="Case 7 presentation">
          <button type="button" aria-pressed={view === "map"} onClick={() => setView("map")}><b>Map</b><small>parallel remedy + sourcing + authority</small></button>
          <button type="button" aria-pressed={view === "narrative"} onClick={() => setView("narrative")}><b>Narrative</b><small>failure → replacement → acceptance</small></button>
          <button type="button" aria-pressed="false" onClick={onScrollToMatrix}><b>Matrix ↘</b><small>Cases × 64 Agents</small></button>
        </div>
      </nav>

      <div className="case-view-panel" hidden={view !== "map"}>
        <CaseOrchestrationMap graph={case7ProcessGraph} caseNumber={7} timeBands={timeBands} processNote="Default remedy and continuity requirement start in parallel; old-contract claim and replacement award remain separate authority tracks; delivery and independent inspection converge at Buyer acceptance." onOpenAgent={onOpenAgent} />
      </div>

      <div className="case-view-panel" hidden={view !== "narrative"}>
        <section className="engagement-flow" aria-label="Этапы Case 7">
          <div className="section-heading"><div><p>CASE 7 · BUSINESS ROUTE</p><h2>От supplier default до accepted replacement delivery</h2></div><span>Buyer-side recovery · TenderLab не пишет supplier proposal.</span></div>
          <div className="stage-rail">{case7Stages.map((stage) => {
            const records = case7Engagements.filter((item) => item.stageId === stage.id);
            const required = records.filter((item) => item.status === "required").length;
            const conditional = records.filter((item) => item.status === "conditional").length;
            return <article className="stage-card" key={stage.id}><div><span>{stage.number}</span><small>{required} core{conditional ? ` · ${conditional} if` : ""}</small></div><h3>{stage.title}</h3><p>{stage.description}</p><footer><small>ПЕРЕДАЁТ ДАЛЬШЕ</small><b>{stage.handoff}</b></footer></article>;
          })}</div>
        </section>

        <section className="case-chronology" aria-labelledby="case-7-chronology-title">
          <div className="section-heading chronology-heading"><div><p>CASE 7 · VALIDATION NARRATIVE</p><h2 id="case-7-chronology-title">Хронология событий — Case 7</h2></div><span>Facts, legal authority, sourcing, evaluation and acceptance never collapse into one Agent action.</span></div>
          <div className="chronology-review-note"><span>КРИТИЧЕСКАЯ ГРАНИЦА</span><p>E13 claim и E14 replacement award идут параллельно. Replacement delivery не ждёт фактического взыскания security, а Case закрывается с явно переданным open claim.</p></div>
          <ol className="chronology-list">{case7ProcessGraph.activities.map((event) => {
            const executions = case7ProcessGraph.agentExecutions.filter((item) => item.eventStep === event.eventStep);
            return <li className="chronology-event" key={event.id}><div className="chronology-marker" aria-hidden="true"><span>{String(event.eventStep).padStart(2, "0")}</span><i /></div><article>
              <header><div><small>{event.period} · {event.phase}</small><h3>{event.title}</h3></div><p><span>ИНИЦИАТОР</span><b>{event.initiator}</b></p></header>
              <p className="chronology-narrative">{event.narrative}</p>
              <div className="chronology-agents"><span>AGENT EXECUTION AUDIT</span><div>{executions.map((execution) => {
                const agent = agentById.get(execution.agentId);
                return agent ? <button type="button" className={`chronology-agent-button agent-audit-${execution.necessity}`} key={`${event.eventStep}-${agent.id}`} onClick={() => onOpenAgent(agent.id, event.eventStep)} title={execution.condition}><span>{String(agent.id).padStart(2, "0")} ·</span><b>{agent.name}</b><small>{eventAgentAuditLabels[execution.necessity]}{execution.activation === "standby" ? " · STANDBY" : ""}</small></button> : null;
              })}</div></div>
              <div className="chronology-handoff"><div><span>COMBINED EVENT RESULT</span><p>{event.result}</p></div><i aria-hidden="true">→</i><div><span>NEXT / HANDOFF</span><p>{event.next}</p></div></div>
            </article></li>;
          })}</ol>
        </section>
      </div>

      <section className="case-audit-findings case-audit-consolidated" aria-label="Консолидированный аудит Case 7">
        <div className="section-heading"><div><p>CASE 7 · CONSOLIDATED AUDIT</p><h2>19 Events + 7 Processes + Buyer-side architecture stress test</h2></div><span>Working audit: gaps reported, canonical 64 not changed.</span></div>
        <div className="case-audit-summary-metrics">
          <article><strong>{case7ProcessGraph.activities.length}<small>/19</small></strong><span>Events modelled</span></article>
          <article><strong>{case7ProcessGraph.processes.length}</strong><span>Processes modelled</span></article>
          <article><strong>{case7ProcessGraph.agentExecutions.length}</strong><span>Event × Agent proofs</span></article>
          <article><strong>{case7ProcessGraph.processAgentExecutions.length}</strong><span>Process × Agent proofs</span></article>
          <article className="is-review"><strong>{case7ProcessGraph.auditSummary.overlapFindings.length}</strong><span>Boundary findings</span></article>
          <article className="is-review"><strong>{case7ProcessGraph.auditSummary.unresolvedFindings.length}</strong><span>Architecture questions</span></article>
        </div>
        <div className="case-audit-summary-grid">
          <article className="is-wide"><span>RESPONSIBILITY BOUNDARIES</span><ul>{case7ProcessGraph.auditSummary.overlapFindings.map((item) => <li key={item}>{item}</li>)}</ul></article>
          <article className="is-wide"><span>POTENTIAL GAPS / REVIEW</span><ul>{case7ProcessGraph.auditSummary.unresolvedFindings.map((item) => <li key={item}>{item}</li>)}</ul></article>
          <article className="is-wide"><span>WHAT CASE 7 VALIDATES</span><ul>{case7ProcessGraph.auditSummary.canonicalRegistryImplications.map((item) => <li key={item}>{item}</li>)}</ul></article>
          <article className="is-wide"><span>TERMINAL OUTCOME</span><p><b>{case7.outcome}</b><small>{case7.endpoint}</small></p></article>
        </div>
      </section>
    </div>
  </section>;
}
