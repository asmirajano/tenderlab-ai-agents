export type EngagementStatus = "required" | "conditional" | "background" | "not-involved";
export type ConditionalActivation = "triggered" | "standby";

export type CaseStage = {
  id: string;
  number: string;
  title: string;
  description: string;
  handoff: string;
};

export type CaseAgentEngagement = {
  agentId: number;
  status: EngagementStatus;
  stageId: string;
  when: string;
  why: string;
  input?: string;
  output?: string;
  next?: string;
  condition?: string;
  activation?: ConditionalActivation;
  coveredBy?: string;
};

export type CaseChronologyEvent = {
  step: number;
  period: string;
  phase: string;
  title: string;
  initiator: string;
  narrative: string;
  agents: string[];
  result: string;
  next: string;
};

export const case1 = {
  id: "GE-MES-2026-017",
  name: "Международная поставка школьной мебели",
  company: "Anatolia Workspace A.Ş.",
  companyType: "Опытный производитель и экспортёр мебели",
  companyCountry: "Турция",
  organizer: "Министерство образования и науки Грузии",
  organizerCountry: "Грузия",
  funding: "Всемирный банк",
  tenderType: "Товары",
  procurementMethod: "Открытый международный тендер",
  subject: "Производство и поставка комплектов мебели для 180 государственных школ",
  lot: "1 тендер · 1 лот",
  budget: "$3,85 млн",
  quantity: "26 130 изделий",
  submissionWindow: "28 дней",
  deliveryWindow: "150 дней",
  situation: "Строгие спецификации, крупный объём, распределённая доставка и высокая ценовая конкуренция.",
  outcome: "DEMO: заявка признана соответствующей, контракт присуждён компании.",
} as const;

export const caseStages: CaseStage[] = [
  { id: "control", number: "00", title: "Сквозной контроль", description: "Маршрут, доказательства, версии и согласования сопровождают весь кейс.", handoff: "Управляемый контекст кейса и журнал доказательств" },
  { id: "discovery", number: "01", title: "Поиск возможности", description: "Закупка собирается, классифицируется, фильтруется и ставится на контроль.", handoff: "Приоритетная карточка тендера и календарь" },
  { id: "company", number: "02", title: "Компания и готовность", description: "Проверяются компания, каталог, мощности, опыт и документы готовности.", handoff: "Верифицированный профиль и готовность 84/100" },
  { id: "documents", number: "03", title: "Документы и требования", description: "Пакет структурируется до требований, форм, критериев и условий допуска.", handoff: "164 требования, 68 строк BOQ и решение о допуске" },
  { id: "matching", number: "04", title: "Соответствие и маршрут", description: "Профиль сопоставляется с тендером, определяются пробелы и модель участия.", handoff: "Match 88% и маршрут prime + local service" },
  { id: "decision", number: "05", title: "Решение Bid / No-Bid", description: "Сводятся выполнимость, экономика, риски и управленческое решение.", handoff: "Утверждённое BID с порогами цены и риска" },
  { id: "solution", number: "06", title: "Решение и партнёры", description: "Формируются продуктовая конфигурация, доставка, монтаж и локальный сервис.", handoff: "Архитектура решения и подтверждённая сервисная модель" },
  { id: "compliance", number: "07", title: "Комплаенс и цена", description: "Требования связываются с ответами, рассчитываются себестоимость и BOQ.", handoff: "164/164 и цена заявки $3,61 млн" },
  { id: "proposal", number: "08", title: "Предложение и подача", description: "Готовятся техническая и коммерческая части, QA и финальная подача.", handoff: "31 подписанный файл и квитанция портала" },
  { id: "evaluation", number: "09", title: "Оценка и уточнения", description: "Комиссия оценивает заявку; при запросе готовится доказательный ответ.", handoff: "Принятый ответ на clarification" },
  { id: "award", number: "10", title: "Присуждение и контракт", description: "Уведомление превращается в контролируемый план подписания.", handoff: "Подписанный контракт и план мобилизации" },
  { id: "delivery", number: "11", title: "Исполнение и обучение", description: "Производство, поставка, монтаж, платежи и результат возвращаются в систему.", handoff: "Закрытый контракт и обновлённые модели" },
];

