import type { CaseAgentEngagement } from "./case-1-data.ts";
import { case1, case1Engagements } from "./case-1-data.ts";
import { case1ProcessGraph } from "./case-1-graph.ts";
import { case2, case2Engagements } from "./case-2-data.ts";
import { case2ProcessGraph } from "./case-2-graph.ts";
import { case3, case3Engagements } from "./case-3-data.ts";
import { case3ProcessGraph } from "./case-3-graph.ts";
import { case4, case4Engagements } from "./case-4-data.ts";
import { case4ProcessGraph } from "./case-4-graph.ts";
import { case5, case5Engagements } from "./case-5-data.ts";
import { case5ProcessGraph } from "./case-5-graph.ts";
import { case6, case6Engagements } from "./case-6-data.ts";
import { case6ProcessGraph } from "./case-6-graph.ts";
import { case7, case7Engagements } from "./case-7-data.ts";
import { case7ProcessGraph } from "./case-7-graph.ts";

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

const case3Profile: CaseComparisonProfile = {
  caseNumber: 3,
  id: case3.id,
  name: case3.name,
  shortName: "WTP consortium",
  color: "#a46a08",
  entryPath: ["Tender", "Known lead", "Permission", "Consortium formation", "Two-stage bid"],
  entrySummary: "Один verified lead превращается в доказательно сформированный трёхсторонний bidder.",
  relationshipSummary: "Multi-company consortium formation",
  endpointSummary: "Award → signed contract → controlled mobilisation handoff.",
  convergenceState: "verified-consortium+tender-facts",
  convergenceEvent: "E10 · Binding Consortium Gate",
  engagements: case3Engagements,
  eventCount: case3ProcessGraph.activities.length,
  processCount: case3ProcessGraph.processes.length,
  attributes: {
    purpose: value("Сформировать квалифицированный консорциум и провести его через две стадии Works tender до contract/mobilisation handoff.", "consortium-two-stage-award", "tender-lifecycle", ["консорциум", "две стадии", "mobilisation handoff"]),
    monetization: value(case3.monetization, "milestone-fixed-advisory", "consulting-revenue", ["DEMO", "milestone-based fixed advisory fee"]),
    consultantIncome: value(case3.consultantIncome, "usd-240000-three-milestones", "simulated-income", ["DEMO", "$240 000", "$60 000", "$80 000", "$100 000"]),
    trigger: value(case3.trigger, "official-tender+client-route-request", "official-notice", ["Официальная публикация", "решение AquaNova"]),
    startingSituation: value(case3.startingCondition, "known-incomplete-lead", "candidate-available", ["не имеет полного", "местной строительной лицензии"]),
    knownAtStart: value("Platform policy, provisional AquaNova profile, ADB/Buyer history и official source package.", "platform+lead+history", "reusable-intelligence", ["provisional AquaNova profile"]),
    unknownAtStart: value("Verified lead eligibility, partner consent, member evidence, combined qualification, workshare, solution, BOQ и final price.", "consortium+qualification+price", "verification-needed", ["partner consent", "combined qualification"]),
    companySelection: value("AquaNova — известный инженерный lead; два недостающих members выбираются после evidence-based discovery.", "known-lead+discovered-members", "prospect-intelligence", ["известный инженерный lead", "discovery"]),
    relationship: value("Один Client lead + два external candidates, которые становятся JV members только после consent, verification и signed agreement.", "lead-to-multiparty-consortium", "company-relationship", ["JV members", "signed agreement"]),
    permission: value("E03 открывает feasibility; E08 даёт member data-room consent; E10 создаёт binding three-party authority.", "layered-three-party-permission", "consent", ["E03", "E08", "E10"]),
    consultantMission: value(case3.consultantRole, "consortium-architect+bid-advisor", "consultant-support", ["проектирует и проверяет маршрут", "не выбирает партнёров"]),
    consultantStart: value("E03: после explicit mandate известного lead, до partner discovery.", "post-lead-mandate", "consultant-timing", ["E03", "до partner discovery"]),
    consultantDone: value("E22: contract signed, mobilisation baseline передан, 3/3 milestones закрыты.", "mobilisation-handoff-complete", "consultant-boundary", ["E22", "3/3 milestones"]),
    companyMaturity: value("Опытный engineering lead + verified OEM + local Works contractor; combined bidder создаётся внутри Case.", "multi-company-works-consortium", "manufacturer", ["combined bidder"]),
    entrySequence: value("Tender → known incomplete lead → permission → member discovery/consent → JV gate → two-stage bid.", "lead-consortium-two-stage", "entry-path", ["member discovery/consent", "JV gate"]),
    parallelWork: value("Tender/market models; partner due diligence; specialist RFQ; затем parallel final technical + commercial branches.", "tender+partners+supply+dual-final", "parallel-intelligence", ["parallel final technical + commercial"]),
    decisionGates: value("Lead mandate E03, Conditional BID E06, JV agreement E10, Stage 1 E13, final bid E18, negotiation E20, contract E21.", "multiparty-seven-gates", "human-gates", ["JV agreement E10", "final bid E18"]),
    participationRoute: value("AquaNova 42% lead + Anatolia 33% OEM + SteppeBuild 25% local contractor.", "three-member-jv", "participation-route", ["42%", "33%", "25%"]),
    bidPreparation: value("Входит полностью: Stage 1 technical submission, dialogue, revised Stage 2 technical/commercial bid.", "included-two-stage", "bid-preparation", ["Stage 1", "Stage 2"]),
    postAward: value("Входит до signed contract и mobilisation handoff; 30-month execution completion не симулируется.", "included-to-mobilisation", "post-award", ["mobilisation handoff", "не симулируется"]),
    agentScope: value("Agents покрывают multi-party formation, two-stage rework, complex Works pricing, award and mobilisation setup.", "consortium-full-bid-route", "agent-scope", ["multi-party formation", "two-stage rework"]),
    humanOnlyWork: value("Partner consent E08, three-party approvals и Buyer evaluation/award остаются Actor decisions.", "consent+member+buyer-authority", "human-authority", ["Partner consent E08", "Actor decisions"]),
    companyEvidence: value("Три separate verified dossiers + member-specific reliance + combined qualification/workshare ledger.", "three-member-evidence", "verified-evidence", ["three", "combined qualification"]),
    tenderEvidence: value("Multilingual source-locked corpus, two-stage qualification/evaluation model and change impacts.", "two-stage-source-model", "tender-evidence", ["two-stage", "change impacts"]),
    commercialModel: value("One EPC lot: member workshare costs + specialist RFQs + 30-month cash flow → final $46.80m bid.", "epc-workshare-price", "commercial-model", ["workshare costs", "$46.80m"]),
    procedure: value(`${case3.procurementMethod}; ${case3.submissionWindow}; ${case3.deliveryWindow}.`, "adb-two-stage-works", "two-stage-procurement", [case3.procurementMethod]),
    endpoint: value(case3.endpoint, "contract+mobilisation-handoff", "case-endpoint", ["award", "mobilization baseline"]),
    success: value("Three verified members, both stages accepted, compliant final bid, award and signed contract.", "consortium-award+contract", "successful-participation", ["both stages", "signed contract"]),
    kpi: value(case3.kpi, "consortium-two-stage-kpis", "kpi", ["qualification 100%", "$46,80 млн", "3/3"]),
    failure: value("No compliant member, failed JV approval, Stage 1 rejection, unresolved Stage 2 deviation, unauthorised price or no award.", "consortium-route-failure", "failure", ["failed JV approval", "Stage 1 rejection"]),
  },
};

