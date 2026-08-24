"use client";

import { useMemo, useState } from "react";
import { agents, getAgentTier, platformSideLabels, tierLabels, type AgentTier, type PlatformSide } from "../../packages/catalog-data/src/agents";
import { eventAgentAuditLabels } from "../process-model";
import CaseOrchestrationMap, { type OrchestrationTimeBand } from "./case-orchestration-map";
import { case2, case2Engagements, case2Stages, type CaseAgentEngagement, type EngagementStatus } from "./case-2-data";
import { case2ProcessGraph } from "./case-2-graph";

const statusLabels: Record<EngagementStatus, string> = { required: "Обязателен", conditional: "Условно", background: "Background", "not-involved": "Не участвует" };
const sideClasses: Record<PlatformSide, string> = { "command-center": "side-command", "client-side": "side-client", backend: "side-backend" };
const agentById = new Map(agents.map((agent) => [agent.id, agent]));
const engagementByAgentId = new Map(case2Engagements.map((item) => [item.agentId, item]));
const case2TimeBands: OrchestrationTimeBand[] = [
  { start: 0, end: 1, label: "D0–1 · DISCOVERY" },
  { start: 2, end: 5, label: "D1–3 · OUTREACH + CONSENT" },
  { start: 6, end: 7, label: "D3–5 · VERIFIED COMPANY" },
  { start: 8, end: 9, label: "D5–8 · QUALIFICATION" },
  { start: 10, end: 11, label: "D8 · DECISION + HANDOFF" },
];

function countByStatus(records: CaseAgentEngagement[]) {
  return {
    required: records.filter((item) => item.status === "required").length,
    conditional: records.filter((item) => item.status === "conditional").length,
    background: records.filter((item) => item.status === "background").length,
    "not-involved": records.filter((item) => item.status === "not-involved").length,
  };
}