export const legacyCase1Chronology: CaseChronologyEvent[] = [
  {
    step: 1,
    period: "День 0 · публикация",
    phase: "Источник",
    title: "Заказчик публикует международную закупку",
    initiator: "Министерство образования и науки Грузии",
    narrative: "На официальном портале заказчика и в канале Всемирного банка появляется notice GE-MES-2026-017. Опубликованы 27 файлов: Instructions to Bidders, условия контракта, технические спецификации, BOQ, формы, чертежи и график поставки. Срок подачи — через 28 дней; закупка содержит один лот на 26 130 изделий для 180 школ.",
    agents: ["Tender Source Acquisition Agent", "Tender Classification Agent", "Audit & Version Control Agent"],
    result: "Зафиксированы оригинальные URL, время публикации, 27 исходных файлов и первая версия tender package.",
    next: "Проверить, относится ли возможность к профилю мебельных производителей и стоит ли запускать более дорогой анализ.",
  },
  {
    step: 2,
    period: "День 0–1",
    phase: "Command Center",
    title: "TenderLab обнаруживает и первично фильтрует возможность",
    initiator: "TenderLab / Command Center",
    narrative: "Система классифицирует закупку как Goods / школьная мебель / open international / один лот. География, бюджет, категория и 150-дневный срок исполнения проходят фильтры. По шести историческим award notices формируется рыночный ориентир; высокая ценовая конкуренция активирует дополнительную проверку рынка и вероятных конкурентов.",
    agents: ["Tender Discovery Agent", "Tender Filtering Agent", "Market Intelligence Agent", "Tender Award Intelligence Agent", "Buyer & Competitor Intelligence Agent"],
    result: "Создана приоритетная карточка возможности с релевантностью 92%, календарём из шести контрольных дат и shortlist вероятных конкурентов.",
    next: "Предложить opportunity компании Anatolia Workspace A.Ş. и запросить согласие на tender-specific assessment.",
  },
  {
    step: 3,
    period: "День 1",
    phase: "Client Side",
    title: "Компания принимает возможность в работу",
    initiator: "Коммерческий директор Anatolia Workspace A.Ş.",
    narrative: "Компания получает краткую карточку тендера: заказчик, предмет, объём, бюджет, страны поставки, deadline и причины высокого relevance. Руководитель подтверждает интерес, назначает bid manager, технического руководителя, финансиста и юриста. На этом этапе компания ещё не принимает решение BID — она только разрешает углублённую проверку.",
    agents: ["TenderLab Orchestrator", "Human Approval Agent", "Tender Alert & Deadline Agent"],
    result: "Открыт управляемый Case 1, назначены ответственные и согласован календарь внутренней подготовки.",
    next: "Обновить профиль, проверить доказательства и определить общую готовность компании.",
  },
  {
    step: 4,
    period: "День 1–3",
    phase: "Компания",
    title: "Профиль и готовность компании подтверждаются",
    initiator: "Bid manager компании и TenderLab analyst",
    narrative: "Компания предоставляет регистрационные документы, каталог, производственный календарь, финансовые данные, сертификаты, четыре аналогичных контракта и completion certificates. Проверяются юридическая запись, фабрика, опыт и мощность 12 000 изделий в месяц. FSC, ISO 9001 и test reports связываются с владельцем и сроком действия.",
    agents: ["Company Profile Agent", "Product & Capability Agent", "Company Verification Agent", "Credential & Certificate Agent", "Evidence & Provenance Agent"],
    result: "Сформирован верифицированный профиль производителя и Tender Readiness 84/100; выявлены пробелы по bid security и локальному сервису.",
    next: "Не смешивая readiness с match, перейти к обработке конкретного tender package.",
  },
  {
    step: 5,
    period: "День 2–4",
    phase: "Документы",
    title: "Tender package превращается в рабочий корпус",
    initiator: "TenderLab / Backend",
    narrative: "Все 27 файлов загружаются из первичных источников, получают checksum, версию и индекс. Пакет раскладывается на один лот, 68 BOQ-позиций, 180 точек поставки и 27 обязательных форм. Основные документы цифровые и англоязычные, поэтому Tender OCR & Translation Agent не запускается; Amendment & Change Agent остаётся в резерве на случай addendum.",
    agents: ["Document Intake Agent", "Tender Structure Agent", "Audit & Version Control Agent", "Tender OCR & Translation Agent — резерв", "Amendment & Change Agent — резерв"],
    result: "Создан source-locked и версионированный корпус, в котором каждое требование можно связать с оригинальной страницей и clause.",
    next: "Извлечь требования, формы, критерии оценки и обязательные условия допуска.",
  },
  {
    step: 6,
    period: "День 3–5",
    phase: "Требования",
    title: "Формируется полная модель требований и оценки",
    initiator: "TenderLab document workflow",
    narrative: "Из инструкций, спецификаций, BOQ и contract conditions извлекаются 164 требования. Отдельно фиксируются pass/fail eligibility criteria, rated criteria, evaluated price rules, 27 форм, 68 технических спецификаций, 2% bid security, сроки, упаковка, маркировка, монтаж и гарантия. Материальных противоречий не найдено, поэтому формальный clarification question пока не создаётся.",
    agents: ["Requirement Parser Agent", "Eligibility & Qualification Agent", "Evaluation Criteria Agent", "Deliverables & Forms Agent", "Specification Fidelity Agent", "Pre-Bid Clarification Agent — резерв"],
    result: "Получены реестр 164 требований, evaluation model, deliverables register и предварительный conditional eligibility Pass.",
    next: "Сопоставить тендер с верифицированным профилем и определить закрываемые gaps.",
  },
  {
    step: 7,
    period: "День 4–6",
    phase: "Matching",
    title: "Компания сопоставляется именно с этим тендером",
    initiator: "TenderLab scoring workflow",
    narrative: "Профиль Anatolia сравнивается с каждым релевантным требованием. Производственные мощности, FSC, аналогичный опыт и 150-дневный срок дают сильное соответствие. Отдельно остаются два контролируемых gaps: банковское подтверждение bid security и проверенная local service line в Грузии. Readiness 84/100 не заменяется новым score: tender-specific Match рассчитывается отдельно.",
    agents: ["Company-to-Tender Match Score Agent", "Participation Solution-Fit Agent", "Tender Gap Remediation Agent", "Evidence & Provenance Agent"],
    result: "Match 88%, объяснение сильных и слабых факторов и план закрытия двух gaps с owners и сроками.",
    next: "Проверить выполнимость, экономику и риски до решения BID / NO-BID.",
  },
  {
    step: 8,
    period: "День 6",
    phase: "Решение",
    title: "Руководство принимает условное решение BID",
    initiator: "Tender committee компании",
    narrative: "TenderLab сводит capacity feasibility, market benchmark, preliminary landed cost, working-capital exposure, integrity checks и tender-specific Match. Сценарий показывает вероятность победы 61%, минимально допустимую маржу 13% и максимальный cash gap 42 дня. Решение не принимается автоматически: директор утверждает BID при условии закрытия bid security, локального сервиса, цены и red-team review.",
    agents: ["Bid / No-Bid Decision Agent", "Pre-Bid Execution Feasibility Agent", "Commercial Attractiveness Agent", "Risk & Integrity Agent", "Human Approval Agent"],
    result: "Подписан Bid / No-Bid protocol с четырьмя условиями продолжения и пределами риска.",
    next: "Зафиксировать форму участия и закрыть локальную сервисную модель.",
  },
  {
    step: 9,
    period: "День 6–9",
    phase: "Партнёр",
    title: "Подбирается локальный сервисный subcontractor",
    initiator: "TenderLab / Command Center по запросу компании",
    narrative: "Так как Anatolia сама производит весь lot, внешние product suppliers, RFQ и supplier quotation chain не нужны. Но tender требует монтаж и гарантийные выезды в Грузии. Local Service & Representation Agent формирует shortlist из трёх сервисных компаний; выбранный кандидат из Тбилиси проверяется по команде, географии, SLA и способности обслужить 180 школ.",
    agents: ["Local Service & Representation Agent", "Partner Capability Graph Agent", "Participation Route Agent", "Company Verification Agent"],
    result: "Утверждён маршрут Anatolia как prime bidder + грузинский service subcontractor; подтверждена карта монтажа и гарантийного покрытия.",
    next: "Встроить роли сторон в техническое решение, график и договорные документы.",
  },
  {
    step: 10,
    period: "День 7–12",
    phase: "Решение",
    title: "Проектируется производственно-логистическое решение",
    initiator: "Технический директор Anatolia",
    narrative: "68 BOQ-позиций группируются в четыре продуктовые семьи. Производство и поставка планируются шестью волнами, чтобы 26 130 изделий были изготовлены, проверены, упакованы, доставлены и установлены за 150 дней. Для каждой школы определяются site quantities, last-mile window, монтажная команда, acceptance и warranty handover.",
    agents: ["Solution Architecture Agent", "Pre-Bid Execution Feasibility Agent", "Execution & Logistics Agent", "Product & Capability Agent"],
    result: "Архитектура решения, capacity plan, шесть волн поставки и распределение ответственности между производителем и local service partner.",
    next: "Доказать техническое соответствие и связать каждое решение с evidence.",
  },
  {
    step: 11,
    period: "День 9–15",
    phase: "Официальные вопросы",
    title: "Команда проверяет необходимость clarification до установленного срока",
    initiator: "Bid manager и TenderLab analyst",
    narrative: "Команда сопоставляет BOQ, чертежи, размеры и contract clauses до крайней даты вопросов заказчику. Блокирующих конфликтов не обнаружено, поэтому вопрос не направляется искусственно. Tender Alert & Deadline Agent фиксирует прохождение clarification milestone; Amendment & Change Agent продолжает отслеживать портал, но addendum в Case 1 не публикуется.",
    agents: ["Tender Alert & Deadline Agent", "Pre-Bid Clarification Agent — резерв", "Amendment & Change Agent — резерв"],
    result: "В журнале записано: formal clarification до подачи не требуется; исходная версия tender package остаётся действующей.",
    next: "Продолжить compliance, pricing и proposal preparation на зафиксированной версии документов.",
  },
  {
    step: 12,
    period: "День 10–17",
    phase: "Compliance",
    title: "Закрываются технические и коммерческие требования",
    initiator: "Technical lead, finance lead и TenderLab",
    narrative: "Compliance Matrix связывает 164 требования с ответом, owner и доказательством. Семь конструктивных деталей корректируются под размеры, материалы, durability и emission limits. Финансист получает подтверждение 2% bid security. FSC, ISO, test reports, reference contracts и completion certificates собираются в qualification evidence pack.",
    agents: ["Compliance Matrix Agent", "Technical Compliance Agent", "Commercial Compliance Agent", "Bid Credentials & Experience Agent", "Evidence & Provenance Agent"],
    result: "Техническое соответствие 164/164, Commercial Compliance Pass и traceable evidence package без незакрытых mandatory gaps.",
    next: "Рассчитать полную цену одного лота и проверить её против business case.",
  },
  {
    step: 13,
    period: "День 11–18",
    phase: "Цена",
    title: "Формируется landed cost и окончательная BOQ",
    initiator: "Финансовая команда Anatolia",
    narrative: "В модель включаются производство, упаковка, фрахт, пошлины, last mile, монтаж, гарантийные обязательства и risk reserve 4,2%. Внутренние калькуляции используются вместо RFQ внешним производителям, потому что весь lot производится Anatolia. Цена каждой из 68 BOQ-позиций проверяется на арифметику, налоги, валюту и согласованность с коммерческими формами.",
    agents: ["Cost & Landed-Price Agent", "Pricing & BOQ Agent", "Commercial Attractiveness Agent", "Commercial Compliance Agent"],
    result: "Landed cost $3,14 млн и окончательная цена заявки $3,61 млн при марже 13% против бюджета $3,85 млн.",
    next: "Получить Human Approval цены и использовать утверждённую BOQ во всех proposal documents.",
  },
  {
    step: 14,
    period: "День 14–21",
    phase: "Proposal",
    title: "Готовятся техническая и коммерческая части заявки",
    initiator: "Bid manager компании",
    narrative: "Proposal Strategy связывает критерии оценки с четырьмя темами: долговечность, быстрый rollout, low-emission materials и local service. На этой основе создаются 42-страничное техническое предложение, методология производства и монтажа, график, qualification pack, заполненная BOQ и commercial schedules. Ни один будущий award result в документы не подмешивается.",
    agents: ["Proposal Strategy Agent", "Technical Proposal Agent", "Commercial Proposal Agent", "Bid Credentials & Experience Agent"],
    result: "Получен полный первый draft заявки, связанный с evaluation criteria, compliance matrix и утверждённой ценой.",
    next: "Провести независимый red-team review, legal review и финальные согласования.",
  },
  {
    step: 15,
    period: "День 21–25",
    phase: "QA и approval",
    title: "Заявка проходит red team, юридическую проверку и утверждение",
    initiator: "Независимый reviewer и руководство компании",
    narrative: "Red team находит шесть замечаний: слабое доказательство по двум требованиям, несогласованное название модели, расхождение в графике, неполную ссылку на test report и подпись в одной форме. Все шесть исправляются. Юрист анализирует liability, penalties, guarantees и draft contract. Руководители отдельно утверждают финальную цену, риски и submission package.",
    agents: ["Bid QA & Red Team Agent", "Legal & Contract Review Agent", "Human Approval Agent", "Audit & Version Control Agent"],
    result: "Red-team log закрыт, 164/164 требований подтверждены, contract risk memo принят, финальная версия заявки заблокирована от несогласованных изменений.",
    next: "Собрать подписанные файлы, проверить manifest и подать заявку до deadline.",
  },
  {
    step: 16,
    period: "День 27 · за 18 часов до срока",
    phase: "Submission",
    title: "Компания подаёт электронную заявку",
    initiator: "Уполномоченный представитель Anatolia",
    narrative: "Document Assembly & Submission Agent проверяет наличие всех 27 форм, технической части, BOQ, bid security, доверенности, подписей и допустимых форматов. На портал загружается 31 подписанный файл. После загрузки сверяются filenames, checksums и состав manifest; квитанция портала сохраняется в case record.",
    agents: ["Document Assembly & Submission Agent", "Tender Alert & Deadline Agent", "Audit & Version Control Agent", "Human Approval Agent"],
    result: "Submission receipt подтверждает своевременную подачу; зафиксирована точная версия 31 файла, которую получил заказчик.",
    next: "Заморозить submitted package и ожидать только официальные сообщения evaluation committee.",
  },
  {
    step: 17,
    period: "День 35–42",
    phase: "Evaluation",
    title: "Комиссия оценивает заявку и направляет clarification",
    initiator: "Evaluation committee заказчика",
    narrative: "Во время проверки комиссия письменно просит подтвердить показатели эмиссии материалов и реалистичность графика монтажа. TenderLab не меняет исходную заявку и не добавляет новые коммерческие условия. Ответ строится только на submitted bid, test reports и утверждённом schedule, проходит юридическое и человеческое согласование и подаётся в установленный срок.",
    agents: ["Post-Bid Clarification Response Agent", "Evidence & Provenance Agent", "Legal & Contract Review Agent", "Human Approval Agent"],
    result: "Подан source-linked clarification package; комиссия принимает разъяснение без изменения цены $3,61 млн.",
    next: "Ожидать завершения технической и коммерческой оценки и официального notice.",
  },
  {
    step: 18,
    period: "День 56–66",
    phase: "Intention to Award",
    title: "Заказчик сообщает о намерении присудить контракт",
    initiator: "Министерство образования и науки Грузии",
    narrative: "После оценки заказчик направляет Notification of Intention to Award и начинает предусмотренный процедурой standstill period. Anatolia проверяет evaluated price, условия award и отсутствие новых обязательств. TenderLab фиксирует notice и срок возможных complaints; в DEMO-сценарии жалобы, меняющей результат, не поступает.",
    agents: ["Award-to-Contract Agent", "Tender Alert & Deadline Agent", "Legal & Contract Review Agent", "Human Approval Agent"],
    result: "Award conditions приняты руководством; подготовлены performance security, signing checklist и план мобилизации.",
    next: "После завершения standstill перейти к formal award и подписанию контракта.",
  },
  {
    step: 19,
    period: "День 67–69",
    phase: "Contract",
    title: "Стороны подписывают контракт и открывают мобилизацию",
    initiator: "Заказчик и Anatolia Workspace A.Ş.",
    narrative: "Компания предоставляет performance security и документы, требуемые перед подписанием. Юрист сверяет финальный contract с submitted bid и approved deviations. После подписания создаются baseline schedule, milestone register, site delivery sequence и порядок acceptance. Local service subcontractor получает утверждённый объём монтажа и warranty support.",
    agents: ["Award-to-Contract Agent", "Legal & Contract Review Agent", "Execution & Logistics Agent", "Payment & Contract Administration Agent"],
    result: "Подписанный контракт, мобилизационный пакет, шесть milestones и контролируемая contract baseline.",
    next: "Запустить производство и отслеживать исполнение без смешения tender stage с contract delivery.",
  },
  {
    step: 20,
    period: "День 70–219",
    phase: "Post-award",
    title: "Контракт исполняется и результат возвращается в систему",
    initiator: "Project manager Anatolia и заказчик",
    narrative: "Производство, factory QC, упаковка, шесть волн международной доставки, last mile, монтаж и acceptance отслеживаются по 180 школам. Invoices выпускаются только после подтверждённых milestones; guarantees, retention и variations ведутся отдельно. После закрытия поставки фактическая цена, сроки, buyer feedback и причины победы добавляются в knowledge graph и будущие scoring models.",
    agents: ["Execution & Logistics Agent", "Payment & Contract Administration Agent", "Tender Outcome Learning Agent", "Tender Knowledge Graph Agent", "Audit & Version Control Agent"],
    result: "DEMO: 26 130 изделий поставлены и приняты; контракт закрыт, outcome record и модели TenderLab обновлены фактическими данными.",
    next: "Передать Case 1 на экспертный разбор реалистичности до разработки Case 2.",
  },
];

