import { agents } from "../../packages/catalog-data/src/agents.ts";
import type { CaseProcessActivity, CaseProcessGraph, ProcessActor, ProcessRelationship } from "../process-model.ts";
import { case5 } from "./case-5-data.ts";
import { case5AuditSummary, case5EventAgentExecutions, case5EventAudits } from "./case-5-event-audits.ts";
import { case5EventBlueprints, case5Processes, case5RelationshipSpecs } from "./case-5-orchestration.ts";
import { datasetImpactForAgent } from "./case-2-event-audits.ts";

export { case5AuditSummary, case5EventAgentExecutions, case5EventAudits };

export const case5Actors: ProcessActor[] = [
  { id: "buyer", name: "Kenya Medical Supplies Authority · Ministry of Health", shortName: "Buyer / Procuring Entity", kind: "buyer", description: "Публикует RFP, оценивает bid, присуждает framework, выпускает call-offs и принимает service outcomes." },
  { id: "client", name: "FrostLink East Africa Ltd.", shortName: "Client / Service Provider", kind: "client", description: "Утверждает pursuit/BID, назначает carriers, подаёт proposal и отвечает за delivery performance." },
  { id: "tenderlab", name: "TenderLab.ai", shortName: "TenderLab / Backend", kind: "tenderlab", description: "Поддерживает Case graph, source/evidence state, Agent executions and Dataset lineage." },
  { id: "consultant", name: "TenderLab Consultant", shortName: "Consultant / Expert", kind: "consultant", description: "Проверяет framework route, evidence, service design and boundaries without replacing Actor authority." },
  { id: "external", name: "Six carriers, Global Fund, registries and portal", shortName: "External Parties", kind: "external", description: "Предоставляют consent, quotations, licences, operating evidence and official external states." },
];

const agentById = new Map(agents.map((agent) => [agent.id, agent]));

const activities: CaseProcessActivity[] = case5EventBlueprints.map((event) => {
  const executions = case5EventAgentExecutions.filter((item) => item.eventStep === event.step);
  const activeAgentNames = executions.filter((item) => item.activation !== "standby").map((item) => agentById.get(item.agentId)?.name).filter((name): name is string => Boolean(name));
  const standbyAgentNames = executions.filter((item) => item.activation === "standby").map((item) => agentById.get(item.agentId)?.name).filter((name): name is string => Boolean(name));
  return {
    id: `case5-activity-${String(event.step).padStart(2, "0")}`,
    eventId: `case5-event-${String(event.step).padStart(2, "0")}`,
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
  id: `case5-artifact-${String(activity.eventStep).padStart(2, "0")}`,
  producerRef: activity.id,
  producerKind: "event" as const,
  name: `Case 5 · E${String(activity.eventStep).padStart(2, "0")} output`,
  summary: activity.result,
  persistence: activity.eventStep === 20 ? "persistent" as const : "case-state" as const,
  version: `E${String(activity.eventStep).padStart(2, "0")}-V1`,
  terminal: activity.eventStep === 20,
}));

const processArtifactSeeds = [
  ["c5-artifact-p01-policy", "C5-P01", "Governance and evidence policy"],
  ["c5-artifact-p02-company", "C5-P02", "Verified company, capability and readiness baseline"],
  ["c5-artifact-p03-market", "C5-P03", "Market, award and Buyer intelligence dossier"],
  ["c5-artifact-p04-calendar", "C5-P04", "Current procurement calendar and Addendum register"],
  ["c5-artifact-p05-network", "C5-P05", "Approved subcontractor network assurance register"],
  ["c5-artifact-p06-sla", "C5-P06", "Framework call-off and live SLA control state"],
  ["c5-artifact-p07-learning", "C5-P07", "Award, call-off performance and architecture learning record"],
] as const;

const processArtifacts = processArtifactSeeds.map(([id, producerRef, name]) => ({
  id,
  producerRef,
  producerKind: "process" as const,
  name,
  summary: name,
  persistence: producerRef === "C5-P04" || producerRef === "C5-P06" ? "case-state" as const : "persistent" as const,
  version: "V1",
}));
const artifacts = [...eventArtifacts, ...processArtifacts];

