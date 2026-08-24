import { agents } from "../../packages/catalog-data/src/agents.ts";
import type { CaseProcessActivity, CaseProcessGraph, ProcessActor, ProcessRelationship } from "../process-model.ts";
import { case6 } from "./case-6-data.ts";
import { case6AuditSummary, case6EventAgentExecutions, case6EventAudits } from "./case-6-event-audits.ts";
import { case6EventBlueprints, case6Processes, case6RelationshipSpecs } from "./case-6-orchestration.ts";
import { datasetImpactForAgent } from "./case-2-event-audits.ts";

export { case6AuditSummary, case6EventAgentExecutions, case6EventAudits };

export const case6Actors: ProcessActor[] = [
  { id: "buyer", name: "DEMO · Bahia Agricultural Inputs Agency", shortName: "Buyer / Procuring Entity", kind: "buyer", description: "Публикует tender, управляет auction, evaluation, provisional/final award и contract." },
  { id: "client", name: "AtlasAgri Commodities DMCC", shortName: "Client / Commodity Trader", kind: "client", description: "Предоставляет evidence, утверждает suppliers, BID, auction floor, complaint, signature и price actions." },
  { id: "tenderlab", name: "TenderLab.ai", shortName: "TenderLab / Backend", kind: "tenderlab", description: "Поддерживает source/evidence/Case state и выполняет canonical Agents без human authority." },
  { id: "consultant", name: "TenderLab Consultant", shortName: "Consultant / Expert", kind: "consultant", description: "Проверяет evidence, economics, legal boundaries и handoffs; не делает bids или legal filings." },
  { id: "external", name: "OEM, importer, registries and portal", shortName: "External Parties", kind: "external", description: "Поставляют product, authorization, quotes, registrations и official source state." },
  { id: "review-body", name: "DEMO · Bahia Administrative Review Body", shortName: "Complaint / Review Body", kind: "external", description: "Независимо рассматривает complaint и определяет remedy; не является TenderLab Agent." },
];

const agentById = new Map(agents.map((agent) => [agent.id, agent]));
const activities: CaseProcessActivity[] = case6EventBlueprints.map((event) => {
  const executions = case6EventAgentExecutions.filter((item) => item.eventStep === event.step);
  const activeAgentNames = executions.filter((item) => item.activation !== "standby").map((item) => agentById.get(item.agentId)?.name).filter((name): name is string => Boolean(name));
  const standbyAgentNames = executions.filter((item) => item.activation === "standby").map((item) => agentById.get(item.agentId)?.name).filter((name): name is string => Boolean(name));
  return {
    id: `case6-activity-${String(event.step).padStart(2, "0")}`,
    eventId: `case6-event-${String(event.step).padStart(2, "0")}`,
    eventStep: event.step, title: event.title, period: event.period, phase: event.phase, narrative: event.narrative, result: event.result, next: event.next,
    initiator: event.initiator, responsibleActorId: event.responsibleActorId, actorIds: event.actorIds, agentNames: activeAgentNames, standbyAgentNames,
    kind: event.kind ?? "activity", state: "completed", stateLabel: event.kind === "decision" ? "GATE PASSED" : event.kind === "external-event" ? "EXTERNAL STATE" : "COMPLETED",
    trigger: event.trigger, startDay: event.startDay, endDay: event.endDay, layout: { column: event.column, lane: event.lane }, critical: Boolean(event.critical),
  };
});

const eventArtifacts = activities.map((activity) => ({
  id: `case6-artifact-${String(activity.eventStep).padStart(2, "0")}`, producerRef: activity.id, producerKind: "event" as const,
  name: `Case 6 · E${String(activity.eventStep).padStart(2, "0")} output`, summary: activity.result,
  persistence: activity.eventStep === 22 ? "persistent" as const : "case-state" as const, version: `E${String(activity.eventStep).padStart(2, "0")}-V1`, terminal: activity.eventStep === 22,
}));

const processArtifactSeeds = [
  ["c6-artifact-p01-policy", "C6-P01", "Governance and evidence policy"],
  ["c6-artifact-p02-company", "C6-P02", "Verified trader and supplier capability baseline"],
  ["c6-artifact-p03-source", "C6-P03", "Linked notice, award, review and contract records"],
  ["c6-artifact-p04-calendar", "C6-P04", "Current deadline, auction, standstill and amendment register"],
  ["c6-artifact-p05-corpus", "C6-P05", "Portuguese source-locked tender and rule model"],
  ["c6-artifact-p06-supply", "C6-P06", "Verified OEM/importer route and quote register"],
  ["c6-artifact-p07-market", "C6-P07", "Market, Buyer, competitor and auction intelligence dossier"],
  ["c6-artifact-p08-remedy", "C6-P08", "Complaint evidence, filing and remedy-state register"],
  ["c6-artifact-p09-learning", "C6-P09", "Auction, complaint, award and architecture learning record"],
] as const;

const processArtifacts = processArtifactSeeds.map(([id, producerRef, name]) => ({ id, producerRef, producerKind: "process" as const, name, summary: name, persistence: ["C6-P04", "C6-P05", "C6-P06", "C6-P08"].includes(producerRef) ? "case-state" as const : "persistent" as const, version: "V1" }));
const artifacts = [...eventArtifacts, ...processArtifacts];

