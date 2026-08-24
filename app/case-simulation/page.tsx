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
import Case2Module from "./case-2-module";
import Case3Module from "./case-3-module";
import Case4Module from "./case-4-module";
import Case5Module from "./case-5-module";
import Case6Module from "./case-6-module";
import Case7Module from "./case-7-module";
import Case8Module from "./case-8-module";
import Case9Module from "./case-9-module";
import Case10Module from "./case-10-module";
import CaseComparison from "./case-comparison";
import CaseProgramConclusion from "./case-program-conclusion";
import { validationCases } from "./case-program-conclusion-data";
import { CaseExpansionProvider, useAllCaseExpansion, useCaseExpansion } from "./case-expansion";
import { SectionFocusButton, useSectionFocusMode } from "./section-focus-mode";
import {
  case1,
  case1Engagements,
  caseStages,
  type CaseAgentEngagement,
  type EngagementStatus,
} from "./case-1-data";
import { case1ProcessGraph } from "./case-1-graph";
import { case2, case2Engagements, case2Stages } from "./case-2-data";
import { case2ProcessGraph } from "./case-2-graph";
import { case3, case3Engagements, case3Stages } from "./case-3-data";
import { case3ProcessGraph } from "./case-3-graph";
import { case4, case4Engagements, case4Stages } from "./case-4-data";
import { case4ProcessGraph } from "./case-4-graph";
import { case5, case5Engagements, case5Stages } from "./case-5-data";
import { case5ProcessGraph } from "./case-5-graph";
import { case6, case6Engagements, case6Stages } from "./case-6-data";
import { case6ProcessGraph } from "./case-6-graph";
import { case7, case7Engagements, case7Stages } from "./case-7-data";
import { case7ProcessGraph } from "./case-7-graph";
import { case8, case8Engagements, case8Stages } from "./case-8-data";
import { case8ProcessGraph } from "./case-8-graph";
import { case9, case9Engagements, case9Stages } from "./case-9-data";
import { case9ProcessGraph } from "./case-9-graph";
import { case10, case10Engagements, case10Stages } from "./case-10-data";
import { case10ProcessGraph } from "./case-10-graph";
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
type ParticipationSort = "none" | "descending" | "ascending";
type ParticipationMetric = { cases: number; percent: number };

const statusLabels: Record<EngagementStatus, string> = {
  required: "Обязателен",
  conditional: "Условно",
  background: "Background",
  "not-involved": "Не участвует",
};

const statusShortLabels: Record<EngagementStatus, string> = {
  required: "CORE",
  conditional: "IF",
  background: "BG",
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

const engagementByAgentId = new Map(case1Engagements.map((engagement) => [engagement.agentId, engagement]));
const case2EngagementByAgentId = new Map(case2Engagements.map((engagement) => [engagement.agentId, engagement]));
const case3EngagementByAgentId = new Map(case3Engagements.map((engagement) => [engagement.agentId, engagement]));
const case4EngagementByAgentId = new Map(case4Engagements.map((engagement) => [engagement.agentId, engagement]));
const case5EngagementByAgentId = new Map(case5Engagements.map((engagement) => [engagement.agentId, engagement]));
const case6EngagementByAgentId = new Map(case6Engagements.map((engagement) => [engagement.agentId, engagement]));
const case7EngagementByAgentId = new Map(case7Engagements.map((engagement) => [engagement.agentId, engagement]));
const case8EngagementByAgentId = new Map(case8Engagements.map((engagement) => [engagement.agentId, engagement]));
const case9EngagementByAgentId = new Map(case9Engagements.map((engagement) => [engagement.agentId, engagement]));
const case10EngagementByAgentId = new Map(case10Engagements.map((engagement) => [engagement.agentId, engagement]));
const participationByAgentId = new Map(agents.map((agent): [number, ParticipationMetric] => {
  const participatingCases = validationCases.reduce((count, engagements) => {
    const engagement = engagements.find((record) => record.agentId === agent.id);
    return count + (engagement && engagement.status !== "not-involved" ? 1 : 0);
  }, 0);
  return [agent.id, {
    cases: participatingCases,
    percent: Math.round((participatingCases / validationCases.length) * 100),
  }];
}));
const participationStage = {
  id: "participation-ranking",
  number: "Σ",
  title: "Participation across 10 Cases",
};
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
    background: records.filter((record) => record.status === "background").length,
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
  return (
    <CaseExpansionProvider>
      <CaseSimulationContent />
    </CaseExpansionProvider>
  );
}

