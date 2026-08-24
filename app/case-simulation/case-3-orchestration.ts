import { agents } from "../../packages/catalog-data/src/agents.ts";
import type { CaseProcess, EventAgentAuditDecision, ProcessActivityKind, ProcessRelationship } from "../process-model.ts";

export type Case3ExecutionSpec = {
  agentId: number;
  role: string;
  action: string;
  input: string;
  output: string;
  handoff: string;
  rationale: string;
  necessity?: EventAgentAuditDecision;
  condition?: string;
  activation?: "triggered" | "standby";
  overlapNote?: string;
};

export type Case3EventBlueprint = {
  step: number;
  period: string;
  phase: string;
  title: string;
  initiator: string;
  narrative: string;
  result: string;
  next: string;
  executions: Case3ExecutionSpec[];
  responsibleActorId: string;
  actorIds: string[];
  kind?: ProcessActivityKind;
  trigger: string;
  startDay: number;
  endDay: number;
  column: number;
  lane: "buyer" | "client" | "tenderlab" | "consultant" | "external";
  critical?: boolean;
  scopeBoundary: string;
  missingAgentFinding: string;
};

export type Case3RelationshipSpec = {
  from: number;
  to: number;
  type?: ProcessRelationship["type"];
  label: string;
  condition?: string;
  blocking?: boolean;
  joinPolicy?: ProcessRelationship["joinPolicy"];
};

const x = (
  agentId: number,
  role: string,
  action: string,
  input: string,
  output: string,
  handoff: string,
  rationale: string,
  extra: Partial<Pick<Case3ExecutionSpec, "necessity" | "condition" | "activation" | "overlapNote">> = {},
): Case3ExecutionSpec => ({ agentId, role, action, input, output, handoff, rationale, ...extra });

