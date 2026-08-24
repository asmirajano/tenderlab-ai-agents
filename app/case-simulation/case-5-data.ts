import { agents } from "../../packages/catalog-data/src/agents.ts";
import type { CaseAgentEngagement, CaseStage, ConditionalActivation, EngagementStatus } from "./case-1-data.ts";

export const case5 = {
  id: "KE-GF-COLD-2026-NCS-005",
  name: "Performance-based cold-chain logistics framework",
  company: "FrostLink East Africa Ltd.",
  companyType: "Региональный оператор холодовой цепи и last-mile медицинской логистики",
  companyCountry: "Руанда",
  organizer: "Kenya Medical Supplies Authority · Ministry of Health",
  organizerCountry: "Кения",
  funding: "Global Fund",
  tenderType: "Неконсультационные услуги",
  procurementMethod: "Open international RFP · performance-based framework · 60:40 best value",
  subject: "Хранение, телеметрия и температурно-контролируемая доставка вакцин в 18 counties",
  lot: "1 тендер · 1 лот",
  budget: "$12,40 млн ceiling",
  quantity: "7 hubs · 18 counties · 36 месяцев · call-off orders · 72-hour emergency SLA",
  submissionWindow: "35 дней",
  deliveryWindow: "36-месячный framework · первый emergency call-off 21 день",
  situation: "FrostLink имеет GDP-certified core network и Kenyan branch, но должна доказать surge capacity, собрать проверенную сеть из шести local carriers, предложить rate card при нулевом гарантированном объёме и затем выполнить первый emergency call-off без temperature excursion.",
  startingCondition: "Компания известна TenderLab и имеет regional cold-chain references, но её текущая partner network не покрывает все 18 counties и не имеет единого verified SLA baseline.",
  trigger: "Публикация международного RFP и решение FrostLink проверить экономику performance-based framework с uncertain call-off volumes.",
  consultantRole: "TenderLab Consultant проверяет evidence, service-network design, rate-card assumptions и decision gates, но не выбирает перевозчиков, не подписывает bid и не подтверждает Buyer acceptance.",
  monetization: "DEMO · milestone-based advisory fee за bid, award mobilisation и первый accepted call-off; success fee отсутствует.",
  consultantIncome: "DEMO · $145 000: $55 000 bid readiness + $50 000 framework award + $40 000 first call-off assurance.",
  endpoint: "Framework contract подписан; первый emergency call-off принят с подтверждённым SLA и payment certificate; оставшиеся call-offs переданы operations team.",
  kpi: "Technical 88/100 · evaluated rate-card $11,96 млн scenario · rank 1 · 6/6 carriers verified · first call-off OTIF 98,7% · 0 critical excursions · payment certified.",
  outcome: "DEMO: FrostLink выиграла framework, мобилизовала 7 hubs и успешно закрыла первый emergency call-off с OTIF 98,7% и нулём critical temperature excursions.",
} as const;

export const case5Stages: CaseStage[] = [
  { id: "foundation", number: "00", title: "Платформенная основа", description: "Governance, company, award, market и supplier intelligence существуют до Case.", handoff: "Governed reusable intelligence" },
  { id: "discovery", number: "01", title: "Discovery и company mandate", description: "RFP классифицируется как non-consulting services; компания отдельно утверждает pursuit.", handoff: "Approved assessment route" },
  { id: "requirements", number: "02", title: "RFP и SLA model", description: "Framework rules, call-off mechanics, rate card, KPI и evaluation становятся source-locked моделью.", handoff: "Current RFP + SLA scorecard" },
  { id: "network", number: "03", title: "Service network", description: "Kenyan representation, hubs и шесть local carriers получают distinct roles, consent и verification.", handoff: "Verified service-network baseline" },
  { id: "quote", number: "04", title: "RFQ и rate evidence", description: "Carrier RFQs нормализуют routes, capacity, lead time, fuel index и exclusions.", handoff: "Comparable subcontractor rate book" },
  { id: "decision", number: "05", title: "BID и risk gate", description: "Qualification, Match, feasibility, integrity и downside economics сходятся на human BID decision.", handoff: "Approved bid mandate" },
  { id: "proposal", number: "06", title: "Service proposal", description: "SLA solution, telemetry, compliance, rate card и contingency plan формируют proposal.", handoff: "QA-approved best-value bid" },
  { id: "evaluation", number: "07", title: "Evaluation и award", description: "Buyer оценивает technical solution, oral drill, rate card и bounded clarification.", handoff: "Rank 1 + award notice" },
  { id: "framework", number: "08", title: "Framework mobilisation", description: "Contract, call-off rules, securities, hubs и partner obligations переходят в controlled state.", handoff: "Signed framework + ready network" },
  { id: "calloff", number: "09", title: "Emergency call-off", description: "Buyer-authorised order запускает 72-hour surge without changing tender award authority.", handoff: "Completed and traceable service order" },
  { id: "performance", number: "10", title: "SLA, payment и learning", description: "Buyer acceptance, KPI evidence и payment certificate закрывают первый service-order cycle.", handoff: "Accepted call-off + operational handoff" },
];

