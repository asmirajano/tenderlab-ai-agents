import { agents } from "../../packages/catalog-data/src/agents.ts";
import type { CaseAgentEngagement, CaseStage, ConditionalActivation, EngagementStatus } from "./case-1-data.ts";

export const case2 = {
  id: "KE-UN-PPE-2026-042",
  name: "Активация возможности консультантом",
  company: "MedTex Protection LLC",
  companyType: "Начинающий экспортёр средств индивидуальной защиты",
  companyCountry: "Узбекистан",
  organizer: "UN Procurement Office · Kenya Programme",
  organizerCountry: "Кения",
  funding: "Система ООН",
  tenderType: "Товары",
  procurementMethod: "Открытый рамочный тендер ООН",
  subject: "Поставка медицинских защитных комплектов по рамочному соглашению",
  lot: "1 тендер · 1 лот",
  budget: "$2,10 млн",
  quantity: "120 000 защитных комплектов",
  submissionWindow: "21 день",
  deliveryWindow: "24 месяца framework",
  situation: "TenderLab находит тендер, исследует компанию только по открытым данным и обращается к ней лишь после доказательного внутреннего решения.",
  outcome: "DEMO: компания дала согласие, прошла верификацию и приняла условное решение BID; Case передан в Client Side bid preparation.",
} as const;

export const case2Stages: CaseStage[] = [
  { id: "foundation", number: "00", title: "Платформенная основа", description: "До Case существуют policy, taxonomy, source history и предварительный prospect profile.", handoff: "Готовые policy и reusable intelligence records" },
  { id: "discovery", number: "01", title: "Поиск возможности", description: "Notice фиксируется, классифицируется, фильтруется и ранжируется против публичного профиля.", handoff: "Preliminary Opportunity Review Pack 91%" },
  { id: "evidence", number: "02", title: "Pre-contact evidence", description: "Параллельно готовятся tender facts, market/buyer context и evidence boundaries до контакта.", handoff: "Evidence-backed consultant review pack" },
  { id: "outreach", number: "03", title: "Outreach и согласие", description: "Консультант принимает решение о контакте, компания отвечает и отдельно разрешает tender-specific work.", handoff: "Consent record, owners и управляемый Client Case" },
  { id: "company", number: "04", title: "Проверка компании", description: "Публичный provisional profile заменяется подтверждёнными фактами, credentials и readiness.", handoff: "Verified Company Profile + Readiness 71/100" },
  { id: "decision", number: "05", title: "Qualification и решение", description: "Tender facts объединяются с verified profile, затем проверяются fit, feasibility, economics и integrity.", handoff: "Conditional BID protocol и gap plan" },
  { id: "handoff", number: "06", title: "Client Side handoff", description: "Утверждённый activation dossier передаётся в отдельный bid-preparation route без скрытого продолжения.", handoff: "Client-owned preparation case и frozen activation baseline" },
  { id: "route", number: "07", title: "Условный маршрут участия", description: "Partner/JV/supplier capabilities включаются только если direct participation перестаёт быть допустимым.", handoff: "Не активирован в Case 2" },
  { id: "bid", number: "08", title: "Подготовка и post-bid", description: "Proposal, submission, evaluation, contract и execution остаются за границей Activation Case.", handoff: "Следующий самостоятельный Case, не скрытая часть Case 2" },
];

const requiredIds = new Set([1, 2, 3, 4, 6, 7, 8, 9, 10, 13, 14, 15, 16, 17, 25, 31, 32, 34, 35, 36, 37, 38]);
const backgroundIds = new Set([5, 18, 19, 20, 21, 23, 24, 26]);
const conditionalIds = new Set([22, 29, 30, 33]);

