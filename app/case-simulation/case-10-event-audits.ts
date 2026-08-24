import { agents } from "../../packages/catalog-data/src/agents.ts";
import type { CaseAuditSummary, CaseEventAudit, EventAgentExecution } from "../process-model.ts";
import { case10Engagements } from "./case-10-data.ts";
import { case10EventBlueprints } from "./case-10-orchestration.ts";
import { datasetImpactForAgent } from "./case-2-event-audits.ts";

const agentById = new Map(agents.map((agent) => [agent.id, agent]));
const engagementByAgentId = new Map(case10Engagements.map((item) => [item.agentId, item]));

const outputOverrides: Record<string, string> = {
  "1-19": "Comparable-award acquisition queue and benchmark scope.",
  "2-22": "Aligned Romanian/English OCR corpus with page coordinates and confidence.",
  "3-19": "Eight comparable SOC awards normalised by value, route, winner and local operator.",
  "3-5": "Buyer–award–supplier–operator relationship graph with hypothesis labels.",
  "4-31": "Relevance/Match 86/100 with evidence denominator; no Bid authority.",
  "6-9": "Readiness 78/100 with two local-operator/clearance gaps.",
  "7-24": "137 atomic requirements linked to source clauses.",
  "8-25": "Eligibility gate: 9/11 pass, two local-operator gaps due Day 16.",
  "9-40": "Three-candidate partner shortlist with approved outreach purpose.",
  "10-44": "Consented CivicShield dossier V1 and verification plan.",
  "11-38": "Integrity risk 91/100 HIGH with uncertainty and escalation threshold.",
  "11-5": "Consented UBO and award-network relationships separated from public hypotheses.",
  "12-33": "Subcontract route remains possible only with Buyer-approved operator substitution.",
  "12-41": "Standby JV assessment: procedure does not permit post-deadline conversion.",
  "13-30": "Bounded clarification request with four questions and portal receipt.",
  "14-30": "Buyer answer closes post-deadline operator replacement route.",
  "15-37": "Commercial attractiveness 74/100 over five-year TCO; integrity excluded from the score.",
  "15-39": "Feasible sovereign SOC concept with 18 nodes and two data centres.",
  "16-35": "Board-approved No-Bid record with risk, approvers and stop instructions.",
  "17-1": "Blocked proposal/submission state; zero downstream bid executions.",
  "18-29": "Tender state transition: active invitation → officially cancelled; reissue watch opened.",
  "19-64": "Outcome learning: high fit + valid No-Bid + later external cancellation.",
};

const handoffs: Record<number, string> = {
  1: "Source reconstruction E02 and award intelligence E03.", 2: "Award/market analysis E03.", 3: "Opportunity prioritisation E04 and partner research E09.",
  4: "Assessment mandate E05.", 5: "Company and tender workstreams E06/E07.", 6: "Eligibility E08 and feasibility E15.", 7: "Eligibility E08 and clarification E13.",
  8: "Partner route E09.", 9: "Human outreach and partner consent E10.", 10: "Independent verification E11.", 11: "Remediation E12 and Board pack E16.",
  12: "Clarification E13 and feasibility E15.", 13: "Buyer response wait E14.", 14: "Board gate E16.", 15: "Board gate E16.", 16: "Controlled stop E17.",
  17: "Terminal convergence E19.", 18: "Cancellation/learning convergence E19.", 19: "Future reissue owner outside the 10-Case programme.",
};

export const case10EventAgentExecutions: EventAgentExecution[] = case10EventBlueprints.flatMap((event) => {
  const active = event.agentIds.map((agentId) => ({ agentId, activation: "triggered" as const }));
  const standby = (event.standbyAgentIds ?? []).map((agentId) => ({ agentId, activation: "standby" as const }));
  return [...active, ...standby].map(({ agentId, activation }) => {
    const agent = agentById.get(agentId);
    const engagement = engagementByAgentId.get(agentId);
    if (!agent || !engagement) throw new Error(`Unknown Case 10 Agent ${agentId} at E${event.step}.`);
    const conditional = engagement.status === "conditional";
    return {
      eventStep: event.step, agentId, role: agent.description,
      action: `${agent.profile.activities[0] ?? agent.description} within E${String(event.step).padStart(2, "0")} boundary.`,
      input: `${event.trigger} · ${agent.profile.typicalInputs.slice(0, 2).join(" · ")}`,
      output: outputOverrides[`${event.step}-${agentId}`] ?? agent.output.primary,
      handoff: handoffs[event.step], datasetImpact: datasetImpactForAgent(agentId),
      evidence: [event.result, `Canonical Agent ${String(agentId).padStart(2, "0")} responsibility`, event.scopeBoundary],
      necessity: conditional ? "conditional" as const : "justified" as const,
      condition: conditional ? engagement.condition : undefined, activation: conditional ? activation : undefined,
      necessityRationale: conditional ? (engagement.condition ?? "Observable condition required") : `Without ${agent.name}, E${event.step} lacks the distinct canonical output «${agent.output.primary}».`,
      absenceImpact: conditional ? `If triggered, the Case would lack ${agent.output.primary}.` : `Downstream consumer would lack ${agent.output.primary}.`,
      overlapNote: agentId === 15 ? "Classifies procurement/business dimensions after Agent 13 performs source-item acquisition and technical routing." : agentId === 19 ? "Historical award normalization is distinct from current opportunity discovery and Supplier verification." : agentId === 38 ? "Risk synthesis does not perform official investigation, legal determination or human No-Bid authority." : agentId === 44 ? "Verifies candidate evidence; Agent 12 models partner capability/relationships and Agent 38 evaluates resulting risk." : agentId === 30 ? "Pre-bid clarification is not negotiation and cannot reopen a closed rule without Buyer action." : undefined,
      provenance: "expert-proposed" as const, validationStatus: "working" as const,
    };
  });
});

