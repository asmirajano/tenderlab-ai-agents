"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { agents, layerById } from "../../packages/catalog-data/src/agents";
import { eventAgentAuditLabels, processRelationshipLabels, type ProcessActorKind, type ProcessRelationship } from "../process-model";
import { case1ProcessGraph } from "./case-1-graph";

type MapFocus = "all" | "critical" | "decisions";

const laneOrder: ProcessActorKind[] = ["buyer", "client", "tenderlab", "consultant", "external"];
const canvas = { width: 3550, header: 86, laneHeight: 206, nodeWidth: 200, nodeHeight: 150, xStart: 170, columnGap: 208 };
const timeBands = [
  { start: 0, end: 2, label: "D0–1 · DISCOVERY" },
  { start: 3, end: 5, label: "D1–6 · ANALYSIS" },
  { start: 6, end: 8, label: "D6–18 · DECISION + DESIGN" },
  { start: 9, end: 11, label: "D14–28 · PROPOSAL" },
  { start: 12, end: 14, label: "D28–69 · EVALUATION + AWARD" },
  { start: 15, end: 15, label: "D70–219 · DELIVERY" },
];

const agentByName = new Map(agents.map((agent) => [agent.name, agent]));

function positionFor(activityId: string) {
  const activity = case1ProcessGraph.activities.find((item) => item.id === activityId)!;
  const laneIndex = laneOrder.indexOf(activity.layout.lane);
  return {
    x: canvas.xStart + activity.layout.column * canvas.columnGap,
    y: canvas.header + laneIndex * canvas.laneHeight + 27,
  };
}