const eventRelationships: ProcessRelationship[] = case5RelationshipSpecs.map((edge, index) => ({
  id: `case-5-event-edge-${String(index + 1).padStart(2, "0")}`,
  from: `case5-activity-${String(edge.from).padStart(2, "0")}`,
  to: `case5-activity-${String(edge.to).padStart(2, "0")}`,
  type: edge.type ?? "handoff",
  label: edge.label,
  artifactId: `case5-artifact-${String(edge.from).padStart(2, "0")}`,
  condition: edge.condition,
  blocking: edge.blocking,
  joinPolicy: edge.joinPolicy,
  provenance: "expert-proposed",
  validationStatus: "working",
}));

const processRelationships: ProcessRelationship[] = [
  { id: "case-5-process-edge-01", from: "C5-P01", to: "case5-activity-02", type: "handoff", label: "Policy + taxonomy", artifactId: "c5-artifact-p01-policy", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-5-process-edge-02", from: "C5-P02", to: "case5-activity-03", type: "handoff", label: "Verified bidder baseline", artifactId: "c5-artifact-p02-company", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-5-process-edge-03", from: "C5-P03", to: "case5-activity-12", type: "joins-at", label: "Market/rate/Buyer evidence", artifactId: "c5-artifact-p03-market", blocking: false, joinPolicy: "ALL", provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-5-process-edge-04", from: "case5-activity-01", to: "C5-P04", type: "triggered-by", label: "RFP calendar", artifactId: "case5-artifact-01", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-5-process-edge-05", from: "C5-P04", to: "case5-activity-04", type: "handoff", label: "Current RFP/Addendum state", artifactId: "c5-artifact-p04-calendar", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-5-process-edge-06", from: "C5-P05", to: "case5-activity-13", type: "joins-at", label: "Approved carrier network", artifactId: "c5-artifact-p05-network", blocking: true, joinPolicy: "ALL", provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-5-process-edge-07", from: "case5-activity-17", to: "C5-P06", type: "triggered-by", label: "Signed framework ready state", artifactId: "case5-artifact-17", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-5-process-edge-08", from: "C5-P06", to: "case5-activity-19", type: "handoff", label: "Authorised call-off + SLA clock", artifactId: "c5-artifact-p06-sla", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-5-process-edge-09", from: "case5-activity-20", to: "C5-P07", type: "handoff", label: "Accepted call-off outcome", artifactId: "case5-artifact-20", blocking: false, provenance: "expert-proposed", validationStatus: "working" },
];

const processAgentExecutions = case5Processes.flatMap((process) => process.agentIds.map((agentId) => {
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

export const case5ProcessGraph: CaseProcessGraph = {
  caseId: case5.id,
  version: "V1 · PERFORMANCE-BASED NON-CONSULTING SERVICES",
  actors: case5Actors,
  activities,
  processes: case5Processes,
  artifacts,
  relationships: [...eventRelationships, ...processRelationships],
  eventAudits: case5EventAudits,
  agentExecutions: case5EventAgentExecutions,
  processAgentExecutions,
  auditSummary: case5AuditSummary,
  orchestratorAgentIds: [1],
};

const nodeIds = new Set([...activities.map((item) => item.id), ...case5Processes.map((item) => item.id)]);
const artifactIds = new Set(artifacts.map((item) => item.id));
if (activities.length !== 20 || new Set(activities.map((item) => item.id)).size !== 20) throw new Error("Case 5 graph requires 20 unique Events.");
if (case5ProcessGraph.relationships.some((edge) => !nodeIds.has(edge.from) || !nodeIds.has(edge.to))) throw new Error("Every Case 5 relationship needs valid nodes.");
if (case5ProcessGraph.relationships.some((edge) => edge.artifactId && !artifactIds.has(edge.artifactId))) throw new Error("Every Case 5 relationship Artifact must exist.");
if (case5ProcessGraph.processAgentExecutions.some((item) => !item.input || !item.output || !item.handoff || !item.datasetImpact?.length)) throw new Error("Every Case 5 Process execution needs complete lineage.");
