import { agents } from "../../packages/catalog-data/src/agents.ts";
import type {
  CaseProcess,
  EventAgentAuditDecision,
  ProcessActivityKind,
  ProcessRelationship,
} from "../process-model.ts";

type EventBlueprint = {
  step: number;
  period: string;
  phase: string;
  title: string;
  initiator: string;
  narrative: string;
  result: string;
  next: string;
  agentIds: number[];
  standbyAgentIds?: number[];
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
  auditStatus?: "in-review" | "approved";
};

export type Case1ExecutionOverride = {
  role?: string;
  action?: string;
  necessity?: EventAgentAuditDecision;
  condition?: string;
  activation?: "triggered" | "standby";
  input?: string;
  output?: string;
  handoff?: string;
  rationale?: string;
  overlapNote?: string;
  validationStatus?: "confirmed" | "working" | "needs-review";
};

export type Case1RelationshipSpec = {
  from: number;
  to: number;
  type?: ProcessRelationship["type"];
  label: string;
  condition?: string;
  blocking?: boolean;
  joinPolicy?: ProcessRelationship["joinPolicy"];
};

const agentById = new Map(agents.map((agent) => [agent.id, agent]));
const agentName = (id: number) => {
  const agent = agentById.get(id);
  if (!agent) throw new Error(`Unknown canonical Agent ${id} in Case 1 orchestration.`);
  return agent.name;
};

