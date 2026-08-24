import { agents } from "../../packages/catalog-data/src/agents.ts";
import type { CaseAuditSummary, CaseEventAudit, EventAgentExecution } from "../process-model.ts";
import { case4Engagements } from "./case-4-data.ts";
import { case4EventBlueprints } from "./case-4-orchestration.ts";
import { datasetImpactForAgent } from "./case-2-event-audits.ts";

const agentById = new Map(agents.map((agent) => [agent.id, agent]));
const engagementByAgentId = new Map(case4Engagements.map((item) => [item.agentId, item]));

const outputOverrides: Record<string, string> = {
  "1-13": "Normalized REOI source item, attachments, URL и source metadata.",
  "2-15": "Consultants/QCBS classification record: digital health · Rwanda · World Bank · one lot.",
  "3-31": "Pre-REOI Company × Opportunity Match 89% с evidence limitations.",
  "4-55": "Verified comparable-assignment and nominated-expert evidence pack.",
  "5-58": "Submitted EOI package, receipt, hash и frozen manifest.",
  "6-17": "42-day RFP calendar с two-envelope gates.",
  "7-26": "QCBS evaluation model: technical 80%, financial 20%, threshold 75/100.",
  "7-29": "Addendum 01 delta: expert availability form + revised deadline.",
  "8-25": "Conditional qualification Pass с local-expertise and availability conditions.",
  "8-33": "Prime consultant route с local specialist subcontractor, без JV.",
  "9-40": "Shortlist локальных privacy specialists с evidence и availability.",
  "10-35": "Approved BID recommendation с margin floor и no-substitution conditions.",
  "11-39": "Service methodology, workplan, governance и team architecture.",
  "11-55": "11 verified CV records с assignment references и signed availability.",
  "12-51": "Time-based remuneration schedule by expert-month + reimbursables.",
  "12-54": "Sealed financial proposal $4,62 млн.",
  "13-58": "Two independently sealed submission packages, hashes и receipts.",
  "14-59": "Two bounded clarification responses с clause/evidence citations.",
  "15-61": "Signed consultancy contract record и mobilization baseline.",
};

const handoffOverrides: Record<number, string> = {
  1: "Agent 15 → classification; P04 → deadline monitoring.",
  2: "NorthStar management → REOI decision E03.",
  3: "EOI evidence workflow E04.",
  4: "EOI strategy/QA/submission E05.",
  5: "Buyer shortlist wait E06.",
  6: "RFP intelligence E07 and qualification E08.",
  7: "Qualification, team design and BID gate.",
  8: "Local expertise closure E09 and final BID gate E10.",
  9: "Feasibility/risk pack E10 and technical proposal E11.",
  10: "Parallel technical E11 and financial E12 branches.",
  11: "Red team and submission E13.",
  12: "Sealed submission E13.",
  13: "Buyer technical evaluation E14.",
  14: "Negotiation and award-to-contract E15.",
  15: "Delivery team and P06 outcome learning.",
};

export const case4EventAgentExecutions: EventAgentExecution[] = case4EventBlueprints.flatMap((event) => {
  const active = event.agentIds.map((agentId) => ({ agentId, activation: "triggered" as const }));
  const standby = (event.standbyAgentIds ?? []).map((agentId) => ({ agentId, activation: "standby" as const }));
  return [...active, ...standby].map(({ agentId, activation }) => {
    const agent = agentById.get(agentId);
    const engagement = engagementByAgentId.get(agentId);
    if (!agent || !engagement) throw new Error(`Unknown Case 4 Agent ${agentId} at E${event.step}.`);
    const conditional = engagement.status === "conditional";
    return {
      eventStep: event.step,
      agentId,
      role: agent.description,
      action: `${agent.profile.activities[0] ?? agent.description} в границе E${String(event.step).padStart(2, "0")}.`,
      input: `${event.trigger} · ${agent.profile.typicalInputs.slice(0, 2).join(" · ")}`,
      output: outputOverrides[`${event.step}-${agentId}`] ?? agent.output.primary,
      handoff: handoffOverrides[event.step],
      datasetImpact: datasetImpactForAgent(agentId),
      evidence: [event.result, `Canonical Agent ${String(agentId).padStart(2, "0")} responsibility`, event.scopeBoundary],
      necessity: conditional ? "conditional" as const : "justified" as const,
      condition: conditional ? engagement.condition : undefined,
      activation: conditional ? activation : undefined,
      necessityRationale: conditional ? (engagement.condition ?? "Observable condition required") : `Без ${agent.name} отсутствует отдельный canonical output «${agent.output.primary}».`,
      absenceImpact: conditional ? `При срабатывании trigger отсутствовал бы ${agent.output.primary}.` : `Event не может доказуемо передать ${agent.output.primary} downstream consumer.` ,
      overlapNote: agentId === 38 ? "Integrity/conflict screening не заменяет legal contract interpretation Agent 57." : agentId === 55 ? "Bid credentials и individual expert CV evidence требуют явной внутренней границы." : undefined,
      provenance: "expert-proposed" as const,
      validationStatus: "working" as const,
    };
  });
});

