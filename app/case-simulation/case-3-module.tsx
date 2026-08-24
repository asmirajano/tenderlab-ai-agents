"use client";

import { useMemo, useState } from "react";
import { agents, getAgentTier, platformSideLabels, tierLabels, type AgentTier, type PlatformSide } from "../../packages/catalog-data/src/agents";
import { eventAgentAuditLabels } from "../process-model";
import CaseOrchestrationMap, { type OrchestrationTimeBand } from "./case-orchestration-map";
import { useCaseExpansion } from "./case-expansion";
import { case1Engagements } from "./case-1-data";
import { case2Engagements } from "./case-2-data";
import type { CaseAgentEngagement, EngagementStatus } from "./case-1-data";
import { case3, case3Engagements, case3Stages } from "./case-3-data";
import { case3ProcessGraph } from "./case-3-graph";

const statusLabels: Record<EngagementStatus, string> = { required: "Обязателен", conditional: "Условно", background: "Background", "not-involved": "Не участвует" };
const sideClasses: Record<PlatformSide, string> = { "command-center": "side-command", "client-side": "side-client", backend: "side-backend" };
const agentById = new Map(agents.map((agent) => [agent.id, agent]));
const engagementByAgentId = new Map(case3Engagements.map((item) => [item.agentId, item]));
const case3TimeBands: OrchestrationTimeBand[] = [
  { start: 0, end: 2, label: "D0–1 · DISCOVERY + MANDATE" },
  { start: 3, end: 5, label: "D1–6 · LEAD FIT" },
  { start: 6, end: 9, label: "D6–16 · CONSORTIUM" },
  { start: 10, end: 13, label: "D16–67 · STAGE 1" },
  { start: 14, end: 17, label: "D70–99 · STAGE 2" },
  { start: 18, end: 20, label: "D118–178 · EVALUATION + AWARD" },
  { start: 20, end: 21, label: "D179–185 · HANDOFF" },
];

function countByStatus(records: CaseAgentEngagement[]) {
  return {
    required: records.filter((item) => item.status === "required").length,
    conditional: records.filter((item) => item.status === "conditional").length,
    background: records.filter((item) => item.status === "background").length,
    "not-involved": records.filter((item) => item.status === "not-involved").length,
  };
}

function involvedIds(records: CaseAgentEngagement[]) {
  return new Set(records.filter((item) => item.status !== "not-involved").map((item) => item.agentId));
}

function names(ids: number[], limit = 12) {
  const rendered = ids.slice(0, limit).map((id) => `${String(id).padStart(2, "0")} · ${agentById.get(id)?.name}`).join(" · ");
  return ids.length > limit ? `${rendered} · +${ids.length - limit}` : rendered || "Нет";
}

