import { agents } from "../../packages/catalog-data/src/agents.ts";
import {
  datasetGapsForAgent,
  datasetImpactsForAgent,
  deliverableForAgent,
} from "../../packages/catalog-data/src/agent-dataset-relations.ts";
import type { CaseAuditSummary, CaseEventAudit, EventAgentExecution } from "../process-model.ts";
import { case2Engagements } from "./case-2-data.ts";
import { case2EventBlueprints, case2ExecutionOverrides } from "./case-2-orchestration.ts";

const agentById = new Map(agents.map((agent) => [agent.id, agent]));
const engagementByAgentId = new Map(case2Engagements.map((engagement) => [engagement.agentId, engagement]));

export function datasetImpactForAgent(agentId: number) {
  const agent = agentById.get(agentId);
  if (!agent) throw new Error(`Unknown canonical Agent ${agentId}.`);
  const impacts = datasetImpactsForAgent(agent.registryId).map((impact) => `${impact.operation} ${impact.datasetId}`);
  const gaps = datasetGapsForAgent(agent.registryId).map((gap) => `${gap.status.toUpperCase()} GAP: ${gap.proposedName}`);
  if (impacts.length || gaps.length) return [...impacts, ...gaps];
  const deliverable = deliverableForAgent(agent.registryId);
  return [deliverable ? `${deliverable.disposition.toUpperCase()}: ${deliverable.name}` : "NO CANONICAL DATASET IMPACT DECLARED"];
}

export const case2EventAgentExecutions: EventAgentExecution[] = case2EventBlueprints.flatMap((event) => {
  const standby = new Set(event.standbyAgentIds ?? []);
  return [...event.agentIds, ...(event.standbyAgentIds ?? [])].map((agentId) => {
    const agent = agentById.get(agentId);
    const engagement = engagementByAgentId.get(agentId);
    const override = case2ExecutionOverrides[`${event.step}:${agentId}`] ?? {};
    if (!agent || !engagement) throw new Error(`Invalid Case 2 assignment E${event.step} / Agent ${agentId}.`);
    const necessity = override.necessity ?? (standby.has(agentId) ? "conditional" : "justified");
    const activation = override.activation ?? (standby.has(agentId) ? "standby" : undefined);
    const input = override.input ?? engagement.input ?? `Verified upstream state for E${String(event.step).padStart(2, "0")}.`;
    const output = override.output ?? engagement.output ?? agent.output.primary;
    const handoff = override.handoff ?? engagement.next ?? event.next;
    return {
      eventStep: event.step,
      agentId,
      role: override.role ?? agent.output.primary,
      action: override.action ?? `${agent.description} Case-specific boundary: ${event.scopeBoundary}`,
      input,
      output,
      handoff,
      datasetImpact: datasetImpactForAgent(agentId),
      evidence: [
        `CASE FACT E${String(event.step).padStart(2, "0")}: ${event.narrative}`,
        `EVENT BOUNDARY: ${event.scopeBoundary}`,
        `CANONICAL ROLE ${String(agent.id).padStart(2, "0")}: ${agent.description}`,
      ],
      necessity,
      condition: override.condition ?? (standby.has(agentId) ? "Активируется только при observable route exception." : undefined),
      activation,
      necessityRationale: override.rationale ?? engagement.why,
      absenceImpact: `Без output «${output}» downstream consumer не получает: ${handoff}`,
      overlapNote: override.overlapNote,
      provenance: "expert-proposed",
      validationStatus: "working",
    } satisfies EventAgentExecution;
  });
});

export const case2EventAudits: CaseEventAudit[] = case2EventBlueprints.map((event) => ({
  eventStep: event.step,
  auditVersion: `E${String(event.step).padStart(2, "0")} · V1`,
  status: "in-review",
  scopeBoundary: event.scopeBoundary,
  missingAgentFinding: event.missingAgentFinding,
  missingAgentIds: [],
}));

export const case2AuditSummary: CaseAuditSummary = {
  auditedEventCount: case2EventAudits.length,
  eventAgentFindingCount: case2EventAgentExecutions.length,
  retainedAssignmentCount: case2EventAgentExecutions.filter((item) => item.necessity === "justified").length,
  conditionalAssignmentCount: case2EventAgentExecutions.filter((item) => item.necessity === "conditional").length,
  addedAgentIds: [],
  movedAssignments: [],
  removedAssignments: [
    { agentId: 19, eventStep: 2, reason: "E02 reads ready P03 award records; persistent acquisition/linkage is not an Event execution." },
    { agentId: 18, eventStep: 2, reason: "Market enrichment belongs to PB01 and joins E03/E10." },
    { agentId: 20, eventStep: 2, reason: "Buyer/competitor analysis belongs to PB01 and does not delay source triage." },
    { agentId: 47, eventStep: 12, reason: "Bid preparation starts in a separate Client Side Case after activation handoff." },
  ],
  proposedMissingAgentIds: [],
  overlapFindings: [
    "Agents 15/16/14 remain sequentially distinct: taxonomy assignment → deterministic policy exclusion → prospect-specific preliminary ranking.",
    "Agents 06/07/08/10 separate reusable profile ownership, capability semantics, factual verification and credential validity.",
    "Agents 09/25/31 separate general readiness, mandatory eligibility and weighted company×tender fit.",
    "Agents 18/19/20 separate persistent award linkage from market interpretation and buyer/competitor interpretation.",
    "Agents 35/02 separate analytical Bid/No-Bid recommendation from company-owned authority and approval.",
  ],
  unresolvedFindings: [],
  canonicalRegistryImplications: [
    "No new Agent is justified: prospect outreach is a human Event governed by Process P05, not an autonomous tender Agent.",
    "Public provisional profile and consented verified profile must remain distinct artifacts with rights/provenance boundaries.",
    "Activation Case completion is a controlled handoff, not a hidden proposal, submission or award workflow.",
    "Agent 34 still exposes the known proposed Dataset gap for a persistent remediation-plan record; the Case does not invent a duplicate Dataset.",
  ],
};

if (case2EventAudits.length !== 12 || case2EventAudits.length !== case2EventBlueprints.length) throw new Error("Case 2 needs one audit per Event.");
if (new Set(case2EventAgentExecutions.map((item) => `${item.eventStep}:${item.agentId}`)).size !== case2EventAgentExecutions.length) throw new Error("Case 2 Event × Agent findings must be unique.");
if (case2EventAgentExecutions.some((item) => !item.input || !item.output || !item.handoff || !item.datasetImpact?.length)) throw new Error("Each Case 2 Agent execution needs input, output, Dataset impact and consumer.");
if (case2EventAgentExecutions.some((item) => item.necessity === "conditional" && !item.condition)) throw new Error("Each conditional assignment needs a trigger.");