export const case4EventAudits: CaseEventAudit[] = case4EventBlueprints.map((event) => ({
  eventStep: event.step,
  auditVersion: "V1 · CASE 4 QCBS",
  status: "in-review",
  scopeBoundary: event.scopeBoundary,
  missingAgentFinding: event.missingAgentFinding,
  missingAgentIds: [],
  unresolvedFinding: [4, 6, 9, 10, 11, 12].includes(event.step) ? event.missingAgentFinding : undefined,
}));

export const case4AuditSummary: CaseAuditSummary = {
  auditedEventCount: case4EventAudits.length,
  eventAgentFindingCount: case4EventAgentExecutions.length,
  retainedAssignmentCount: case4EventAgentExecutions.filter((item) => item.necessity === "justified").length,
  conditionalAssignmentCount: case4EventAgentExecutions.filter((item) => item.necessity === "conditional").length,
  addedAgentIds: [],
  movedAssignments: [],
  removedAssignments: [],
  proposedMissingAgentIds: [],
  overlapFindings: [
    "Agents 10 and 55: certificates/validity versus bid-specific key-expert CV and assignment evidence.",
    "Agents 38 and 57: integrity/conflict screening versus legal interpretation of conflict and contract clauses.",
    "Agents 51 and 54: time-based calculation schedule versus final financial-envelope narrative/forms.",
    "Agents 08, 12 and 40: entity verification, capability graph and partner discovery remain distinct in local-expert selection.",
  ],
  unresolvedFindings: [
    "Canonical registry does not explicitly own EOI→shortlist lifecycle; current route composes Agents 52/55/56/58 plus Buyer decision.",
    "Agent 55 scope does not yet explicitly distinguish organisational references from named Key Expert CV/availability validation.",
    "Pricing & BOQ Agent works for time-based consultancy pricing, but its canonical name may imply goods/works only.",
    "Privacy/cybersecurity subject-matter compliance is covered by technical/legal review plus human SME; dedicated Agent is not yet justified.",
  ],
  canonicalRegistryImplications: [
    "Case 4 validates that Consultants/QCBS is not a cosmetic variant of Goods or Works procurement.",
    "Two-envelope information barriers are workflow controls; they should not be represented as a new Agent solely for UI convenience.",
    "Agents 43–46 and 50 remain legitimately unused because consulting teams are not supplier/RFQ/landed-price chains.",
    "Key Expert evidence, shortlist state and conflict-of-interest boundaries require Agent-by-Agent review before any registry change.",
  ],
};

const executionKeys = case4EventAgentExecutions.map((item) => `${item.eventStep}:${item.agentId}`);
if (executionKeys.length !== new Set(executionKeys).size) throw new Error("Case 4 Event × Agent findings must be unique.");
if (case4EventAgentExecutions.some((item) => !item.input || !item.output || !item.handoff || !item.datasetImpact?.length)) throw new Error("Every Case 4 execution needs input, output, handoff and Dataset impact.");
if (case4EventAgentExecutions.some((item) => item.necessity === "conditional" && !item.condition)) throw new Error("Every conditional Case 4 execution needs a trigger.");
