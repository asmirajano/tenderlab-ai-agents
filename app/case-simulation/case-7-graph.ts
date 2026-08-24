import { agents } from "../../packages/catalog-data/src/agents.ts";
import type { CaseProcessActivity, CaseProcessGraph, ProcessActor, ProcessRelationship } from "../process-model.ts";
import { case7 } from "./case-7-data.ts";
import { case7AuditSummary, case7EventAgentExecutions, case7EventAudits } from "./case-7-event-audits.ts";
import { case7EventBlueprints, case7Processes, case7RelationshipSpecs } from "./case-7-orchestration.ts";
import { datasetImpactForAgent } from "./case-2-event-audits.ts";

export { case7AuditSummary, case7EventAgentExecutions, case7EventAudits };

export const case7Actors: ProcessActor[] = [
  { id: "buyer", name: "Department of Social Welfare and Development · Procurement Service", shortName: "Buyer / Procurement Client", kind: "buyer", description: "Owns emergency need, procedure, evaluation, termination, award, acceptance and public-payment authority." },
  { id: "tenderlab", name: "TenderLab.ai", shortName: "TenderLab / Backend", kind: "tenderlab", description: "Maintains governed Case graph, source/evidence state, Agent executions and Dataset lineage." },
  { id: "consultant", name: "TenderLab Procurement Recovery Consultant", shortName: "Consultant / Independent Adviser", kind: "consultant", description: "Assures remedy, sourcing, evaluation and handoffs without exercising Buyer or supplier authority." },
  { id: "external", name: "Incumbent, five invitees, EcoShelter Asia, laboratories, bank and ADB", shortName: "External Parties", kind: "external", description: "Provide tests, offers, securities, delivery and other independently controlled external states." },
];

const agentById = new Map(agents.map((agent) => [agent.id, agent]));

const activities: CaseProcessActivity[] = case7EventBlueprints.map((event) => {
  const executions = case7EventAgentExecutions.filter((item) => item.eventStep === event.step);
  const activeAgentNames = executions.filter((item) => item.activation !== "standby").map((item) => agentById.get(item.agentId)?.name).filter((name): name is string => Boolean(name));
  const standbyAgentNames = executions.filter((item) => item.activation === "standby").map((item) => agentById.get(item.agentId)?.name).filter((name): name is string => Boolean(name));
  return {
    id: `case7-activity-${String(event.step).padStart(2, "0")}`,
    eventId: `case7-event-${String(event.step).padStart(2, "0")}`,
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
  id: `case7-artifact-${String(activity.eventStep).padStart(2, "0")}`,
  producerRef: activity.id,
  producerKind: "event" as const,
  name: `Case 7 · E${String(activity.eventStep).padStart(2, "0")} output`,
  summary: activity.result,
  persistence: activity.eventStep === 19 ? "persistent" as const : "case-state" as const,
  version: `E${String(activity.eventStep).padStart(2, "0")}-V1`,
  terminal: activity.eventStep === 19,
}));

const processArtifactSeeds = [
  ["c7-artifact-p01-governance", "C7-P01", "Governance, authority and evidence baseline"],
  ["c7-artifact-p02-remedy", "C7-P02", "Original-contract remedy and open security-claim register"],
  ["c7-artifact-p03-market", "C7-P03", "Emergency supplier and market intelligence brief"],
  ["c7-artifact-p04-rfq-state", "C7-P04", "Current RFQ communication, deadline and Corrigendum state"],
  ["c7-artifact-p05-evaluation", "C7-P05", "Supplier due-diligence and offer-evaluation evidence pack"],
  ["c7-artifact-p06-delivery", "C7-P06", "Replacement delivery, inspection and acceptance state"],
  ["c7-artifact-p07-learning", "C7-P07", "Recovery outcome and architecture-learning record"],
] as const;

const processArtifacts = processArtifactSeeds.map(([id, producerRef, name]) => ({
  id,
  producerRef,
  producerKind: "process" as const,
  name,
  summary: name,
  persistence: producerRef === "C7-P02" || producerRef === "C7-P04" || producerRef === "C7-P06" ? "case-state" as const : "persistent" as const,
  version: "V1",
}));
const artifacts = [...eventArtifacts, ...processArtifacts];

