"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { agents, layerById } from "../../packages/catalog-data/src/agents";
import { AgentComparisonBar, AgentComparisonModal } from "../agent-comparison";
import { eventAgentAuditLabels, processRelationshipLabels, type CaseProcessGraph, type ProcessActorKind, type ProcessRelationship } from "../process-model";

type MapFocus = "all" | "critical" | "decisions";

const laneOrder: ProcessActorKind[] = ["buyer", "client", "tenderlab", "consultant", "external"];
const baseCanvas = { header: 86, laneHeight: 206, nodeWidth: 200, nodeHeight: 150, xStart: 170, columnGap: 208 };
export type OrchestrationTimeBand = { start: number; end: number; label: string };
const defaultTimeBands: OrchestrationTimeBand[] = [
  { start: 0, end: 2, label: "D0–1 · DISCOVERY" },
  { start: 3, end: 5, label: "D1–6 · PROFILE + REQUIREMENTS" },
  { start: 6, end: 8, label: "D6–15 · DECISION + DESIGN" },
  { start: 9, end: 12, label: "D10–28 · COMPLIANCE + SUBMISSION" },
  { start: 13, end: 16, label: "D35–69 · EVALUATION + CONTRACT" },
  { start: 17, end: 19, label: "D70–219 · DELIVERY + CLOSE" },
  { start: 20, end: 20, label: "LEARN" },
];

const agentByName = new Map(agents.map((agent) => [agent.name, agent]));

function positionFor(activityId: string, graph: CaseProcessGraph, canvas: typeof baseCanvas & { width: number }) {
  const activity = graph.activities.find((item) => item.id === activityId)!;
  const laneIndex = laneOrder.indexOf(activity.layout.lane);
  return {
    x: canvas.xStart + activity.layout.column * canvas.columnGap,
    y: canvas.header + laneIndex * canvas.laneHeight + 27,
  };
}

function edgePath(relationship: ProcessRelationship, graph: CaseProcessGraph, canvas: typeof baseCanvas & { width: number }) {
  const source = positionFor(relationship.from, graph, canvas);
  const target = positionFor(relationship.to, graph, canvas);
  const sourceX = source.x + canvas.nodeWidth;
  const sourceY = source.y + canvas.nodeHeight / 2;
  const targetX = target.x;
  const targetY = target.y + canvas.nodeHeight / 2;

  if (relationship.type === "feedback" || targetX <= sourceX) {
    const loopY = canvas.header + laneOrder.length * canvas.laneHeight + 46;
    return `M ${sourceX} ${sourceY} C ${sourceX + 80} ${loopY}, ${targetX - 80} ${loopY}, ${targetX} ${targetY}`;
  }
  const bend = Math.max(44, (targetX - sourceX) * 0.44);
  return `M ${sourceX} ${sourceY} C ${sourceX + bend} ${sourceY}, ${targetX - bend} ${targetY}, ${targetX} ${targetY}`;
}