export const case3EventBlueprints: Case3EventBlueprint[] = [
  {
    step: 1, period: "День 0 · публикация", phase: "Внешний источник", title: "Заказчик публикует двухэтапный Works tender", initiator: "QazWater Infrastructure Directorate",
    narrative: "На портале АБР публикуется KZ-ADB-WTP-2026-018: один EPC/Design–Build lot, budget estimate $48,00 млн, первая техническая стадия без окончательной цены и 45 дней до подачи. TenderLab сохраняет invitation, employer’s requirements, qualification forms, environmental documents и submission rules.",
    result: "Source package, 34 original files, publication timestamp и immutable tender baseline.", next: "E02 выполняет classification/filtering/ranking; P04 начинает deadline и amendment monitoring.",
    executions: [
      x(13, "Official source acquisition", "Получает notice и 34 attachments, технически типизирует и дедуплицирует source items.", "ADB portal publication URL", "Normalized source package + manifest", "Agent 04, E02 и PB01", "Без original files последующая модель требований недоказуема."),
      x(4, "Publication baseline", "Фиксирует hashes, timestamps и V1 tender-package snapshot.", "Agent 13 manifest и files", "Immutable V1 audit baseline", "P04 monitoring и все downstream diffs", "Двухэтапная процедура требует доказуемой истории версий."),
    ], responsibleActorId: "buyer", actorIds: ["buyer", "tenderlab"], kind: "external-event", trigger: "Официальная публикация notice", startDay: 0, endDay: 0, column: 0, lane: "buyer", critical: true,
    scopeBoundary: "Buyer публикует; Agents 13/04 только фиксируют источник. Interpretation и company fit начинаются в E02/PB01.", missingAgentFinding: "Новый Agent не нужен: acquisition и version baseline разделены.",
  },
  {
    step: 2, period: "День 0–1", phase: "Discovery", title: "Opportunity проходит triage против профиля AquaNova", initiator: "TenderLab / Backend",
    narrative: "Works tender нормализуется как water infrastructure / Kazakhstan / ADB / two-stage / one lot. Portfolio policy пропускает opportunity, после чего discovery сравнивает её с готовым provisional profile AquaNova. Preliminary relevance 89% не означает eligibility: видны gaps по local construction, process equipment и combined turnover.",
    result: "Opportunity Review Pack 89% с filter reasons и тремя consortium-critical gaps.", next: "E03 просит у AquaNova permission на consortium-feasibility assessment; PB01/PB02 начинают параллельную работу.",
    executions: [
      x(15, "Canonical tender classification", "Нормализует sector, country, buyer, Works method и two-stage procedure.", "E01 source package + P01 taxonomy", "Water/WTP/Kazakhstan/ADB/two-stage classification", "Agent 16", "Filtering должно читать canonical fields, а не свободный текст."),
      x(16, "Deterministic portfolio filter", "Применяет geography, value, sector и integrity policy rules.", "Agent 15 record + P01 policy", "Pass record с applied thresholds", "Agent 14", "Discovery не должно ранжировать заведомо запрещённый тендер."),
      x(14, "Lead-company opportunity ranking", "Сопоставляет passed tender с provisional AquaNova profile и помечает evidence limits.", "Agent 16 pass + P02 company intelligence", "Preliminary relevance 89% + consortium gap flags", "E03 Consultant/Client gate", "Только Discovery владеет предварительным opportunity ranking."),
    ], responsibleActorId: "tenderlab", actorIds: ["tenderlab"], trigger: "E01 source + P01 policy + P02 provisional profile", startDay: 0, endDay: 1, column: 1, lane: "tenderlab", critical: true,
    scopeBoundary: "E02 заканчивается preliminary ranking; qualification, route и JV design запрещены до verified evidence.", missingAgentFinding: "Market/buyer work остаётся PB02, а не раздувает E02.",
  },
  {
    step: 3, period: "День 1", phase: "Client mandate", title: "AquaNova разрешает проверку consortium route", initiator: "AquaNova Ingeniería S.A. · Bid Director",
    narrative: "Руководство AquaNova подтверждает интерес, разрешает обработку private qualification evidence, назначает technical/commercial/legal owners и просит TenderLab определить, возможно ли закрыть EPC scope через JV. Это permission на feasibility, а не обязательство участвовать или привлекать конкретных партнёров.",
    result: "Versioned mandate, owners, confidentiality boundary и Case calendar для consortium feasibility.", next: "E04 верифицирует lead company; PB01/PB02 готовят tender и market facts.",
    executions: [
      x(1, "Case activation", "Открывает Case state, ветви verification/tender intelligence и approval gates.", "E02 pack + Client mandate", "Controlled Case route and owners", "E04, PB01, PB02 и P05", "Нужна единая state machine для параллельных ветвей."),
      x(2, "Human mandate record", "Фиксирует решение AquaNova, authorised owner и допустимый scope.", "Signed mandate and confidentiality terms", "Approved feasibility mandate", "Agent 01 and E04", "Permission принадлежит человеку, а не score."),
      x(17, "Case calendar", "Создаёт Stage 1 calendar, internal gates и partner-response deadlines.", "Official deadlines + named owners", "Owned deadline calendar", "P04 и все workstream owners", "45-дневный срок требует явных owner alerts."),
    ], responsibleActorId: "client", actorIds: ["client", "consultant", "tenderlab"], kind: "decision", trigger: "E02 pack + explicit AquaNova permission", startDay: 1, endDay: 1, column: 2, lane: "client", critical: true,
    scopeBoundary: "Gate разрешает feasibility analysis; партнёрский outreach и BID decision ещё не разрешены.", missingAgentFinding: "Consent/mandate — Human authority с audit state, не новый Agent.",
  },
  {
    step: 4, period: "День 1–4", phase: "Lead verification", title: "Подтверждаются профиль и готовность лидера", initiator: "AquaNova technical, finance and legal owners",
    narrative: "AquaNova предоставляет legal records, engineering licences, audited turnover, relevant water references, staffing и project controls. Capability и credential records отделены от factual verification; Readiness оценивает способность вести международный consortium bid, не подменяя tender-specific qualification.",
    result: "Verified AquaNova Profile, capability/credential registers и Tender Readiness 82/100.", next: "E05 объединяет verified lead facts с PB01/PB02 outputs.",
    executions: [
      x(6, "Lead company profile owner", "Собирает approved identity, geography, capacity и experience facts.", "AquaNova company evidence", "Verified Company Profile", "Agents 09/31/36", "Reusable company facts должны иметь одного canonical owner."),
      x(7, "Engineering capability normalization", "Нормализует design, project-management, commissioning и capacity scope.", "Technical portfolio and staffing", "Water-engineering capability catalogue", "Agents 31/32/34", "Product/capability semantics отделены от legal verification."),
      x(8, "Lead due diligence", "Проверяет legal identity, office, references и audited evidence.", "Registry, audits and reference documents", "Verified AquaNova dossier", "Agents 06/25/38", "Qualification нельзя строить на self-asserted profile."),
      x(9, "General tender readiness", "Оценивает bid governance, resources, evidence completeness и consortium experience.", "Verified profile + bid operating model", "Readiness 82/100 + improvement priorities", "E05 and E06", "General readiness не равна match конкретного Works tender."),
      x(10, "Lead credentials register", "Проверяет licences, ISO, professional credentials и expiry/scope.", "Licence and certificate evidence", "Validated credential register", "PB01 qualification model and E05", "Mandatory credentials требуют отдельной validity check."),
      x(3, "Company evidence lineage", "Связывает каждый verified claim с source, owner и confidence.", "Outputs Agents 06/07/08/10", "Lead-company evidence ledger", "E05 and Human Approval", "Консорциум нельзя проектировать на непрозрачных claims."),
      x(4, "Profile version baseline", "Фиксирует approved V1 company baseline и evidence changes.", "Verified company artifacts", "Versioned AquaNova baseline", "P05 consortium governance", "Поздние partner additions не должны переписывать lead baseline."),
    ], responsibleActorId: "client", actorIds: ["client", "tenderlab"], trigger: "E03 permission + private evidence", startDay: 1, endDay: 4, column: 3, lane: "client", critical: true,
    scopeBoundary: "E04 описывает только AquaNova. Partner evidence появится после consent в E09.", missingAgentFinding: "Current Company agents cover profile, capability, verification, readiness and credentials without merge.",
  },
  {
    step: 5, period: "День 4–6", phase: "Qualification & fit", title: "Подтверждается необходимость консорциума", initiator: "TenderLab assessment workflow",
    narrative: "Fan-in verified AquaNova + PB01 tender model + PB02 market/buyer context даёт preliminary qualification. AquaNova закрывает design leadership и references, но не process-equipment manufacturing, Kazakhstan construction licence и combined turnover. Solution-fit и feasibility доказывают: direct prime route неработоспособен, а трёхролевой consortium route реалистичен.",
    result: "Match 76%, direct-route Fail, consortium solution-fit и gap plan с тремя обязательными role packages.", next: "E06 принимает Conditional BID и утверждает partner-search mandate.",
    executions: [
      x(31, "Verified Company × Tender match", "Взвешивает verified AquaNova facts против tender requirements.", "E04 profile + PB01 requirements/evaluation", "Match 76% with evidence-backed gaps", "Agents 32/35", "Relevance 89% должна быть заменена verified match."),
      x(32, "Participation solution-fit", "Проверяет direct, subcontract and JV configurations против полного EPC scope.", "Agent 31 gaps + PB01 lot/qualification model", "Consortium solution-fit; direct route rejected", "Agents 33/34 and E06", "Solution-fit отвечает, может ли роль быть собрана, а не кто войдёт в JV."),
      x(34, "Gap decomposition", "Превращает недостающие capabilities в role packages, evidence и deadlines.", "Agents 31/32 + Readiness 82", "Three-role remediation plan", "E06 and E07", "Partner search должен получать конкретные gaps, а не общий запрос."),
      x(36, "Pre-bid execution feasibility", "Проверяет 30-month design-build schedule и lead capacity при JV route.", "Draft role packages + schedule requirements", "Conditional feasibility with partner capacity thresholds", "E06 and E09", "Qualification alone не доказывает исполнимость Works contract."),
      x(38, "Country/integrity risk screen", "Оценивает Kazakhstan, ADB, JV ownership и anti-corruption constraints.", "Lead identity + tender integrity clauses", "Initial risk register and screening rules", "E06 and partner due diligence", "Partner search требует заранее заданных integrity boundaries."),
      x(3, "Assessment provenance", "Связывает match, gaps и route conclusion с tender/company evidence.", "Outputs 31/32/34/36/38", "Auditable route evidence pack", "E06 Human gate", "Conditional BID должен быть explainable."),
    ], responsibleActorId: "tenderlab", actorIds: ["tenderlab", "client", "consultant"], trigger: "ALL: E04 + PB01 + PB02", startDay: 4, endDay: 6, column: 4, lane: "tenderlab", critical: true,
    scopeBoundary: "E05 доказывает route requirement, но не выбирает партнёров и не принимает BID decision.", missingAgentFinding: "No missing capability; Match, solution-fit, gap and feasibility remain distinct.",
  },
  {
    step: 6, period: "День 6", phase: "Conditional BID gate", title: "AquaNova утверждает consortium strategy", initiator: "AquaNova Tender Committee",
    narrative: "Комитет рассматривает Match 76%, execution constraints, risk register и role gaps. Он принимает Conditional BID: продолжать только если к дню 16 найдены и проверены equipment OEM и Kazakhstan contractor, а legal workshare согласован. TenderLab получает разрешение на controlled partner outreach.",
    result: "Signed Conditional BID protocol, JV route, partner-search mandate и no-go thresholds.", next: "PB03/E07 ищут кандидатов; отсутствие двух compliant members закрывает Case как No-Bid.",
    executions: [
      x(35, "Bid / No-Bid recommendation", "Собирает fit, feasibility, commercial potential and risks в recommendation.", "E05 assessment pack", "Conditional BID recommendation", "Agent 02 and E06 committee", "Agent рекомендует; не принимает corporate decision."),
      x(33, "Participation route decision support", "Фиксирует recommended role: AquaNova lead + OEM + local contractor.", "Agent 32 solution-fit + Agent 34 role gaps", "Prime consortium route with role rationale", "PB03 and Agent 41", "Route Agent выбирает модель участия, не оптимизирует конкретный состав."),
      x(2, "Company-owned decision", "Фиксирует approved conditions, owners and no-go thresholds.", "Agents 35/33 decision pack", "Approved Conditional BID protocol", "Agent 01 and PB03", "Участие и outreach требуют human authority."),
      x(1, "Route orchestration", "Открывает partner discovery/due-diligence branches и stop rule.", "Approved protocol", "Activated consortium formation route", "E07–E10 and P05", "Несколько параллельных owners должны сходиться в управляемый gate."),
    ], responsibleActorId: "client", actorIds: ["client", "consultant", "tenderlab"], kind: "decision", trigger: "E05 route evidence pack", startDay: 6, endDay: 6, column: 5, lane: "client", critical: true,
    scopeBoundary: "Gate разрешает поиск/проверку; он не создаёт JV и не обещает submission.", missingAgentFinding: "No new Agent; human authority and analytical recommendation are separate.",
  },
  {
    step: 7, period: "День 6–10", phase: "Partner discovery", title: "Формируется shortlist OEM и местных подрядчиков", initiator: "TenderLab Consultant + AquaNova",
    narrative: "Partner Discovery ищет process-equipment OEM и Kazakhstan civil contractor строго по role packages. Partner Graph показывает complementarity и прежние связи; Gap Agent проверяет, закрывает ли shortlist три обязательных пробела. Anatolia Process Systems и SteppeBuild KZ выходят в финальный shortlist.",
    result: "Ranked partner shortlist: 4 OEM + 5 local contractors; two preferred candidates and evidence requests.", next: "E08 ожидает informed responses и data-room consent.",
    executions: [
      x(40, "Evidence-based partner discovery", "Ищет и ранжирует кандидатов по capability, geography, evidence and contactability.", "E06 role packages + PB03 intelligence", "Ranked OEM/local-contractor shortlist", "E08 outreach and E09 verification", "Только Partner Discovery владеет candidate shortlist."),
      x(12, "Partner capability graph", "Картирует coverage, relationships, conflicts and combined gaps.", "Agent 40 candidates + role packages", "Partner capability coverage graph", "Agent 41 and E09", "Graph показывает многокомпонентную совместимость, а не выбирает победителя."),
      x(34, "Shortlist gap check", "Проверяет каждый candidate combination против unresolved role gaps.", "Agent 12 coverage graph", "Gap-closure comparison", "AquaNova selection owners", "Shortlist нельзя ранжировать только по общему сходству."),
    ], responsibleActorId: "consultant", actorIds: ["consultant", "client", "tenderlab", "external"], trigger: "E06 approved partner-search mandate", startDay: 6, endDay: 10, column: 6, lane: "consultant", critical: true,
    scopeBoundary: "Agents создают shortlist и evidence requests; AquaNova решает, кого пригласить.", missingAgentFinding: "Agent 42 не нужен: речь о JV members, а не local service/representation network.",
  },
  {
    step: 8, period: "День 10–12", phase: "External wait", title: "Кандидаты подтверждают интерес и data-room consent", initiator: "AquaNova authorised partner lead",
    narrative: "AquaNova направляет approved invitation двум preferred candidates. Anatolia и SteppeBuild подтверждают интерес, NDA, право TenderLab проверить private evidence и назначают owners. До ответов никакой Agent не может достоверно заполнить private partner profile или считать consortium qualification.",
    result: "Two signed NDAs, data-room permissions, owners and evidence delivery schedule.", next: "E09 проверяет каждого участника; отказ/тишина возвращает E07 к следующему candidate.",
    executions: [], responsibleActorId: "external", actorIds: ["client", "consultant", "external"], kind: "wait", trigger: "E07 preferred shortlist + human invitations", startDay: 10, endDay: 12, column: 7, lane: "external", critical: true,
    scopeBoundary: "Partner response/consent — Actor input. Система только ждёт observable response; не выдумывает Agent execution.", missingAgentFinding: "Zero-Agent wait is correct; retry route returns to E07.",
  },
  {
    step: 9, period: "День 12–16", phase: "Partner due diligence", title: "Проверяются два будущих участника и combined qualification", initiator: "Anatolia and SteppeBuild evidence owners",
    narrative: "Private legal, ownership, turnover, licences, capacity, references and integrity evidence проверяется отдельно по каждому участнику. JV Optimization тестирует combined qualification и workshare; Legal Review проверяет допустимость reliance on member experience. Result не смешивает member verification с consortium design.",
    result: "Verified OEM/local-member dossiers, clean integrity screen and draft 42/33/25 workshare covering all qualification thresholds.", next: "E10 выносит consortium agreement на три человеческих approvals.",
    executions: [
      x(8, "Partner company verification", "Проверяет identity, ownership, references and operational evidence обоих кандидатов.", "E08 consented partner data rooms", "Two verified partner dossiers", "Agents 41/57 and E10", "Partner claims должны быть verified до reliance."),
      x(38, "Member integrity screening", "Проверяет sanctions, debarment, conflicts and beneficial ownership.", "Verified identities and ADB rules", "Consortium integrity clearance", "E10 Human gate", "Один blocked member дисквалифицирует route."),
      x(41, "Consortium optimization", "Оптимизирует member roles, workshare, qualification reliance and governance.", "E05 gaps + Agent 12 graph + verified dossiers", "42/33/25 workshare and qualification coverage", "Agents 57/2 and E10", "Agent 41 проектирует конкретный состав; Agent 33 ранее выбрал route."),
      x(57, "JV legal feasibility", "Проверяет joint liability, lead authority, reliance rules, securities and dispute terms.", "Tender JV clauses + Agent 41 draft", "Consortium legal risk memo", "E10 approvals", "Legal feasibility не является capability optimization."),
      x(3, "Member evidence lineage", "Связывает each qualification claim with member source and reliance rule.", "Partner dossiers + workshare", "Consortium evidence ledger", "E10 and PB01 qualification register", "Combined qualification должна быть traceable per member."),
    ], responsibleActorId: "consultant", actorIds: ["client", "consultant", "external", "tenderlab"], trigger: "E08 signed consent + complete evidence", startDay: 12, endDay: 16, column: 8, lane: "consultant", critical: true,
    scopeBoundary: "E09 verifies and designs draft workshare; only E10 can bind members.", missingAgentFinding: "Agent 44 is reserved for downstream suppliers, not consortium-member due diligence.",
  },
  {
    step: 10, period: "День 16", phase: "Consortium gate", title: "Три участника утверждают JV baseline", initiator: "Authorised directors of all three members",
    narrative: "AquaNova, Anatolia и SteppeBuild отдельно утверждают lead authority, workshare, exclusivity, confidentiality, cost sharing, bid securities and liability. Human Approval records three signatures; Orchestrator запрещает Stage 1 drafting до complete ALL-join.",
    result: "Signed consortium agreement, approved 42/33/25 workshare, RACI and binding bid-governance baseline.", next: "E11/PB04 проектируют solution and supply packages; no signature returns to E07 or No-Bid.",
    executions: [
      x(41, "Final consortium structure", "Freezes approved members, roles, workshare and qualification coverage.", "E09 optimized draft + member comments", "Approved consortium structure", "E11, E12 and proposals", "Composition must be frozen before solution ownership."),
      x(57, "Consortium agreement review", "Validates final JV agreement, liability, securities and signature authority.", "Negotiated consortium agreement", "Legal-cleared execution copy", "Agent 02 and contract risk baseline", "Human signatures require legally coherent text."),
      x(2, "Three-party approval record", "Records ALL three authorised approvals and conditions.", "Signed member resolutions", "Approved JV gate protocol", "Agent 01", "No Agent may bind consortium members."),
      x(4, "Consortium baseline version", "Versions agreement, RACI, workshare and member evidence.", "Approved E10 artifacts", "Immutable consortium V1 baseline", "Stage 1 owners and future change control", "Stage changes must be compared against a fixed baseline."),
      x(1, "Stage 1 release", "Confirms ALL join and activates technical/supply/proposal workstreams.", "Agent 02 approval + Agent 04 baseline", "Stage 1 work packages and state", "E11–E13", "Fan-out must occur only after binding consortium gate."),
    ], responsibleActorId: "client", actorIds: ["client", "external", "consultant", "tenderlab"], kind: "decision", trigger: "ALL: E09 verification + three signed member approvals", startDay: 16, endDay: 16, column: 9, lane: "client", critical: true,
    scopeBoundary: "E10 creates governance baseline; it does not draft the technical proposal.", missingAgentFinding: "No missing Agent; legal, optimization, approval, audit and orchestration are distinct.",
  },
  {
    step: 11, period: "День 16–24", phase: "Stage 1 solution", title: "Проектируется техническое решение и supply chain", initiator: "Consortium technical director",
    narrative: "Solution Architecture converts employer’s requirements and workshare into process design, civil works, equipment packages, commissioning and interfaces. PB04 supplier intelligence/RFQ runs in parallel for pumps, instrumentation and SCADA; supplier verification and normalized quotations constrain feasibility without turning Stage 1 into final pricing.",
    result: "Stage 1 solution architecture, interface matrix, verified supplier shortlist and budgetary quotation comparison.", next: "E12 translates the solution into traceable technical/compliance response.",
    executions: [
      x(39, "EPC solution architecture", "Builds process/civil/electrical/commissioning configuration and interface ownership.", "PB01 requirements + E10 workshare", "Stage 1 solution architecture", "Agents 47/48/53 and E12", "Only Agent 39 owns the integrated solution model."),
      x(43, "Specialist supplier discovery", "Finds pumps, instrumentation and SCADA suppliers matching source-locked specs.", "Agent 39 package requirements + P02 supplier intelligence", "Qualified supplier shortlist", "Agent 44 and PB04", "JV members do not automatically cover every equipment package."),
      x(44, "Supplier due diligence", "Verifies shortlisted suppliers, certificates, capacity and delivery risk.", "Agent 43 shortlist", "Verified supplier dossiers", "Agent 45", "Supplier verification is narrower than consortium-member verification."),
      x(45, "Budgetary RFQ coordination", "Issues controlled Stage 1 RFQs and tracks complete responses.", "Verified supplier list + technical RFQ packages", "RFQ response tracker", "Agent 46", "Comparable budget inputs require a managed request process."),
      x(46, "Quotation normalization", "Normalizes scope, currency, Incoterms, lead time and exclusions.", "Supplier RFQ responses", "Budgetary quotation comparison", "Agents 36/39 and E17", "Raw quotes cannot constrain a common feasibility model."),
      x(36, "Integrated execution feasibility", "Tests member capacity, interfaces, critical equipment and 30-month schedule.", "Solution architecture + workshare + normalized quotes", "Stage 1 feasibility pass with constraints", "E12 and E13", "Solution completeness does not prove executable schedule."),
    ], responsibleActorId: "client", actorIds: ["client", "external", "tenderlab"], trigger: "E10 binding consortium baseline", startDay: 16, endDay: 24, column: 10, lane: "client", critical: true,
    scopeBoundary: "E11 defines solution and budgetary supply evidence; final BOQ/price belong to E17.", missingAgentFinding: "Supplier Agents are justified by uncovered specialist packages, not activated for coverage.",
  },
  {
    step: 12, period: "День 20–31", phase: "Stage 1 response", title: "Формируется первая техническая заявка без финальной цены", initiator: "Consortium bid manager",
    narrative: "Compliance Matrix maps Stage 1 requirements to solution evidence; Technical Compliance identifies deviations; Proposal Strategy defines win themes around energy efficiency and local delivery. Technical Proposal writes methodology and Bid Credentials maps each member’s references to the relevant workshare.",
    result: "Complete Stage 1 technical proposal, compliance matrix, deviation register and consortium credentials pack.", next: "E13 performs red team, legal review, approvals and submission.",
    executions: [
      x(47, "Stage 1 traceability", "Maps every technical/qualification requirement to response, owner and evidence.", "PB01 registers + E11 solution", "Stage 1 compliance matrix", "Agents 48/53/56", "Completeness must be demonstrated at clause level."),
      x(48, "Technical compliance conclusion", "Checks solution parameters and approved deviations against exact specifications.", "Agent 47 matrix + source-locked specs", "Technical compliance report", "Agent 53 and E13", "Compliance assessment is separate from drafting."),
      x(52, "Stage 1 proposal strategy", "Defines positioning, evaluation priorities and consortium win themes.", "PB02 intelligence + evaluation model + solution", "Stage 1 strategy brief", "Agent 53", "Narrative should follow evaluation evidence, not generic marketing."),
      x(53, "Stage 1 technical proposal", "Drafts methodology, design basis, schedule, interfaces and commissioning approach.", "Agents 39/47/48/52 outputs", "Stage 1 technical proposal draft", "Agent 56 and E13", "Writing consolidates approved inputs but does not decide compliance."),
      x(55, "Consortium credentials pack", "Selects member references, key experts and credentials by workshare.", "E09 evidence ledger + PB01 qualification model", "Mapped JV credentials package", "Agent 53/56 and E13", "Combined experience must show which member supplies each claim."),
    ], responsibleActorId: "client", actorIds: ["client", "consultant", "tenderlab"], trigger: "E11 solution architecture + PB01 tender model", startDay: 20, endDay: 31, column: 11, lane: "client", critical: true,
    scopeBoundary: "E12 produces Stage 1 response only; no final price or buyer dialogue is invented.", missingAgentFinding: "PB01 process outputs feed the Event; its Agents are not duplicated here.",
  },
  {
    step: 13, period: "День 31–44", phase: "Stage 1 gate", title: "Первая стадия проходит QA, approval и submission", initiator: "Consortium Steering Committee",
    narrative: "Red Team checks gaps and internal contradictions, Legal Review confirms deviations and JV consistency, Human Approval records all three member approvals. Document Assembly creates portal structure, signatures, file manifest and submits 18 hours before deadline.",
    result: "Buyer receipt for approved Stage 1 package; zero blocking compliance defects at submission.", next: "E14 enters managed wait for technical dialogue and clarification.",
    executions: [
      x(56, "Stage 1 red team", "Challenges compliance, evidence, methodology and role consistency; tracks closure.", "E12 complete draft", "Closed red-team defect log", "Agents 57/2/58", "Independent challenge is required before member approval."),
      x(57, "Stage 1 legal review", "Checks qualification reliance, deviations, signatures and consortium consistency.", "E12 package + E10 agreement", "Legal clearance and deviation schedule", "Agent 02", "Technical acceptance cannot hide legal non-compliance."),
      x(2, "Three-member submission approval", "Records final approval from each authorised consortium member.", "Closed QA/legal package", "Stage 1 approval protocol", "Agent 58", "Submission authority remains human and multi-party."),
      x(58, "Stage 1 assembly/submission", "Assembles signed files, validates manifest and transmits via buyer portal.", "Approved proposal + forms + signatures", "Stage 1 package and submission receipt", "E14 and Agent 04", "One canonical submission package prevents version drift."),
      x(4, "Submitted baseline", "Freezes exact Stage 1 payload, receipt and timestamps.", "Agent 58 submission package", "Immutable submitted V1", "E14 clarification lineage", "Every buyer question must point to the submitted version."),
    ], responsibleActorId: "client", actorIds: ["client", "consultant", "tenderlab"], kind: "decision", trigger: "ALL: E12 + QA closure + three approvals", startDay: 31, endDay: 44, column: 12, lane: "client", critical: true,
    scopeBoundary: "E13 ends at receipt; evaluation remains Buyer work.", missingAgentFinding: "No gap; QA, legal, approval, assembly and audit produce different artifacts.",
  },
  {
    step: 14, period: "День 52–67", phase: "Stage 1 dialogue", title: "Buyer проводит technical clarification и dialogue", initiator: "QazWater evaluation committee",
    narrative: "После внешнего ожидания Buyer sends 11 technical questions and invites a clarification meeting. Post-Bid Response prepares source-backed answers; Presentation supports human speakers; Pre-Bid Clarification creates four bidder questions allowed before final Stage 2 bid. Deadline Agent controls two response windows.",
    result: "Approved answers to 11 questions, meeting record and four buyer-ready clarification questions for Stage 2.", next: "E15 receives formal Stage 2 invitation and revised employer’s requirements.",
    executions: [
      x(59, "Stage 1 clarification response", "Drafts answers tied to submitted V1 and supporting evidence.", "Buyer’s 11 questions + E13 baseline", "Approved clarification response package", "Buyer portal and Agent 04", "Questions after submission belong to Agent 59."),
      x(60, "Technical dialogue support", "Builds presentation, speaker notes and objection-response matrix.", "Buyer agenda + approved technical positions", "Dialogue/negotiation pack", "Human presenters and meeting record", "Agent supports people; it does not negotiate autonomously."),
      x(30, "Stage 2 bidder questions", "Turns unresolved pre-final-bid ambiguities into clause-cited buyer questions.", "Dialogue findings + PB01 ambiguity register", "Four approved clarification questions", "Buyer and E15", "These questions occur before final bid, so Agent 30—not 59—owns them.", { necessity: "conditional", activation: "triggered", condition: "Buyer permits questions before final Stage 2 invitation.", overlapNote: "Agent 59 answers Buyer questions; Agent 30 asks bidder questions before the final bid." }),
      x(17, "Dialogue deadline control", "Tracks response, meeting and question submission windows.", "Buyer correspondence and P04 calendar", "Updated Stage 1/2 calendar", "Owners and E15", "Multiple short external windows require explicit alerts."),
    ], responsibleActorId: "buyer", actorIds: ["buyer", "client", "consultant", "tenderlab"], kind: "wait", trigger: "Buyer questions after E13 submission", startDay: 52, endDay: 67, column: 13, lane: "buyer", critical: true,
    scopeBoundary: "Buyer evaluates; Agents prepare approved bidder-side responses/questions. No award prediction is created.", missingAgentFinding: "Agents 30 and 59 are both justified by opposite communication directions.",
  },
  {
    step: 15, period: "День 70", phase: "Stage 2 invitation", title: "Buyer выпускает revised requirements и final-bid invitation", initiator: "QazWater Infrastructure Directorate",
    narrative: "Buyer publishes formal Stage 2 invitation, consolidated addendum and revised process guarantees. Source Acquisition captures the authoritative package; Amendment Agent compares it with Stage 1 baseline and identifies 23 affected requirements, six BOQ lines and a changed energy-consumption guarantee.",
    result: "Authoritative Stage 2 source package, impact report and 30-day final-bid calendar.", next: "E16 and E17 branch in parallel, then join at E18.",
    executions: [
      x(13, "Stage 2 source acquisition", "Collects final invitation, addendum and revised attachments.", "Official Buyer publication", "Normalized Stage 2 source package", "Agents 29/04 and PB01 refresh", "Only authoritative publication can reset the bid baseline."),
      x(29, "Stage change impact", "Diffs Stage 2 against submitted/source baselines and assigns impacts.", "E01/E13 baselines + Agent 13 Stage 2 package", "23-requirement/6-BOQ-line impact report", "E16/E17 owners", "Changes must propagate rather than silently overwrite work."),
      x(4, "Stage 2 baseline", "Versions official package, impact report and change approvals.", "Agents 13/29 outputs", "Immutable Stage 2 V2 baseline", "All final-bid workstreams", "Final bid must point to one approved version."),
      x(17, "Final-bid calendar", "Recalculates 30-day plan, internal gates and member deadlines.", "Stage 2 invitation dates", "Owned final-bid calendar", "E16–E19", "Change impact without owner dates is not operational."),
    ], responsibleActorId: "buyer", actorIds: ["buyer", "tenderlab", "client"], kind: "external-event", trigger: "Official Stage 2 invitation", startDay: 70, endDay: 70, column: 14, lane: "buyer", critical: true,
    scopeBoundary: "E15 captures and routes changes; solution/pricing revisions occur downstream.", missingAgentFinding: "No gap; Acquisition and Amendment roles remain separate.",
  },
  {
    step: 16, period: "День 70–84", phase: "Final technical branch", title: "Пересобираются final solution и technical compliance", initiator: "Consortium technical director",
    narrative: "Solution Architecture incorporates energy guarantee and revised hydraulic conditions. Compliance and Technical Compliance reopen only affected clauses; Gap Remediation assigns closure tasks; Technical Proposal rewrites impacted sections while preserving accepted Stage 1 positions.",
    result: "Final technical solution, 100% technical compliance and closed change/gap register.", next: "E18 receives frozen technical branch output.",
    executions: [
      x(39, "Final solution revision", "Updates process configuration, guarantees and interfaces for Stage 2.", "E15 impact report + Stage 1 solution", "Final EPC solution architecture", "Agents 47/48/53", "Changes belong in the canonical solution before prose."),
      x(47, "Final compliance traceability", "Reopens affected requirements and preserves unchanged accepted responses.", "E15 impact + Stage 1 matrix + final solution", "Final compliance matrix 100%", "Agents 48/56 and E18", "Traceability prevents missed changed clauses."),
      x(48, "Final technical compliance", "Validates performance guarantees and all revised technical conditions.", "Agent 47 matrix + exact specs", "Zero-deviation technical compliance conclusion", "Agent 53 and E18", "Compliance decision remains separate from drafting."),
      x(53, "Final technical proposal", "Rewrites affected methodology, guarantees and delivery sections.", "Agents 39/47/48 outputs", "Final technical proposal", "Agent 56 and E18", "Proposal text must reflect the approved final solution."),
      x(34, "Stage 2 gap closure", "Assigns and verifies closure of 23 changed requirements.", "E15 change impact + Agent 47 open items", "Closed Stage 2 remediation register", "E18 gate", "Every material change needs owner and evidence."),
    ], responsibleActorId: "client", actorIds: ["client", "tenderlab", "consultant"], trigger: "E15 Stage 2 technical impact", startDay: 70, endDay: 84, column: 15, lane: "client", critical: true,
    scopeBoundary: "E16 freezes technical response; price and commercial terms remain E17.", missingAgentFinding: "No Agent gap; change-driven rework uses existing roles.",
  },
  {
    step: 17, period: "День 70–86", phase: "Final commercial branch", title: "Формируются final BOQ, price и commercial proposal", initiator: "Consortium commercial director",
    narrative: "Normalized supplier quotations, workshare cost inputs, taxes, duties, securities and 30-month cash flow feed landed cost. Pricing checks all BOQ lines and consortium margin allocation; Commercial Compliance and Proposal verify currencies, payment terms and assumptions. Final bid price becomes $46,80 млн.",
    result: "Commercially compliant BOQ, cost/cash-flow model and final commercial proposal at $46,80 млн.", next: "E18 joins technical and commercial branches under legal/red-team approval.",
    executions: [
      x(49, "Commercial compliance", "Checks currencies, taxes, securities, payment terms and prohibited deviations.", "Stage 2 commercial clauses + draft price schedules", "Commercial compliance conclusion", "Agents 54/56/57", "A valid price can still be commercially non-compliant."),
      x(50, "Full EPC cost model", "Calculates design, civil, equipment, logistics, duties, risk and financing costs.", "Workshare costs + normalized quotes + schedule", "Landed/execution cost and cash-flow model", "Agents 51/37", "Cost basis must precede price."),
      x(51, "Final BOQ and pricing", "Prices every BOQ line, validates totals and member margin allocation.", "Agent 50 cost model + Stage 2 BOQ", "Checked BOQ and bid price $46.80m", "Agents 54/56", "BOQ ownership is distinct from cost modelling."),
      x(54, "Commercial proposal", "Completes price schedules, terms, assumptions and authorised commercial forms.", "Agents 49/51 outputs", "Final commercial proposal", "E18 and Agent 58", "Commercial form drafting consumes, not invents, approved price."),
      x(37, "Commercial attractiveness", "Tests margin, cash flow, downside and member economics against thresholds.", "Agent 50 model + Agent 51 price", "Approved commercial business case", "E18 Human gate", "Price compliance does not prove commercial desirability."),
      x(46, "Final quote normalization", "Refreshes changed supplier quotes into one comparable basis.", "PB04 final supplier responses", "Final normalized quotation table", "Agent 50", "Stage 1 budgetary quotes cannot be reused without refresh."),
    ], responsibleActorId: "client", actorIds: ["client", "external", "consultant", "tenderlab"], trigger: "E15 commercial/BOQ changes + PB04 final quotations", startDay: 70, endDay: 86, column: 15, lane: "client", critical: true,
    scopeBoundary: "E17 creates approved commercial artifacts; final submission authority remains E18/E19.", missingAgentFinding: "Agents 37/49/50/51/54/46 have non-overlapping economics, compliance and drafting boundaries.",
  },
  {
    step: 18, period: "День 86–96", phase: "Final approval gate", title: "Technical и commercial branches сходятся в final bid", initiator: "Consortium Steering Committee",
    narrative: "Proposal Strategy aligns final win themes; Red Team tests integrated technical/commercial/legal consistency; Legal Review checks contract risk and consortium liability. Three member boards approve price, securities and submission. Orchestrator blocks release until ALL technical, commercial, legal and human artifacts are present.",
    result: "Approved final bid baseline, closed red-team log, contract risk memo and three-party submission authority.", next: "E19 assembles and submits exact approved package.",
    executions: [
      x(52, "Final integrated strategy", "Aligns evaluation priorities, differentiators and technical/commercial narrative.", "E16 technical + E17 commercial + PB02 intelligence", "Final proposal strategy brief", "Agent 56 and submission owners", "Final package needs one coherent positioning layer."),
      x(56, "Final red team", "Challenges completeness, cross-volume consistency, price/technical assumptions and evidence.", "E16/E17 outputs + strategy", "Closed final defect log", "Agents 57/2/58", "Parallel branches must be independently reconciled."),
      x(57, "Final contract/legal review", "Checks deviations, securities, liabilities and JV agreement alignment.", "Final bid + contract conditions + consortium baseline", "Final contract risk memo", "Agent 02 and Agent 61", "Approval must see residual obligations before submission."),
      x(2, "Three-member final approval", "Records separate approvals of scope, price, risk and signature authority.", "Closed QA/legal pack", "Final human approval protocol", "Agent 01 and E19", "No autonomous system may approve a $46.80m bid."),
      x(1, "ALL-join release control", "Verifies technical, commercial, legal and three-party gates before release.", "E16 + E17 + Agents 56/57/2", "Released final submission state", "E19", "Fan-in requires explicit blocking semantics."),
    ], responsibleActorId: "client", actorIds: ["client", "external", "consultant", "tenderlab"], kind: "decision", trigger: "ALL: E16 + E17 + QA/legal closure + three approvals", startDay: 86, endDay: 96, column: 16, lane: "client", critical: true,
    scopeBoundary: "E18 authorises one baseline; it does not transmit files.", missingAgentFinding: "No gap; integration and submission remain separate.",
  },
  {
    step: 19, period: "День 99 · за 21 час до срока", phase: "Final submission", title: "Консорциум подаёт Stage 2 bid", initiator: "AquaNova authorised signatory",
    narrative: "Document Assembly compiles final technical/commercial volumes, consortium authorisations, securities and encrypted portal files. Audit records exact hashes and receipt; Deadline Agent closes the submission control point. Submitted amount is $46,80 млн.",
    result: "Accepted Stage 2 submission receipt, final file manifest and immutable bid baseline.", next: "E20 waits for evaluation clarification/negotiation; Case remains open.",
    executions: [
      x(58, "Final assembly and submission", "Assembles, signs, validates and transmits the exact E18 baseline.", "Approved final bid artifacts", "Stage 2 package and buyer receipt", "E20 and Agent 04", "Submission is an operational control, not a document-writing step."),
      x(4, "Submitted bid baseline", "Freezes hashes, signatures, receipt and exact $46.80m version.", "Agent 58 package/receipt", "Immutable submitted V2", "E20/21 lineage", "Post-bid responses must reference the submitted record."),
      x(17, "Submission closure", "Confirms receipt before deadline and switches alerts to evaluation mode.", "Buyer receipt + calendar", "Closed submission gate and evaluation watch", "P04 and E20", "Deadline completion must be evidence-based."),
    ], responsibleActorId: "client", actorIds: ["client", "tenderlab"], trigger: "E18 released final state", startDay: 99, endDay: 99, column: 17, lane: "client", critical: true,
    scopeBoundary: "E19 ends at receipt; evaluation and award belong to Buyer-triggered Events.", missingAgentFinding: "No gap; assembly, audit and deadline controls remain distinct.",
  },
  {
    step: 20, period: "День 118–134", phase: "Evaluation wait", title: "Buyer запрашивает clarification и проводит negotiation", initiator: "QazWater evaluation committee",
    narrative: "Buyer sends seven clarification questions and invites authorised consortium representatives to a commercial/technical negotiation meeting. Agent 59 drafts traceable answers; Agent 60 supports human negotiators; Legal Review protects submitted obligations. Any material price/scope change requires three-party Human Approval.",
    result: "Submitted clarification package, approved negotiation minutes and no unauthorised change to bid baseline.", next: "E21 waits for ADB no-objection and official award notice.",
    executions: [
      x(59, "Final-bid clarification response", "Drafts evidence-backed answers tied to submitted V2.", "Seven Buyer questions + E19 baseline", "Buyer-ready response package", "Buyer and Agent 04", "Post-submission questions belong to Agent 59."),
      x(60, "Human negotiation support", "Prepares agenda, talking points, scenario boundaries and objection responses.", "Buyer invitation + approved negotiation mandate", "Negotiation pack and meeting record", "Human representatives and E21", "The Agent supports but does not speak or bind members."),
      x(57, "Negotiation legal guardrail", "Checks whether requested changes alter liabilities, securities or consortium agreement.", "Buyer questions + contract/bid baselines", "Legal limits and approval triggers", "Agent 02 and human negotiators", "Commercial dialogue cannot bypass legal boundaries."),
      x(2, "Material-change approval", "Records three-party approval only for permitted clarifications/negotiation positions.", "Agents 59/60/57 pack", "Approved response/negotiation mandate", "Buyer submission and E21", "Member authority is required for any binding position."),
    ], responsibleActorId: "buyer", actorIds: ["buyer", "client", "external", "consultant"], kind: "wait", trigger: "Buyer evaluation communication", startDay: 118, endDay: 134, column: 18, lane: "buyer", critical: true,
    scopeBoundary: "Buyer evaluates; Agents support authorised consortium response without changing the submitted baseline silently.", missingAgentFinding: "No negotiation Agent gap: Agent 60 is explicitly human-support only.",
  },
  {
    step: 21, period: "День 162–178", phase: "Award to contract", title: "Консорциум получает award и подписывает contract", initiator: "QazWater + ADB no-objection",
    narrative: "Buyer publishes intent/award after ADB no-objection at $46,80 млн. Award-to-Contract coordinates performance security, member documents and signing; Legal Review compares final contract with submitted deviations; all members approve signing. Audit freezes contract baseline and Orchestrator changes Case state to awarded/contracted.",
    result: "Signed $46,80m contract, performance security, award record and approved mobilisation conditions.", next: "E22 transfers delivery/accounting controls to consortium owners and closes TenderLab advisory scope.",
    executions: [
      x(61, "Award-to-contract coordination", "Tracks award review, securities, member conditions and signing checklist.", "Official award + E20 response record", "Award-to-contract action plan and signed-contract checklist", "Agents 57/2/62/63", "Award is not execution-ready until conditions are closed."),
      x(57, "Final contract conformity", "Compares contract text with bid, clarifications and approved deviations.", "Award contract + submitted/negotiated baselines", "Contract conformity and residual-risk memo", "Agent 02 and signing owners", "Signing requires verified obligation continuity."),
      x(2, "Contract signing approvals", "Records authorised approval by all consortium members.", "Agents 61/57 closing pack", "Three-party signing protocol", "Buyer and Agent 01", "Contract authority remains human."),
      x(4, "Contract baseline", "Versions award, securities, signed contract and effective date.", "Official signed artifacts", "Immutable contract V1", "Agents 62/63/64", "Execution needs one authoritative contract state."),
      x(1, "Awarded-to-contracted transition", "Verifies conditions precedent and opens mobilization handoff.", "Agents 61/57/2/4 outputs", "Contracted Case state", "E22", "State transition must wait for ALL closing artifacts."),
    ], responsibleActorId: "buyer", actorIds: ["buyer", "client", "external", "tenderlab"], kind: "decision", trigger: "Official award + ADB no-objection", startDay: 162, endDay: 178, column: 19, lane: "buyer", critical: true,
    scopeBoundary: "E21 ends with effective contract; delivery remains E22 handoff, not simulated completion.", missingAgentFinding: "No gap; award, legal, approval, audit and orchestration boundaries are explicit.",
  },
  {
    step: 22, period: "День 179–185", phase: "Terminal handoff", title: "Открывается mobilisation baseline и закрывается advisory Case", initiator: "Consortium Project Board",
    narrative: "Execution Agent turns contract/workshare into 30-month mobilisation milestones; Contract Administration opens securities, invoices, variations and payment controls. Outcome Learning records win/price/route evidence without claiming completed execution. TenderLab confirms three paid consulting milestones totalling DEMO $240 000 and hands operational ownership to the consortium.",
    result: "Mobilisation plan, contract-control registers, award learning record and closed Consultant engagement at 3/3 milestones.", next: "Case 3 terminal: consortium executes the 30-month contract; a future post-award audit may test delivery performance separately.",
    executions: [
      x(62, "Execution mobilisation", "Builds member-owned design/procurement/construction/commissioning schedule.", "E21 contract + E10 workshare", "30-month mobilisation and execution baseline", "Consortium project owners and Agent 63", "Contract signing must become executable work packages."),
      x(63, "Contract administration setup", "Opens milestone, security, invoice, variation and payment registers.", "Signed contract + mobilisation schedule", "Contract/payment administration baseline", "Consortium finance and governance", "Execution control differs from physical delivery planning."),
      x(64, "Award outcome learning", "Records route, participants, price, decision and award evidence; no completion claim.", "Award/contract records + Case audit trail", "Verified award outcome intelligence", "Agent 05, Discovery and scoring models", "A won consortium route should improve future architecture evidence."),
      x(4, "Advisory closure baseline", "Freezes handoff, paid milestones and terminal Case boundary.", "Agents 62/63/64 outputs + fee records", "Closed Case 3 V1 audit package", "Future post-award Case", "Consultant scope must end without pretending that works are completed."),
    ], responsibleActorId: "client", actorIds: ["client", "external", "consultant", "tenderlab"], kind: "background-update", trigger: "E21 effective contract + mobilisation authority", startDay: 179, endDay: 185, column: 20, lane: "client", critical: true,
    scopeBoundary: "Terminal endpoint is mobilisation handoff, not 30-month completion. Income is simulated and explicitly DEMO.", missingAgentFinding: "No missing Agent; Project execution remains Actor-owned with Agents 62/63 as support.",
  },
];