export default function Case3Module({ onOpenAgent, onScrollToMatrix }: { onOpenAgent: (agentId: number, eventStep: number | null) => void; onScrollToMatrix: () => void }) {
  const [expanded, setExpanded] = useCaseExpansion("case-3", true);
  const [view, setView] = useState<"map" | "narrative">("map");
  const metrics = useMemo(() => countByStatus(case3Engagements), []);
  const conditionalTriggered = case3Engagements.filter((item) => item.status === "conditional" && item.activation === "triggered").length;
  const conditionalStandby = metrics.conditional - conditionalTriggered;
  const tierMetrics = useMemo(() => (["main", "specialized", "optional"] as AgentTier[]).map((tier) => {
    const records = agents.filter((agent) => getAgentTier(agent.id) === tier).map((agent) => engagementByAgentId.get(agent.id)!);
    return { tier, total: records.length, ...countByStatus(records) };
  }), []);
  const platformMetrics = useMemo(() => (["command-center", "client-side", "backend"] as PlatformSide[]).map((side) => {
    const records = agents.filter((agent) => agent.platformSides.includes(side)).map((agent) => engagementByAgentId.get(agent.id)!);
    return { side, total: records.length, engaged: records.filter((item) => item.status !== "not-involved").length };
  }), []);
  const caseImpact = useMemo(() => {
    const c1 = involvedIds(case1Engagements);
    const c2 = involvedIds(case2Engagements);
    const c3 = involvedIds(case3Engagements);
    const sharedAll = [...c3].filter((id) => c1.has(id) && c2.has(id)).sort((a, b) => a - b);
    const onlyCase3 = [...c3].filter((id) => !c1.has(id) && !c2.has(id)).sort((a, b) => a - b);
    const changedRole = [...c3].filter((id) => {
      const current = engagementByAgentId.get(id);
      const prior = [...case1Engagements, ...case2Engagements].filter((item) => item.agentId === id);
      return prior.some((item) => item.status !== current?.status || item.stageId !== current?.stageId);
    }).sort((a, b) => a - b);
    return { sharedAll, onlyCase3, changedRole };
  }, []);

  return <section className={`case-module case-three-module ${expanded ? "is-expanded" : "is-collapsed"}`} aria-labelledby="case-3-module-title">
    <button type="button" className="case-module-toggle" aria-expanded={expanded} aria-controls="case-3-content" onClick={() => setExpanded((current) => !current)}>
      <span className="case-module-index">CASE 3</span>
      <span className="case-module-title"><small>DEMO · {case3.id}</small><strong id="case-3-module-title">{case3.name}</strong></span>
      <span className="case-module-summary">{metrics.required} Core · {metrics.conditional} Conditional · {metrics.background} Background · {metrics["not-involved"]} Skip</span>
      <span className="case-module-action">{expanded ? "Свернуть" : "Развернуть"}<i aria-hidden="true">{expanded ? "−" : "+"}</i></span>
    </button>

    <div className="case-module-content" id="case-3-content" hidden={!expanded}>
      <section className="case-dossier" aria-label="Параметры Case 3">
        <div className="case-dossier-title"><span>DEMO · {case3.id}</span><h2>{case3.name}</h2><p>{case3.situation}</p></div>
        <div className="case-dossier-facts">
          <article><small>КОМПАНИЯ / CONSORTIUM</small><b>{case3.company}</b><span>{case3.companyCountry} · {case3.companyType}</span></article>
          <article><small>ОРГАНИЗАТОР</small><b>{case3.organizerCountry}</b><span>{case3.organizer} · {case3.funding}</span></article>
          <article><small>ТИП / ПРЕДМЕТ</small><b>{case3.tenderType}</b><span>{case3.subject}</span></article>
          <article><small>ЛОТ / БЮДЖЕТ</small><b>{case3.budget}</b><span>{case3.lot} · {case3.quantity}</span></article>
          <article><small>ПРОЦЕДУРА</small><b>{case3.procurementMethod}</b><span>{case3.submissionWindow} · исполнение: {case3.deliveryWindow}</span></article>
        </div>
      </section>

      <section className="case-business-contract" aria-label="Business contract Case 3">
        <article><span>STARTING CONDITION</span><p>{case3.startingCondition}</p></article>
        <article><span>TRIGGER</span><p>{case3.trigger}</p></article>
        <article><span>CONSULTANT ROLE</span><p>{case3.consultantRole}</p></article>
        <article><span>MONETIZATION / INCOME</span><p>{case3.monetization}<b>{case3.consultantIncome}</b></p></article>
        <article><span>ENDPOINT</span><p>{case3.endpoint}</p></article>
        <article><span>KPI</span><p>{case3.kpi}</p></article>
      </section>

      <section className="case-audit-metrics" aria-label="Метрики Case 3">
        <article className="metric-total"><span>ВСЕГО АГЕНТОВ</span><strong>64</strong><small>canonical registry неизменён</small></article>
        <article className="metric-required"><span>EVENT / CORE</span><strong>{metrics.required}</strong><small>точные Event executions</small></article>
        <article className="metric-conditional"><span>УСЛОВНЫЕ</span><strong>{metrics.conditional}</strong><small>{conditionalTriggered} сработал · {conditionalStandby} в резерве</small></article>
        <article className="metric-background"><span>PROCESS / BACKGROUND</span><strong>{metrics.background}</strong><small>persistent и parallel work</small></article>
        <article className="metric-skipped"><span>НЕ УЧАСТВУЕТ</span><strong>{metrics["not-involved"]}</strong><small>отдельная local-service network не нужна</small></article>
        <article className="metric-gap"><span>НОВЫЕ AGENTS</span><strong>{case3ProcessGraph.auditSummary.proposedMissingAgentIds.length}</strong><small>consortium — Process, не super-agent</small></article>
      </section>

      <section className="case-audit-breakdown">
        <div className="breakdown-block"><div className="section-kicker"><span>КЛАСС АГЕНТА</span><b>Case 3 participation</b></div><div className="tier-breakdown">{tierMetrics.map((item) => <article key={item.tier}><span className={`tier-dot tier-${item.tier}`} /><b>{tierLabels[item.tier]} <small>{item.total}</small></b><p><i>{item.required} core</i><i>{item.conditional} if</i><i>{item.background} bg</i><i>{item["not-involved"]} skip</i></p></article>)}</div></div>
        <div className="breakdown-block"><div className="section-kicker"><span>СТОРОНА ПЛАТФОРМЫ</span><b>пересекающиеся группы</b></div><div className="platform-breakdown">{platformMetrics.map((item) => <article key={item.side}><span className={sideClasses[item.side]}>{platformSideLabels[item.side]}</span><b>{item.engaged}<small> / {item.total}</small></b></article>)}</div></div>
      </section>

      <nav className="case-view-switcher" aria-label="Представление Case 3">
        <div><span>CASE VIEW</span><p>Одна модель данных — карта, business narrative и global matrix.</p></div>
        <div role="group" aria-label="Case 3 presentation">
          <button type="button" aria-pressed={view === "map"} onClick={() => setView("map")}><b>Map</b><small>parallel branches + gates + waits</small></button>
          <button type="button" aria-pressed={view === "narrative"} onClick={() => setView("narrative")}><b>Narrative</b><small>консорциум и две стадии</small></button>
          <button type="button" aria-pressed="false" onClick={onScrollToMatrix}><b>Matrix ↘</b><small>Cases × 64 Agents</small></button>
        </div>
      </nav>

      <div className="case-view-panel" hidden={view !== "map"}><CaseOrchestrationMap graph={case3ProcessGraph} caseNumber={3} timeBands={case3TimeBands} processNote="PB01/PB02 сходятся на fit gate; PB03 формирует consortium; E15 ветвится в technical/commercial work и сходится по ALL в E18." onOpenAgent={onOpenAgent} /></div>

      <div className="case-view-panel" hidden={view !== "narrative"}>
        <section className="engagement-flow" aria-label="Этапы Case 3"><div className="section-heading"><div><p>CASE 3 · BUSINESS ROUTE</p><h2>От одного неполного профиля до трёхстороннего award</h2></div><span>Stage 1 без final price → Buyer dialogue → Stage 2 final bid.</span></div><div className="stage-rail">{case3Stages.map((stage) => {
          const records = case3Engagements.filter((item) => item.stageId === stage.id);
          const required = records.filter((item) => item.status === "required").length;
          const conditional = records.filter((item) => item.status === "conditional").length;
          return <article className="stage-card" key={stage.id}><div><span>{stage.number}</span><small>{required} core{conditional ? ` · ${conditional} if` : ""}</small></div><h3>{stage.title}</h3><p>{stage.description}</p><footer><small>ПЕРЕДАЁТ ДАЛЬШЕ</small><b>{stage.handoff}</b></footer></article>;
        })}</div></section>

        <section className="case-chronology" aria-labelledby="case-3-chronology-title">
          <div className="section-heading chronology-heading"><div><p>CASE 3 · VALIDATION NARRATIVE</p><h2 id="case-3-chronology-title">Хронология событий — Case 3</h2></div><span>Human signatures bind members; Agents provide evidence, analysis and controlled handoffs.</span></div>
          <div className="chronology-review-note"><span>КРИТИЧЕСКАЯ ГРАНИЦА</span><p>Event 08 — настоящий external waiting state без Agent. Event 15 запускает две параллельные ветви, которые не могут перейти к submission до ALL-join в Event 18.</p></div>
          <ol className="chronology-list">{case3ProcessGraph.activities.map((event) => {
            const executions = case3ProcessGraph.agentExecutions.filter((item) => item.eventStep === event.eventStep);
            return <li className="chronology-event" key={event.id}><div className="chronology-marker" aria-hidden="true"><span>{String(event.eventStep).padStart(2, "0")}</span><i /></div><article>
              <header><div><small>{event.period} · {event.phase}</small><h3>{event.title}</h3></div><p><span>ИНИЦИАТОР</span><b>{event.initiator}</b></p></header>
              <p className="chronology-narrative">{event.narrative}</p>
              <div className="chronology-agents"><span>{executions.length ? "AGENT EXECUTION AUDIT" : "EXECUTION OWNER"}</span><div>{executions.length ? executions.map((execution) => {
                const agent = agentById.get(execution.agentId);
                return agent ? <button type="button" className={`chronology-agent-button agent-audit-${execution.necessity}`} key={`${event.eventStep}-${agent.id}`} onClick={() => onOpenAgent(agent.id, event.eventStep)} title={execution.condition}><span>{String(agent.id).padStart(2, "0")} ·</span><b>{agent.name}</b><small>{eventAgentAuditLabels[execution.necessity]}{execution.activation === "standby" ? " · STANDBY" : ""}</small></button> : null;
              }) : <span className="human-event-badge">HUMAN / EXTERNAL WAIT · без искусственного Agent</span>}</div></div>
              <div className="chronology-handoff"><div><span>COMBINED EVENT RESULT</span><p>{event.result}</p></div><i aria-hidden="true">→</i><div><span>NEXT / HANDOFF</span><p>{event.next}</p></div></div>
            </article></li>;
          })}</ol>
        </section>
      </div>

      <section className="case-audit-findings case-audit-consolidated" aria-label="Консолидированный аудит Case 3">
        <div className="section-heading"><div><p>CASE 3 · CONSOLIDATED AUDIT</p><h2>22 Events + 9 Processes + two-stage consortium route</h2></div><span>Case 1/2 records не изменены; Agent 42 осознанно не активирован.</span></div>
        <div className="case-audit-summary-metrics">
          <article><strong>{case3ProcessGraph.activities.length}<small>/22</small></strong><span>Events modelled</span></article>
          <article><strong>{case3ProcessGraph.processes.length}</strong><span>Processes modelled</span></article>
          <article><strong>{case3ProcessGraph.agentExecutions.length}</strong><span>Event × Agent proofs</span></article>
          <article><strong>{case3ProcessGraph.processAgentExecutions.length}</strong><span>Process × Agent proofs</span></article>
          <article><strong>1</strong><span>Human-only waits</span></article>
          <article><strong>{case3ProcessGraph.auditSummary.proposedMissingAgentIds.length}</strong><span>Missing Agents</span></article>
          <article className="is-review"><strong>{case3ProcessGraph.auditSummary.unresolvedFindings.length}</strong><span>Unresolved findings</span></article>
        </div>
        <div className="case-audit-summary-grid">
          <article><span>SHARED ACROSS CASES 1–3</span><p><b>{caseImpact.sharedAll.length} Agents</b><small>{names(caseImpact.sharedAll)}</small></p></article>
          <article><span>CASE 3–SPECIFIC</span><p><b>{caseImpact.onlyCase3.length} Agents</b><small>{names(caseImpact.onlyCase3)}</small></p></article>
          <article><span>CHANGED ROLE / TIMING</span><p><b>{caseImpact.changedRole.length} Agents</b><small>{names(caseImpact.changedRole)}</small></p></article>
          <article><span>REMOVED / NOT ACTIVATED</span>{case3ProcessGraph.auditSummary.removedAssignments.map((item) => <p key={`${item.agentId}-${item.eventStep}`}><b>{String(item.agentId).padStart(2, "0")} · {agentById.get(item.agentId)?.name}</b><small>{item.reason}</small></p>)}</article>
          <article className="is-wide"><span>RESPONSIBILITY BOUNDARIES</span><ul>{case3ProcessGraph.auditSummary.overlapFindings.map((item) => <li key={item}>{item}</li>)}</ul></article>
          <article className="is-wide"><span>IMPLICATIONS FOR CANONICAL 64</span><ul>{case3ProcessGraph.auditSummary.canonicalRegistryImplications.map((item) => <li key={item}>{item}</li>)}</ul></article>
          <article className="is-wide"><span>TERMINAL OUTCOME</span><p><b>{case3.outcome}</b><small>{case3.endpoint}</small></p></article>
        </div>
      </section>
    </div>
  </section>;
}

export { statusLabels as case3StatusLabels };