export default function CaseOrchestrationMap({
  graph,
  caseNumber,
  timeBands = defaultTimeBands,
  processNote,
  onOpenAgent,
}: {
  graph: CaseProcessGraph;
  caseNumber: number;
  timeBands?: OrchestrationTimeBand[];
  processNote?: string;
  onOpenAgent: (agentId: number, eventStep: number) => void;
}) {
  const [focus, setFocus] = useState<MapFocus>("all");
  const [actorFilter, setActorFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [comparisonIds, setComparisonIds] = useState<number[]>([]);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const mapScrollRef = useRef<HTMLDivElement>(null);
  const focusToggleRef = useRef<HTMLButtonElement>(null);
  const scrollPositionRef = useRef({ left: 0, top: 0 });

  const firstActivityId = graph.activities[0]?.id ?? "";
  const [selectedActivityId, setSelectedActivityId] = useState(firstActivityId);
  const maxColumn = Math.max(0, ...graph.activities.map((activity) => activity.layout.column));
  const canvas = useMemo(() => ({ ...baseCanvas, width: Math.max(1840, baseCanvas.xStart + (maxColumn + 1) * baseCanvas.columnGap + 120) }), [maxColumn]);
  const selected = graph.activities.find((activity) => activity.id === selectedActivityId) ?? graph.activities[0];
  const incoming = graph.relationships.filter((relationship) => relationship.to === selected.id);
  const outgoing = graph.relationships.filter((relationship) => relationship.from === selected.id);
  const selectedArtifact = graph.artifacts.find((artifact) => artifact.producerRef === selected.id)!;
  const selectedEventAudit = graph.eventAudits.find((audit) => audit.eventStep === selected.eventStep);
  const selectedExecutions = graph.agentExecutions.filter((execution) => execution.eventStep === selected.eventStep);
  const confirmedExecutions = selectedExecutions.filter((execution) => (
    (execution.necessity === "justified" || execution.necessity === "conditional")
    && execution.validationStatus !== "needs-review"
  ));
  const proposedExecutions = selectedExecutions.filter((execution) => execution.validationStatus === "needs-review");
  const activeAgentNames = useMemo(() => [...new Set([
    ...graph.activities.flatMap((activity) => activity.agentNames),
    ...graph.processAgentExecutions.map((execution) => agents.find((agent) => agent.id === execution.agentId)?.name).filter((name): name is string => Boolean(name)),
  ])].sort(), [graph]);
  const eventRelationships = useMemo(() => graph.relationships.filter((relationship) => (
    graph.activities.some((activity) => activity.id === relationship.from)
    && graph.activities.some((activity) => activity.id === relationship.to)
  )), [graph]);
  const joinCount = useMemo(() => {
    const incomingCount = new Map<string, number>();
    graph.relationships.filter((edge) => edge.blocking).forEach((edge) => incomingCount.set(edge.to, (incomingCount.get(edge.to) ?? 0) + 1));
    return [...incomingCount.values()].filter((count) => count > 1).length;
  }, [graph]);

  const isActivityFocused = (activity: typeof selected) => {
    if (actorFilter !== "all" && !activity.actorIds.includes(actorFilter)) return false;
    if (agentFilter !== "all" && !activity.agentNames.includes(agentFilter) && !activity.standbyAgentNames.includes(agentFilter)) return false;
    if (focus === "critical" && !activity.critical) return false;
    if (focus === "decisions" && activity.kind !== "decision" && activity.kind !== "wait" && activity.kind !== "external-event") return false;
    return true;
  };

  const relationshipActive = (relationship: ProcessRelationship) => {
    const source = graph.activities.find((activity) => activity.id === relationship.from);
    const target = graph.activities.find((activity) => activity.id === relationship.to);
    if (!source || !target) return true;
    return isActivityFocused(source) && isActivityFocused(target);
  };

  const toggleFocusMode = () => {
    const scrollArea = mapScrollRef.current;
    if (scrollArea) scrollPositionRef.current = { left: scrollArea.scrollLeft, top: scrollArea.scrollTop };
    setIsFocusMode((current) => !current);
  };

  const toggleComparisonAgent = (agentId: number) => {
    setComparisonIds((current) => current.includes(agentId)
      ? current.filter((id) => id !== agentId)
      : [...current, agentId]);
  };

  const selectActivity = (activityId: string) => {
    setSelectedActivityId(activityId);
    setComparisonIds([]);
    setComparisonOpen(false);
  };

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const scrollArea = mapScrollRef.current;
      if (scrollArea) {
        scrollArea.scrollLeft = scrollPositionRef.current.left;
        scrollArea.scrollTop = scrollPositionRef.current.top;
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isFocusMode]);

  useEffect(() => {
    if (!isFocusMode) return;
    const previousBodyOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const scrollArea = mapScrollRef.current;
      if (scrollArea) scrollPositionRef.current = { left: scrollArea.scrollLeft, top: scrollArea.scrollTop };
      setIsFocusMode(false);
      window.requestAnimationFrame(() => focusToggleRef.current?.focus());
    };
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isFocusMode]);

  return (
    <section className={`orchestration-map-section ${isFocusMode ? "is-focus-mode" : ""}`} aria-labelledby={`orchestration-map-title-${caseNumber}`} data-focus-mode={isFocusMode ? "active" : "inactive"}>
      <div className="section-heading orchestration-heading">
        <div><p>{`CASE ${caseNumber} · ORCHESTRATION MAP`}</p><h2 id={`orchestration-map-title-${caseNumber}`}>События, ответственность и зависимости</h2></div>
        <div className="orchestration-heading-actions">
          <span>Время нелинейно: ветви могут работать параллельно, ожидать Actor или сходиться по ALL-правилу.</span>
          <button
            ref={focusToggleRef}
            className="orchestration-focus-button"
            type="button"
            aria-label={isFocusMode ? "Выйти из Focus Mode" : "Открыть карту в Focus Mode"}
            aria-pressed={isFocusMode}
            onClick={toggleFocusMode}
            title={isFocusMode ? "Свернуть карту (Esc)" : "Развернуть карту на весь экран"}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d={isFocusMode ? "M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" : "M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5"} /></svg>
            <b>{isFocusMode ? "Свернуть" : "Focus mode"}</b>
            {isFocusMode ? <small>Esc</small> : null}
          </button>
        </div>
      </div>

      <div className="orchestration-toolbar" aria-label="Фильтры карты оркестрации">
        <div className="map-focus-switch" role="group" aria-label="Фокус карты">
          {(["all", "critical", "decisions"] as MapFocus[]).map((item) => (
            <button type="button" aria-pressed={focus === item} onClick={() => setFocus(item)} key={item}>
              {item === "all" ? "Все связи" : item === "critical" ? "Critical path" : "Decisions / Wait"}
            </button>
          ))}
        </div>
        <label><span>ACTOR</span><select value={actorFilter} onChange={(event) => setActorFilter(event.target.value)}><option value="all">Все участники</option>{graph.actors.map((actor) => <option value={actor.id} key={actor.id}>{actor.shortName}</option>)}</select></label>
        <label><span>AGENT</span><select value={agentFilter} onChange={(event) => setAgentFilter(event.target.value)}><option value="all">Все агенты</option>{activeAgentNames.map((name) => <option value={name} key={name}>{agentByName.get(name)?.id.toString().padStart(2, "0")} · {name}</option>)}</select></label>
        <div className="map-legend" aria-label="Легенда связей"><span><i className="edge-standard" /> Handoff</span><span><i className="edge-branch" /> Branch / Join</span><span><i className="edge-wait" /> Wait / External</span><span><i className="edge-loop" /> Rework / Feedback</span></div>
      </div>

      <section className="background-process-rail" aria-label="Persistent and parallel Case processes">
        <header><div><span>CASE-LEVEL / BACKGROUND</span><b>Процессы вне линейной Event sequence</b></div><small>{processNote ?? "Event читает готовые records; parallel work joins only at explicit gates."}</small></header>
        <div>
          {graph.processes.map((process) => (
            <article className={process.blocking ? "is-blocking" : ""} key={process.id}>
              <span>{process.id} · {process.kind}</span>
              <h3>{process.name}</h3>
              <p>{process.purpose}</p>
              <div className="background-agent-list">
                {process.agentIds.map((agentId) => {
                  const agent = agents.find((candidate) => candidate.id === agentId);
                  const firstEvent = process.consumerRefs.map((ref) => graph.activities.find((activity) => activity.id === ref)).find(Boolean);
                  return agent ? <button type="button" onClick={() => onOpenAgent(agent.id, firstEvent?.eventStep ?? graph.activities.at(-1)?.eventStep ?? 1)} key={agent.id}>{String(agent.id).padStart(2, "0")} · {agent.name}</button> : null;
                })}
              </div>
              <footer className="background-process-metadata">
                <div>
                  <b>OUTPUTS</b>
                  <span className="process-metadata-chips">
                    {process.outputArtifactIds.map((id) => {
                      const artifact = graph.artifacts.find((candidate) => candidate.id === id);
                      return artifact ? <i key={id}>{artifact.name}</i> : null;
                    })}
                  </span>
                </div>
                <div>
                  <b>USED BY</b>
                  <span className="process-metadata-chips process-consumer-chips">
                    {process.consumerRefs.map((ref) => {
                      const activity = graph.activities.find((candidate) => candidate.id === ref || candidate.id.endsWith(ref));
                      return <i key={ref}>{activity ? `E${String(activity.eventStep).padStart(2, "0")}` : ref}</i>;
                    })}
                  </span>
                </div>
              </footer>
            </article>
          ))}
        </div>
      </section>

      <div className="orchestration-workspace">
        <div ref={mapScrollRef} className="orchestration-scroll" aria-label={`Прокручиваемая карта Case ${caseNumber}`}>
          <div className="orchestration-canvas" style={{ width: canvas.width, height: canvas.header + laneOrder.length * canvas.laneHeight + 92 }}>
            <div className="map-time-axis" aria-hidden="true">
              {timeBands.map((band) => (
                <span key={band.label} style={{ left: canvas.xStart + band.start * canvas.columnGap, width: (band.end - band.start + 1) * canvas.columnGap }}>{band.label}</span>
              ))}
            </div>
            {laneOrder.map((lane, laneIndex) => {
              const actor = graph.actors.find((candidate) => candidate.kind === lane)!;
              return (
                <div className={`actor-lane lane-${lane}`} key={lane} style={{ top: canvas.header + laneIndex * canvas.laneHeight, height: canvas.laneHeight }}>
                  <div className="actor-lane-label"><span>{String(laneIndex + 1).padStart(2, "0")}</span><strong>{actor.shortName}</strong><small>{actor.description}</small></div>
                </div>
              );
            })}
            <svg className="orchestration-edges" viewBox={`0 0 ${canvas.width} ${canvas.header + laneOrder.length * canvas.laneHeight + 92}`} aria-hidden="true">
              <defs>
                <marker id={`map-arrow-${caseNumber}`} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 z" /></marker>
              </defs>
              {eventRelationships.map((relationship) => (
                <path
                  className={`map-edge edge-${relationship.type} ${relationshipActive(relationship) ? "is-active" : "is-muted"} ${incoming.some((edge) => edge.id === relationship.id) || outgoing.some((edge) => edge.id === relationship.id) ? "is-selected" : ""}`}
                  d={edgePath(relationship, graph, canvas)}
                  markerEnd={`url(#map-arrow-${caseNumber})`}
                  key={relationship.id}
                />
              ))}
            </svg>
            {graph.activities.map((activity) => {
              const position = positionFor(activity.id, graph, canvas);
              const focused = isActivityFocused(activity);
              const selectedNode = selected.id === activity.id;
              return (
                <button
                  type="button"
                  className={`orchestration-node node-${activity.kind} ${activity.critical ? "is-critical" : ""} ${focused ? "is-focused" : "is-muted"} ${selectedNode ? "is-selected" : ""}`}
                  style={{ left: position.x, top: position.y, width: canvas.nodeWidth, minHeight: canvas.nodeHeight }}
                  aria-pressed={selectedNode}
                  onClick={() => selectActivity(activity.id)}
                  key={activity.id}
                >
                  <span className="node-topline"><b>E{String(activity.eventStep).padStart(2, "0")}</b><i>{activity.stateLabel}</i></span>
                  <small>{activity.period}</small>
                  <strong>{activity.title}</strong>
                  <span className="node-agents">{activity.agentNames.length} agents{activity.standbyAgentNames.length ? ` · ${activity.standbyAgentNames.length} standby` : ""}{graph.eventAudits.some((audit) => audit.eventStep === activity.eventStep) ? ` · ${graph.agentExecutions.filter((execution) => execution.eventStep === activity.eventStep && (execution.necessity === "misplaced" || execution.necessity === "redundant" || execution.necessity === "unsupported" || execution.validationStatus === "needs-review")).length} audit finding` : ""}</span>
                  {activity.kind !== "activity" && <em>{activity.kind === "decision" ? "DECISION GATE" : activity.kind === "wait" ? "WAIT / TRIGGER" : activity.kind === "background-update" ? "PERSISTENT UPDATE" : "EXTERNAL EVENT"}</em>}
                </button>
              );
            })}
          </div>
        </div>

        <aside className="orchestration-inspector" aria-live="polite">
          <header><span>SELECTED ACTIVITY</span><b>{selected.kind === "decision" ? "DECISION" : selected.kind === "wait" ? "WAIT" : selected.kind === "external-event" ? "EVENT" : selected.kind === "background-update" ? "BACKGROUND" : "ACTIVITY"}</b></header>
          <div className="inspector-title"><i>E{String(selected.eventStep).padStart(2, "0")}</i><div><small>{selected.period} · {selected.phase}</small><h3>{selected.title}</h3></div></div>
          <dl>
            <div><dt>ИНИЦИАТОР</dt><dd>{selected.initiator}</dd></div>
            <div><dt>RESPONSIBLE ACTOR</dt><dd>{graph.actors.find((actor) => actor.id === selected.responsibleActorId)?.shortName}</dd></div>
            <div><dt>TRIGGER</dt><dd>{selected.trigger}</dd></div>
            <div><dt>STATE</dt><dd>{selected.stateLabel}</dd></div>
          </dl>
          <section className="inspector-event-description" aria-label="Event Description">
            <span>EVENT DESCRIPTION</span>
            <p>{selected.narrative}</p>
            {selectedEventAudit && <small><b>SCOPE BOUNDARY</b>{selectedEventAudit.scopeBoundary}</small>}
          </section>
          <div className={`inspector-agents ${selectedEventAudit ? "is-audited" : ""}`}>
            <span>{selectedEventAudit ? "AGENT EXECUTION AUDIT" : "AGENTS"}</span>
            <div className="inspector-agent-list">
              {selectedExecutions.length > 0 ? selectedExecutions.map((execution) => {
                const agent = agents.find((candidate) => candidate.id === execution.agentId);
                return agent ? (
                  <div className={`inspector-agent-audit-row ${comparisonIds.includes(agent.id) ? "is-compare-selected" : ""}`} key={agent.id}>
                    <button className={`inspector-agent-open agent-audit-${execution.necessity} ${execution.validationStatus === "needs-review" ? "is-proposed" : ""}`} type="button" onClick={() => onOpenAgent(agent.id, selected.eventStep)} title={execution.condition}>
                      <i style={{ "--agent-color": layerById[agent.layer].color } as React.CSSProperties}>{String(agent.id).padStart(2, "0")}</i>
                      <span>{agent.name}<small>{eventAgentAuditLabels[execution.necessity]}{execution.validationStatus === "needs-review" ? " · PROPOSED" : ""}</small></span>
                    </button>
                    <button
                      type="button"
                      className="event-agent-compare"
                      aria-pressed={comparisonIds.includes(agent.id)}
                      aria-label={`${comparisonIds.includes(agent.id) ? "Убрать" : "Выбрать"} ${String(agent.id).padStart(2, "0")} · ${agent.name} для сравнения`}
                      onClick={() => toggleComparisonAgent(agent.id)}
                    >
                      <i aria-hidden="true">{comparisonIds.includes(agent.id) ? "✓" : "+"}</i>
                      <span>{comparisonIds.includes(agent.id) ? "Selected" : "Compare"}</span>
                    </button>
                  </div>
                ) : null;
              }) : selected.agentNames.map((name) => {
                const agent = agentByName.get(name);
                return agent ? (
                  <div className={`inspector-agent-audit-row ${comparisonIds.includes(agent.id) ? "is-compare-selected" : ""}`} key={name}>
                    <button className="inspector-agent-open" type="button" onClick={() => onOpenAgent(agent.id, selected.eventStep)}><i style={{ "--agent-color": layerById[agent.layer].color } as React.CSSProperties}>{String(agent.id).padStart(2, "0")}</i>{name}</button>
                    <button type="button" className="event-agent-compare" aria-pressed={comparisonIds.includes(agent.id)} aria-label={`${comparisonIds.includes(agent.id) ? "Убрать" : "Выбрать"} ${String(agent.id).padStart(2, "0")} · ${agent.name} для сравнения`} onClick={() => toggleComparisonAgent(agent.id)}><i aria-hidden="true">{comparisonIds.includes(agent.id) ? "✓" : "+"}</i><span>{comparisonIds.includes(agent.id) ? "Selected" : "Compare"}</span></button>
                  </div>
                ) : null;
              })}
            </div>
            {selectedEventAudit && (
              <div className="inspector-agent-audit-summary">
                <p><b>{confirmedExecutions.length}</b><span>подтверждено</span></p>
                <p><b>{selectedExecutions.filter((execution) => execution.necessity === "misplaced" || execution.necessity === "redundant").length}</b><span>moved / removed</span></p>
                <p><b>{proposedExecutions.length}</b><span>proposed / review</span></p>
                <p><b>{selectedEventAudit.missingAgentIds.length}</b><span>missing agents</span></p>
                <small>{selectedEventAudit.missingAgentFinding}</small>
              </div>
            )}
            {selected.standbyAgentNames.length > 0 && <p>STANDBY · {selected.standbyAgentNames.join(" · ")}</p>}
          </div>
          <div className="inspector-io">
            <article><span>INPUT / DEPENDENCY</span>{incoming.length ? incoming.map((edge) => <p key={edge.id}><b>{edge.joinPolicy ? `${edge.joinPolicy} · ` : ""}{processRelationshipLabels[edge.type]}</b>{edge.label}</p>) : <p>Стартовый внешний Event</p>}</article>
            <article className="inspector-output"><span>COMBINED EVENT RESULT</span><p>{selectedArtifact.summary}</p>{selectedEventAudit && <small>Собрано из {confirmedExecutions.length} подтверждённых Agent outputs; это не output одного Agent.</small>}</article>
            {selectedExecutions.some((execution) => execution.datasetImpact?.length) && <article><span>DATASET IMPACT</span>{selectedExecutions.flatMap((execution) => execution.datasetImpact ?? []).filter((value, index, all) => all.indexOf(value) === index).map((impact) => <p key={impact}>{impact}</p>)}</article>}
            <article><span>NEXT / HANDOFF</span>{outgoing.length ? outgoing.map((edge) => <p key={edge.id}><b>{processRelationshipLabels[edge.type]}</b>{edge.label}{edge.condition ? <small>{edge.condition}</small> : null}</p>) : <p>Terminal outcome</p>}</article>
          </div>
        </aside>
      </div>

      <div className="orchestration-audit" aria-label="Автоматические проверки графа">
        <article><span>{graph.activities.length}</span><b>Case Events</b><small>все имеют Actor, Trigger и Output</small></article>
        <article><span>{graph.processes.length}</span><b>Case Processes</b><small>persistent, case-scoped и parallel</small></article>
        <article><span>{graph.relationships.length}</span><b>Typed relations</b><small>handoff, branch, wait, rework</small></article>
        <article><span>{joinCount}</span><b>Fan-In points</b><small>обязательные результаты сходятся явно</small></article>
        <article><span>{graph.activities.filter((activity) => activity.kind === "wait").length}</span><b>Managed waits</b><small>каждое ожидание имеет Trigger</small></article>
        <article className="audit-ok"><span>0</span><b>Orphan outputs</b><small>terminal outcome отмечен отдельно</small></article>
      </div>
      <AgentComparisonBar selectedIds={comparisonIds} onClear={() => setComparisonIds([])} onCompare={() => setComparisonOpen(true)} />
      {comparisonOpen && comparisonIds.length >= 2 && (
        <AgentComparisonModal
          selectedIds={comparisonIds}
          onAdd={(agentId) => setComparisonIds((current) => current.includes(agentId) ? current : [...current, agentId])}
          onRemove={(agentId) => setComparisonIds((current) => current.filter((id) => id !== agentId))}
          onOpenAgent={(agent) => onOpenAgent(agent.id, selected.eventStep)}
          onClose={() => setComparisonOpen(false)}
        />
      )}
    </section>
  );
}