const eventRelationships: ProcessRelationship[] = case7RelationshipSpecs.map((edge, index) => ({
  id: `case-7-event-edge-${String(index + 1).padStart(2, "0")}`,
  from: `case7-activity-${String(edge.from).padStart(2, "0")}`,
  to: `case7-activity-${String(edge.to).padStart(2, "0")}`,
  type: edge.type ?? "handoff",
  label: edge.label,
  artifactId: `case7-artifact-${String(edge.from).padStart(2, "0")}`,
  condition: edge.condition,
  blocking: edge.blocking,
  joinPolicy: edge.joinPolicy,
  provenance: "expert-proposed",
  validationStatus: "working",
}));

const processRelationships: ProcessRelationship[] = [
  { id: "case-7-process-edge-01", from: "C7-P01", to: "case7-activity-02", type: "handoff", label: "Authority + evidence policy", artifactId: "c7-artifact-p01-governance", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-7-process-edge-02", from: "case7-activity-01", to: "C7-P02", type: "triggered-by", label: "Material default dossier", artifactId: "case7-artifact-01", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-7-process-edge-03", from: "C7-P02", to: "case7-activity-05", type: "joins-at", label: "Remedy options", artifactId: "c7-artifact-p02-remedy", blocking: true, joinPolicy: "ALL", provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-7-process-edge-04", from: "C7-P03", to: "case7-activity-06", type: "handoff", label: "Capacity + supplier evidence", artifactId: "c7-artifact-p03-market", blocking: false, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-7-process-edge-05", from: "case7-activity-08", to: "C7-P04", type: "triggered-by", label: "Issued RFQ", artifactId: "case7-artifact-08", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-7-process-edge-06", from: "C7-P04", to: "case7-activity-10", type: "handoff", label: "Current equal-information RFQ state", artifactId: "c7-artifact-p04-rfq-state", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-7-process-edge-07", from: "case7-activity-10", to: "C7-P05", type: "triggered-by", label: "Frozen offer set", artifactId: "case7-artifact-10", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-7-process-edge-08", from: "C7-P05", to: "case7-activity-12", type: "joins-at", label: "Evaluation evidence pack", artifactId: "c7-artifact-p05-evaluation", blocking: true, joinPolicy: "ALL", provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-7-process-edge-09", from: "case7-activity-14", to: "C7-P06", type: "triggered-by", label: "Effective replacement contract", artifactId: "case7-artifact-14", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-7-process-edge-10", from: "C7-P06", to: "case7-activity-17", type: "joins-at", label: "Delivery + inspection control state", artifactId: "c7-artifact-p06-delivery", blocking: true, joinPolicy: "ALL", provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-7-process-edge-11", from: "case7-activity-19", to: "C7-P07", type: "handoff", label: "Verified recovery outcome", artifactId: "case7-artifact-19", blocking: false, provenance: "expert-proposed", validationStatus: "working" },
];

const processAgentExecutions = case7Processes.flatMap((process) => process.agentIds.map((agentId) => {
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

export const case7ProcessGraph: CaseProcessGraph = {
  caseId: case7.id,
  version: "V1 · BUYER-SIDE EMERGENCY PROCUREMENT RECOVERY",
  actors: case7Actors,
  activities,
  processes: case7Processes,
  artifacts,
  relationships: [...eventRelationships, ...processRelationships],
  eventAudits: case7EventAudits,
  agentExecutions: case7EventAgentExecutions,
  processAgentExecutions,
  auditSummary: case7AuditSummary,
  orchestratorAgentIds: [1],
};

const nodeIds = new Set([...activities.map((item) => item.id), ...case7Processes.map((item) => item.id)]);
const artifactIds = new Set(artifacts.map((item) => item.id));
if (activities.length !== 19 || new Set(activities.map((item) => item.id)).size !== 19) throw new Error("Case 7 graph requires 19 unique Events.");
if (case7ProcessGraph.relationships.some((edge) => !nodeIds.has(edge.from) || !nodeIds.has(edge.to))) throw new Error("Every Case 7 relationship needs valid nodes.");
if (case7ProcessGraph.relationships.some((edge) => edge.artifactId && !artifactIds.has(edge.artifactId))) throw new Error("Every Case 7 relationship Artifact must exist.");
if (case7ProcessGraph.processAgentExecutions.some((item) => !item.input || !item.output || !item.handoff || !item.datasetImpact?.length)) throw new Error("Every Case 7 Process execution needs complete lineage.");