export const case1EventBlueprints: EventBlueprint[] = [
  {
    step: 1, period: "День 0 · публикация", phase: "Источник", title: "Заказчик публикует международную закупку", initiator: "Министерство образования и науки Грузии",
    narrative: "На официальном портале заказчика и в канале Всемирного банка публикуются notice GE-MES-2026-017 и 27 исходных файлов по одному лоту на 26 130 изделий для 180 школ. TenderLab получает только первичный source package и фиксирует воспроизводимый baseline; классификация ещё не выполняется.",
    result: "Нормализованный notice, 27 оригинальных файлов, source manifest и tender-package-v1 с audit trail.", next: "Backend triage получает неизменяемый source package и готовые Case-level policy records.",
    agentIds: [13, 4], responsibleActorId: "buyer", actorIds: ["buyer", "tenderlab"], kind: "external-event", trigger: "Официальная публикация notice", startDay: 0, endDay: 0, column: 0, lane: "buyer", critical: true,
    scopeBoundary: "Buyer публикует; Agents 13/04 получают источник и фиксируют baseline. Интерпретация notice относится к E02.", missingAgentFinding: "Новый Agent не нужен; Agent 15 намеренно отсутствует в E01.", auditStatus: "approved",
  },
  {
    step: 2, period: "День 0–1", phase: "Backend triage", title: "Backend классифицирует, фильтрует и ранжирует возможность", initiator: "TenderLab / Backend",
    narrative: "E02 читает готовые records: source package из E01, versioned taxonomy и filter policy из P01, provisional company profile из P02 и historical award records из P03. Agent 15 классифицирует, Agent 16 применяет policy/thresholds/exclusions, Agent 14 ранжирует прошедшую opportunity. Рыночная и конкурентная аналитика не исполняется внутри E02 — отдельная ветвь PB01 продолжается параллельно до E08.",
    result: "Opportunity Review Pack: классификация, filter decision с причинами и provisional relevance 92%.", next: "Показать opportunity компании и запросить permission на tender-specific assessment; PB01 продолжает market enrichment параллельно.",
    agentIds: [15, 16, 14], responsibleActorId: "tenderlab", actorIds: ["tenderlab"], trigger: "E01 package + P01 policy + P02 provisional profile доступны", startDay: 0, endDay: 1, column: 1, lane: "tenderlab", critical: true,
    scopeBoundary: "E02 — только Backend triage 15→16→14. Agent 19 является persistent data producer; Agents 18/20 работают в PB01; Agent 17 работает в P04; Consultant не участвует.", missingAgentFinding: "Upstream gaps закрыты P01/P02/P03. Дополнительный Agent в E02 не нужен.", auditStatus: "approved",
  },
  {
    step: 3, period: "День 1", phase: "Client Side", title: "Компания разрешает углублённую работу", initiator: "Коммерческий директор Anatolia Workspace A.Ş.",
    narrative: "Компания получает Opportunity Review Pack, подтверждает интерес, назначает bid manager, technical lead, finance и legal owners и разрешает tender-specific assessment. Это permission gate, а не решение BID / NO-BID. Consultant Actor для выполнения E03 не требуется.",
    result: "Открыт управляемый Case 1, назначены owners и разрешены параллельные ветви Company и Documents.", next: "E04 и E05 запускаются параллельно; P04 связывает внешние даты с назначенными owners.",
    agentIds: [1, 2], responsibleActorId: "client", actorIds: ["client", "tenderlab"], kind: "decision", trigger: "Opportunity Review Pack 92%", startDay: 1, endDay: 1, column: 2, lane: "client", critical: true,
    scopeBoundary: "Человек разрешает assessment; Orchestrator открывает Case state. BID decision остаётся E08.", missingAgentFinding: "Новый Agent и Consultant Actor не требуются.",
  },
  {
    step: 4, period: "День 1–3", phase: "Компания", title: "Формируется подтверждённый профиль и readiness", initiator: "Bid manager компании",
    narrative: "Компания предоставляет регистрационные документы, каталог, мощность, финансовые данные, сертификаты и references. Данные P02 заменяются подтверждённым company baseline; readiness остаётся общей оценкой компании и не подменяет tender-specific match.",
    result: "Verified Company Profile, evidence ledger и Tender Readiness 84/100 с двумя контролируемыми gaps.", next: "Verified profile становится обязательным входом E07 и последующих решений.",
    agentIds: [6, 7, 8, 10, 9, 3], responsibleActorId: "client", actorIds: ["client", "tenderlab"], trigger: "Company permission и назначенные owners", startDay: 1, endDay: 3, column: 3, lane: "client", critical: true,
    scopeBoundary: "E04 владеет verified company baseline/readiness; tender requirements и match не рассчитываются.", missingAgentFinding: "Текущий набор покрывает профиль, capability, verification, credentials, readiness и evidence.",
  },
  {
    step: 5, period: "День 1–4", phase: "Документы", title: "Tender package превращается в source-locked corpus", initiator: "TenderLab / Backend",
    narrative: "27 файлов индексируются, получают checksum, version links и структуру: один лот, 68 BOQ-позиций, 180 delivery points и 27 форм. OCR/translation запускается только при непригодном source; amendment monitoring остаётся в P04.",
    result: "Версионированный corpus-v1 со структурой lot/BOQ/forms и page-level source coordinates.", next: "E06 извлекает требования и evaluation model только из зафиксированного corpus.",
    agentIds: [21, 23, 4], standbyAgentIds: [22], responsibleActorId: "tenderlab", actorIds: ["tenderlab"], trigger: "Case открыт и E01 source manifest доступен", startDay: 1, endDay: 4, column: 3, lane: "tenderlab", critical: true,
    scopeBoundary: "E05 отвечает за corpus и структуру, но не интерпретирует eligibility или company fit.", missingAgentFinding: "Agent 22 остаётся conditional standby; Agent 29 работает в persistent monitoring P04.",
  },
  {
    step: 6, period: "День 3–5", phase: "Требования", title: "Извлекаются требования, критерии и формы", initiator: "TenderLab document workflow",
    narrative: "Из corpus-v1 извлекаются 164 требования, rated criteria, evaluated-price rules, 27 форм, 68 технических спецификаций, bid security, сроки, упаковка, монтаж и гарантия. Eligibility outcome ещё не утверждается: для него нужен verified profile из E04.",
    result: "Source-traceable Requirements Register, Evaluation Model, Forms Register и Specification Baseline.", next: "E07 объединяет outputs E04 и E06 и только тогда определяет eligibility, match и gaps.",
    agentIds: [24, 26, 27, 28, 3], standbyAgentIds: [30], responsibleActorId: "tenderlab", actorIds: ["tenderlab"], trigger: "Source-locked corpus-v1", startDay: 3, endDay: 5, column: 4, lane: "tenderlab", critical: true,
    scopeBoundary: "E06 извлекает tender-side facts; Agent 25 перенесён в E07, где уже существует verified company input.", missingAgentFinding: "Agent 25 не должен преждевременно работать без E04 profile.",
  },
  {
    step: 7, period: "День 4–6", phase: "Qualification + Match", title: "Компания квалифицируется и сопоставляется с тендером", initiator: "TenderLab scoring workflow",
    narrative: "Fan-in E04 + E06 создаёт первый момент, когда eligibility и tender-specific fit могут быть рассчитаны доказуемо. Определяются conditional Pass, Match 88%, solution-fit и owners для bid security/local service gaps.",
    result: "Eligibility decision, Match 88%, solution-fit и Gap Remediation Plan с owners и сроками.", next: "E08 получает полный decision pack вместе с параллельным market/competitor brief PB01.",
    agentIds: [25, 31, 32, 34, 3], responsibleActorId: "tenderlab", actorIds: ["tenderlab", "client"], trigger: "ALL: Verified Company Profile + Requirements Register", startDay: 4, endDay: 6, column: 5, lane: "tenderlab", critical: true,
    scopeBoundary: "E07 определяет eligibility/match/gaps, но не принимает коммерческое решение.", missingAgentFinding: "Перенос Agent 25 закрывает upstream dependency gap без изменения canonical Agent.",
  },
  {
    step: 8, period: "День 6", phase: "Decision Gate", title: "Руководство принимает условное решение BID", initiator: "Tender committee компании",
    narrative: "Decision gate сводит eligibility, Match, feasibility, preliminary economics, risk pack и завершённую к этому моменту ветвь PB01. Agents 18/20 не были частью E02: они завершают market/competitor enrichment непосредственно к E08. Agent 19 не запускается — читаются готовые P03 records.",
    result: "Подписанный BID protocol: win probability 61%, margin floor 13%, cash-gap limit и четыре условия продолжения.", next: "При положительном gate активируются partner branch E09 и solution design E10.",
    agentIds: [35, 36, 37, 38, 2, 18, 20], responsibleActorId: "client", actorIds: ["client", "tenderlab"], kind: "decision", trigger: "ALL: E07 decision pack + PB01 market/competitor brief", startDay: 6, endDay: 6, column: 6, lane: "client", critical: true,
    scopeBoundary: "E08 — human-owned BID gate. Market Agents дают inputs, но не принимают решение.", missingAgentFinding: "Agent 19 не нужен как Event execution; P03 обеспечивает historical records.",
  },
  {
    step: 9, period: "День 6–9", phase: "Conditional Partner Branch", title: "Закрывается local-service gap", initiator: "TenderLab / Command Center",
    narrative: "Поскольку Anatolia производит весь lot, supplier/RFQ chain не запускается. Условная ветвь ищет и проверяет грузинского service subcontractor, подтверждает coverage 180 школ, route и integrity.",
    result: "Verified local-service subcontractor, capability map, integrity clearance и route prime + subcontractor.", next: "E10 принимает partner workshare как обязательный input только потому, что условие E09 сработало.",
    agentIds: [42, 12, 33, 8, 38], responsibleActorId: "consultant", actorIds: ["consultant", "client", "external"], trigger: "E08 BID condition: local service обязателен", startDay: 6, endDay: 9, column: 7, lane: "consultant",
    scopeBoundary: "Ветвь ограничена local service; product supplier/JV/RFQ не требуются.", missingAgentFinding: "Fresh integrity screening Agent 38 включён и закрывает прежний unresolved finding.",
  },
  {
    step: 10, period: "День 7–12", phase: "Solution Design", title: "Проектируется предконтрактное решение", initiator: "Технический директор Anatolia",
    narrative: "Solution design объединяет product families, capacity, шесть волн доставки, installation и warranty model. Agent 62 не запускается: его canonical trigger — effective contract; pre-award logistics остаётся частью архитектуры и feasibility.",
    result: "Solution Architecture, Capacity Plan, six-wave schedule и подтверждённый workshare.", next: "E11 проверяет последний момент для pre-bid clarification; затем начинается compliance.",
    agentIds: [39, 36, 7], responsibleActorId: "client", actorIds: ["client", "tenderlab", "external"], trigger: "E08 BID + conditional E09 output when triggered", startDay: 7, endDay: 12, column: 7, lane: "client", critical: true,
    scopeBoundary: "E10 проектирует обещание; post-award live execution Agent 62 начинается только в E21.", missingAgentFinding: "Agent 62 удалён из pre-bid Event как premature execution.",
  },
  {
    step: 11, period: "День 9–15", phase: "Clarification Gate", title: "Проверяется необходимость pre-bid clarification", initiator: "Bid manager",
    narrative: "Команда проверяет BOQ, drawings и clauses до официального question deadline. Material conflict не найден, поэтому Agent 30 остаётся standby, а валидным output gate является решение «вопрос не требуется». Deadline/amendment surveillance продолжает P04.",
    result: "Зафиксирован no-question decision; blocking ambiguity отсутствует.", next: "E12 начинает доказательный compliance build; P04 продолжает наблюдение до submission.",
    agentIds: [], standbyAgentIds: [30], responsibleActorId: "consultant", actorIds: ["client", "consultant", "tenderlab"], kind: "wait", trigger: "Pre-bid clarification deadline", startDay: 9, endDay: 15, column: 8, lane: "consultant",
    scopeBoundary: "Event фиксирует decision/no-action; не имитирует несуществующий Buyer exchange.", missingAgentFinding: "Persistent Agent 17/29 monitoring находится в P04, не дублируется в E11.",
  },
  {
    step: 12, period: "День 10–17", phase: "Compliance", title: "Закрываются compliance и evidence obligations", initiator: "TenderLab + bid team",
    narrative: "Каждое требование получает ответ, owner, evidence и status; техническая и коммерческая compliance проверяются отдельно. Eligibility Agent подтверждает final Pass после закрытия bid security и local-service условий.",
    result: "Compliance Matrix 164/164, Technical/Commercial Pass, final Eligibility Pass и Credentials Pack.", next: "E13 рассчитывает final cost/BOQ; outputs E12 также входят в proposal E14.",
    agentIds: [47, 48, 49, 55, 3, 25], responsibleActorId: "consultant", actorIds: ["consultant", "client", "tenderlab"], trigger: "E10 solution + E11 gate cleared + closed gaps", startDay: 10, endDay: 17, column: 9, lane: "consultant", critical: true,
    scopeBoundary: "E12 доказывает соответствие; narrative drafting и final price принадлежат E14/E13.", missingAgentFinding: "Final Agent 25 execution имеет новый output и не дублирует preliminary conditional Pass E07.",
  },
  {
    step: 13, period: "День 11–18", phase: "Pricing", title: "Финализируются landed cost и BOQ", initiator: "Finance director",
    narrative: "Production, packaging, freight, duties, last mile, installation и risk reserve превращаются в 68-line BOQ. Commercial business case повторно проверяется относительно margin floor и cash-gap limit E08.",
    result: "Landed cost $3.14m, validated BOQ $3.61m и refreshed business case в пределах approved thresholds.", next: "E14 получает approved commercial schedules; E15 проверяет согласованность package.",
    agentIds: [50, 51, 37, 49], responsibleActorId: "client", actorIds: ["client", "consultant"], trigger: "E10 solution + E12 commercial requirements", startDay: 11, endDay: 18, column: 9, lane: "client", critical: true,
    scopeBoundary: "E13 владеет числовой коммерческой моделью; BID authority не переоткрывается без threshold breach.", missingAgentFinding: "Текущие outputs различимы: cost, BOQ, attractiveness recheck и commercial compliance.",
  },
  {
    step: 14, period: "День 14–21", phase: "Proposal", title: "Собирается техническое и коммерческое предложение", initiator: "Bid manager",
    narrative: "Strategy, technical narrative и commercial schedules создаются из одобренных outputs E12/E13. Credentials Pack Agent 55 только потребляется — повторного исполнения нет.",
    result: "Complete proposal draft: strategy brief, 42-page technical proposal и commercial schedules.", next: "E15 проводит independent QA, legal review и human approval.",
    agentIds: [52, 53, 54], responsibleActorId: "client", actorIds: ["client", "consultant", "tenderlab"], trigger: "ALL: E12 compliance + E13 approved BOQ", startDay: 14, endDay: 21, column: 10, lane: "client", critical: true,
    scopeBoundary: "E14 пишет proposal; qualification evidence создано E12 и не производится повторно.", missingAgentFinding: "Agent 55 остаётся upstream producer, не дублируется.",
  },
  {
    step: 15, period: "День 21–25", phase: "QA + Approval", title: "Заявка проходит red team, legal review и freeze", initiator: "TenderLab Consultant / client committee",
    narrative: "Independent QA проверяет completeness, consistency, compliance и evaluability; legal review проверяет risks/deviations; человек утверждает content, price и release. Audit Agent фиксирует frozen baseline.",
    result: "Закрытый red-team log, legal clearance, human approval и final-approved package baseline.", next: "E16 выполняет только assembly/sign/upload; content editing после freeze запрещён.",
    agentIds: [56, 57, 2, 4], responsibleActorId: "consultant", actorIds: ["consultant", "client"], kind: "decision", trigger: "Complete proposal draft", startDay: 21, endDay: 25, column: 11, lane: "consultant", critical: true,
    scopeBoundary: "E15 утверждает содержание и release; portal mechanics принадлежат E16.", missingAgentFinding: "Rework loops явно возвращают compliance defects в E12, proposal defects в E14.",
  },
  {
    step: 16, period: "День 27", phase: "Submission", title: "Approved package подписывается и подаётся", initiator: "Уполномоченный представитель Anatolia",
    narrative: "Agent 58 собирает, проверяет manifest, signatures и portal requirements и загружает 31 файл за 18 часов до deadline. P04 подтверждает deadline status; Agent 4 фиксирует submitted baseline и receipt.",
    result: "31 submitted files, manifest/checksums, portal receipt и immutable submission-v1.", next: "Процесс входит в managed evaluation wait; официальный Buyer request создаёт E17.",
    agentIds: [58, 17, 4], responsibleActorId: "client", actorIds: ["client", "tenderlab", "external"], trigger: "E15 final-approved package", startDay: 27, endDay: 27, column: 12, lane: "client", critical: true,
    scopeBoundary: "E16 не редактирует approved content и не повторяет Human Approval E15.", missingAgentFinding: "Agent 2 намеренно не дублируется; его release decision уже записан E15.",
  },
  {
    step: 17, period: "День 35", phase: "External Evaluation", title: "Комиссия направляет официальный clarification request", initiator: "Evaluation committee Buyer",
    narrative: "Во время managed wait Buyer запрашивает подтверждение emissions и installation schedule. TenderLab получает официальный request, фиксирует source/version и due date; содержательный ответ ещё не создаётся.",
    result: "Source-locked Buyer request, два вопроса и официальный response deadline.", next: "E18 готовит, проверяет и утверждает evidence-only response.",
    agentIds: [13, 17, 4], responsibleActorId: "buyer", actorIds: ["buyer", "tenderlab", "client"], kind: "external-event", trigger: "Официальный Buyer clarification request", startDay: 35, endDay: 35, column: 13, lane: "buyer",
    scopeBoundary: "E17 фиксирует внешний request; response authoring относится к E18.", missingAgentFinding: "Разделение external request и response устраняет перегруженный прежний Event.",
  },
  {
    step: 18, period: "День 35–42", phase: "Clarification Response", title: "Компания подаёт доказательный clarification response", initiator: "Bid manager + authorised signatory",
    narrative: "Ответы связываются с submitted baseline, test reports и approved schedule, проходят no-new-obligation legal review и Human Approval и подаются до due date. Отдельная версия response сохраняется с receipt.",
    result: "Approved and submitted clarification package с evidence map, legal clearance и receipt.", next: "Evaluation wait продолжается до официального intention-to-award E19.",
    agentIds: [59, 3, 57, 2, 17, 4], responsibleActorId: "client", actorIds: ["client", "consultant", "tenderlab", "buyer"], trigger: "E17 request + response deadline", startDay: 35, endDay: 42, column: 14, lane: "client",
    scopeBoundary: "E18 отвечает только на official questions и не изменяет price/scope.", missingAgentFinding: "Все prerequisites доступны из E17 и submitted baseline E16.",
  },
  {
    step: 19, period: "День 56–66", phase: "Intention to Award + Standstill", title: "Buyer объявляет intention to award и начинается standstill", initiator: "Министерство образования и науки Грузии",
    narrative: "Официальный notice подтверждает evaluated price и победителя. Conditions сверяются с bid, standstill/complaint/signing dates фиксируются, руководство подтверждает готовность продолжить после standstill.",
    result: "Source-locked award notice, accepted conditions и controlled standstill calendar.", next: "E20 блокируется до окончания standstill и получения final contract.",
    agentIds: [61, 17, 57, 2, 4], responsibleActorId: "buyer", actorIds: ["buyer", "client", "tenderlab"], kind: "wait", trigger: "Official Notice of Intention to Award", startDay: 56, endDay: 66, column: 15, lane: "buyer", critical: true,
    scopeBoundary: "E19 покрывает notice/standstill, но не подписывает contract.", missingAgentFinding: "Managed wait имеет owner, due dates и unblock trigger.",
  },
  {
    step: 20, period: "День 67–69", phase: "Contract Signing", title: "Стороны подписывают контракт", initiator: "Buyer и Anatolia authorised signatories",
    narrative: "После standstill Agent 61 завершает performance security/signing checklist, Legal сверяет final contract с bid/award conditions, человек разрешает signature, Audit фиксирует executed baseline.",
    result: "Signed contract, performance security, signing checklist и immutable contract-baseline-v1.", next: "Effective contract является canonical trigger для E21 mobilization Agents 62/63.",
    agentIds: [61, 57, 2, 4], responsibleActorId: "external", actorIds: ["buyer", "client", "external"], kind: "decision", trigger: "Standstill завершён без блокирующей complaint", startDay: 67, endDay: 69, column: 16, lane: "external", critical: true,
    scopeBoundary: "E20 переводит award в effective contract; operational tracking ещё не начат.", missingAgentFinding: "Agents 62/63 запускаются только downstream, после effective contract.",
  },
  {
    step: 21, period: "День 70–75", phase: "Mobilization", title: "Создаётся operational baseline исполнения", initiator: "Contract manager Anatolia",
    narrative: "Pre-bid plan E10 преобразуется в contract-controlled schedule: sites, six waves, QC, milestones, invoices, retention, guarantees и variation procedure. Baseline фиксируется до начала производства.",
    result: "Approved mobilization schedule, site sequence и contract-administration baseline.", next: "E22 отслеживает actual production, logistics, installation и milestones относительно baseline.",
    agentIds: [62, 63, 4], responsibleActorId: "client", actorIds: ["client", "tenderlab", "external"], trigger: "Effective signed contract E20", startDay: 70, endDay: 75, column: 17, lane: "client", critical: true,
    scopeBoundary: "E21 создаёт baseline; actual delivery records принадлежат E22.", missingAgentFinding: "Canonical trigger Agent 62 теперь соблюдён.",
  },
  {
    step: 22, period: "День 76–210", phase: "Execution", title: "Производство, поставка и монтаж исполняются шестью волнами", initiator: "Operations team Anatolia + local partner",
    narrative: "Actual production/QC, transport, last mile, installation и acceptance evidence обновляют live execution status. Contract administration связывает invoices, guarantees, retention и approved variations с milestones.",
    result: "Completed delivery/installation record по 180 школам и актуальный milestone/payment register.", next: "E23 выполняет final acceptance, financial close и warranty handover.",
    agentIds: [62, 63, 4], responsibleActorId: "client", actorIds: ["client", "buyer", "external", "tenderlab"], trigger: "E21 approved operational baseline", startDay: 76, endDay: 210, column: 18, lane: "client", critical: true,
    scopeBoundary: "E22 владеет live execution; outcome learning не начинается до verified close.", missingAgentFinding: "Текущие Agents покрывают operations, administration и immutable change history.",
  },
  {
    step: 23, period: "День 211–219", phase: "Acceptance + Close", title: "Контракт проходит приёмку и финансовое закрытие", initiator: "Buyer acceptance committee",
    narrative: "Buyer подтверждает acceptance, компания закрывает invoices/retention, передаёт warranties и фиксирует remaining obligations. Final actuals отделяются от плановых данных.",
    result: "Final acceptance certificates, financial close, warranty handover и verified contract outcome package.", next: "E24 превращает verified outcome в learning и persistent intelligence records.",
    agentIds: [62, 63, 4], responsibleActorId: "buyer", actorIds: ["buyer", "client", "tenderlab"], trigger: "Все six-wave milestones завершены", startDay: 211, endDay: 219, column: 19, lane: "buyer", critical: true,
    scopeBoundary: "E23 закрывает contractual facts; model corrections относятся к E24.", missingAgentFinding: "Отдельный close Event предотвращает преждевременное learning из незакрытого execution.",
  },
  {
    step: 24, period: "После закрытия", phase: "Learning + Persistent Update", title: "Verified outcome возвращается в архитектуру", initiator: "TenderLab / Backend",
    narrative: "Agent 64 сравнивает promise, bid scores и actual outcome; Agent 5 обновляет relationships; persistent Agent 19 принимает verified award/contract record в P03. Agent 4 фиксирует closing lineage. Это background update, а не новый tender decision.",
    result: "Outcome learning record, updated Knowledge Graph и пополненный persistent Tender & Award Intelligence dataset.", next: "Будущие E02/PB01 читают обновлённые records; текущий Case завершается.",
    agentIds: [64, 5, 19, 4], responsibleActorId: "tenderlab", actorIds: ["tenderlab"], kind: "background-update", trigger: "Verified contract outcome package E23", startDay: 220, endDay: 220, column: 20, lane: "tenderlab",
    scopeBoundary: "E24 обновляет reusable intelligence; не переоткрывает Case decision или execution.", missingAgentFinding: "Agent 19 выполняется здесь как persistent pipeline update, но не в E02.",
  },
];

