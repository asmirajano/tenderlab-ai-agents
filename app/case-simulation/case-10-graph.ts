import { agents } from "../../packages/catalog-data/src/agents.ts";
import type { CaseProcessActivity, CaseProcessGraph, ProcessActor, ProcessRelationship } from "../process-model.ts";
import { case10 } from "./case-10-data.ts";
import { case10AuditSummary, case10EventAgentExecutions, case10EventAudits } from "./case-10-event-audits.ts";
import { case10EventBlueprints, case10Processes, case10RelationshipSpecs } from "./case-10-orchestration.ts";
import { datasetImpactForAgent } from "./case-2-event-audits.ts";

export { case10AuditSummary, case10EventAgentExecutions, case10EventAudits };

export const case10Actors: ProcessActor[] = [
  { id: "buyer", name: "DEMO · Moldova National Cyber Resilience Office", shortName: "Buyer / Contracting Authority", kind: "buyer", description: "Publishes and cancels the tender, answers clarifications and owns procurement authority." },
  { id: "client", name: "SentinelGrid Oy", shortName: "Prospective Bidder / Client", kind: "client", description: "Owns private evidence, partner/outreach authority and the final Bid / No-Bid decision." },
  { id: "tenderlab", name: "TenderLab.ai", shortName: "TenderLab / Backend", kind: "tenderlab", description: "Maintains source, evidence, Case state, canonical Agent executions and branch controls." },
  { id: "consultant", name: "TenderLab Consultant", shortName: "Risk & Bid Adviser", kind: "consultant", description: "Coordinates diligence and decision evidence without investigating, accusing, selecting or submitting for Actors." },
  { id: "external", name: "Local operators, registries and programme integrity office", shortName: "External Evidence / Authority", kind: "external", description: "Supply consented evidence or external decisions; remain outside TenderLab authority." },
];

const agentById = new Map(agents.map((agent) => [agent.id, agent]));
const activities: CaseProcessActivity[] = case10EventBlueprints.map((event) => {
  const executions = case10EventAgentExecutions.filter((item) => item.eventStep === event.step);
  return {
    id: `case10-activity-${String(event.step).padStart(2, "0")}`, eventId: `case10-event-${String(event.step).padStart(2, "0")}`, eventStep: event.step,
    title: event.title, period: event.period, phase: event.phase, narrative: event.narrative, result: event.result, next: event.next, initiator: event.initiator,
    responsibleActorId: event.responsibleActorId, actorIds: event.actorIds,
    agentNames: executions.filter((item) => item.activation !== "standby").map((item) => agentById.get(item.agentId)?.name).filter((name): name is string => Boolean(name)),
    standbyAgentNames: executions.filter((item) => item.activation === "standby").map((item) => agentById.get(item.agentId)?.name).filter((name): name is string => Boolean(name)),
    kind: event.kind ?? "activity", state: "completed", stateLabel: event.kind === "decision" ? "GATE PASSED" : event.kind === "external-event" ? "EXTERNAL STATE" : "COMPLETED",
    trigger: event.trigger, startDay: event.startDay, endDay: event.endDay, layout: { column: event.column, lane: event.lane }, critical: Boolean(event.critical),
  };
});

const eventArtifacts = activities.map((activity) => ({
  id: `case10-artifact-${String(activity.eventStep).padStart(2, "0")}`, producerRef: activity.id, producerKind: "event" as const,
  name: `Case 10 · E${String(activity.eventStep).padStart(2, "0")} output`, summary: activity.result,
  persistence: activity.eventStep === 19 ? "persistent" as const : "case-state" as const, version: `E${String(activity.eventStep).padStart(2, "0")}-V1`, terminal: activity.eventStep === 19,
}));

const processArtifactSeeds = [
  ["c10-artifact-p01-governance", "C10-P01", "Governance, authority, provenance and stop state"],
  ["c10-artifact-p02-source", "C10-P02", "Typed bilingual source, deadline and change lifecycle"],
  ["c10-artifact-p03-intelligence", "C10-P03", "Market, award, Buyer and relationship intelligence"],
  ["c10-artifact-p04-company", "C10-P04", "Verified company, credentials and readiness baseline"],
  ["c10-artifact-p05-partner", "C10-P05", "Consented partner capability and verification ledger"],
  ["c10-artifact-p06-decision-inputs", "C10-P06", "Fit, feasibility, economics, integrity and legal decision inputs"],
  ["c10-artifact-p07-stop", "C10-P07", "Signed No-Bid and frozen downstream branch state"],
  ["c10-artifact-p08-learning", "C10-P08", "Privacy-safe outcome learning and reissue watch"],
] as const;
const processArtifacts = processArtifactSeeds.map(([id, producerRef, name]) => ({ id, producerRef, producerKind: "process" as const, name, summary: name, persistence: ["C10-P01", "C10-P02", "C10-P03", "C10-P08"].includes(producerRef) ? "persistent" as const : "case-state" as const, version: "V1" }));
const artifacts = [...eventArtifacts, ...processArtifacts];

