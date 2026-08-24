import { agents } from "../../packages/catalog-data/src/agents.ts";
import type { CaseProcessActivity, CaseProcessGraph, ProcessActor, ProcessRelationship } from "../process-model.ts";
import { case2 } from "./case-2-data.ts";
import { case2AuditSummary, case2EventAgentExecutions, case2EventAudits, datasetImpactForAgent } from "./case-2-event-audits.ts";
import { case2EventBlueprints, case2Processes, case2RelationshipSpecs } from "./case-2-orchestration.ts";

export { case2AuditSummary, case2EventAgentExecutions, case2EventAudits };

export const case2Actors: ProcessActor[] = [
  { id: "buyer", name: "UN Procurement Office · Kenya Programme", shortName: "Buyer / UN Entity", kind: "buyer", description: "Публикует рамочную закупку и authoritative source updates." },
  { id: "client", name: "MedTex Protection LLC", shortName: "Prospect → Client", kind: "client", description: "Сначала prospect вне Case, затем после consent предоставляет private evidence и принимает BID decision." },
  { id: "tenderlab", name: "TenderLab.ai", shortName: "TenderLab / Backend", kind: "tenderlab", description: "Поддерживает platform records, выполняет Agents и управляет Case state." },
  { id: "consultant", name: "TenderLab Consultant", shortName: "Consultant / Expert", kind: "consultant", description: "Проверяет evidence, принимает ответственность за outreach и ведёт briefing без автоматического marketing." },
  { id: "external", name: "Внешние источники и контактные каналы", shortName: "External Parties", kind: "external", description: "Official portals, public registries, contact channel and external integrity sources." },
];

const agentById = new Map(agents.map((agent) => [agent.id, agent]));

const activities: CaseProcessActivity[] = case2EventBlueprints.map((event) => {
  const executions = case2EventAgentExecutions.filter((item) => item.eventStep === event.step);
  const activeAgentNames = executions.filter((item) => item.activation !== "standby").map((item) => agentById.get(item.agentId)?.name).filter((name): name is string => Boolean(name));
  const standbyAgentNames = executions.filter((item) => item.activation === "standby").map((item) => agentById.get(item.agentId)?.name).filter((name): name is string => Boolean(name));
  return {
    id: `case2-activity-${String(event.step).padStart(2, "0")}`,
    eventId: `case2-event-${String(event.step).padStart(2, "0")}`,
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
    stateLabel: event.kind === "decision" ? "GATE PASSED" : event.agentIds.length ? "COMPLETED" : "HUMAN ACTION",
    trigger: event.trigger,
    startDay: event.startDay,
    endDay: event.endDay,
    layout: { column: event.column, lane: event.lane },
    critical: Boolean(event.critical),
  };
});

const eventArtifacts = activities.map((activity) => ({
  id: `case2-artifact-${String(activity.eventStep).padStart(2, "0")}`,
  producerRef: activity.id,
  producerKind: "event" as const,
  name: `Output E${String(activity.eventStep).padStart(2, "0")}`,
  summary: activity.result,
  persistence: activity.eventStep === 12 ? "persistent" as const : "case-state" as const,
  terminal: activity.eventStep === 12,
}));

const processArtifactSeeds = [
  ["artifact-p01-taxonomy", "P01", "Versioned taxonomy"], ["artifact-p01-filter-policy", "P01", "Filter policy"], ["artifact-p01-thresholds", "P01", "Threshold / exclusion records"], ["artifact-p01-rights-policy", "P01", "Data-use and outreach policy"],
  ["artifact-p02-provisional-profile", "P02", "Provisional public company profile"], ["artifact-p02-evidence-gaps", "P02", "Prospect evidence gaps"],
  ["artifact-p03-history", "P03", "Tender–award–contract history"], ["artifact-p03-awards", "P03", "Linked award records"],
  ["artifact-p04-calendar", "P04", "Case calendar and alerts"], ["artifact-p04-amendments", "P04", "Amendment impact records"],
  ["artifact-p05-outreach-basis", "P05", "Approved outreach basis"], ["artifact-p05-consent-log", "P05", "Outreach / consent audit log"],
  ["artifact-pb01-market", "PB01", "Market and price brief"], ["artifact-pb01-buyer", "PB01", "Buyer / competitor dossier"],
  ["artifact-pb02-corpus", "PB02", "Source-locked tender corpus"], ["artifact-pb02-requirements", "PB02", "Tender requirements register"], ["artifact-pb02-evaluation", "PB02", "Evaluation model"],
] as const;
const processArtifacts = processArtifactSeeds.map(([id, producerRef, name]) => ({ id, producerRef, producerKind: "process" as const, name, summary: name, persistence: producerRef === "P01" || producerRef === "P02" || producerRef === "P03" ? "persistent" as const : "case-state" as const }));
const artifacts = [...eventArtifacts, ...processArtifacts];