const case4Profile: CaseComparisonProfile = {
  caseNumber: 4,
  id: case4.id,
  name: case4.name,
  shortName: "Digital health QCBS",
  color: "#147b86",
  entryPath: ["REOI", "EOI", "Shortlist", "RFP", "Two envelopes", "QCBS contract"],
  entrySummary: "Известная consulting firm проходит отдельные REOI и RFP gates до quality-based contract.",
  relationshipSummary: "Known consultant + local specialist subcontractor",
  endpointSummary: "QCBS rank 1 → negotiated time-based contract → inception handoff.",
  convergenceState: "verified-firm+experts+current-rfp",
  convergenceEvent: "E10 · Final BID Gate",
  engagements: case4Engagements,
  eventCount: case4ProcessGraph.activities.length,
  processCount: case4ProcessGraph.processes.length,
  attributes: {
    purpose: value("Провести consulting firm через REOI, shortlist, QCBS proposal и negotiation до signed time-based contract.", "qcbs-consulting-contract", "consulting-lifecycle", ["REOI", "shortlist", "QCBS"]),
    monetization: value(case4.monetization, "fixed-four-milestones", "consulting-revenue", ["DEMO", "fixed advisory fee"]),
    consultantIncome: value(case4.consultantIncome, "usd-85000-four-milestones", "simulated-income", ["DEMO", "$85 000"]),
    trigger: value(case4.trigger, "world-bank-reoi+client-check", "official-notice", ["World Bank REOI"]),
    startingSituation: value(case4.startingCondition, "known-consultant-local-gap", "candidate-available", ["не имеет проекта в Руанде", "local specialist"]),
    knownAtStart: value("Verified firm profile, international assignments, digital-health capability и public Buyer/award history.", "verified-firm+history", "reusable-intelligence", ["Verified firm profile"]),
    unknownAtStart: value("Shortlist decision, current RFP, 11 expert availability, local privacy fit, QCBS score и negotiated terms.", "shortlist+experts+qcbs", "verification-needed", ["11 expert availability", "QCBS score"]),
    companySelection: value("NorthStar — existing Client with relevant consulting capability; она не обнаруживается как cold prospect.", "existing-specialist-client", "prospect-intelligence", ["existing Client"]),
    relationship: value("Existing Client firm + один проверяемый local specialist subcontractor; Buyer сохраняет independent authority.", "client+specialist-subcontractor", "company-relationship", ["local specialist subcontractor"]),
    permission: value("E03 разрешает EOI; E10 — full RFP proposal; E13 — final two-envelope submission.", "layered-eoi-rfp-submission", "consent", ["E03", "E10", "E13"]),
    consultantMission: value(case4.consultantRole, "qcbs-evidence+proposal-advisor", "consultant-support", ["QCBS gates", "не подтверждает CV"]),
    consultantStart: value("До EOI: после REOI review и отдельного company approval E03.", "pre-eoi-advisory", "consultant-timing", ["E03"]),
    consultantDone: value("E15: contract и inception baseline переданы 36-month delivery team.", "contract-inception-handoff", "consultant-boundary", ["E15", "inception baseline"]),
    companyMaturity: value("Опытная boutique consulting firm с international digital-health references, но без Rwanda delivery baseline.", "experienced-consulting-boutique", "consulting-firm", ["consulting firm", "без Rwanda"]),
    entrySequence: value("REOI → REOI decision → EOI → Buyer shortlist → RFP → final BID gate.", "reoi-eoi-shortlist-rfp", "entry-path", ["EOI", "Buyer shortlist"]),
    parallelWork: value("Expert/conflict monitoring; technical and financial envelopes remain parallel and information-separated.", "experts+separate-envelopes", "parallel-intelligence", ["information-separated"]),
    decisionGates: value("REOI E03, Buyer shortlist E06, final BID E10, submission E13, technical threshold E14, negotiation E15.", "qcbs-six-gates", "human-gates", ["technical threshold E14"]),
    participationRoute: value("Prime consultant + scoped local privacy specialist subcontractor; no JV and no supplier chain.", "prime+specialist-subcontractor", "participation-route", ["no JV", "no supplier chain"]),
    bidPreparation: value("Входит: EOI, technical methodology/CVs, separate financial envelope, QA и submission.", "eoi+two-envelope-included", "bid-preparation", ["separate financial envelope"]),
    postAward: value("Входит до signed contract и inception handoff; 36-month service delivery остаётся downstream.", "included-to-inception", "post-award", ["inception handoff"]),
    agentScope: value("Agents проверяются на Consultants/QCBS, key-expert evidence, privacy/conflict и time-based price.", "qcbs-agent-route", "agent-scope", ["key-expert evidence", "time-based price"]),
    humanOnlyWork: value("Buyer shortlist, technical score, financial opening, ranking и award остаются Buyer decisions.", "buyer-qcbs-authority", "human-authority", ["Buyer decisions"]),
    companyEvidence: value("Verified firm assignments + 11 individual CV/availability records + local specialist evidence.", "firm+experts+local-evidence", "verified-evidence", ["11 individual CV"]),
    tenderEvidence: value("REOI baseline заменяется authoritative RFP corpus, Addendum 01 и QCBS scorecard.", "reoi-to-rfp-versioned", "tender-evidence", ["Addendum 01", "QCBS scorecard"]),
    commercialModel: value("Time-based expert-month remuneration + reimbursables; price is sealed from technical evaluators.", "time-based-separated-price", "commercial-model", ["expert-month", "sealed"]),
    procedure: value(`${case4.procurementMethod}; ${case4.submissionWindow}; ${case4.deliveryWindow}.`, "world-bank-qcbs-consultants", "consulting-procurement", [case4.procurementMethod]),
    endpoint: value(case4.endpoint, "signed-consultancy-contract+inception", "case-endpoint", ["time-based consultancy contract", "inception"]),
    success: value("Shortlisted, technical threshold passed, combined rank 1 and negotiated contract signed.", "shortlist+threshold+rank1+contract", "successful-participation", ["rank 1", "contract signed"]),
    kpi: value(case4.kpi, "qcbs-consulting-kpis", "kpi", ["86/100", "$4,62 млн", "11/11"]),
    failure: value("Not shortlisted, unavailable expert, conflict, technical score <75, envelope breach or failed negotiation.", "qcbs-route-failure", "failure", ["score <75", "envelope breach"]),
  },
};

