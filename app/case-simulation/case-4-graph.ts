import { agents } from "../../packages/catalog-data/src/agents.ts";
import type { CaseProcessActivity, CaseProcessGraph, ProcessActor, ProcessRelationship } from "../process-model.ts";
import { case4 } from "./case-4-data.ts";
import { case4AuditSummary, case4EventAgentExecutions, case4EventAudits } from "./case-4-event-audits.ts";
import { case4EventBlueprints, case4Processes, case4RelationshipSpecs } from "./case-4-orchestration.ts";
import { datasetImpactForAgent } from "./case-2-event-audits.ts";

export { case4AuditSummary, case4EventAgentExecutions, case4EventAudits };

export const case4Actors: ProcessActor[] = [
  { id: "buyer", name: "Rwanda Biomedical Centre · Ministry of Health", shortName: "Buyer / Procuring Entity", kind: "buyer", description: "Публикует REOI/RFP, принимает shortlist, evaluation, negotiation и award decisions." },
  { id: "client", name: "NorthStar Digital Health OÜ", shortName: "Consulting Firm", kind: "client", description: "Предоставляет evidence, назначает experts, утверждает цену и подписывает proposal/contract." },
  { id: "tenderlab", name: "TenderLab.ai", shortName: "TenderLab / Backend", kind: "tenderlab", description: "Поддерживает Case graph, source/evidence state и выполняет canonical Agents." },
  { id: "consultant", name: "TenderLab Consultant", shortName: "Consultant / Expert", kind: "consultant", description: "Проверяет QCBS route, evidence и boundaries; не подменяет Buyer или company authority." },
  { id: "external", name: "World Bank, registries and local experts", shortName: "External Parties", kind: "external", description: "Official sources, expert declarations, references и integrity evidence." },
];

const agentById = new Map(agents.map((agent) => [agent.id, agent]));

const activities: CaseProcessActivity[] = case4EventBlueprints.map((event) => {
  const executions = case4EventAgentExecutions.filter((item) => item.eventStep === event.step);
  const activeAgentNames = executions.filter((item) => item.activation !== "standby").map((item) => agentById.get(item.agentId)?.name).filter((name): name is string => Boolean(name));
  const standbyAgentNames = executions.filter((item) => item.activation === "standby").map((item) => agentById.get(item.agentId)?.name).filter((name): name is string => Boolean(name));
  return {
    id: `case4-activity-${String(event.step).padStart(2, "0")}`,
    eventId: `case4-event-${String(event.step).padStart(2, "0")}`,
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
    stateLabel: event.kind === "decision" ? "GATE PASSED" : event.kind === "external-event" ? "EXTERNAL STATE" : "COMPLETED",
    trigger: event.trigger,
    startDay: event.startDay,
    endDay: event.endDay,
    layout: { column: event.column, lane: event.lane },
    critical: Boolean(event.critical),
  };
});

const eventArtifacts = activities.map((activity) => ({
  id: `case4-artifact-${String(activity.eventStep).padStart(2, "0")}`,
  producerRef: activity.id,
  producerKind: "event" as const,
  name: `Case 4 · E${String(activity.eventStep).padStart(2, "0")} output`,
  summary: activity.result,
  persistence: activity.eventStep === 15 ? "persistent" as const : "case-state" as const,
  version: `E${String(activity.eventStep).padStart(2, "0")}-V1`,
  terminal: activity.eventStep === 15,
}));

const processArtifactSeeds = [
  ["c4-artifact-p01-policy", "C4-P01", "Governance and evidence policy"],
  ["c4-artifact-p02-company", "C4-P02", "Verified company, capability and expert baseline"],
  ["c4-artifact-p03-market", "C4-P03", "Consulting market, award and Buyer dossier"],
  ["c4-artifact-p04-calendar", "C4-P04", "Current calendar and Addendum impact register"],
  ["c4-artifact-p05-experts", "C4-P05", "Expert availability and conflict register"],
  ["c4-artifact-p06-learning", "C4-P06", "QCBS outcome and architecture learning record"],
] as const;
const processArtifacts = processArtifactSeeds.map(([id, producerRef, name]) => ({ id, producerRef, producerKind: "process" as const, name, summary: name, persistence: producerRef === "C4-P04" || producerRef === "C4-P05" ? "case-state" as const : "persistent" as const, version: "V1" }));
const artifacts = [...eventArtifacts, ...processArtifacts];

