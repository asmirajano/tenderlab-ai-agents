import { agents } from "../../packages/catalog-data/src/agents.ts";
import type { CaseAuditSummary, CaseEventAudit, EventAgentExecution } from "../process-model.ts";
import { case1Engagements } from "./case-1-data.ts";
import { case1EventBlueprints, case1ExecutionOverrides } from "./case-1-orchestration.ts";

const agentById = new Map(agents.map((agent) => [agent.id, agent]));
const engagementByAgentId = new Map(case1Engagements.map((engagement) => [engagement.agentId, engagement]));

export const case1EventAgentExecutions: EventAgentExecution[] = case1EventBlueprints.flatMap((event) => {
  const standby = new Set(event.standbyAgentIds ?? []);
  return [...event.agentIds, ...(event.standbyAgentIds ?? [])].map((agentId) => {
    const agent = agentById.get(agentId);
    const engagement = engagementByAgentId.get(agentId);
    const override = case1ExecutionOverrides[`${event.step}:${agentId}`] ?? {};
    if (!agent || !engagement) throw new Error(`Invalid Case 1 assignment E${event.step} / Agent ${agentId}.`);

    const necessity = override.necessity ?? (standby.has(agentId) ? "conditional" : "justified");
    const activation = override.activation ?? (standby.has(agentId) ? "standby" : undefined);
    const output = override.output ?? engagement.output ?? agent.output.primary;
    const input = override.input ?? engagement.input ?? `Case state и подтверждённые upstream outputs для E${String(event.step).padStart(2, "0")}.`;
    const handoff = override.handoff ?? engagement.next ?? event.next;

    return {
      eventStep: event.step,
      agentId,
      role: override.role ?? agent.output.primary,
      action: override.action ?? `${agent.description} В E${String(event.step).padStart(2, "0")} capability применяется только в пределах: ${event.scopeBoundary}`,
      input,
      output,
      handoff,
      evidence: [
        `CASE FACT E${String(event.step).padStart(2, "0")}: ${event.narrative}`,
        `EVENT BOUNDARY: ${event.scopeBoundary}`,
        `CANONICAL ROLE ${String(agent.id).padStart(2, "0")}: ${agent.description} Deliverable — ${agent.output.primary}.`,
      ],
      necessity,
      condition: override.condition ?? (standby.has(agentId) ? "Исключение активируется только при подтверждённом trigger." : undefined),
      activation,
      necessityRationale: override.rationale ?? engagement.why,
      absenceImpact: `Без output «${output}» Event E${String(event.step).padStart(2, "0")} не сможет доказуемо передать результат downstream consumer: ${handoff}`,
      overlapNote: override.overlapNote,
      provenance: event.auditStatus === "approved" ? "case-observed" : "expert-proposed",
      validationStatus: override.validationStatus ?? (event.auditStatus === "approved" ? "confirmed" : "working"),
    } satisfies EventAgentExecution;
  });
});

export const case1EventAudits: CaseEventAudit[] = case1EventBlueprints.map((event) => ({
  eventStep: event.step,
  auditVersion: `E${String(event.step).padStart(2, "0")} · V2`,
  status: event.auditStatus ?? "in-review",
  scopeBoundary: event.scopeBoundary,
  missingAgentFinding: event.missingAgentFinding,
  missingAgentIds: [],
  movedInAgentIds: event.step === 2 ? [15] : event.step === 7 ? [25] : event.step === 8 ? [18, 20] : event.step === 21 ? [62] : undefined,
  movedOutAgentIds: event.step === 1 ? [15] : event.step === 2 ? [17, 18, 19, 20] : event.step === 6 ? [25] : event.step === 10 ? [62] : undefined,
  addedAgentIds: event.step === 9 ? [38] : undefined,
  removedAgentIds: event.step === 14 ? [55] : event.step === 16 ? [2] : undefined,
}));