const backgroundIds = new Set([5, 18, 19, 20]);
const conditionalIds = new Set([22, 29, 59]);
const notInvolvedIds = new Set([41, 50]);

function stageFor(agentId: number) {
  if (agentId <= 5) return "foundation";
  if (agentId <= 12) return "network";
  if (agentId <= 20) return "discovery";
  if (agentId <= 30) return "requirements";
  if (agentId <= 38) return "decision";
  if (agentId <= 46) return agentId >= 43 ? "quote" : "network";
  if (agentId <= 58) return "proposal";
  if (agentId <= 60) return "evaluation";
  if (agentId === 61) return "framework";
  if (agentId === 62) return "calloff";
  return "performance";
}

const conditionByAgent: Record<number, { condition: string; activation: ConditionalActivation; coveredBy: string }> = {
  22: { condition: "Активируется, если source package содержит scan-only или Swahili evidence.", activation: "triggered", coveredBy: "Два county warehouse permits доступны только как scans и требуют OCR; authoritative English RFP сохраняется отдельно." },
  29: { condition: "Активируется при официальном addendum или изменении SLA/rate rules.", activation: "triggered", coveredBy: "Addendum 02 меняет emergency response threshold с 96 до 72 часов и обновляет rate-card template." },
  59: { condition: "Активируется только при официальном post-bid clarification.", activation: "triggered", coveredBy: "Buyer запрашивает bounded evidence по telemetry data retention и резервному hub; цена и SLA не меняются." },
};

function notInvolvedReason(agentId: number) {
  if (agentId === 41) return "FrostLink остаётся единственным prime contractor; local carriers работают как approved subcontractors, а не JV/consortium members.";
  if (agentId === 50) return "Buyer-owned vaccines не закупаются и не импортируются bidder; freight/customs landed-price отсутствует, service rate card принадлежит Agent 51.";
  return "В наблюдаемой границе Case 5 нет отдельной работы для этой capability.";
}

const stageById = new Map(case5Stages.map((stage) => [stage.id, stage]));

export const case5Engagements: CaseAgentEngagement[] = agents.map((agent) => {
  const stageId = stageFor(agent.id);
  const stage = stageById.get(stageId)!;
  if (notInvolvedIds.has(agent.id)) {
    const reason = notInvolvedReason(agent.id);
    return { agentId: agent.id, status: "not-involved" as EngagementStatus, stageId, when: "За границей Case 5", why: reason, coveredBy: reason };
  }
  if (conditionalIds.has(agent.id)) {
    const rule = conditionByAgent[agent.id];
    return {
      agentId: agent.id,
      status: "conditional" as EngagementStatus,
      stageId,
      when: rule.condition,
      why: rule.condition,
      input: "Observable trigger + current source-locked Case state.",
      output: agent.output.primary,
      next: agent.output.consumers,
      condition: rule.condition,
      activation: rule.activation,
      coveredBy: rule.coveredBy,
    };
  }
  const background = backgroundIds.has(agent.id);
  return {
    agentId: agent.id,
    status: background ? "background" : "required",
    stageId,
    when: background ? `Persistent/parallel Process вокруг «${stage.title}»` : `Event execution на этапе «${stage.title}»`,
    why: agent.profile.responsibilityScope,
    input: agent.profile.typicalInputs.join(" · "),
    output: agent.output.primary,
    next: agent.output.consumers,
  };
});

const ids = case5Engagements.map((item) => item.agentId);
if (ids.length !== 64 || new Set(ids).size !== 64) throw new Error("Case 5 needs exactly one engagement record for every canonical Agent.");
if (case5Engagements.some((item) => !stageById.has(item.stageId))) throw new Error("Every Case 5 engagement needs a known stage.");
if (case5Engagements.some((item) => item.status !== "not-involved" && (!item.input || !item.output || !item.next))) throw new Error("Every involved Case 5 Agent needs input, output and handoff.");