const eventRelationships: ProcessRelationship[] = case10RelationshipSpecs.map((edge, index) => ({
  id: `case-10-event-edge-${String(index + 1).padStart(2, "0")}`, from: `case10-activity-${String(edge.from).padStart(2, "0")}`, to: `case10-activity-${String(edge.to).padStart(2, "0")}`,
  type: edge.type ?? "handoff", label: edge.label, artifactId: `case10-artifact-${String(edge.from).padStart(2, "0")}`, condition: edge.condition, blocking: edge.blocking, joinPolicy: edge.joinPolicy,
  provenance: "expert-proposed", validationStatus: "working",
}));

const processRelationships: ProcessRelationship[] = [
  { id: "case-10-process-edge-01", from: "C10-P01", to: "case10-activity-05", type: "handoff", label: "Authority policy", artifactId: "c10-artifact-p01-governance", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-10-process-edge-02", from: "case10-activity-01", to: "C10-P02", type: "triggered-by", label: "Public source signal", artifactId: "case10-artifact-01", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-10-process-edge-03", from: "C10-P02", to: "case10-activity-03", type: "handoff", label: "Bilingual source corpus", artifactId: "c10-artifact-p02-source", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-10-process-edge-04", from: "case10-activity-02", to: "C10-P03", type: "triggered-by", label: "Award evidence", artifactId: "case10-artifact-02", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-10-process-edge-05", from: "C10-P03", to: "case10-activity-09", type: "handoff", label: "Partner/market hypothesis", artifactId: "c10-artifact-p03-intelligence", blocking: false, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-10-process-edge-06", from: "case10-activity-05", to: "C10-P04", type: "triggered-by", label: "Private evidence mandate", artifactId: "case10-artifact-05", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-10-process-edge-07", from: "C10-P04", to: "case10-activity-08", type: "handoff", label: "Verified company", artifactId: "c10-artifact-p04-company", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-10-process-edge-08", from: "case10-activity-08", to: "C10-P05", type: "triggered-by", label: "Partner gap", artifactId: "case10-artifact-08", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-10-process-edge-09", from: "C10-P05", to: "case10-activity-11", type: "handoff", label: "Consented partner evidence", artifactId: "c10-artifact-p05-partner", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-10-process-edge-10", from: "case10-activity-11", to: "C10-P06", type: "triggered-by", label: "High-risk evidence", artifactId: "case10-artifact-11", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-10-process-edge-11", from: "C10-P06", to: "case10-activity-16", type: "joins-at", label: "Separate decision dimensions", artifactId: "c10-artifact-p06-decision-inputs", blocking: true, joinPolicy: "ALL", provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-10-process-edge-12", from: "case10-activity-16", to: "C10-P07", type: "triggered-by", label: "Board No-Bid", artifactId: "case10-artifact-16", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-10-process-edge-13", from: "C10-P07", to: "case10-activity-19", type: "joins-at", label: "Frozen branch", artifactId: "c10-artifact-p07-stop", blocking: true, joinPolicy: "ALL", provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-10-process-edge-14", from: "case10-activity-19", to: "C10-P08", type: "handoff", label: "Verified terminal outcome", artifactId: "case10-artifact-19", blocking: false, provenance: "expert-proposed", validationStatus: "working" },
];

const processAgentExecutions = case10Processes.flatMap((process) => process.agentIds.map((agentId) => {
  const agent = agentById.get(agentId);
  if (!agent) throw new Error(`Unknown Agent ${agentId} in ${process.id}.`);
  return { processId: process.id, agentId, role: agent.description, input: process.inputs.map((item) => item.name).join(" · "), output: process.outputArtifactIds.map((id) => artifacts.find((artifact) => artifact.id === id)?.name).filter(Boolean).join(" · "), handoff: process.consumerRefs.join(" · "), datasetImpact: datasetImpactForAgent(agentId), validationStatus: "working" as const };
}));

export const case10ProcessGraph: CaseProcessGraph = {
  caseId: case10.id, version: "V1 · FINAL PROGRAM · INTEGRITY NO-BID + CANCELLATION", actors: case10Actors, activities, processes: case10Processes, artifacts,
  relationships: [...eventRelationships, ...processRelationships], eventAudits: case10EventAudits, agentExecutions: case10EventAgentExecutions, processAgentExecutions,
  auditSummary: case10AuditSummary, orchestratorAgentIds: [1],
};

const nodeIds = new Set([...activities.map((item) => item.id), ...case10Processes.map((item) => item.id)]);
const artifactIds = new Set(artifacts.map((item) => item.id));
if (activities.length !== 19 || new Set(activities.map((item) => item.id)).size !== 19) throw new Error("Case 10 graph requires 19 unique Events.");
if (case10ProcessGraph.relationships.some((edge) => !nodeIds.has(edge.from) || !nodeIds.has(edge.to))) throw new Error("Every Case 10 relationship needs valid nodes.");
if (case10ProcessGraph.relationships.some((edge) => edge.artifactId && !artifactIds.has(edge.artifactId))) throw new Error("Every Case 10 relationship Artifact must exist.");
if (case10ProcessGraph.processAgentExecutions.some((item) => !item.input || !item.output || !item.handoff || !item.datasetImpact?.length)) throw new Error("Every Case 10 Process execution needs complete lineage.");
