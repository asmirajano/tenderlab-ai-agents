import type { CaseAgentEngagement } from "./case-1-data.ts";
import { case1, case1Engagements } from "./case-1-data.ts";
import { case1ProcessGraph } from "./case-1-graph.ts";
import { case2, case2Engagements } from "./case-2-data.ts";
import { case2ProcessGraph } from "./case-2-graph.ts";

export type ComparisonGroup = "starting" | "relationship" | "workflow" | "agents" | "data" | "outcome";
export type ComparisonRelation = "same" | "similar" | "different-path" | "different" | "critical" | "only-one";

export type ComparisonValue = {
  text: string;
  key: string;
  family?: string;
  highlights?: string[];
  absent?: boolean;
};

export type CaseComparisonProfile = {
  caseNumber: number;
  id: string;
  name: string;
  shortName: string;
  color: string;
  entryPath: string[];
  entrySummary: string;
  relationshipSummary: string;
  endpointSummary: string;
  convergenceState: string;
  convergenceEvent: string;
  engagements: CaseAgentEngagement[];
  eventCount: number;
  processCount: number;
  attributes: Record<string, ComparisonValue>;
};

export type ComparisonDimension = {
  id: string;
  group: ComparisonGroup;
  label: string;
  importance?: "normal" | "critical";
  shortWhy: string;
};

const value = (text: string, key: string, family?: string, highlights: string[] = [], absent = false): ComparisonValue => ({ text, key, family, highlights, absent });

export const comparisonGroups: Array<{ id: ComparisonGroup; label: string; description: string }> = [
  { id: "starting", label: "Starting Point", description: "Как и с какими исходными знаниями начинается Case" },
  { id: "relationship", label: "Company Relationship", description: "Кто и когда получает право работать с компанией" },
  { id: "workflow", label: "Workflow", description: "Последовательность, параллельные ветви и граница Case" },
  { id: "agents", label: "Agents", description: "Какая бизнес-работа меняет участие и роль Agents" },
  { id: "data", label: "Data", description: "Какие факты, evidence и решения доступны по ходу Case" },
  { id: "outcome", label: "Outcome / KPI", description: "Чем заканчивается Case и как измеряется успех" },
];

export const comparisonDimensions: ComparisonDimension[] = [
  { id: "purpose", group: "starting", label: "Назначение Case", importance: "critical", shortWhy: "Определяет всю границу работы" },
  { id: "monetization", group: "starting", label: "Тип монетизации консультанта", importance: "critical", shortWhy: "Оплата привязана к разным business outcomes" },
  { id: "consultantIncome", group: "starting", label: "Симулированный доход консультанта", shortWhy: "DEMO-расчёт, не фактическая выручка" },
  { id: "trigger", group: "starting", label: "Формальный trigger", shortWhy: "Оба маршрута запускает внешний notice" },
  { id: "startingSituation", group: "starting", label: "Исходная ситуация", importance: "critical", shortWhy: "Разная готовность к контакту" },
  { id: "knownAtStart", group: "starting", label: "Что известно на старте", shortWhy: "Оба Case читают reusable intelligence" },
  { id: "unknownAtStart", group: "starting", label: "Что ещё неизвестно", shortWhy: "Определяет объём проверки" },
  { id: "companySelection", group: "starting", label: "Как выбрана компания", shortWhy: "Known candidate против cold prospect" },
  { id: "relationship", group: "relationship", label: "Отношения с компанией", importance: "critical", shortWhy: "Case 2 требует отдельной activation architecture" },
  { id: "permission", group: "relationship", label: "Permission / consent", importance: "critical", shortWhy: "Нельзя смешивать доступный контакт и informed consent" },
  { id: "consultantMission", group: "relationship", label: "Миссия Consultant", importance: "critical", shortWhy: "Delivery support против opportunity activation" },
  { id: "consultantStart", group: "relationship", label: "Когда включается Consultant", shortWhy: "В Case 2 — до первого контакта" },
  { id: "consultantDone", group: "relationship", label: "Когда задача Consultant завершена", shortWhy: "Разные operating boundaries" },
  { id: "companyMaturity", group: "relationship", label: "Зрелость компании", shortWhy: "Влияет на onboarding и readiness" },
  { id: "entrySequence", group: "workflow", label: "Входной маршрут", importance: "critical", shortWhy: "Warm candidate и cold activation идут разными путями" },
  { id: "parallelWork", group: "workflow", label: "Параллельная работа", shortWhy: "Данные готовятся без искусственной линейности" },
  { id: "decisionGates", group: "workflow", label: "Human decision gates", importance: "critical", shortWhy: "В Case 2 три разных решения до handoff" },
  { id: "participationRoute", group: "workflow", label: "Маршрут участия", shortWhy: "Local partner активирован только там, где нужен" },
  { id: "bidPreparation", group: "workflow", label: "Proposal / submission", shortWhy: "Case boundary объясняет большую часть Agent difference" },
  { id: "postAward", group: "workflow", label: "Award / execution", shortWhy: "Только один Case проверяет downstream lifecycle" },
  { id: "agentScope", group: "agents", label: "Agent scope", importance: "critical", shortWhy: "Counts являются следствием scope, а не причиной" },
  { id: "humanOnlyWork", group: "agents", label: "Human-only work", shortWhy: "Outreach не превращается в искусственный Agent" },
  { id: "companyEvidence", group: "data", label: "Company evidence", shortWhy: "Public hypothesis отличается от verified baseline" },
  { id: "tenderEvidence", group: "data", label: "Tender evidence", shortWhy: "Оба Case используют source-locked facts" },
  { id: "commercialModel", group: "data", label: "Коммерческая модель", importance: "critical", shortWhy: "Fixed contract value и framework ceiling нельзя считать одинаково" },
  { id: "procedure", group: "data", label: "Процедура", shortWhy: "Влияет на формы, сроки и economics" },
  { id: "endpoint", group: "outcome", label: "Endpoint Case", importance: "critical", shortWhy: "Activation success не равен tender award" },
  { id: "success", group: "outcome", label: "Условие успеха", shortWhy: "Каждый Case измеряется внутри своей boundary" },
  { id: "kpi", group: "outcome", label: "Основные KPI", shortWhy: "Scores относятся к разным стадиям" },
  { id: "failure", group: "outcome", label: "Что считается неуспехом", shortWhy: "Корректное termination не всегда системная ошибка" },
];