export const case1Chronology = case1EventBlueprints.map(({ agentIds, standbyAgentIds = [], ...event }) => ({
  ...event,
  agents: [
    ...agentIds.map(agentName),
    ...standbyAgentIds.map((id) => `${agentName(id)} — резерв`),
  ],
}));

export const case1Processes: CaseProcess[] = [
  {
    id: "P01", name: "Platform Policy & Taxonomy", ownerActorId: "tenderlab", agentIds: [1, 15, 16], kind: "persistent", timing: "Постоянно; versioned configuration до появления Case", trigger: "Изменение platform governance, portfolio strategy или controlled rules", purpose: "Хранит procurement taxonomy, company/portfolio filter policy, thresholds и exclusions, которые E02 только читает.", inputs: [
      { name: "Platform governance", sourceKind: "actor", sourceRef: "tenderlab", availability: "До Case; owner/approval требует governance evidence", blocking: true },
      { name: "Portfolio strategy", sourceKind: "actor", sourceRef: "tenderlab", availability: "До Case", blocking: true },
      { name: "Accepted geography/category/risk rules", sourceKind: "actor", sourceRef: "tenderlab", availability: "До Case", blocking: true },
    ], outputArtifactIds: ["artifact-p01-taxonomy", "artifact-p01-filter-policy", "artifact-p01-thresholds"], consumerRefs: ["activity-02"], blocking: true, state: "running",
  },
  {
    id: "P02", name: "Open-source Prospect Intelligence", ownerActorId: "tenderlab", agentIds: [6, 7, 8, 3, 5], kind: "persistent", timing: "До первого контакта с компанией; refresh по источникам", trigger: "Новый prospect или существенное изменение открытых источников", purpose: "Создаёт provisional company profile для discovery/ranking до того, как компания знает о Case.", inputs: [
      { name: "Open company registries", sourceKind: "external", availability: "До Case при доступности registry", blocking: true },
      { name: "Public catalogues and references", sourceKind: "external", availability: "До Case; completeness может быть ограничена", blocking: true },
      { name: "Source provenance", sourceKind: "process", sourceRef: "P03", availability: "При ingestion открытых records", blocking: true },
    ], outputArtifactIds: ["artifact-p02-provisional-profile", "artifact-p02-evidence-gaps"], consumerRefs: ["activity-02", "activity-03", "activity-04"], blocking: true, state: "running",
  },
  {
    id: "P03", name: "Tender & Award Intelligence Pipeline", ownerActorId: "tenderlab", agentIds: [13, 19, 5, 4], kind: "persistent", timing: "Постоянный ingestion/linkage; E02 читает готовые records", trigger: "Новая или изменённая procurement/award/contract publication", purpose: "Собирает и связывает notice, award и contract records; не запускает Agent 19 внутри E02.", inputs: [
      { name: "Official procurement sources", sourceKind: "external", availability: "Постоянно по configured sources", blocking: false },
      { name: "Award notices", sourceKind: "external", availability: "После публикации award", blocking: false },
      { name: "Contract records", sourceKind: "external", availability: "После публикации/получения contract record", blocking: false },
      { name: "Verified Case outcomes", sourceKind: "event", sourceRef: "activity-24", availability: "После закрытия Case", blocking: false },
    ], outputArtifactIds: ["artifact-p03-tender-award-history", "artifact-p03-winner-values"], consumerRefs: ["activity-02", "PB01", "activity-08", "activity-24"], blocking: false, state: "running",
  },
  {
    id: "P04", name: "Deadline & Amendment Monitoring", ownerActorId: "tenderlab", agentIds: [17, 29, 4], kind: "case-scoped", timing: "От E01 до E16; возобновляется при E17/E19", trigger: "E01 source package или последующее официальное изменение", purpose: "Поддерживает deadlines, alerts, source changes и amendment impacts вне отдельных Event cards.", inputs: [
      { name: "Notice dates", sourceKind: "event", sourceRef: "activity-01", availability: "После E01", blocking: true },
      { name: "Official portal updates", sourceKind: "external", availability: "Асинхронно", blocking: false },
      { name: "Case owners", sourceKind: "event", sourceRef: "activity-03", availability: "После E03; до этого alerts не персонализированы", blocking: false },
    ], outputArtifactIds: ["artifact-p04-calendar", "artifact-p04-amendment-impact"], consumerRefs: ["activity-03", "activity-05", "activity-11", "activity-16", "activity-17", "activity-18", "activity-19"], blocking: false, state: "running",
  },
  {
    id: "PB01", name: "Market & Competitor Enrichment", ownerActorId: "tenderlab", agentIds: [18, 20], kind: "parallel", timing: "Параллельно после E02 и до E08", trigger: "E02 opportunity прошла первичный triage", purpose: "Обогащает market/competitor context, не блокирует company permission E03, но должно завершиться к BID gate.", inputs: [
      { name: "E02 classified opportunity", sourceKind: "event", sourceRef: "activity-02", availability: "После E02", blocking: true },
      { name: "P03 award history", sourceKind: "process", sourceRef: "P03", availability: "Готовые persistent records", blocking: false },
      { name: "Buyer/company open data", sourceKind: "external", availability: "Параллельно по доступным источникам", blocking: false },
    ], outputArtifactIds: ["artifact-pb01-market-brief", "artifact-pb01-buyer-dossier"], consumerRefs: ["activity-08", "activity-14"], blocking: true, state: "running",
  },
];

