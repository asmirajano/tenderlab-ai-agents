import { agents } from "../../packages/catalog-data/src/agents.ts";
import type { CaseAuditSummary, CaseEventAudit, EventAgentExecution } from "../process-model.ts";
import { case8Engagements } from "./case-8-data.ts";
import { case8EventBlueprints } from "./case-8-orchestration.ts";
import { datasetImpactForAgent } from "./case-2-event-audits.ts";

const agentById = new Map(agents.map((agent) => [agent.id, agent]));
const engagementByAgentId = new Map(case8Engagements.map((item) => [item.agentId, item]));

const outputOverrides: Record<string, string> = {
  "1-13": "Normalized PPP RFQ/PQ publication, attachments, data-room index and technical source-item type.",
  "2-15": "PPP/DBFOM classification: concession · mixed scope · Peru · RFQ/PQ + competitive dialogue.",
  "3-2": "Approved assessment mandate with data rights, contact boundary, owner, budget and stop conditions.",
  "4-22": "Source-aligned Spanish/English corpus plus OCR text for two scanned land annexes.",
  "4-24": "126 atomic PQ requirements with sponsor/member/aggregate responsibility tags.",
  "4-26": "Pass/fail PQ model and shortlist decision evidence map.",
  "5-9": "Readiness 78/100 with consortium, finance and local-operating gaps kept distinct.",
  "5-25": "Conditional PQ pass tied to consortium coverage and committed-equity evidence.",
  "6-41": "Four-member consortium option with equity 40/25/20/15, workshare, voting and dependency map.",
  "7-44": "4/4 tender-specific member due-diligence dossiers and evidence exceptions.",
  "8-58": "Submitted PQQ manifest, signed files, hashes, timestamp and portal receipt.",
  "9-13": "Official shortlist/RFP publication bound to authorised dialogue data-room access.",
  "10-24": "214 source-linked RFP requirements, including payment, CP, land, grid and output obligations.",
  "10-30": "37 dialogue issues with source references, owners and ambiguity/risk classification.",
  "11-39": "Reference solution: 420 buses, three depots, 58 MW charging and 15-year O&M model.",
  "11-46": "Normalized OEM/charger quotations with warranty, efficiency, lead-time, FX and interface deltas.",
  "12-37": "Base/downside PPP business case with DSCR, FX, deductions and equity-return sensitivities.",
  "12-51": "BAFO availability-payment schedule with NPV $319.4m and approved pricing assumptions.",
  "13-57": "Land/grid/permit/safeguards legal dependency and conditions-precedent matrix.",
  "14-60": "Three approved dialogue scripts, concession boundaries and objection-response record.",
  "15-29": "Revised RFP 02 semantic delta and routed impact across 43 affected requirements.",
  "16-35": "Approved BAFO recommendation with member consent, price ceiling and withdrawal triggers.",
  "17-53": "Technical BAFO covering fleet, depots, charging, implementation, O&M and safeguards.",
  "18-54": "Financial BAFO schedules, payment mechanism, assumptions, equity letters and lender caveats.",
  "19-56": "Red-team record: three defects found and closed without changing authorised price/risk limits.",
  "19-58": "Submitted BAFO, immutable manifest, hashes, signatures and Authority receipt.",
  "20-59": "Bounded clarification response on lender support, charging redundancy and joint liability.",
  "20-60": "Authorised presentation and answer pack; no unapproved commercial concessions.",
  "21-61": "Signed-concession transition pack, securities, direct agreement and conditions-precedent register.",
  "21-41": "Approved shareholder/governance baseline linked to signed member decisions.",
  "22-61": "Completed CP checklist and evidence handoff; external financial-close and NTP states remain Actor-owned.",
  "22-64": "Outcome record linking PQ, dialogue, BAFO, preferred bidder, signing and financial close.",
};

const handoffOverrides: Record<number, string> = {
  1: "Agent 15 → PPP classification; P04 → procurement-state monitoring.",
  2: "VoltAxis Investment Committee → assessment gate E03.",
  3: "Parallel PQ model E04 and sponsor verification E05.",
  4: "Sponsor qualification E05 and consortium design E06.",
  5: "Consortium optimisation E06.",
  6: "Member consent and due-diligence gate E07.",
  7: "PQQ compliance/red-team/submission E08.",
  8: "Authority shortlist/RFP wait E09.",
  9: "RFP and dialogue model E10.",
  10: "Parallel technical E11, finance E12 and safeguards E13 branches.",
  11: "Controlled dialogue E14 and final technical BAFO E17.",
  12: "Controlled dialogue E14 and human BAFO gate E16.",
  13: "Controlled dialogue E14 and CP/risk registers.",
  14: "Authority Revised RFP wait E15.",
  15: "Human BAFO decision E16.",
  16: "Parallel technical E17 and financial E18 BAFO branches.",
  17: "Independent red team and submission E19.",
  18: "Independent red team and submission E19.",
  19: "Authority evaluation/clarification E20.",
  20: "Preferred-bidder negotiation E21.",
  21: "External CP, financing and NTP state E22.",
  22: "Project Company execution Case outside Case 8.",
};