const case5Profile: CaseComparisonProfile = {
  caseNumber: 5,
  id: case5.id,
  name: case5.name,
  shortName: "Cold-chain framework",
  color: "#8c4f9f",
  entryPath: ["RFP", "Known service provider", "Assessment mandate", "Carrier network", "Framework", "Call-off"],
  entrySummary: "Known service provider builds a verified subcontractor network before bidding for a performance framework.",
  relationshipSummary: "Single prime + six service subcontractors",
  endpointSummary: "Framework award → authorised call-off → SLA acceptance → payment certificate.",
  convergenceState: "verified-bidder+service-network+current-rfp",
  convergenceEvent: "E12 · Final BID Gate",
  engagements: case5Engagements,
  eventCount: case5ProcessGraph.activities.length,
  processCount: case5ProcessGraph.processes.length,
  attributes: {
    purpose: value("Провести service provider через performance-based framework и доказать архитектуру на первом accepted emergency call-off.", "framework-first-calloff", "service-lifecycle", ["performance-based framework", "first accepted emergency call-off"]),
    monetization: value(case5.monetization, "fixed-three-milestones", "consulting-revenue", ["DEMO", "milestone-based advisory fee"]),
    consultantIncome: value(case5.consultantIncome, "usd-145000-three-milestones", "simulated-income", ["DEMO", "$145 000"]),
    trigger: value(case5.trigger, "open-rfp+framework-economics", "official-notice", ["международного RFP", "uncertain call-off volumes"]),
    startingSituation: value(case5.startingCondition, "known-service-provider-network-gap", "candidate-available", ["не покрывает все 18 counties", "SLA baseline"]),
    knownAtStart: value("Verified core company/GDP profile, Kenyan branch, regional references and public Buyer/award history.", "verified-core+history", "reusable-intelligence", ["Verified core company"]),
    unknownAtStart: value("Current SLA/rate rules, six-carrier consent/capacity, downside volume economics, Buyer evaluation and actual first-call-off performance.", "sla+carriers+downside+performance", "verification-needed", ["six-carrier", "actual first-call-off"]),
    companySelection: value("FrostLink is an existing regional service-provider candidate with verified cold-chain capability.", "existing-service-provider", "prospect-intelligence", ["existing regional service-provider"]),
    relationship: value("Existing Client prime + six external carriers that become approved subcontractors only after consent, verification and company approval.", "client+six-subcontractors", "company-relationship", ["six external carriers", "approved subcontractors"]),
    permission: value("E03 assessment mandate; E08 carrier consent/approval; E12 BID authority; E15 submission signature; E18 Buyer call-off authority.", "layered-client-carrier-buyer-authority", "consent", ["E08", "E18"]),
    consultantMission: value(case5.consultantRole, "framework-network+sla-advisor", "consultant-support", ["service-network design", "не выбирает перевозчиков"]),
    consultantStart: value("E03: after company assessment mandate, before any carrier RFQ/contact execution.", "post-assessment-mandate", "consultant-timing", ["E03", "before any carrier RFQ"]),
    consultantDone: value("E20: first call-off accepted and payment-certified; recurring framework operations transfer downstream.", "first-calloff-handoff", "consultant-boundary", ["E20", "payment-certified"]),
    companyMaturity: value("Experienced regional cold-chain operator with core certifications, but incomplete surge/subcontractor coverage for this national SLA.", "experienced-logistics-network-gap", "service-provider", ["incomplete surge/subcontractor coverage"]),
    entrySequence: value("RFP → known service provider → mandate → RFP/company branches → carrier network/RFQ → BID.", "rpf-provider-network-rfq-bid", "entry-path", ["carrier network/RFQ"]),
    parallelWork: value("RFP and bidder evidence; market intelligence; carrier assurance; then parallel technical/commercial proposal branches and live SLA Process.", "documents+company+network+dual-bid+sla", "parallel-intelligence", ["live SLA Process"]),
    decisionGates: value("Assessment E03, carrier roster E08, BID E12, submission E15, Buyer drill/rank E16, framework E17, call-off E18 and acceptance E20.", "framework-eight-gates", "human-gates", ["call-off E18", "acceptance E20"]),
    participationRoute: value("Single FrostLink prime + six disclosed service subcontractors; no JV and no goods supplier chain.", "prime+six-service-subcontractors", "participation-route", ["no JV", "service subcontractors"]),
    bidPreparation: value("Included: service architecture, SLA evidence, carrier RFQ/rate book, technical/commercial proposal, QA and submission.", "included-service-best-value", "bid-preparation", ["carrier RFQ/rate book"]),
    postAward: value("Included through framework mobilisation, Buyer-authorised first call-off, SLA execution, acceptance and payment certificate.", "included-first-calloff", "post-award", ["first call-off", "payment certificate"]),
    agentScope: value("Agents are tested on service-vendor sourcing, uncertain framework economics, SLA operations, call-off authority, payment and learning.", "service-framework-agent-route", "agent-scope", ["call-off authority", "SLA operations"]),
    humanOnlyWork: value("Carrier consent, BID/signature, Buyer score/award/call-off/acceptance and physical dispatch remain Actor decisions/actions.", "carrier+company+buyer-authority", "human-authority", ["Buyer score/award/call-off/acceptance"]),
    companyEvidence: value("Verified prime dossier + 6 carrier dossiers + consent + hub/vehicle/telemetry capacity evidence and performance refresh.", "prime+six-carrier-evidence", "verified-evidence", ["6 carrier dossiers", "performance refresh"]),
    tenderEvidence: value("Source-locked RFP, 148 requirements, 34 SLA metrics, Addendum 02, rate template and call-off/acceptance records.", "rfp+sla+calloff-evidence", "tender-evidence", ["34 SLA metrics", "call-off/acceptance records"]),
    commercialModel: value("Framework ceiling with zero guaranteed volume: route rate card + low/base/high call-off scenarios + first actual service order.", "framework-service-rate-scenarios", "commercial-model", ["zero guaranteed volume", "first actual service order"]),
    procedure: value(`${case5.procurementMethod}; ${case5.submissionWindow}; ${case5.deliveryWindow}.`, "open-performance-services-framework", "service-procurement", [case5.procurementMethod]),
    endpoint: value(case5.endpoint, "accepted-calloff+payment+handoff", "case-endpoint", ["payment certificate", "operations team"]),
    success: value("Compliant best-value bid, framework award, ready service network and accepted first call-off within SLA.", "award+accepted-calloff", "successful-participation", ["accepted first call-off"]),
    kpi: value(case5.kpi, "framework-sla-kpis", "kpi", ["88/100", "98,7%", "0 critical excursions"]),
    failure: value("No verified surge network, rate downside below floor, technical/drill failure, unauthorised call-off, SLA breach or rejected performance evidence.", "framework-service-failure", "failure", ["unauthorised call-off", "SLA breach"]),
  },
};

