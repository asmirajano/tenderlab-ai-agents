import { agents } from "../../packages/catalog-data/src/agents.ts";
import type { CaseAuditSummary, CaseEventAudit, EventAgentExecution } from "../process-model.ts";
import { case9Engagements } from "./case-9-data.ts";
import { case9EventBlueprints } from "./case-9-orchestration.ts";
import { datasetImpactForAgent } from "./case-2-event-audits.ts";

const agentById = new Map(agents.map((agent) => [agent.id, agent]));
const engagementByAgentId = new Map(case9Engagements.map((item) => [item.agentId, item]));

const outputOverrides: Record<string, string> = {
  "1-62": "Affected-work safe-state and actual execution-status record.",
  "2-1": "Governed post-award Claim Case graph and authority boundaries.",
  "3-21": "Hashed effective-contract corpus and accepted programme/BOQ manifest.",
  "3-29": "Instruction-versus-baseline change map and affected-work routing.",
  "4-17": "Notice clock: transmitted day 3 of contractual 28-day limit.",
  "5-3": "Source-linked site-condition evidence package with custody/confidence.",
  "6-39": "Mitigation design: utility relocation + staged dewatering + unaffected-work continuity.",
  "6-62": "Revised workfront/status model and human-planner fragnet inputs.",
  "7-46": "Three specialist quotations normalized by scope, unit, validity and exclusions.",
  "7-50": "Claim cost build-up $8.70m with actual/forecast split and no double count.",
  "8-57": "Counsel-reviewed entitlement/risk memo; legal opinion remains human-owned.",
  "8-63": "Detailed claim particulars, continuing-record and contract-state register.",
  "10-63": "Submitted claim record day 71/84, receipt and frozen baseline.",
  "12-50": "Particulars cost response tied to pump logs, tickets and unchanged quantum baseline.",
  "13-29": "Engineer determination delta: claim $8.70m/112d → $4.90m/63d.",
  "15-60": "DAB hearing chronology, exhibit map, objections and approved concession boundaries.",
  "16-29": "Accepted DAB decision delta: determination → $6.40m/84d final state.",
  "17-63": "Effective VO-07 contract register: +$6.40m, +84 days, revised milestones.",
  "18-62": "Revised execution status and milestone evidence under VO-07.",
  "19-64": "Outcome record comparing requested, Engineer-determined and DAB/final values/time.",
};

const handoffOverrides: Record<number, string> = {
  1: "Claim governance E02 and parallel contract/site evidence Processes.", 2: "Contract baseline E03 and investigation E05.", 3: "Timely notice E04; delay/quantum workstreams.", 4: "Detailed claim E08.",
  5: "Mitigation/delay E06 and quantum E07.", 6: "Detailed claim E08.", 7: "Detailed claim E08.", 8: "Claim authority E09.", 9: "Human submission E10.",
  10: "Engineer review/particulars E11.", 11: "Bounded response E12.", 12: "Engineer determination E13.", 13: "Dispute gate E14.", 14: "DAB referral/hearing E15.",
  15: "Independent DAB decision E16.", 16: "Variation Order E17.", 17: "Revised execution/certification E18.", 18: "Payment and closure E19.", 19: "Project controls + future learning.",
};

export const case9EventAgentExecutions: EventAgentExecution[] = case9EventBlueprints.flatMap((event) => {
  const active = event.agentIds.map((agentId) => ({ agentId, activation: "triggered" as const }));
  const standby = (event.standbyAgentIds ?? []).map((agentId) => ({ agentId, activation: "standby" as const }));
  return [...active, ...standby].map(({ agentId, activation }) => {
    const agent = agentById.get(agentId);
    const engagement = engagementByAgentId.get(agentId);
    if (!agent || !engagement) throw new Error(`Unknown Case 9 Agent ${agentId} at E${event.step}.`);
    const conditional = engagement.status === "conditional";
    return {
      eventStep: event.step, agentId, role: agent.description,
      action: `${agent.profile.activities[0] ?? agent.description} в границе E${String(event.step).padStart(2, "0")}.`,
      input: `${event.trigger} · ${agent.profile.typicalInputs.slice(0, 2).join(" · ")}`,
      output: outputOverrides[`${event.step}-${agentId}`] ?? agent.output.primary,
      handoff: handoffOverrides[event.step], datasetImpact: datasetImpactForAgent(agentId),
      evidence: [event.result, `Canonical Agent ${String(agentId).padStart(2, "0")} responsibility`, event.scopeBoundary],
      necessity: conditional ? "conditional" as const : "justified" as const,
      condition: conditional ? engagement.condition : undefined, activation: conditional ? activation : undefined,
      necessityRationale: conditional ? (engagement.condition ?? "Observable condition required") : `Без ${agent.name} отсутствует отдельный canonical output «${agent.output.primary}».`,
      absenceImpact: conditional ? `При срабатывании trigger отсутствовал бы ${agent.output.primary}.` : `Event не может доказуемо передать ${agent.output.primary} downstream consumer.`,
      overlapNote: agentId === 29 ? "Change impact/version delta does not establish legal entitlement, delay causation or claim quantum." : agentId === 50 ? "Cost build-up does not decide compensability and is not a bid price." : agentId === 60 ? "Prepares authorised humans; counsel files/argues and DAB decides." : undefined,
      provenance: "expert-proposed" as const, validationStatus: "working" as const,
    };
  });
});