export const case3Processes: CaseProcess[] = [
  { id: "P01", name: "Platform Policy & Taxonomy", ownerActorId: "tenderlab", agentIds: [1, 15, 16], kind: "persistent", timing: "Platform-wide; versioned before Case", trigger: "Governance, portfolio or taxonomy change", purpose: "Provides approved Works/ADB taxonomy, portfolio thresholds and route policy that E02 reads.", inputs: [{ name: "Platform governance and Works policy", sourceKind: "actor", sourceRef: "tenderlab", availability: "Before Case", blocking: true }], outputArtifactIds: ["artifact-p01-taxonomy", "artifact-p01-policy"], consumerRefs: ["case3-activity-02", "P02"], blocking: true, state: "running" },
  { id: "P02", name: "Company, Partner & Supplier Intelligence", ownerActorId: "tenderlab", agentIds: [5, 6, 7, 8, 11, 12], kind: "persistent", timing: "Before and across Case; public records become verified only after consent", trigger: "New entity or material source change", purpose: "Keeps reusable entity/capability evidence while preserving provisional versus verified status.", inputs: [{ name: "Permitted company/partner/supplier sources", sourceKind: "external", availability: "Before and during Case", blocking: false }, { name: "Taxonomy and rights policy", sourceKind: "process", sourceRef: "P01", availability: "Before use", blocking: true }], outputArtifactIds: ["artifact-p02-company", "artifact-p02-partners", "artifact-p02-suppliers"], consumerRefs: ["case3-activity-02", "case3-activity-04", "PB03", "PB04"], blocking: false, state: "running" },
  { id: "P03", name: "Tender & Award Intelligence Pipeline", ownerActorId: "tenderlab", agentIds: [13, 19, 5, 4], kind: "persistent", timing: "Platform-wide ingestion/linkage", trigger: "Official tender, award or contract publication", purpose: "Supplies linked ADB tender/award/contract history without pretending Agent 19 executes inside discovery Events.", inputs: [{ name: "Official procurement and award sources", sourceKind: "external", availability: "Continuous", blocking: false }], outputArtifactIds: ["artifact-p03-history", "artifact-p03-awards"], consumerRefs: ["PB02", "case3-activity-21"], blocking: false, state: "running" },
  { id: "P04", name: "Deadline & Amendment Monitoring", ownerActorId: "tenderlab", agentIds: [17, 29, 4], kind: "case-scoped", timing: "E01 to E22", trigger: "Source baseline, Buyer communication or amendment", purpose: "Maintains both-stage calendar and change impacts asynchronously.", inputs: [{ name: "Notice and correspondence dates", sourceKind: "event", sourceRef: "case3-activity-01", availability: "After E01", blocking: true }], outputArtifactIds: ["artifact-p04-calendar", "artifact-p04-changes"], consumerRefs: ["case3-activity-03", "case3-activity-14", "case3-activity-15", "case3-activity-19"], blocking: false, state: "running" },
  { id: "P05", name: "Consortium Governance & Decision Ledger", ownerActorId: "consultant", agentIds: [1, 2, 4, 41, 57], kind: "case-scoped", timing: "E03 to E22", trigger: "E03 consortium-feasibility mandate", purpose: "Controls consent, member decisions, workshare versions, confidentiality and multi-party approval without replacing member authority.", inputs: [{ name: "Client mandate", sourceKind: "event", sourceRef: "case3-activity-03", availability: "After E03", blocking: true }, { name: "Member approvals", sourceKind: "actor", availability: "At each gate", blocking: true }], outputArtifactIds: ["artifact-p05-decisions", "artifact-p05-workshare", "artifact-p05-governance"], consumerRefs: ["case3-activity-06", "case3-activity-08", "case3-activity-10", "case3-activity-18", "case3-activity-21"], blocking: true, state: "running" },
  { id: "PB01", name: "Source-Locked Tender & Qualification Model", ownerActorId: "tenderlab", agentIds: [21, 22, 23, 24, 25, 26, 27, 28, 3], kind: "parallel", timing: "After E02; refreshed at E15", trigger: "Opportunity passes triage or authoritative Stage 2 update", purpose: "Builds the multilingual Works corpus, qualification/evaluation/form models and exact specifications used across both stages.", inputs: [{ name: "Official source package", sourceKind: "event", sourceRef: "case3-activity-01", availability: "After E01", blocking: true }, { name: "Stage 2 update", sourceKind: "event", sourceRef: "case3-activity-15", availability: "After E15", blocking: false }], outputArtifactIds: ["artifact-pb01-corpus", "artifact-pb01-qualification", "artifact-pb01-evaluation", "artifact-pb01-forms", "artifact-pb01-specs"], consumerRefs: ["case3-activity-05", "case3-activity-09", "case3-activity-11", "case3-activity-12", "case3-activity-16", "case3-activity-17"], blocking: true, state: "running" },
  { id: "PB02", name: "Market, Buyer & Competitor Enrichment", ownerActorId: "tenderlab", agentIds: [18, 20], kind: "parallel", timing: "After E02; refreshed before final strategy", trigger: "E02 passed opportunity", purpose: "Supplies price bands, Buyer patterns and likely consortium competitors without delaying source triage.", inputs: [{ name: "Classified opportunity", sourceKind: "event", sourceRef: "case3-activity-02", availability: "After E02", blocking: true }, { name: "Award history", sourceKind: "process", sourceRef: "P03", availability: "Ready records", blocking: false }], outputArtifactIds: ["artifact-pb02-market", "artifact-pb02-buyer"], consumerRefs: ["case3-activity-05", "case3-activity-12", "case3-activity-18"], blocking: true, state: "running" },
  { id: "PB03", name: "Partner Discovery & Due-Diligence Pipeline", ownerActorId: "consultant", agentIds: [40, 8, 12, 38], kind: "parallel", timing: "E06 to E10; retry on declined candidate", trigger: "E06 approved partner-search mandate", purpose: "Moves candidates from public shortlist to consented verified member evidence while keeping decisions with AquaNova/all members.", inputs: [{ name: "Role packages", sourceKind: "event", sourceRef: "case3-activity-05", availability: "After E05", blocking: true }, { name: "Partner intelligence", sourceKind: "process", sourceRef: "P02", availability: "Ready records", blocking: false }], outputArtifactIds: ["artifact-pb03-shortlist", "artifact-pb03-diligence"], consumerRefs: ["case3-activity-07", "case3-activity-09", "case3-activity-10"], blocking: true, state: "completed" },
  { id: "PB04", name: "Specialist Supply Chain & RFQ", ownerActorId: "client", agentIds: [11, 43, 44, 45, 46], kind: "parallel", timing: "E10 to E17; budgetary then final quotation refresh", trigger: "E10 workshare + Agent 39 package requirements", purpose: "Builds verified, comparable supplier evidence for specialist equipment not covered by JV members.", inputs: [{ name: "Supplier intelligence", sourceKind: "process", sourceRef: "P02", availability: "Ready records", blocking: false }, { name: "Technical package requirements", sourceKind: "event", sourceRef: "case3-activity-11", availability: "After solution decomposition", blocking: true }], outputArtifactIds: ["artifact-pb04-suppliers", "artifact-pb04-rfq", "artifact-pb04-quotes"], consumerRefs: ["case3-activity-11", "case3-activity-17"], blocking: true, state: "completed" },
];