// Canonical Case 1 Event model. The legacy chronology above remains exported only as
// review evidence; all active UI, graph and audits consume the redesigned model.
export { case1Chronology } from "./case-1-orchestration.ts";

export const case1Engagements: CaseAgentEngagement[] = [
  { agentId: 1, status: "required", stageId: "control", when: "От регистрации возможности до закрытия контракта", why: "Нужен единый условный маршрут вместо запуска всех 64 агентов.", input: "Карточка компании, тендер GE-MES-2026-017 и правила контроля.", output: "Маршрут из 12 этапов, статусы 64 агентов, точки повторов и согласований.", next: "Все активированные агенты и Human Approval Agent." },
  { agentId: 2, status: "required", stageId: "decision", when: "На решении BID, утверждении цены, подаче и принятии award conditions", why: "Критические коммерческие и договорные решения нельзя принимать без ответственного человека.", input: "Scorecard, риск-регистр, цена $3,61 млн и финальный пакет.", output: "Четыре протокола решения с ответственными, условиями и временем утверждения.", next: "TenderLab Orchestrator, Pricing & BOQ Agent, Document Assembly & Submission Agent и Award-to-Contract Agent." },
  { agentId: 3, status: "required", stageId: "control", when: "При каждом выводе о компании, требовании, score и соответствии", why: "Международная заявка должна связывать утверждения с проверяемыми источниками.", input: "27 исходных документов, профиль компании, сертификаты и протоколы испытаний.", output: "Evidence ledger для 164 требований, scorecards и управленческих решений.", next: "Eligibility, Scoring, Compliance, Bid QA и Human Approval." },
  { agentId: 4, status: "required", stageId: "control", when: "При каждом изменении документов, данных или решения", why: "Нужна воспроизводимая история актуальной версии заявки.", input: "Версии тендерных файлов, профиля, BOQ, предложения и approvals.", output: "Журнал версий, redline и неизменяемая история подачи.", next: "TenderLab Orchestrator, Bid QA, Submission и аудит контракта." },
  { agentId: 5, status: "required", stageId: "control", when: "При создании и обновлении сущностей кейса", why: "Компания, заказчик, тендер, документы, школы, award и контракт должны оставаться связанными.", input: "Проверенные сущности и provenance от активных агентов.", output: "Граф Case 1: компания → тендер → 180 школ → документы → award → контракт.", next: "Discovery, Matching и Outcome Learning." },

  { agentId: 6, status: "required", stageId: "company", when: "До оценки готовности и соответствия", why: "Без структурированного профиля невозможно доказать способность компании исполнить контракт.", input: "Регистрация, каталог, мощности, география, команда и референсы.", output: "Проверенный профиль Anatolia Workspace A.Ş. с мощностью 12 000 изделий в месяц.", next: "Tender Readiness Score Agent, Tender Discovery Agent и Company-to-Tender Match Score Agent." },
  { agentId: 7, status: "required", stageId: "company", when: "При нормализации каталога и производственных возможностей", why: "Нужно сопоставить конкретные виды школьной мебели, параметры и доступную мощность.", input: "Каталог, спецификации моделей, станочный парк и производственный календарь.", output: "Нормализованный каталог 68 BOQ-позиций и карта производственных ограничений.", next: "Company Profile, Readiness, Match Score и Solution Architecture." },
  { agentId: 8, status: "required", stageId: "company", when: "До допуска и tender-specific scoring", why: "Заявленный опыт и производство должны быть подтверждены, а не приняты со слов компании.", input: "Юридические данные, фабрика, четыре аналогичных контракта и акты завершения.", output: "Верифицированное досье производителя с подтверждёнными референсами.", next: "Company Profile, Eligibility и Match Score." },
  { agentId: 9, status: "required", stageId: "company", when: "После формирования профиля, до глубокой обработки заявки", why: "Общая готовность отделяется от соответствия конкретному тендеру.", input: "Профиль, команда, финансы, сертификаты, опыт и шаблоны документов.", output: "Готовность 84/100; пробелы — подтверждение гарантии и локального сервиса.", next: "Gap Analysis, Tender Discovery и Human Approval." },
  { agentId: 10, status: "required", stageId: "company", when: "При проверке допуска и подготовке evidence pack", why: "FSC, ISO 9001 и протоколы материалов должны действовать на дату подачи и поставки.", input: "Сертификаты, области действия, владельцы и даты истечения.", output: "Реестр действующих credentials с предупреждениями по срокам.", next: "Eligibility, Compliance Matrix, Credentials & Experience и Submission." },
  { agentId: 11, status: "not-involved", stageId: "solution", when: "Не запускается", why: "Компания производит предмет закупки сама; отдельная tender-specific база внешних поставщиков не нужна.", coveredBy: "Product & Capability Agent и Pre-Bid Execution Feasibility Agent подтверждают собственное производство." },
  { agentId: 12, status: "conditional", activation: "triggered", stageId: "solution", when: "После выявления требования локального монтажа и сервиса", why: "Нужно проверить, какую часть исполнения может закрыть грузинский сервисный партнёр.", condition: "Активирован: локальная сервисная линия является условием допуска.", input: "Профиль кандидата из Тбилиси, география, монтажная команда и SLA.", output: "Карта покрытия партнёра: доставка последней мили, монтаж, гарантийные выезды.", next: "Participation Route Agent и Solution Architecture Agent." },

  { agentId: 13, status: "required", stageId: "discovery", when: "При публикации notice и документов", why: "Нужны оригинальные источники, а не перепечатанная карточка закупки.", input: "Портал заказчика и публикация Всемирного банка.", output: "Нормализованный notice, 27 вложений, URL и source metadata.", next: "Tender Discovery Agent и Document Intake Agent." },
  { agentId: 14, status: "required", stageId: "discovery", when: "После первичного фильтра возможностей", why: "Нужно определить, стоит ли компаниям показывать именно эту возможность.", input: "Профиль компании и нормализованная карточка закупки.", output: "Приоритетная возможность с релевантностью 92% и объяснением факторов.", next: "Document Intake Agent и Company-to-Tender Match Score Agent." },
  { agentId: 15, status: "required", stageId: "discovery", when: "Сразу после получения notice", why: "Процедура и категория определяют дальнейший маршрут обработки.", input: "Notice, страна, заказчик, CPV/категория и условия процедуры.", output: "Классификация: товары · школьная мебель · Грузия · open international · один лот.", next: "Tender Filtering Agent и Tender Discovery Agent." },
  { agentId: 16, status: "required", stageId: "discovery", when: "До включения тендера в shortlist", why: "Система должна отсечь неподходящие географии, категории и масштабы до дорогого анализа.", input: "Классификация тендера и фильтры компании.", output: "Pass: категория, бюджет, география и сроки находятся в допустимом диапазоне.", next: "Tender Discovery Agent и Tender Alert & Deadline Agent." },
  { agentId: 17, status: "required", stageId: "discovery", when: "С момента shortlist до подачи", why: "28-дневное окно требует контроля гарантии, вопросов, документов и загрузки.", input: "Notice, тендерный календарь и ответственные компании.", output: "Календарь из 6 контрольных дат с owners и предупреждениями.", next: "TenderLab Orchestrator, Document Intake и Submission." },
  { agentId: 18, status: "conditional", activation: "triggered", stageId: "discovery", when: "Перед коммерческим решением", why: "Высокая ценовая конкуренция требует рыночного ориентира, но не блокирует допуск.", condition: "Активирован: конкурентная цена названа ключевой сложностью кейса.", input: "Поток сопоставимых мебельных закупок в Грузии и соседних рынках.", output: "Market brief с ценовыми диапазонами, спросом и логистическими факторами.", next: "Commercial Attractiveness Agent и Proposal Strategy Agent." },
  { agentId: 19, status: "background", stageId: "discovery", when: "Постоянный pipeline до Case и обновление после E23", why: "E02 не запускает Agent 19: он читает уже готовые award records P03; verified outcome текущего Case добавляется в pipeline только в E24.", input: "Official award notices, contract records и verified Case outcomes.", output: "Persistent tender→award→contract dataset с победителями, ценами и моделями исполнения.", next: "E02, PB01 Market/Competitor enrichment и будущие Case audits." },
  { agentId: 20, status: "conditional", activation: "triggered", stageId: "discovery", when: "До Bid / No-Bid и proposal strategy", why: "Нужно понимать закупочные предпочтения заказчика и вероятное конкурентное поле.", condition: "Активирован: ожидается высокая международная конкуренция.", input: "Buyer history, award dataset и открытые данные потенциальных участников.", output: "Досье заказчика и shortlist из пяти вероятных конкурентов с price bands.", next: "Match Score, Bid / No-Bid и Proposal Strategy." },

  { agentId: 21, status: "required", stageId: "documents", when: "После подтверждения релевантности", why: "Полный пакет должен быть получен, проиндексирован и зафиксирован по версиям.", input: "27 файлов из оригинальных URL.", output: "Версионированный корпус: условия, спецификации, BOQ, формы и чертежи.", next: "Tender Structure Agent, Requirement Parser Agent и Compliance Matrix Agent." },
  { agentId: 22, status: "conditional", activation: "standby", stageId: "documents", when: "Только при появлении сканов или грузиноязычного приложения", why: "Основной пакет цифровой и англоязычный; OCR и перевод сейчас не создают полезного результата.", condition: "Резерв: запускается для нечитаемого скана или документа без английской версии.", input: "Проблемный файл, если он появится.", output: "Поисковый OCR-текст и контролируемый перевод.", next: "Tender Structure Agent и Requirement Parser Agent." },
  { agentId: 23, status: "required", stageId: "documents", when: "После индексации пакета", why: "Даже один лот содержит BOQ, формы, приложения и 180 точек поставки.", input: "Версионированный корпус из 27 файлов.", output: "Структурная карта: 1 лот, 68 BOQ-позиций, 180 школ и 27 обязательных форм.", next: "Requirement Parser Agent, Deliverables & Forms Agent и Document Assembly." },
  { agentId: 24, status: "required", stageId: "documents", when: "После построения структуры пакета", why: "Все дальнейшие проверки зависят от полного реестра условий.", input: "Структурированные документы, BOQ, спецификации и формы.", output: "164 требования с source clause, типом, приоритетом и ответственным.", next: "Eligibility, Evaluation Criteria, Compliance Matrix и Solution Architecture." },
  { agentId: 25, status: "required", stageId: "documents", when: "До окончательного решения об участии", why: "Компания должна пройти обязательные критерии до затрат на полное предложение.", input: "164 требования, проверенный профиль и credentials.", output: "Условный Pass: требуется гарантия 2% и подтверждённая локальная сервисная линия.", next: "Gap Analysis, Bid / No-Bid, Compliance Matrix и Human Approval." },
  { agentId: 26, status: "required", stageId: "documents", when: "До match scoring и proposal strategy", why: "Нужно отделить pass/fail, rated criteria и evaluated price.", input: "Инструкции участникам и раздел оценки.", output: "Формальная модель оценки с критериями, весами, thresholds и правилами цены.", next: "Match Score, Bid / No-Bid и Proposal Strategy." },
  { agentId: 27, status: "required", stageId: "documents", when: "После извлечения требований", why: "Пропущенная форма может дисквалифицировать технически сильную заявку.", input: "Структурная карта и реестр требований.", output: "Реестр 27 форм и deliverables с owners, сроками и статусом.", next: "Compliance Matrix Agent и Document Assembly & Submission Agent." },
  { agentId: 28, status: "required", stageId: "documents", when: "При фиксации технической базы", why: "Строгие размеры, материалы и допуски нельзя заменять предположениями.", input: "Исходные спецификации, чертежи и BOQ.", output: "Source-locked набор 68 спецификаций с единицами, tolerances и запретами substitutions.", next: "Requirement Parser, Technical Compliance и Bid QA." },
  { agentId: 29, status: "conditional", activation: "standby", stageId: "documents", when: "После официальной поправки заказчика", why: "Без новой версии сравнивать нечего; агент остаётся в резерве.", condition: "Резерв: активируется при addendum или замене файла.", input: "Текущая и новая версии тендерного пакета.", output: "Redline и перечень затронутых требований, BOQ и действий.", next: "TenderLab Orchestrator, Compliance Matrix и proposal owners." },
  { agentId: 30, status: "conditional", activation: "standby", stageId: "documents", when: "При обнаружении материального противоречия", why: "В текущем пакете нет блокирующей неоднозначности; вопросы не следует создавать искусственно.", condition: "Резерв: активируется при конфликте BOQ, чертежа или спецификации.", input: "Конфликтующие clauses с provenance.", output: "Buyer-ready clarification question и оценка влияния.", next: "Human Approval, заказчик и Compliance Matrix." },

  { agentId: 31, status: "required", stageId: "matching", when: "После профиля и реестра требований", why: "Tender Readiness не отвечает, насколько компания подходит именно этому тендеру.", input: "Проверенный профиль, 164 требования, eligibility и evidence.", output: "Match 88%: сильны производство, FSC, опыт и срок; два контролируемых gaps.", next: "Participation Solution-Fit Agent и Bid / No-Bid Decision Agent." },
  { agentId: 32, status: "required", stageId: "matching", when: "После match score", why: "Участие включает не только мебель, но и доставку, монтаж и сервис по 180 школам.", input: "Match score, gaps и service requirements.", output: "Solution-fit: прямой поставщик из Турции + локальный subcontractor по монтажу и сервису.", next: "Participation Route Agent и Solution Architecture Agent." },
  { agentId: 33, status: "required", stageId: "matching", when: "До окончательного Bid / No-Bid", why: "Нужно формально выбрать роль компании и не превращать локального исполнителя в ненужный JV.", input: "Solution-fit и карта локального покрытия.", output: "Маршрут: Anatolia — prime bidder; грузинский партнёр — service subcontractor.", next: "Gap Analysis, Bid / No-Bid и Solution Architecture." },
  { agentId: 34, status: "required", stageId: "matching", when: "После readiness, eligibility и match scoring", why: "Два пробела должны иметь владельцев и срок закрытия до подачи.", input: "Readiness 84/100, conditional Pass и match 88%.", output: "План: банк подтверждает гарантию; local service partner проходит проверку до D-14.", next: "Human Approval, Participation Route и Solution Architecture." },

  { agentId: 35, status: "required", stageId: "decision", when: "После технического, коммерческого и риск-анализа", why: "Нужна объяснимая развилка BID / NO-BID, а не автоматическое продолжение.", input: "Readiness, match, eligibility, capacity, business case и риски.", output: "BID: вероятность победы 61%, минимальная маржа 13%, четыре условия контроля.", next: "Human Approval Agent, Solution Architecture Agent и Proposal Strategy Agent." },
  { agentId: 36, status: "required", stageId: "decision", when: "До BID и построения графика поставки", why: "26 130 изделий и 180 школ могут превысить реальную производственную и монтажную способность.", input: "Объёмы, мощность 12 000 изделий/месяц, сроки и логистические окна.", output: "Feasibility Pass: шесть волн производства и поставки за 150 дней, два buffer windows.", next: "Bid / No-Bid, Solution Architecture и Execution & Logistics." },
  { agentId: 37, status: "required", stageId: "decision", when: "До утверждения цены", why: "Соответствующая заявка не должна создавать неприемлемую маржу или кассовый разрыв.", input: "Budget $3,85 млн, cost model, платежные условия и working capital.", output: "Business case: цена $3,61 млн, маржа 13%, максимальный cash gap 42 дня.", next: "Bid / No-Bid, Pricing & BOQ и Human Approval." },
  { agentId: 38, status: "required", stageId: "decision", when: "Перед BID и contract acceptance", why: "Нужны санкционная, integrity, страновая и регуляторная проверки.", input: "Компания, заказчик, партнёр, страна, банк и договорные условия.", output: "Риск-регистр: sanctions clear; умеренные payment, logistics и local-subcontractor risks с mitigations.", next: "Bid / No-Bid, Human Approval и Legal & Contract Review." },

  { agentId: 39, status: "required", stageId: "solution", when: "После утверждения BID", why: "Нужно собрать единое изделие–логистика–монтаж–гарантия решение.", input: "164 требования, product catalog, capacity plan и partner route.", output: "Архитектура: 4 продуктовые семьи, 6 волн поставки, монтаж по 180 школам и пятилетний сервис.", next: "Technical Compliance, Cost & Landed-Price и Technical Proposal." },
  { agentId: 40, status: "not-involved", stageId: "solution", when: "Не запускается", why: "Нужен именно локальный сервисный представитель, поэтому широкий международный поиск партнёров дублировал бы более точный маршрут.", coveredBy: "Local Service & Representation Agent выполняет узкий поиск; Partner Capability Graph Agent проверяет найденного кандидата." },
  { agentId: 41, status: "not-involved", stageId: "solution", when: "Не запускается", why: "Компания соответствует как prime bidder; консорциум не требуется и усложнил бы qualification.", coveredBy: "Participation Route Agent фиксирует модель prime + service subcontractor без JV." },
  { agentId: 42, status: "conditional", activation: "triggered", stageId: "solution", when: "После выявления обязательного локального сервиса", why: "У компании нет собственной грузинской сервисной сети.", condition: "Активирован: service coverage является условием допуска.", input: "География 180 школ, SLA, монтажные объёмы и гарантийные требования.", output: "Shortlist из трёх грузинских сервисных компаний; выбран и подтверждён партнёр из Тбилиси.", next: "Partner Capability Graph Agent и Solution Architecture Agent." },
  { agentId: 43, status: "not-involved", stageId: "solution", when: "Не запускается", why: "Все товары одного лота входят в собственный каталог производителя.", coveredBy: "Product & Capability Agent подтверждает полное продуктовое покрытие." },
  { agentId: 44, status: "not-involved", stageId: "solution", when: "Не запускается", why: "Дополнительный внешний поставщик не выбран, поэтому supplier due diligence не имеет объекта.", coveredBy: "Company Verification Agent проверяет самого bidder; партнёр проверяется через partner route." },
  { agentId: 45, status: "not-involved", stageId: "solution", when: "Не запускается", why: "Заявка не зависит от tender-specific закупки товаров у внешних производителей.", coveredBy: "Cost model строится на подтверждённой внутренней себестоимости компании." },
  { agentId: 46, status: "not-involved", stageId: "solution", when: "Не запускается", why: "Нет нескольких внешних supplier quotations для нормализации.", coveredBy: "Cost & Landed-Price Agent использует внутренние калькуляции и подтверждённые логистические ставки." },

  { agentId: 47, status: "required", stageId: "compliance", when: "С начала подготовки ответа до финального QA", why: "Каждое из 164 требований должно иметь ответ, evidence, owner и статус.", input: "Реестр требований, solution architecture, формы и evidence ledger.", output: "Матрица 164 строк: 156 закрыты сразу, 8 закрыты до red team review.", next: "Technical Compliance, Proposal agents и Bid QA." },
  { agentId: 48, status: "required", stageId: "compliance", when: "После фиксации технического решения", why: "Мебель должна соответствовать размерам, материалам, безопасности и durability requirements.", input: "Source-locked specs, чертежи, test reports и compliance matrix.", output: "Техническое заключение 164/164 после семи корректировок конструкции и evidence.", next: "Technical Proposal Agent, Bid QA и Human Approval." },
  { agentId: 49, status: "required", stageId: "compliance", when: "До финализации commercial proposal", why: "Цена, налоги, валюта, гарантия и платежные условия должны отвечать инструкции.", input: "Commercial clauses, price model, bank guarantee и delivery terms.", output: "Commercial compliance Pass с подтверждёнными USD, taxes, 2% bid security и payment milestones.", next: "Commercial Proposal, Legal Review и Bid QA." },
  { agentId: 50, status: "required", stageId: "compliance", when: "После утверждения решения и маршрута поставки", why: "Нужна полная, а не только заводская себестоимость.", input: "Производство, упаковка, фрахт, пошлины, last mile, монтаж и risk reserve.", output: "Landed cost $3,14 млн, включая резерв риска 4,2%.", next: "Pricing & BOQ Agent и Commercial Proposal Agent." },
  { agentId: 51, status: "required", stageId: "compliance", when: "После cost model и утверждения margin threshold", why: "Каждая строка одного лота должна дать согласованную итоговую цену.", input: "68 BOQ-строк, landed cost, budget и минимальная маржа 13%.", output: "Проверенная BOQ и цена заявки $3,61 млн без арифметических расхождений.", next: "Commercial Proposal, Bid QA и Submission." },

  { agentId: 52, status: "required", stageId: "proposal", when: "После BID и до написания предложения", why: "Нужны доказательные темы победы, связанные с критериями оценки.", input: "Evaluation model, competitor brief, match strengths, solution и price position.", output: "Стратегический бриф: долговечность, быстрый rollout, low-emission materials и local service.", next: "Technical Proposal, Commercial Proposal и Bid QA." },
  { agentId: 53, status: "required", stageId: "proposal", when: "После strategy и technical compliance", why: "Заказчику нужен связный технический ответ, а не набор документов.", input: "Solution architecture, compliance matrix, график и evidence.", output: "42-страничное техническое предложение с методологией производства, доставки, монтажа и гарантии.", next: "Bid QA & Red Team Agent и Document Assembly & Submission Agent." },
  { agentId: 54, status: "required", stageId: "proposal", when: "После commercial compliance и pricing", why: "Коммерческие формы и допущения должны соответствовать утверждённой цене.", input: "BOQ $3,61 млн, taxes, Incoterms, payments и assumptions.", output: "Заполненное коммерческое предложение и price schedules без отклонений.", next: "Bid QA & Red Team Agent и Document Assembly & Submission Agent." },
  { agentId: 55, status: "required", stageId: "proposal", when: "При формировании qualification и technical evidence", why: "Опыт, команда и сертификаты должны быть выбраны под требования Case 1.", input: "Реестр credentials, четыре аналогичных проекта, CV и completion certificates.", output: "Credentials pack с четырьмя релевантными контрактами, CV и mapped certificates.", next: "Technical Proposal, Bid QA и Document Assembly." },
  { agentId: 56, status: "required", stageId: "proposal", when: "После сборки полного черновика", why: "Независимая проверка должна найти слабые ответы и несогласованности до подачи.", input: "Технический, коммерческий, qualification и legal package.", output: "Red-team log: шесть замечаний исправлены; 164/164 подтверждены.", next: "Proposal owners, Document Assembly и Human Approval." },
  { agentId: 57, status: "required", stageId: "proposal", when: "До submission approval и после award", why: "Штрафы, гарантии, liability и изменения договора требуют управленческого решения.", input: "Draft contract, commercial terms, risk register и proposed delivery model.", output: "Contract risk memo с пятью mitigations и утверждённым deviation schedule.", next: "Human Approval, Bid QA и Award-to-Contract Agent." },
  { agentId: 58, status: "required", stageId: "proposal", when: "После QA и approvals", why: "Финальный пакет должен быть подписан, проверен и подан без технических пропусков.", input: "Утверждённые техническая и коммерческая части, формы, гарантия и подписи.", output: "31 файл загружен за 18 часов до срока; manifest, checksums и receipt сохранены.", next: "Портал заказчика, Audit & Version Control и этап оценки." },

  { agentId: 59, status: "conditional", activation: "triggered", stageId: "evaluation", when: "После запроса комиссии на этапе оценки", why: "Ответ должен подтверждать факты и не создавать новых неутверждённых обязательств.", condition: "Активирован: комиссия запросила подтверждение эмиссии материалов и графика монтажа.", input: "Buyer question, submitted bid, test reports и approved schedule.", output: "Утверждённый clarification package с source-linked доказательствами.", next: "Портал заказчика, Audit & Version Control и evaluation record." },
  { agentId: 60, status: "not-involved", stageId: "evaluation", when: "Не запускается", why: "Открытая процедура товаров не предусматривает презентацию или переговоры до award.", coveredBy: "Post-Bid Clarification Response Agent отвечает только на формальный письменный запрос комиссии." },

  { agentId: 61, status: "required", stageId: "award", when: "После уведомления о присуждении", why: "Award создаёт обязательства по performance security, подписанию и мобилизации.", input: "Award notice, final bid, contract conditions и approval limits.", output: "Award-to-contract plan: performance guarantee, signing checklist и mobilization date.", next: "Legal & Contract Review, Execution & Logistics и Contract Administration." },
  { agentId: 62, status: "required", stageId: "delivery", when: "После подписания контракта", why: "Контракт охватывает производство, QC, шесть волн поставки и монтаж в 180 школах.", input: "Signed contract, solution architecture, capacity plan и site schedule.", output: "План исполнения и live status по производству, доставке, монтажу и warranty handover.", next: "Payment & Contract Administration Agent и Tender Outcome Learning Agent." },
  { agentId: 63, status: "required", stageId: "delivery", when: "На каждом milestone и изменении контракта", why: "Платежи зависят от документов поставки, установки, удержаний и гарантий.", input: "Milestones, acceptance certificates, invoices, retention и variations.", output: "Реестр исполнения: шесть milestones, invoices, guarantees, retention и variation log.", next: "Finance, Audit & Version Control и Outcome Learning." },
  { agentId: 64, status: "required", stageId: "delivery", when: "После award и закрытия исполнения", why: "Фактический результат должен улучшить следующие discovery и scoring решения.", input: "Award, evaluation feedback, цена, delivery performance и contract outcome.", output: "Outcome record: контракт выигран, оценка 91/100, факторы победы и corrections моделей.", next: "Tender Knowledge Graph, Discovery и scoring models." },
];

const ids = case1Engagements.map((engagement) => engagement.agentId);
if (ids.length !== 64 || new Set(ids).size !== 64 || ids.some((id) => id < 1 || id > 64)) {
  throw new Error("Case 1 needs exactly one engagement record for every canonical agent.");
}

const stageIds = new Set(caseStages.map((stage) => stage.id));
if (case1Engagements.some((engagement) => !stageIds.has(engagement.stageId))) {
  throw new Error("Every Case 1 engagement must reference a known workflow stage.");
}

if (case1Engagements.some((engagement) => engagement.status !== "not-involved" && (!engagement.input || !engagement.output || !engagement.next))) {
  throw new Error("Every involved Case 1 agent needs an input, output, and handoff.");
}
