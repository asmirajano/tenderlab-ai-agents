import { agents } from "../../packages/catalog-data/src/agents.ts";
import type { CaseProcessActivity, CaseProcessGraph, ProcessActor, ProcessRelationship } from "../process-model.ts";
import { case8 } from "./case-8-data.ts";
import { case8AuditSummary, case8EventAgentExecutions, case8EventAudits } from "./case-8-event-audits.ts";
import { case8EventBlueprints, case8Processes, case8RelationshipSpecs } from "./case-8-orchestration.ts";
import { datasetImpactForAgent } from "./case-2-event-audits.ts";

export { case8AuditSummary, case8EventAgentExecutions, case8EventAudits };

export const case8Actors: ProcessActor[] = [
  { id: "buyer", name: "Autoridad de Transporte Urbano de Lima y Callao", shortName: "Authority / Procuring Entity", kind: "buyer", description: "Owns RFQ/PQ, shortlist, dialogue, evaluation, concession award, CP satisfaction and Notice to Proceed." },
  { id: "client", name: "VoltAxis-led consortium / Project Company", shortName: "Client / Consortium", kind: "client", description: "Approves pursuit, member roles, equity, BAFO, negotiation limits, signing and financing actions." },
  { id: "tenderlab", name: "TenderLab.ai", shortName: "TenderLab / Backend", kind: "tenderlab", description: "Maintains Case graph, source/evidence state, Agent executions and Dataset lineage." },
  { id: "consultant", name: "TenderLab Consultant + accountable SMEs", shortName: "Consultant / Experts", kind: "consultant", description: "Tests consortium, dialogue, bankability and evidence without replacing legal, engineering, safeguards or corporate authority." },
  { id: "external", name: "Consortium members, OEMs, lenders, grid/land agencies and portal", shortName: "External Parties", kind: "external", description: "Provide consent, quotations, approvals, term sheets, permits, financing decisions and official external states." },
];

const agentById = new Map(agents.map((agent) => [agent.id, agent]));

const activities: CaseProcessActivity[] = case8EventBlueprints.map((event) => {
  const executions = case8EventAgentExecutions.filter((item) => item.eventStep === event.step);
  const activeAgentNames = executions.filter((item) => item.activation !== "standby").map((item) => agentById.get(item.agentId)?.name).filter((name): name is string => Boolean(name));
  const standbyAgentNames = executions.filter((item) => item.activation === "standby").map((item) => agentById.get(item.agentId)?.name).filter((name): name is string => Boolean(name));
  return {
    id: `case8-activity-${String(event.step).padStart(2, "0")}`,
    eventId: `case8-event-${String(event.step).padStart(2, "0")}`,
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
  id: `case8-artifact-${String(activity.eventStep).padStart(2, "0")}`,
  producerRef: activity.id,
  producerKind: "event" as const,
  name: `Case 8 · E${String(activity.eventStep).padStart(2, "0")} output`,
  summary: activity.result,
  persistence: activity.eventStep === 22 ? "persistent" as const : "case-state" as const,
  version: `E${String(activity.eventStep).padStart(2, "0")}-V1`,
  terminal: activity.eventStep === 22,
}));

const processArtifactSeeds = [
  ["c8-artifact-p01-governance", "C8-P01", "Governance, evidence and Case-state baseline"],
  ["c8-artifact-p02-sponsor", "C8-P02", "Verified sponsor capability and readiness baseline"],
  ["c8-artifact-p03-market", "C8-P03", "PPP market, award, Buyer and competitor dossier"],
  ["c8-artifact-p04-procurement-state", "C8-P04", "Current data-room, RFP, amendment and deadline state"],
  ["c8-artifact-p05-consortium", "C8-P05", "Approved consortium consent, capability and governance register"],
  ["c8-artifact-p06-bankability", "C8-P06", "Bankability, pricing, risk and lender-condition register"],
  ["c8-artifact-p07-dialogue", "C8-P07", "Dialogue and negotiation position register"],
  ["c8-artifact-p08-learning", "C8-P08", "PPP outcome and architecture learning record"],
] as const;

const processArtifacts = processArtifactSeeds.map(([id, producerRef, name]) => ({
  id,
  producerRef,
  producerKind: "process" as const,
  name,
  summary: name,
  persistence: producerRef === "C8-P04" || producerRef === "C8-P06" || producerRef === "C8-P07" ? "case-state" as const : "persistent" as const,
  version: "V1",
}));
const artifacts = [...eventArtifacts, ...processArtifacts];

