import { agents } from "../../packages/catalog-data/src/agents.ts";
import type { CaseAgentEngagement, CaseStage, ConditionalActivation, EngagementStatus } from "./case-1-data.ts";

export const case7 = {
  id: "PH-ADB-SHELTER-2026-G-007",
  name: "Emergency shelter procurement recovery after supplier default",
  company: "Department of Social Welfare and Development",
  companyType: "Государственный заказчик и оператор emergency-response procurement",
  companyCountry: "Филиппины",
  organizer: "DSWD Procurement Service",
  organizerCountry: "Филиппины",
  funding: "Asian Development Bank · contingent disaster financing",
  tenderType: "Товары · emergency replacement procurement",
  procurementMethod: "Accelerated limited international RFQ · five invitees · post-qualification · no negotiation",
  subject: "12 000 комплектов временного семейного жилья после дефолта первоначального поставщика",
  lot: "1 replacement procurement · 1 lot",
  budget: "$6,80 млн approved ceiling",
  quantity: "12 000 shelter kits · 3 staging hubs · 14 дней",
  submissionWindow: "72 часа для quotation",
  deliveryWindow: "14 дней после notice to proceed",
  situation: "Первоначальный поставщик не прошёл независимый pre-shipment test на огнестойкость и водонепроницаемость за 12 дней до typhoon-response mobilisation. Заказчик должен доказательно решить судьбу действующего контракта, обеспечить непрерывность поставки и провести ускоренный, но конкурентный replacement RFQ без подмены человеческих полномочий.",
  startingCondition: "Действующий контракт на 12 000 shelter kits подписан, performance security активна, поставка не принята, а contingency stock покрывает только пять дней. Стандартная спецификация и disaster-response plan уже утверждены.",
  trigger: "Аккредитованная лаборатория фиксирует material test failure; incumbent не предоставляет приемлемый cure plan в течение 48 часов.",
  consultantRole: "TenderLab Consultant действует как независимый procurement-recovery adviser: фиксирует evidence, моделирует remedy options, организует controlled supplier/RFQ workflow и проверяет handoffs. Он не расторгает контракт, не присуждает replacement award, не оценивает оферты вместо evaluation committee и не принимает товары.",
  monetization: "DEMO · fixed milestone advisory fee; success fee и процент от award/claim запрещены во избежание конфликта интересов.",
  consultantIncome: "DEMO · $210 000: $45 000 recovery diagnosis + $55 000 supplier/RFQ route + $65 000 evaluation/award assurance + $45 000 first-delivery assurance.",
  endpoint: "Undelivered tranche первоначального контракта расторгнут, performance-security claim зарегистрирован; replacement contract подписан, 12 000 kits доставлены, лабораторно приняты и оплачены; recovery evidence передан Buyer legal/operations teams.",
  kpi: "Recovery gate ≤72h · 5 приглашений / 4 responsive quotations · award $6,42 млн · 12 000 kits за 13 дней · 100% sampled units pass · $0,78 млн security claim tracked · 0 authority breaches.",
  outcome: "DEMO: DSWD документированно завершил default remedy, выбрал replacement supplier через ограниченную конкуренцию, принял 12 000 compliant shelter kits на 13-й день и сохранил отдельный claim к первоначальному поставщику.",
} as const;

export const case7Stages: CaseStage[] = [
  { id: "foundation", number: "00", title: "Governance baseline", description: "Policy, evidence, contract and market records существуют до recovery decision.", handoff: "Governed recovery Case" },
  { id: "default", number: "01", title: "Default evidence", description: "Lab failure, contract state, cure notice and continuity risk фиксируются раздельно.", handoff: "Source-locked default dossier" },
  { id: "remedy", number: "02", title: "Remedy gate", description: "Buyer выбирает cure, partial termination или replacement route только после legal/evidence review.", handoff: "Authorised recovery route" },
  { id: "requirements", number: "03", title: "Replacement requirement", description: "Количество, сроки, specification, evaluation and RFQ forms замораживаются до sourcing.", handoff: "Approved RFQ requirement pack" },
  { id: "market", number: "04", title: "Supplier market", description: "Market capacity и historical evidence ограничивают, но не предрешают shortlist.", handoff: "Market-backed sourcing criteria" },
  { id: "sourcing", number: "05", title: "Shortlist и due diligence", description: "Candidate suppliers обнаруживаются, проверяются и допускаются по единым правилам.", handoff: "Approved five-supplier roster" },
  { id: "rfq", number: "06", title: "Limited RFQ", description: "Один controlled package выпускается пяти suppliers; communications and addendum versioned.", handoff: "Four responsive offers" },
  { id: "evaluation", number: "07", title: "Offer evaluation", description: "Technical, commercial, integrity and landed-cost evidence сходятся в human committee gate.", handoff: "Defensible award recommendation" },
  { id: "award", number: "08", title: "Termination + replacement award", description: "Два authority tracks идут параллельно и не смешивают old-contract claim с new award.", handoff: "Effective replacement contract" },
  { id: "delivery", number: "09", title: "Delivery и acceptance", description: "Operational execution, independent testing and Buyer acceptance remain distinct states.", handoff: "Accepted compliant kits" },
  { id: "learning", number: "10", title: "Settlement и learning", description: "Payment, security claim and supplier performance become verified reusable evidence.", handoff: "Closed Case + recovery record" },
];

