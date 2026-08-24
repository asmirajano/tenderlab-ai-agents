import { agents } from "../../packages/catalog-data/src/agents.ts";
import type { CaseAgentEngagement, CaseStage, ConditionalActivation, EngagementStatus } from "./case-1-data.ts";

export const case3 = {
  id: "KZ-ADB-WTP-2026-018",
  name: "Консорциум по строительству водоочистной станции",
  company: "AquaNova Ingeniería S.A. + Anatolia Process Systems A.Ş. + SteppeBuild KZ LLP",
  companyType: "Консорциум: инженерный лидер, производитель оборудования и местный подрядчик",
  companyCountry: "Испания · Турция · Казахстан",
  organizer: "QazWater Infrastructure Directorate",
  organizerCountry: "Казахстан",
  funding: "Азиатский банк развития",
  tenderType: "Работы",
  procurementMethod: "Двухэтапный открытый международный тендер АБР",
  subject: "Проектирование, строительство и ввод в эксплуатацию водоочистной станции 75 000 м³/сутки",
  lot: "1 тендер · 1 лот",
  budget: "$48,00 млн",
  quantity: "EPC/Design–Build · 75 000 м³/сутки",
  submissionWindow: "45 дней — Stage 1 · 30 дней — Stage 2",
  deliveryWindow: "30 месяцев",
  situation: "Ни одна компания не закрывает qualification и весь EPC scope самостоятельно: участие возможно только после доказательного формирования трёхстороннего консорциума.",
  startingCondition: "AquaNova известна TenderLab как опытный инженерный подрядчик, но не имеет полного process-equipment портфеля, местной строительной лицензии и подтверждённой execution capacity в Казахстане.",
  trigger: "Официальная публикация АБР двухэтапного Works tender и решение AquaNova проверить consortium route.",
  consultantRole: "TenderLab Consultant проектирует и проверяет маршрут консорциума, координирует evidence и bid workflow, но не выбирает партнёров и не подписывает обязательства вместо участников.",
  monetization: "DEMO · milestone-based fixed advisory fee; success fee отсутствует.",
  consultantIncome: "DEMO · $240 000: $60 000 qualification/route + $80 000 consortium structuring + $100 000 за две стадии заявки.",
  endpoint: "ADB award, подписанный consortium contract и утверждённый mobilization baseline; дальнейшие 30 месяцев исполнения переданы участникам.",
  kpi: "3 verified members · qualification 100% · Stage 1 accepted · final compliance 100% · bid $46,80 млн · contract signed · 3/3 consulting milestones.",
  outcome: "DEMO: трёхсторонний консорциум прошёл Stage 1, подал финальную заявку $46,80 млн, получил award и открыл контролируемую мобилизацию.",
} as const;

export const case3Stages: CaseStage[] = [
  { id: "foundation", number: "00", title: "Платформенная основа", description: "Policy, taxonomy, company/partner intelligence и award history существуют до Case.", handoff: "Reusable governance и intelligence records" },
  { id: "discovery", number: "01", title: "Возможность и permission", description: "Works notice собирается, проходит triage и открывается как управляемый Client Case.", handoff: "Approved consortium-feasibility mandate" },
  { id: "company", number: "02", title: "Lead company и fit", description: "Проверяются AquaNova, tender model, qualification gaps и необходимость consortium route.", handoff: "Conditional BID + consortium mandate" },
  { id: "consortium", number: "03", title: "Формирование консорциума", description: "Партнёры находятся, дают согласие, проходят due diligence и принимают workshare.", handoff: "Signed three-member consortium baseline" },
  { id: "stage-one", number: "04", title: "Stage 1 · техническая стадия", description: "Без цены создаются solution, credentials, compliance и первая техническая заявка.", handoff: "Stage 1 submission + clarification record" },
  { id: "stage-two", number: "05", title: "Stage 2 · финальная заявка", description: "Revised requirements сходятся с final technical, BOQ, price, legal и red-team work.", handoff: "Final compliant bid $46,80 млн" },
  { id: "award", number: "06", title: "Оценка, award и contract", description: "Clarifications, negotiation, award и signing проходят через явные human gates.", handoff: "Signed contract + mobilization baseline" },
  { id: "execution", number: "07", title: "Execution handoff", description: "TenderLab закрывает advisory Case и передаёт исполнение консорциуму с контрактным контролем.", handoff: "30-month owner-led execution route" },
];

const processOnlyIds = new Set([5, 11, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28]);
const conditionalIds = new Set([30]);
const notInvolvedIds = new Set([42]);
const stageByAgentId = (id: number) => {
  if (id <= 5) return "foundation";
  if (id <= 12) return id === 12 ? "consortium" : "company";
  if (id <= 20) return "discovery";
  if (id <= 30) return id === 30 ? "stage-one" : "stage-one";
  if (id <= 38) return "company";
  if (id <= 46) return "consortium";
  if (id <= 58) return "stage-two";
  if (id <= 61) return "award";
  return "execution";
};

const stageById = new Map(case3Stages.map((stage) => [stage.id, stage]));

export const case3Engagements: CaseAgentEngagement[] = agents.map((agent) => {
  const stageId = stageByAgentId(agent.id);
  const stage = stageById.get(stageId)!;
  if (notInvolvedIds.has(agent.id)) {
    return {
      agentId: agent.id,
      status: "not-involved" as EngagementStatus,
      stageId,
      when: "Не активируется в утверждённом маршруте Case 3",
      why: "Местная компания входит как полноценный JV member, поэтому отдельная сервисная/representation network не создаётся.",
      coveredBy: "Partner Discovery + JV & Consortium Optimization покрывают consortium-member route; Agent 42 не подменяет local contractor.",
    };
  }
  if (conditionalIds.has(agent.id)) {
    return {
      agentId: agent.id,
      status: "conditional" as EngagementStatus,
      stageId,
      when: "E14 · только при вопросах первой стадии",
      why: "Двухэтапная процедура активирует pre-final-bid clarification только после buyer technical dialogue.",
      input: "Stage 1 feedback, source-locked ambiguity register и разрешённый channel.",
      output: "Buyer-ready clarification questions с exact clause citations.",
      next: "E15 revised tender baseline и Stage 2 requirements.",
      condition: "Buyer запрашивает или разрешает формальное уточнение до Stage 2 invitation.",
      activation: "triggered" as ConditionalActivation,
    };
  }
  const status: EngagementStatus = processOnlyIds.has(agent.id) ? "background" : "required";
  return {
    agentId: agent.id,
    status,
    stageId,
    when: status === "background" ? `Process execution вокруг этапа «${stage.title}»` : `Event execution на этапе «${stage.title}»`,
    why: agent.profile.responsibilityScope,
    input: agent.profile.typicalInputs.join(" · "),
    output: agent.output.primary,
    next: agent.output.consumers,
  };
});

const ids = case3Engagements.map((item) => item.agentId);
if (ids.length !== 64 || new Set(ids).size !== 64) throw new Error("Case 3 needs exactly one engagement record for every canonical Agent.");
if (case3Engagements.some((item) => !stageById.has(item.stageId))) throw new Error("Every Case 3 engagement needs a known stage.");
if (case3Engagements.some((item) => item.status !== "not-involved" && (!item.input || !item.output || !item.next))) throw new Error("Every involved Case 3 Agent needs input, output and handoff.");
