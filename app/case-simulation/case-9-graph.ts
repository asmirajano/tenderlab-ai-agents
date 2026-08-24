import { agents } from "../../packages/catalog-data/src/agents.ts";
import type { CaseProcessActivity, CaseProcessGraph, ProcessActor, ProcessRelationship } from "../process-model.ts";
import { case9 } from "./case-9-data.ts";
import { case9AuditSummary, case9EventAgentExecutions, case9EventAudits } from "./case-9-event-audits.ts";
import { case9EventBlueprints, case9Processes, case9RelationshipSpecs } from "./case-9-orchestration.ts";
import { datasetImpactForAgent } from "./case-2-event-audits.ts";

export { case9AuditSummary, case9EventAgentExecutions, case9EventAudits };

export const case9Actors: ProcessActor[] = [
  { id: "buyer", name: "DEMO · Casablanca Metropolitan Water Authority", shortName: "Employer / Buyer", kind: "buyer", description: "Владеет contract, funding, payment and Employer decisions; не определяет claims вместо Engineer/DAB." },
  { id: "client", name: "IberAtlas Civil S.A.", shortName: "Contractor / Client", kind: "client", description: "Выполняет works, сохраняет records, утверждает notices/claims/referrals and signs Variation." },
  { id: "tenderlab", name: "TenderLab.ai", shortName: "TenderLab / Backend", kind: "tenderlab", description: "Поддерживает governed Case, evidence, Process state and canonical Agent executions." },
  { id: "consultant", name: "TenderLab Consultant", shortName: "Claims Consultant", kind: "consultant", description: "Организует claim/dispute evidence and controls; does not replace counsel, planner, Engineer or DAB." },
  { id: "engineer", name: "FIDIC Engineer", shortName: "Engineer / External Certifier", kind: "external", description: "Issues instructions, requests particulars, determines claim and certifies works within contract authority." },
  { id: "dispute-board", name: "Dispute Avoidance Board", shortName: "DAB / External Decision Body", kind: "external", description: "Independently decides the referred dispute; not a TenderLab Agent." },
  { id: "external", name: "Laboratory, surveyor and vendors", shortName: "External Specialists", kind: "external", description: "Provide site facts, tests, quotations and technical evidence without contractual authority." },
];

const agentById = new Map(agents.map((agent) => [agent.id, agent]));
const activities: CaseProcessActivity[] = case9EventBlueprints.map((event) => {
  const executions = case9EventAgentExecutions.filter((item) => item.eventStep === event.step);
  return {
    id: `case9-activity-${String(event.step).padStart(2, "0")}`, eventId: `case9-event-${String(event.step).padStart(2, "0")}`, eventStep: event.step,
    title: event.title, period: event.period, phase: event.phase, narrative: event.narrative, result: event.result, next: event.next, initiator: event.initiator,
    responsibleActorId: event.responsibleActorId, actorIds: event.actorIds,
    agentNames: executions.filter((item) => item.activation !== "standby").map((item) => agentById.get(item.agentId)?.name).filter((name): name is string => Boolean(name)),
    standbyAgentNames: executions.filter((item) => item.activation === "standby").map((item) => agentById.get(item.agentId)?.name).filter((name): name is string => Boolean(name)),
    kind: event.kind ?? "activity", state: "completed", stateLabel: event.kind === "decision" ? "GATE PASSED" : event.kind === "external-event" ? "EXTERNAL STATE" : "COMPLETED",
    trigger: event.trigger, startDay: event.startDay, endDay: event.endDay, layout: { column: event.column, lane: event.lane }, critical: Boolean(event.critical),
  };
});

const eventArtifacts = activities.map((activity) => ({
  id: `case9-artifact-${String(activity.eventStep).padStart(2, "0")}`, producerRef: activity.id, producerKind: "event" as const,
  name: `Case 9 · E${String(activity.eventStep).padStart(2, "0")} output`, summary: activity.result,
  persistence: activity.eventStep === 19 ? "persistent" as const : "case-state" as const, version: `E${String(activity.eventStep).padStart(2, "0")}-V1`, terminal: activity.eventStep === 19,
}));

const processArtifactSeeds = [
  ["c9-artifact-p01-governance", "C9-P01", "Governance, authority and evidence state"],
  ["c9-artifact-p02-contract", "C9-P02", "Effective contract baseline and change register"],
  ["c9-artifact-p03-clock", "C9-P03", "Claim notice, deadline and continuing-record register"],
  ["c9-artifact-p04-delay", "C9-P04", "Site, mitigation and delay evidence ledger"],
  ["c9-artifact-p05-quantum", "C9-P05", "Actual/forecast claim quantum ledger"],
  ["c9-artifact-p06-dispute", "C9-P06", "Claim, determination and dispute-state register"],
  ["c9-artifact-p07-payment", "C9-P07", "Variation execution, certification and payment state"],
  ["c9-artifact-p08-learning", "C9-P08", "Claim outcome and architecture learning record"],
] as const;
const processArtifacts = processArtifactSeeds.map(([id, producerRef, name]) => ({ id, producerRef, producerKind: "process" as const, name, summary: name, persistence: producerRef === "C9-P01" || producerRef === "C9-P08" ? "persistent" as const : "case-state" as const, version: "V1" }));
const artifacts = [...eventArtifacts, ...processArtifacts];