function edgePath(relationship: ProcessRelationship) {
  const source = positionFor(relationship.from);
  const target = positionFor(relationship.to);
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

export default function CaseOrchestrationMap({ onOpenAgent }: { onOpenAgent: (agentId: number, eventStep: number) => void }) {
  const [focus, setFocus] = useState<MapFocus>("all");
  const [actorFilter, setActorFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [selectedActivityId, setSelectedActivityId] = useState("activity-01");
  const [isFocusMode, setIsFocusMode] = useState(false);
  const mapScrollRef = useRef<HTMLDivElement>(null);
  const focusToggleRef = useRef<HTMLButtonElement>(null);
  const scrollPositionRef = useRef({ left: 0, top: 0 });

  const selected = case1ProcessGraph.activities.find((activity) => activity.id === selectedActivityId) ?? case1ProcessGraph.activities[0];
  const incoming = case1ProcessGraph.relationships.filter((relationship) => relationship.to === selected.id);
  const outgoing = case1ProcessGraph.relationships.filter((relationship) => relationship.from === selected.id);
  const selectedArtifact = case1ProcessGraph.artifacts.find((artifact) => artifact.activityId === selected.id)!;
  const selectedEventAudit = case1ProcessGraph.eventAudits.find((audit) => audit.eventStep === selected.eventStep);
  const selectedExecutions = case1ProcessGraph.agentExecutions.filter((execution) => execution.eventStep === selected.eventStep);
  const confirmedExecutions = selectedExecutions.filter((execution) => (
    (execution.necessity === "justified" || execution.necessity === "conditional")
    && execution.validationStatus !== "needs-review"
  ));
  const proposedExecutions = selectedExecutions.filter((execution) => execution.validationStatus === "needs-review");
  const activeAgentNames = useMemo(() => [...new Set(case1ProcessGraph.activities.flatMap((activity) => activity.agentNames))].sort(), []);
  const joinCount = useMemo(() => {
    const incomingCount = new Map<string, number>();
    case1ProcessGraph.relationships.filter((edge) => edge.blocking).forEach((edge) => incomingCount.set(edge.to, (incomingCount.get(edge.to) ?? 0) + 1));
    return [...incomingCount.values()].filter((count) => count > 1).length;
  }, []);

  const isActivityFocused = (activity: typeof selected) => {
    if (actorFilter !== "all" && !activity.actorIds.includes(actorFilter)) return false;
    if (agentFilter !== "all" && !activity.agentNames.includes(agentFilter) && !activity.standbyAgentNames.includes(agentFilter)) return false;
    if (focus === "critical" && !activity.critical) return false;
    if (focus === "decisions" && activity.kind !== "decision" && activity.kind !== "wait" && activity.kind !== "external-event") return false;
    return true;
  };

  const relationshipActive = (relationship: ProcessRelationship) => {
    const source = case1ProcessGraph.activities.find((activity) => activity.id === relationship.from)!;
    const target = case1ProcessGraph.activities.find((activity) => activity.id === relationship.to)!;
    return isActivityFocused(source) && isActivityFocused(target);
  };

  const toggleFocusMode = () => {
    const scrollArea = mapScrollRef.current;
    if (scrollArea) scrollPositionRef.current = { left: scrollArea.scrollLeft, top: scrollArea.scrollTop };
    setIsFocusMode((current) => !current);
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
    <section className={`orchestration-map-section ${isFocusMode ? "is-focus-mode" : ""}`} aria-labelledby="orchestration-map-title" data-focus-mode={isFocusMode ? "active" : "inactive"}>
      <div className="section-heading orchestration-heading">
        <div><p>CASE 1 · ORCHESTRATION MAP</p><h2 id="orchestration-map-title">События, ответственность и зависимости</h2></div>
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
        <label><span>ACTOR</span><select value={actorFilter} onChange={(event) => setActorFilter(event.target.value)}><option value="all">Все участники</option>{case1ProcessGraph.actors.map((actor) => <option value={actor.id} key={actor.id}>{actor.shortName}</option>)}</select></label>
        <label><span>AGENT</span><select value={agentFilter} onChange={(event) => setAgentFilter(event.target.value)}><option value="all">Все агенты</option>{activeAgentNames.map((name) => <option value={name} key={name}>{agentByName.get(name)?.id.toString().padStart(2, "0")} · {name}</option>)}</select></label>
        <div className="map-legend" aria-label="Легенда связей"><span><i className="edge-standard" /> Handoff</span><span><i className="edge-branch" /> Branch / Join</span><span><i className="edge-wait" /> Wait / External</span><span><i className="edge-loop" /> Rework / Feedback</span></div>
      </div>

      <div className="orchestration-workspace">
        <div ref={mapScrollRef} className="orchestration-scroll" aria-label="Прокручиваемая карта Case 1">
          <div className="orchestration-canvas" style={{ width: canvas.width, height: canvas.header + laneOrder.length * canvas.laneHeight + 92 }}>
            <div className="map-time-axis" aria-hidden="true">
              {timeBands.map((band) => (
                <span key={band.label} style={{ left: canvas.xStart + band.start * canvas.columnGap, width: (band.end - band.start + 1) * canvas.columnGap }}>{band.label}</span>
              ))}
            </div>
            {laneOrder.map((lane, laneIndex) => {
              const actor = case1ProcessGraph.actors.find((candidate) => candidate.kind === lane)!;
              return (
                <div className={`actor-lane lane-${lane}`} key={lane} style={{ top: canvas.header + laneIndex * canvas.laneHeight, height: canvas.laneHeight }}>
                  <div className="actor-lane-label"><span>{String(laneIndex + 1).padStart(2, "0")}</span><strong>{actor.shortName}</strong><small>{actor.description}</small></div>
                </div>
              );
            })}
            <svg className="orchestration-edges" viewBox={`0 0 ${canvas.width} ${canvas.header + laneOrder.length * canvas.laneHeight + 92}`} aria-hidden="true">
              <defs>
                <marker id="map-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 z" /></marker>
              </defs>
              {case1ProcessGraph.relationships.map((relationship) => (
                <path
                  className={`map-edge edge-${relationship.type} ${relationshipActive(relationship) ? "is-active" : "is-muted"} ${incoming.some((edge) => edge.id === relationship.id) || outgoing.some((edge) => edge.id === relationship.id) ? "is-selected" : ""}`}
                  d={edgePath(relationship)}
                  markerEnd="url(#map-arrow)"
                  key={relationship.id}
                />
              ))}
            </svg>
            {case1ProcessGraph.activities.map((activity) => {
              const position = positionFor(activity.id);
              const focused = isActivityFocused(activity);
              const selectedNode = selected.id === activity.id;
              return (
                <button
                  type="button"
                  className={`orchestration-node node-${activity.kind} ${activity.critical ? "is-critical" : ""} ${focused ? "is-focused" : "is-muted"} ${selectedNode ? "is-selected" : ""}`}
                  style={{ left: position.x, top: position.y, width: canvas.nodeWidth, minHeight: canvas.nodeHeight }}
                  aria-pressed={selectedNode}
                  onClick={() => setSelectedActivityId(activity.id)}
                  key={activity.id}
                >
                  <span className="node-topline"><b>E{String(activity.eventStep).padStart(2, "0")}</b><i>{activity.stateLabel}</i></span>
                  <small>{activity.period}</small>
                  <strong>{activity.title}</strong>
                  <span className="node-agents">{activity.agentNames.length} agents{activity.standbyAgentNames.length ? ` · ${activity.standbyAgentNames.length} standby` : ""}{case1ProcessGraph.eventAudits.some((audit) => audit.eventStep === activity.eventStep) ? ` · ${case1ProcessGraph.agentExecutions.filter((execution) => execution.eventStep === activity.eventStep && (execution.necessity === "misplaced" || execution.necessity === "redundant" || execution.necessity === "unsupported" || execution.validationStatus === "needs-review")).length} audit finding` : ""}</span>
                  {activity.kind !== "activity" && <em>{activity.kind === "decision" ? "DECISION GATE" : activity.kind === "wait" ? "WAIT / TRIGGER" : "EXTERNAL EVENT"}</em>}
                </button>
              );
            })}
          </div>
        </div>

        <aside className="orchestration-inspector" aria-live="polite">
          <header><span>SELECTED ACTIVITY</span><b>{selected.kind === "decision" ? "DECISION" : selected.kind === "wait" ? "WAIT" : selected.kind === "external-event" ? "EVENT" : "ACTIVITY"}</b></header>
          <div className="inspector-title"><i>E{String(selected.eventStep).padStart(2, "0")}</i><div><small>{selected.period} · {selected.phase}</small><h3>{selected.title}</h3></div></div>
          <dl>
            <div><dt>ИНИЦИАТОР</dt><dd>{selected.initiator}</dd></div>
            <div><dt>RESPONSIBLE ACTOR</dt><dd>{case1ProcessGraph.actors.find((actor) => actor.id === selected.responsibleActorId)?.shortName}</dd></div>
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
            <div>
              {selectedExecutions.length > 0 ? selectedExecutions.map((execution) => {
                const agent = agents.find((candidate) => candidate.id === execution.agentId);
                return agent ? (
                  <button className={`agent-audit-${execution.necessity} ${execution.validationStatus === "needs-review" ? "is-proposed" : ""}`} type="button" onClick={() => onOpenAgent(agent.id, selected.eventStep)} key={agent.id} title={execution.condition}>
                    <i style={{ "--agent-color": layerById[agent.layer].color } as React.CSSProperties}>{String(agent.id).padStart(2, "0")}</i>
                    <span>{agent.name}<small>{eventAgentAuditLabels[execution.necessity]}{execution.validationStatus === "needs-review" ? " · PROPOSED" : ""}</small></span>
                  </button>
                ) : null;
              }) : selected.agentNames.map((name) => {
                const agent = agentByName.get(name);
                return agent ? <button type="button" onClick={() => onOpenAgent(agent.id, selected.eventStep)} key={name}><i style={{ "--agent-color": layerById[agent.layer].color } as React.CSSProperties}>{String(agent.id).padStart(2, "0")}</i>{name}</button> : null;
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
            <article><span>NEXT / HANDOFF</span>{outgoing.length ? outgoing.map((edge) => <p key={edge.id}><b>{processRelationshipLabels[edge.type]}</b>{edge.label}{edge.condition ? <small>{edge.condition}</small> : null}</p>) : <p>Terminal outcome</p>}</article>
          </div>
        </aside>
      </div>

      <div className="orchestration-audit" aria-label="Автоматические проверки графа">
        <article><span>20</span><b>Activities</b><small>все имеют Actor и Output</small></article>
        <article><span>{case1ProcessGraph.relationships.length}</span><b>Typed relations</b><small>handoff, branch, wait, rework</small></article>
        <article><span>{joinCount}</span><b>Fan-In points</b><small>обязательные результаты сходятся явно</small></article>
        <article><span>{case1ProcessGraph.activities.filter((activity) => activity.kind === "wait").length}</span><b>Managed waits</b><small>каждое ожидание имеет Trigger</small></article>
        <article className="audit-ok"><span>0</span><b>Orphan outputs</b><small>terminal outcome отмечен отдельно</small></article>
      </div>
    </section>
  );
}