const eventRelationships: ProcessRelationship[] = case2RelationshipSpecs.map((edge, index) => ({
  id: `case-2-event-edge-${String(index + 1).padStart(2, "0")}`,
  from: `case2-activity-${String(edge.from).padStart(2, "0")}`,
  to: `case2-activity-${String(edge.to).padStart(2, "0")}`,
  type: edge.type ?? "handoff",
  label: edge.label,
  artifactId: `case2-artifact-${String(edge.from).padStart(2, "0")}`,
  condition: edge.condition,
  blocking: edge.blocking,
  joinPolicy: edge.joinPolicy,
  provenance: "expert-proposed",
  validationStatus: "working",
}));

const processRelationships: ProcessRelationship[] = [
  { id: "case-2-process-edge-01", from: "P01", to: "case2-activity-02", type: "handoff", label: "Taxonomy + policy + thresholds", artifactId: "artifact-p01-filter-policy", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-2-process-edge-02", from: "P02", to: "case2-activity-02", type: "handoff", label: "Provisional public profile", artifactId: "artifact-p02-provisional-profile", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-2-process-edge-02a", from: "P01", to: "P02", type: "handoff", label: "Permitted public-data use", artifactId: "artifact-p01-rights-policy", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-2-process-edge-02b", from: "P01", to: "P05", type: "handoff", label: "Outreach policy and rights boundary", artifactId: "artifact-p01-rights-policy", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-2-process-edge-03", from: "case2-activity-01", to: "P04", type: "triggered-by", label: "Notice dates", artifactId: "case2-artifact-01", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-2-process-edge-04", from: "case2-activity-02", to: "PB01", type: "branches-to", label: "Passed classified opportunity", artifactId: "case2-artifact-02", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-2-process-edge-05", from: "P03", to: "PB01", type: "handoff", label: "Historical award records", artifactId: "artifact-p03-history", blocking: false, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-2-process-edge-06", from: "case2-activity-02", to: "PB02", type: "branches-to", label: "Tender selected for evidence build", artifactId: "case2-artifact-02", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-2-process-edge-07", from: "P05", to: "case2-activity-03", type: "joins-at", label: "Outreach policy and allowed claims", artifactId: "artifact-p05-outreach-basis", blocking: true, joinPolicy: "ALL", provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-2-process-edge-08", from: "PB01", to: "case2-activity-03", type: "joins-at", label: "Market / buyer evidence", artifactId: "artifact-pb01-market", blocking: true, joinPolicy: "ALL", provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-2-process-edge-09", from: "PB02", to: "case2-activity-03", type: "joins-at", label: "Pre-contact tender facts", artifactId: "artifact-pb02-requirements", blocking: true, joinPolicy: "ALL", provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-2-process-edge-10", from: "PB02", to: "case2-activity-09", type: "joins-at", label: "Requirements + evaluation model", artifactId: "artifact-pb02-evaluation", blocking: true, joinPolicy: "ALL", provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-2-process-edge-11", from: "PB01", to: "case2-activity-10", type: "joins-at", label: "Price / buyer / competitor context", artifactId: "artifact-pb01-buyer", blocking: true, joinPolicy: "ALL", provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-2-process-edge-12", from: "case2-activity-06", to: "P04", type: "handoff", label: "Consent + assigned owners", artifactId: "case2-artifact-06", blocking: false, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-2-process-edge-13", from: "P04", to: "case2-activity-12", type: "handoff", label: "Current dates / amendments", artifactId: "artifact-p04-calendar", blocking: false, provenance: "expert-proposed", validationStatus: "working" },
];

const processAgentExecutions = case2Processes.flatMap((process) => process.agentIds.map((agentId) => {
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

export const case2ProcessGraph: CaseProcessGraph = {
  caseId: case2.id,
  version: "V1 · CONSULTANT-LED ACTIVATION",
  actors: case2Actors,
  activities,
  processes: case2Processes,
  artifacts,
  relationships: [...eventRelationships, ...processRelationships],
  eventAudits: case2EventAudits,
  agentExecutions: case2EventAgentExecutions,
  processAgentExecutions,
  auditSummary: case2AuditSummary,
  orchestratorAgentIds: [1],
};

const activityIds = new Set(activities.map((activity) => activity.id));
const processIds = new Set(case2Processes.map((process) => process.id));
const nodeIds = new Set([...activityIds, ...processIds]);
if (activities.length !== 12 || activityIds.size !== 12) throw new Error("Case 2 graph requires 12 unique Events.");
if ([...eventRelationships, ...processRelationships].some((edge) => !nodeIds.has(edge.from) || !nodeIds.has(edge.to))) throw new Error("Every Case 2 relationship must reference a known Event or Process.");
if (case2Processes.some((process) => process.outputArtifactIds.some((id) => !artifacts.some((artifact) => artifact.id === id && artifact.producerRef === process.id)))) throw new Error("Every Process output must be a Process-owned Artifact.");
if (case2Processes.some((process) => !processAgentExecutions.some((item) => item.processId === process.id))) throw new Error("Every Case 2 Process needs explicit Agent execution records.");
if (case2Processes.some((process) => process.consumerRefs.some((ref) => !nodeIds.has(ref)))) throw new Error("Every Case 2 Process consumer must resolve to a known Event or Process.");
