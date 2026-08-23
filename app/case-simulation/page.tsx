"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AgentDetailDrawer,
  type AgentDetailContext,
} from "../page";
import {
  agents,
  getAgentTier,
  layerById,
  platformSideLabels,
  tierLabels,
  type Agent,
  type AgentTier,
  type PlatformSide,
} from "../../packages/catalog-data/src/agents";
import TopNavigation from "../top-navigation";
import CaseOrchestrationMap from "./case-orchestration-map";
import {
  case1,
  case1Engagements,
  caseStages,
  type CaseAgentEngagement,
  type EngagementStatus,
} from "./case-1-data";
import { case1ProcessGraph } from "./case-1-graph";
import { eventAgentAuditLabels, type EventAgentAuditDecision } from "../process-model";
import {
  createSemanticSearchDocument,
  rankSemanticDocuments,
  selectVisibleSemanticResults,
  type SemanticSearchResult,
} from "./semantic-search";
import "./case-simulation.css";

type StatusFilter = "all" | EngagementStatus;
type TierFilter = "all" | AgentTier;

const statusLabels: Record<EngagementStatus, string> = {
  required: "Обязателен",
  conditional: "Условно",
  "not-involved": "Не участвует",
};

const statusShortLabels: Record<EngagementStatus, string> = {
  required: "CORE",
  conditional: "IF",
  "not-involved": "SKIP",
};

const tierRuLabels: Record<AgentTier, string> = {
  main: "Main",
  specialized: "Specialized",
  optional: "Optional",
};

const sideClasses: Record<PlatformSide, string> = {
  "command-center": "side-command",
  "client-side": "side-client",
  backend: "side-backend",
};

const futureCases = Array.from({ length: 9 }, (_, index) => index + 2);
const engagementByAgentId = new Map(case1Engagements.map((engagement) => [engagement.agentId, engagement]));
const agentById = new Map(agents.map((agent) => [agent.id, agent]));
const agentByName = new Map(agents.map((agent) => [agent.name, agent]));
const semanticDocuments = agents.map((agent) => {
  const engagement = engagementByAgentId.get(agent.id)!;
  const stage = caseStages.find((candidate) => candidate.id === engagement.stageId)!;
  const layer = layerById[agent.layer];
  return createSemanticSearchDocument({
    id: agent.id,
    name: agent.name,
    aliases: agent.previousNames,
    description: agent.description,
    workflow: [
      stage.title,
      stage.description,
      stage.handoff,
      engagement.when,
      engagement.why,
      engagement.input,
      engagement.next,
      engagement.condition,
      engagement.coveredBy,
    ].filter(Boolean).join(" · "),
    output: [agent.output.primary, ...agent.output.artifacts, agent.output.consumers, engagement.output].join(" · "),
    rationale: Object.values(agent.platformRationale).filter(Boolean).join(" · "),
    metadata: [
      tierLabels[getAgentTier(agent.id)],
      layer.name,
      layer.ru,
      ...agent.platformSides.map((side) => platformSideLabels[side]),
      statusLabels[engagement.status],
    ].join(" · "),
  });
});

function eventAgentEntries(eventStep: number, activeNames: string[], standbyNames: string[]) {
  const auditedExecutions = case1ProcessGraph.agentExecutions.filter((execution) => execution.eventStep === eventStep);
  if (auditedExecutions.length) {
    return auditedExecutions.map((execution) => ({
      agent: agentById.get(execution.agentId),
      isStandby: execution.activation === "standby",
      necessity: execution.necessity as EventAgentAuditDecision,
      validationStatus: execution.validationStatus,
      condition: execution.condition,
    }));
  }
  return [...activeNames.map((name) => ({ name, isStandby: false })), ...standbyNames.map((name) => ({ name, isStandby: true }))]
    .map(({ name, isStandby }) => ({ agent: agentByName.get(name), isStandby, necessity: undefined, validationStatus: undefined, condition: undefined }));
}

function countByStatus(records: CaseAgentEngagement[]) {
  return {
    required: records.filter((record) => record.status === "required").length,
    conditional: records.filter((record) => record.status === "conditional").length,
    "not-involved": records.filter((record) => record.status === "not-involved").length,
  };
}

