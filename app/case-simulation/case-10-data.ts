import { agents } from "../../packages/catalog-data/src/agents.ts";
import type { CaseAgentEngagement, CaseStage, ConditionalActivation, EngagementStatus } from "./case-1-data.ts";

export const case10 = {
  id: "MD-EU-CYBER-2026-NB-010",
  name: "Cybersecurity tender: integrity-driven No-Bid and reissue watch",
  company: "SentinelGrid Oy",
  companyType: "Nordic cybersecurity integrator and managed-SOC provider",
  companyCountry: "Финляндия",
  organizer: "DEMO · Moldova National Cyber Resilience Office",
  organizerCountry: "Молдова",
  funding: "EU Neighbourhood cyber-resilience programme · national co-financing",
  tenderType: "Товары + non-consulting managed cybersecurity services",
  procurementMethod: "Restricted international tender after PIN/RFI · mandatory local security operator · one-stage final offer",
  subject: "Пятилетний sovereign SOC-as-a-Service: 24/7 monitoring, 18 sensor nodes, incident response, threat intelligence and protected data residency",
  lot: "1 tender · 1 lot · 1 managed-service contract",
  budget: "€42,0 млн ceiling · five-year TCO",
  quantity: "18 monitoring nodes · 2 sovereign data centres · 24/7 SOC · 5 years",
  submissionWindow: "35 дней после invitation · clarification cut-off Day 18",
  deliveryWindow: "9 месяцев mobilisation · 51 месяц managed service",
  situation: "SentinelGrid имеет высокий technical fit, но для допуска нужен security-cleared local operating subcontractor. Award-history graph и consented partner evidence выявляют скрытую beneficial-ownership связь кандидата с incumbent network и неполное раскрытие конфликта. Buyer clarification не разрешает заменить locked local operator после deadline. Board должен решить, остановить ли коммерчески привлекательную заявку до proposal/submission.",
  startingCondition: "Компания не имеет молдавского cleared operator и не знает о ownership conflict. TenderLab располагает procurement-plan signal и разрозненными prior-award records, часть которых существует только как Romanian scan PDFs.",
  trigger: "Публикация PIN/RFI, затем restricted invitation и legacy award/cancellation corpus по национальной SOC programme.",
  consultantRole: "TenderLab Consultant организует source, award, partner, integrity and No-Bid evidence; он не обвиняет Actors, не проводит official investigation, не выбирает partner, не подписывает clarification и не принимает Board decision.",
  monetization: "DEMO · fixed risk-assurance milestones; no success fee, referral commission or percentage of tender value.",
  consultantIncome: "DEMO · €165 000: €55 000 opportunity/award intelligence + €70 000 partner/integrity diligence + €40 000 governed No-Bid and cancellation closure.",
  endpoint: "SentinelGrid Board утверждает No-Bid до proposal/submission; participation branch frozen with zero bid files transmitted. Financier integrity review later triggers official cancellation. Cancellation and clean reissue watch are ingested, while partner evidence remains access-controlled under the retention decision.",
  kpi: "Readiness 78/100 · Match 86/100 · technical feasibility 82/100 · commercial attractiveness 74/100 · integrity risk 91/100 HIGH · No-Bid Day 27 · cancellation Day 63 · 0 unauthorised contacts/submissions.",
  outcome: "DEMO: компания избежала необоснованной integrity, data-residency and contract exposure; official cancellation confirmed that No-Bid was a valid controlled outcome, not a failed workflow.",
} as const;

export const case10Stages: CaseStage[] = [
  { id: "foundation", number: "00", title: "Governed intelligence baseline", description: "Policy, evidence rights, audit and graph state are explicit before company work.", handoff: "Authorised Case boundary" },
  { id: "signals", number: "01", title: "Plan, notice and award signals", description: "PIN/RFI, invitation and prior awards become typed, translated and source-locked intelligence.", handoff: "Prioritised tender + award pattern" },
  { id: "company", number: "02", title: "Company and clearance readiness", description: "Identity, capabilities, credentials and tender-specific readiness are verified.", handoff: "Verified SentinelGrid baseline" },
  { id: "documents", number: "03", title: "Tender corpus and rules", description: "Security, data-residency, local-operator and clarification rules become a structured model.", handoff: "Source-locked requirement model" },
  { id: "partner", number: "04", title: "Local operator diligence", description: "Candidates, consent, capability, ownership evidence and conflicts remain separate work products.", handoff: "Consented partner evidence package" },
  { id: "fit", number: "05", title: "Fit, route and remediation", description: "High fit and feasible solution are tested against a non-remediable partner/authority constraint.", handoff: "Bounded participation options" },
  { id: "integrity", number: "06", title: "Integrity escalation", description: "Evidence, legal boundaries and risk severity are prepared for authorised humans without accusations by Agents.", handoff: "Integrity decision brief" },
  { id: "decision", number: "07", title: "Human No-Bid gate", description: "Board weighs fit, economics, integrity and failed remediation, then owns the stop decision.", handoff: "Approved No-Bid record" },
  { id: "stopped-branch", number: "08", title: "Submission branch stopped", description: "Proposal, negotiation, award and execution capabilities remain demonstrably outside the Case.", handoff: "Frozen no-submission state" },
  { id: "reissue", number: "09", title: "Cancellation and learning", description: "External cancellation is ingested and translated into a governed reissue watch and learning record.", handoff: "Closed Case 10 + future watch" },
];