const eventRelationships: ProcessRelationship[] = case9RelationshipSpecs.map((edge, index) => ({
  id: `case-9-event-edge-${String(index + 1).padStart(2, "0")}`, from: `case9-activity-${String(edge.from).padStart(2, "0")}`, to: `case9-activity-${String(edge.to).padStart(2, "0")}`,
  type: edge.type ?? "handoff", label: edge.label, artifactId: `case9-artifact-${String(edge.from).padStart(2, "0")}`, condition: edge.condition, blocking: edge.blocking, joinPolicy: edge.joinPolicy,
  provenance: "expert-proposed", validationStatus: "working",
}));

const processRelationships: ProcessRelationship[] = [
  { id: "case-9-process-edge-01", from: "C9-P01", to: "case9-activity-02", type: "handoff", label: "Authority + evidence policy", artifactId: "c9-artifact-p01-governance", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-9-process-edge-02", from: "case9-activity-01", to: "C9-P02", type: "triggered-by", label: "Condition + instruction", artifactId: "case9-artifact-01", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-9-process-edge-03", from: "C9-P02", to: "case9-activity-04", type: "handoff", label: "Clause/change baseline", artifactId: "c9-artifact-p02-contract", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-9-process-edge-04", from: "case9-activity-01", to: "C9-P03", type: "triggered-by", label: "Claim clock start", artifactId: "case9-artifact-01", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-9-process-edge-05", from: "C9-P03", to: "case9-activity-10", type: "joins-at", label: "Day 71/84 + continuing records", artifactId: "c9-artifact-p03-clock", blocking: true, joinPolicy: "ALL", provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-9-process-edge-06", from: "case9-activity-01", to: "C9-P04", type: "triggered-by", label: "Site condition evidence", artifactId: "case9-artifact-01", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-9-process-edge-07", from: "C9-P04", to: "case9-activity-08", type: "joins-at", label: "Causation + fragnet evidence", artifactId: "c9-artifact-p04-delay", blocking: true, joinPolicy: "ALL", provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-9-process-edge-08", from: "case9-activity-05", to: "C9-P05", type: "triggered-by", label: "Changed scope + actual costs", artifactId: "case9-artifact-05", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-9-process-edge-09", from: "C9-P05", to: "case9-activity-08", type: "joins-at", label: "$8.70m quantum ledger", artifactId: "c9-artifact-p05-quantum", blocking: true, joinPolicy: "ALL", provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-9-process-edge-10", from: "case9-activity-08", to: "C9-P06", type: "triggered-by", label: "Submitted claim lifecycle", artifactId: "case9-artifact-08", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-9-process-edge-11", from: "C9-P06", to: "case9-activity-15", type: "handoff", label: "Disputed difference + referral state", artifactId: "c9-artifact-p06-dispute", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-9-process-edge-12", from: "case9-activity-17", to: "C9-P07", type: "triggered-by", label: "Effective Variation", artifactId: "case9-artifact-17", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-9-process-edge-13", from: "C9-P07", to: "case9-activity-19", type: "handoff", label: "Engineer certificate + payment state", artifactId: "c9-artifact-p07-payment", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-9-process-edge-14", from: "case9-activity-19", to: "C9-P08", type: "handoff", label: "Verified terminal outcome", artifactId: "case9-artifact-19", blocking: false, provenance: "expert-proposed", validationStatus: "working" },
];

const processAgentExecutions = case9Processes.flatMap((process) => process.agentIds.map((agentId) => {
  const agent = agentById.get(agentId);
  if (!agent) throw new Error(`Unknown Agent ${agentId} in ${process.id}.`);
  return { processId: process.id, agentId, role: agent.description, input: process.inputs.map((item) => item.name).join(" · "), output: process.outputArtifactIds.map((id) => artifacts.find((artifact) => artifact.id === id)?.name).filter(Boolean).join(" · "), handoff: process.consumerRefs.join(" · "), datasetImpact: datasetImpactForAgent(agentId), validationStatus: "working" as const };
}));

export const case9ProcessGraph: CaseProcessGraph = {
  caseId: case9.id, version: "V1 · FIDIC POST-AWARD CLAIM + DAB", actors: case9Actors, activities, processes: case9Processes, artifacts,
  relationships: [...eventRelationships, ...processRelationships], eventAudits: case9EventAudits, agentExecutions: case9EventAgentExecutions, processAgentExecutions,
  auditSummary: case9AuditSummary, orchestratorAgentIds: [1],
};

const nodeIds = new Set([...activities.map((item) => item.id), ...case9Processes.map((item) => item.id)]);
const artifactIds = new Set(artifacts.map((item) => item.id));
if (activities.length !== 19 || new Set(activities.map((item) => item.id)).size !== 19) throw new Error("Case 9 graph requires 19 unique Events.");
if (case9ProcessGraph.relationships.some((edge) => !nodeIds.has(edge.from) || !nodeIds.has(edge.to))) throw new Error("Every Case 9 relationship needs valid nodes.");
if (case9ProcessGraph.relationships.some((edge) => edge.artifactId && !artifactIds.has(edge.artifactId))) throw new Error("Every Case 9 relationship Artifact must exist.");
if (case9ProcessGraph.processAgentExecutions.some((item) => !item.input || !item.output || !item.handoff || !item.datasetImpact?.length)) throw new Error("Every Case 9 Process execution needs complete lineage.");
