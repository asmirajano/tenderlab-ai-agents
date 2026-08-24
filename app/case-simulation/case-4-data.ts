import { agents } from "../../packages/catalog-data/src/agents.ts";
import type { CaseAgentEngagement, CaseStage, ConditionalActivation, EngagementStatus } from "./case-1-data.ts";

export const case4 = {
  id: "RW-WB-DHI-2026-CS-004",
  name: "QCBS-консалтинг для цифровой системы здравоохранения",
  company: "NorthStar Digital Health OÜ",
  companyType: "Международная консалтинговая фирма по digital health и GovTech",
  companyCountry: "Эстония",
  organizer: "Rwanda Biomedical Centre · Ministry of Health",
  organizerCountry: "Руанда",
  funding: "Всемирный банк",
  tenderType: "Консультационные услуги",
  procurementMethod: "World Bank QCBS · REOI / shortlist / RFP · two-envelope",
  subject: "Архитектура национальной digital-health interoperability platform и надзор за внедрением",
  lot: "1 тендер · 1 лот",
  budget: "$4,80 млн",
  quantity: "Time-based consultancy · 11 key experts · 36 месяцев",
  submissionWindow: "21 день — REOI · 42 дня — RFP",
  deliveryWindow: "36 месяцев",
  situation: "Фирма сильна в digital health, но должна пройти shortlist, доказать доступность 11 key experts, закрыть local privacy expertise и сохранить раздельность technical/financial envelopes.",
  startingCondition: "NorthStar имеет релевантные международные проекты и действующий Client relationship, но не имеет проекта в Руанде и локального специалиста по health-data regulation.",
  trigger: "World Bank REOI и решение NorthStar проверить маршрут от shortlist до negotiated consultancy contract.",
  consultantRole: "TenderLab Consultant управляет evidence, QCBS gates и proposal workflow, но не подтверждает CV, conflict-of-interest или цену вместо уполномоченных людей.",
  monetization: "DEMO · fixed advisory fee по четырём milestones; success fee отсутствует.",
  consultantIncome: "DEMO · $85 000: $15 000 REOI + $20 000 shortlist/RFP + $35 000 proposal + $15 000 negotiation.",
  endpoint: "Подписан time-based consultancy contract и утверждён inception/mobilization baseline; 36-месячное исполнение передано delivery team.",
  kpi: "Shortlisted · technical 86/100 · threshold 75 · evaluated price $4,62 млн · rank 1 · contract signed · 11/11 experts confirmed.",
  outcome: "DEMO: NorthStar прошла shortlist, получила technical score 86/100, завершила QCBS negotiation и подписала контракт $4,62 млн.",
} as const;

export const case4Stages: CaseStage[] = [
  { id: "foundation", number: "00", title: "Платформенная основа", description: "Policy, company intelligence, award history и source rules существуют до Case.", handoff: "Governed reusable intelligence" },
  { id: "reoi", number: "01", title: "REOI и discovery", description: "Opportunity классифицируется как Consultants/QCBS и проходит controlled decision gate.", handoff: "Approved REOI route" },
  { id: "shortlist", number: "02", title: "EOI и shortlist", description: "Фирма доказывает experience и получает официальный shortlist/RFP.", handoff: "Shortlist notice + authoritative RFP" },
  { id: "requirements", number: "03", title: "RFP и evaluation model", description: "Technical/financial envelopes, key-expert criteria, privacy и contract terms становятся source-locked моделью.", handoff: "RFP corpus + QCBS scorecard" },
  { id: "team", number: "04", title: "Team и local expertise", description: "11 key experts и локальный privacy specialist проверяются без создания JV.", handoff: "Verified expert/team baseline" },
  { id: "decision", number: "05", title: "BID и delivery design", description: "Qualification, Match, feasibility, conflict и economics сходятся на human BID gate.", handoff: "Approved proposal mandate" },
  { id: "proposal", number: "06", title: "Technical proposal", description: "Methodology, workplan, expert CVs и compliance формируют technical envelope.", handoff: "QA-approved technical envelope" },
  { id: "financial", number: "07", title: "Financial proposal", description: "Time-based staffing schedule и reimbursables формируют отдельный financial envelope.", handoff: "Sealed evaluated price $4,62m" },
  { id: "evaluation", number: "08", title: "Submission и evaluation", description: "Раздельные envelopes подаются; financial opening происходит только после technical threshold.", handoff: "Combined QCBS rank 1" },
  { id: "contract", number: "09", title: "Negotiation и contract", description: "Clarifications, negotiation, signing и inception baseline закрывают Case.", handoff: "Signed contract + delivery handoff" },
];

