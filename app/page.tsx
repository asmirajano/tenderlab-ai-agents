"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- native navigation preserves independent Firebase pages */

import { useEffect, useMemo, useState } from "react";
import TopNavigation, { type PrimaryPage } from "./top-navigation";
import AgentNetworkView from "./agent-network-view";
import AgentMatrixView from "./agent-matrix-view";
import { AgentComparisonBar, AgentComparisonModal } from "./agent-comparison";
import { AgentReferenceButton, AgentReferenceList, AgentReferenceText } from "./agent-reference-text";
import {
  AgentReviewControl,
  AgentWorkspaceAccount,
  agentReviewOptions,
  reviewStatusFor,
  useAgentWorkspace,
  type AgentReviewFilter,
} from "./agent-workspace";
import {
  agents,
  agentExamples,
  getAgentTier,
  layerById,
  layers,
  matchesPlatformFilter,
  platformFilterCounts,
  platformFilterOptions,
  platformSideLabels,
  subagentParentIds,
  tenderLifecycle,
  tierActivationLabels,
  tierLabels,
  type Agent,
  type AgentTier,
  type ArchitectureView,
  type PlatformFilter,
} from "../packages/catalog-data/src/agents";
import type { EventAgentExecution } from "./process-model";
import {
  datasetContributionsForAgent,
  datasetGapsForAgent,
  datasetRelationshipLabels,
  deliverableForAgent,
  tenderDatasets,
  tenderEcosystemDatasetUrl,
} from "../packages/catalog-data/src";
import {
  createSemanticSearchDocument,
  rankSemanticDocuments,
  selectVisibleSemanticResults,
  type SemanticSearchResult,
} from "./case-simulation/semantic-search";

const agentById = new Map(agents.map((agent) => [agent.id, agent]));
const catalogSemanticDocuments = agents.map((agent) => {
  const layer = layerById[agent.layer];
  return createSemanticSearchDocument({
    id: agent.id,
    name: agent.name,
    aliases: agent.previousNames,
    description: [agent.description, agent.profile.simply].join(" · "),
    scope: agent.profile.responsibilityScope,
    activities: agent.profile.activities.join(" · "),
    exclusions: agent.profile.exclusions.join(" · "),
    inputs: agent.profile.typicalInputs.join(" · "),
    trigger: agent.profile.trigger,
    boundary: agent.profile.responsibilityBoundary,
    distinction: [
      agent.profile.keyDistinction,
      ...agent.profile.potentialOverlaps.map((overlap) => overlap.note),
      agent.profile.validationFinding ?? "",
    ].filter(Boolean).join(" · "),
    workflow: [
      agent.profile.workflowStage,
      agent.profile.authority,
      agent.profile.skipCondition,
      ...agent.profile.upstream,
    ].join(" · "),
    output: [agent.output.primary, ...agent.output.artifacts, agent.output.consumers].join(" · "),
    rationale: Object.values(agent.platformRationale).filter(Boolean).join(" · "),
    metadata: [
      tierLabels[getAgentTier(agent.id)],
      layer.name,
      layer.ru,
      ...agent.platformSides.map((side) => platformSideLabels[side]),
    ].join(" · "),
  });
});

function semanticMatchExplanation(agent: Agent, result: SemanticSearchResult) {
  if (result.exact) return "Точное совпадение с названием или alias Agent.";
  const field = result.reasons[0];
  const evidence: Record<string, string> = {
    "Core Purpose / Simply": agent.profile.simply,
    "Responsibility / Scope": agent.profile.responsibilityScope,
    "What It Does": agent.profile.activities.join("; "),
    "What It Should NOT Do": agent.profile.exclusions.join("; "),
    "Typical Inputs": agent.profile.typicalInputs.join("; "),
    "Trigger / Activation": agent.profile.trigger,
    "Responsibility Boundary": agent.profile.responsibilityBoundary,
    "Key Distinction": agent.profile.keyDistinction,
    "Result / Output": `${agent.output.primary}: ${agent.output.artifacts.join("; ")}`,
    Workflow: `${agent.profile.workflowStage}. ${agent.profile.authority}`,
    "Platform rationale": Object.values(agent.platformRationale).filter(Boolean)[0] ?? agent.description,
    "Класс / слой / сторона": `${layerById[agent.layer].name} · ${tierLabels[getAgentTier(agent.id)]}`,
  };
  return field && evidence[field] ? `${field}: ${evidence[field]}` : agent.profile.simply;
}

function semanticAssessment(score: number, leaderScore = score) {
  if (score >= 78 && score >= leaderScore - 5) return { id: "strong", label: "Strong match", text: "Вероятно, capability уже имеет явного владельца." };
  if (score >= 55) return { id: "partial", label: "Partial matches", text: "Проверьте overlap и границы ответственности нескольких Agents." };
  if (score >= 35) return { id: "weak", label: "Weak match", text: "Возможен пробел capability или недостаточно ясная Agent definition." };
  return { id: "gap", label: "Potential architecture gap", text: "Значимого владельца capability среди 64 Agents не найдено — требуется review." };
}

type AgentCardProps = {
  agent: Agent;
  className?: string;
  compareSelected?: boolean;
  onSelect: (agent: Agent) => void;
  onToggleCompare: (agentId: number) => void;
  parentCount?: number;
};

function AgentCard({ agent, className = "", compareSelected = false, onSelect, onToggleCompare, parentCount = 0 }: AgentCardProps) {
  const layer = layerById[agent.layer];
  const tier = getAgentTier(agent.id);

  return (
    <article
      className={`agent-card tier-${tier} ${compareSelected ? "is-compare-selected" : ""} ${className}`.trim()}
      style={{ "--layer-color": layer.color } as React.CSSProperties}
    >
      <button className="agent-card-open" type="button" onClick={() => onSelect(agent)} aria-label={`Open ${agent.name} profile`} />
      <button
        aria-pressed={compareSelected}
        className="agent-compare-toggle"
        onClick={() => onToggleCompare(agent.id)}
        type="button"
      >
        <i aria-hidden="true">{compareSelected ? "✓" : "+"}</i><span>{compareSelected ? "Selected" : "Compare"}</span>
      </button>
      <span className="card-index">{String(agent.id).padStart(2, "0")}</span>
      <span className="agent-symbol">{layer.mark}</span>
      <span className={`tier-badge badge-${tier}`}>{tierLabels[tier]}</span>
      <strong>{agent.name}</strong>
      <p>{agent.profile.simply}</p>
      <span className="platform-badges" aria-label="Used in">
        {agent.platformSides.map((side) => (
          <span className={`platform-badge platform-${side}`} key={side}>{platformSideLabels[side]}</span>
        ))}
      </span>
      <AgentReviewControl agentId={agent.id} canonicalRegistryId={agent.registryId} compact />
      {parentCount > 1 && <span className="shared-support">↔ Shared · {parentCount} Main</span>}
      <span className="card-layer">{layer.number} · {layer.name}</span>
      <span className="card-arrow">↗</span>
    </article>
  );
}