const case1Profile: CaseComparisonProfile = {
  caseNumber: 1,
  id: case1.id,
  name: case1.name,
  shortName: "Школьная мебель",
  color: "#176b51",
  entryPath: ["Tender", "Known candidate", "Permission", "Verified assessment"],
  entrySummary: "Доступный company candidate быстро входит в полный tender lifecycle.",
  relationshipSummary: "Доступный company candidate",
  endpointSummary: "Award → contract → execution → verified learning.",
  convergenceState: "verified-company+tender-facts",
  convergenceEvent: "E07 · Qualification + Match",
  engagements: case1Engagements,
  eventCount: case1ProcessGraph.activities.length,
  processCount: case1ProcessGraph.processes.length,
  attributes: {
    purpose: value("Провести известного производителя через полный тендерный и контрактный цикл.", "full-lifecycle", "tender-lifecycle", ["полный тендерный и контрактный цикл"]),
    monetization: value("DEMO · Success fee после award и подписания контракта.", "award-success-fee", "consulting-revenue", ["DEMO", "Success fee", "после award"]),
    consultantIncome: value("DEMO · $90 250 = awarded contract $3.61m × 2.5% success fee.", "usd-90250-award-basis", "simulated-income", ["DEMO", "$90 250", "$3.61m × 2.5%"]),
    trigger: value("Официальная публикация закупки школьной мебели.", "official-tender-publication", "official-notice", ["Официальная публикация"]),
    startingSituation: value("Есть подходящий и непосредственно доступный candidate Anatolia.", "known-contactable-candidate", "candidate-available", ["непосредственно доступный candidate"]),
    knownAtStart: value("Platform policy, taxonomy, provisional profile и tender / award history.", "platform+provisional+history", "reusable-intelligence", ["provisional profile"]),
    unknownAtStart: value("Verified capacity, credentials, eligibility, Match, цена и execution model.", "verification+fit+delivery", "verification-needed", ["execution model"]),
    companySelection: value("Anatolia уже присутствует в prospect intelligence как определённый candidate.", "preselected-candidate", "prospect-intelligence", ["определённый candidate"]),
    relationship: value("Отдельный CRM status не хранится; workflow предполагает доступный канал к компании.", "warm-contact-assumed", "company-relationship", ["доступный канал"]),
    permission: value("E03: компания сразу разрешает углублённую tender-specific работу.", "direct-permission", "consent", ["E03", "сразу разрешает"]),
    consultantMission: value("Помочь участвующей компании закрыть gaps, compliance, partner и QA work.", "delivery-support", "consultant-support", ["закрыть gaps", "QA"]),
    consultantStart: value("После company permission — на специализированных delivery-ветвях.", "post-permission-support", "consultant-timing", ["После company permission"]),
    consultantDone: value("После ключевого tender support; contract execution принадлежит компании и Buyer.", "tender-support-complete", "consultant-boundary", ["tender support"]),
    companyMaturity: value("Опытный производитель и экспортёр; подтверждаются аналогичные контракты.", "experienced-exporter", "manufacturer", ["Опытный", "аналогичные контракты"]),
    entrySequence: value("Tender → ranking против известного candidate → permission → verification.", "tender-known-candidate-permission", "entry-path", ["известного candidate"]),
    parallelWork: value("Company verification и tender corpus; затем market enrichment и monitoring.", "company+documents+market", "parallel-intelligence", ["Company verification", "tender corpus"]),
    decisionGates: value("Permission, Conditional BID, цена, final package, clarification, award и contract.", "full-lifecycle-gates", "human-gates", ["award", "contract"]),
    participationRoute: value("Prime bidder + активированный грузинский local-service subcontractor.", "prime+local-service", "participation-route", ["local-service subcontractor"]),
    bidPreparation: value("Входит в Case: solution, compliance, pricing, proposal, QA и submission.", "included", "bid-preparation", ["Входит в Case"]),
    postAward: value("Входит в Case: award, contract, mobilization, execution, acceptance и learning.", "included-full", "post-award", ["Входит в Case"]),
    agentScope: value("Agents покрывают полный маршрут discovery → post-award learning.", "full-registry-route", "agent-scope", ["post-award learning"]),
    humanOnlyWork: value("Критические approvals принадлежат людям; отдельного outreach Event нет.", "approvals-no-outreach", "human-authority", ["approvals"]),
    companyEvidence: value("Public profile заменяется Verified Company Profile, capacity и credentials.", "verified-company-baseline", "verified-evidence", ["Verified Company Profile"]),
    tenderEvidence: value("Source-locked corpus, 164 requirements, evaluation model и 68 BOQ lines.", "source-locked-tender-model", "tender-evidence", ["164 requirements", "68 BOQ lines"]),
    commercialModel: value("Один определённый lot: landed cost, final BOQ и фиксированная bid price.", "fixed-lot-price", "commercial-model", ["фиксированная bid price"]),
    procedure: value(`${case1.procurementMethod}; ${case1.submissionWindow}; исполнение ${case1.deliveryWindow}.`, "open-international-single-contract", "open-procurement", [case1.procurementMethod]),
    endpoint: value("Verified contract outcome и обновлённые knowledge / intelligence records.", "verified-contract-outcome", "case-endpoint", ["Verified contract outcome"]),
    success: value("Соответствующая заявка, award, подписанный и исполненный контракт.", "award+execution", "successful-participation", ["award", "исполненный контракт"]),
    kpi: value("Readiness 84 · Match 88 · Compliance 164/164 · $3.61m · contract completed.", "full-lifecycle-kpis", "kpi", ["contract completed"]),
    failure: value("No-Bid, mandatory gap, late/non-compliant bid, проигрыш или срыв исполнения.", "participation-or-delivery-failure", "failure", ["срыв исполнения"]),
  },
};