const case6Profile: CaseComparisonProfile = {
  caseNumber: 6,
  id: case6.id,
  name: case6.name,
  shortName: "Reverse auction remedy",
  color: "#d96f32",
  entryPath: ["Notice", "Trader assessment", "OEM route", "Reverse auction", "Complaint", "Re-evaluation", "Contract"],
  entrySummary: "Commodity trader enters a human-controlled e-auction, finishes second and wins only after an upheld administrative complaint.",
  relationshipSummary: "Single-prime trader + 2 OEM + local importer",
  endpointSummary: "Rank 2 → complaint upheld → re-evaluation → final award → signed contract.",
  convergenceState: "verified-trader+supply-route+auction-rules+review-standing",
  convergenceEvent: "E11 · BID + auction authority gate",
  engagements: case6Engagements,
  eventCount: case6ProcessGraph.activities.length,
  processCount: case6ProcessGraph.processes.length,
  attributes: {
    purpose: value("Проверить reverse-auction и formal-remedy route: второй bidder получает contract только после upheld complaint и re-evaluation.", "reverse-auction-remedy", "award-remedy-lifecycle", ["upheld complaint", "re-evaluation"]),
    monetization: value(case6.monetization, "hybrid-bid-complaint-success", "consulting-revenue", ["DEMO", "hybrid", "1% award success fee"]),
    consultantIncome: value(case6.consultantIncome, "usd-150600-hybrid", "simulated-income", ["DEMO", "$150 600", "1% × $10,56 млн"]),
    trigger: value(case6.trigger, "official-reverse-auction-notice", "official-notice", ["reverse-auction notice"]),
    startingSituation: value(case6.startingCondition, "trader-with-tender-specific-route-gaps", "candidate-available", ["tender-specific manufacturer authorizations", "auction floor"]),
    knownAtStart: value("Public trader profile, fertilizer categories, reusable OEM candidates and historic Buyer/award records.", "public-trader+supplier+history", "reusable-intelligence", ["Public trader profile"]),
    unknownAtStart: value("Current Portuguese rules, supplier authorizations, local importer status, landed cost, competitor bids and any review ground.", "rules+supply+price+remedy", "verification-needed", ["competitor bids", "review ground"]),
    companySelection: value("AtlasAgri is ranked from public prospect intelligence as a plausible trader, then explicitly authorises private assessment.", "public-prospect-to-mandate", "prospect-intelligence", ["public prospect intelligence"]),
    relationship: value("Client trader remains prime; two OEM and one importer are verified supply entities, not JV members.", "client+oem+importer", "company-relationship", ["not JV members"]),
    permission: value("E03 assessment; E06 supplier roster; E11 BID/floor; E14 submission; E15 each live bid; E17 complaint; E22 contract signature.", "layered-auction-remedy-authority", "consent", ["E15 each live bid", "E17 complaint"]),
    consultantMission: value(case6.consultantRole, "auction-evidence+remedy-advisor", "consultant-support", ["не делает live bids", "не подаёт жалобу"]),
    consultantStart: value("E03 after preliminary opportunity review and explicit AtlasAgri assessment mandate.", "post-assessment-mandate", "consultant-timing", ["E03"]),
    consultantDone: value("E22 signed contract and mobilization handoff; delivery/payment remain downstream.", "signed-contract-handoff", "consultant-boundary", ["E22", "delivery/payment remain downstream"]),
    companyMaturity: value("Experienced international trader with market access but tender-specific OEM/importer/e-auction control gaps.", "experienced-trader-route-gap", "commodity-trader", ["e-auction control gaps"]),
    entrySequence: value("Notice → relevance → mandate → multilingual rules/company branches → suppliers/RFQ → BID → auction → remedy.", "notice-trader-auction-remedy", "entry-path", ["auction → remedy"]),
    parallelWork: value("Tender corpus, company qualification, supplier assurance and market intelligence run in parallel; remedy Process starts only on material award anomaly.", "corpus+company+supply+market+conditional-remedy", "parallel-intelligence", ["remedy Process"]),
    decisionGates: value("Assessment E03, supplier roster E06, BID/floor E11, submission E14, each live bid E15, complaint E17, Buyer re-evaluation E20, award/contract E21–22.", "auction-remedy-eight-gates", "human-gates", ["each live bid E15", "complaint E17"]),
    participationRoute: value("Single-prime commodity trader + 2 OEM + 1 local importer; no JV.", "prime+two-oem+importer", "participation-route", ["no JV"]),
    bidPreparation: value("Included: multilingual model, supplier RFQ, landed-cost/auction floor, technical/commercial proposal, QA and submission.", "included-auction-bid", "bid-preparation", ["auction floor"]),
    postAward: value("Includes provisional award, standstill, complaint, re-evaluation, final award and contract; physical delivery is excluded.", "included-remedy-to-contract", "post-award", ["complaint", "physical delivery is excluded"]),
    agentScope: value("Agents are tested on trader/supplier route, deep market/competitor intelligence, live-auction limits and a formal remedy loop.", "trader-auction-remedy-agent-route", "agent-scope", ["formal remedy loop"]),
    humanOnlyWork: value("Live price actions, complaint authority/filing, disqualification, remedy, award and signatures remain Actor decisions/actions.", "auction-complaint-buyer-human-authority", "human-authority", ["Live price actions", "complaint authority"]),
    companyEvidence: value("Verified trader dossier + 2 OEM + importer + manufacturer authorizations + product registration + performance security.", "trader+oem+importer-evidence", "verified-evidence", ["2 OEM", "product registration"]),
    tenderEvidence: value("Portuguese source corpus, 173 requirements, Addendum 02, clarification, auction log, provisional award, complaint/review and final award records.", "tender+auction+remedy-evidence", "tender-evidence", ["auction log", "complaint/review"]),
    commercialModel: value("Initial $470/t bid, human-approved $440/t floor, delivered landed-cost/downside scenarios and immutable auction log.", "landed-cost+reverse-auction-floor", "commercial-model", ["$440/t floor", "immutable auction log"]),
    procedure: value(`${case6.procurementMethod}; ${case6.submissionWindow}; ${case6.deliveryWindow}.`, "pregao-reverse-auction-review", "goods-procurement", [case6.procurementMethod]),
    endpoint: value(case6.endpoint, "signed-contract+mobilization", "case-endpoint", ["$10,56 млн", "mobilization handoff"]),
    success: value("Qualified bid, controlled auction, upheld material complaint, compliant rank 1 after re-evaluation and signed contract.", "rank2+upheld+rank1+contract", "successful-participation", ["upheld material complaint"]),
    kpi: value(case6.kpi, "auction-remedy-kpis", "kpi", ["auction rank 2", "complaint upheld", "$10,56 млн"]),
    failure: value("Unverified supply route, bid below floor, unauthorised bid/filing, missed standstill, unsupported allegation or failed re-evaluation.", "auction-remedy-failure", "failure", ["unauthorised bid/filing", "missed standstill"]),
  },
};

