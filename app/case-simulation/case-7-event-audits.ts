import { agents } from "../../packages/catalog-data/src/agents.ts";
import type { CaseAuditSummary, CaseEventAudit, EventAgentExecution } from "../process-model.ts";
import { case7Engagements } from "./case-7-data.ts";
import { case7EventBlueprints } from "./case-7-orchestration.ts";
import { datasetImpactForAgent } from "./case-2-event-audits.ts";

const agentById = new Map(agents.map((agent) => [agent.id, agent]));
const engagementByAgentId = new Map(case7Engagements.map((item) => [item.agentId, item]));

const outputOverrides: Record<string, string> = {
  "1-21": "Versioned original contract, signed lab report, sample-custody manifest and acceptance status.",
  "1-63": "Original-contract register showing zero accepted quantity, active security and failed tranche.",
  "2-1": "Recovery Case graph with authority gates, parallel remedy/continuity branches and stop conditions.",
  "2-2": "Named Buyer decision owners and recorded 48-hour analysis mandate.",
  "3-57": "Clause-linked remedy memo covering cure, partial termination, rejection and performance security.",
  "3-63": "$0,78m claim basis, guarantee expiry and authorised-notice checklist.",
  "4-24": "86 source-linked replacement requirements with safety, quantity and delivery obligations.",
  "4-26": "Pass/fail safety gate plus approved 70:30 evaluated-price model.",
  "4-27": "Controlled limited-RFQ forms, declarations, price schedule and delivery template.",
  "5-15": "Goods · emergency replacement · limited international RFQ classification record.",
  "5-57": "Approved legal action checklist, not a machine-issued termination decision.",
  "6-43": "Ranked seven-candidate market scan narrowed to five authorised invitees.",
  "6-11": "Supplier performance and capacity evidence for shortlisted shelter manufacturers.",
  "7-44": "Five supplier due-diligence dossiers with identity, capacity, certificates and risk ratings.",
  "7-25": "Qualification result for each invitee against RFQ minimum criteria.",
  "8-45": "Identical five-recipient RFQ issue log and controlled response tracker.",
  "8-13": "Canonical source record for issued RFQ, attachments, recipients and publication metadata.",
  "9-29": "Corrigendum 01 delta clarifying fire-test method while preserving deadline and evaluation rules.",
  "10-46": "Four-offer normalized quotation table: units, currency, Incoterms, taxes, lead time and exclusions.",
  "10-50": "Comparable landed-cost scenarios from $6,21m to $6,76m with transport/import assumptions.",
  "11-47": "86-row requirement-offer-evidence traceability matrix across four quotations.",
  "11-48": "Technical pass/deviation/unknown verdicts for shelter kit specifications and evidence.",
  "11-49": "Commercial responsiveness verdicts for price, validity, security, tax and delivery terms.",
  "11-26": "Signed 70:30 evaluation worksheet with named human evaluators and formula traceability.",
  "12-2": "Authorised award-recommendation record for EcoShelter Asia at $6,42m with conditions.",
  "13-57": "Issued partial-termination, rejection and $0,78m security-claim legal package.",
  "13-63": "Open incumbent claim register with deadlines, documents and no assumed cash recovery.",
  "14-61": "Award-to-contract checklist, securities, signing state and notice-to-proceed conditions.",
  "14-63": "New $6,42m contract register, 13-day milestone and acceptance/payment controls.",
  "15-62": "Live delivery plan and status for 12 000 kits across three staging hubs.",
  "16-62": "Inspection-ready lot register tied to samples, logistics evidence and contract milestones.",
  "16-3": "Provenance-linked independent inspection report with 100% sampled-unit Pass.",
  "17-63": "Buyer acceptance certificate and authorised payment-milestone state.",
  "18-63": "Paid replacement invoice plus separately open incumbent security-claim record.",
  "19-64": "Recovery learning record comparing failure, route, cost, timing, supplier and outcome predictions.",
  "19-11": "Verified EcoShelter delivery-performance update and incumbent default signal.",
};