const eventRelationships: ProcessRelationship[] = case4RelationshipSpecs.map((edge, index) => ({
  id: `case-4-event-edge-${String(index + 1).padStart(2, "0")}`,
  from: `case4-activity-${String(edge.from).padStart(2, "0")}`,
  to: `case4-activity-${String(edge.to).padStart(2, "0")}`,
  type: edge.type ?? "handoff",
  label: edge.label,
  artifactId: `case4-artifact-${String(edge.from).padStart(2, "0")}`,
  condition: edge.condition,
  blocking: edge.blocking,
  joinPolicy: edge.joinPolicy,
  provenance: "expert-proposed",
  validationStatus: "working",
}));

const processRelationships: ProcessRelationship[] = [
  { id: "case-4-process-edge-01", from: "C4-P01", to: "case4-activity-02", type: "handoff", label: "Policy + taxonomy", artifactId: "c4-artifact-p01-policy", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-4-process-edge-02", from: "C4-P02", to: "case4-activity-03", type: "handoff", label: "Verified company baseline", artifactId: "c4-artifact-p02-company", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-4-process-edge-03", from: "C4-P03", to: "case4-activity-10", type: "joins-at", label: "Market/rate/buyer evidence", artifactId: "c4-artifact-p03-market", blocking: false, joinPolicy: "ALL", provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-4-process-edge-04", from: "case4-activity-01", to: "C4-P04", type: "triggered-by", label: "REOI calendar", artifactId: "case4-artifact-01", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-4-process-edge-05", from: "C4-P04", to: "case4-activity-07", type: "handoff", label: "Current RFP/Addendum version", artifactId: "c4-artifact-p04-calendar", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-4-process-edge-06", from: "C4-P05", to: "case4-activity-10", type: "joins-at", label: "11 expert availability/conflict baseline", artifactId: "c4-artifact-p05-experts", blocking: true, joinPolicy: "ALL", provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-4-process-edge-07", from: "case4-activity-15", to: "C4-P06", type: "handoff", label: "Contract outcome", artifactId: "case4-artifact-15", blocking: false, provenance: "expert-proposed", validationStatus: "working" },
];

const processAgentExecutions = case4Processes.flatMap((process) => process.agentIds.map((agentId) => {
  const agent = agentById.get(agentId);
  if (!agent) throw new Error(`Unknown Agent ${agentId} in ${process.id}.`);
  return {
    processId: process.id,
    agentId,
    role: agent.description,
    input: process.inputs.map((item) => item.name).join(" · "),
    output: process.outputArtifactIds.map((id) => artifacts.find((artifact) => artifact.id === id)?.name).filter(Boolean).join(" · "),
    handoff: process.consumerRefs.join(" · "),
    datasetImpact: datasetImpactForAgent(agentId),
    validationStatus: "working" as const,
  };
}));

export const case4ProcessGraph: CaseProcessGraph = {
  caseId: case4.id,
  version: "V1 · QCBS CONSULTING SERVICES",
  actors: case4Actors,
  activities,
  processes: case4Processes,
  artifacts,
  relationships: [...eventRelationships, ...processRelationships],
  eventAudits: case4EventAudits,
  agentExecutions: case4EventAgentExecutions,
  processAgentExecutions,
  auditSummary: case4AuditSummary,
  orchestratorAgentIds: [1],
};

const nodeIds = new Set([...activities.map((item) => item.id), ...case4Processes.map((item) => item.id)]);
const artifactIds = new Set(artifacts.map((item) => item.id));
if (activities.length !== 15 || new Set(activities.map((item) => item.id)).size !== 15) throw new Error("Case 4 graph requires 15 unique Events.");
if (case4ProcessGraph.relationships.some((edge) => !nodeIds.has(edge.from) || !nodeIds.has(edge.to))) throw new Error("Every Case 4 relationship needs valid nodes.");
if (case4ProcessGraph.relationships.some((edge) => edge.artifactId && !artifactIds.has(edge.artifactId))) throw new Error("Every Case 4 relationship Artifact must exist.");
if (case4ProcessGraph.processAgentExecutions.some((item) => !item.input || !item.output || !item.handoff || !item.datasetImpact?.length)) throw new Error("Every Case 4 Process execution needs complete lineage.");
