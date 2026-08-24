import { agents } from "../../packages/catalog-data/src/agents.ts";
import type { CaseProcessActivity, CaseProcessGraph, ProcessActor, ProcessRelationship } from "../process-model.ts";
import { case3 } from "./case-3-data.ts";
import { case3AuditSummary, case3DatasetImpactForAgent, case3EventAgentExecutions, case3EventAudits } from "./case-3-event-audits.ts";
import { case3EventBlueprints, case3Processes, case3RelationshipSpecs } from "./case-3-orchestration.ts";

export { case3AuditSummary, case3EventAgentExecutions, case3EventAudits };

export const case3Actors: ProcessActor[] = [
  { id: "buyer", name: "QazWater Infrastructure Directorate", shortName: "Buyer / Procuring Entity", kind: "buyer", description: "Публикует two-stage Works tender, ведёт dialogue/evaluation и подписывает contract после ADB no-objection." },
  { id: "client", name: "AquaNova Ingeniería S.A.", shortName: "Lead / Client Company", kind: "client", description: "Инициирует feasibility, возглавляет consortium и сохраняет корпоративную decision authority." },
  { id: "oem", name: "Anatolia Process Systems A.Ş.", shortName: "Equipment OEM / JV Member", kind: "external", description: "После consent становится verified equipment member с 33% workshare." },
  { id: "local", name: "SteppeBuild KZ LLP", shortName: "Local Contractor / JV Member", kind: "external", description: "После consent становится verified Kazakhstan Works member с 25% workshare." },
  { id: "tenderlab", name: "TenderLab.ai", shortName: "TenderLab / Backend", kind: "tenderlab", description: "Выполняет source, data, scoring, audit и orchestration work без присвоения human authority." },
  { id: "consultant", name: "TenderLab Consultant", shortName: "Consultant / Expert", kind: "consultant", description: "Проектирует consortium route, проверяет evidence и координирует gates за milestone-based fee." },
];

const agentById = new Map(agents.map((agent) => [agent.id, agent]));

const activities: CaseProcessActivity[] = case3EventBlueprints.map((event) => {
  const active = event.executions.filter((item) => item.activation !== "standby");
  const standby = event.executions.filter((item) => item.activation === "standby");
  return {
    id: `case3-activity-${String(event.step).padStart(2, "0")}`,
    eventId: `case3-event-${String(event.step).padStart(2, "0")}`,
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
    agentNames: active.map((item) => agentById.get(item.agentId)?.name).filter((name): name is string => Boolean(name)),
    standbyAgentNames: standby.map((item) => agentById.get(item.agentId)?.name).filter((name): name is string => Boolean(name)),
    kind: event.kind ?? "activity",
    state: "completed",
    stateLabel: event.kind === "wait" ? "WAIT RESOLVED" : event.kind === "decision" ? "GATE PASSED" : event.executions.length ? "COMPLETED" : "HUMAN ACTION",
    trigger: event.trigger,
    startDay: event.startDay,
    endDay: event.endDay,
    layout: { column: event.column, lane: event.lane },
    critical: Boolean(event.critical),
  };
});

const eventArtifacts = activities.map((activity) => ({
  id: `case3-artifact-${String(activity.eventStep).padStart(2, "0")}`,
  producerRef: activity.id,
  producerKind: "event" as const,
  name: `Output E${String(activity.eventStep).padStart(2, "0")}`,
  summary: activity.result,
  persistence: activity.eventStep >= 21 ? "persistent" as const : "case-state" as const,
  terminal: activity.eventStep === 22,
}));