export const case1AuditSummary: CaseAuditSummary = {
  auditedEventCount: case1EventAudits.length,
  eventAgentFindingCount: case1EventAgentExecutions.length,
  retainedAssignmentCount: case1EventAgentExecutions.filter((item) => (item.necessity === "justified" || item.necessity === "conditional") && item.validationStatus !== "needs-review").length,
  conditionalAssignmentCount: case1EventAgentExecutions.filter((item) => item.necessity === "conditional").length,
  addedAgentIds: [38],
  movedAssignments: [
    { agentId: 15, fromEventStep: 1, toEventStep: 2, reason: "Classification consumes the normalized E01 notice; it is not part of the external publication boundary." },
    { agentId: 25, fromEventStep: 6, toEventStep: 7, reason: "Eligibility requires both tender rules E06 and verified company profile E04." },
    { agentId: 18, fromEventStep: 2, toEventStep: 8, reason: "Market enrichment runs in PB01 after E02 and completes as a BID-gate input." },
    { agentId: 20, fromEventStep: 2, toEventStep: 8, reason: "Buyer/competitor enrichment is parallel context for E08, not core triage execution." },
    { agentId: 62, fromEventStep: 10, toEventStep: 21, reason: "Canonical trigger is an effective contract; pre-bid solution design is owned by Agents 39/36/07." },
    { agentId: 59, fromEventStep: 17, toEventStep: 18, reason: "External Buyer request and company response are now separate Events with distinct Actors and outputs." },
  ],
  removedAssignments: [
    { agentId: 17, eventStep: 2, retainedEventStep: 16, reason: "Deadline monitoring is persistent P04 infrastructure, not an E02 execution; Event-specific submission control remains E16." },
    { agentId: 19, eventStep: 2, retainedEventStep: 24, reason: "E02 reads ready P03 records. Agent 19 updates the persistent dataset only after verified Case close." },
    { agentId: 55, eventStep: 14, retainedEventStep: 12, reason: "Credentials Pack is produced once in E12 and consumed by proposal drafting." },
    { agentId: 2, eventStep: 16, retainedEventStep: 15, reason: "Human content/release approval occurs once in E15; E16 performs submission mechanics." },
  ],
  proposedMissingAgentIds: [],
  overlapFindings: [
    "Agents 13/04/21: acquisition owns primary source capture; Audit owns immutable lineage; Document Intake owns the working corpus.",
    "Agents 15/16/14: classification, deterministic exclusion and relevance ranking are sequentially distinct E02 outputs.",
    "Agents 18/19/20: Agent 19 maintains persistent award records; Agents 18/20 interpret those records for market and buyer/competitor decisions.",
    "Agents 24/25/31: Requirement Parser extracts tender facts; Eligibility evaluates mandatory qualification after E04; Match ranks company-specific fit.",
    "Agents 36/39/62: feasibility tests executability, Solution Architecture designs the pre-bid promise, Execution & Logistics starts after effective contract.",
    "Agents 57/61/63: Legal reviews risk/terms, Award-to-Contract controls transition/signing, Contract Administration controls post-signing obligations/payments.",
  ],
  unresolvedFindings: [],
  canonicalRegistryImplications: [
    "No canonical Agent ID, name, tier, Layer or Platform Side changed.",
    "Case 1 now distinguishes Event execution from persistent/background data production; this distinction should remain visible in future Case audits.",
    "P01 policy and P02 provisional profile are Case-level prerequisites. Their ownership is explicit even though they are not numbered tender Events.",
    "No merge/split/new Agent is justified by Event 02 after prerequisites and consumer handoffs are represented.",
  ],
};

if (case1EventAudits.length !== 24 || case1EventAudits.length !== case1EventBlueprints.length) throw new Error("Case 1 needs one audit per redesigned Event.");
if (new Set(case1EventAudits.map((audit) => audit.eventStep)).size !== case1EventAudits.length) throw new Error("Case 1 Event Audit steps must be unique.");
if (case1EventAgentExecutions.some((item) => !case1EventAudits.some((audit) => audit.eventStep === item.eventStep))) throw new Error("Every Event Agent Execution needs an audited Event.");
if (case1EventAudits.some((audit) => !case1EventAgentExecutions.some((item) => item.eventStep === audit.eventStep))) throw new Error("Every Event needs at least one Event Agent finding, including conditional standby gates.");
if (new Set(case1EventAgentExecutions.map((item) => `${item.eventStep}:${item.agentId}`)).size !== case1EventAgentExecutions.length) throw new Error("Case 1 Event × Agent findings must be unique.");
if (case1EventAgentExecutions.some((item) => item.necessity === "conditional" && !item.condition)) throw new Error("Every conditional Event Agent assignment needs an explicit condition.");