function MainAgentOutputCard({ agent }: { agent: Agent }) {
  const output = agent.output;
  if (!output) return null;

  return (
    <aside className="main-output-card" aria-label={`${agent.name} result and output`}>
      <div className="output-card-heading">
        <span>RESULT / OUTPUT</span>
        <i aria-hidden="true">✓</i>
      </div>
      <strong>{output.primary}</strong>
      <div className="output-artifacts" aria-label="Output artifacts">
        {output.artifacts.map((artifact) => <span key={artifact}>{artifact}</span>)}
      </div>
      <p><span>ПЕРЕДАЁТ →</span>{output.consumers}</p>
    </aside>
  );
}

function AgentDrawerOutput({ agent, onOpenAgent }: { agent: Agent; onOpenAgent?: (agent: Agent) => void }) {
  return (
    <section className="drawer-output" aria-label={`${agent.name} result and output`}>
      <div className="drawer-output-heading">
        <span>RESULT / OUTPUT</span>
        <b>DELIVERABLE</b>
      </div>
      <h4><AgentReferenceText text={agent.output.primary} subjectAgentId={agent.id} onOpenAgent={onOpenAgent} /></h4>
      <div className="drawer-output-artifacts" aria-label="Expected output structure">
        {agent.output.artifacts.map((artifact) => <span key={artifact}><AgentReferenceText text={artifact} subjectAgentId={agent.id} onOpenAgent={onOpenAgent} /></span>)}
      </div>
      <p><span>ИСПОЛЬЗУЕТСЯ →</span><AgentReferenceText text={agent.output.consumers} subjectAgentId={agent.id} onOpenAgent={onOpenAgent} /></p>
    </section>
  );
}

function AgentPlatformRationale({ agent, onOpenAgent }: { agent: Agent; onOpenAgent?: (agent: Agent) => void }) {
  const classification = agent.platformSides.length > 1
    ? "Shared"
    : platformSideLabels[agent.platformSides[0]];

  return (
    <section className="drawer-platform-rationale" aria-label={`${agent.name} platform-side rationale`}>
      <div className="drawer-rationale-heading">
        <span>PLATFORM ROLE / WHY</span>
        <b>{classification}</b>
      </div>
      <div className={`drawer-rationale-list ${agent.platformSides.length > 1 ? "rationale-shared" : "rationale-single"}`}>
        {agent.platformSides.map((side) => (
          <article key={side}>
            {agent.platformSides.length > 1 && (
              <span className={`rationale-side rationale-${side}`}>{platformSideLabels[side]}</span>
            )}
            <p><AgentReferenceText text={agent.platformRationale[side]} subjectAgentId={agent.id} onOpenAgent={onOpenAgent} /></p>
          </article>
        ))}
      </div>
    </section>
  );
}

function AgentOperationalMetadata({ agent }: { agent: Agent }) {
  const tier = getAgentTier(agent.id);

  return (
    <section className="drawer-operations" aria-label={`${agent.name} operational metadata`}>
      <span>OPERATIONAL</span>
      <div>
        <p><small>AVAILABILITY</small><strong><i /> AVAILABLE</strong></p>
        <p><small>AGENT TYPE</small><b className={`operations-tier operations-${tier}`}>{tierLabels[tier]}</b></p>
        <p><small>ACTIVATION</small><b>{tierActivationLabels[tier]}</b></p>
      </div>
    </section>
  );
}

function AgentDataOutputs({ agent }: { agent: Agent }) {
  const deliverable = deliverableForAgent(agent.registryId);
  const contributions = datasetContributionsForAgent(agent.registryId);
  const gaps = datasetGapsForAgent(agent.registryId);
  if (!deliverable) return null;

  return (
    <section className="drawer-data-outputs" aria-label={`${agent.name} data outputs and datasets`}>
      <div className="drawer-data-heading">
        <span>DATA OUTPUTS / DATASETS</span>
      </div>
      <article className="drawer-deliverable-record">
        <small>CANONICAL DELIVERABLE</small>
        <strong>{deliverable.name}</strong>
      </article>
      {(contributions.length > 0 || gaps.length > 0) && <span className="drawer-dataset-arrow" aria-hidden="true">↓</span>}
      {contributions.length > 0 && (
        <div className="drawer-dataset-relations">
          {contributions.map((relation) => {
            const dataset = tenderDatasets.find((item) => item.id === relation.datasetId);
            const href = tenderEcosystemDatasetUrl(relation.datasetId);
            if (!dataset) return null;
            return (
              <article key={relation.id}>
                <div className="dataset-relation-topline"><span>{datasetRelationshipLabels[relation.relationshipType]}</span></div>
                <small className="dataset-field-label">DATASET</small>
                <strong>{dataset.name.en}</strong>
                <code>{dataset.id.replace("dataset:", "")}</code>
                <div className="dataset-provides"><small>PROVIDES</small>{relation.provides.map((item) => <i key={item}>{item}</i>)}</div>
                {href && <a className="dataset-profile-link" href={href} target="_blank" rel="noreferrer">Open Dataset ↗</a>}
              </article>
            );
          })}
        </div>
      )}
      {gaps.map((gap) => (
        <article className="drawer-dataset-gap" key={gap.id}>
          <div><span>POTENTIAL DATASET GAP</span></div>
          <strong>{gap.proposedName}</strong>
          <p>{gap.neededRecord}</p>
          <small>{gap.whyExistingDatasetsDoNotFit}</small>
        </article>
      ))}
      {contributions.length === 0 && gaps.length === 0 && (
        <p className="drawer-no-dataset"><span>NO DATASET RELATION</span>{deliverable.rationale}</p>
      )}
    </section>
  );
}

function AgentCanonicalProfile({ agent, onOpenAgent }: { agent: Agent; onOpenAgent?: (agent: Agent) => void }) {
  return (
    <section className="drawer-canonical-profile" aria-label={`${agent.name} canonical mandate and boundaries`}>
      <div className="drawer-profile-heading">
        <span>CANONICAL RESPONSIBILITY PROFILE</span>
        <b className={`profile-status profile-status-${agent.profile.definitionStatus}`}>{agent.profile.definitionStatus === "structured" ? "STRUCTURED" : "NEEDS REVIEW"}</b>
      </div>
      <div className="drawer-profile-summary">
        <article><small>CORE PURPOSE</small><p><AgentReferenceText text={agent.description} subjectAgentId={agent.id} onOpenAgent={onOpenAgent} /></p></article>
        <article><small>RESPONSIBILITY / SCOPE</small><p><AgentReferenceText text={agent.profile.responsibilityScope} subjectAgentId={agent.id} onOpenAgent={onOpenAgent} /></p></article>
        <article><small>KEY DISTINCTION</small><p><AgentReferenceText text={agent.profile.keyDistinction} subjectAgentId={agent.id} onOpenAgent={onOpenAgent} /></p></article>
        <article><small>RESPONSIBILITY BOUNDARY</small><p><AgentReferenceText text={agent.profile.responsibilityBoundary} subjectAgentId={agent.id} onOpenAgent={onOpenAgent} /></p></article>
      </div>
      <div className="drawer-profile-lists">
        <article><small>WHAT IT DOES</small><AgentReferenceList items={agent.profile.activities} subjectAgentId={agent.id} onOpenAgent={onOpenAgent} /></article>
        <article><small>WHAT IT EXPLICITLY SHOULD NOT DO</small><AgentReferenceList items={agent.profile.exclusions} subjectAgentId={agent.id} onOpenAgent={onOpenAgent} /></article>
      </div>
      <div className="drawer-overlap-finding">
        <span>POTENTIAL OVERLAP</span>
        <div className="drawer-overlap-references">{agent.profile.potentialOverlaps.flatMap((finding) => finding.agentIds).map((id) => {
          const counterpart = agents.find((candidate) => candidate.id === id);
          return counterpart ? <AgentReferenceButton key={id} agent={counterpart} onOpenAgent={onOpenAgent} /> : null;
        })}</div>
        {agent.profile.potentialOverlaps.map((finding) => <p key={finding.agentIds.join("-")}><AgentReferenceText text={finding.note} subjectAgentId={agent.id} onOpenAgent={onOpenAgent} /></p>)}
        {agent.profile.validationFinding && <p className="drawer-validation-note"><small>VALIDATION FINDING</small><AgentReferenceText text={agent.profile.validationFinding} subjectAgentId={agent.id} onOpenAgent={onOpenAgent} /></p>}
      </div>
    </section>
  );
}

