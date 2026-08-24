import { agents } from "../../packages/catalog-data/src/agents.ts";
import type { CaseAgentEngagement, CaseStage, ConditionalActivation, EngagementStatus } from "./case-1-data.ts";

export const case8 = {
  id: "PE-IDB-EBUS-2026-PPP-008",
  name: "Electric-bus availability-payment PPP through competitive dialogue",
  company: "VoltAxis Transit Partners Pte. Ltd.",
  companyType: "Международный infrastructure sponsor и lead developer PPP-консорциума",
  companyCountry: "Сингапур",
  organizer: "Autoridad de Transporte Urbano de Lima y Callao",
  organizerCountry: "Перу",
  funding: "Government of Peru · IDB Invest · climate-finance co-lenders",
  tenderType: "PPP / концессия · смешанные товары, работы и услуги",
  procurementMethod: "International RFQ/PQ → competitive dialogue → BAFO · DBFOM availability-payment concession",
  subject: "Финансирование, поставка 420 электробусов, строительство трёх charging depots и 15-летняя эксплуатация",
  lot: "1 tender · 1 lot · 1 concession/SPV",
  budget: "$218 млн CAPEX · $327 млн NPV availability-payment ceiling",
  quantity: "420 e-buses · 3 depots · 58 MW charging · 15 лет O&M",
  submissionWindow: "45 дней PQQ · 120 дней dialogue/BAFO",
  deliveryWindow: "24 месяца construction + 15 лет availability service",
  situation: "VoltAxis может быть lead sponsor, но не может участвовать в одиночку: нужны local operator, EPC/charging integrator, equity investor, verified OEMs и lender support. Competitive dialogue меняет risk allocation, а award не становится executable project до concession signing, conditions precedent и financial close.",
  startingCondition: "У VoltAxis есть emerging-market PPP references и preliminary lender interest, но нет перуанского operating partner, signed consortium governance, bankable risk allocation, grid-connection baseline или committed debt.",
  trigger: "Публикация международного RFQ/PQ на единую availability-payment concession для обновления автобусного парка Lima–Callao.",
  consultantRole: "TenderLab Consultant ведёт governed bid-advisory route: consortium evidence, dialogue preparation, bankability assumptions, proposal controls и handoffs. Он не выбирает partners за Client, не ведёт официальный dialogue без полномочий, не присуждает concession и не принимает lender credit decisions.",
  monetization: "DEMO · fixed + gated milestone advisory fee; никаких процентов от CAPEX, debt или availability payments.",
  consultantIncome: "DEMO · $580 000: $90 000 PQ/consortium gate + $170 000 dialogue/workstreams + $220 000 BAFO/negotiation + $100 000 financial-close assurance.",
  endpoint: "Concession agreement и shareholder baseline подписаны; все conditions precedent закрыты, committed debt/equity достигли financial close, Authority выдала Notice to Proceed. Construction, fleet delivery, availability payments и 15-летняя эксплуатация переданы Project Company вне Case 8.",
  kpi: "PQ pass · 4-member consortium · 3 dialogue rounds · technical 89/100 · BAFO NPV $319,4 млн · preferred bidder · $162 млн committed debt · financial close Day 330 · 0 authority breaches.",
  outcome: "DEMO: VoltAxis-led consortium прошёл PQ и competitive dialogue, стал preferred bidder, подписал 15-летнюю concession и достиг financial close до выдачи Notice to Proceed.",
} as const;

export const case8Stages: CaseStage[] = [
  { id: "foundation", number: "00", title: "Governed baseline", description: "Policy, company, partner, market и evidence records существуют до Case.", handoff: "Governed PPP opportunity state" },
  { id: "discovery", number: "01", title: "PPP discovery и mandate", description: "RFQ/PQ классифицируется, проверяется против sponsor profile и получает отдельный assessment mandate.", handoff: "Approved PPP assessment route" },
  { id: "prequalification", number: "02", title: "PQ и eligibility", description: "PQQ, sponsor evidence, qualification и submission rules становятся source-locked model.", handoff: "Shortlist-ready sponsor dossier" },
  { id: "consortium", number: "03", title: "Consortium и SPV route", description: "Members, workshare, equity, governance, consent и dependencies проектируются и проверяются.", handoff: "Approved four-member consortium baseline" },
  { id: "dialogue", number: "04", title: "Dialogue и risk allocation", description: "Draft concession, technical concept, payment mechanism и unresolved risks проходят controlled dialogue.", handoff: "Revised bankable RFP baseline" },
  { id: "bankability", number: "05", title: "Bankability и safeguards", description: "Finance, grid/land, ESG, FX, performance deductions и lender conditions развиваются параллельно.", handoff: "Conditional bankability package" },
  { id: "decision", number: "06", title: "BAFO gate", description: "Qualification, fit, feasibility, risk и long-term economics сходятся на human Bid/BAFO decision.", handoff: "Approved final-proposal mandate" },
  { id: "proposal", number: "07", title: "Technical + financial BAFO", description: "Две ветви proposal создаются из approved solution и financial assumptions, затем проходят red team.", handoff: "Submitted compliant BAFO" },
  { id: "evaluation", number: "08", title: "Evaluation и preferred bidder", description: "Clarification, presentation и Buyer evaluation приводят к external preferred-bidder state.", handoff: "Preferred-bidder notice + negotiation mandate" },
  { id: "contract", number: "09", title: "Concession negotiation", description: "Final contract, shareholder arrangements, securities и conditions precedent утверждаются людьми.", handoff: "Signed concession + CP register" },
  { id: "financial-close", number: "10", title: "Financial close и NTP", description: "External lenders и equity investors закрывают funding; Authority отдельно выдаёт Notice to Proceed.", handoff: "Funded Project Company + execution handoff" },
];

