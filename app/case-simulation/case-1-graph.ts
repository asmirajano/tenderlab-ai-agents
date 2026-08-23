import { agents } from "../../packages/catalog-data/src/agents.ts";
import type { CaseProcessActivity, CaseProcessGraph, ProcessActor, ProcessRelationship } from "../process-model.ts";
import { case1 } from "./case-1-data.ts";
import { case1AuditSummary, case1EventAgentExecutions, case1EventAudits } from "./case-1-event-audits.ts";
import { case1BackgroundProcesses, case1EventBlueprints, case1RelationshipSpecs } from "./case-1-orchestration.ts";

export { case1AuditSummary, case1EventAgentExecutions, case1EventAudits };

export const case1Actors: ProcessActor[] = [
  { id: "buyer", name: "Министерство образования и науки Грузии", shortName: "Buyer / Procuring Entity", kind: "buyer", description: "Публикует закупку, отвечает за evaluation, clarification, award и acceptance." },
  { id: "client", name: "Anatolia Workspace A.Ş.", shortName: "Client Company", kind: "client", description: "Предоставляет evidence, принимает business decisions, готовит bid и исполняет contract." },
  { id: "tenderlab", name: "TenderLab.ai", shortName: "TenderLab / Backend", kind: "tenderlab", description: "Поддерживает persistent data, выполняет Agents и связывает Event outputs в Case state." },
  { id: "consultant", name: "TenderLab Consultant / Expert", shortName: "Consultant / Expert", kind: "consultant", description: "Проверяет исключения, QA/legal conclusions и готовит human-ready recommendations." },
  { id: "external", name: "Внешние участники", shortName: "External Parties", kind: "external", description: "Банк, portal, local-service partner, logistics providers и authorised signatories." },
];

const canonicalAgentById = new Map(agents.map((agent) => [agent.id, agent]));

const activities: CaseProcessActivity[] = case1EventBlueprints.map((event) => {
  const executions = case1EventAgentExecutions.filter((execution) => execution.eventStep === event.step);
  const activeAgentNames = executions
    .filter((execution) => (execution.necessity === "justified" || execution.necessity === "conditional") && execution.activation !== "standby" && execution.validationStatus !== "needs-review")
    .map((execution) => canonicalAgentById.get(execution.agentId)?.name)
    .filter((name): name is string => Boolean(name));
  const standbyAgentNames = executions
    .filter((execution) => execution.necessity === "conditional" && execution.activation === "standby")
    .map((execution) => canonicalAgentById.get(execution.agentId)?.name)
    .filter((name): name is string => Boolean(name));

  return {
    id: `activity-${String(event.step).padStart(2, "0")}`,
    eventId: `event-${String(event.step).padStart(2, "0")}`,
    eventStep: event.step,
    title: event.title,
    period: event.period,
    phase: event.phase,
    narrative: event.narrative,
    result: event.result,
    next: event.next,
    initiator: event.initiator,
    responsibleActorId: event.responsibleActorId,
    actorIds: event.actorIds,
    agentNames: activeAgentNames,
    standbyAgentNames,
    kind: event.kind ?? "activity",
    state: "completed",
    stateLabel: event.kind === "wait" ? "GATE CLEARED" : event.kind === "background-update" ? "DATA UPDATED" : "COMPLETED",
    trigger: event.trigger,
    startDay: event.startDay,
    endDay: event.endDay,
    layout: { column: event.column, lane: event.lane },
    critical: Boolean(event.critical),
  };
});

const artifacts = activities.map((activity) => ({
  id: `artifact-${String(activity.eventStep).padStart(2, "0")}`,
  activityId: activity.id,
  name: `Output Event ${String(activity.eventStep).padStart(2, "0")}`,
  summary: activity.result,
  terminal: activity.eventStep === 24,
}));

const relationships: ProcessRelationship[] = case1RelationshipSpecs.map((relationship, index) => ({
  id: `case-1-edge-${String(index + 1).padStart(2, "0")}`,
  from: `activity-${String(relationship.from).padStart(2, "0")}`,
  to: `activity-${String(relationship.to).padStart(2, "0")}`,
  type: relationship.type ?? "handoff",
  label: relationship.label,
  artifactId: `artifact-${String(relationship.from).padStart(2, "0")}`,
  condition: relationship.condition,
  blocking: relationship.blocking,
  joinPolicy: relationship.joinPolicy,
  provenance: "expert-proposed",
  validationStatus: relationship.from <= 2 && relationship.to <= 3 ? "confirmed" : "working",
}));

export const case1ProcessGraph: CaseProcessGraph = {
  caseId: case1.id,
  version: "V3 · DEPENDENCY-AWARE ORCHESTRATION",
  actors: case1Actors,
  activities,
  backgroundProcesses: case1BackgroundProcesses,
  artifacts,
  relationships,
  eventAudits: case1EventAudits,
  agentExecutions: case1EventAgentExecutions,
  auditSummary: case1AuditSummary,
  orchestratorAgentIds: [1],
};

const activityIds = new Set(activities.map((activity) => activity.id));
if (activities.length !== 24 || activityIds.size !== 24) throw new Error("Case 1 process graph needs 24 unique Events.");
if (activities.some((activity) => !case1Actors.some((actor) => actor.id === activity.responsibleActorId))) throw new Error("Every Case 1 Event needs a canonical responsible Actor.");
if (relationships.some((relationship) => !activityIds.has(relationship.from) || !activityIds.has(relationship.to))) throw new Error("Every Case 1 relationship must reference known Events.");
if (activities.some((activity) => activity.kind === "wait" && !activity.trigger)) throw new Error("Every wait/gate Event needs an explicit trigger.");
if (case1EventAudits.some((audit) => !activities.some((activity) => activity.eventStep === audit.eventStep))) throw new Error("Every Event Audit needs a canonical Event.");
if (case1BackgroundProcesses.some((process) => !case1Actors.some((actor) => actor.id === process.ownerActorId))) throw new Error("Every background process needs a canonical owner Actor.");