const case2Profile: CaseComparisonProfile = {
  caseNumber: 2,
  id: case2.id,
  name: case2.name,
  shortName: "PPE activation",
  color: "#6353aa",
  entryPath: ["Tender", "Cold prospect", "Outreach gate", "Consent", "Verified assessment"],
  entrySummary: "TenderLab активирует ещё не вовлечённый prospect через evidence и consent.",
  relationshipSummary: "Cold prospect activation",
  endpointSummary: "Conditional BID → frozen Activation Dossier → Client Side handoff.",
  convergenceState: "verified-company+tender-facts",
  convergenceEvent: "E09 · Qualification + Fit",
  engagements: case2Engagements,
  eventCount: case2ProcessGraph.activities.length,
  processCount: case2ProcessGraph.processes.length,
  attributes: {
    purpose: value("Найти prospect, доказательно активировать интерес и передать opportunity в Client Side.", "activation-handoff", "activation-lifecycle", ["активировать интерес", "Client Side"]),
    monetization: value("DEMO · Fixed activation fee за consented и verified Client handoff; возможный success fee относится к следующему Case.", "fixed-activation-fee", "consulting-revenue", ["DEMO", "Fixed activation fee", "следующему Case"]),
    consultantIncome: value("DEMO · $15 000 fixed fee за approved Activation Dossier и Client Side handoff.", "usd-15000-activation-basis", "simulated-income", ["DEMO", "$15 000", "Activation Dossier"]),
    trigger: value("Официальная публикация рамочной закупки PPE.", "official-tender-publication", "official-notice", ["Официальная публикация"]),
    startingSituation: value("MedTex не знает, что TenderLab исследует её публичный профиль.", "cold-unaware-prospect", "candidate-available", ["не знает"]),
    knownAtStart: value("Platform policy, taxonomy, provisional profile и tender / award history.", "platform+provisional+history", "reusable-intelligence", ["provisional profile"]),
    unknownAtStart: value("Interest, consent, verified identity, ownership, credentials, readiness и fit.", "consent+verification+fit", "verification-needed", ["Interest, consent"]),
    companySelection: value("MedTex обнаружена в открытых источниках как потенциальный PPE prospect.", "open-source-prospect", "prospect-intelligence", ["открытых источниках"]),
    relationship: value("Отношения отсутствуют; до E04 действует contact prohibition и outreach governance.", "cold-no-relationship", "company-relationship", ["Отношения отсутствуют", "contact prohibition"]),
    permission: value("E03 разрешает contact basis; E06 отдельно фиксирует informed consent.", "outreach-gate+informed-consent", "consent", ["E03", "E06", "informed consent"]),
    consultantMission: value("Превратить evidence-backed hypothesis в consented и verified Client Case.", "opportunity-activation", "consultant-support", ["consented", "verified Client Case"]),
    consultantStart: value("До первого контакта — на внутреннем outreach gate E03.", "pre-contact-gate", "consultant-timing", ["До первого контакта", "E03"]),
    consultantDone: value("E12: frozen Activation Dossier передан Client-owned preparation route.", "activation-handoff-complete", "consultant-boundary", ["E12", "Activation Dossier"]),
    companyMaturity: value("Начинающий экспортёр PPE; international readiness требует доказательства.", "new-exporter", "manufacturer", ["Начинающий экспортёр"]),
    entrySequence: value("Tender → public prospect → outreach approval → human contact → response → consent.", "tender-cold-prospect-consent", "entry-path", ["human contact", "consent"]),
    parallelWork: value("Market / Buyer enrichment и source-locked tender fact pack до outreach и decision.", "market+buyer+tender-facts", "parallel-intelligence", ["до outreach"]),
    decisionGates: value("Outreach approval E03, informed consent E06 и Conditional BID E11.", "activation-three-gates", "human-gates", ["E03", "E06", "E11"]),
    participationRoute: value("Direct manufacturer route подтверждён; alternative route остаётся standby.", "direct-route", "participation-route", ["Direct manufacturer", "standby"]),
    bidPreparation: value("Не входит: начинается в следующем Client-owned Case после E12.", "excluded-next-case", "bid-preparation", ["Не входит", "после E12"]),
    postAward: value("Не входит в Activation Case.", "excluded", "post-award", ["Не входит"], true),
    agentScope: value("Agents покрывают prospect activation, verification, decision и controlled handoff.", "activation-agent-route", "agent-scope", ["prospect activation", "handoff"]),
    humanOnlyWork: value("E04 outreach и E05 prospect response остаются Human / External Actions.", "human-outreach+response", "human-authority", ["E04", "E05", "Human / External"]),
    companyEvidence: value("Public hypothesis используется до consent; private evidence создаёт verified baseline.", "public-to-verified", "verified-evidence", ["до consent", "verified baseline"]),
    tenderEvidence: value("Source-locked corpus, requirements и evaluation model готовятся до outreach.", "source-locked-tender-model", "tender-evidence", ["до outreach"]),
    commercialModel: value("Framework ceiling: economics строится по вероятным call-offs и downside scenarios.", "framework-calloff-economics", "commercial-model", ["Framework ceiling", "call-offs"]),
    procedure: value(`${case2.procurementMethod}; ${case2.submissionWindow}; ${case2.deliveryWindow}.`, "open-un-framework", "open-procurement", [case2.procurementMethod]),
    endpoint: value("Frozen Activation Dossier и явный handoff в Client-owned bid preparation.", "activation-dossier-handoff", "case-endpoint", ["Activation Dossier", "handoff"]),
    success: value("Consent, verified company, Conditional BID и назначенный Client owner.", "consent+conditional-bid+handoff", "successful-participation", ["Consent", "Conditional BID"]),
    kpi: value("Preliminary 91 · Readiness 71 · Verified Match 87 · consent · handoff complete.", "activation-kpis", "kpi", ["consent", "handoff complete"]),
    failure: value("Outreach rejected, opt-out/тишина, no consent, failed verification или No-Bid.", "activation-termination", "failure", ["opt-out", "no consent"]),
  },
};

export const caseComparisonRegistry: CaseComparisonProfile[] = [case1Profile, case2Profile];

export function compareValues(left: ComparisonValue, right: ComparisonValue, dimension: ComparisonDimension): ComparisonRelation {
  if (left.key === right.key) return "same";
  if (left.absent !== right.absent) return "only-one";
  if (dimension.importance === "critical") return "critical";
  if (left.family && left.family === right.family) return dimension.group === "workflow" || dimension.group === "relationship" ? "different-path" : "similar";
  return "different";
}
