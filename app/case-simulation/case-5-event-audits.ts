import { agents } from "../../packages/catalog-data/src/agents.ts";
import type { CaseAuditSummary, CaseEventAudit, EventAgentExecution } from "../process-model.ts";
import { case5Engagements } from "./case-5-data.ts";
import { case5EventBlueprints } from "./case-5-orchestration.ts";
import { datasetImpactForAgent } from "./case-2-event-audits.ts";

const agentById = new Map(agents.map((agent) => [agent.id, agent]));
const engagementByAgentId = new Map(case5Engagements.map((item) => [item.agentId, item]));

const outputOverrides: Record<string, string> = {
  "1-13": "Normalized RFP source item, attachments, URL, publication type and provenance.",
  "2-15": "Non-consulting services classification: cold-chain logistics · Kenya · framework · best value.",
  "3-2": "Approved assessment mandate with data permission, owner and stop conditions.",
  "4-24": "148 source-linked requirements and 34 measurable SLA obligations.",
  "4-26": "Evaluation model: technical 60%, financial 40%, mandatory oral drill and technical threshold.",
  "4-29": "Addendum 02 delta: 72-hour emergency SLA + revised rate-card template.",
  "5-9": "Readiness 82/100 with surge-network and evidence gaps.",
  "5-25": "Conditional qualification Pass tied to six verified carriers and surge capacity.",
  "6-33": "Single-prime route with disclosed service subcontractors, no JV.",
  "7-43": "Six-carrier shortlist with route, capacity, cold-chain and geographic fit.",
  "8-44": "6/6 supplier due-diligence dossiers with risk and capacity ratings.",
  "9-45": "Controlled six-recipient service RFQ and response tracker.",
  "10-46": "Normalized trip rates, standby fees, fuel index, capacity and deviations.",
  "11-39": "Seven-hub service architecture, telemetry, surge and contingency model.",
  "11-51": "Route-based rate card and evaluated $11,96m base scenario.",
  "12-35": "Approved BID recommendation with price floor and framework safeguards.",
  "13-53": "Technical proposal: control tower, SLA methodology, hubs and continuity plan.",
  "14-54": "Commercial proposal with rate card, assumptions and zero-volume conditions.",
  "15-58": "Submitted bid package, signed forms, manifest, hashes and portal receipt.",
  "16-60": "Oral drill narrative, talking points and evidence-backed response plan.",
  "16-59": "Bounded clarification response on telemetry retention and backup hub.",
  "17-61": "Signed framework, securities, call-off rules and mobilisation checklist.",
  "18-63": "Validated Call-off 001 register with authorised scope, rates, SLA and funding.",
  "19-62": "Execution status: 640,000 doses, OTIF 98,7%, zero critical excursions.",
  "20-63": "Accepted milestone, invoice and Buyer payment-certificate record.",
  "20-64": "Outcome intelligence linking award, rate, SLA, carrier and first-call-off performance.",
};

const handoffOverrides: Record<number, string> = {
  1: "Agent 15 → classification; P04 → procurement-state monitoring.",
  2: "FrostLink management → assessment gate E03.",
  3: "Parallel RFP model E04 and bidder evidence E05.",
  4: "Qualification/route E05–E06 and proposal controls E13–E15.",
  5: "Route/feasibility E06 and network remediation E07.",
  6: "Network discovery E07 and final BID evidence E12.",
  7: "Carrier consent/verification gate E08.",
  8: "Service RFQ E09 and P05 network assurance.",
  9: "Quotation normalization E10.",
  10: "Service architecture and rate scenarios E11.",
  11: "Human BID gate E12.",
  12: "Parallel technical E13 and commercial E14 branches.",
  13: "Red team and submission E15.",
  14: "Red team and submission E15.",
  15: "Buyer evaluation/oral drill E16.",
  16: "Award-to-framework E17.",
  17: "P06 ready state and Buyer call-off wait E18.",
  18: "Execution control E19.",
  19: "Acceptance, payment and learning E20.",
  20: "Operations team and future call-offs outside Case 5.",
};

