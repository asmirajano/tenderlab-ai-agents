import { agents } from "../../packages/catalog-data/src/agents.ts";
import type { CaseProcessActivity, CaseProcessGraph, ProcessActor, ProcessRelationship } from "../process-model.ts";
import { case1 } from "./case-1-data.ts";
import { case1AuditSummary, case1EventAgentExecutions, case1EventAudits } from "./case-1-event-audits.ts";
import { case1EventBlueprints, case1Processes, case1RelationshipSpecs } from "./case-1-orchestration.ts";

export { case1AuditSummary, case1EventAgentExecutions, case1EventAudits };

export const case1Actors: ProcessActor[] = [
  { id: "buyer", name: "Министерство образования и науки Грузии", shortName: "Buyer / Procuring Entity", kind: "buyer", description: "Публикует закупку, отвечает за evaluation, clarification, award и acceptance." },
  { id: "client", name: "Anatolia Workspace A.Ş.", shortName: "Client Company", kind: "client", description: "Предоставляет evidence, принимает business decisions, готовит bid и исполняет contract." },
  { id: "tenderlab", name: "TenderLab.ai", shortName: "TenderLab / Backend", kind: "tenderlab", description: "Поддерживает persistent data, выполняет Agents и связывает Event outputs в Case state." },
  { id: "consultant", name: "TenderLab Consultant / Expert", shortName: "Consultant / Expert", kind: "consultant", description: "Проверяет исключения, QA/legal conclusions и готовит human-ready recommendations." },
  { id: "external", name: "Внешние участники", shortName: "External Parties", kind: "external", description: "Банк, portal, local-service partner, logistics providers и authorised signatories." },
];

const canonicalAgentById = new Map(agents.map((agent) => [agent.id, agent]));

const activities: CaseProcessActivity[] = case1EventBlueprints.map((event) => {
  const executions = case1EventAgentExecutions.filter((execution) => execution.eventStep === event.step);
  const activeAgentNames = executions
    .filter((execution) => (execution.necessity === "justified" || execution.necessity === "conditional") && execution.activation !== "standby" && execution.validationStatus !== "needs-review")
    .map((execution) => canonicalAgentById.get(execution.agentId)?.name)
    .filter((name): name is string => Boolean(name));
  const standbyAgentNames = executions
    .filter((execution) => execution.necessity === "conditional" && execution.activation === "standby")
    .map((execution) => canonicalAgentById.get(execution.agentId)?.name)
    .filter((name): name is string => Boolean(name));

  return {
    id: `activity-${String(event.step).padStart(2, "0")}`,
    eventId: `event-${String(event.step).padStart(2, "0")}`,
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
    stateLabel: event.kind === "wait" ? "GATE CLEARED" : event.kind === "background-update" ? "DATA UPDATED" : "COMPLETED",
    trigger: event.trigger,
    startDay: event.startDay,
    endDay: event.endDay,
    layout: { column: event.column, lane: event.lane },
    critical: Boolean(event.critical),
  };
});

const eventArtifacts = activities.map((activity) => ({
  id: `artifact-${String(activity.eventStep).padStart(2, "0")}`,
  producerRef: activity.id,
  producerKind: "event" as const,
  name: `Output Event ${String(activity.eventStep).padStart(2, "0")}`,
  summary: activity.result,
  persistence: activity.eventStep === 24 ? "persistent" as const : "case-state" as const,
  terminal: activity.eventStep === 24,
}));

const processArtifactSeeds = [
  ["artifact-p01-taxonomy", "P01", "Versioned taxonomy"],
  ["artifact-p01-filter-policy", "P01", "Filter policy"],
  ["artifact-p01-thresholds", "P01", "Threshold / exclusion records"],
  ["artifact-p02-provisional-profile", "P02", "Provisional company profile"],
  ["artifact-p02-evidence-gaps", "P02", "Prospect confidence and evidence gaps"],
  ["artifact-p03-tender-award-history", "P03", "Canonical tender / award history"],
  ["artifact-p03-winner-values", "P03", "Linked winner / value records"],
  ["artifact-p04-calendar", "P04", "Case calendar and alerts"],
  ["artifact-p04-amendment-impact", "P04", "Versioned amendment impact records"],
  ["artifact-pb01-market-brief", "PB01", "Market intelligence brief"],
  ["artifact-pb01-buyer-dossier", "PB01", "Buyer / competitor dossier"],
] as const;
const processArtifacts = processArtifactSeeds.map(([id, producerRef, name]) => ({ id, producerRef, producerKind: "process" as const, name, summary: name, persistence: producerRef.startsWith("P0") && producerRef !== "P04" ? "persistent" as const : "case-state" as const }));
const artifacts = [...eventArtifacts, ...processArtifacts];

