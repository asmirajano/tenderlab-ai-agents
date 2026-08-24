import { agents } from "../../packages/catalog-data/src/agents.ts";
import type { CaseAgentEngagement, CaseStage, ConditionalActivation, EngagementStatus } from "./case-1-data.ts";

export const case6 = {
  id: "BR-BA-NPK-2026-RA-006",
  name: "Оспаривание award после e-аукциона на удобрения",
  company: "AtlasAgri Commodities DMCC",
  companyType: "Международный commodity trader и supply-chain integrator, не производитель",
  companyCountry: "ОАЭ",
  organizer: "DEMO · Bahia Agricultural Inputs Agency",
  organizerCountry: "Бразилия",
  funding: "Бюджет штата · программа восстановления после засухи",
  tenderType: "Товары",
  procurementMethod: "Pregão eletrônico · обратный e-аукцион · административный review",
  subject: "Поставка 24 000 тонн гранулированного NPK-удобрения 15-15-15",
  lot: "1 тендер · 1 лот",
  budget: "$11,52 млн ceiling",
  quantity: "24 000 тонн · delivery duty paid в 12 региональных складов",
  submissionWindow: "30 дней · live auction в день 31",
  deliveryWindow: "120 дней после notice to proceed",
  situation: "AtlasAgri участвует как trader через двух verified OEM, local importer и performance security. На e-аукционе компания занимает второе место; provisional winner предлагает меньшую цену, но использует регистрацию продукта, полученную после qualification deadline.",
  startingCondition: "У компании есть публичный профиль международного trader и доступ к OEM, но нет tender-specific manufacturer authorizations, local importer dossier, Portuguese corpus или утверждённого auction floor.",
  trigger: "Официальная публикация reverse-auction notice и высокий предварительный Company × Tender fit для бразильского рынка удобрений.",
  consultantRole: "TenderLab ведёт evidence, supplier/OEM, pricing и review workflow, но не делает live bids, не подаёт жалобу и не принимает award/review decisions вместо уполномоченных людей.",
  monetization: "DEMO · hybrid: fixed bid fee + fixed complaint-review fee + 1% award success fee.",
  consultantIncome: "DEMO · $150 600: $25 000 bid advisory + $20 000 complaint support + 1% × $10,56 млн signed contract.",
  endpoint: "Подписан контракт $10,56 млн и выдан mobilization handoff; поставка, payment и contract administration находятся за границей Case.",
  kpi: "Qualified · auction rank 2 · complaint upheld · provisional winner disqualified · final award $10,56 млн · contract signed · 2/2 OEM verified.",
  outcome: "DEMO: review body подтвердил material registration defect provisional winner, Buyer повторно оценил предложения и заключил контракт с AtlasAgri на $10,56 млн.",
} as const;

export const case6Stages: CaseStage[] = [
  { id: "foundation", number: "00", title: "Платформенная основа", description: "Policy, company/supplier intelligence, procurement history и evidence rules существуют до Case.", handoff: "Governed trader + market baseline" },
  { id: "discovery", number: "01", title: "Discovery и mandate", description: "Notice классифицируется, фильтруется и передаётся компании только после defensible relevance check.", handoff: "Approved assessment mandate" },
  { id: "tender-model", number: "02", title: "Multilingual tender model", description: "Portuguese notice, сканы, формы, deadlines и auction rules становятся source-locked корпусом.", handoff: "Requirements + auction scorecard" },
  { id: "route", number: "03", title: "Trader и supplier route", description: "Проверяются company, OEM, importer, authorizations, product registration и qualification route.", handoff: "Verified supply-chain route" },
  { id: "commercial", number: "04", title: "Market и auction economics", description: "История цен, competitors, landed cost, quotes и downside определяют human-approved bid floor.", handoff: "Approved auction floor" },
  { id: "submission", number: "05", title: "Bid и submission", description: "Technical/commercial evidence проходит QA, signature и portal submission.", handoff: "Accepted bid package" },
  { id: "auction", number: "06", title: "Live reverse auction", description: "Уполномоченный человек делает bids внутри утверждённого floor; Agents только контролируют evidence и limits.", handoff: "Final auction rank 2" },
  { id: "review", number: "07", title: "Standstill и complaint", description: "Provisional award проверяется; компания решает подать административную жалобу, review body управляет remedy.", handoff: "Upheld complaint + re-evaluation order" },
  { id: "award", number: "08", title: "Re-evaluation и award", description: "Buyer исключает non-compliant winner, подтверждает AtlasAgri и выдаёт final award.", handoff: "Final award + bounded confirmation" },
  { id: "contract", number: "09", title: "Contract и mobilization", description: "Award, price, security и delivery terms сходятся в подписанном контракте.", handoff: "Signed contract + operations handoff" },
];

