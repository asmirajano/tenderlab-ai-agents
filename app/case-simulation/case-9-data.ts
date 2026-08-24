import { agents } from "../../packages/catalog-data/src/agents.ts";
import type { CaseAgentEngagement, CaseStage, ConditionalActivation, EngagementStatus } from "./case-1-data.ts";

export const case9 = {
  id: "MA-EBRD-FIDIC-2026-CLM-009",
  name: "FIDIC Variation и EOT после unforeseen site condition",
  company: "IberAtlas Civil S.A.",
  companyType: "Международный civil-works contractor и действующий Contractor по FIDIC contract",
  companyCountry: "Испания",
  organizer: "DEMO · Casablanca Metropolitan Water Authority",
  organizerCountry: "Марокко",
  funding: "EBRD · municipal climate-resilience programme",
  tenderType: "Работы · post-award contract administration",
  procurementMethod: "FIDIC Yellow Book · Engineer determination · Dispute Avoidance Board",
  subject: "Действующий контракт на городской flood-control tunnel; Variation/EOT из-за неучтённой напорной магистрали и загрязнённых грунтовых вод",
  lot: "1 действующий контракт · 1 лот",
  budget: "$94,80 млн original contract",
  quantity: "6,4 км tunnel · claim $8,70 млн / 112 дней · final determination $6,40 млн / 84 дня",
  submissionWindow: "Notice within 28 days · detailed claim within 84 days",
  deliveryWindow: "Revised completion +84 days",
  situation: "На 214-й день строительства Contractor встречает неуказанную напорную магистраль и загрязнённые грунтовые воды. Работы на участке безопасно остановлены; нужно сохранить contemporaneous evidence, соблюсти notice clocks, доказать entitlement, quantum и critical-path delay, пройти Engineer determination и DAB без смешения Agent support с полномочиями людей.",
  startingCondition: "Контракт уже effective, baseline programme и BOQ утверждены, 31% works выполнено. Ни discovery, ни Bid/No-Bid, ни proposal workflow больше не являются частью Case.",
  trigger: "Site team документирует unforeseen condition и Engineer выдаёт instruction о временной приостановке затронутого участка.",
  consultantRole: "TenderLab Consultant организует evidence, change, claim и dispute-support workflow, но не подписывает notices, не даёт юридическое заключение, не определяет entitlement и не выдаёт Engineer/DAB decisions.",
  monetization: "DEMO · hybrid: fixed claim-assurance milestones + capped success fee on certified Variation.",
  consultantIncome: "DEMO · $145 000: $65 000 fixed milestones + 1,25% × $6,40 млн certified Variation.",
  endpoint: "Variation Order на $6,40 млн и EOT 84 дня включены в contract baseline; milestone certified и paid, revised works переданы project controls. Остальное исполнение продолжается вне Case.",
  kpi: "Notice day 3 / 28 · detailed claim day 71 / 84 · requested $8,70m +112d · Engineer $4,90m +63d · DAB/final $6,40m +84d · payment certified · 0 authority breaches.",
  outcome: "DEMO: DAB частично пересмотрел Engineer determination; стороны приняли $6,40 млн и 84-дневный EOT, подписали Variation Order и продолжили works по revised baseline.",
} as const;

export const case9Stages: CaseStage[] = [
  { id: "foundation", number: "00", title: "Contract baseline", description: "Effective contract, authority, evidence and project state exist before the claim Case.", handoff: "Governed post-award Case" },
  { id: "condition", number: "01", title: "Site condition и notice", description: "Safety stop, contemporaneous records and contractual notices are separated from entitlement conclusions.", handoff: "Timely protected claim right" },
  { id: "investigation", number: "02", title: "Causation evidence", description: "Site facts, design records, programme and mitigation alternatives establish what changed and why.", handoff: "Causation + mitigation record" },
  { id: "claim", number: "03", title: "Entitlement / time / quantum", description: "Legal entitlement, delay analysis and cost build-up remain distinct workstreams.", handoff: "Detailed claim pack" },
  { id: "determination", number: "04", title: "Engineer determination", description: "Engineer requests particulars and makes an external contractual determination.", handoff: "Determination $4.90m / 63d" },
  { id: "dispute", number: "05", title: "DAB referral", description: "Contractor decides whether to accept or refer the disputed difference; humans own filings/hearing.", handoff: "DAB decision $6.40m / 84d" },
  { id: "variation", number: "06", title: "Variation и revised baseline", description: "Accepted decision becomes a versioned Variation Order, schedule and contract register update.", handoff: "Effective revised contract state" },
  { id: "payment", number: "07", title: "Certification и payment", description: "Engineer certification, Employer payment and work resumption remain separate authority states.", handoff: "Paid milestone + project-controls handoff" },
  { id: "learning", number: "08", title: "Outcome learning", description: "Verified claim, delay and payment outcomes update reusable knowledge without changing canonical roles.", handoff: "Closed Case 9 audit record" },
];