const eventRelationships: ProcessRelationship[] = case6RelationshipSpecs.map((edge, index) => ({
  id: `case-6-event-edge-${String(index + 1).padStart(2, "0")}`, from: `case6-activity-${String(edge.from).padStart(2, "0")}`, to: `case6-activity-${String(edge.to).padStart(2, "0")}`,
  type: edge.type ?? "handoff", label: edge.label, artifactId: `case6-artifact-${String(edge.from).padStart(2, "0")}`, condition: edge.condition, blocking: edge.blocking, joinPolicy: edge.joinPolicy,
  provenance: "expert-proposed", validationStatus: "working",
}));

const processRelationships: ProcessRelationship[] = [
  { id: "case-6-process-edge-01", from: "C6-P01", to: "case6-activity-02", type: "handoff", label: "Policy + taxonomy", artifactId: "c6-artifact-p01-policy", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-6-process-edge-02", from: "C6-P02", to: "case6-activity-03", type: "handoff", label: "Public trader baseline", artifactId: "c6-artifact-p02-company", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-6-process-edge-03", from: "case6-activity-01", to: "C6-P03", type: "triggered-by", label: "Official publication", artifactId: "case6-artifact-01", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-6-process-edge-04", from: "C6-P03", to: "case6-activity-02", type: "handoff", label: "Normalized notice record", artifactId: "c6-artifact-p03-source", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-6-process-edge-05", from: "case6-activity-01", to: "C6-P04", type: "triggered-by", label: "Procurement calendar", artifactId: "case6-artifact-01", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-6-process-edge-06", from: "C6-P04", to: "case6-activity-18", type: "handoff", label: "Active standstill and filing deadline", artifactId: "c6-artifact-p04-calendar", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-6-process-edge-07", from: "C6-P03", to: "C6-P05", type: "handoff", label: "Versioned source package", artifactId: "c6-artifact-p03-source", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-6-process-edge-08", from: "C6-P05", to: "case6-activity-05", type: "joins-at", label: "Qualification and auction model", artifactId: "c6-artifact-p05-corpus", blocking: true, joinPolicy: "ALL", provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-6-process-edge-09", from: "C6-P06", to: "case6-activity-10", type: "joins-at", label: "Verified supply route + quotes", artifactId: "c6-artifact-p06-supply", blocking: true, joinPolicy: "ALL", provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-6-process-edge-10", from: "C6-P07", to: "case6-activity-10", type: "joins-at", label: "Market and competitor corridor", artifactId: "c6-artifact-p07-market", blocking: true, joinPolicy: "ALL", provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-6-process-edge-11", from: "case6-activity-16", to: "C6-P08", type: "triggered-by", label: "Material award anomaly", artifactId: "case6-artifact-16", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-6-process-edge-12", from: "C6-P08", to: "case6-activity-18", type: "handoff", label: "Grounds, standing and evidence bundle", artifactId: "c6-artifact-p08-remedy", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-6-process-edge-13", from: "case6-activity-22", to: "C6-P09", type: "handoff", label: "Contract and remedy outcome", artifactId: "case6-artifact-22", blocking: false, provenance: "expert-proposed", validationStatus: "working" },
];

const processAgentExecutions = case6Processes.flatMap((process) => process.agentIds.map((agentId) => {
  const agent = agentById.get(agentId);
  if (!agent) throw new Error(`Unknown Agent ${agentId} in ${process.id}.`);
  return { processId: process.id, agentId, role: agent.description, input: process.inputs.map((item) => item.name).join(" · "), output: process.outputArtifactIds.map((id) => artifacts.find((artifact) => artifact.id === id)?.name).filter(Boolean).join(" · "), handoff: process.consumerRefs.join(" · "), datasetImpact: datasetImpactForAgent(agentId), validationStatus: "working" as const };
}));

export const case6ProcessGraph: CaseProcessGraph = {
  caseId: case6.id, version: "V1 · REVERSE AUCTION + ADMINISTRATIVE REMEDY", actors: case6Actors, activities, processes: case6Processes, artifacts,
  relationships: [...eventRelationships, ...processRelationships], eventAudits: case6EventAudits, agentExecutions: case6EventAgentExecutions, processAgentExecutions,
  auditSummary: case6AuditSummary, orchestratorAgentIds: [1],
};

const nodeIds = new Set([...activities.map((item) => item.id), ...case6Processes.map((item) => item.id)]);
const artifactIds = new Set(artifacts.map((item) => item.id));
if (activities.length !== 22 || new Set(activities.map((item) => item.id)).size !== 22) throw new Error("Case 6 graph requires 22 unique Events.");
if (case6ProcessGraph.relationships.some((edge) => !nodeIds.has(edge.from) || !nodeIds.has(edge.to))) throw new Error("Every Case 6 relationship needs valid nodes.");
if (case6ProcessGraph.relationships.some((edge) => edge.artifactId && !artifactIds.has(edge.artifactId))) throw new Error("Every Case 6 relationship Artifact must exist.");
if (case6ProcessGraph.processAgentExecutions.some((item) => !item.input || !item.output || !item.handoff || !item.datasetImpact?.length)) throw new Error("Every Case 6 Process execution needs complete lineage.");
