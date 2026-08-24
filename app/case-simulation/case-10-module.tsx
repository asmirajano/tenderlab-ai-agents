"use client";

import { useMemo, useState } from "react";
import { agents, getAgentTier, platformSideLabels, tierLabels, type AgentTier, type PlatformSide } from "../../packages/catalog-data/src/agents";
import { eventAgentAuditLabels } from "../process-model";
import CaseOrchestrationMap, { type OrchestrationTimeBand } from "./case-orchestration-map";
import { useCaseExpansion } from "./case-expansion";
import type { CaseAgentEngagement } from "./case-1-data";
import { case10, case10Engagements, case10Stages } from "./case-10-data";
import { case10ProcessGraph } from "./case-10-graph";

const sideClasses: Record<PlatformSide, string> = { "command-center": "side-command", "client-side": "side-client", backend: "side-backend" };
const agentById = new Map(agents.map((agent) => [agent.id, agent]));
const engagementByAgentId = new Map(case10Engagements.map((item) => [item.agentId, item]));
const timeBands: OrchestrationTimeBand[] = [
  { start: 0, end: 2, label: "D−120…−96 · SIGNALS + AWARDS" },
  { start: 3, end: 7, label: "D0–10 · MANDATE + BASELINES" },
  { start: 8, end: 11, label: "D9–20 · PARTNER + INTEGRITY" },
  { start: 12, end: 15, label: "D20–27 · CLARIFICATION + NO-BID" },
  { start: 16, end: 18, label: "D27–66 · STOP + CANCELLATION" },
];

function countByStatus(records: CaseAgentEngagement[]) {
  return { required: records.filter((item) => item.status === "required").length, conditional: records.filter((item) => item.status === "conditional").length, background: records.filter((item) => item.status === "background").length, "not-involved": records.filter((item) => item.status === "not-involved").length };
}