function AgentOperatingContract({ agent, onOpenAgent }: { agent: Agent; onOpenAgent?: (agent: Agent) => void }) {
  return (
    <section className="drawer-process drawer-operating-contract" aria-label={`${agent.name} operating contract`}>
      <div className="drawer-process-heading"><span>HOW IT WORKS / OPERATING CONTRACT</span><b>{agent.profile.workflowStage}</b></div>
      <div className="drawer-contract-flow">
        <article><span>A · TYPICAL INPUTS</span><AgentReferenceList items={agent.profile.typicalInputs} subjectAgentId={agent.id} onOpenAgent={onOpenAgent} /></article>
        <i>→</i>
        <article><span>B · EXECUTION</span><AgentReferenceList items={agent.profile.activities} subjectAgentId={agent.id} onOpenAgent={onOpenAgent} /></article>
        <i>→</i>
        <article><span>C · NEXT / HANDOFF</span><p><AgentReferenceText text={agent.output.consumers} subjectAgentId={agent.id} onOpenAgent={onOpenAgent} /></p></article>
      </div>
      <div className="drawer-contract-rules">
        <article><small>TRIGGER / ACTIVATION</small><p><AgentReferenceText text={agent.profile.trigger} subjectAgentId={agent.id} onOpenAgent={onOpenAgent} /></p></article>
        <article><small>SKIP CONDITION</small><p><AgentReferenceText text={agent.profile.skipCondition} subjectAgentId={agent.id} onOpenAgent={onOpenAgent} /></p></article>
        <article><small>DECISIONS / AUTHORITY</small><p><AgentReferenceText text={agent.profile.authority} subjectAgentId={agent.id} onOpenAgent={onOpenAgent} /></p></article>
      </div>
    </section>
  );
}

export type AgentDetailContext = {
  caseLabel: string;
  caseName: string;
  company: string;
  stage: string;
  status: "required" | "conditional" | "not-involved";
  statusLabel: string;
  when: string;
  why: string;
  input?: string;
  output?: string;
  next?: string;
  condition?: string;
  activation?: "triggered" | "standby";
  skipReason?: string;
  event?: {
    step: number;
    period: string;
    phase: string;
    title: string;
    narrative: string;
    result: string;
  };
  eventExecution?: EventAgentExecution & {
    necessityLabel: string;
    eventResult: string;
  };
};