const requiredIds = new Set([1, 2, 3, 4, 17, 21, 29, 38, 39, 50, 57, 60, 62, 63]);
const backgroundIds = new Set([5, 64]);
const conditionalIds = new Set([22, 46]);

function stageFor(agentId: number) {
  if (agentId <= 5) return "foundation";
  if (agentId === 17 || agentId === 21 || agentId === 22 || agentId === 29) return "condition";
  if (agentId === 39 || agentId === 62) return "investigation";
  if ([38, 46, 50, 57].includes(agentId)) return "claim";
  if (agentId === 60) return "dispute";
  if (agentId === 63) return "payment";
  if (agentId === 64 || agentId === 5) return "learning";
  return "foundation";
}

const conditionByAgent: Record<number, { condition: string; activation: ConditionalActivation; coveredBy: string }> = {
  22: { condition: "Активируется только если contemporaneous evidence включает scan-only или non-readable files.", activation: "standby", coveredBy: "Case 9 DEMO использует machine-readable FIDIC contract, BIM extracts, daily records and lab reports." },
  46: { condition: "Активируется, если claim quantum опирается на несколько third-party/vendor quotations, требующих общей basis.", activation: "triggered", coveredBy: "Три specialist dewatering/vendor quotations нормализуются до cost build-up; Agent 46 не определяет entitlement." },
};

function notInvolvedReason(agentId: number) {
  if (agentId >= 6 && agentId <= 16) return "Case начинается после award: discovery, company readiness, qualification and opportunity ranking уже завершены.";
  if (agentId >= 18 && agentId <= 20) return "Market/award/competitor intelligence не доказывает contract entitlement или actual claim cost.";
  if ([23, 24, 25, 26, 27, 28, 30].includes(agentId)) return "Tender-document and pre-bid requirement/form/clarification work завершилось до effective contract; claim baseline ведёт Contract Administration.";
  if (agentId >= 31 && agentId <= 37) return "Match, participation, Bid/No-Bid and pre-bid feasibility не относятся к post-award claim decision.";
  if (agentId >= 40 && agentId <= 45) return "Case не создаёт новый partner/supplier route; vendor quotations являются cost evidence, а не sourcing award.";
  if (agentId >= 47 && agentId <= 49) return "Bid compliance Agents не должны становиться post-award claim evaluators.";
  if (agentId >= 51 && agentId <= 56) return "Bid price/proposal content уже frozen; claim quantum не является новой tender BOQ или proposal.";
  if (agentId >= 58 && agentId <= 59) return "Submission and post-bid clarification boundaries завершились до contract execution.";
  if (agentId === 61) return "Award-to-Contract завершился до Case 9; Variation администрируется в effective contract, а не повторно открывает award transition.";
  return "В наблюдаемой post-award boundary Case 9 нет отдельной доказуемой работы для этой capability.";
}

const stageById = new Map(case9Stages.map((stage) => [stage.id, stage]));

export const case9Engagements: CaseAgentEngagement[] = agents.map((agent) => {
  const stageId = stageFor(agent.id);
  const stage = stageById.get(stageId)!;
  if (requiredIds.has(agent.id) || backgroundIds.has(agent.id)) {
    const background = backgroundIds.has(agent.id);
    return { agentId: agent.id, status: background ? "background" : "required", stageId, when: background ? `Persistent Process вокруг «${stage.title}»` : `Event execution на этапе «${stage.title}»`, why: agent.profile.responsibilityScope, input: agent.profile.typicalInputs.join(" · "), output: agent.output.primary, next: agent.output.consumers };
  }
  if (conditionalIds.has(agent.id)) {
    const rule = conditionByAgent[agent.id];
    return { agentId: agent.id, status: "conditional" as EngagementStatus, stageId, when: rule.condition, why: rule.condition, input: "Observable trigger + current versioned contract/claim state.", output: agent.output.primary, next: agent.output.consumers, condition: rule.condition, activation: rule.activation, coveredBy: rule.coveredBy };
  }
  const reason = notInvolvedReason(agent.id);
  return { agentId: agent.id, status: "not-involved" as EngagementStatus, stageId, when: "За границей Case 9", why: reason, coveredBy: reason };
});

const ids = case9Engagements.map((item) => item.agentId);
if (ids.length !== 64 || new Set(ids).size !== 64) throw new Error("Case 9 needs exactly one engagement record for every canonical Agent.");
if (case9Engagements.some((item) => !stageById.has(item.stageId))) throw new Error("Every Case 9 engagement needs a known stage.");
if (case9Engagements.some((item) => item.status !== "not-involved" && (!item.input || !item.output || !item.next))) throw new Error("Every involved Case 9 Agent needs input, output and handoff.");