export default function Case10Module({ onOpenAgent, onScrollToMatrix }: { onOpenAgent: (agentId: number, eventStep: number | null) => void; onScrollToMatrix: () => void }) {
  const [expanded, setExpanded] = useCaseExpansion("case-10", true);
  const [view, setView] = useState<"map" | "narrative">("map");
  const metrics = useMemo(() => countByStatus(case10Engagements), []);
  const conditionalTriggered = case10Engagements.filter((item) => item.status === "conditional" && item.activation === "triggered").length;
  const tierMetrics = useMemo(() => (["main", "specialized", "optional"] as AgentTier[]).map((tier) => {
    const records = agents.filter((agent) => getAgentTier(agent.id) === tier).map((agent) => engagementByAgentId.get(agent.id)!);
    return { tier, total: records.length, ...countByStatus(records) };
  }), []);
  const platformMetrics = useMemo(() => (["command-center", "client-side", "backend"] as PlatformSide[]).map((side) => {
    const records = agents.filter((agent) => agent.platformSides.includes(side)).map((agent) => engagementByAgentId.get(agent.id)!);
    return { side, total: records.length, engaged: records.filter((item) => item.status !== "not-involved").length };
  }), []);

  return <section className={`case-module case-ten-module ${expanded ? "is-expanded" : "is-collapsed"}`} aria-labelledby="case-10-module-title">
    <button type="button" className="case-module-toggle" aria-expanded={expanded} aria-controls="case-10-content" onClick={() => setExpanded((current) => !current)}>
      <span className="case-module-index">CASE 10</span>
      <span className="case-module-title"><small>FINAL PROGRAM CASE · DEMO · {case10.id}</small><strong id="case-10-module-title">{case10.name}</strong></span>
      <span className="case-module-summary">{metrics.required} Core · {metrics.conditional} Conditional · {metrics.background} Background · {metrics["not-involved"]} Skip</span>
      <span className="case-module-action">{expanded ? "Свернуть" : "Развернуть"}<i aria-hidden="true">{expanded ? "−" : "+"}</i></span>
    </button>

    <div className="case-module-content" id="case-10-content" hidden={!expanded}>
      <section className="case-dossier" aria-label="Параметры Case 10">
        <div className="case-dossier-title"><span>FINAL · DEMO · {case10.id}</span><h2>{case10.name}</h2><p>{case10.situation}</p></div>
        <div className="case-dossier-facts">
          <article><small>COMPANY / CLIENT</small><b>{case10.company}</b><span>{case10.companyCountry} · {case10.companyType}</span></article>
          <article><small>ORGANIZER</small><b>{case10.organizerCountry}</b><span>{case10.organizer} · {case10.funding}</span></article>
          <article><small>ТИП / ПРЕДМЕТ</small><b>{case10.tenderType}</b><span>{case10.subject}</span></article>
          <article><small>ЛОТ / БЮДЖЕТ</small><b>{case10.budget}</b><span>{case10.lot} · {case10.quantity}</span></article>
          <article><small>ПРОЦЕДУРА</small><b>{case10.procurementMethod}</b><span>{case10.submissionWindow} · {case10.deliveryWindow}</span></article>
        </div>
      </section>

      <section className="case-business-contract" aria-label="Business contract Case 10">
        <article><span>STARTING CONDITION</span><p>{case10.startingCondition}</p></article>
        <article><span>TRIGGER</span><p>{case10.trigger}</p></article>
        <article><span>CONSULTANT ROLE / AUTHORITY</span><p>{case10.consultantRole}</p></article>
        <article><span>MONETIZATION / INCOME</span><p>{case10.monetization}<b>{case10.consultantIncome}</b></p></article>
        <article><span>ENDPOINT</span><p>{case10.endpoint}</p></article>
        <article><span>KPI</span><p>{case10.kpi}</p></article>
      </section>

      <section className="case-audit-metrics" aria-label="Метрики Case 10">
        <article className="metric-total"><span>ВСЕГО АГЕНТОВ</span><strong>64</strong><small>canonical registry неизменён</small></article>
        <article className="metric-required"><span>EVENT / CORE</span><strong>{metrics.required}</strong><small>actual pre-bid/integrity work</small></article>
        <article className="metric-conditional"><span>УСЛОВНЫЕ</span><strong>{metrics.conditional}</strong><small>{conditionalTriggered} сработал · {metrics.conditional - conditionalTriggered} standby</small></article>
        <article className="metric-background"><span>PROCESS / BACKGROUND</span><strong>{metrics.background}</strong><small>none hidden as participation</small></article>
        <article className="metric-skipped"><span>НЕ УЧАСТВУЮТ</span><strong>{metrics["not-involved"]}</strong><small>proposal → execution branch stopped</small></article>
        <article className="metric-gap"><span>ARCHITECTURE FINDINGS</span><strong>{case10ProcessGraph.auditSummary.unresolvedFindings.length}</strong><small>post-program review candidates</small></article>
      </section>

      <section className="case-audit-breakdown">
        <div className="breakdown-block"><div className="section-kicker"><span>КЛАСС АГЕНТА</span><b>Case 10 participation</b></div><div className="tier-breakdown">{tierMetrics.map((item) => <article key={item.tier}><span className={`tier-dot tier-${item.tier}`} /><b>{tierLabels[item.tier]} <small>{item.total}</small></b><p><i>{item.required} core</i><i>{item.conditional} if</i><i>{item.background} bg</i><i>{item["not-involved"]} skip</i></p></article>)}</div></div>
        <div className="breakdown-block"><div className="section-kicker"><span>СТОРОНА ПЛАТФОРМЫ</span><b>пересекающиеся группы</b></div><div className="platform-breakdown">{platformMetrics.map((item) => <article key={item.side}><span className={sideClasses[item.side]}>{platformSideLabels[item.side]}</span><b>{item.engaged}<small> / {item.total}</small></b></article>)}</div></div>
      </section>

      <nav className="case-view-switcher" aria-label="Представление Case 10">
        <div><span>CASE VIEW</span><p>Одна модель данных — orchestration map, chronology and global matrix.</p></div>
        <div role="group" aria-label="Case 10 presentation">
          <button type="button" aria-pressed={view === "map"} onClick={() => setView("map")}><b>Map</b><small>Events + Processes + dependencies</small></button>
          <button type="button" aria-pressed={view === "narrative"} onClick={() => setView("narrative")}><b>Narrative</b><small>Signal → diligence → No-Bid → cancellation</small></button>
          <button type="button" aria-pressed="false" onClick={onScrollToMatrix}><b>Matrix ↘</b><small>Cases × 64 Agents</small></button>
        </div>
      </nav>

      <div className="case-view-panel" hidden={view !== "map"}>
        <CaseOrchestrationMap graph={case10ProcessGraph} caseNumber={10} timeBands={timeBands} processNote="Award intelligence, company/tender evidence and partner diligence run in parallel. Fit, economics and integrity converge only at a human No-Bid gate; stopped Agents are not participants." onOpenAgent={onOpenAgent} />
      </div>

      <div className="case-view-panel" hidden={view !== "narrative"}>
        <section className="engagement-flow" aria-label="Этапы Case 10">
          <div className="section-heading"><div><p>CASE 10 · FINAL VALIDATION ROUTE</p><h2>От procurement signal до governed No-Bid, cancellation и reissue watch</h2></div><span>High fit ≠ permission to bid.</span></div>
          <div className="stage-rail">{case10Stages.map((stage) => {
            const records = case10Engagements.filter((item) => item.stageId === stage.id);
            const required = records.filter((item) => item.status === "required").length;
            const conditional = records.filter((item) => item.status === "conditional").length;
            return <article className="stage-card" key={stage.id}><div><span>{stage.number}</span><small>{required} core{conditional ? ` · ${conditional} if` : ""}</small></div><h3>{stage.title}</h3><p>{stage.description}</p><footer><small>ПЕРЕДАЁТ ДАЛЬШЕ</small><b>{stage.handoff}</b></footer></article>;
          })}</div>
        </section>

        <section className="case-chronology" aria-labelledby="case-10-chronology-title">
          <div className="section-heading chronology-heading"><div><p>CASE 10 · VALIDATION NARRATIVE</p><h2 id="case-10-chronology-title">Хронология событий — Case 10</h2></div><span>A controlled stop is a valid terminal outcome.</span></div>
          <div className="chronology-review-note"><span>КРИТИЧЕСКАЯ ГРАНИЦА</span><p>Agents may collect, compare and score evidence. Only authorised humans contact partners/Buyer, interpret allegations, decide No-Bid and control private-data retention; external bodies investigate or cancel.</p></div>
          <ol className="chronology-list">{case10ProcessGraph.activities.map((event) => {
            const executions = case10ProcessGraph.agentExecutions.filter((item) => item.eventStep === event.eventStep);
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

      <section className="case-audit-findings case-audit-consolidated" aria-label="Консолидированный аудит Case 10">
        <div className="section-heading"><div><p>CASE 10 · FINAL PROGRAM AUDIT</p><h2>19 Events + 8 Processes + honest stopped branch</h2></div><span>Case 10 closes the planned simulation programme.</span></div>
        <div className="case-audit-summary-metrics">
          <article><strong>{case10ProcessGraph.activities.length}<small>/19</small></strong><span>Events modelled</span></article>
          <article><strong>{case10ProcessGraph.processes.length}</strong><span>Processes modelled</span></article>
          <article><strong>{case10ProcessGraph.agentExecutions.length}</strong><span>Event × Agent proofs</span></article>
          <article><strong>{case10ProcessGraph.processAgentExecutions.length}</strong><span>Process × Agent proofs</span></article>
          <article className="is-review"><strong>{case10ProcessGraph.auditSummary.overlapFindings.length}</strong><span>Boundary findings</span></article>
          <article className="is-review"><strong>{case10ProcessGraph.auditSummary.unresolvedFindings.length}</strong><span>Architecture questions</span></article>
        </div>
        <div className="case-audit-summary-grid">
          <article className="is-wide"><span>RESPONSIBILITY BOUNDARIES</span><ul>{case10ProcessGraph.auditSummary.overlapFindings.map((item) => <li key={item}>{item}</li>)}</ul></article>
          <article className="is-wide"><span>POTENTIAL GAPS / REVIEW</span><ul>{case10ProcessGraph.auditSummary.unresolvedFindings.map((item) => <li key={item}>{item}</li>)}</ul></article>
          <article className="is-wide"><span>WHAT CASE 10 VALIDATES</span><ul>{case10ProcessGraph.auditSummary.canonicalRegistryImplications.map((item) => <li key={item}>{item}</li>)}</ul></article>
          <article className="is-wide"><span>CONSULTANT MONETIZATION · DEMO</span><p><b>{case10.consultantIncome}</b><small>{case10.monetization}</small></p></article>
          <article className="is-wide"><span>TERMINAL OUTCOME</span><p><b>{case10.outcome}</b><small>Any reissued procurement starts a new operational Case outside the completed 10-Case programme.</small></p></article>
        </div>
      </section>
    </div>
  </section>;
}