const handoffOverrides: Record<number, string> = {
  1: "Recovery control E02 and original-contract remedy Process C7-P02.",
  2: "Parallel remedy analysis E03 and continuity requirement E04.",
  3: "Human recovery gate E05.",
  4: "Human recovery gate E05 and RFQ issue E08.",
  5: "Supplier market scan E06 plus authorised old-contract remedy branch E13.",
  6: "Supplier verification and qualification E07.",
  7: "Controlled RFQ issue E08.",
  8: "RFQ Q&A/change control E09 and quotation intake E10.",
  9: "Current RFQ version to quotation intake E10.",
  10: "Buyer evaluation evidence E11.",
  11: "Human award-recommendation gate E12.",
  12: "Parallel original remedy E13 and replacement contract E14.",
  13: "Claim administration E18 without blocking replacement delivery.",
  14: "Replacement mobilisation and delivery E15.",
  15: "Independent inspection E16 and Buyer acceptance join E17.",
  16: "Buyer acceptance gate E17.",
  17: "Payment and separate claim administration E18.",
  18: "Outcome learning and Case closure E19.",
  19: "Buyer operations, legal claim team and future recovery Cases.",
};

export const case7EventAgentExecutions: EventAgentExecution[] = case7EventBlueprints.flatMap((event) => {
  const active = event.agentIds.map((agentId) => ({ agentId, activation: "triggered" as const }));
  const standby = (event.standbyAgentIds ?? []).map((agentId) => ({ agentId, activation: "standby" as const }));
  return [...active, ...standby].map(({ agentId, activation }) => {
    const agent = agentById.get(agentId);
    const engagement = engagementByAgentId.get(agentId);
    if (!agent || !engagement) throw new Error(`Unknown Case 7 Agent ${agentId} at E${event.step}.`);
    const conditional = engagement.status === "conditional";
    return {
      eventStep: event.step,
      agentId,
      role: agent.description,
      action: `${agent.profile.activities[0] ?? agent.description} применительно к «${event.title}»; ${event.scopeBoundary}`,
      input: `${event.trigger} · ${agent.profile.typicalInputs.slice(0, 2).join(" · ")}`,
      output: outputOverrides[`${event.step}-${agentId}`] ?? `${agent.output.primary} для E${String(event.step).padStart(2, "0")} с case-scoped provenance.`,
      handoff: handoffOverrides[event.step],
      datasetImpact: datasetImpactForAgent(agentId),
      evidence: [event.result, `Canonical Agent ${String(agentId).padStart(2, "0")} responsibility`, event.scopeBoundary],
      necessity: conditional ? "conditional" as const : "justified" as const,
      condition: conditional ? engagement.condition : undefined,
      activation: conditional ? activation : undefined,
      necessityRationale: conditional ? (engagement.condition ?? "Observable condition required") : `Без ${agent.name} отсутствует отдельный canonical output «${agent.output.primary}» в данном work node.`,
      absenceImpact: conditional ? `При срабатывании trigger отсутствовал бы ${agent.output.primary}.` : `Downstream node не получил бы доказуемый ${agent.output.primary}.`,
      overlapNote: agentId === 8 || agentId === 44 ? "External supplier due diligence belongs to Agent 44; own-company verification Agent 08 remains excluded." : agentId >= 47 && agentId <= 49 ? "Buyer-side use provides traceability/domain verdicts only; evaluation score and award authority remain human and expose a scope-permission question." : agentId === 57 || agentId === 63 ? "Legal remedy opinion and contract/claim administration meet at explicit authorised notices; neither Agent owns both." : agentId === 48 || agentId === 62 ? "Pre-award technical compliance must not silently become post-award independent inspection/acceptance." : undefined,
      provenance: "expert-proposed" as const,
      validationStatus: "working" as const,
    };
  });
});