function CaseSimulationContent() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const [highlightedAgentId, setHighlightedAgentId] = useState<number | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [selectedAgentHistory, setSelectedAgentHistory] = useState<number[]>([]);
  const [selectedChronologyStep, setSelectedChronologyStep] = useState<number | null>(null);
  const [selectedCaseNumber, setSelectedCaseNumber] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10>(1);
  const [caseExpanded, setCaseExpanded] = useCaseExpansion("case-1", false);
  const { allExpanded: allSectionsExpanded, caseCount: sectionCount, caseIds: sectionIds, setAllCasesExpanded: setAllSectionsExpanded } = useAllCaseExpansion();
  const [matrixExpanded, setMatrixExpanded] = useCaseExpansion("engagement-matrix", true);
  const matrixFocusMode = useSectionFocusMode(matrixExpanded, setMatrixExpanded);
  const [participationSort, setParticipationSort] = useState<ParticipationSort>("none");
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

  const groupedRows = useMemo(() => {
    if (participationSort !== "none") {
      const direction = participationSort === "descending" ? -1 : 1;
      const rankedAgents = [...filteredAgents].sort((agentA, agentB) => {
        const difference = participationByAgentId.get(agentA.id)!.percent - participationByAgentId.get(agentB.id)!.percent;
        return difference === 0 ? agentA.id - agentB.id : difference * direction;
      });
      return [{
        stage: {
          ...participationStage,
          title: `${participationStage.title} · ${participationSort === "descending" ? "100 → 0%" : "0 → 100%"}`,
        },
        agents: rankedAgents,
      }];
    }

    return caseStages.map((stage) => ({
      stage,
      agents: filteredAgents.filter((agent) => engagementByAgentId.get(agent.id)?.stageId === stage.id),
    })).filter((group) => group.agents.length > 0);
  }, [filteredAgents, participationSort]);

  function cycleParticipationSort() {
    setParticipationSort((current) => current === "none" ? "descending" : current === "descending" ? "ascending" : "none");
  }

  const selectedAgent = selectedAgentId ? agents.find((agent) => agent.id === selectedAgentId) ?? null : null;
  const selectedEngagementMap = selectedCaseNumber === 1 ? engagementByAgentId : selectedCaseNumber === 2 ? case2EngagementByAgentId : selectedCaseNumber === 3 ? case3EngagementByAgentId : selectedCaseNumber === 4 ? case4EngagementByAgentId : selectedCaseNumber === 5 ? case5EngagementByAgentId : selectedCaseNumber === 6 ? case6EngagementByAgentId : selectedCaseNumber === 7 ? case7EngagementByAgentId : selectedCaseNumber === 8 ? case8EngagementByAgentId : selectedCaseNumber === 9 ? case9EngagementByAgentId : case10EngagementByAgentId;
  const selectedCaseStages = selectedCaseNumber === 1 ? caseStages : selectedCaseNumber === 2 ? case2Stages : selectedCaseNumber === 3 ? case3Stages : selectedCaseNumber === 4 ? case4Stages : selectedCaseNumber === 5 ? case5Stages : selectedCaseNumber === 6 ? case6Stages : selectedCaseNumber === 7 ? case7Stages : selectedCaseNumber === 8 ? case8Stages : selectedCaseNumber === 9 ? case9Stages : case10Stages;
  const selectedGraph = selectedCaseNumber === 1 ? case1ProcessGraph : selectedCaseNumber === 2 ? case2ProcessGraph : selectedCaseNumber === 3 ? case3ProcessGraph : selectedCaseNumber === 4 ? case4ProcessGraph : selectedCaseNumber === 5 ? case5ProcessGraph : selectedCaseNumber === 6 ? case6ProcessGraph : selectedCaseNumber === 7 ? case7ProcessGraph : selectedCaseNumber === 8 ? case8ProcessGraph : selectedCaseNumber === 9 ? case9ProcessGraph : case10ProcessGraph;
  const selectedCase = selectedCaseNumber === 1 ? case1 : selectedCaseNumber === 2 ? case2 : selectedCaseNumber === 3 ? case3 : selectedCaseNumber === 4 ? case4 : selectedCaseNumber === 5 ? case5 : selectedCaseNumber === 6 ? case6 : selectedCaseNumber === 7 ? case7 : selectedCaseNumber === 8 ? case8 : selectedCaseNumber === 9 ? case9 : case10;
  const selectedEngagement = selectedAgent ? selectedEngagementMap.get(selectedAgent.id) ?? null : null;
  const selectedStage = selectedEngagement ? selectedCaseStages.find((stage) => stage.id === selectedEngagement.stageId) ?? null : null;
  const selectedChronologyEvent = selectedChronologyStep
    ? selectedGraph.activities.find((event) => event.eventStep === selectedChronologyStep) ?? null
    : null;
  const selectedEventExecution = selectedChronologyStep && selectedAgent
    ? selectedGraph.agentExecutions.find((execution) => execution.eventStep === selectedChronologyStep && execution.agentId === selectedAgent.id)
    : undefined;
  const selectedDetailContext: AgentDetailContext | undefined = selectedEngagement && selectedStage ? {
    caseLabel: `CASE ${selectedCaseNumber}`,
    caseName: selectedCase.name,
    company: selectedCase.company,
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

  const openAgent = (agentId: number, chronologyStep: number | null = null, caseNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 = 1) => {
    setSelectedAgentHistory([]);
    setSelectedCaseNumber(caseNumber);
    setSelectedChronologyStep(chronologyStep);
    setSelectedAgentId(agentId);
  };

  const openReferencedAgent = (nextAgent: Agent) => {
    if (!selectedAgentId || selectedAgentId === nextAgent.id) return;
    setSelectedAgentHistory((history) => [...history, selectedAgentId]);
    setSelectedChronologyStep(null);
    setSelectedAgentId(nextAgent.id);
  };

  const closeAgent = () => {
    setSelectedAgentHistory([]);
    setSelectedAgentId(null);
    setSelectedChronologyStep(null);
  };

  const backToPreviousAgent = () => {
    setSelectedAgentHistory((current) => {
      const previousId = current.at(-1);
      if (previousId) setSelectedAgentId(previousId);
      return current.slice(0, -1);
    });
  };

  const openAdjacentAgent = (direction: -1 | 1) => {
    if (!selectedAgent) return;
    const index = filteredAgents.findIndex((agent) => agent.id === selectedAgent.id);
    if (index < 0) return;
    const nextIndex = Math.min(Math.max(index + direction, 0), filteredAgents.length - 1);
    setSelectedAgentHistory([]);
    setSelectedChronologyStep(null);
    setSelectedAgentId(filteredAgents[nextIndex]?.id ?? selectedAgent.id);
  };

  const toggleCase = () => {
    setCaseExpanded((current) => {
      if (current) closeAgent();
      return !current;
    });
  };

  const toggleAllCases = () => {
    const nextExpanded = !allSectionsExpanded;
    if (!nextExpanded) closeAgent();
    setAllSectionsExpanded(nextExpanded);
  };

  const revealMatrix = () => {
    setMatrixExpanded(true);
    window.requestAnimationFrame(() => matrixSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
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
          <p>Практическая проверка 64 агентов на независимых маршрутах — от первого trigger до явно определённой границы каждого Case.</p>
        </div>
        <div className="case-audit-version">
          <span>МЕТОДИКА</span>
          <b>ПОЭТАПНЫЙ АУДИТ</b>
          <small>Следующий кейс добавляется только после проверки текущего.</small>
        </div>
      </section>

      <div className="case-list-controls" aria-label="Управление всеми сворачиваемыми секциями страницы">
        <span>PAGE SECTIONS{sectionCount > 0 ? ` · ${sectionCount}` : ""}</span>
        <button
          type="button"
          className="case-expand-all-button"
          aria-expanded={allSectionsExpanded}
          aria-controls={sectionIds.map((sectionId) => `${sectionId}-content`).join(" ") || undefined}
          disabled={sectionCount === 0}
          onClick={toggleAllCases}
        >
          <span>{allSectionsExpanded ? "Свернуть все" : "Развернуть все"}</span>
          <i aria-hidden="true">{allSectionsExpanded ? "−" : "+"}</i>
        </button>
      </div>

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
          <span className="case-module-summary">{metrics.required} Core · {metrics.conditional} Conditional · {metrics.background} Background · {metrics["not-involved"]} Skip</span>
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
        <article className="metric-background"><span>BACKGROUND / PERSISTENT</span><strong>{metrics.background}</strong><small>не Event-step, а reusable pipeline</small></article>
        <article className="metric-skipped"><span>НЕ УЧАСТВУЮТ</span><strong>{metrics["not-involved"]}</strong><small>есть объяснение skip</small></article>
        <article className="metric-gap">
          <span>НЕПОКРЫТЫЕ ДЕЙСТВИЯ</span>
          <strong>
            {case1ProcessGraph.auditSummary.proposedMissingAgentIds.length}
            <sup>предв.</sup>
          </strong>
          <small>после dependency-aware redesign</small>
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
                <p><i>{item.required} core</i><i>{item.conditional} if</i><i>{item.background} bg</i><i>{item["not-involved"]} skip</i></p>
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

      <div className="case-view-panel" hidden={caseView !== "map"}><CaseOrchestrationMap graph={case1ProcessGraph} caseNumber={1} processNote="E02 читает готовые records; PB01 работает параллельно до E08." onOpenAgent={openAgent} /></div>

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
        <div className="section-heading"><div><p>CASE 1 · CONSOLIDATED EVENT AUDIT</p><h2>Dependency-aware redesign: 24 Events + background processes</h2></div><span>Канонический registry 64 Agents не изменён; Event execution отделён от persistent data production.</span></div>
        <div className="case-audit-summary-metrics">
          <article><strong>{case1ProcessGraph.auditSummary.auditedEventCount}<small>/24</small></strong><span>Events modelled</span></article>
          <article><strong>{case1ProcessGraph.processes.length}</strong><span>Processes modelled</span></article>
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
            {case1ProcessGraph.auditSummary.unresolvedFindings.length ? case1ProcessGraph.auditSummary.unresolvedFindings.map((finding) => <p key={finding}><b>REVIEW</b><small>{finding}</small></p>) : <p><b>0 OPEN</b><small>E02 prerequisite and handoff gaps are represented explicitly.</small></p>}
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

      <Case2Module
        onOpenAgent={(agentId, eventStep) => openAgent(agentId, eventStep, 2)}
        onScrollToMatrix={revealMatrix}
      />

      <Case3Module
        onOpenAgent={(agentId, eventStep) => openAgent(agentId, eventStep, 3)}
        onScrollToMatrix={revealMatrix}
      />

      <Case4Module
        onOpenAgent={(agentId, eventStep) => openAgent(agentId, eventStep, 4)}
        onScrollToMatrix={revealMatrix}
      />

      <Case5Module
        onOpenAgent={(agentId, eventStep) => openAgent(agentId, eventStep, 5)}
        onScrollToMatrix={revealMatrix}
      />

      <Case6Module
        onOpenAgent={(agentId, eventStep) => openAgent(agentId, eventStep, 6)}
        onScrollToMatrix={revealMatrix}
      />

      <Case7Module
        onOpenAgent={(agentId, eventStep) => openAgent(agentId, eventStep, 7)}
        onScrollToMatrix={revealMatrix}
      />

      <Case8Module
        onOpenAgent={(agentId, eventStep) => openAgent(agentId, eventStep, 8)}
        onScrollToMatrix={revealMatrix}
      />

      <Case9Module
        onOpenAgent={(agentId, eventStep) => openAgent(agentId, eventStep, 9)}
        onScrollToMatrix={revealMatrix}
      />

      <Case10Module
        onOpenAgent={(agentId, eventStep) => openAgent(agentId, eventStep, 10)}
        onScrollToMatrix={revealMatrix}
      />

      <CaseProgramConclusion onOpenAgent={(agentId) => openAgent(agentId, null, 10)} />

      <CaseComparison onOpenAgent={(agentId, caseNumber) => openAgent(agentId, null, caseNumber as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10)} />

      <section className={`engagement-matrix-section ${matrixExpanded ? "is-expanded" : "is-collapsed"} ${matrixFocusMode.active ? "is-focus-mode" : ""}`} aria-label="Главная матрица Cases × 64 Agents" ref={matrixSectionRef} data-focus-mode={matrixFocusMode.active ? "active" : "inactive"}>
        <div className="section-heading matrix-heading">
          <div><p>CASES × 64 AGENTS</p><h2>Матрица вовлечения</h2></div>
          <span>Cases 1–10 активны; 10-Case validation programme завершён. Нажмите статус, чтобы увидеть input, output, Dataset impact и handoff.</span>
          <SectionFocusButton active={matrixFocusMode.active} buttonRef={matrixFocusMode.buttonRef} onClick={matrixFocusMode.toggle} />
          <button type="button" className="case-section-toggle" aria-expanded={matrixExpanded} aria-controls="engagement-matrix-content" onClick={() => setMatrixExpanded((current) => !current)}>
            <span>{matrixExpanded ? "Свернуть" : "Развернуть"}</span><i aria-hidden="true">{matrixExpanded ? "−" : "+"}</i>
          </button>
        </div>

        <div id="engagement-matrix-content" hidden={!matrixExpanded}>
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
            {(["all", "required", "conditional", "background", "not-involved"] as StatusFilter[]).map((status) => (
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
          <span className="legend-background"><i /> Background / persistent</span>
          <span className="legend-skipped"><i /> Не участвует</span>
          <small>Conditional: сплошная метка — условие сработало; контурная — резерв.</small>
        </div>

        <div className="matrix-scroll" ref={matrixScrollRef} aria-label="Прокручиваемая матрица Cases 1–10">
          <table className="engagement-matrix">
            <thead>
              <tr>
                <th className="agent-column"><span>AGENTS</span><b>64 архитектурных роли</b></th>
                <th className="case-one-column"><span>CASE 01 · ACTIVE</span><b>Школьная мебель</b><small>Грузия · $3,85 млн</small></th>
                <th className="case-two-column"><span>CASE 02 · ACTIVE</span><b>Consultant-led PPE activation</b><small>Кения · $2,10 млн ceiling</small></th>
                <th className="case-three-column"><span>CASE 03 · ACTIVE</span><b>WTP consortium</b><small>Казахстан · $48,00 млн</small></th>
                <th className="case-four-column"><span>CASE 04 · ACTIVE</span><b>Digital health QCBS</b><small>Руанда · $4,80 млн</small></th>
                <th className="case-five-column"><span>CASE 05 · ACTIVE</span><b>Cold-chain framework</b><small>Кения · $12,40 млн ceiling</small></th>
                <th className="case-six-column"><span>CASE 06 · ACTIVE</span><b>Reverse auction remedy</b><small>Бразилия · $11,52 млн ceiling</small></th>
                <th className="case-seven-column"><span>CASE 07 · ACTIVE</span><b>Buyer recovery RFQ</b><small>Филиппины · $6,80 млн ceiling</small></th>
                <th className="case-eight-column"><span>CASE 08 · ACTIVE</span><b>E-bus PPP dialogue</b><small>Перу · $218 млн CAPEX</small></th>
                <th className="case-nine-column"><span>CASE 09 · ACTIVE</span><b>FIDIC claim + DAB</b><small>Марокко · $94,80 млн contract</small></th>
                <th className="case-ten-column"><span>CASE 10 · FINAL</span><b>Cyber integrity No-Bid</b><small>Молдова · €42,0 млн ceiling</small></th>
                <th
                  className="participation-column"
                  aria-sort={participationSort === "none" ? "none" : participationSort}
                >
                  <button
                    type="button"
                    className="participation-sort-button"
                    onClick={cycleParticipationSort}
                    title="Сортировать агентов по участию во всех 10 Cases"
                  >
                    <span>PARTICIPATION</span>
                    <b>Участие в 10 Cases</b>
                    <small>{participationSort === "none" ? "SORT ↕" : participationSort === "descending" ? "100 → 0% ↓" : "0 → 100% ↑"}</small>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {groupedRows.map(({ stage, agents: stageAgents }) => (
                <StageRows
                  stage={stage}
                  stageAgents={stageAgents}
                  onSelect={(agentId, caseNumber) => openAgent(agentId, null, caseNumber)}
                  semanticResults={semanticResultById}
                  highlightedAgentId={highlightedAgentId}
                  registerRow={(agentId, node) => { if (node) rowRefs.current.set(agentId, node); else rowRefs.current.delete(agentId); }}
                  key={stage.id}
                />
              ))}
            </tbody>
          </table>
        </div>
        </div>
      </section>

      {selectedAgent && selectedEngagement && selectedStage && (
        <AgentDetailDrawer
          key={selectedAgent.id}
          agent={selectedAgent}
          context={selectedDetailContext}
          onClose={closeAgent}
          onNavigateAgent={openReferencedAgent}
          navigationBack={{ canGoBack: selectedAgentHistory.length > 0, onBack: backToPreviousAgent }}
          footer={(
            <footer className="drawer-case-footer">
              <button type="button" onClick={() => openAdjacentAgent(-1)} disabled={filteredAgents[0]?.id === selectedAgent.id}>← Предыдущий</button>
              <span>CASE {String(selectedCaseNumber).padStart(2, "0")} · {selectedCaseNumber <= 2 ? "APPROVED" : "IN REVIEW V1"}</span>
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
  stage: { id: string; number: string; title: string };
  stageAgents: Agent[];
  onSelect: (agentId: number, caseNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10) => void;
  semanticResults: Map<number, SemanticSearchResult>;
  highlightedAgentId: number | null;
  registerRow: (agentId: number, node: HTMLTableRowElement | null) => void;
}) {
  return (
    <>
      <tr className="matrix-stage-row">
        <th colSpan={12}><span>{stage.number}</span><b>{stage.title}</b><small>{stageAgents.length} агентов в текущем фильтре</small></th>
      </tr>
      {stageAgents.map((agent) => {
        const engagement = engagementByAgentId.get(agent.id)!;
        const case2Engagement = case2EngagementByAgentId.get(agent.id)!;
        const case3Engagement = case3EngagementByAgentId.get(agent.id)!;
        const case4Engagement = case4EngagementByAgentId.get(agent.id)!;
        const case5Engagement = case5EngagementByAgentId.get(agent.id)!;
        const case6Engagement = case6EngagementByAgentId.get(agent.id)!;
        const case7Engagement = case7EngagementByAgentId.get(agent.id)!;
        const case8Engagement = case8EngagementByAgentId.get(agent.id)!;
        const case9Engagement = case9EngagementByAgentId.get(agent.id)!;
        const case10Engagement = case10EngagementByAgentId.get(agent.id)!;
        const participation = participationByAgentId.get(agent.id)!;
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
              <button className={`engagement-cell cell-${engagement.status} ${engagement.activation ? `cell-${engagement.activation}` : ""}`} type="button" onClick={() => onSelect(agent.id, 1)} aria-label={`${agent.name}, Case 1: ${statusLabels[engagement.status]}`}>
                <span>{statusShortLabels[engagement.status]}</span>
                <b>{statusLabels[engagement.status]}</b>
                <small>{engagement.status === "conditional" ? (engagement.activation === "triggered" ? "условие сработало" : "резерв") : engagement.status === "background" ? "persistent pipeline" : engagement.when}</small>
              </button>
            </td>
            <td className="case-two-column">
              <button className={`engagement-cell cell-${case2Engagement.status} ${case2Engagement.activation ? `cell-${case2Engagement.activation}` : ""}`} type="button" onClick={() => onSelect(agent.id, 2)} aria-label={`${agent.name}, Case 2: ${statusLabels[case2Engagement.status]}`}>
                <span>{statusShortLabels[case2Engagement.status]}</span>
                <b>{statusLabels[case2Engagement.status]}</b>
                <small>{case2Engagement.status === "conditional" ? (case2Engagement.activation === "triggered" ? "условие сработало" : "резерв") : case2Engagement.status === "background" ? "Process execution" : case2Engagement.when}</small>
              </button>
            </td>
            <td className="case-three-column">
              <button className={`engagement-cell cell-${case3Engagement.status} ${case3Engagement.activation ? `cell-${case3Engagement.activation}` : ""}`} type="button" onClick={() => onSelect(agent.id, 3)} aria-label={`${agent.name}, Case 3: ${statusLabels[case3Engagement.status]}`}>
                <span>{statusShortLabels[case3Engagement.status]}</span>
                <b>{statusLabels[case3Engagement.status]}</b>
                <small>{case3Engagement.status === "conditional" ? (case3Engagement.activation === "triggered" ? "условие сработало" : "резерв") : case3Engagement.status === "background" ? "Process execution" : case3Engagement.when}</small>
              </button>
            </td>
            <td className="case-four-column">
              <button className={`engagement-cell cell-${case4Engagement.status} ${case4Engagement.activation ? `cell-${case4Engagement.activation}` : ""}`} type="button" onClick={() => onSelect(agent.id, 4)} aria-label={`${agent.name}, Case 4: ${statusLabels[case4Engagement.status]}`}>
                <span>{statusShortLabels[case4Engagement.status]}</span>
                <b>{statusLabels[case4Engagement.status]}</b>
                <small>{case4Engagement.status === "conditional" ? (case4Engagement.activation === "triggered" ? "условие сработало" : "резерв") : case4Engagement.status === "background" ? "Process execution" : case4Engagement.when}</small>
              </button>
            </td>
            <td className="case-five-column">
              <button className={`engagement-cell cell-${case5Engagement.status} ${case5Engagement.activation ? `cell-${case5Engagement.activation}` : ""}`} type="button" onClick={() => onSelect(agent.id, 5)} aria-label={`${agent.name}, Case 5: ${statusLabels[case5Engagement.status]}`}>
                <span>{statusShortLabels[case5Engagement.status]}</span>
                <b>{statusLabels[case5Engagement.status]}</b>
                <small>{case5Engagement.status === "conditional" ? (case5Engagement.activation === "triggered" ? "условие сработало" : "резерв") : case5Engagement.status === "background" ? "Process execution" : case5Engagement.when}</small>
              </button>
            </td>
            <td className="case-six-column">
              <button className={`engagement-cell cell-${case6Engagement.status} ${case6Engagement.activation ? `cell-${case6Engagement.activation}` : ""}`} type="button" onClick={() => onSelect(agent.id, 6)} aria-label={`${agent.name}, Case 6: ${statusLabels[case6Engagement.status]}`}>
                <span>{statusShortLabels[case6Engagement.status]}</span>
                <b>{statusLabels[case6Engagement.status]}</b>
                <small>{case6Engagement.status === "conditional" ? (case6Engagement.activation === "triggered" ? "условие сработало" : "резерв") : case6Engagement.status === "background" ? "Process execution" : case6Engagement.when}</small>
              </button>
            </td>
            <td className="case-seven-column">
              <button className={`engagement-cell cell-${case7Engagement.status} ${case7Engagement.activation ? `cell-${case7Engagement.activation}` : ""}`} type="button" onClick={() => onSelect(agent.id, 7)} aria-label={`${agent.name}, Case 7: ${statusLabels[case7Engagement.status]}`}>
                <span>{statusShortLabels[case7Engagement.status]}</span>
                <b>{statusLabels[case7Engagement.status]}</b>
                <small>{case7Engagement.status === "conditional" ? (case7Engagement.activation === "triggered" ? "условие сработало" : "резерв") : case7Engagement.status === "background" ? "Process execution" : case7Engagement.when}</small>
              </button>
            </td>
            <td className="case-eight-column">
              <button className={`engagement-cell cell-${case8Engagement.status} ${case8Engagement.activation ? `cell-${case8Engagement.activation}` : ""}`} type="button" onClick={() => onSelect(agent.id, 8)} aria-label={`${agent.name}, Case 8: ${statusLabels[case8Engagement.status]}`}>
                <span>{statusShortLabels[case8Engagement.status]}</span>
                <b>{statusLabels[case8Engagement.status]}</b>
                <small>{case8Engagement.status === "conditional" ? (case8Engagement.activation === "triggered" ? "условие сработало" : "резерв") : case8Engagement.status === "background" ? "Process execution" : case8Engagement.when}</small>
              </button>
            </td>
            <td className="case-nine-column">
              <button className={`engagement-cell cell-${case9Engagement.status} ${case9Engagement.activation ? `cell-${case9Engagement.activation}` : ""}`} type="button" onClick={() => onSelect(agent.id, 9)} aria-label={`${agent.name}, Case 9: ${statusLabels[case9Engagement.status]}`}>
                <span>{statusShortLabels[case9Engagement.status]}</span>
                <b>{statusLabels[case9Engagement.status]}</b>
                <small>{case9Engagement.status === "conditional" ? (case9Engagement.activation === "triggered" ? "условие сработало" : "резерв") : case9Engagement.status === "background" ? "Process execution" : case9Engagement.when}</small>
              </button>
            </td>
            <td className="case-ten-column">
              <button className={`engagement-cell cell-${case10Engagement.status} ${case10Engagement.activation ? `cell-${case10Engagement.activation}` : ""}`} type="button" onClick={() => onSelect(agent.id, 10)} aria-label={`${agent.name}, Case 10: ${statusLabels[case10Engagement.status]}`}>
                <span>{statusShortLabels[case10Engagement.status]}</span>
                <b>{statusLabels[case10Engagement.status]}</b>
                <small>{case10Engagement.status === "conditional" ? (case10Engagement.activation === "triggered" ? "условие сработало" : "резерв") : case10Engagement.status === "background" ? "Process execution" : case10Engagement.when}</small>
              </button>
            </td>
            <td className="participation-column">
              <div
                className={`participation-cell participation-${participation.percent >= 80 ? "high" : participation.percent >= 50 ? "medium" : "low"}`}
                aria-label={`${agent.name}: участие в ${participation.cases} из ${validationCases.length} Cases, ${participation.percent}%`}
              >
                <span className="participation-value"><strong>{participation.percent}%</strong><small>{participation.cases}/{validationCases.length}</small></span>
                <span
                  className="participation-track"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={participation.percent}
                  aria-label={`${participation.percent}% участия`}
                >
                  <i style={{ width: `${participation.percent}%` }} />
                </span>
              </div>
            </td>
          </tr>
        );
      })}
    </>
  );
}
