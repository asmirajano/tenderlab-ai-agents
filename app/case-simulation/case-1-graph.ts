import { case1, case1Chronology } from "./case-1-data";
import { agents } from "../../packages/catalog-data/src/agents";
import type {
  CaseProcessActivity,
  CaseProcessGraph,
  ProcessActor,
  ProcessActivityKind,
  ProcessRelationship,
} from "../process-model";
import {
  case1AuditSummary,
  case1EventAgentExecutions,
  case1EventAudits,
} from "./case-1-event-audits";

export { case1AuditSummary, case1EventAgentExecutions, case1EventAudits };

export const case1Actors: ProcessActor[] = [
  { id: "buyer", name: "Министерство образования и науки Грузии", shortName: "Buyer / Procuring Entity", kind: "buyer", description: "Публикует закупку, отвечает за оценку, clarification, award и приёмку." },
  { id: "client", name: "Anatolia Workspace A.Ş.", shortName: "Client Company", kind: "client", description: "Принимает коммерческие решения, предоставляет evidence и готовит заявку." },
  { id: "tenderlab", name: "TenderLab.ai", shortName: "TenderLab / Backend", kind: "tenderlab", description: "Собирает данные, запускает агентов, связывает outputs и поддерживает state Case." },
  { id: "consultant", name: "TenderLab Consultant / Expert", shortName: "Consultant / Expert", kind: "consultant", description: "Проверяет выводы, управляет исключениями и готовит рекомендации для людей." },
  { id: "external", name: "Внешние участники", shortName: "External Parties", kind: "external", description: "Банк, локальный партнёр, портал, логистические и иные внешние стороны." },
];

type ActivitySpec = {
  actor: string;
  actors?: string[];
  kind?: ProcessActivityKind;
  trigger: string;
  startDay: number;
  endDay: number;
  column: number;
  lane: ProcessActor["kind"];
  critical?: boolean;
};

const activitySpecs: Record<number, ActivitySpec> = {
  1: { actor: "buyer", actors: ["buyer", "tenderlab"], kind: "external-event", trigger: "Официальная публикация notice", startDay: 0, endDay: 0, column: 0, lane: "buyer", critical: true },
  2: { actor: "tenderlab", actors: ["tenderlab", "consultant"], trigger: "Новый нормализованный tender package", startDay: 0, endDay: 1, column: 1, lane: "tenderlab", critical: true },
  3: { actor: "client", actors: ["client", "tenderlab"], kind: "decision", trigger: "Opportunity relevance 92%", startDay: 1, endDay: 1, column: 2, lane: "client", critical: true },
  4: { actor: "client", actors: ["client", "consultant", "tenderlab"], trigger: "Согласие на tender-specific assessment", startDay: 1, endDay: 3, column: 3, lane: "client", critical: true },
  5: { actor: "tenderlab", actors: ["tenderlab"], trigger: "Открытие управляемого Case", startDay: 2, endDay: 4, column: 3, lane: "tenderlab", critical: true },
  6: { actor: "tenderlab", actors: ["tenderlab", "consultant"], trigger: "Версионированный корпус документов", startDay: 3, endDay: 5, column: 4, lane: "tenderlab", critical: true },
  7: { actor: "tenderlab", actors: ["tenderlab", "consultant"], trigger: "Verified profile + requirements register", startDay: 4, endDay: 6, column: 5, lane: "tenderlab", critical: true },
  8: { actor: "client", actors: ["client", "consultant"], kind: "decision", trigger: "Match, feasibility, economics и risk pack", startDay: 6, endDay: 6, column: 6, lane: "client", critical: true },
  9: { actor: "consultant", actors: ["consultant", "client", "external"], trigger: "Conditional BID: требуется local service", startDay: 6, endDay: 9, column: 7, lane: "consultant" },
  10: { actor: "client", actors: ["client", "tenderlab", "external"], trigger: "Conditional BID и подтверждённая capacity", startDay: 7, endDay: 12, column: 7, lane: "client", critical: true },
  11: { actor: "consultant", actors: ["consultant", "tenderlab", "buyer"], kind: "wait", trigger: "Clarification deadline и monitoring портала", startDay: 9, endDay: 15, column: 7, lane: "consultant" },
  12: { actor: "consultant", actors: ["consultant", "client", "tenderlab"], trigger: "Requirements + solution + verified partner", startDay: 10, endDay: 17, column: 8, lane: "consultant", critical: true },
  13: { actor: "client", actors: ["client", "consultant", "external"], trigger: "Approved commercial thresholds", startDay: 11, endDay: 18, column: 8, lane: "client", critical: true },
  14: { actor: "client", actors: ["client", "consultant", "tenderlab"], trigger: "Compliance 164/164 + approved BOQ", startDay: 14, endDay: 21, column: 9, lane: "client", critical: true },
  15: { actor: "consultant", actors: ["consultant", "client"], kind: "decision", trigger: "Полный draft proposal", startDay: 21, endDay: 25, column: 10, lane: "consultant", critical: true },
  16: { actor: "client", actors: ["client", "tenderlab", "external"], trigger: "Human approval и закрытый red-team log", startDay: 27, endDay: 27, column: 11, lane: "client", critical: true },
  17: { actor: "buyer", actors: ["buyer", "client", "consultant"], kind: "wait", trigger: "Официальный запрос комиссии", startDay: 35, endDay: 42, column: 12, lane: "buyer" },
  18: { actor: "buyer", actors: ["buyer", "client", "tenderlab"], kind: "external-event", trigger: "Завершение оценки и standstill", startDay: 56, endDay: 66, column: 13, lane: "buyer", critical: true },
  19: { actor: "external", actors: ["buyer", "client", "external", "consultant"], kind: "decision", trigger: "Notice of intention to award", startDay: 67, endDay: 69, column: 14, lane: "external", critical: true },
  20: { actor: "client", actors: ["client", "buyer", "tenderlab", "external"], trigger: "Подписанный контракт и mobilization plan", startDay: 70, endDay: 219, column: 15, lane: "client", critical: true },
};