function AgentDetailDrawerView({
  agent,
  onClose,
  onOpenReference,
  onBack,
  canGoBack,
  navigationDepth,
  context,
  footer,
}: {
  agent: Agent;
  onClose: () => void;
  onOpenReference: (agent: Agent) => void;
  onBack: () => void;
  canGoBack: boolean;
  navigationDepth: number;
  context?: AgentDetailContext;
  footer?: ReactNode;
}) {
  const example = agentExamples[agent.id];
  const hasEventExecution = Boolean(context?.eventExecution);
  const contextExampleTitle = hasEventExecution ? example.item : context?.event?.title ?? context?.caseName;
  const contextExampleBody = context
    ? hasEventExecution ? example.result : context.event?.narrative ?? `${context.when} ${context.why}`
    : undefined;
  const contextExampleResult = hasEventExecution ? undefined : context?.event?.result ?? context?.output;

  return (
    <div className="drawer-shell" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside
        className="agent-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="agent-detail-title"
        data-navigation-depth={navigationDepth}
        style={{ "--layer-color": layerById[agent.layer].color } as React.CSSProperties}
      >
        <button className="drawer-close" type="button" onClick={onClose} aria-label="Закрыть">×</button>
        {canGoBack && <button className="drawer-agent-back" type="button" onClick={onBack} aria-label="Вернуться к предыдущему Agent">← Back</button>}
        <header className="drawer-identity">
          <div className="drawer-icon">{layerById[agent.layer].mark}</div>
          <div className="drawer-identity-copy">
            <div className="drawer-topline">
              <span>{String(agent.id).padStart(2, "0")}</span>
              <b>{layerById[agent.layer].number} · {layerById[agent.layer].name}</b>
              {context && <em>CASE CONTEXT</em>}
            </div>
            <h3 id="agent-detail-title">{agent.name}</h3>
             <p className="drawer-purpose"><span>SIMPLY / ПРОСТО</span><AgentReferenceText text={agent.profile.simply} subjectAgentId={agent.id} onOpenAgent={onOpenReference} /></p>
          </div>
        </header>
        <section className="drawer-working-state" aria-label={`${agent.name} personal working state`}>
          <div><span>MY WORKING STATE</span><p>Личный статус не изменяет canonical Agent definition или Case Audit.</p></div>
          <AgentReviewControl agentId={agent.id} canonicalRegistryId={agent.registryId} />
        </section>
        <AgentCanonicalProfile agent={agent} onOpenAgent={onOpenReference} />
        <AgentPlatformRationale agent={agent} onOpenAgent={onOpenReference} />
        <AgentOperatingContract agent={agent} onOpenAgent={onOpenReference} />
        <AgentDrawerOutput agent={agent} onOpenAgent={onOpenReference} />
        <AgentDataOutputs agent={agent} />

        {context && (
          <section className="drawer-case-context" aria-label={`${agent.name} context for ${context.caseLabel}`}>
            <div className="drawer-context-heading">
              <div><span>{hasEventExecution ? "EVENT-SPECIFIC EXECUTION" : "CASE-SPECIFIC CONTEXT"}</span><b>DEMO · {context.caseLabel}</b></div>
              <i className={`context-status ${hasEventExecution ? `context-audit-${context.eventExecution?.necessity}` : `context-status-${context.status}`}`}>{context.eventExecution?.necessityLabel ?? context.statusLabel}</i>
            </div>
            <p className="drawer-context-location">
              <span>{context.event ? `EVENT ${String(context.event.step).padStart(2, "0")}` : "WORKFLOW STAGE"}</span>
              <b>{context.event ? `${context.event.period} · ${context.event.phase}` : context.stage}</b>
            </p>
            {context.eventExecution ? (
              <div className="drawer-event-execution">
                <div className="drawer-execution-purpose">
                  <p><small>ROLE IN THIS EVENT</small><b>{context.eventExecution.role}</b></p>
                  <p><small>EXECUTION / ACTION</small><b>{context.eventExecution.action}</b></p>
                </div>
                <div className="drawer-context-flow" aria-label="Event-specific Agent input, output and handoff">
                  <article><span>A · AGENT INPUT</span><p>{context.eventExecution.input}</p></article>
                  <i>→</i>
                  <article className="context-flow-output"><span>B · AGENT OUTPUT</span><p>{context.eventExecution.output}</p></article>
                  <i>→</i>
                  <article><span>C · HANDOFF</span><p>{context.eventExecution.handoff}</p></article>
                </div>
                <div className="drawer-execution-evidence">
                  <span>CASE 1 EVIDENCE</span>
                  <ul>{context.eventExecution.evidence.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
                <div className={`drawer-execution-necessity necessity-${context.eventExecution.necessity}`}>
                  <div><span>NECESSITY / JUSTIFICATION</span><b>{context.eventExecution.necessityLabel}</b></div>
                  <p>{context.eventExecution.necessityRationale}</p>
                  {context.eventExecution.condition && <p><small>УСЛОВИЕ АКТИВАЦИИ</small>{context.eventExecution.condition}{context.eventExecution.activation ? ` · ${context.eventExecution.activation.toUpperCase()}` : ""}</p>}
                  <p><small>ЕСЛИ УБРАТЬ ИЗ E{String(context.event?.step ?? 0).padStart(2, "0")}</small>{context.eventExecution.absenceImpact}</p>
                  {context.eventExecution.overlapNote && <p><small>ГРАНИЦА / OVERLAP</small>{context.eventExecution.overlapNote}</p>}
                  {context.eventExecution.proposedEventStep && <p><small>ИСПРАВЛЕННЫЙ МАРШРУТ</small>Event {String(context.eventExecution.proposedEventStep).padStart(2, "0")} — отражён в сквозном Case 1 audit.</p>}
                  {context.eventExecution.validationStatus === "needs-review" && <p><small>VALIDATION STATUS</small>PROPOSED · требует экспертного подтверждения и не считается доказанным выполнением.</p>}
                </div>
                <div className="drawer-event-result-reference"><span>COMBINED EVENT RESULT</span><p>{context.eventExecution.eventResult}</p><small>Этот результат собирается из подтверждённых Agent outputs; он не является индивидуальным output данного Agent.</small></div>
              </div>
            ) : (
              <>
                <div className="drawer-context-reason">
                  <p><small>КОГДА</small><b>{context.when}</b></p>
                  <p><small>ПОЧЕМУ</small><b>{context.why}</b></p>
                  {context.condition && <p className={`context-condition context-condition-${context.activation ?? "triggered"}`}><small>УСЛОВИЕ</small><b>{context.condition}</b></p>}
                </div>
                {context.status === "not-involved" ? (
              <div className="drawer-context-skip"><span>SKIP ОБОСНОВАН</span><p>{context.skipReason}</p></div>
            ) : (
              <div className="drawer-context-flow" aria-label="Case-specific input, output and handoff">
                <article><span>A · INPUT</span><p>{context.input}</p></article>
                <i>→</i>
                <article className="context-flow-output"><span>B · RESULT / OUTPUT</span><p>{context.output}</p></article>
                <i>→</i>
                <article><span>C · NEXT / HANDOFF</span><p>{context.next}</p></article>
              </div>
            )}
              </>
            )}
          </section>
        )}

        <section className={`sim-example ${context && !hasEventExecution ? "sim-example-contextual" : ""}`} aria-label={hasEventExecution ? "Канонический пример агента" : context ? "Контекстный пример Case" : "Симулированный пример"}>
          <div className="example-label"><span>{hasEventExecution ? "CANONICAL AGENT EXAMPLE" : context ? "CASE-SPECIFIC EXAMPLE" : "REALISTIC EXAMPLE"}</span><b>{hasEventExecution ? "DEMO" : context ? `DEMO · ${context.caseLabel}` : "DEMO"}</b></div>
          <div className="example-company"><i />{hasEventExecution ? example.company : context?.company ?? example.company}</div>
          <h4>{contextExampleTitle ?? example.item}</h4>
          <p>{contextExampleBody ?? example.result}</p>
          {context && contextExampleResult && <p className="context-example-result"><span>{context.event ? "РЕЗУЛЬТАТ СОБЫТИЯ" : "РЕЗУЛЬТАТ АГЕНТА"}</span>{contextExampleResult}</p>}
        </section>
        <AgentOperationalMetadata agent={agent} />
        {footer}
      </aside>
    </div>
  );
}

export function AgentDetailDrawer({
  agent,
  onClose,
  context,
  footer,
  navigationBack,
}: {
  agent: Agent;
  onClose: () => void;
  context?: AgentDetailContext;
  footer?: ReactNode;
  navigationBack?: { canGoBack: boolean; onBack: () => void };
}) {
  const [agentPath, setAgentPath] = useState<number[]>([agent.id]);

  const activeAgentId = agentPath.at(-1) ?? agent.id;
  const activeAgent = agents.find((candidate) => candidate.id === activeAgentId) ?? agent;
  const openReference = (nextAgent: Agent) => {
    setAgentPath((current) => [...current, nextAgent.id]);
  };
  const goBack = () => {
    setAgentPath((current) => current.length > 1 ? current.slice(0, -1) : current);
  };

  useEffect(() => {
    const followReference = (event: Event) => {
      const nextId = Number((event as CustomEvent<{ agentId: number }>).detail?.agentId);
      if (!agents.some((candidate) => candidate.id === nextId)) return;
      setAgentPath((current) => [...current, nextId]);
    };
    window.addEventListener("tenderlab:open-agent-reference", followReference);
    return () => window.removeEventListener("tenderlab:open-agent-reference", followReference);
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (agentPath.length > 1) goBack();
      else onClose();
    };
    window.addEventListener("keydown", handleEscape, true);
    return () => window.removeEventListener("keydown", handleEscape, true);
  }, [agentPath.length, onClose]);

  return (
    <AgentDetailDrawerView
      agent={activeAgent}
      context={activeAgent.id === agent.id ? context : undefined}
      footer={activeAgent.id === agent.id ? footer : undefined}
      onClose={onClose}
      onOpenReference={openReference}
      onBack={agentPath.length > 1 ? goBack : navigationBack?.onBack ?? goBack}
      canGoBack={agentPath.length > 1 || Boolean(navigationBack?.canGoBack)}
      navigationDepth={agentPath.length}
    />
  );
}

