import { agents } from "../../packages/catalog-data/src/agents.ts";
import {
  datasetGapsForAgent,
  datasetImpactsForAgent,
  deliverableForAgent,
} from "../../packages/catalog-data/src/agent-dataset-relations.ts";
import type { CaseAuditSummary, CaseEventAudit, EventAgentExecution } from "../process-model.ts";
import { case3EventBlueprints } from "./case-3-orchestration.ts";

const agentById = new Map(agents.map((agent) => [agent.id, agent]));

export function case3DatasetImpactForAgent(agentId: number) {
  const agent = agentById.get(agentId);
  if (!agent) throw new Error(`Unknown canonical Agent ${agentId}.`);
  const impacts = datasetImpactsForAgent(agent.registryId).map((impact) => `${impact.operation} ${impact.datasetId}`);
  const gaps = datasetGapsForAgent(agent.registryId).map((gap) => `${gap.status.toUpperCase()} GAP: ${gap.proposedName}`);
  if (impacts.length || gaps.length) return [...impacts, ...gaps];
  const deliverable = deliverableForAgent(agent.registryId);
  return [deliverable ? `${deliverable.disposition.toUpperCase()}: ${deliverable.name}` : "NO CANONICAL DATASET IMPACT DECLARED"];
}

export const case3EventAgentExecutions: EventAgentExecution[] = case3EventBlueprints.flatMap((event) => event.executions.map((spec) => {
  const agent = agentById.get(spec.agentId);
  if (!agent) throw new Error(`Unknown canonical Agent ${spec.agentId}.`);
  return {
    eventStep: event.step,
    agentId: spec.agentId,
    role: spec.role,
    action: spec.action,
    input: spec.input,
    output: spec.output,
    handoff: spec.handoff,
    datasetImpact: case3DatasetImpactForAgent(spec.agentId),
    evidence: [
      `CASE FACT E${String(event.step).padStart(2, "0")}: ${event.narrative}`,
      `EVENT BOUNDARY: ${event.scopeBoundary}`,
      `CANONICAL ROLE ${String(agent.id).padStart(2, "0")}: ${agent.description}`,
    ],
    necessity: spec.necessity ?? "justified",
    condition: spec.condition,
    activation: spec.activation,
    necessityRationale: spec.rationale,
    absenceImpact: `Без output «${spec.output}» downstream consumer не получает: ${spec.handoff}`,
    overlapNote: spec.overlapNote,
    provenance: "expert-proposed",
    validationStatus: "working",
  } satisfies EventAgentExecution;
}));

export const case3EventAudits: CaseEventAudit[] = case3EventBlueprints.map((event) => ({
  eventStep: event.step,
  auditVersion: `E${String(event.step).padStart(2, "0")} · V1`,
  status: "in-review",
  scopeBoundary: event.scopeBoundary,
  missingAgentFinding: event.missingAgentFinding,
  missingAgentIds: [],
}));

export const case3AuditSummary: CaseAuditSummary = {
  auditedEventCount: case3EventAudits.length,
  eventAgentFindingCount: case3EventAgentExecutions.length,
  retainedAssignmentCount: case3EventAgentExecutions.filter((item) => item.necessity === "justified").length,
  conditionalAssignmentCount: case3EventAgentExecutions.filter((item) => item.necessity === "conditional").length,
  addedAgentIds: [],
  movedAssignments: [],
  removedAssignments: [
    { agentId: 42, eventStep: 7, reason: "Case needs a legal JV member with Works capacity, not a local service/representation network; Agents 40/41 own this route." },
    { agentId: 19, eventStep: 2, reason: "E02 reads persistent P03 award records; Agent 19 does not re-ingest history inside discovery." },
    { agentId: 25, eventStep: 5, reason: "Qualification model is produced continuously in PB01 and consumed by E05; it is not duplicated as a one-off Event execution." },
  ],
  proposedMissingAgentIds: [],
  overlapFindings: [
    "Agents 40/12/41 form discovery → capability graph → concrete JV optimization; none owns the full consortium lifecycle alone.",
    "Agents 08 and 44 verify different entity roles: consortium members versus downstream equipment suppliers.",
    "Agents 32/33/39 own solution-fit, participation route and integrated tender solution respectively.",
    "Agents 25/47/48 separate mandatory qualification, response traceability and technical compliance.",
    "Agents 30 and 59 operate in opposite directions: bidder questions before final bid versus Buyer questions after submission.",
    "Agents 37/49/50/51/54 separate commercial attractiveness, formal compliance, cost basis, BOQ pricing and commercial-form drafting.",
    "Agents 36 and 62 separate pre-bid feasibility evidence from post-contract mobilisation support.",
  ],
  unresolvedFindings: [],
  canonicalRegistryImplications: [
    "No new Agent is justified: consortium formation is an orchestrated multi-Actor Process, not one autonomous super-agent.",
    "Agent 42 remains correctly unused because local JV membership and service representation are different participation models.",
    "Two-stage procurement requires separate pre-final-bid questions (Agent 30) and post-submission responses (Agent 59).",
    "Member verification, supplier verification and workshare optimization require distinct evidence boundaries.",
    "Case 3 ends at mobilisation handoff; Agents 62/63 support setup but do not imply that 30-month Works execution is complete.",
  ],
};

if (case3EventAudits.length !== 22 || case3EventAudits.length !== case3EventBlueprints.length) throw new Error("Case 3 needs one audit per Event.");
if (new Set(case3EventAgentExecutions.map((item) => `${item.eventStep}:${item.agentId}`)).size !== case3EventAgentExecutions.length) throw new Error("Case 3 Event × Agent findings must be unique.");
if (case3EventAgentExecutions.some((item) => !item.input || !item.action || !item.output || !item.handoff || !item.evidence.length || !item.datasetImpact?.length)) throw new Error("Each Case 3 Agent execution needs Input → Action → Output → Handoff, evidence and Dataset impact.");
if (case3EventAgentExecutions.some((item) => item.necessity === "conditional" && (!item.condition || !item.activation))) throw new Error("Each conditional Case 3 assignment needs trigger and activation state.");