const eventRelationships: ProcessRelationship[] = case8RelationshipSpecs.map((edge, index) => ({
  id: `case-8-event-edge-${String(index + 1).padStart(2, "0")}`,
  from: `case8-activity-${String(edge.from).padStart(2, "0")}`,
  to: `case8-activity-${String(edge.to).padStart(2, "0")}`,
  type: edge.type ?? "handoff",
  label: edge.label,
  artifactId: `case8-artifact-${String(edge.from).padStart(2, "0")}`,
  condition: edge.condition,
  blocking: edge.blocking,
  joinPolicy: edge.joinPolicy,
  provenance: "expert-proposed",
  validationStatus: "working",
}));

const processRelationships: ProcessRelationship[] = [
  { id: "case-8-process-edge-01", from: "C8-P01", to: "case8-activity-02", type: "handoff", label: "Governance + evidence policy", artifactId: "c8-artifact-p01-governance", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-8-process-edge-02", from: "C8-P02", to: "case8-activity-03", type: "handoff", label: "Verified sponsor baseline", artifactId: "c8-artifact-p02-sponsor", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-8-process-edge-03", from: "C8-P03", to: "case8-activity-16", type: "joins-at", label: "PPP market/Buyer/competitor evidence", artifactId: "c8-artifact-p03-market", blocking: false, joinPolicy: "ALL", provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-8-process-edge-04", from: "case8-activity-01", to: "C8-P04", type: "triggered-by", label: "Official procurement state", artifactId: "case8-artifact-01", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-8-process-edge-05", from: "C8-P04", to: "case8-activity-15", type: "handoff", label: "Current RFP/change/calendar state", artifactId: "c8-artifact-p04-procurement-state", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-8-process-edge-06", from: "case8-activity-06", to: "C8-P05", type: "triggered-by", label: "Proposed member/governance route", artifactId: "case8-artifact-06", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-8-process-edge-07", from: "C8-P05", to: "case8-activity-21", type: "joins-at", label: "Approved consortium/shareholder baseline", artifactId: "c8-artifact-p05-consortium", blocking: true, joinPolicy: "ALL", provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-8-process-edge-08", from: "case8-activity-12", to: "C8-P06", type: "triggered-by", label: "Current bankability model", artifactId: "case8-artifact-12", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-8-process-edge-09", from: "C8-P06", to: "case8-activity-22", type: "handoff", label: "CP and lender-condition evidence", artifactId: "c8-artifact-p06-bankability", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-8-process-edge-10", from: "case8-activity-10", to: "C8-P07", type: "triggered-by", label: "Dialogue issue register", artifactId: "case8-artifact-10", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-8-process-edge-11", from: "C8-P07", to: "case8-activity-21", type: "handoff", label: "Approved negotiation positions", artifactId: "c8-artifact-p07-dialogue", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-8-process-edge-12", from: "case8-activity-22", to: "C8-P08", type: "handoff", label: "Financial-close outcome", artifactId: "case8-artifact-22", blocking: false, provenance: "expert-proposed", validationStatus: "working" },
];

const processAgentExecutions = case8Processes.flatMap((process) => process.agentIds.map((agentId) => {
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

export const case8ProcessGraph: CaseProcessGraph = {
  caseId: case8.id,
  version: "V1 · PPP COMPETITIVE DIALOGUE + FINANCIAL CLOSE",
  actors: case8Actors,
  activities,
  processes: case8Processes,
  artifacts,
  relationships: [...eventRelationships, ...processRelationships],
  eventAudits: case8EventAudits,
  agentExecutions: case8EventAgentExecutions,
  processAgentExecutions,
  auditSummary: case8AuditSummary,
  orchestratorAgentIds: [1],
};

const nodeIds = new Set([...activities.map((item) => item.id), ...case8Processes.map((item) => item.id)]);
const artifactIds = new Set(artifacts.map((item) => item.id));
if (activities.length !== 22 || new Set(activities.map((item) => item.id)).size !== 22) throw new Error("Case 8 graph requires 22 unique Events.");
if (case8ProcessGraph.relationships.some((edge) => !nodeIds.has(edge.from) || !nodeIds.has(edge.to))) throw new Error("Every Case 8 relationship needs valid nodes.");
if (case8ProcessGraph.relationships.some((edge) => edge.artifactId && !artifactIds.has(edge.artifactId))) throw new Error("Every Case 8 relationship Artifact must exist.");
if (case8ProcessGraph.processAgentExecutions.some((item) => !item.input || !item.output || !item.handoff || !item.datasetImpact?.length)) throw new Error("Every Case 8 Process execution needs complete lineage.");