export default function Case2Module({ onOpenAgent, onScrollToMatrix }: { onOpenAgent: (agentId: number, eventStep: number | null) => void; onScrollToMatrix: () => void }) {
  const [expanded, setExpanded] = useState(true);
  const [view, setView] = useState<"map" | "narrative">("map");
  const metrics = useMemo(() => countByStatus(case2Engagements), []);
  const conditionalTriggered = case2Engagements.filter((item) => item.status === "conditional" && item.activation === "triggered").length;
  const conditionalStandby = metrics.conditional - conditionalTriggered;
  const tierMetrics = useMemo(() => (["main", "specialized", "optional"] as AgentTier[]).map((tier) => {
    const records = agents.filter((agent) => getAgentTier(agent.id) === tier).map((agent) => engagementByAgentId.get(agent.id)!);
    return { tier, total: records.length, ...countByStatus(records) };
  }), []);
  const platformMetrics = useMemo(() => (["command-center", "client-side", "backend"] as PlatformSide[]).map((side) => {
    const records = agents.filter((agent) => agent.platformSides.includes(side)).map((agent) => engagementByAgentId.get(agent.id)!);
    return { side, total: records.length, engaged: records.filter((item) => item.status !== "not-involved").length };
  }), []);

  return (
    <section className={`case-module case-two-module ${expanded ? "is-expanded" : "is-collapsed"}`} aria-labelledby="case-2-module-title">
      <button type="button" className="case-module-toggle" aria-expanded={expanded} aria-controls="case-2-content" onClick={() => setExpanded((current) => !current)}>
        <span className="case-module-index">CASE 2</span>
        <span className="case-module-title"><small>DEMO · {case2.id}</small><strong id="case-2-module-title">{case2.name}</strong></span>
        <span className="case-module-summary">{metrics.required} Core · {metrics.conditional} Conditional · {metrics.background} Background · {metrics["not-involved"]} Skip</span>
        <span className="case-module-action">{expanded ? "Свернуть" : "Развернуть"}<i aria-hidden="true">{expanded ? "−" : "+"}</i></span>
      </button>

      <div className="case-module-content" id="case-2-content" hidden={!expanded}>
        <section className="case-dossier" aria-label="Параметры Case 2">
          <div className="case-dossier-title"><span>DEMO · {case2.id}</span><h2>{case2.name}</h2><p>{case2.situation}</p></div>
          <div className="case-dossier-facts">
            <article><small>КОМПАНИЯ</small><b>{case2.company}</b><span>{case2.companyCountry} · {case2.companyType}</span></article>
            <article><small>ОРГАНИЗАТОР</small><b>{case2.organizerCountry}</b><span>{case2.organizer} · {case2.funding}</span></article>
            <article><small>ТИП / ПРЕДМЕТ</small><b>{case2.tenderType}</b><span>{case2.subject}</span></article>
            <article><small>ЛОТ / БЮДЖЕТ</small><b>{case2.budget}</b><span>{case2.lot} · {case2.quantity}</span></article>
            <article><small>ПРОЦЕДУРА</small><b>{case2.procurementMethod}</b><span>Подача: {case2.submissionWindow} · срок framework: {case2.deliveryWindow}</span></article>
          </div>
        </section>

        <section className="case-audit-metrics" aria-label="Метрики Case 2">
          <article className="metric-total"><span>ВСЕГО АГЕНТОВ</span><strong>64</strong><small>canonical registry неизменён</small></article>
          <article className="metric-required"><span>EVENT / CORE</span><strong>{metrics.required}</strong><small>конкретные Event executions</small></article>
          <article className="metric-conditional"><span>УСЛОВНЫЕ</span><strong>{metrics.conditional}</strong><small>{conditionalTriggered} сработали · {conditionalStandby} в резерве</small></article>
          <article className="metric-background"><span>PROCESS / BACKGROUND</span><strong>{metrics.background}</strong><small>не искусственные Event steps</small></article>
          <article className="metric-skipped"><span>НЕ УЧАСТВУЮТ</span><strong>{metrics["not-involved"]}</strong><small>scope завершён на activation handoff</small></article>
          <article className="metric-gap"><span>НОВЫЕ AGENTS</span><strong>{case2ProcessGraph.auditSummary.proposedMissingAgentIds.length}</strong><small>human outreach не превращён в Agent</small></article>
        </section>

        <section className="case-audit-breakdown">
          <div className="breakdown-block"><div className="section-kicker"><span>КЛАСС АГЕНТА</span><b>Case 2 participation</b></div><div className="tier-breakdown">
            {tierMetrics.map((item) => <article key={item.tier}><span className={`tier-dot tier-${item.tier}`} /><b>{tierLabels[item.tier]} <small>{item.total}</small></b><p><i>{item.required} core</i><i>{item.conditional} if</i><i>{item.background} bg</i><i>{item["not-involved"]} skip</i></p></article>)}
          </div></div>
          <div className="breakdown-block"><div className="section-kicker"><span>СТОРОНА ПЛАТФОРМЫ</span><b>пересекающиеся группы</b></div><div className="platform-breakdown">
            {platformMetrics.map((item) => <article key={item.side}><span className={sideClasses[item.side]}>{platformSideLabels[item.side]}</span><b>{item.engaged}<small> / {item.total}</small></b></article>)}
          </div></div>
        </section>

        <nav className="case-view-switcher" aria-label="Представление Case 2">
          <div><span>CASE VIEW</span><p>Одна модель данных — карта, business narrative и global matrix.</p></div>
          <div role="group" aria-label="Case 2 presentation">
            <button type="button" aria-pressed={view === "map"} onClick={() => setView("map")}><b>Map</b><small>Events + Processes + dependencies</small></button>
            <button type="button" aria-pressed={view === "narrative"} onClick={() => setView("narrative")}><b>Narrative</b><small>реальная история активации</small></button>
            <button type="button" aria-pressed="false" onClick={onScrollToMatrix}><b>Matrix ↘</b><small>Cases × 64 Agents</small></button>
          </div>
        </nav>

        <div className="case-view-panel" hidden={view !== "map"}>
          <CaseOrchestrationMap graph={case2ProcessGraph} caseNumber={2} timeBands={case2TimeBands} processNote="P01/P02/P03 переиспользуются; PB01/PB02 сходятся на явных gates; P05 управляет outreach и consent." onOpenAgent={onOpenAgent} />
        </div>

        <div className="case-view-panel" hidden={view !== "narrative"}>
          <section className="engagement-flow" aria-label="Этапы Case 2">
            <div className="section-heading"><div><p>CASE 2 · BUSINESS ROUTE</p><h2>От публичной возможности до consented Client handoff</h2></div><span>Case заканчивается до proposal preparation.</span></div>
            <div className="stage-rail">{case2Stages.map((stage) => {
              const records = case2Engagements.filter((item) => item.stageId === stage.id);
              const required = records.filter((item) => item.status === "required").length;
              const conditional = records.filter((item) => item.status === "conditional").length;
              return <article className="stage-card" key={stage.id}><div><span>{stage.number}</span><small>{required} core{conditional ? ` · ${conditional} if` : ""}</small></div><h3>{stage.title}</h3><p>{stage.description}</p><footer><small>ПЕРЕДАЁТ ДАЛЬШЕ</small><b>{stage.handoff}</b></footer></article>;
            })}</div>
          </section>

          <section className="case-chronology" aria-labelledby="case-2-chronology-title">
            <div className="section-heading chronology-heading"><div><p>CASE 2 · VALIDATION NARRATIVE</p><h2 id="case-2-chronology-title">Хронология событий — Case 2</h2></div><span>Публичный prospect ≠ Client; preliminary relevance ≠ verified Match.</span></div>
            <div className="chronology-review-note"><span>КРИТИЧЕСКАЯ ГРАНИЦА</span><p>До E06 TenderLab использует только разрешённые открытые данные. E04 и E05 — настоящие human/external Events без выдуманного Agent execution.</p></div>
            <ol className="chronology-list">{case2ProcessGraph.activities.map((event) => {
              const executions = case2ProcessGraph.agentExecutions.filter((item) => item.eventStep === event.eventStep);
              return <li className="chronology-event" key={event.id}><div className="chronology-marker" aria-hidden="true"><span>{String(event.eventStep).padStart(2, "0")}</span><i /></div><article>
                <header><div><small>{event.period} · {event.phase}</small><h3>{event.title}</h3></div><p><span>ИНИЦИАТОР</span><b>{event.initiator}</b></p></header>
                <p className="chronology-narrative">{event.narrative}</p>
                <div className="chronology-agents"><span>{executions.length ? "AGENTS" : "EXECUTION OWNER"}</span><div>{executions.length ? executions.map((execution) => {
                  const agent = agentById.get(execution.agentId);
                  return agent ? <button type="button" className={`chronology-agent-button agent-audit-${execution.necessity}`} key={`${event.eventStep}-${agent.id}`} onClick={() => onOpenAgent(agent.id, event.eventStep)} title={execution.condition}><span>{String(agent.id).padStart(2, "0")} ·</span><b>{agent.name}</b><small>{eventAgentAuditLabels[execution.necessity]}{execution.activation === "standby" ? " · STANDBY" : ""}</small></button> : null;
                }) : <span className="human-event-badge">HUMAN / EXTERNAL ACTION · без искусственного Agent</span>}</div></div>
                <div className="chronology-handoff"><div><span>РЕЗУЛЬТАТ</span><p>{event.result}</p></div><i aria-hidden="true">→</i><div><span>ЧТО ДАЛЬШЕ</span><p>{event.next}</p></div></div>
              </article></li>;
            })}</ol>
          </section>
        </div>

        <section className="case-audit-findings case-audit-consolidated" aria-label="Консолидированный аудит Case 2">
          <div className="section-heading"><div><p>CASE 2 · CONSOLIDATED AUDIT</p><h2>12 Events + 7 Processes + controlled Client handoff</h2></div><span>64-Agent registry сохранён; outreach остаётся человеческой ответственностью.</span></div>
          <div className="case-audit-summary-metrics">
            <article><strong>{case2ProcessGraph.activities.length}<small>/12</small></strong><span>Events modelled</span></article>
            <article><strong>{case2ProcessGraph.processes.length}</strong><span>Processes modelled</span></article>
            <article><strong>{case2ProcessGraph.agentExecutions.length}</strong><span>Event × Agent proofs</span></article>
            <article><strong>{case2ProcessGraph.processAgentExecutions.length}</strong><span>Process × Agent proofs</span></article>
            <article><strong>2</strong><span>Human-only Events</span></article>
            <article><strong>{case2ProcessGraph.auditSummary.proposedMissingAgentIds.length}</strong><span>Missing Agents</span></article>
            <article className="is-review"><strong>{case2ProcessGraph.auditSummary.unresolvedFindings.length}</strong><span>Unresolved findings</span></article>
          </div>
          <div className="case-audit-summary-grid">
            <article className="is-wide"><span>RESPONSIBILITY BOUNDARIES</span><ul>{case2ProcessGraph.auditSummary.overlapFindings.map((item) => <li key={item}>{item}</li>)}</ul></article>
            <article className="is-wide"><span>WHAT CASE 2 VALIDATES</span><ul>{case2ProcessGraph.auditSummary.canonicalRegistryImplications.map((item) => <li key={item}>{item}</li>)}</ul></article>
            <article className="is-wide"><span>TERMINAL OUTCOME</span><p><b>{case2.outcome}</b><small>Proposal, submission, evaluation and award are deliberately outside this Activation Case.</small></p></article>
          </div>
        </section>
      </div>
    </section>
  );
}

export { statusLabels as case2StatusLabels };