const backgroundIds = new Set([5, 11, 18, 19, 20]);
const conditionalIds = new Set([22, 29, 59]);
const notInvolvedIds = new Set([62, 63]);

const primaryStageAgents: Record<string, number[]> = {
  foundation: [1, 3, 4, 5],
  discovery: [13, 14, 15, 16, 17, 18, 19, 20],
  prequalification: [6, 7, 8, 9, 10, 21, 22, 23, 24, 25, 26, 27, 28],
  consortium: [11, 12, 33, 40, 41, 42, 43, 44, 45, 46],
  dialogue: [29, 30, 39, 52, 60],
  bankability: [36, 37, 38, 48, 49, 50, 51, 57],
  decision: [2, 31, 32, 34, 35],
  proposal: [47, 53, 54, 55, 56, 58],
  evaluation: [59],
  contract: [61],
  "financial-close": [62, 63, 64],
};

const primaryStageByAgent = new Map(
  Object.entries(primaryStageAgents).flatMap(([stageId, agentIds]) => agentIds.map((agentId) => [agentId, stageId] as const)),
);

function stageFor(agentId: number) {
  const stageId = primaryStageByAgent.get(agentId);
  if (!stageId) throw new Error(`Case 8 Agent ${agentId} lacks a role-derived primary stage.`);
  return stageId;
}

const conditionByAgent: Record<number, { condition: string; activation: ConditionalActivation; coveredBy: string }> = {
  22: { condition: "Активируется при Spanish-only или scan-only procurement evidence.", activation: "triggered", coveredBy: "RFQ/PQ и draft concession опубликованы на испанском; два land-title annex доступны только как scans, поэтому OCR и aligned English translation реально выполняются." },
  29: { condition: "Активируется при revised RFP, dialogue memorandum или официальном change notice.", activation: "triggered", coveredBy: "После Dialogue Round 2 Authority выпускает Revised RFP 02 и меняет availability deductions, battery residual-value allocation и grid-interface schedule." },
  59: { condition: "Активируется только при официальном post-BAFO clarification.", activation: "triggered", coveredBy: "Evaluation committee запрашивает bounded clarification по lender support, charging redundancy и consortium liability без изменения BAFO price." },
};

function notInvolvedReason(agentId: number) {
  if (agentId === 62) return "Case 8 заканчивается financial close и Notice to Proceed; construction, fleet delivery и 15-летняя service execution ещё не начались. Pre-award executability принадлежит Agent 36.";
  if (agentId === 63) return "До Notice to Proceed отсутствуют certified works, invoices, variations и availability payments; conditions precedent контролируются Agent 61, а contract administration начинается в downstream execution Case.";
  return "В подтверждённой границе Case 8 нет отдельной доказуемой работы для этой capability.";
}

const stageById = new Map(case8Stages.map((stage) => [stage.id, stage]));

export const case8Engagements: CaseAgentEngagement[] = agents.map((agent) => {
  const stageId = stageFor(agent.id);
  const stage = stageById.get(stageId)!;
  if (notInvolvedIds.has(agent.id)) {
    const reason = notInvolvedReason(agent.id);
    return { agentId: agent.id, status: "not-involved" as EngagementStatus, stageId, when: "За границей Case 8", why: reason, coveredBy: reason };
  }
  if (conditionalIds.has(agent.id)) {
    const rule = conditionByAgent[agent.id];
    return {
      agentId: agent.id,
      status: "conditional" as EngagementStatus,
      stageId,
      when: rule.condition,
      why: rule.condition,
      input: "Observable official trigger + current source-locked Case state.",
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

const ids = case8Engagements.map((item) => item.agentId);
if (ids.length !== 64 || new Set(ids).size !== 64) throw new Error("Case 8 needs exactly one engagement record for every canonical Agent.");
if (primaryStageByAgent.size !== 64) throw new Error("Case 8 needs one role-derived primary stage for every canonical Agent.");
if (case8Engagements.some((item) => !stageById.has(item.stageId))) throw new Error("Every Case 8 engagement needs a known stage.");
if (case8Engagements.some((item) => item.status !== "not-involved" && (!item.input || !item.output || !item.next))) throw new Error("Every involved Case 8 Agent needs input, output and handoff.");