export const case3RelationshipSpecs: Case3RelationshipSpec[] = [
  { from: 1, to: 2, label: "Source package + V1 baseline", blocking: true },
  { from: 2, to: 3, label: "Opportunity Review Pack 89%", blocking: true },
  { from: 3, to: 4, type: "approved-by", label: "Private-evidence permission", blocking: true },
  { from: 4, to: 5, type: "joins-at", label: "Verified AquaNova baseline", blocking: true, joinPolicy: "ALL" },
  { from: 5, to: 6, type: "approved-by", label: "Consortium route evidence", blocking: true },
  { from: 6, to: 7, type: "branches-to", label: "Approved role packages", blocking: true },
  { from: 7, to: 8, type: "waits-for", label: "Candidate responses + consent", condition: "Decline/timeout retries E07; two consents continue", blocking: true },
  { from: 8, to: 7, type: "retry", label: "Next candidate if declined", condition: "Any required role remains unfilled", blocking: false },
  { from: 8, to: 9, label: "Consented partner data rooms", blocking: true },
  { from: 9, to: 10, type: "approved-by", label: "Verified members + draft workshare", blocking: true, joinPolicy: "ALL" },
  { from: 10, to: 11, type: "branches-to", label: "Binding consortium baseline", blocking: true },
  { from: 11, to: 12, label: "Solution + supply evidence", blocking: true },
  { from: 12, to: 13, type: "approved-by", label: "Stage 1 package", blocking: true },
  { from: 13, to: 14, type: "waits-for", label: "Buyer dialogue and questions", condition: "Buyer completes first-stage review", blocking: true },
  { from: 14, to: 15, label: "Dialogue record + bidder questions", blocking: true },
  { from: 15, to: 16, type: "branches-to", label: "Technical changes", blocking: true },
  { from: 15, to: 17, type: "branches-to", label: "Commercial/BOQ changes", blocking: true },
  { from: 16, to: 18, type: "joins-at", label: "Final technical branch", blocking: true, joinPolicy: "ALL" },
  { from: 17, to: 18, type: "joins-at", label: "Final commercial branch", blocking: true, joinPolicy: "ALL" },
  { from: 18, to: 19, type: "approved-by", label: "Released final baseline", blocking: true },
  { from: 19, to: 20, type: "waits-for", label: "Evaluation communication", condition: "Buyer requests clarification/negotiation", blocking: true },
  { from: 20, to: 21, type: "waits-for", label: "ADB no-objection + award", condition: "Official award publication", blocking: true },
  { from: 21, to: 22, type: "transitions-to", label: "Effective contract + mobilisation authority", blocking: true },
];

const agentById = new Map(agents.map((agent) => [agent.id, agent]));
for (const event of case3EventBlueprints) for (const execution of event.executions) if (!agentById.has(execution.agentId)) throw new Error(`Unknown Agent ${execution.agentId} in Case 3 E${event.step}.`);
if (case3EventBlueprints.length !== 22 || new Set(case3EventBlueprints.map((event) => event.step)).size !== 22) throw new Error("Case 3 requires 22 unique Events.");
if (case3Processes.length !== 9 || case3Processes.some((process) => process.agentIds.some((id) => !agentById.has(id)))) throw new Error("Case 3 requires nine canonical Processes.");
