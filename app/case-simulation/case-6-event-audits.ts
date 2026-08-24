import { agents } from "../../packages/catalog-data/src/agents.ts";
import type { CaseAuditSummary, CaseEventAudit, EventAgentExecution } from "../process-model.ts";
import { case6Engagements } from "./case-6-data.ts";
import { case6EventBlueprints } from "./case-6-orchestration.ts";
import { datasetImpactForAgent } from "./case-2-event-audits.ts";

const agentById = new Map(agents.map((agent) => [agent.id, agent]));
const engagementByAgentId = new Map(case6Engagements.map((item) => [item.agentId, item]));

const outputOverrides: Record<string, string> = {
  "2-15": "Classification: Goods · fertilizer · Brazil · reverse auction · one lot.",
  "2-16": "Filtered-in opportunity with explicit geography/capability policy reasons.",
  "2-14": "Ranked opportunity shortlist: relevance 91%, confidence and caveats.",
  "3-20": "Buyer/competitor pre-assessment dossier with auction-pattern caveats.",
  "4-22": "Searchable Portuguese access corpus for three scanned annexes; source remains authoritative.",
  "4-29": "Addendum 02 delta: authorization form and auction date +2 days.",
  "5-33": "Single-prime trader route: 2 OEM + local importer; no JV.",
  "6-44": "Verified dossiers for 2 OEM and 1 importer with capacity/registration status.",
  "7-46": "Comparable quote book by tonne, currency, Incoterm, validity and exclusions.",
  "8-30": "Submitted clarification and official Buyer answer on registration cut-off.",
  "9-18": "Fertilizer market brief and defensible $418–$462/t corridor.",
  "9-20": "Competitor/Buyer dossier with registration-risk watchlist.",
  "10-50": "Delivered landed-cost scenarios by OEM/importer and 12 warehouses.",
  "10-51": "Auction model: initial $470/t; human-approved floor $440/t.",
  "11-35": "Approved BID protocol with auction floor and complaint reserve.",
  "14-58": "Submitted package, receipt, hashes and frozen pre-auction baseline.",
  "15-51": "Human-control price dashboard; final AtlasAgri $440/t without autonomous bidding.",
  "16-20": "Evidence-linked registration anomaly; no automated disqualification conclusion.",
  "17-57": "Legal grounds/remedy memo scoped to re-evaluation, not direct award.",
  "18-57": "Human-approved complaint package reviewed for clause, standing and remedy scope.",
  "19-29": "Review-decision impact: award suspended → bounded qualification re-evaluation.",
  "20-25": "Re-evaluation qualification record: provisional winner Fail; AtlasAgri Pass.",
  "21-59": "Bounded validity/security confirmation without price or qualification change.",
  "21-61": "Final award-to-contract reconciliation pack at $10,56m.",
  "22-61": "Signed contract record, security and 120-day mobilization baseline.",
};

const handoffOverrides: Record<number, string> = {
  1: "P03 source pipeline → E02 classification/filtering/discovery.", 2: "AtlasAgri assessment gate E03.", 3: "Parallel tender model E04 and company route E05.",
  4: "Qualification E05, clarification E08 and pricing E10.", 5: "Supplier/OEM route E06.", 6: "Controlled RFQ E07.", 7: "Commercial/auction model E10.",
  8: "BID evidence E11 and review evidence P08.", 9: "Auction economics E10.", 10: "Human BID gate E11.", 11: "Parallel proposal branches E12/E13.",
  12: "QA/submission E14.", 13: "QA/submission E14.", 14: "Human live auction E15.", 15: "Provisional award wait E16.",
  16: "Complaint decision gate E17.", 17: "Human/counsel filing E18.", 18: "Independent review E19.", 19: "Buyer re-evaluation E20.",
  20: "Bounded confirmation/final award E21.", 21: "Contract signing E22.", 22: "Operations handoff + P09 learning.",
};