export const case9EventAudits: CaseEventAudit[] = case9EventBlueprints.map((event) => ({
  eventStep: event.step, auditVersion: "V1 · CASE 9 FIDIC CLAIM", status: "in-review", scopeBoundary: event.scopeBoundary,
  missingAgentFinding: event.missingAgentFinding, missingAgentIds: [], unresolvedFinding: [3, 6, 7, 8, 14, 17, 18, 19].includes(event.step) ? event.missingAgentFinding : undefined,
}));

export const case9AuditSummary: CaseAuditSummary = {
  auditedEventCount: case9EventAudits.length,
  eventAgentFindingCount: case9EventAgentExecutions.length,
  retainedAssignmentCount: case9EventAgentExecutions.filter((item) => item.necessity === "justified").length,
  conditionalAssignmentCount: case9EventAgentExecutions.filter((item) => item.necessity === "conditional").length,
  addedAgentIds: [], movedAssignments: [], removedAssignments: [], proposedMissingAgentIds: [],
  overlapFindings: [
    "Agents 29/57/63: change impact, legal clause/entitlement support and contractual/financial administration are distinct; none alone owns the claim.",
    "Agents 39/62 versus human planner: mitigation/execution state supplies schedule inputs but does not prove critical-path delay causation.",
    "Agents 46/50/63: quote normalization, cost build-up and contract-register accounting must not double count or decide compensability.",
    "Agent 60 may prepare a DAB hearing within human-authority boundaries; it does not become counsel or adjudicator.",
  ],
  unresolvedFindings: [
    "Canonical registry lacks a Contract Claims / Entitlement / Dispute orchestration Agent for notice-to-claim-to-determination-to-referral lifecycle.",
    "Canonical registry lacks a Schedule / Delay Analysis Agent for critical-path causation, concurrency, mitigation and EOT quantum.",
    "Agent 50 is explicitly bid/landed-cost oriented; post-award claim quantum applicability requires scope clarification or a separate capability.",
    "Agent 29 supports semantic change impact, but post-award Variation consumers and handoff to Contract Administration are not explicit.",
  ],
  canonicalRegistryImplications: [
    "Case 9 validates that a Case may start after effective contract; discovery, Match, Bid/No-Bid and proposal Agents remain correctly skipped.",
    "Agents 62 and 63 become core lifecycle controls but still cannot replace Contractor, Engineer, Employer or DAB authority.",
    "Agent 60 is validated for human hearing preparation beyond bid-stage negotiation without expanding into legal representation.",
    "Repeated post-award claim gaps should be tested against future Cases before canonical Agents are added or split.",
  ],
};

const executionKeys = case9EventAgentExecutions.map((item) => `${item.eventStep}:${item.agentId}`);
if (executionKeys.length !== new Set(executionKeys).size) throw new Error("Case 9 Event × Agent findings must be unique.");
if (case9EventAgentExecutions.some((item) => !item.input || !item.output || !item.handoff || !item.datasetImpact?.length)) throw new Error("Every Case 9 execution needs input, output, handoff and Dataset impact.");
if (case9EventAgentExecutions.some((item) => item.necessity === "conditional" && !item.condition)) throw new Error("Every conditional Case 9 execution needs a trigger.");