export const case8EventAgentExecutions: EventAgentExecution[] = case8EventBlueprints.flatMap((event) => {
  const active = event.agentIds.map((agentId) => ({ agentId, activation: "triggered" as const }));
  const standby = (event.standbyAgentIds ?? []).map((agentId) => ({ agentId, activation: "standby" as const }));
  return [...active, ...standby].map(({ agentId, activation }) => {
    const agent = agentById.get(agentId);
    const engagement = engagementByAgentId.get(agentId);
    if (!agent || !engagement) throw new Error(`Unknown Case 8 Agent ${agentId} at E${event.step}.`);
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
      overlapNote: agentId === 12 || agentId === 40 || agentId === 41 ? "Reusable partner graph, case-specific discovery and consortium optimisation require distinct entity, consent and governance outputs." : agentId === 33 ? "Participation Route chooses organisational role; Agent 41 optimises the approved consortium composition and governance." : agentId === 37 || agentId === 50 || agentId === 51 || agentId === 54 ? "PPP bankability, lifecycle cost, pricing schedule and commercial forms share assumptions but produce different decisions/artifacts." : agentId === 30 || agentId === 60 ? "Clarification issue management and dialogue/negotiation preparation need procedure-specific boundaries." : agentId === 57 || agentId === 61 ? "Clause/risk review and award-to-contract/CP transition must not collapse into one contract owner." : undefined,
      provenance: "expert-proposed" as const,
      validationStatus: "working" as const,
    };
  });
});

const unresolvedEventSteps = new Set([6, 7, 10, 12, 13, 14, 18, 21, 22]);

export const case8EventAudits: CaseEventAudit[] = case8EventBlueprints.map((event) => ({
  eventStep: event.step,
  auditVersion: "V1 · CASE 8 PPP COMPETITIVE DIALOGUE",
  status: "in-review",
  scopeBoundary: event.scopeBoundary,
  missingAgentFinding: event.missingAgentFinding,
  missingAgentIds: [],
  unresolvedFinding: unresolvedEventSteps.has(event.step) ? event.missingAgentFinding : undefined,
}));

export const case8AuditSummary: CaseAuditSummary = {
  auditedEventCount: case8EventAudits.length,
  eventAgentFindingCount: case8EventAgentExecutions.length,
  retainedAssignmentCount: case8EventAgentExecutions.filter((item) => item.necessity === "justified").length,
  conditionalAssignmentCount: case8EventAgentExecutions.filter((item) => item.necessity === "conditional").length,
  addedAgentIds: [],
  movedAssignments: [],
  removedAssignments: [],
  proposedMissingAgentIds: [],
  overlapFindings: [
    "Agents 12, 40 and 41: reusable partner capability graph, case-specific partner discovery and consortium/JV optimisation need explicit consent/governance boundaries.",
    "Agents 33 and 41: participation role/workshare selection versus detailed consortium composition, equity and reserved-matter optimisation.",
    "Agents 37, 50, 51 and 54: long-term PPP bankability, lifecycle cost, availability-payment pricing and final commercial forms share assumptions but must retain distinct outputs.",
    "Agents 30 and 60: clarification-question workflow versus interactive competitive-dialogue/negotiation preparation.",
    "Agents 57 and 61: contract clause/risk review versus award-to-contract, securities and conditions-precedent transition.",
    "Agents 08 and 44: sponsor/member company verification versus tender-specific partner/vendor due diligence.",
  ],
  unresolvedFindings: [
    "No canonical Agent owns project-finance bankability, lender due diligence, financing plan and financial-close readiness; Agent 37 is stretched beyond ordinary pre-bid commercial attractiveness.",
    "Environmental/social safeguards, land and grid permitting have no explicit canonical Agent; Technical/Legal/Risk plus mandatory human specialists currently compose the work.",
    "Agent 41 covers consortium optimisation but not clearly post-award SPV/shareholder governance, reserved matters and equity-funding state.",
    "Competitive dialogue sits between Agents 30 and 60; current scopes do not explicitly distinguish written clarification, structured dialogue and preferred-bidder negotiation.",
    "Agent 61 tracks concession signing and conditions precedent, but financial close remains an external state without a dedicated evidence/workflow owner.",
    "Agent 51 again supports a non-BOQ payment/tariff schedule, reinforcing the need to clarify its canonical pricing scope rather than create an automatic duplicate Agent.",
  ],
  canonicalRegistryImplications: [
    "Case 8 validates the first PPP/DBFOM route with RFQ/PQ, competitive dialogue, BAFO, preferred bidder, concession signing and financial close.",
    "Agent 41 becomes indispensable rather than merely optional: solo participation is impossible and member consent/governance is an eligibility dependency.",
    "Lenders, member boards, Authority and licensed specialists remain Actors with exclusive authority; Agent scores and models cannot commit capital, approve permits or declare NTP.",
    "Agents 62 and 63 remain legitimately unused because construction, delivery, certified payments and O&M begin only after the explicit Case 8 terminal boundary.",
    "The financial-close gap is evidenced without inventing or silently adding a 65th Agent; canonical registry change requires separate review.",
  ],
};

const executionKeys = case8EventAgentExecutions.map((item) => `${item.eventStep}:${item.agentId}`);
if (executionKeys.length !== new Set(executionKeys).size) throw new Error("Case 8 Event × Agent findings must be unique.");
if (case8EventAgentExecutions.some((item) => !item.input || !item.output || !item.handoff || !item.datasetImpact?.length)) throw new Error("Every Case 8 execution needs input, output, handoff and Dataset impact.");
if (case8EventAgentExecutions.some((item) => item.necessity === "conditional" && !item.condition)) throw new Error("Every conditional Case 8 execution needs a trigger.");