function PlatformBadges({ agent, compact = false }: { agent: Agent; compact?: boolean }) {
  return (
    <span className={`case-platform-badges ${compact ? "is-compact" : ""}`} aria-label="Сторона платформы">
      {agent.platformSides.map((side) => (
        <i className={sideClasses[side]} key={side}>{platformSideLabels[side]}</i>
      ))}
    </span>
  );
}

export default function CaseSimulationPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const [highlightedAgentId, setHighlightedAgentId] = useState<number | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [selectedChronologyStep, setSelectedChronologyStep] = useState<number | null>(null);
  const [caseExpanded, setCaseExpanded] = useState(true);
  const [caseView, setCaseView] = useState<"map" | "narrative">("map");
  const matrixScrollRef = useRef<HTMLDivElement | null>(null);
  const matrixSectionRef = useRef<HTMLElement | null>(null);
  const rowRefs = useRef(new Map<number, HTMLTableRowElement>());

  const metrics = useMemo(() => countByStatus(case1Engagements), []);
  const conditionalTriggered = case1Engagements.filter((record) => record.status === "conditional" && record.activation === "triggered").length;
  const conditionalStandby = case1Engagements.filter((record) => record.status === "conditional" && record.activation === "standby").length;

  const tierMetrics = useMemo(() => (["main", "specialized", "optional"] as AgentTier[]).map((tier) => {
    const records = agents
      .filter((agent) => getAgentTier(agent.id) === tier)
      .map((agent) => engagementByAgentId.get(agent.id)!);
    return { tier, total: records.length, ...countByStatus(records) };
  }), []);

  const platformMetrics = useMemo(() => (["command-center", "client-side", "backend"] as PlatformSide[]).map((side) => {
    const records = agents
      .filter((agent) => agent.platformSides.includes(side))
      .map((agent) => engagementByAgentId.get(agent.id)!);
    return {
      side,
      total: records.length,
      engaged: records.filter((record) => record.status !== "not-involved").length,
    };
  }), []);

  const baseFilteredAgents = useMemo(() => agents.filter((agent) => {
    const engagement = engagementByAgentId.get(agent.id)!;
    return (statusFilter === "all" || engagement.status === statusFilter)
      && (tierFilter === "all" || getAgentTier(agent.id) === tierFilter)
      && (stageFilter === "all" || engagement.stageId === stageFilter);
  }), [stageFilter, statusFilter, tierFilter]);

  const semanticResults = useMemo(() => {
    if (!query.trim()) return [];
    const allowedIds = new Set(baseFilteredAgents.map((agent) => agent.id));
    return rankSemanticDocuments(query, semanticDocuments.filter((document) => allowedIds.has(document.id)));
  }, [baseFilteredAgents, query]);

  const visibleSemanticResults = useMemo(() => selectVisibleSemanticResults(semanticResults), [semanticResults]);
  const semanticResultById = useMemo(() => new Map(semanticResults.map((result) => [result.id, result])), [semanticResults]);
  const filteredAgents = useMemo(() => query.trim()
    ? visibleSemanticResults.map((result) => agentById.get(result.id)).filter((agent): agent is Agent => Boolean(agent))
    : baseFilteredAgents, [baseFilteredAgents, query, visibleSemanticResults]);

  const groupedRows = useMemo(() => caseStages.map((stage) => ({
    stage,
    agents: filteredAgents.filter((agent) => engagementByAgentId.get(agent.id)?.stageId === stage.id),
  })).filter((group) => group.agents.length > 0), [filteredAgents]);

  const selectedAgent = selectedAgentId ? agents.find((agent) => agent.id === selectedAgentId) ?? null : null;
  const selectedEngagement = selectedAgent ? engagementByAgentId.get(selectedAgent.id) ?? null : null;
  const selectedStage = selectedEngagement ? caseStages.find((stage) => stage.id === selectedEngagement.stageId) ?? null : null;
  const selectedChronologyEvent = selectedChronologyStep
    ? case1ProcessGraph.activities.find((event) => event.eventStep === selectedChronologyStep) ?? null
    : null;
  const selectedEventExecution = selectedChronologyStep && selectedAgent
    ? case1ProcessGraph.agentExecutions.find((execution) => execution.eventStep === selectedChronologyStep && execution.agentId === selectedAgent.id)
    : undefined;
  const selectedDetailContext: AgentDetailContext | undefined = selectedEngagement && selectedStage ? {
    caseLabel: "CASE 1",
    caseName: case1.name,
    company: case1.company,
    stage: `${selectedStage.number} · ${selectedStage.title}`,
    status: selectedEngagement.status,
    statusLabel: statusLabels[selectedEngagement.status],
    when: selectedEngagement.when,
    why: selectedEngagement.why,
    input: selectedEngagement.input,
    output: selectedEngagement.output,
    next: selectedEngagement.next,
    condition: selectedEngagement.condition,
    activation: selectedEngagement.activation,
    skipReason: selectedEngagement.coveredBy,
    event: selectedChronologyEvent ? {
      step: selectedChronologyEvent.eventStep,
      period: selectedChronologyEvent.period,
      phase: selectedChronologyEvent.phase,
      title: selectedChronologyEvent.title,
      narrative: selectedChronologyEvent.narrative,
      result: selectedChronologyEvent.result,
    } : undefined,
    eventExecution: selectedEventExecution && selectedChronologyEvent ? {
      ...selectedEventExecution,
      necessityLabel: eventAgentAuditLabels[selectedEventExecution.necessity],
      eventResult: selectedChronologyEvent.result,
    } : undefined,
  } : undefined;

  const openAgent = (agentId: number, chronologyStep: number | null = null) => {
    setSelectedChronologyStep(chronologyStep);
    setSelectedAgentId(agentId);
  };

  const closeAgent = () => {
    setSelectedAgentId(null);
    setSelectedChronologyStep(null);
  };

  const openAdjacentAgent = (direction: -1 | 1) => {
    if (!selectedAgent) return;
    const index = filteredAgents.findIndex((agent) => agent.id === selectedAgent.id);
    if (index < 0) return;
    const nextIndex = Math.min(Math.max(index + direction, 0), filteredAgents.length - 1);
    setSelectedChronologyStep(null);
    setSelectedAgentId(filteredAgents[nextIndex]?.id ?? selectedAgent.id);
  };

  const toggleCase = () => {
    setCaseExpanded((current) => {
      if (current) closeAgent();
      return !current;
    });
  };

  const selectSemanticResult = (result: SemanticSearchResult) => {
    const agent = agentById.get(result.id);
    if (!agent) return;
    setQuery(agent.name);
    setSearchOpen(false);
    setActiveSearchIndex(0);
    setHighlightedAgentId(agent.id);
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!visibleSemanticResults.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSearchOpen(true);
      setActiveSearchIndex((current) => (current + 1) % visibleSemanticResults.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSearchOpen(true);
      setActiveSearchIndex((current) => (current - 1 + visibleSemanticResults.length) % visibleSemanticResults.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      selectSemanticResult(visibleSemanticResults[Math.min(activeSearchIndex, visibleSemanticResults.length - 1)]);
    } else if (event.key === "Escape") {
      setSearchOpen(false);
    }
  };

  useEffect(() => {
    if (!highlightedAgentId) return;
    const timer = window.setTimeout(() => {
      matrixScrollRef.current?.scrollTo({ left: 0, behavior: "smooth" });
      rowRefs.current.get(highlightedAgentId)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 40);
    return () => window.clearTimeout(timer);
  }, [filteredAgents, highlightedAgentId]);

  return (
    <main className="case-audit-page">
      <TopNavigation active="validation" />

      <section className="case-audit-hero">
        <div>
          <p className="case-eyebrow"><span /> АУДИТ АРХИТЕКТУРЫ · CASE SIMULATION</p>
          <h1>Case Simulation<br /><em>Agent Engagement</em></h1>
          <p>Практическая проверка участия 64 агентов в одном полном маршруте — от обнаружения закупки до исполнения контракта.</p>
        </div>
        <div className="case-audit-version">
          <span>МЕТОДИКА</span>
          <b>ПОЭТАПНЫЙ АУДИТ</b>
          <small>Следующий кейс добавляется только после проверки текущего.</small>
        </div>
      </section>

      <section className={`case-module ${caseExpanded ? "is-expanded" : "is-collapsed"}`} aria-labelledby="case-1-module-title">
        <button
          type="button"
          className="case-module-toggle"
          aria-expanded={caseExpanded}
          aria-controls="case-1-content"
          onClick={toggleCase}
        >
          <span className="case-module-index">CASE 1</span>
          <span className="case-module-title">
            <small>DEMO · {case1.id}</small>
            <strong id="case-1-module-title">{case1.name}</strong>
          </span>
          <span className="case-module-summary">{metrics.required} Core · {metrics.conditional} Conditional · {metrics["not-involved"]} Skip</span>
          <span className="case-module-action">{caseExpanded ? "Свернуть" : "Развернуть"}<i aria-hidden="true">{caseExpanded ? "−" : "+"}</i></span>
        </button>

        <div className="case-module-content" id="case-1-content" hidden={!caseExpanded}>
      <section className="case-dossier" aria-label="Параметры Case 1">
        <div className="case-dossier-title">
          <span>DEMO · {case1.id}</span>
          <h2>{case1.name}</h2>
          <p>{case1.situation}</p>
        </div>
        <div className="case-dossier-facts">
          <article><small>КОМПАНИЯ</small><b>{case1.company}</b><span>{case1.companyCountry} · {case1.companyType}</span></article>
          <article><small>ОРГАНИЗАТОР</small><b>{case1.organizerCountry}</b><span>{case1.organizer} · {case1.funding}</span></article>
          <article><small>ТИП / ПРЕДМЕТ</small><b>{case1.tenderType}</b><span>{case1.subject}</span></article>
          <article><small>ЛОТ / БЮДЖЕТ</small><b>{case1.budget}</b><span>{case1.lot} · {case1.quantity}</span></article>
          <article><small>ПРОЦЕДУРА</small><b>{case1.procurementMethod}</b><span>Подача: {case1.submissionWindow} · исполнение: {case1.deliveryWindow}</span></article>
        </div>
      </section>

      <section className="case-audit-metrics" aria-label="Метрики участия агентов">
        <article className="metric-total"><span>ВСЕГО АГЕНТОВ</span><strong>64</strong><small>единый canonical registry</small></article>
        <article className="metric-required"><span>ОБЯЗАТЕЛЬНЫЕ</span><strong>{metrics.required}</strong><small>реально выполняются</small></article>
        <article className="metric-conditional"><span>УСЛОВНЫЕ</span><strong>{metrics.conditional}</strong><small>{conditionalTriggered} сработали · {conditionalStandby} в резерве</small></article>
        <article className="metric-skipped"><span>НЕ УЧАСТВУЮТ</span><strong>{metrics["not-involved"]}</strong><small>есть объяснение skip</small></article>
        <article className="metric-gap">
          <span>НЕПОКРЫТЫЕ ДЕЙСТВИЯ</span>
          <strong>
            {case1ProcessGraph.auditSummary.proposedMissingAgentIds.length}
            <sup>предв.</sup>
          </strong>
          <small>partner integrity · требует review</small>
        </article>
      </section>

      <section className="case-audit-breakdown">
        <div className="breakdown-block">
          <div className="section-kicker"><span>КЛАСС АГЕНТА</span><b>статус участия</b></div>
          <div className="tier-breakdown">
            {tierMetrics.map((item) => (
              <article key={item.tier}>
                <span className={`tier-dot tier-${item.tier}`} />
                <b>{tierRuLabels[item.tier]} <small>{item.total}</small></b>
                <p><i>{item.required} core</i><i>{item.conditional} if</i><i>{item["not-involved"]} skip</i></p>
              </article>
            ))}
          </div>
        </div>
        <div className="breakdown-block">
          <div className="section-kicker"><span>СТОРОНА ПЛАТФОРМЫ</span><b>пересекающиеся группы</b></div>
          <div className="platform-breakdown">
            {platformMetrics.map((item) => (
              <article key={item.side}>
                <span className={sideClasses[item.side]}>{platformSideLabels[item.side]}</span>
                <b>{item.engaged}<small> / {item.total}</small></b>
              </article>
            ))}
          </div>
        </div>
      </section>

      <nav className="case-view-switcher" aria-label="Представление Case 1">
        <div><span>CASE VIEW</span><p>Одна модель данных — три способа проверки.</p></div>
        <div role="group" aria-label="Case presentation">
          <button type="button" aria-pressed={caseView === "map"} onClick={() => setCaseView("map")}><b>Map</b><small>оркестрация и зависимости</small></button>
          <button type="button" aria-pressed={caseView === "narrative"} onClick={() => setCaseView("narrative")}><b>Narrative</b><small>хронологический рассказ</small></button>
          <button type="button" aria-pressed="false" onClick={() => matrixSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}><b>Matrix ↘</b><small>Cases × 64 Agents</small></button>
        </div>
      </nav>

      <div className="case-view-panel" hidden={caseView !== "map"}><CaseOrchestrationMap onOpenAgent={openAgent} /></div>

      <div className="case-view-panel" hidden={caseView !== "narrative"}>

      <section className="engagement-flow" aria-label="Последовательность участия">
        <div className="section-heading">
          <div><p>ЦЕПОЧКА ВЫПОЛНЕНИЯ →</p><h2>Этапы, агенты и передаваемый результат</h2></div>
          <span>Conditional учитываются отдельно от обязательного маршрута.</span>
        </div>
        <div className="stage-rail">
          {caseStages.map((stage) => {
            const stageRecords = case1Engagements.filter((record) => record.stageId === stage.id);
            const required = stageRecords.filter((record) => record.status === "required").length;
            const conditional = stageRecords.filter((record) => record.status === "conditional").length;
            return (
              <article className="stage-card" key={stage.id}>
                <div><span>{stage.number}</span><small>{required} core{conditional ? ` · ${conditional} if` : ""}</small></div>
                <h3>{stage.title}</h3>
                <p>{stage.description}</p>
                <footer><small>ПЕРЕДАЁТ ДАЛЬШЕ</small><b>{stage.handoff}</b></footer>
              </article>
            );
          })}
        </div>
      </section>

      <section className="case-chronology" aria-labelledby="case-1-chronology-title">
        <div className="section-heading chronology-heading">
          <div><p>CASE 1 · REVIEW NARRATIVE</p><h2 id="case-1-chronology-title">Хронология событий — Case 1</h2></div>
          <span>Рабочая DEMO-версия для проверки реалистичности, последовательности и полноты процесса.</span>
        </div>
        <div className="chronology-review-note">
          <span>ЦЕЛЬ ПРОВЕРКИ</span>
          <p>Это история конкретного тендера, а не абстрактная схема агентов. Каждый шаг показывает инициатора, фактическое действие, подключённых агентов, полученный результат и следующий переход.</p>
        </div>
        <ol className="chronology-list">
          {case1ProcessGraph.activities.map((event) => (
            <li className="chronology-event" key={event.id}>
              <div className="chronology-marker" aria-hidden="true"><span>{String(event.eventStep).padStart(2, "0")}</span><i /></div>
              <article>
                <header>
                  <div><small>{event.period} · {event.phase}</small><h3>{event.title}</h3></div>
                  <p><span>ИНИЦИАТОР</span><b>{event.initiator}</b></p>
                </header>
                <p className="chronology-narrative">{event.narrative}</p>
                <div className="chronology-agents">
                  <span>AGENTS</span>
                  <div>
                    {eventAgentEntries(event.eventStep, event.agentNames, event.standbyAgentNames).map(({ agent, isStandby, necessity, validationStatus, condition }) => {
                      if (!agent) return null;
                      return (
                        <button
                          type="button"
                          className={`chronology-agent-button ${necessity ? `agent-audit-${necessity}` : ""} ${validationStatus === "needs-review" ? "is-proposed" : ""}`}
                          key={`${agent.name}-${isStandby ? "standby" : necessity ?? "active"}`}
                          aria-haspopup="dialog"
                          aria-label={`Открыть карточку агента: ${String(agent.id).padStart(2, "0")} · ${agent.name}${isStandby ? " · резерв" : necessity ? ` · ${eventAgentAuditLabels[necessity]}` : ""}${validationStatus === "needs-review" ? " · требуется проверка" : ""}`}
                          title={condition}
                          onClick={() => openAgent(agent.id, event.eventStep)}
                        >
                          <span>{String(agent.id).padStart(2, "0")} ·</span>
                          <b>{agent.name}</b>
                          {isStandby && <small>резерв</small>}
                          {necessity && <small>{eventAgentAuditLabels[necessity]}</small>}
                          {validationStatus === "needs-review" && <small>PROPOSED · REVIEW</small>}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="chronology-handoff">
                  <div><span>РЕЗУЛЬТАТ</span><p>{event.result}</p></div>
                  <i aria-hidden="true">→</i>
                  <div><span>ЧТО ДАЛЬШЕ</span><p>{event.next}</p></div>
                </div>
              </article>
            </li>
          ))}
        </ol>
      </section>
      </div>

      <section className="case-audit-findings case-audit-consolidated" aria-label="Консолидированный аудит Case 1">
        <div className="section-heading"><div><p>CASE 1 · CONSOLIDATED EVENT AUDIT</p><h2>Итог аудита всех 20 Events</h2></div><span>Канонический registry 64 Agents не изменён; показаны только Case-specific assignments.</span></div>
        <div className="case-audit-summary-metrics">
          <article><strong>{case1ProcessGraph.auditSummary.auditedEventCount}<small>/20</small></strong><span>Events audited</span></article>
          <article><strong>{case1ProcessGraph.auditSummary.eventAgentFindingCount}</strong><span>Event × Agent findings</span></article>
          <article><strong>{case1ProcessGraph.auditSummary.retainedAssignmentCount}</strong><span>Retained assignments</span></article>
          <article><strong>{case1ProcessGraph.auditSummary.conditionalAssignmentCount}</strong><span>Conditional records</span></article>
          <article><strong>{case1ProcessGraph.auditSummary.movedAssignments.length}</strong><span>Moved</span></article>
          <article><strong>{case1ProcessGraph.auditSummary.removedAssignments.length}</strong><span>Removed duplicate</span></article>
          <article className="is-review"><strong>{case1ProcessGraph.auditSummary.proposedMissingAgentIds.length}</strong><span>Proposed / unresolved</span></article>
        </div>
        <div className="case-audit-summary-grid">
          <article>
            <span>MOVED BETWEEN EVENTS</span>
            {case1ProcessGraph.auditSummary.movedAssignments.map((item) => <p key={`${item.agentId}-${item.fromEventStep}`}><b>{String(item.agentId).padStart(2, "0")} · {agentById.get(item.agentId)?.name}</b><small>E{String(item.fromEventStep).padStart(2, "0")} → E{String(item.toEventStep).padStart(2, "0")} · {item.reason}</small></p>)}
          </article>
          <article>
            <span>REMOVED FROM EVENT</span>
            {case1ProcessGraph.auditSummary.removedAssignments.map((item) => <p key={`${item.agentId}-${item.eventStep}`}><b>{String(item.agentId).padStart(2, "0")} · {agentById.get(item.agentId)?.name}</b><small>Удалён из E{String(item.eventStep).padStart(2, "0")} · сохранён в E{String(item.retainedEventStep ?? 0).padStart(2, "0")} · {item.reason}</small></p>)}
          </article>
          <article>
            <span>ADDED TO EVENT ROUTES</span>
            <p><b>{case1ProcessGraph.auditSummary.addedAgentIds.map((id) => `${String(id).padStart(2, "0")} · ${agentById.get(id)?.name}`).join(" · ")}</b><small>Добавлены там, где Event result требовал отдельного output: calendar, readiness, provenance, final eligibility, audit baseline или human gate.</small></p>
          </article>
          <article className="is-review">
            <span>UNRESOLVED / PROPOSED</span>
            {case1ProcessGraph.auditSummary.unresolvedFindings.map((finding) => <p key={finding}><b>REVIEW</b><small>{finding}</small></p>)}
          </article>
          <article className="is-wide">
            <span>RESPONSIBILITY BOUNDARIES</span>
            <ul>{case1ProcessGraph.auditSummary.overlapFindings.map((finding) => <li key={finding}>{finding}</li>)}</ul>
          </article>
          <article className="is-wide">
            <span>IMPLICATIONS FOR CANONICAL 64</span>
            <ul>{case1ProcessGraph.auditSummary.canonicalRegistryImplications.map((finding) => <li key={finding}>{finding}</li>)}</ul>
          </article>
        </div>
      </section>
        </div>
      </section>

      <section className="engagement-matrix-section" aria-label="Главная матрица Cases × 64 Agents" ref={matrixSectionRef}>
        <div className="section-heading matrix-heading">
          <div><p>CASES × 64 AGENTS</p><h2>Матрица вовлечения</h2></div>
          <span>Нажмите статус Case 1, чтобы увидеть input, output и handoff.</span>
        </div>

        <div className="matrix-toolbar" aria-label="Фильтры матрицы">
          <div className="semantic-search">
            <label className="matrix-search">
              <span aria-hidden="true">⌕</span>
              <input
                value={query}
                onChange={(event) => { setQuery(event.target.value); setSearchOpen(Boolean(event.target.value.trim())); setActiveSearchIndex(0); setHighlightedAgentId(null); }}
                onFocus={() => setSearchOpen(Boolean(query.trim()))}
                onBlur={() => window.setTimeout(() => setSearchOpen(false), 140)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Найти по смыслу или названию"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={searchOpen && Boolean(query.trim())}
                aria-controls="semantic-agent-results"
              />
              <b>SEMANTIC</b>
            </label>
            {searchOpen && query.trim() && (
              <div className="semantic-results" id="semantic-agent-results" role="listbox" aria-label="Наиболее релевантные агенты">
                <header>
                  <div><span>ПОИСК ПО РОЛИ И РЕЗУЛЬТАТУ</span><b>{visibleSemanticResults.length} кандидатов</b></div>
                  <small>Точное название имеет наивысший приоритет</small>
                </header>
                {visibleSemanticResults.length ? visibleSemanticResults.map((result, index) => {
                  const agent = agentById.get(result.id)!;
                  const engagement = engagementByAgentId.get(result.id)!;
                  const stage = caseStages.find((candidate) => candidate.id === engagement.stageId)!;
                  return (
                    <button
                      className="semantic-result"
                      type="button"
                      role="option"
                      aria-selected={index === activeSearchIndex}
                      key={result.id}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setActiveSearchIndex(index)}
                      onClick={() => selectSemanticResult(result)}
                    >
                      <strong>{result.score}<small>/100</small></strong>
                      <span>
                        <b>{agent.name}</b>
                        <small>{agent.description}</small>
                        <i>{stage.number} · {stage.title} · {statusLabels[engagement.status]}</i>
                        <em>{result.reasons.length ? result.reasons.join(" · ") : "Контекстное совпадение"}</em>
                      </span>
                    </button>
                  );
                }) : (
                  <p className="semantic-empty">В текущих фильтрах кандидатов нет. Измените статус, класс или этап.</p>
                )}
              </div>
            )}
          </div>
          <div className="matrix-segment" aria-label="Фильтр статуса">
            {(["all", "required", "conditional", "not-involved"] as StatusFilter[]).map((status) => (
              <button key={status} type="button" aria-pressed={statusFilter === status} onClick={() => setStatusFilter(status)}>
                {status === "all" ? "Все" : statusLabels[status]}
              </button>
            ))}
          </div>
          <div className="matrix-segment" aria-label="Фильтр класса агента">
            {(["all", "main", "specialized", "optional"] as TierFilter[]).map((tier) => (
              <button key={tier} type="button" aria-pressed={tierFilter === tier} onClick={() => setTierFilter(tier)}>
                {tier === "all" ? "Все классы" : tierLabels[tier]}
              </button>
            ))}
          </div>
          <label className="stage-select"><span>ЭТАП</span><select value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}><option value="all">Все этапы</option>{caseStages.map((stage) => <option value={stage.id} key={stage.id}>{stage.number} · {stage.title}</option>)}</select></label>
          <span className="matrix-result-count">{query.trim() ? `${filteredAgents.length} кандидатов` : `${filteredAgents.length} / 64`}</span>
        </div>

        <div className="matrix-legend" aria-label="Легенда матрицы">
          <span className="legend-required"><i /> Обязателен</span>
          <span className="legend-conditional"><i /> Условно</span>
          <span className="legend-skipped"><i /> Не участвует</span>
          <small>Conditional: сплошная метка — условие сработало; контурная — резерв.</small>
        </div>

        <div className="matrix-scroll" ref={matrixScrollRef} aria-label="Прокручиваемая матрица Case 1 и будущих кейсов">
          <table className="engagement-matrix">
            <thead>
              <tr>
                <th className="agent-column"><span>AGENTS</span><b>64 архитектурных роли</b></th>
                <th className="case-one-column"><span>CASE 01 · ACTIVE</span><b>Школьная мебель</b><small>Грузия · $3,85 млн</small></th>
                {futureCases.map((caseNumber) => <th className="future-case" key={caseNumber}><span>CASE {String(caseNumber).padStart(2, "0")}</span><b>После аудита</b></th>)}
              </tr>
            </thead>
            <tbody>
              {groupedRows.map(({ stage, agents: stageAgents }) => (
                <StageRows
                  stage={stage}
                  stageAgents={stageAgents}
                  onSelect={(agentId) => openAgent(agentId)}
                  semanticResults={semanticResultById}
                  highlightedAgentId={highlightedAgentId}
                  registerRow={(agentId, node) => { if (node) rowRefs.current.set(agentId, node); else rowRefs.current.delete(agentId); }}
                  key={stage.id}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedAgent && selectedEngagement && selectedStage && (
        <AgentDetailDrawer
          agent={selectedAgent}
          context={selectedDetailContext}
          onClose={closeAgent}
          footer={(
            <footer className="drawer-case-footer">
              <button type="button" onClick={() => openAdjacentAgent(-1)} disabled={filteredAgents[0]?.id === selectedAgent.id}>← Предыдущий</button>
              <span>CASE 01 · V1</span>
              <button type="button" onClick={() => openAdjacentAgent(1)} disabled={filteredAgents.at(-1)?.id === selectedAgent.id}>Следующий →</button>
            </footer>
          )}
        />
      )}
    </main>
  );
}

function StageRows({
  stage,
  stageAgents,
  onSelect,
  semanticResults,
  highlightedAgentId,
  registerRow,
}: {
  stage: (typeof caseStages)[number];
  stageAgents: Agent[];
  onSelect: (agentId: number) => void;
  semanticResults: Map<number, SemanticSearchResult>;
  highlightedAgentId: number | null;
  registerRow: (agentId: number, node: HTMLTableRowElement | null) => void;
}) {
  return (
    <>
      <tr className="matrix-stage-row">
        <th colSpan={11}><span>{stage.number}</span><b>{stage.title}</b><small>{stageAgents.length} агентов в текущем фильтре</small></th>
      </tr>
      {stageAgents.map((agent) => {
        const engagement = engagementByAgentId.get(agent.id)!;
        const tier = getAgentTier(agent.id);
        const semanticResult = semanticResults.get(agent.id);
        return (
          <tr
            className={highlightedAgentId === agent.id ? "semantic-target" : undefined}
            ref={(node) => registerRow(agent.id, node)}
            key={agent.id}
          >
            <th className="agent-column agent-matrix-card" scope="row">
              <span className="matrix-agent-id">{String(agent.id).padStart(2, "0")}</span>
              <i className="matrix-agent-mark" style={{ "--agent-color": layerById[agent.layer].color } as React.CSSProperties}>{layerById[agent.layer].mark}</i>
              <span className="matrix-agent-copy">
                <b>{agent.name}</b>
                <small>{layerById[agent.layer].name} · {tierRuLabels[tier]}</small>
                {semanticResult && <em className="matrix-semantic-score">MATCH {semanticResult.score}/100</em>}
              </span>
              <PlatformBadges agent={agent} compact />
            </th>
            <td className="case-one-column">
              <button className={`engagement-cell cell-${engagement.status} ${engagement.activation ? `cell-${engagement.activation}` : ""}`} type="button" onClick={() => onSelect(agent.id)} aria-label={`${agent.name}: ${statusLabels[engagement.status]}`}>
                <span>{statusShortLabels[engagement.status]}</span>
                <b>{statusLabels[engagement.status]}</b>
                <small>{engagement.status === "conditional" ? (engagement.activation === "triggered" ? "условие сработало" : "резерв") : engagement.when}</small>
              </button>
            </td>
            {futureCases.map((caseNumber) => <td className="future-case" key={caseNumber}><span>—</span></td>)}
          </tr>
        );
      })}
    </>
  );
}