export const case6EventAgentExecutions: EventAgentExecution[] = case6EventBlueprints.flatMap((event) => {
  const active = event.agentIds.map((agentId) => ({ agentId, activation: "triggered" as const }));
  const standby = (event.standbyAgentIds ?? []).map((agentId) => ({ agentId, activation: "standby" as const }));
  return [...active, ...standby].map(({ agentId, activation }) => {
    const agent = agentById.get(agentId);
    const engagement = engagementByAgentId.get(agentId);
    if (!agent || !engagement) throw new Error(`Unknown Case 6 Agent ${agentId} at E${event.step}.`);
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
      absenceImpact: conditional ? `При срабатывании trigger отсутствовал бы ${agent.output.primary}.` : `Event не может доказуемо передать ${agent.output.primary} downstream consumer.`,
      overlapNote: agentId === 57 && [17, 18].includes(event.step) ? "Legal review supports complaint content but does not own filing, authority or review-body decision." : agentId === 51 && event.step === 15 ? "Pricing supplies a floor/control model; human bidder owns every live price action." : undefined,
      provenance: "expert-proposed" as const,
      validationStatus: "working" as const,
    };
  });
});

export const case6EventAudits: CaseEventAudit[] = case6EventBlueprints.map((event) => ({
  eventStep: event.step,
  auditVersion: "V1 · CASE 6 REVERSE AUCTION + REMEDY",
  status: "in-review",
  scopeBoundary: event.scopeBoundary,
  missingAgentFinding: event.missingAgentFinding,
  missingAgentIds: [],
  unresolvedFinding: [5, 9, 15, 17, 18, 19].includes(event.step) ? event.missingAgentFinding : undefined,
}));

export const case6AuditSummary: CaseAuditSummary = {
  auditedEventCount: case6EventAudits.length,
  eventAgentFindingCount: case6EventAgentExecutions.length,
  retainedAssignmentCount: case6EventAgentExecutions.filter((item) => item.necessity === "justified").length,
  conditionalAssignmentCount: case6EventAgentExecutions.filter((item) => item.necessity === "conditional").length,
  addedAgentIds: [], movedAssignments: [], removedAssignments: [], proposedMissingAgentIds: [],
  overlapFindings: [
    "Agents 18 and 20: aggregate market/price intelligence versus Buyer/competitor-specific behaviour and evidence.",
    "Agents 37 and 51: commercial attractiveness/approved margin corridor versus executable BOQ and live-auction floor model.",
    "Agents 43/44 and 12/40: supplier discovery/verification versus reusable partner capability mapping and participation-route design.",
    "Agents 3/4/57: evidence provenance, versioned remedy state and legal interpretation support a complaint but none owns human filing or review authority.",
  ],
  unresolvedFindings: [
    "Canonical registry has no Procurement Complaint / Remedies Agent for standing, complaint package, filing lifecycle, remedy state and re-evaluation handoff.",
    "Agent 57 can review legal grounds but should not absorb complaint orchestration or authorised filing by scope creep.",
    "Agent 51 supports a reverse-auction floor, but canonical naming/contract should explicitly preserve human-only live bidding authority.",
    "Trader qualification is composed from company, supplier and participation Agents; a dedicated Trader Agent is not yet justified but should be monitored across future Cases.",
  ],
  canonicalRegistryImplications: [
    "Case 6 validates a negative/provisional-award path and formal remedy loop, not only successful first-pass submission.",
    "Market Intelligence (18) and Buyer & Competitor Intelligence (20) become mandatory Event work with distinct deliverables.",
    "A reverse auction is an Actor-controlled procurement mechanism; it must not be represented as autonomous Agent authority.",
    "Agents 41, 60, 62 and 63 remain legitimately unused because the Case has no JV, negotiation presentation, delivery execution or payment administration.",
  ],
};

const executionKeys = case6EventAgentExecutions.map((item) => `${item.eventStep}:${item.agentId}`);
if (executionKeys.length !== new Set(executionKeys).size) throw new Error("Case 6 Event × Agent findings must be unique.");
if (case6EventAgentExecutions.some((item) => !item.input || !item.output || !item.handoff || !item.datasetImpact?.length)) throw new Error("Every Case 6 execution needs input, output, handoff and Dataset impact.");
if (case6EventAgentExecutions.some((item) => item.necessity === "conditional" && !item.condition)) throw new Error("Every conditional Case 6 execution needs a trigger.");
