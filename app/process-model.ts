export type ProcessActorKind = "buyer" | "client" | "tenderlab" | "consultant" | "external";

export type ProcessActor = {
  id: string;
  name: string;
  shortName: string;
  kind: ProcessActorKind;
  description: string;
};

export type ProcessActivityKind = "activity" | "decision" | "wait" | "external-event";
export type ProcessExecutionState = "planned" | "running" | "waiting" | "blocked" | "completed" | "skipped" | "failed";

export type ProcessArtifact = {
  id: string;
  activityId: string;
  name: string;
  summary: string;
  terminal?: boolean;
};

export type ProcessRelationshipType =
  | "contains"
  | "supports"
  | "participates-in"
  | "initiated-by"
  | "responsible-actor"
  | "executed-by"
  | "orchestrated-by"
  | "consumes"
  | "produces"
  | "handoff"
  | "depends-on"
  | "blocks"
  | "triggered-by"
  | "approved-by"
  | "branches-to"
  | "joins-at"
  | "waits-for"
  | "retry"
  | "rework"
  | "feedback"
  | "transitions-to";

export type ProcessRelationship = {
  id: string;
  from: string;
  to: string;
  type: ProcessRelationshipType;
  label: string;
  artifactId?: string;
  condition?: string;
  blocking?: boolean;
  joinPolicy?: "ALL" | "ANY" | "N_OF_M";
  provenance: "case-observed" | "canonical" | "expert-proposed";
  validationStatus: "confirmed" | "working" | "needs-review";
};

export type CaseProcessActivity = {
  id: string;
  eventId: string;
  eventStep: number;
  title: string;
  period: string;
  phase: string;
  narrative: string;
  result: string;
  next: string;
  initiator: string;
  responsibleActorId: string;
  actorIds: string[];
  agentNames: string[];
  standbyAgentNames: string[];
  kind: ProcessActivityKind;
  state: ProcessExecutionState;
  stateLabel: string;
  trigger: string;
  startDay: number;
  endDay: number;
  layout: {
    column: number;
    lane: ProcessActorKind;
  };
  critical: boolean;
};

export type CaseProcessGraph = {
  caseId: string;
  version: string;
  actors: ProcessActor[];
  activities: CaseProcessActivity[];
  artifacts: ProcessArtifact[];
  relationships: ProcessRelationship[];
  orchestratorAgentIds: number[];
};

export const processRelationshipLabels: Record<ProcessRelationshipType, string> = {
  contains: "Содержит",
  supports: "Поддерживает",
  "participates-in": "Участвует",
  "initiated-by": "Инициировано",
  "responsible-actor": "Ответственность",
  "executed-by": "Выполняется",
  "orchestrated-by": "Оркестрируется",
  consumes: "Получает",
  produces: "Производит",
  handoff: "Передаёт",
  "depends-on": "Зависит от",
  blocks: "Блокирует",
  "triggered-by": "Запускается",
  "approved-by": "Утверждается",
  "branches-to": "Ветвится",
  "joins-at": "Сходится",
  "waits-for": "Ожидает",
  retry: "Повторяет",
  rework: "Возвращает на доработку",
  feedback: "Возвращает обратную связь",
  "transitions-to": "Меняет состояние",
};