export const case10EventAudits: CaseEventAudit[] = case10EventBlueprints.map((event) => ({
  eventStep: event.step, auditVersion: "V1 · CASE 10 INTEGRITY NO-BID", status: "in-review", scopeBoundary: event.scopeBoundary,
  missingAgentFinding: event.missingAgentFinding, missingAgentIds: [], unresolvedFinding: [3, 7, 9, 11, 16, 19].includes(event.step) ? event.missingAgentFinding : undefined,
}));

export const case10AuditSummary: CaseAuditSummary = {
  auditedEventCount: case10EventAudits.length,
  eventAgentFindingCount: case10EventAgentExecutions.length,
  retainedAssignmentCount: case10EventAgentExecutions.filter((item) => item.necessity === "justified").length,
  conditionalAssignmentCount: case10EventAgentExecutions.filter((item) => item.necessity === "conditional").length,
  addedAgentIds: [], movedAssignments: [], removedAssignments: [], proposedMissingAgentIds: [],
  overlapFindings: [
    "Agents 13/15: source-item classification needed for ingestion/routing remains separate from tender/business classification.",
    "Agents 5/12/19/44: relationship graph, partner capability, award history and current verification must retain different evidence and permission states.",
    "Agents 31/32/37/38/35: Match, solution fit, economics, integrity risk and final No-Bid answer different questions; no score overrides Board authority.",
    "Agents 30/57: clarification structuring and legal interpretation remain separate; Agent 60 negotiation is correctly not activated.",
    "Agents 33/40/41/42: participation route, partner discovery, JV optimisation and local representation are complementary, not interchangeable.",
  ],
  unresolvedFindings: [
    "No explicit Beneficial Ownership / Sanctions / Integrity Due Diligence Agent owns UBO, PEP, debarment and conflict screening across partners/suppliers.",
    "No explicit Cybersecurity / Data Protection / Security Architecture compliance Agent owns sovereign hosting, source-code escrow and security-control evidence; Agents 28/38/39/48 only partially cover it.",
    "Private partner-evidence retention, deletion and permitted learning rely on policy plus human data owner; no dedicated Privacy / Data Governance Agent exists.",
    "Agent 19 is validated as a distinct award-history analytical capability, but its handoff to Agents 5/11/20 should be made more explicit canonically.",
  ],
  canonicalRegistryImplications: [
    "Case 10 validates a governed No-Bid as a successful terminal business state rather than a failed or incomplete tender workflow.",
    "Agent 19 becomes Required for the first time; Agent 22 becomes Required rather than merely conditional because scan-only evidence is known at Case start.",
    "Stopped proposal/post-bid/award/execution Agents remain honest non-participants even though their blocked branch is visible.",
    "Official cancellation is a new source item and state transition; it does not retroactively authorise or justify the earlier Board decision.",
  ],
};

const executionKeys = case10EventAgentExecutions.map((item) => `${item.eventStep}:${item.agentId}`);
if (executionKeys.length !== new Set(executionKeys).size) throw new Error("Case 10 Event × Agent findings must be unique.");
if (case10EventAgentExecutions.some((item) => !item.input || !item.output || !item.handoff || !item.datasetImpact?.length)) throw new Error("Every Case 10 execution needs input, output, handoff and Dataset impact.");
if (case10EventAgentExecutions.some((item) => item.necessity === "conditional" && !item.condition)) throw new Error("Every conditional Case 10 execution needs a trigger.");