const case7Profile: CaseComparisonProfile = {
  caseNumber: 7,
  id: case7.id,
  name: case7.name,
  shortName: "Buyer recovery RFQ",
  color: "#7864c8",
  entryPath: ["Supplier default", "Remedy + continuity", "Limited RFQ", "Evaluation", "Replacement award", "Delivery", "Acceptance"],
  entrySummary: "A public Buyer recovers from an incumbent default through two parallel authority tracks: contract remedy and competitive replacement sourcing.",
  relationshipSummary: "Buyer procurement client + incumbent + five invitees + independent inspectors",
  endpointSummary: "Partial termination + replacement contract + accepted delivery + open security claim handoff.",
  convergenceState: "verified-default+authorised-procedure+qualified-suppliers+current-rfq",
  convergenceEvent: "E11 · Buyer-side offer evaluation",
  engagements: case7Engagements,
  eventCount: case7ProcessGraph.activities.length,
  processCount: case7ProcessGraph.processes.length,
  attributes: {
    purpose: value("Проверить Buyer-side procurement recovery после supplier default: legal remedy, emergency competition, evaluation, replacement delivery and acceptance.", "buyer-emergency-recovery", "procurement-recovery-lifecycle", ["Buyer-side", "supplier default"]),
    monetization: value(case7.monetization, "fixed-recovery-milestones-no-success", "consulting-revenue", ["DEMO", "fixed milestone", "success fee запрещён"]),
    consultantIncome: value(case7.consultantIncome, "usd-210000-four-milestones", "simulated-income", ["DEMO", "$210 000"]),
    trigger: value(case7.trigger, "material-lab-failure+failed-cure", "contract-default", ["material test failure", "48 часов"]),
    startingSituation: value(case7.startingCondition, "signed-defaulted-contract+continuity-gap", "buyer-recovery-need", ["performance security активна", "поставка не принята"]),
    knownAtStart: value("Signed original contract, approved shelter standard, lab result, active security, unmet demand and five-day contingency stock.", "contract+spec+failure+continuity", "reusable-intelligence", ["active security", "five-day contingency stock"]),
    unknownAtStart: value("Legal remedy, procedure justification, supplier capacity, comparable offers, evaluation outcome, replacement delivery and actual claim recovery.", "remedy+market+award+delivery+claim", "verification-needed", ["actual claim recovery"]),
    companySelection: value("No participant company is preselected; Buyer authorises criteria and Supplier Discovery builds a five-invitee roster.", "buyer-selects-roster-from-market", "supplier-sourcing", ["No participant company is preselected"]),
    relationship: value("DSWD is the procurement client; incumbent, invitees, replacement supplier, laboratory and bank remain separate external Actors.", "buyer+incumbent+invitees+inspectors", "company-relationship", ["separate external Actors"]),
    permission: value("E02 analysis mandate; E05 remedy/procedure; E07 invitees; E08 issue; E12 award recommendation; E13 termination; E14 contract; E17 acceptance; E18 payment.", "layered-buyer-authority", "consent", ["E13 termination", "E17 acceptance"]),
    consultantMission: value(case7.consultantRole, "independent-buyer-recovery-assurance", "consultant-support", ["не расторгает контракт", "не присуждает"]),
    consultantStart: value("E02 immediately after material default evidence and explicit Buyer recovery mandate.", "post-default-mandate", "consultant-timing", ["E02"]),
    consultantDone: value("E19 after accepted delivery, paid replacement invoice and explicit open-claim handoff to Buyer legal team.", "accepted-delivery+open-claim-handoff", "consultant-boundary", ["open-claim handoff"]),
    companyMaturity: value("Not a bidder maturity Case: the procurement client is a government emergency-response Buyer with established authority but recovery-capability gaps.", "government-buyer-recovery-gap", "buyer-client", ["Not a bidder maturity Case"]),
    entrySequence: value("Lab failure → recovery hold → parallel remedy/continuity → procedure gate → supplier RFQ/evaluation → two award/remedy tracks → delivery/acceptance.", "default-parallel-recovery-rfq", "entry-path", ["parallel remedy/continuity"]),
    parallelWork: value("Legal remedy and continuity package branch at E02; original claim and replacement award branch at E12; market, RFQ control and delivery assurance remain Processes.", "remedy+continuity+claim+replacement", "parallel-intelligence", ["original claim and replacement award"]),
    decisionGates: value("Recovery authority E02; remedy/procedure E05; invitees E07; evaluation E11–12; termination E13; contract E14; acceptance E17; payment/claim E18.", "buyer-eight-authority-gates", "human-gates", ["termination E13", "acceptance E17"]),
    participationRoute: value("Buyer-side limited RFQ to five verified suppliers; one replacement prime, no JV, partner route or negotiation.", "buyer-five-invitees-one-supplier", "participation-route", ["no JV", "no negotiation"]),
    bidPreparation: value("Supplier bids are external and untouched; TenderLab structures Buyer RFQ, normalizes offers and supports traceable evaluation evidence only.", "external-bids+buyer-evaluation-support", "bid-preparation", ["external and untouched"]),
    postAward: value("Includes original-contract termination/claim, replacement contract, delivery, independent inspection, Buyer acceptance and payment.", "dual-contract-recovery-through-acceptance", "post-award", ["termination/claim", "Buyer acceptance"]),
    agentScope: value("Tests sourcing Agents in Buyer context while deliberately excluding bidder profile, Bid/No-Bid, proposal, submission, clarification-response and negotiation Agents.", "buyer-sourcing-agent-route", "agent-scope", ["deliberately excluding bidder"]),
    humanOnlyWork: value("Procedure justification, legal opinion, termination, invitee approval, scoring, award, contract signature, inspection facts, acceptance and payment remain Actor actions.", "buyer-legal-evaluator-acceptance-authority", "human-authority", ["scoring", "acceptance"]),
    companyEvidence: value("Five external supplier due-diligence dossiers, qualifications, beneficial ownership, capacity, certificates and verified performance history.", "five-supplier-due-diligence", "verified-evidence", ["Five external supplier"]),
    tenderEvidence: value("Original contract/lab dossier, 86 requirements, limited-RFQ justification, Corrigendum 01, four offers, evaluation, notices, inspection and acceptance records.", "default+rfq+evaluation+acceptance-evidence", "tender-evidence", ["Corrigendum 01", "inspection and acceptance"]),
    commercialModel: value("$6,80m ceiling; four normalized quotations; landed-cost comparison; $6,42m replacement award; separate $0,78m security claim without automatic netting.", "replacement-cost+separate-claim", "commercial-model", ["$6,42m", "$0,78m"]),
    procedure: value(`${case7.procurementMethod}; ${case7.submissionWindow}; ${case7.deliveryWindow}.`, "accelerated-limited-rfq-recovery", "goods-procurement", [case7.procurementMethod]),
    endpoint: value(case7.endpoint, "accepted-replacement+open-claim-handoff", "case-endpoint", ["12 000 kits", "claim зарегистрирован"]),
    success: value("Documented lawful remedy, competitive replacement award, compliant delivery/acceptance and no authority breach; claim may remain open with explicit owner.", "lawful-recovery+accepted-delivery", "successful-procurement", ["no authority breach", "claim may remain open"]),
    kpi: value(case7.kpi, "buyer-recovery-kpis", "kpi", ["5 приглашений / 4", "13 дней", "100%"]),
    failure: value("Unsupported termination, unjustified direct award, unequal information, untraceable evaluation, late/non-compliant replacement, Agent-made authority decision or hidden open claim.", "buyer-recovery-failure", "failure", ["unequal information", "Agent-made authority"]),
  },
};

export const caseComparisonRegistry: CaseComparisonProfile[] = [case1Profile, case2Profile, case3Profile, case4Profile, case5Profile, case6Profile, case7Profile];

export function compareValues(left: ComparisonValue, right: ComparisonValue, dimension: ComparisonDimension): ComparisonRelation {
  if (left.key === right.key) return "same";
  if (left.absent !== right.absent) return "only-one";
  if (dimension.importance === "critical") return "critical";
  if (left.family && left.family === right.family) return dimension.group === "workflow" || dimension.group === "relationship" ? "different-path" : "similar";
  return "different";
}