export const case1RelationshipSpecs: Case1RelationshipSpec[] = [
  { from: 1, to: 2, label: "Notice + immutable source package", blocking: true },
  { from: 2, to: 3, label: "Opportunity Review Pack 92%", blocking: true },
  { from: 3, to: 4, type: "branches-to", label: "Permission: verify company", blocking: true },
  { from: 3, to: 5, type: "branches-to", label: "Permission: process documents", blocking: true },
  { from: 4, to: 7, type: "joins-at", label: "Verified profile + readiness", blocking: true, joinPolicy: "ALL" },
  { from: 5, to: 6, label: "Source-locked corpus-v1", blocking: true },
  { from: 6, to: 7, type: "joins-at", label: "Requirements/evaluation/forms model", blocking: true, joinPolicy: "ALL" },
  { from: 7, to: 8, label: "Eligibility + Match + gaps", blocking: true },
  { from: 8, to: 9, type: "branches-to", label: "Conditional local-service branch", condition: "Local service gap активирован", blocking: true },
  { from: 8, to: 10, type: "branches-to", label: "Approved BID constraints", blocking: true },
  { from: 9, to: 10, type: "joins-at", label: "Verified partner workshare", condition: "Только если E09 активирован", blocking: true, joinPolicy: "ALL" },
  { from: 10, to: 11, label: "Solution + unresolved ambiguity check", blocking: true },
  { from: 11, to: 12, label: "Clarification gate cleared", blocking: true },
  { from: 12, to: 13, label: "Commercial requirements + compliance", blocking: true },
  { from: 12, to: 14, type: "joins-at", label: "Compliance 164/164 + credentials", blocking: true, joinPolicy: "ALL" },
  { from: 13, to: 14, type: "joins-at", label: "Approved BOQ $3.61m", blocking: true, joinPolicy: "ALL" },
  { from: 14, to: 15, label: "Complete proposal draft", blocking: true },
  { from: 15, to: 12, type: "rework", label: "Compliance/evidence correction", condition: "QA finds compliance or evidence defect", blocking: false },
  { from: 15, to: 14, type: "rework", label: "Proposal correction", condition: "QA finds narrative/schedule defect", blocking: false },
  { from: 15, to: 16, type: "approved-by", label: "Final-approved package", blocking: true },
  { from: 16, to: 17, type: "waits-for", label: "Buyer clarification request", condition: "Только при official request", blocking: false },
  { from: 17, to: 18, label: "Source-locked questions + due date", blocking: true },
  { from: 16, to: 19, type: "waits-for", label: "Buyer evaluation outcome", blocking: true },
  { from: 18, to: 19, type: "joins-at", label: "Accepted clarification response", blocking: true, joinPolicy: "ALL" },
  { from: 19, to: 20, type: "waits-for", label: "Standstill cleared", blocking: true },
  { from: 20, to: 21, type: "transitions-to", label: "Effective contract baseline", blocking: true },
  { from: 21, to: 22, label: "Approved operational baseline", blocking: true },
  { from: 22, to: 23, label: "Completed milestones + acceptance evidence", blocking: true },
  { from: 23, to: 24, label: "Verified outcome package", blocking: true },
  { from: 24, to: 2, type: "feedback", label: "Reusable learning for future cases", blocking: false },
];