const processArtifactSeeds = [
  ["artifact-p01-taxonomy", "P01", "Works / ADB taxonomy"], ["artifact-p01-policy", "P01", "Portfolio and participation policy"],
  ["artifact-p02-company", "P02", "Company intelligence records"], ["artifact-p02-partners", "P02", "Partner capability records"], ["artifact-p02-suppliers", "P02", "Supplier intelligence records"],
  ["artifact-p03-history", "P03", "Tender–award–contract history"], ["artifact-p03-awards", "P03", "Comparable Works awards"],
  ["artifact-p04-calendar", "P04", "Two-stage Case calendar"], ["artifact-p04-changes", "P04", "Versioned amendment impacts"],
  ["artifact-p05-decisions", "P05", "Multi-party decision ledger"], ["artifact-p05-workshare", "P05", "Versioned JV workshare"], ["artifact-p05-governance", "P05", "Consortium governance baseline"],
  ["artifact-pb01-corpus", "PB01", "Source-locked multilingual tender corpus"], ["artifact-pb01-qualification", "PB01", "Combined qualification model"], ["artifact-pb01-evaluation", "PB01", "Two-stage evaluation model"], ["artifact-pb01-forms", "PB01", "Forms and deliverables register"], ["artifact-pb01-specs", "PB01", "Exact technical specifications"],
  ["artifact-pb02-market", "PB02", "Water-infrastructure market brief"], ["artifact-pb02-buyer", "PB02", "Buyer/competitor dossier"],
  ["artifact-pb03-shortlist", "PB03", "Partner shortlist"], ["artifact-pb03-diligence", "PB03", "Partner due-diligence pack"],
  ["artifact-pb04-suppliers", "PB04", "Verified specialist suppliers"], ["artifact-pb04-rfq", "PB04", "RFQ response tracker"], ["artifact-pb04-quotes", "PB04", "Normalized supplier quotations"],
] as const;
const processArtifacts = processArtifactSeeds.map(([id, producerRef, name]) => ({ id, producerRef, producerKind: "process" as const, name, summary: name, persistence: ["P01", "P02", "P03"].includes(producerRef) ? "persistent" as const : "case-state" as const }));
const artifacts = [...eventArtifacts, ...processArtifacts];

const eventRelationships: ProcessRelationship[] = case3RelationshipSpecs.map((edge, index) => ({
  id: `case-3-event-edge-${String(index + 1).padStart(2, "0")}`,
  from: `case3-activity-${String(edge.from).padStart(2, "0")}`,
  to: `case3-activity-${String(edge.to).padStart(2, "0")}`,
  type: edge.type ?? "handoff",
  label: edge.label,
  artifactId: `case3-artifact-${String(edge.from).padStart(2, "0")}`,
  condition: edge.condition,
  blocking: edge.blocking,
  joinPolicy: edge.joinPolicy,
  provenance: "expert-proposed",
  validationStatus: "working",
}));