const unresolvedEventSteps = new Set([1, 3, 4, 5, 8, 9, 11, 13, 14, 16, 17, 18]);

export const case7EventAudits: CaseEventAudit[] = case7EventBlueprints.map((event) => ({
  eventStep: event.step,
  auditVersion: "V1 · CASE 7 BUYER-SIDE PROCUREMENT RECOVERY",
  status: "in-review",
  scopeBoundary: event.scopeBoundary,
  missingAgentFinding: event.missingAgentFinding,
  missingAgentIds: [],
  unresolvedFinding: unresolvedEventSteps.has(event.step) ? event.missingAgentFinding : undefined,
}));

export const case7AuditSummary: CaseAuditSummary = {
  auditedEventCount: case7EventAudits.length,
  eventAgentFindingCount: case7EventAgentExecutions.length,
  retainedAssignmentCount: case7EventAgentExecutions.filter((item) => item.necessity === "justified").length,
  conditionalAssignmentCount: case7EventAgentExecutions.filter((item) => item.necessity === "conditional").length,
  addedAgentIds: [],
  movedAssignments: [],
  removedAssignments: [],
  proposedMissingAgentIds: [],
  overlapFindings: [
    "Agents 08 and 44: own-company verification versus external supplier due diligence must remain entity-specific.",
    "Agents 26 and 47–49: evaluation model and compliance evidence do not together create Buyer evaluation/award authority.",
    "Agents 57 and 63: legal clause/remedy analysis versus continuing contract, claim and payment administration need an explicit authorised handoff.",
    "Agents 48 and 62: pre-award technical compliance and post-award delivery monitoring do not own independent goods inspection/Buyer acceptance.",
    "Agents 45 and 29 can preserve RFQ communications/change state, but neither may author Buyer technical answers or waive equal-information rules.",
  ],
  unresolvedFindings: [
    "Potential missing Buyer-side Procurement Planning & Procedure Justification capability for emergency/limited competition route governance.",
    "Potential missing Buyer-side Bid Evaluation & Award Recommendation workflow owner; Agents 25/26/47–50 cover components only.",
    "Potential missing Contract Remedy, Claims & Performance Security capability after supplier default; Agents 57/63 currently split the work.",
    "Potential missing Goods Inspection & Acceptance capability; external inspectors and Buyer committee own facts/authority while Agents 3/62/63 preserve state.",
    "Canonical platform-side permissions for Agents 45, 47–49 and 61 are bidder-centric or ambiguous when reused for a procuring entity.",
  ],
  canonicalRegistryImplications: [
    "Case 7 is the first full Buyer-side recovery route: it audits the 64 Agents without pretending TenderLab writes a supplier proposal.",
    "Thirty Agents are legitimately not involved because bidder-company, Bid/No-Bid, proposal, submission and negotiation work stays outside Buyer authority.",
    "Supplier Discovery/Verification, RFQ, Quote Normalization and Landed-Price form a defensible sourcing chain when selection remains human.",
    "Original-contract remedy and replacement procurement must remain parallel but separately authorised Processes.",
    "The open $0,78m security claim is handed off, not falsely closed; terminal Case state can contain an explicit downstream obligation.",
  ],
};

const executionKeys = case7EventAgentExecutions.map((item) => `${item.eventStep}:${item.agentId}`);
if (executionKeys.length !== new Set(executionKeys).size) throw new Error("Case 7 Event × Agent findings must be unique.");
if (case7EventAgentExecutions.some((item) => !item.input || !item.action || !item.output || !item.handoff || !item.datasetImpact?.length)) throw new Error("Every Case 7 execution needs input, action, output, handoff and Dataset impact.");
if (case7EventAgentExecutions.some((item) => item.necessity === "conditional" && !item.condition)) throw new Error("Every conditional Case 7 execution needs a trigger.");