const relationships: ProcessRelationship[] = case1RelationshipSpecs.map((relationship, index) => ({
  id: `case-1-edge-${String(index + 1).padStart(2, "0")}`,
  from: `activity-${String(relationship.from).padStart(2, "0")}`,
  to: `activity-${String(relationship.to).padStart(2, "0")}`,
  type: relationship.type ?? "handoff",
  label: relationship.label,
  artifactId: `artifact-${String(relationship.from).padStart(2, "0")}`,
  condition: relationship.condition,
  blocking: relationship.blocking,
  joinPolicy: relationship.joinPolicy,
  provenance: "expert-proposed",
  validationStatus: relationship.from <= 2 && relationship.to <= 3 ? "confirmed" : "working",
}));

const processRelationships: ProcessRelationship[] = [
  { id: "case-1-process-edge-01", from: "P01", to: "activity-02", type: "handoff", label: "Taxonomy + filter policy + thresholds", artifactId: "artifact-p01-filter-policy", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-1-process-edge-02", from: "P02", to: "activity-02", type: "handoff", label: "Provisional company profile", artifactId: "artifact-p02-provisional-profile", blocking: true, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-1-process-edge-03", from: "activity-01", to: "P04", type: "triggered-by", label: "Notice dates + source baseline", artifactId: "artifact-01", blocking: true, provenance: "case-observed", validationStatus: "confirmed" },
  { id: "case-1-process-edge-04", from: "activity-02", to: "PB01", type: "branches-to", label: "Classified opportunity", artifactId: "artifact-02", blocking: true, provenance: "case-observed", validationStatus: "confirmed" },
  { id: "case-1-process-edge-05", from: "P03", to: "PB01", type: "handoff", label: "Historical award records", artifactId: "artifact-p03-tender-award-history", blocking: false, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-1-process-edge-06", from: "PB01", to: "activity-08", type: "joins-at", label: "Market brief + buyer/competitor dossier", artifactId: "artifact-pb01-market-brief", blocking: true, joinPolicy: "ALL", provenance: "case-observed", validationStatus: "confirmed" },
  { id: "case-1-process-edge-07", from: "PB01", to: "activity-14", type: "handoff", label: "Competitive context", artifactId: "artifact-pb01-buyer-dossier", blocking: false, provenance: "expert-proposed", validationStatus: "working" },
  { id: "case-1-process-edge-08", from: "P04", to: "activity-16", type: "handoff", label: "Submission calendar status", artifactId: "artifact-p04-calendar", blocking: true, provenance: "case-observed", validationStatus: "confirmed" },
  { id: "case-1-process-edge-09", from: "activity-24", to: "P03", type: "feedback", label: "Verified outcome update", artifactId: "artifact-24", blocking: false, provenance: "case-observed", validationStatus: "confirmed" },
];

const processAgentExecutions = case1Processes.flatMap((process) => process.agentIds.map((agentId) => {
  const agent = canonicalAgentById.get(agentId);
  if (!agent) throw new Error(`Unknown Agent ${agentId} in Process ${process.id}.`);
  return { processId: process.id, agentId, role: agent.description, input: process.inputs.map((item) => item.name).join(" · "), output: process.outputArtifactIds.map((id) => artifacts.find((artifact) => artifact.id === id)?.name).filter(Boolean).join(" · "), handoff: process.consumerRefs.join(" · "), validationStatus: "working" as const };
}));

export const case1ProcessGraph: CaseProcessGraph = {
  caseId: case1.id,
  version: "V3 · DEPENDENCY-AWARE ORCHESTRATION",
  actors: case1Actors,
  activities,
  processes: case1Processes,
  artifacts,
  relationships: [...relationships, ...processRelationships],
  eventAudits: case1EventAudits,
  agentExecutions: case1EventAgentExecutions,
  processAgentExecutions,
  auditSummary: case1AuditSummary,
  orchestratorAgentIds: [1],
};

const activityIds = new Set(activities.map((activity) => activity.id));
if (activities.length !== 24 || activityIds.size !== 24) throw new Error("Case 1 process graph needs 24 unique Events.");
if (activities.some((activity) => !case1Actors.some((actor) => actor.id === activity.responsibleActorId))) throw new Error("Every Case 1 Event needs a canonical responsible Actor.");
const processIds = new Set(case1Processes.map((process) => process.id));
const nodeIds = new Set([...activityIds, ...processIds]);
if ([...relationships, ...processRelationships].some((relationship) => !nodeIds.has(relationship.from) || !nodeIds.has(relationship.to))) throw new Error("Every Case 1 relationship must reference a known Event or Process.");
if (activities.some((activity) => activity.kind === "wait" && !activity.trigger)) throw new Error("Every wait/gate Event needs an explicit trigger.");
if (case1EventAudits.some((audit) => !activities.some((activity) => activity.eventStep === audit.eventStep))) throw new Error("Every Event Audit needs a canonical Event.");
if (case1Processes.some((process) => !case1Actors.some((actor) => actor.id === process.ownerActorId))) throw new Error("Every Process needs a canonical owner Actor.");
if (case1Processes.some((process) => process.outputArtifactIds.some((id) => !artifacts.some((artifact) => artifact.id === id && artifact.producerRef === process.id)))) throw new Error("Every Process output needs a Process-owned Artifact.");
if (case1Processes.some((process) => !processAgentExecutions.some((execution) => execution.processId === process.id))) throw new Error("Every Process needs explicit Agent participation records.");