const backgroundIds = new Set([5, 11, 13, 19, 64]);
const conditionalIds = new Set([22, 29, 59]);
const skippedIds = new Set([41, 60, 62, 63]);
const requiredIds = new Set(agents.map((agent) => agent.id).filter((id) => !backgroundIds.has(id) && !conditionalIds.has(id) && !skippedIds.has(id)));

function stageFor(agentId: number) {
  if (agentId <= 5) return "foundation";
  if (agentId <= 12) return "route";
  if (agentId <= 20) return agentId <= 17 ? "discovery" : "commercial";
  if (agentId <= 30) return "tender-model";
  if (agentId <= 38) return "commercial";
  if (agentId <= 46) return "route";
  if (agentId <= 58) return "submission";
  return agentId === 59 ? "award" : "contract";
}

const conditionByAgent: Record<number, { condition: string; activation: ConditionalActivation; coveredBy: string }> = {
  22: { condition: "Активируется, если официальный пакет содержит сканы или Portuguese-only документы.", activation: "triggered", coveredBy: "В DEMO три сканированных приложения требуют OCR, а Portuguese source остаётся authoritative." },
  29: { condition: "Активируется при официальном addendum или изменении auction/deadline state.", activation: "triggered", coveredBy: "Addendum 02 уточняет manufacturer authorization и переносит auction на два дня." },
  59: { condition: "Активируется, если после re-evaluation Buyer запрашивает bounded подтверждение действительности цены/evidence.", activation: "triggered", coveredBy: "После disqualification Buyer запрашивает подтверждение bid validity и security без изменения цены." },
};

function notInvolvedReason(agentId: number) {
  if (agentId === 41) return "AtlasAgri остаётся single prime trader; OEM и importer — suppliers/subcontractors, не JV members.";
  if (agentId === 60) return "Reverse auction и formal complaint не являются presentation/negotiation session.";
  if (agentId === 62) return "Physical fertilizer delivery начинается после terminal mobilization handoff.";
  if (agentId === 63) return "Payment и contract administration находятся за границей Case 6.";
  return "В наблюдаемой границе Case 6 нет отдельной работы для этой capability.";
}

const stageById = new Map(case6Stages.map((stage) => [stage.id, stage]));

export const case6Engagements: CaseAgentEngagement[] = agents.map((agent) => {
  const stageId = stageFor(agent.id);
  const stage = stageById.get(stageId)!;
  if (requiredIds.has(agent.id) || backgroundIds.has(agent.id)) {
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
  const reason = notInvolvedReason(agent.id);
  return { agentId: agent.id, status: "not-involved" as EngagementStatus, stageId, when: "За границей Case 6", why: reason, coveredBy: reason };
});

const ids = case6Engagements.map((item) => item.agentId);
if (ids.length !== 64 || new Set(ids).size !== 64) throw new Error("Case 6 needs exactly one engagement record for every canonical Agent.");
if (case6Engagements.some((item) => !stageById.has(item.stageId))) throw new Error("Every Case 6 engagement needs a known stage.");
if (case6Engagements.some((item) => item.status !== "not-involved" && (!item.input || !item.output || !item.next))) throw new Error("Every involved Case 6 Agent needs input, output and handoff.");