const requiredIds = new Set([
  1, 2, 3, 4, 5,
  6, 7, 8, 9, 10, 11, 12,
  13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27, 28, 30,
  31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
  42, 43, 44, 57, 64,
]);
const conditionalIds = new Set([29, 41]);

const primaryStageAgents: Record<string, number[]> = {
  foundation: [1, 3, 4, 5],
  signals: [13, 14, 15, 16, 17, 18, 19, 20],
  company: [6, 7, 8, 9, 10],
  documents: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
  partner: [11, 12, 40, 42, 43, 44],
  fit: [31, 32, 33, 34, 36, 37, 39, 41],
  integrity: [38, 57],
  decision: [2, 35],
  "stopped-branch": [45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 58, 59, 60, 61, 62, 63],
  reissue: [64],
};
const primaryStageByAgent = new Map(Object.entries(primaryStageAgents).flatMap(([stageId, agentIds]) => agentIds.map((agentId) => [agentId, stageId] as const)));
const stageById = new Map(case10Stages.map((stage) => [stage.id, stage]));

const conditionalRules: Record<number, { condition: string; activation: ConditionalActivation; coveredBy: string }> = {
  29: { condition: "Активируется при official cancellation, amendment or reissue notice.", activation: "triggered", coveredBy: "Financier review produces an official cancellation notice on Day 63; the original tender state is closed and a clean reissue watch is opened." },
  41: { condition: "Активируется только если Buyer permits a formal JV/consortium route instead of the required local subcontractor.", activation: "standby", coveredBy: "Clarification confirms that the locked local-operator subcontract route cannot be converted into a JV after the deadline." },
};

function stageFor(agentId: number) {
  const stageId = primaryStageByAgent.get(agentId);
  if (!stageId) throw new Error(`Case 10 Agent ${agentId} lacks a role-derived primary stage.`);
  return stageId;
}

function notInvolvedReason(agentId: number) {
  if ([45, 46].includes(agentId)) return "No internal supplier RFQ or quotation-normalization branch is authorised before the integrity gate; market candidates are diligence subjects, not quote competitors.";
  if (agentId >= 47 && agentId <= 56) return "Board stops the Case before bid production. Preliminary tender/fit analysis must not be relabelled as compliance, pricing or proposal execution.";
  if (agentId === 58) return "No final bid package exists and nothing is transmitted to the Buyer portal.";
  if (agentId === 59) return "No submitted bid exists, therefore post-bid clarification cannot be triggered.";
  if (agentId === 60) return "The restricted procedure provides clarification but no bidder negotiation before final offer; Agent 30 owns the pre-bid question route.";
  if (agentId === 61) return "No award or contract transition exists after the governed No-Bid decision.";
  if (agentId === 62 || agentId === 63) return "No contract, execution, invoice or payment state exists in a No-Bid Case.";
  return "Case 10 contains no evidenced execution for this capability before its terminal No-Bid boundary.";
}

export const case10Engagements: CaseAgentEngagement[] = agents.map((agent) => {
  const stageId = stageFor(agent.id);
  const stage = stageById.get(stageId)!;
  if (conditionalIds.has(agent.id)) {
    const rule = conditionalRules[agent.id];
    return { agentId: agent.id, status: "conditional" as EngagementStatus, stageId, when: rule.condition, why: rule.condition, input: "Observable trigger + current governed Case state.", output: agent.output.primary, next: agent.output.consumers, condition: rule.condition, activation: rule.activation, coveredBy: rule.coveredBy };
  }
  if (requiredIds.has(agent.id)) {
    return { agentId: agent.id, status: "required" as EngagementStatus, stageId, when: `Event/Process execution at «${stage.title}»`, why: agent.profile.responsibilityScope, input: agent.profile.typicalInputs.join(" · "), output: agent.output.primary, next: agent.output.consumers };
  }
  const reason = notInvolvedReason(agent.id);
  return { agentId: agent.id, status: "not-involved" as EngagementStatus, stageId, when: "Остановлено governed No-Bid boundary", why: reason, coveredBy: reason };
});

const ids = case10Engagements.map((item) => item.agentId);
if (ids.length !== 64 || new Set(ids).size !== 64) throw new Error("Case 10 needs exactly one engagement record for every canonical Agent.");
if (primaryStageByAgent.size !== 64) throw new Error("Case 10 needs one role-derived primary stage for every canonical Agent.");
if (case10Engagements.some((item) => !stageById.has(item.stageId))) throw new Error("Every Case 10 engagement needs a known stage.");
if (case10Engagements.some((item) => item.status !== "not-involved" && (!item.input || !item.output || !item.next))) throw new Error("Every involved Case 10 Agent needs input, output and handoff.");