const eventContext: Record<number, { stageId: string; when: string; why: string; input: string; output: string; next: string }> = {
  1: { stageId: "outreach", when: "От внутреннего outreach gate до handoff", why: "Нужен управляемый маршрут, который не превращает скрытый prospect research в Client Case до согласия компании.", input: "E02 opportunity pack, consultant decision, consent state и verified downstream outputs.", output: "Case state с явной границей pre-contact / consented work.", next: "Consultant review, consent gates и Client Side handoff." },
  2: { stageId: "outreach", when: "На решении о контакте, consent и финальном BID gate", why: "Outreach и участие принадлежат ответственным людям, а не автоматическому score.", input: "Evidence pack, contact basis, consent request и decision pack.", output: "Три протокола человеческого решения с owner и timestamp.", next: "P05 Outreach Governance, Orchestrator и Client Side preparation." },
  3: { stageId: "evidence", when: "При pre-contact review, verification, scoring и handoff", why: "Публичные и private claims должны иметь разные источники, confidence и разрешённое использование.", input: "Open-source records, tender clauses и company-provided evidence.", output: "Evidence ledger с confidence, rights boundary и unresolved gaps.", next: "Consultant decision, qualification, human approval и handoff." },
  4: { stageId: "outreach", when: "При публикации, контакте, consent, profile verification и handoff", why: "Нужен неизменяемый след того, что было известно и разрешено на каждом этапе.", input: "Source items, decisions, communication metadata и approved artifacts.", output: "Versioned audit trail и frozen activation baseline.", next: "Все контрольные gates и следующий Client Case." },
  6: { stageId: "company", when: "После явного согласия компании", why: "До контакта существует только provisional profile; verified profile требует company evidence.", input: "Registration, ownership, catalogue, capacity, references и authorised company answers.", output: "Verified Company Profile MedTex Protection LLC.", next: "Readiness, eligibility, match и decision pack." },
  7: { stageId: "company", when: "Во время verified onboarding", why: "PPE taxonomy и реальная производственная способность должны быть подтверждены компанией.", input: "Product catalogue, specifications, monthly capacity и export geography.", output: "Normalized PPE capability catalogue и capacity constraints.", next: "Company Profile, Readiness, solution-fit и feasibility." },
  8: { stageId: "company", when: "После предоставления private evidence", why: "Публичные признаки компании не доказывают legal status, factory, experience или ownership.", input: "Registry extracts, factory evidence, contracts, ownership и bank references.", output: "Verified company dossier с resolved/unresolved claims.", next: "Company Profile, eligibility, integrity и match." },
  9: { stageId: "company", when: "После verified profile, до tender-specific match", why: "Новому экспортёру нужна отдельная общая оценка готовности, не смешанная с relevance конкретного тендера.", input: "Verified profile, credentials, resources, export process и evidence gaps.", output: "Tender Readiness 71/100 и improvement priorities.", next: "Qualification, gap plan и company decision." },
  10: { stageId: "company", when: "Во время verified onboarding", why: "Медицинские PPE certificates и scope/expiry критичны для eligibility.", input: "ISO records, test reports, product declarations и issuer data.", output: "Verified credential register с validity и scope gaps.", next: "Eligibility, Match Score и remediation plan." },
  13: { stageId: "discovery", when: "При официальной публикации и изменениях", why: "Нужны original notice, attachments, URL и source metadata, а не перепечатанная карточка.", input: "Official UN procurement endpoint и attachments.", output: "Normalized source package и publication baseline.", next: "Classification, document enrichment и monitoring." },
  14: { stageId: "discovery", when: "После classification и deterministic filtering", why: "Нужно ранжировать прошедшую opportunity против доступного provisional prospect profile.", input: "Agent 16 pass record + P02 provisional profile.", output: "Preliminary relevance 91% с evidence limitations.", next: "Consultant review; score не отправляется компании автоматически." },
  15: { stageId: "discovery", when: "После source acquisition", why: "Category, geography, buyer, framework и procedure должны быть нормализованы до фильтрации.", input: "E01 normalized notice + P01 taxonomy.", output: "Classification record: PPE / Kenya / UN framework / Goods / one lot.", next: "Tender Filtering Agent." },
  16: { stageId: "discovery", when: "После classification", why: "Opportunity должна пройти заранее утверждённые geography/category/risk rules.", input: "Classification + P01 portfolio policy, thresholds и exclusions.", output: "Pass record с применёнными правилами и причинами.", next: "Tender Discovery Agent." },
  17: { stageId: "outreach", when: "От consent до activation handoff", why: "До назначения company owner возможны только internal alerts; после consent нужен персональный календарь.", input: "Notice dates, amendment feed, consent state и assigned owners.", output: "Case calendar, alerts и handoff deadlines.", next: "Company owners и Client Side preparation route." },
  25: { stageId: "decision", when: "После verified profile и pre-contact tender fact pack", why: "Qualification нельзя доказать по provisional open-source profile.", input: "PB02 eligibility rules + E07 verified company/credential evidence.", output: "Conditional eligibility Pass с двумя closure conditions.", next: "Match, remediation и BID decision." },
  31: { stageId: "decision", when: "После fan-in tender facts + verified company facts", why: "91% discovery relevance не является verified Company × Tender match.", input: "Verified profile, requirements, evaluation model и evidence confidence.", output: "Verified Match 87% с factor weights и gaps.", next: "Solution-fit, feasibility и BID decision." },
  32: { stageId: "decision", when: "После verified Match", why: "Нужно подтвердить, что компания может участвовать напрямую, а не только тематически совпадает.", input: "Match factors, lot scope, capability catalogue и qualification gaps.", output: "Direct-participation solution-fit с одним controlled gap.", next: "Gap remediation и decision pack." },
  34: { stageId: "decision", when: "После qualification/match", why: "Условный Pass должен превратиться в actions, owners и dates, а не остаться текстовым warning.", input: "Eligibility gaps, readiness priorities и solution-fit gaps.", output: "Шестидневный remediation plan: vendor registration, guarantee line и evidence closure.", next: "Final BID gate и Client Side preparation." },
  35: { stageId: "decision", when: "После полного feasibility/commercial/risk pack", why: "Компания, а не consultant outreach score, решает участвовать или отказаться.", input: "Eligibility, Match, readiness, feasibility, commercial case, risks и remediation plan.", output: "Conditional BID recommendation с stop conditions.", next: "Human Approval Agent и controlled handoff." },
  36: { stageId: "decision", when: "Перед final BID gate", why: "Framework ceiling не гарантирует исполнимость recurring call-offs и lead times.", input: "Capacity, lot quantities, call-off assumptions и delivery windows.", output: "Feasibility Pass с capacity buffer и call-off constraints.", next: "Bid / No-Bid Decision Agent." },
  37: { stageId: "decision", when: "Перед final BID gate", why: "Framework value является ceiling, поэтому нужна экономика по вероятным call-offs, а не по всей сумме как гарантированной выручке.", input: "Price benchmarks, cost assumptions, payment terms и call-off scenarios.", output: "Commercial case: margin range 14–18%, downside и minimum call-off threshold.", next: "Bid / No-Bid Decision Agent и Human Approval." },
  38: { stageId: "decision", when: "До контакта в лёгком режиме и перед BID на verified data", why: "Outreach, company onboarding и UN participation требуют integrity boundaries и fresh screening.", input: "Company identity, ownership, UN debarment/sanctions sources и tender conditions.", output: "Integrity clearance с one medium evidence gap and mitigations.", next: "Consultant outreach gate и final BID decision." },
};