const dependencySpecs: Array<{
  from: number;
  to: number;
  type?: ProcessRelationship["type"];
  label: string;
  condition?: string;
  blocking?: boolean;
  joinPolicy?: ProcessRelationship["joinPolicy"];
  validationStatus?: ProcessRelationship["validationStatus"];
}> = [
  { from: 1, to: 2, label: "Notice + source package", blocking: true },
  { from: 2, to: 3, label: "Opportunity card 92%", blocking: true },
  { from: 3, to: 4, type: "branches-to", label: "Разрешение на проверку компании", blocking: true },
  { from: 3, to: 5, type: "branches-to", label: "Разрешение на обработку документов", blocking: true },
  { from: 4, to: 7, type: "joins-at", label: "Verified profile + readiness 84/100", blocking: true, joinPolicy: "ALL" },
  { from: 5, to: 6, label: "Source-locked corpus", blocking: true },
  { from: 6, to: 7, type: "joins-at", label: "164 requirements + eligibility", blocking: true, joinPolicy: "ALL" },
  { from: 5, to: 11, type: "branches-to", label: "Monitoring calendar", blocking: false },
  { from: 7, to: 8, label: "Match 88% + gaps", blocking: true },
  { from: 8, to: 9, type: "branches-to", label: "Conditional BID: local service", condition: "Требуется локальное покрытие", blocking: true },
  { from: 8, to: 10, type: "branches-to", label: "Conditional BID: solution design", blocking: true },
  { from: 6, to: 12, type: "joins-at", label: "Requirements register", blocking: true, joinPolicy: "ALL" },
  { from: 9, to: 12, type: "joins-at", label: "Verified service partner", blocking: true, joinPolicy: "ALL" },
  { from: 10, to: 12, type: "joins-at", label: "Solution architecture", blocking: true, joinPolicy: "ALL" },
  { from: 11, to: 12, type: "joins-at", label: "Clarification milestone cleared", blocking: true, joinPolicy: "ALL" },
  { from: 8, to: 13, type: "branches-to", label: "Approved commercial thresholds", blocking: true },
  { from: 10, to: 13, type: "joins-at", label: "Delivery and cost assumptions", blocking: true, joinPolicy: "ALL" },
  { from: 12, to: 14, type: "joins-at", label: "Compliance 164/164", blocking: true, joinPolicy: "ALL" },
  { from: 13, to: 14, type: "joins-at", label: "Approved BOQ $3.61m", blocking: true, joinPolicy: "ALL" },
  { from: 14, to: 15, label: "Complete proposal draft", blocking: true },
  { from: 15, to: 12, type: "rework", label: "Evidence / compliance findings", condition: "Если QA находит слабое доказательство или compliance gap", blocking: false },
  { from: 15, to: 14, type: "rework", label: "6 red-team findings", condition: "Если QA находит содержательный gap", blocking: false },
  { from: 15, to: 16, type: "approved-by", label: "Submission approval", blocking: true },
  { from: 16, to: 17, type: "waits-for", label: "Buyer clarification request", condition: "Только при официальном запросе", blocking: false },
  { from: 16, to: 18, type: "waits-for", label: "Buyer evaluation outcome", blocking: true },
  { from: 17, to: 18, type: "joins-at", label: "Accepted clarification package", blocking: true, joinPolicy: "ALL" },
  { from: 18, to: 19, label: "Intention to award", blocking: true },
  { from: 19, to: 20, label: "Signed contract + mobilization", blocking: true },
  { from: 20, to: 2, type: "feedback", label: "Outcome learning for future cases", blocking: false },
];