export function TenderLabPage({ page }: { page: Exclude<PrimaryPage, "validation"> }) {
  const [activeLayer, setActiveLayer] = useState<string>("all");
  const [mode, setMode] = useState<"all" | AgentTier>("all");
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");
  const [reviewFilter, setReviewFilter] = useState<AgentReviewFilter>("all");
  const [architectureView, setArchitectureView] = useState<ArchitectureView>("hierarchy");
  const [collapsedMainAgents, setCollapsedMainAgents] = useState<Set<number>>(new Set());
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [selectedAgentHistory, setSelectedAgentHistory] = useState<Agent[]>([]);
  const [comparisonIds, setComparisonIds] = useState<number[]>([]);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const { states: workingStates, user: workspaceUser } = useAgentWorkspace();

  const scopeFilteredAgents = useMemo(() => agents.filter((agent) => {
      const layerMatch = activeLayer === "all" || agent.layer === activeLayer;
      const modeMatch = mode === "all" || getAgentTier(agent.id) === mode;
      const platformMatch = matchesPlatformFilter(agent, platformFilter);
      return layerMatch && modeMatch && platformMatch;
    }), [activeLayer, mode, platformFilter]);

  const allSemanticResults = useMemo(() => query.trim()
    ? rankSemanticDocuments(query, catalogSemanticDocuments)
    : [], [query]);
  const scopeSemanticResults = useMemo(() => {
    if (!query.trim()) return [];
    const allowedIds = new Set(scopeFilteredAgents.map((agent) => agent.id));
    return allSemanticResults.filter((result) => allowedIds.has(result.id));
  }, [allSemanticResults, query, scopeFilteredAgents]);
  const visibleScopeSemanticResults = useMemo(() => selectVisibleSemanticResults(scopeSemanticResults), [scopeSemanticResults]);

  const catalogFilteredAgents = useMemo(() => query.trim()
    ? visibleScopeSemanticResults.map((result) => agentById.get(result.id)).filter((agent): agent is Agent => Boolean(agent))
    : scopeFilteredAgents, [query, scopeFilteredAgents, visibleScopeSemanticResults]);

  const reviewCounts = useMemo(() => {
    const counts: Record<Exclude<AgentReviewFilter, "all">, number> = {
      understood: 0,
      "in-progress": 0,
      unclear: 0,
      unreviewed: 0,
    };
    for (const agent of catalogFilteredAgents) counts[reviewStatusFor(workingStates, agent.id)] += 1;
    return counts;
  }, [catalogFilteredAgents, workingStates]);

  const visibleAgents = useMemo(() => reviewFilter === "all"
    ? catalogFilteredAgents
    : catalogFilteredAgents.filter((agent) => reviewStatusFor(workingStates, agent.id) === reviewFilter),
  [catalogFilteredAgents, reviewFilter, workingStates]);

  const visibleAgentIds = useMemo(() => new Set(visibleAgents.map((agent) => agent.id)), [visibleAgents]);
  const visibleSemanticResults = useMemo(() => visibleScopeSemanticResults.filter((result) => visibleAgentIds.has(result.id)), [visibleAgentIds, visibleScopeSemanticResults]);
  const hiddenSemanticMatches = useMemo(() => query.trim()
    ? selectVisibleSemanticResults(allSemanticResults).filter((result) => !visibleAgentIds.has(result.id))
    : [], [allSemanticResults, query, visibleAgentIds]);
  const searchAssessment = semanticAssessment(allSemanticResults[0]?.score ?? 0);

  const hierarchyGroups = useMemo(() => {
    const visibleIds = new Set(visibleAgents.map((agent) => agent.id));
    return agents
      .filter((agent) => getAgentTier(agent.id) === "main")
      .map((parent) => ({
        parent,
        parentMatches: visibleIds.has(parent.id),
        children: agents.filter(
          (agent) =>
            getAgentTier(agent.id) !== "main" &&
            visibleIds.has(agent.id) &&
            subagentParentIds[agent.id]?.includes(parent.id),
        ),
      }))
      .filter((group) => group.parentMatches || group.children.length > 0);
  }, [visibleAgents]);

  const toggleMainAgent = (agentId: number) => {
    setCollapsedMainAgents((current) => {
      const next = new Set(current);
      if (next.has(agentId)) next.delete(agentId);
      else next.add(agentId);
      return next;
    });
  };

  const toggleComparisonAgent = (agentId: number) => {
    setComparisonIds((current) => current.includes(agentId)
      ? current.filter((id) => id !== agentId)
      : [...current, agentId]);
  };

  const openRootAgent = (agent: Agent) => {
    setSelectedAgentHistory([]);
    setSelectedAgent(agent);
  };

  const closeAgentProfile = () => {
    setSelectedAgent(null);
    setSelectedAgentHistory([]);
  };

  const backToPreviousAgent = () => {
    setSelectedAgentHistory((current) => {
      const previous = current.at(-1);
      if (previous) setSelectedAgent(previous);
      return current.slice(0, -1);
    });
  };

  const selectSemanticResult = (result: SemanticSearchResult) => {
    const agent = agentById.get(result.id);
    if (!agent) return;
    openRootAgent(agent);
    setSearchOpen(false);
  };

  const handleSemanticSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && visibleSemanticResults.length) {
      event.preventDefault();
      setSearchOpen(true);
      setActiveSearchIndex((current) => (current + 1) % visibleSemanticResults.length);
    } else if (event.key === "ArrowUp" && visibleSemanticResults.length) {
      event.preventDefault();
      setSearchOpen(true);
      setActiveSearchIndex((current) => (current - 1 + visibleSemanticResults.length) % visibleSemanticResults.length);
    } else if (event.key === "Enter" && visibleSemanticResults.length) {
      event.preventDefault();
      selectSemanticResult(visibleSemanticResults[Math.min(activeSearchIndex, visibleSemanticResults.length - 1)]);
    } else if (event.key === "Escape") {
      setSearchOpen(false);
    }
  };

  const revealAllSemanticMatches = () => {
    setActiveLayer("all");
    setMode("all");
    setPlatformFilter("all");
    setReviewFilter("all");
    setActiveSearchIndex(0);
    setSearchOpen(true);
  };

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedAgent(null);
        setSelectedAgentHistory([]);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  useEffect(() => {
    const openReferencedAgent = (event: Event) => {
      const agentId = Number((event as CustomEvent<{ agentId: number }>).detail?.agentId);
      const nextAgent = agentById.get(agentId);
      if (!nextAgent) return;
      setSelectedAgent((current) => {
        if (!current || current.id === nextAgent.id) return current;
        setSelectedAgentHistory((history) => [...history, current]);
        return nextAgent;
      });
    };
    window.addEventListener("tenderlab:open-agent-reference", openReferencedAgent);
    return () => window.removeEventListener("tenderlab:open-agent-reference", openReferencedAgent);
  }, []);

  useEffect(() => {
    if (page !== "agents") return;
    const params = new URLSearchParams(window.location.search);
    const requestedMode = params.get("mode");
    const requestedLayer = params.get("layer");
    const requestedPlatform = params.get("side") as PlatformFilter | null;
    const applyRequestedFilters = window.setTimeout(() => {
      if (requestedMode === "main" || requestedMode === "specialized" || requestedMode === "optional") setMode(requestedMode);
      if (requestedLayer && layers.some((layer) => layer.id === requestedLayer)) setActiveLayer(requestedLayer);
      if (requestedPlatform && platformFilterOptions.some((option) => option.id === requestedPlatform)) setPlatformFilter(requestedPlatform);
    }, 0);
    return () => window.clearTimeout(applyRequestedFilters);
  }, [page]);

  useEffect(() => {
    if (page !== "overview") return;
    const legacyRoute = window.location.hash === "#architecture" ? "/architecture" : window.location.hash === "#agents" ? "/agents" : null;
    if (legacyRoute) window.location.replace(legacyRoute);
  }, [page]);

  return (
    <main className={`page-shell page-${page}`}>
      <TopNavigation active={page} />

      {page === "overview" && (
      <section className="strategic-overview" id="top">
        <div className="overview-hero">
          <div className="overview-copy">
            <p className="eyebrow"><span /> STRATEGIC SYSTEM OVERVIEW</p>
            <h1>Tender intelligence,<br /><em>coordinated end to end.</em></h1>
            <p>TenderLab.ai превращает разрозненный тендерный процесс в управляемую систему: от поиска возможности и проверки компании до заявки, контракта и накопления знаний.</p>
            <div className="overview-actions">
              <a className="action-primary" href="/architecture">Explore architecture <span>→</span></a>
              <a className="action-secondary" href="/case-simulation">Review Case 1 <span>↗</span></a>
            </div>
          </div>
          <aside className="architecture-status" aria-label="Architecture validation status">
            <span>WORKING ARCHITECTURE</span>
            <strong>64</strong>
            <p>current agent roles</p>
            <div><b>8</b><small>functional layers</small></div>
            <div><b>1 / 10</b><small>cases active</small></div>
            <i>UNDER VALIDATION</i>
          </aside>
        </div>

        <div className="system-drilldown" aria-label="TenderLab system hierarchy">
          <article className="drilldown-platform">
            <span>01 · PLATFORM</span>
            <strong>TenderLab.ai</strong>
            <p>Единая tender intelligence platform для консультантов и компаний-участников.</p>
          </article>
          <i aria-hidden="true">→</i>
          <article>
            <span>02 · USER SIDES</span>
            <div className="drilldown-pair"><b>Consultant Command Center</b><b>Client Side</b></div>
            <p>Люди получают нужные функции, решения и точки согласования.</p>
          </article>
          <i aria-hidden="true">→</i>
          <article className="drilldown-control">
            <span>03 · CONTROL PLANE</span>
            <strong>Agent Command Center</strong>
            <p><b>TenderLab Orchestrator</b> маршрутизирует контекст, агентов и approvals.</p>
          </article>
          <i aria-hidden="true">→</i>
          <article>
            <span>04 · EXECUTION</span>
            <strong>64-agent architecture</strong>
            <p>Только релевантные Main, Specialized и Optional agents включаются в конкретный путь.</p>
          </article>
        </div>

        <div className="overview-section-heading">
          <div><p className="eyebrow"><span /> WHY AGENTS</p><h2>One lifecycle. Different specialist decisions.</h2></div>
          <p>Архитектура разделяет ответственность, сохраняет evidence и делает каждый handoff проверяемым.</p>
        </div>
        <div className="lifecycle-strip">
          {tenderLifecycle.map((stage) => (
            <article key={stage.number}>
              <span>{stage.number}</span><strong>{stage.name}</strong><p>{stage.text}</p>
            </article>
          ))}
        </div>

        <section className="validation-callout" aria-label="Architecture validation method">
          <div><span>VALIDATION METHOD</span><h2>64 roles are a hypothesis—not a conclusion.</h2></div>
          <p>Каждый из 10 procurement cases проверяет, какие агенты действительно нужны, где есть overlap и какие capabilities отсутствуют. Case 2 остаётся закрытым до утверждения Case 1.</p>
          <a href="/case-simulation">Open Validation <span>→</span></a>
        </section>
      </section>
      )}

      {page === "architecture" && (
      <section className="architecture-section" id="architecture">
        <div className="section-heading compact-heading">
          <div>
            <p className="eyebrow"><span /> SYSTEM ARCHITECTURE</p>
            <h2>Context activates the right agents.</h2>
          </div>
          <p>ACTIVATE ↗ BRANCH ↔ SKIP ↘ REJOIN</p>
        </div>

        <p className="architecture-lede">TenderLab.ai не запускает все 64 роли по линейной цепочке. User side, tender context, available evidence и текущие решения формируют ограниченный маршрут выполнения.</p>

        <div className="platform-architecture" aria-label="Platform sides and responsibilities">
          <article className="platform-consultant"><span>USER SIDE 01</span><strong>Consultant Command Center</strong><p>44 агента поддерживают discovery, анализ, scoring, campaign decisions и контроль консультантов.</p></article>
          <article className="platform-client"><span>USER SIDE 02</span><strong>Client Side</strong><p>45 агентов создают результаты и действия для производителей, поставщиков и tender participants.</p></article>
          <article className="platform-control"><span>CONTROL PLANE</span><strong>Agent Command Center</strong><p>TenderLab Orchestrator координирует routing, evidence, approvals, retries и state.</p></article>
          <article className="platform-backend"><span>PROCESSING</span><strong>Backend</strong><p>14 агентов выполняют ingestion, provenance, versioning и системную обработку без прямого UI.</p></article>
        </div>

        <div className="architecture-subheading"><span>01 · DYNAMIC ROUTING</span><h3>From context to a bounded execution path</h3></div>

        <div className="routing-map" aria-label="Dynamic agent routing">
          <div className="context-inputs">
            <span>CONTEXT INPUTS</span>
            <div><i>01</i><b>Tender</b><small>тип и процедура</small></div>
            <div><i>02</i><b>Company</b><small>профиль и пробелы</small></div>
            <div><i>03</i><b>Evidence</b><small>доступные данные</small></div>
            <div><i>04</i><b>Decision</b><small>текущий путь</small></div>
          </div>
          <div className="route-connector"><span>→</span><small>ROUTE</small></div>
          <div className="router-core">
            <span>CONTEXT ROUTER</span>
            <strong>TenderLab Orchestrator</strong>
            <p>Активирует нужных агентов и обходит нерелевантные.</p>
            <div><i /><i /><i /></div>
          </div>
          <div className="route-connector branch"><span>↗</span><small>BRANCH</small></div>
          <div className="route-outcomes">
            <a className="outcome-main" href="/agents?mode=main"><span>Main</span><b>20</b><small>ведут основные этапы</small></a>
            <a className="outcome-specialized" href="/agents?mode=specialized"><span>Specialized</span><b>22</b><small>включаются по условию</small></a>
            <a className="outcome-optional" href="/agents?mode=optional"><span>Optional</span><b>22</b><small>пропускаются без необходимости</small></a>
          </div>
        </div>

        <div className="routing-note"><span><i className="main-dot" />Main — обычно ведёт поток</span><span><i className="specialized-dot" />Specialized — активируется по данным</span><span><i className="optional-dot" />Optional — skipped when not relevant</span></div>

        <div className="architecture-subheading layer-subheading"><span>02 · FUNCTIONAL ORGANIZATION</span><h3>Eight layers cover the tender lifecycle</h3><p>Слева — порядок слоя; справа — число агентов. Ниже: Main / Specialized / Optional внутри слоя.</p></div>

        <div className="layer-flow">
          {layers.map((layer) => {
            const layerAgents = agents.filter((agent) => agent.layer === layer.id);
            const count = layerAgents.length;
            const mainCount = layerAgents.filter((agent) => getAgentTier(agent.id) === "main").length;
            const specializedCount = layerAgents.filter((agent) => getAgentTier(agent.id) === "specialized").length;
            const optionalCount = layerAgents.filter((agent) => getAgentTier(agent.id) === "optional").length;
            return (
              <a
                key={layer.id}
                href={`/agents?layer=${layer.id}`}
                style={{ "--layer-color": layer.color } as React.CSSProperties}
              >
                <span className="layer-number">{layer.number}</span>
                <i>{layer.mark}</i>
                <strong>{layer.name}</strong>
                <small>{layer.ru}</small>
                <b className="layer-agent-count" aria-label={`${count} agents in ${layer.name}`}><small>AGENTS</small><span>{count}</span></b>
                <div className="layer-mix"><span className="mix-main">{mainCount}</span><span className="mix-specialized">{specializedCount}</span><span className="mix-optional">{optionalCount}</span></div>
              </a>
            );
          })}
        </div>

        <div className="architecture-subheading handoff-subheading"><span>03 · GOVERNED HANDOFF</span><h3>Every agent must leave a usable artifact</h3></div>
        <div className="handoff-model" aria-label="Agent handoff model">
          <article><span>A · INPUT</span><strong>Контекст и evidence</strong><p>Тендер, company profile, documents или результат предыдущего решения.</p></article>
          <i>→</i>
          <article className="handoff-agent"><span>AGENT WORK</span><strong>AI + Evidence + Human</strong><p>AI выполняет ограниченную задачу, evidence подтверждает вывод, человек утверждает критические решения.</p></article>
          <i>→</i>
          <article className="handoff-output"><span>B · RESULT / OUTPUT</span><strong>Конкретный deliverable</strong><p>Score, dataset, decision, shortlist, report, generated document или updated state.</p></article>
          <i>→</i>
          <article><span>C · NEXT / HANDOFF</span><strong>Следующий потребитель</strong><p>Downstream agent, consultant, client user, buyer process или knowledge base.</p></article>
        </div>
      </section>
      )}

      {page === "agents" && (
      <section className="agents-section" id="agents">
        <div className="section-heading agents-heading">
          <div>
            <p className="eyebrow"><span /> CANONICAL AGENT CATALOG</p>
            <h2>{visibleAgents.length}<sup>/64</sup> current roles</h2>
          </div>
          <div className="catalog-tools">
            <div className="view-switch" role="group" aria-label="Architecture view">
              <button
                aria-pressed={architectureView === "flat"}
                className={architectureView === "flat" ? "active" : ""}
                onClick={() => setArchitectureView("flat")}
              >Flat</button>
              <button
                aria-pressed={architectureView === "hierarchy"}
                className={architectureView === "hierarchy" ? "active" : ""}
                onClick={() => setArchitectureView("hierarchy")}
              >Hierarchy</button>
              <button
                aria-pressed={architectureView === "network"}
                className={architectureView === "network" ? "active" : ""}
                onClick={() => setArchitectureView("network")}
              >Network</button>
              <button
                aria-pressed={architectureView === "matrix"}
                className={architectureView === "matrix" ? "active" : ""}
                onClick={() => setArchitectureView("matrix")}
              >Matrix</button>
            </div>
            <div className="mode-switch" role="group" aria-label="Agent set">
              <button aria-pressed={mode === "all"} className={mode === "all" ? "active" : ""} onClick={() => setMode("all")}>All</button>
              <button aria-pressed={mode === "main"} className={mode === "main" ? "active main-mode" : "main-mode"} onClick={() => setMode("main")}>Main 20</button>
              <button aria-pressed={mode === "specialized"} className={mode === "specialized" ? "active" : ""} onClick={() => setMode("specialized")}>Specialized</button>
              <button aria-pressed={mode === "optional"} className={mode === "optional" ? "active" : ""} onClick={() => setMode("optional")}>Optional</button>
            </div>
            <div className="catalog-semantic-search">
              <label className="search-box">
                <span aria-hidden="true">⌕</span>
                <input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setSearchOpen(Boolean(event.target.value.trim()));
                    setActiveSearchIndex(0);
                  }}
                  onFocus={() => setSearchOpen(Boolean(query.trim()))}
                  onBlur={() => window.setTimeout(() => setSearchOpen(false), 160)}
                  onKeyDown={handleSemanticSearchKeyDown}
                  placeholder="Название, функция или описание задачи..."
                  role="combobox"
                  aria-label="Semantic Agent search"
                  aria-autocomplete="list"
                  aria-expanded={searchOpen && Boolean(query.trim())}
                  aria-controls="catalog-semantic-results"
                />
                <b>SEMANTIC</b>
              </label>
              {searchOpen && query.trim() && (
                <div className="catalog-semantic-results" id="catalog-semantic-results" role="listbox" aria-label="Ranked semantic Agent candidates">
                  <header className={`semantic-assessment assessment-${searchAssessment.id}`}>
                    <div><span>ARCHITECTURE SEARCH</span><strong>{searchAssessment.label}</strong></div>
                    <p>{searchAssessment.text}</p>
                  </header>
                  {hiddenSemanticMatches.length > 0 && (
                    <div className="semantic-filter-warning">
                      <span><b>{hiddenSemanticMatches.length}</b> релевантных кандидатов скрывают активные фильтры.</span>
                      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={revealAllSemanticMatches}>Показать все</button>
                    </div>
                  )}
                  <div className="semantic-candidate-list">
                    {visibleSemanticResults.length ? visibleSemanticResults.map((result, index) => {
                      const agent = agentById.get(result.id)!;
                      const assessment = semanticAssessment(result.score, allSemanticResults[0]?.score ?? result.score);
                      return (
                        <button
                          type="button"
                          role="option"
                          aria-selected={index === activeSearchIndex}
                          className="catalog-semantic-result"
                          onMouseDown={(event) => event.preventDefault()}
                          onMouseEnter={() => setActiveSearchIndex(index)}
                          onClick={() => selectSemanticResult(result)}
                          key={result.id}
                        >
                          <strong className={`score-${assessment.id}`}>{result.score}<small>%</small></strong>
                          <span>
                            <b><i>{String(agent.id).padStart(2, "0")}</i>{agent.name}</b>
                            <small>{semanticMatchExplanation(agent, result)}</small>
                            <em>{assessment.label} · {result.reasons.length ? result.reasons.join(" · ") : "Contextual match"}</em>
                          </span>
                        </button>
                      );
                    }) : (
                      <p className="catalog-semantic-empty">В текущих фильтрах кандидатов нет. Сбросьте фильтры или рассмотрите capability как возможный архитектурный пробел.</p>
                    )}
                  </div>
                  <footer>Результаты — диагностические сигналы. Search не создаёт и не меняет canonical Agents.</footer>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="catalog-status-note"><span>WORKING ARCHITECTURE · UNDER VALIDATION</span><p>Canonical IDs, classifications and relationships remain stable while Case Audit tests whether roles should be changed, merged, removed or added.</p><a href="/case-simulation">Validation →</a></div>

        <div className="layer-filters" role="group" aria-label="Filter by layer">
          <button className={activeLayer === "all" ? "active" : ""} onClick={() => setActiveLayer("all")}>All layers</button>
          {layers.map((layer) => (
            <button
              key={layer.id}
              className={activeLayer === layer.id ? "active" : ""}
              style={{ "--layer-color": layer.color } as React.CSSProperties}
              onClick={() => setActiveLayer(layer.id)}
            >
              <i /> {layer.name}
            </button>
          ))}
        </div>

        <div className="platform-filter-panel">
          <span>USED IN / PLATFORM SIDE</span>
          <div className="platform-switch" role="group" aria-label="Filter by platform side">
            {platformFilterOptions.map((option) => (
              <button
                aria-pressed={platformFilter === option.id}
                className={platformFilter === option.id ? "active" : ""}
                key={option.id}
                onClick={() => setPlatformFilter(option.id)}
              >
                {option.label} <b>{platformFilterCounts[option.id]}</b>
              </button>
            ))}
          </div>
          <small>Shared = Command Center + Client Side</small>
        </div>

        <div className="agent-workspace-panel">
          <div className="workspace-filter-block">
            <span>MY REVIEW STATUS</span>
            <div className="workspace-status-switch" role="group" aria-label="Filter by personal Agent review status">
              {agentReviewOptions.map((option) => (
                <button
                  aria-pressed={reviewFilter === option.id}
                  className={`status-${option.id} ${reviewFilter === option.id ? "active" : ""}`.trim()}
                  disabled={!workspaceUser && option.id !== "all"}
                  key={option.id}
                  onClick={() => setReviewFilter(option.id)}
                >
                  <i>{option.mark}</i>{option.shortLabel}
                  <b>{option.id === "all" ? catalogFilteredAgents.length : workspaceUser ? reviewCounts[option.id] : "—"}</b>
                </button>
              ))}
            </div>
          </div>
          <AgentWorkspaceAccount />
        </div>

        {visibleAgents.length > 0 ? architectureView === "flat" ? (
          <div className="agent-grid">
            {visibleAgents.map((agent) => (
              <AgentCard agent={agent} compareSelected={comparisonIds.includes(agent.id)} key={agent.id} onSelect={openRootAgent} onToggleCompare={toggleComparisonAgent} />
            ))}
          </div>
        ) : architectureView === "hierarchy" ? (
          <div className="hierarchy-view">
            <div className="hierarchy-toolbar">
              <p><span>→</span> MAIN → supporting subagents → Result / Output. Shared agents repeat under each relevant parent.</p>
              <div>
                <button onClick={() => setCollapsedMainAgents(new Set<number>())}>Expand all</button>
                <button onClick={() => setCollapsedMainAgents(new Set(hierarchyGroups.map((group) => group.parent.id)))}>Collapse all</button>
              </div>
            </div>
            <div className="hierarchy-list">
              {hierarchyGroups.map(({ parent, parentMatches, children }) => {
                const collapsed = collapsedMainAgents.has(parent.id);
                return (
                  <section
                    className={`hierarchy-group ${parentMatches ? "" : "context-parent"}`.trim()}
                    key={parent.id}
                    style={{ "--layer-color": layerById[parent.layer].color } as React.CSSProperties}
                  >
                    <div className="hierarchy-parent-row">
                      <AgentCard agent={parent} className="hierarchy-parent-card" compareSelected={comparisonIds.includes(parent.id)} onSelect={openRootAgent} onToggleCompare={toggleComparisonAgent} />
                      <div className="hierarchy-link" aria-hidden="true"><span>→</span><small>SUPPORTS</small></div>
                      <button
                        aria-label={`${collapsed ? "Expand" : "Collapse"} ${parent.name} subagents`}
                        aria-expanded={!collapsed}
                        className="hierarchy-toggle"
                        onClick={() => toggleMainAgent(parent.id)}
                      >
                        <span>{collapsed ? "+" : "−"}</span>
                        <strong>{children.length}</strong>
                        <small>{collapsed ? "Expand" : "Collapse"}</small>
                      </button>
                      <div className="output-link" aria-hidden="true"><span /><i>→</i></div>
                      <MainAgentOutputCard agent={parent} />
                    </div>
                    {!collapsed && children.length > 0 && (
                      <div className="hierarchy-branches">
                        <div className="hierarchy-children">
                          {children.map((agent) => (
                            <div className="hierarchy-child" key={agent.id}>
                              <AgentCard
                                agent={agent}
                                className="hierarchy-child-card"
                                compareSelected={comparisonIds.includes(agent.id)}
                                onSelect={openRootAgent}
                                onToggleCompare={toggleComparisonAgent}
                                parentCount={subagentParentIds[agent.id]?.length ?? 1}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          </div>
        ) : architectureView === "network" ? (
          <AgentNetworkView
            allAgents={agents}
            visibleAgents={visibleAgents}
            supportMap={subagentParentIds}
            layerMeta={layerById}
            onOpenAgent={openRootAgent}
            comparisonIds={comparisonIds}
            onToggleCompare={toggleComparisonAgent}
          />
        ) : (
          <AgentMatrixView
            visibleAgents={visibleAgents}
            query={query}
            mode={mode}
            activeLayer={activeLayer}
            platformFilter={platformFilter}
            reviewFilter={reviewFilter}
            selectedIds={comparisonIds}
            onQueryChange={setQuery}
            onModeChange={setMode}
            onLayerChange={setActiveLayer}
            onPlatformChange={setPlatformFilter}
            onReviewFilterChange={setReviewFilter}
            onOpenAgent={openRootAgent}
            onToggleCompare={toggleComparisonAgent}
            onCompare={() => setComparisonOpen(true)}
          />
        ) : (
          <div className={`empty-state ${query.trim() ? `semantic-empty-state assessment-${searchAssessment.id}` : ""}`.trim()}>
            <span>⌕</span><strong>{query.trim() ? searchAssessment.label : "Ничего не найдено"}</strong>
            {query.trim() && <p>{hiddenSemanticMatches.length ? `${hiddenSemanticMatches.length} релевантных кандидатов скрыты активными фильтрами.` : searchAssessment.text}</p>}
            <button onClick={() => { if (query.trim()) revealAllSemanticMatches(); else { setQuery(""); setActiveLayer("all"); setMode("all"); setPlatformFilter("all"); setReviewFilter("all"); } }}>{query.trim() ? "Показать все semantic matches" : "Сбросить"}</button>
          </div>
        )}
      </section>
      )}

      <footer>
        <a className="brand footer-brand" href="/"><span className="brand-mark"><i /><i /><i /></span>TenderLab<span className="brand-dot">.ai</span></a>
        <p>ONE PLACE. EVERY TENDER. WORLDWIDE.</p>
        <span>AI TENDER OPERATING SYSTEM · 2026</span>
      </footer>

      {selectedAgent && (
        <AgentDetailDrawer key={selectedAgent.id} agent={selectedAgent} onClose={closeAgentProfile} navigationBack={{ canGoBack: selectedAgentHistory.length > 0, onBack: backToPreviousAgent }} />
      )}
      {page === "agents" && (
        <AgentComparisonBar selectedIds={comparisonIds} onClear={() => setComparisonIds([])} onCompare={() => setComparisonOpen(true)} />
      )}
      {page === "agents" && comparisonOpen && comparisonIds.length >= 2 && (
        <AgentComparisonModal
          selectedIds={comparisonIds}
          onAdd={(agentId) => setComparisonIds((current) => current.includes(agentId) ? current : [...current, agentId])}
          onRemove={(agentId) => setComparisonIds((current) => current.filter((id) => id !== agentId))}
          onOpenAgent={openRootAgent}
          onClose={() => setComparisonOpen(false)}
        />
      )}
    </main>
  );
}

export default function Home() {
  return <TenderLabPage page="overview" />;
}