const processRelationships: ProcessRelationship[] = [
  { id: "c3-p-01", from: "P01", to: "case3-activity-02", type: "handoff", label: "Works taxonomy + policy", artifactId: "artifact-p01-policy", blocking: true },
  { id: "c3-p-02", from: "P01", to: "P02", type: "handoff", label: "Permitted entity-data policy", artifactId: "artifact-p01-taxonomy", blocking: true },
  { id: "c3-p-03", from: "P02", to: "case3-activity-02", type: "handoff", label: "Provisional AquaNova profile", artifactId: "artifact-p02-company", blocking: true },
  { id: "c3-p-04", from: "P03", to: "PB02", type: "handoff", label: "Comparable award history", artifactId: "artifact-p03-history", blocking: false },
  { id: "c3-p-05", from: "case3-activity-01", to: "P04", type: "triggered-by", label: "Notice dates", artifactId: "case3-artifact-01", blocking: true },
  { id: "c3-p-06", from: "case3-activity-03", to: "P05", type: "triggered-by", label: "Consortium-feasibility mandate", artifactId: "case3-artifact-03", blocking: true },
  { id: "c3-p-07", from: "case3-activity-02", to: "PB01", type: "branches-to", label: "Selected tender package", artifactId: "case3-artifact-02", blocking: true },
  { id: "c3-p-08", from: "case3-activity-02", to: "PB02", type: "branches-to", label: "Market/buyer enrichment trigger", artifactId: "case3-artifact-02", blocking: true },
  { id: "c3-p-09", from: "PB01", to: "case3-activity-05", type: "joins-at", label: "Qualification + evaluation + specs", artifactId: "artifact-pb01-qualification", blocking: true, joinPolicy: "ALL" },
  { id: "c3-p-10", from: "PB02", to: "case3-activity-05", type: "joins-at", label: "Market/buyer evidence", artifactId: "artifact-pb02-buyer", blocking: true, joinPolicy: "ALL" },
  { id: "c3-p-11", from: "case3-activity-06", to: "PB03", type: "triggered-by", label: "Approved partner-search mandate", artifactId: "case3-artifact-06", blocking: true },
  { id: "c3-p-12", from: "PB03", to: "case3-activity-07", type: "handoff", label: "Candidate intelligence", artifactId: "artifact-pb03-shortlist", blocking: false },
  { id: "c3-p-13", from: "PB03", to: "case3-activity-09", type: "joins-at", label: "Due-diligence evidence", artifactId: "artifact-pb03-diligence", blocking: true, joinPolicy: "ALL" },
  { id: "c3-p-14", from: "case3-activity-10", to: "PB04", type: "triggered-by", label: "Workshare + specialist packages", artifactId: "case3-artifact-10", blocking: true },
  { id: "c3-p-15", from: "PB04", to: "case3-activity-11", type: "handoff", label: "Verified suppliers + budget quotes", artifactId: "artifact-pb04-quotes", blocking: true },
  { id: "c3-p-16", from: "PB04", to: "case3-activity-17", type: "joins-at", label: "Refreshed final quotations", artifactId: "artifact-pb04-quotes", blocking: true, joinPolicy: "ALL" },
  { id: "c3-p-17", from: "case3-activity-15", to: "PB01", type: "feedback", label: "Stage 2 source refresh", artifactId: "case3-artifact-15", blocking: true },
].map((edge): ProcessRelationship => ({
  ...edge,
  type: edge.type as ProcessRelationship["type"],
  provenance: "expert-proposed",
  validationStatus: "working",
}));

const processAgentExecutions = case3Processes.flatMap((process) => process.agentIds.map((agentId) => {
  const agent = agentById.get(agentId);
  if (!agent) throw new Error(`Unknown Agent ${agentId} in ${process.id}.`);
  return {
    processId: process.id,
    agentId,
    role: agent.description,
    input: process.inputs.map((item) => `${item.name} [${item.availability}]`).join(" · "),
    output: process.outputArtifactIds.map((id) => artifacts.find((artifact) => artifact.id === id)?.name).filter(Boolean).join(" · "),
    handoff: process.consumerRefs.join(" · "),
    datasetImpact: case3DatasetImpactForAgent(agentId),
    validationStatus: "working" as const,
  };
}));

export const case3ProcessGraph: CaseProcessGraph = {
  caseId: case3.id,
  version: "V1 · TWO-STAGE CONSORTIUM WORKS",
  actors: case3Actors,
  activities,
  processes: case3Processes,
  artifacts,
  relationships: [...eventRelationships, ...processRelationships],
  eventAudits: case3EventAudits,
  agentExecutions: case3EventAgentExecutions,
  processAgentExecutions,
  auditSummary: case3AuditSummary,
  orchestratorAgentIds: [1],
};

const activityIds = new Set(activities.map((activity) => activity.id));
const processIds = new Set(case3Processes.map((process) => process.id));
const nodeIds = new Set([...activityIds, ...processIds]);
if (activities.length !== 22 || activityIds.size !== 22) throw new Error("Case 3 graph requires 22 unique Events.");
if ([...eventRelationships, ...processRelationships].some((edge) => !nodeIds.has(edge.from) || !nodeIds.has(edge.to))) throw new Error("Every Case 3 relationship must reference a known Event or Process.");
if (case3Processes.some((process) => process.outputArtifactIds.some((id) => !artifacts.some((artifact) => artifact.id === id && artifact.producerRef === process.id)))) throw new Error("Every Case 3 Process output must be Process-owned.");
if (case3Processes.some((process) => process.consumerRefs.some((ref) => !nodeIds.has(ref)))) throw new Error("Every Case 3 Process consumer must resolve.");
if (case3Processes.some((process) => !processAgentExecutions.some((item) => item.processId === process.id))) throw new Error("Every Case 3 Process needs Agent execution records.");