const processContext: Record<number, { stageId: string; when: string; why: string; input: string; output: string; next: string }> = {
  5: { stageId: "foundation", when: "Постоянно в P02/P03", why: "Prospect, tender, buyer и evidence records должны быть связаны до и после conversion.", input: "Verified public entities and relationships.", output: "Updated prospect–tender–buyer graph.", next: "Discovery, consultant review и future cases." },
  18: { stageId: "evidence", when: "PB01 после E02 до consultant gate E03", why: "Consultant должен понимать market demand и price bands до outreach.", input: "Classified opportunity + P03 award history.", output: "PPE market and price benchmark brief.", next: "Consultant review и commercial case E10." },
  19: { stageId: "foundation", when: "Постоянно в P03; не запускается внутри E02", why: "E02 и PB01 читают заранее связанные award/contract records.", input: "Published award and contract records.", output: "Persistent tender→award→contract history.", next: "PB01, Buyer Intelligence и future discovery." },
  20: { stageId: "evidence", when: "PB01 после E02 до consultant gate E03", why: "Buyer patterns и likely competitors нужны до решения о контакте.", input: "P03 history, buyer open data и classified opportunity.", output: "Buyer/competitor dossier.", next: "Consultant review и risk/commercial pack." },
  21: { stageId: "evidence", when: "PB02 после E02", why: "Consultant needs a source-locked tender corpus before making claims to the company.", input: "E01 source package.", output: "Indexed tender corpus with manifest and hashes.", next: "Agents 23/24/26 and consultant review." },
  23: { stageId: "evidence", when: "PB02 after document intake", why: "One lot, forms and framework mechanics must be explicit before qualification.", input: "Indexed tender corpus.", output: "Tender structure map and forms/lot model.", next: "Requirement and evaluation extraction." },
  24: { stageId: "evidence", when: "PB02 after structure", why: "Outreach must cite actual requirements rather than marketing assumptions.", input: "Source-locked tender structure.", output: "Pre-contact requirements and eligibility-rule register.", next: "Consultant review and post-consent qualification." },
  26: { stageId: "evidence", when: "PB02 after structure", why: "The consultant needs to explain how the framework will be evaluated without yet scoring the company.", input: "Tender package and structured forms.", output: "Evaluation model and pass thresholds.", next: "Consultant review and verified Match." },
};