const confirmed = { validationStatus: "confirmed" as const };
export const case1ExecutionOverrides: Record<string, Case1ExecutionOverride> = {
  "1:13": { ...confirmed, role: "Primary source acquisition", action: "Получает notice и все official attachments; создаёт source manifest.", input: "Official buyer/WB endpoints", output: "Normalized notice + 27 originals + source manifest", handoff: "Agent 04 и E02" },
  "1:4": { ...confirmed, role: "Immutable publication baseline", action: "Фиксирует tender-package-v1 и lineage.", input: "Agent 13 source package", output: "Publication audit entry + baseline-v1", handoff: "E02/E05/P04" },
  "2:15": { ...confirmed, role: "Canonical classification", action: "Классифицирует sector/category/geography/buyer/procedure/lot.", input: "E01 normalized notice + P01 taxonomy", output: "Tender classification record", handoff: "Agent 16" },
  "2:16": { ...confirmed, role: "Deterministic filtering", action: "Применяет готовые policy, thresholds и exclusions.", input: "Agent 15 classification + P01 filter policy", output: "Pass/reject record с причинами", handoff: "Agent 14" },
  "2:14": { ...confirmed, role: "Provisional opportunity ranking", action: "Ранжирует прошедшую фильтр opportunity по P02 profile.", input: "Filtered opportunity + P02 provisional profile", output: "Opportunity Review Pack 92%", handoff: "E03; PB01 продолжает параллельно" },
  "8:18": { necessity: "conditional", activation: "triggered", condition: "Высокая ценовая конкуренция требует market benchmark.", role: "Parallel market enrichment", action: "Завершает PB01 market brief к BID gate.", input: "E02 opportunity + P03 records", output: "Market Intelligence brief", handoff: "Agents 35/37 и E14" },
  "8:20": { necessity: "conditional", activation: "triggered", condition: "Международная процедура требует buyer/competitor context.", role: "Parallel buyer/competitor enrichment", action: "Завершает PB01 dossier к BID gate.", input: "Buyer history + P03 award records", output: "Buyer/competitor dossier", handoff: "Agents 35/52" },
  "9:42": { necessity: "conditional", activation: "triggered", condition: "Local service gap подтверждён E07/E08." },
  "9:12": { necessity: "conditional", activation: "triggered", condition: "Выбран local-service candidate." },
  "9:33": { necessity: "conditional", activation: "triggered", condition: "Prime + subcontractor route требуется для Case." },
  "9:8": { necessity: "conditional", activation: "triggered", condition: "Нужно проверить выбранное юридическое лицо." },
  "9:38": { necessity: "conditional", activation: "triggered", condition: "Выбранный subcontractor требует fresh integrity screening." },
  "11:30": { necessity: "conditional", activation: "standby", condition: "Material ambiguity требует official buyer question.", role: "Clarification exception", action: "Не запускается: material conflict не найден.", input: "Ambiguity review", output: "No-question gate decision", handoff: "E12" },
  "17:13": { necessity: "conditional", activation: "triggered", condition: "Buyer направил официальный request." },
  "17:17": { necessity: "conditional", activation: "triggered", condition: "Request содержит response deadline." },
  "17:4": { necessity: "conditional", activation: "triggered", condition: "Request получен и должен быть source-locked." },
  "18:59": { necessity: "conditional", activation: "triggered", condition: "E17 official clarification request." },
  "18:3": { necessity: "conditional", activation: "triggered", condition: "Ответ требует source-linked evidence." },
  "18:57": { necessity: "conditional", activation: "triggered", condition: "Ответ не должен создавать new obligation." },
  "18:2": { necessity: "conditional", activation: "triggered", condition: "Официальный ответ требует human authority." },
  "18:17": { necessity: "conditional", activation: "triggered", condition: "Контролируется official due date." },
  "18:4": { necessity: "conditional", activation: "triggered", condition: "Submitted response требует отдельной immutable version." },
  "24:19": { ...confirmed, role: "Persistent award dataset update", action: "Принимает verified award/contract outcome в P03 после закрытия Case.", input: "E23 verified outcome package", output: "Updated tender→award→contract dataset", handoff: "Будущие E02/PB01 reads" },
};

for (const event of case1EventBlueprints) {
  for (const agentId of [...event.agentIds, ...(event.standbyAgentIds ?? [])]) agentName(agentId);
}
if (case1EventBlueprints.length !== 24 || new Set(case1EventBlueprints.map((event) => event.step)).size !== 24) {
  throw new Error("Case 1 redesigned orchestration needs exactly 24 unique Events.");
}
if (case1Processes.some((process) => process.agentIds.some((id) => !agentById.has(id)))) {
  throw new Error("Every Case 1 background process must reference canonical Agent IDs.");
}