export const case5EventAgentExecutions: EventAgentExecution[] = case5EventBlueprints.flatMap((event) => {
  const active = event.agentIds.map((agentId) => ({ agentId, activation: "triggered" as const }));
  const standby = (event.standbyAgentIds ?? []).map((agentId) => ({ agentId, activation: "standby" as const }));
  return [...active, ...standby].map(({ agentId, activation }) => {
    const agent = agentById.get(agentId);
    const engagement = engagementByAgentId.get(agentId);
    if (!agent || !engagement) throw new Error(`Unknown Case 5 Agent ${agentId} at E${event.step}.`);
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
      overlapNote: agentId === 40 || agentId === 43 ? "Strategic partner/capability discovery и operational carrier sourcing должны иметь distinct candidate type and output." : agentId === 44 || agentId === 8 ? "Bidder verification и supplier/carrier due diligence используют общие evidence primitives, но разные evaluated entities." : agentId === 36 || agentId === 62 ? "Pre-bid feasibility не должна дублировать live post-award execution monitoring." : agentId === 61 || agentId === 63 ? "Framework establishment и continuing call-off administration требуют explicit handoff boundary." : undefined,
      provenance: "expert-proposed" as const,
      validationStatus: "working" as const,
    };
  });
});

const unresolvedEventSteps = new Set([4, 6, 7, 8, 11, 17, 18, 19, 20]);

export const case5EventAudits: CaseEventAudit[] = case5EventBlueprints.map((event) => ({
  eventStep: event.step,
  auditVersion: "V1 · CASE 5 PERFORMANCE FRAMEWORK",
  status: "in-review",
  scopeBoundary: event.scopeBoundary,
  missingAgentFinding: event.missingAgentFinding,
  missingAgentIds: [],
  unresolvedFinding: unresolvedEventSteps.has(event.step) ? event.missingAgentFinding : undefined,
}));

export const case5AuditSummary: CaseAuditSummary = {
  auditedEventCount: case5EventAudits.length,
  eventAgentFindingCount: case5EventAgentExecutions.length,
  retainedAssignmentCount: case5EventAgentExecutions.filter((item) => item.necessity === "justified").length,
  conditionalAssignmentCount: case5EventAgentExecutions.filter((item) => item.necessity === "conditional").length,
  addedAgentIds: [],
  movedAssignments: [],
  removedAssignments: [],
  proposedMissingAgentIds: [],
  overlapFindings: [
    "Agents 40, 42 and 43: strategic capability partner, local representation/coverage and operational service-vendor discovery need explicit entity-type boundaries.",
    "Agents 08 and 44: bidder/company verification versus tender-specific subcontractor due diligence share evidence but evaluate different entities and downstream decisions.",
    "Agents 36 and 62: pre-bid execution feasibility versus live post-award execution/SLA state.",
    "Agents 51 and 54: service rate-card calculation versus final commercial forms, assumptions and submission narrative.",
    "Agents 61 and 63: award-to-framework establishment versus recurring call-off, milestone and payment administration.",
  ],
  unresolvedFindings: [
    "No canonical Agent explicitly owns framework call-off lifecycle from authorised service order through acceptance; Agents 61, 62 and 63 currently compose it.",
    "Agent 62 mentions production/delivery/implementation but does not explicitly define performance-based service SLA, telemetry and exception monitoring.",
    "Supplier Discovery/Verification and RFQ Agents work for service subcontractors, but canonical terminology and examples may still imply goods suppliers.",
    "Pricing & BOQ Agent again supports a non-BOQ rate card, strengthening the Case 4 terminology concern without proving a separate pricing Agent is needed.",
    "Telemetry data retention, chain-of-custody and cold-chain compliance rely on Technical/Legal review plus human SME; dedicated regulated-logistics Agent is not yet justified.",
  ],
  canonicalRegistryImplications: [
    "Case 5 validates a non-consulting service framework with uncertain demand, recurring call-offs and measurable operational outcomes.",
    "Supplier/RFQ capabilities can support service-vendor procurement if entity type, licence, SLA and rate-card semantics are explicit.",
    "Buyer call-off, acceptance, score and payment-certificate authority remain external human/organisational actions, not Agent outputs.",
    "Agents 41 and 50 remain legitimately unused: subcontractors are not a JV and Buyer-owned vaccines do not create landed-price work.",
    "The first accepted call-off provides real post-award evidence for testing Agent 62/63/64 boundaries rather than ending at contract signature.",
  ],
};

const executionKeys = case5EventAgentExecutions.map((item) => `${item.eventStep}:${item.agentId}`);
if (executionKeys.length !== new Set(executionKeys).size) throw new Error("Case 5 Event × Agent findings must be unique.");
if (case5EventAgentExecutions.some((item) => !item.input || !item.output || !item.handoff || !item.datasetImpact?.length)) throw new Error("Every Case 5 execution needs input, output, handoff and Dataset impact.");
if (case5EventAgentExecutions.some((item) => item.necessity === "conditional" && !item.condition)) throw new Error("Every conditional Case 5 execution needs a trigger.");