const conditionalContext: Record<number, { stageId: string; condition: string; coveredBy: string }> = {
  22: { stageId: "evidence", condition: "Активируется только если official files are scanned or require translation.", coveredBy: "Все DEMO files цифровые и англоязычные; PB02 использует original text." },
  29: { stageId: "outreach", condition: "Активируется при official amendment before handoff.", coveredBy: "P04 monitors the source; no amendment occurs in the simulated route." },
  30: { stageId: "decision", condition: "Активируется при material ambiguity requiring an official buyer question.", coveredBy: "Case 2 ends at activation handoff; no blocking ambiguity is found in the pre-contact fact pack." },
  33: { stageId: "route", condition: "Активируется if direct manufacturer participation becomes invalid and a new role must be selected.", coveredBy: "Agent 32 confirms direct participation; no partner/JV route is needed in this Case." },
};

function defaultStage(agentId: number) {
  if (agentId <= 5) return "foundation";
  if (agentId <= 12) return "company";
  if (agentId <= 20) return "discovery";
  if (agentId <= 30) return "evidence";
  if (agentId <= 38) return "decision";
  if (agentId <= 46) return "route";
  return "bid";
}

function skippedReason(agentId: number) {
  if (agentId >= 39 && agentId <= 46) return "Case 2 confirms direct participation and does not trigger partner, supplier, RFQ or solution-design work.";
  if (agentId >= 47 && agentId <= 58) return "Proposal/compliance/submission starts in the next Client Side preparation Case after E12 handoff.";
  if (agentId >= 59) return "Evaluation, negotiation, award, contract execution and outcome learning are outside the Activation Case boundary.";
  if (agentId === 11 || agentId === 12) return "No external supplier/partner chain is needed for the direct-manufacturer activation route.";
  return "No observable Case 2 work requires this capability.";
}

export const case2Engagements: CaseAgentEngagement[] = agents.map((agent) => {
  const details = eventContext[agent.id] ?? processContext[agent.id];
  if (requiredIds.has(agent.id) || backgroundIds.has(agent.id)) {
    if (!details) throw new Error(`Missing Case 2 engagement details for Agent ${agent.id}.`);
    return { agentId: agent.id, status: requiredIds.has(agent.id) ? "required" : "background", ...details };
  }
  if (conditionalIds.has(agent.id)) {
    const conditional = conditionalContext[agent.id];
    return {
      agentId: agent.id,
      status: "conditional" as EngagementStatus,
      stageId: conditional.stageId,
      when: "Только при подтверждённом исключении",
      why: conditional.condition,
      input: "Observable trigger + relevant Case state.",
      output: agent.output.primary,
      next: agent.output.consumers,
      condition: conditional.condition,
      activation: "standby" as ConditionalActivation,
      coveredBy: conditional.coveredBy,
    };
  }
  return {
    agentId: agent.id,
    status: "not-involved" as EngagementStatus,
    stageId: defaultStage(agent.id),
    when: "За границей Case 2",
    why: skippedReason(agent.id),
    coveredBy: skippedReason(agent.id),
  };
});

const ids = case2Engagements.map((item) => item.agentId);
if (ids.length !== 64 || new Set(ids).size !== 64) throw new Error("Case 2 needs exactly one engagement record for every canonical Agent.");
const stageIds = new Set(case2Stages.map((stage) => stage.id));
if (case2Engagements.some((item) => !stageIds.has(item.stageId))) throw new Error("Every Case 2 engagement needs a known stage.");
if (case2Engagements.some((item) => item.status !== "not-involved" && (!item.input || !item.output || !item.next))) throw new Error("Every involved Case 2 Agent needs input, output and handoff.");