const requiredIds = new Set([1, 2, 3, 4, 6, 7, 8, 9, 10, 13, 14, 15, 16, 17, 21, 23, 24, 25, 26, 27, 28, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 47, 48, 49, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61]);
const backgroundIds = new Set([5, 12, 18, 19, 20, 64]);
const conditionalIds = new Set([22, 29, 42, 63]);

function stageFor(agentId: number) {
  if (agentId <= 5) return "foundation";
  if (agentId <= 12) return agentId === 12 ? "team" : "team";
  if (agentId <= 20) return "reoi";
  if (agentId <= 30) return "requirements";
  if (agentId <= 38) return "decision";
  if (agentId <= 46) return "team";
  if (agentId <= 58) return agentId >= 51 && agentId !== 55 && agentId !== 56 && agentId !== 57 && agentId !== 58 ? "financial" : "proposal";
  return agentId <= 61 ? "contract" : "contract";
}

const conditionByAgent: Record<number, { condition: string; activation: ConditionalActivation; coveredBy: string }> = {
  22: { condition: "Активируется, если официальный RFP содержит сканы или франкоязычные приложения.", activation: "triggered", coveredBy: "В DEMO два приложения требуют OCR/translation; authoritative English text сохраняется." },
  29: { condition: "Активируется при официальном addendum после RFP.", activation: "triggered", coveredBy: "Addendum 01 меняет availability form и дату submission; impact проходит через P04." },
  42: { condition: "Активируется, если Buyer требует отдельное local representation присутствие.", activation: "standby", coveredBy: "Local privacy specialist входит как subcontracted expert, а не representation provider." },
  63: { condition: "Активируется после первого invoice/milestone в отдельном delivery Case.", activation: "standby", coveredBy: "Case 4 заканчивается на signed contract и inception baseline до contract administration." },
};

function notInvolvedReason(agentId: number) {
  if ([11, 43, 44, 45, 46].includes(agentId)) return "Консультационная заявка не требует supplier/RFQ/quotation route.";
  if (agentId === 41) return "NorthStar остаётся prime consultant; local specialist оформляется subcontracted expert, не JV member.";
  if (agentId === 50) return "Time-based consultancy не имеет landed-price, freight, customs или physical-goods cost model.";
  if (agentId === 62) return "36-месячное service delivery начинается после terminal handoff и не является logistics execution этого Case.";
  return "В наблюдаемой границе Case 4 нет отдельной работы для этой capability.";
}

const stageById = new Map(case4Stages.map((stage) => [stage.id, stage]));

export const case4Engagements: CaseAgentEngagement[] = agents.map((agent) => {
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
  return { agentId: agent.id, status: "not-involved" as EngagementStatus, stageId, when: "За границей Case 4", why: reason, coveredBy: reason };
});

const ids = case4Engagements.map((item) => item.agentId);
if (ids.length !== 64 || new Set(ids).size !== 64) throw new Error("Case 4 needs exactly one engagement record for every canonical Agent.");
if (case4Engagements.some((item) => !stageById.has(item.stageId))) throw new Error("Every Case 4 engagement needs a known stage.");
if (case4Engagements.some((item) => item.status !== "not-involved" && (!item.input || !item.output || !item.next))) throw new Error("Every involved Case 4 Agent needs input, output and handoff.");