const standbySuffix = " — резерв";
const canonicalAgentById = new Map(agents.map((agent) => [agent.id, agent]));

const activities: CaseProcessActivity[] = case1Chronology.map((event) => {
  const spec = activitySpecs[event.step];
  if (!spec) throw new Error(`Missing process graph metadata for Case 1 event ${event.step}.`);
  const auditedExecutions = case1EventAgentExecutions.filter((execution) => execution.eventStep === event.step);
  const auditedActiveAgentNames = new Set(auditedExecutions
    .filter((execution) => (
      (execution.necessity === "justified" || execution.necessity === "conditional")
      && execution.activation !== "standby"
      && execution.validationStatus !== "needs-review"
    ))
    .map((execution) => canonicalAgentById.get(execution.agentId)?.name)
    .filter((name): name is string => Boolean(name)));
  const agentNames = auditedExecutions.length > 0
    ? [...auditedActiveAgentNames]
    : event.agents.filter((name) => !name.endsWith(standbySuffix));
  const standbyAgentNames = auditedExecutions.length > 0
    ? auditedExecutions
      .filter((execution) => execution.necessity === "conditional" && execution.activation === "standby")
      .map((execution) => canonicalAgentById.get(execution.agentId)?.name)
      .filter((name): name is string => Boolean(name))
    : event.agents
      .filter((name) => name.endsWith(standbySuffix))
      .map((name) => name.slice(0, -standbySuffix.length));

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
    responsibleActorId: spec.actor,
    actorIds: spec.actors ?? [spec.actor],
    agentNames,
    standbyAgentNames,
    kind: spec.kind ?? "activity",
    state: "completed",
    stateLabel: spec.kind === "wait" ? "WAIT RESOLVED" : "COMPLETED",
    trigger: spec.trigger,
    startDay: spec.startDay,
    endDay: spec.endDay,
    layout: { column: spec.column, lane: spec.lane },
    critical: Boolean(spec.critical),
  };
});

const artifacts = activities.map((activity) => ({
  id: `artifact-${String(activity.eventStep).padStart(2, "0")}`,
  activityId: activity.id,
  name: `Output Event ${String(activity.eventStep).padStart(2, "0")}`,
  summary: activity.result,
  terminal: activity.eventStep === 20,
}));

const relationships: ProcessRelationship[] = dependencySpecs.map((relationship, index) => ({
  id: `case-1-edge-${String(index + 1).padStart(2, "0")}`,
  from: `activity-${String(relationship.from).padStart(2, "0")}`,
  to: `activity-${String(relationship.to).padStart(2, "0")}`,
  type: relationship.type ?? "handoff",
  label: relationship.label,
  artifactId: `artifact-${String(relationship.from).padStart(2, "0")}`,
  condition: relationship.condition,
  blocking: relationship.blocking,
  joinPolicy: relationship.joinPolicy,
  provenance: "case-observed",
  validationStatus: relationship.validationStatus ?? "working",
}));

export const case1ProcessGraph: CaseProcessGraph = {
  caseId: case1.id,
  version: "V2 · ORCHESTRATION MODEL",
  actors: case1Actors,
  activities,
  artifacts,
  relationships,
  eventAudits: case1EventAudits,
  agentExecutions: case1EventAgentExecutions,
  auditSummary: case1AuditSummary,
  orchestratorAgentIds: [1],
};

const activityIds = new Set(activities.map((activity) => activity.id));
if (activities.length !== 20 || activityIds.size !== 20) throw new Error("Case 1 process graph needs 20 unique activities.");
if (activities.some((activity) => !case1Actors.some((actor) => actor.id === activity.responsibleActorId))) {
  throw new Error("Every Case 1 activity needs a canonical responsible actor.");
}
if (relationships.some((relationship) => !activityIds.has(relationship.from) || !activityIds.has(relationship.to))) {
  throw new Error("Every Case 1 process relationship must reference known activities.");
}
if (activities.some((activity) => activity.kind === "wait" && !activity.trigger)) {
  throw new Error("Every Case 1 waiting activity needs an explicit trigger.");
}
if (case1EventAudits.some((audit) => !activities.some((activity) => activity.eventStep === audit.eventStep))) {
  throw new Error("Every Case 1 Event Audit needs a canonical activity.");
}
if (case1EventAgentExecutions.some((execution) => !case1EventAudits.some((audit) => audit.eventStep === execution.eventStep))) {
  throw new Error("Every Event-specific Agent Execution needs an audited Event.");
}