const backgroundIds = new Set([5, 18, 19]);
const conditionalIds = new Set([22, 29]);
const requiredIds = new Set([
  1, 2, 3, 4, 11, 13, 15, 17, 21, 23, 24, 25, 26, 27, 28, 38,
  43, 44, 45, 46, 47, 48, 49, 50, 57, 61, 62, 63, 64,
]);

function stageFor(agentId: number) {
  if (agentId <= 5) return "foundation";
  if (agentId <= 12) return "sourcing";
  if (agentId <= 20) return "market";
  if (agentId <= 30) return "requirements";
  if (agentId <= 38) return "remedy";
  if (agentId <= 46) return "sourcing";
  if (agentId <= 58) return "evaluation";
  if (agentId <= 61) return "award";
  if (agentId <= 63) return "delivery";
  return "learning";
}

const conditionByAgent: Record<number, { condition: string; activation: ConditionalActivation; coveredBy: string }> = {
  22: { condition: "Активируется только при scan-only или non-English source evidence.", activation: "standby", coveredBy: "Case 7 DEMO использует machine-readable English contract, lab report and RFQ package; OCR/translation не запускается." },
  29: { condition: "Активируется при официальном corrigendum или изменении requirement/deadline.", activation: "triggered", coveredBy: "Corrigendum 01 уточняет fire-retardancy test method и сохраняет quotation deadline." },
};

function notInvolvedReason(agentId: number) {
  if (agentId >= 6 && agentId <= 10) return "Buyer не является bidder company; profiles/credentials внешних suppliers принадлежат Agents 11 и 44, а не собственному Company layer.";
  if (agentId === 12 || (agentId >= 39 && agentId <= 42)) return "Replacement закупает standard shelter kit у одного supplier; partner/JV/local-representation или solution architecture не проектируются.";
  if (agentId === 14 || agentId === 16) return "Tender Discovery/Filtering ищут opportunity для participating company; Case 7 начинается с Buyer-owned recovery need и использует Supplier Discovery.";
  if (agentId === 20) return "Buyer/competitor intelligence поддерживает bidder strategy; Buyer-side supplier market evidence хранится в Supplier and Market Intelligence.";
  if (agentId === 30) return "Agent 30 формирует вопросы bidder к Buyer и прямо не отвечает за заказчика; inbound supplier Q&A остаётся human-owned RFQ communication.";
  if (agentId >= 31 && agentId <= 37) return "Company-to-tender participation, Bid/No-Bid and bidder economics не являются Buyer procurement decision.";
  if (agentId >= 51 && agentId <= 56) return "TenderLab не создаёт и не red-team'ит supplier bid/proposal; он сравнивает полученные offers без вмешательства в их content.";
  if (agentId === 58 || agentId === 59 || agentId === 60) return "Submission, post-bid response and negotiation capabilities принадлежат bidder-side workflow; no-negotiation RFQ сохраняет эту boundary.";
  return "В наблюдаемой границе Case 7 нет отдельной доказуемой работы для этой capability.";
}

const stageById = new Map(case7Stages.map((stage) => [stage.id, stage]));

export const case7Engagements: CaseAgentEngagement[] = agents.map((agent) => {
  const stageId = stageFor(agent.id);
  const stage = stageById.get(stageId)!;
  if (!requiredIds.has(agent.id) && !conditionalIds.has(agent.id) && !backgroundIds.has(agent.id)) {
    const reason = notInvolvedReason(agent.id);
    return { agentId: agent.id, status: "not-involved" as EngagementStatus, stageId, when: "За границей Case 7", why: reason, coveredBy: reason };
  }
  if (conditionalIds.has(agent.id)) {
    const rule = conditionByAgent[agent.id];
    return {
      agentId: agent.id,
      status: "conditional" as EngagementStatus,
      stageId,
      when: rule.condition,
      why: rule.condition,
      input: "Observable source/change trigger + current recovery Case state.",
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

const ids = case7Engagements.map((item) => item.agentId);
if (ids.length !== 64 || new Set(ids).size !== 64) throw new Error("Case 7 needs exactly one engagement record for every canonical Agent.");
if (case7Engagements.some((item) => !stageById.has(item.stageId))) throw new Error("Every Case 7 engagement needs a known stage.");
if (case7Engagements.some((item) => item.status !== "not-involved" && (!item.input || !item.output || !item.next))) throw new Error("Every involved Case 7 Agent needs input, output and handoff.");
