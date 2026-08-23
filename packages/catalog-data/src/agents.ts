/**
 * Canonical TenderLab agent registry.
 *
 * UI pages, case validation, search, and future cross-application references
 * must import this module instead of defining parallel agent records.
 */

import { agentProfiles, type AgentProfile } from "./agent-profiles.ts";

export type Layer = {
  id: string;
  number: string;
  name: string;
  ru: string;
  mark: string;
  color: string;
};

export type AgentOutput = {
  primary: string;
  artifacts: string[];
  consumers: string;
};

export type PlatformSide = "command-center" | "client-side" | "backend";
export type PlatformFilter = "all" | PlatformSide | "shared";
type PlatformRationale = Partial<Record<PlatformSide, string>>;

export type Agent = {
  id: number;
  registryId: string;
  name: string;
  /** Historical display names retained for traceability and backwards-compatible search. */
  previousNames?: string[];
  description: string;
  layer: string;
  core?: boolean;
  output: AgentOutput;
  platformSides: PlatformSide[];
  platformRationale: PlatformRationale;
  profile: AgentProfile;
};

export const layers: Layer[] = [
  { id: "governance", number: "01", name: "Control", ru: "Управление", mark: "⌘", color: "#8b7cff" },
  { id: "company", number: "02", name: "Company", ru: "Профиль", mark: "◈", color: "#43d9b2" },
  { id: "universe", number: "03", name: "Universe", ru: "Рынок", mark: "◎", color: "#39a9ff" },
  { id: "documents", number: "04", name: "Documents", ru: "Требования", mark: "▤", color: "#f2be5c" },
  { id: "matching", number: "05", name: "Decision", ru: "Решение", mark: "◆", color: "#ff776f" },
  { id: "solution", number: "06", name: "Solution", ru: "Экосистема", mark: "⌁", color: "#c38cff" },
  { id: "bid", number: "07", name: "Bid", ru: "Заявка", mark: "✦", color: "#68d9ef" },
  { id: "learning", number: "08", name: "Learn", ru: "Результат", mark: "↻", color: "#9cdd67" },
];

const agentDefinitions: Omit<Agent, "registryId" | "platformSides" | "platformRationale" | "profile">[] = [
  { id: 1, name: "TenderLab Orchestrator", description: "Координирует ограниченные этапы, повторы, уверенность, доказательства и согласования.", layer: "governance", core: true, output: { primary: "Маршрут кейса и состояние выполнения", artifacts: ["Граф активации", "Правила повторов", "Пороги и согласования"], consumers: "Все активные агенты · Human Approval" } },
  { id: 2, name: "Human Approval Agent", description: "Передаёт критические решения ответственному человеку.", layer: "governance", output: { primary: "Протокол утверждённого решения", artifacts: ["Решение и условия", "Ответственный и timestamp", "Комментарии и исключения"], consumers: "Orchestrator · Следующий разрешённый этап" } },
  { id: 3, name: "Evidence & Provenance Agent", description: "Связывает выводы и оценки уверенности с проверяемыми источниками.", layer: "governance", output: { primary: "Пакет доказательств и происхождения", artifacts: ["Source citations", "Confidence levels", "Неподтверждённые пробелы"], consumers: "Scoring · Compliance · Human Approval" } },
  { id: 4, name: "Audit & Version Control Agent", description: "Фиксирует версии данных, документов и решений.", layer: "governance", output: { primary: "Неизменяемый журнал версий и действий", artifacts: ["Версии объектов", "Diff изменений", "История решений"], consumers: "Orchestrator · QA · Audit" } },
  { id: 5, name: "Tender Knowledge Graph Agent", description: "Связывает покупателей, поставщиков, тендеры, документы, присуждения и контракты.", layer: "governance", output: { primary: "Обновлённый граф тендерных знаний", artifacts: ["Entity nodes", "Проверенные связи", "Provenance metadata"], consumers: "Discovery · Matching · Tender Outcome Learning" } },

  { id: 6, name: "Company Profile Agent", description: "Создаёт структурированный профиль компании.", layer: "company", core: true, output: { primary: "Проверенный профиль компании", artifacts: ["Категории возможностей", "Мощности и география", "Ссылки на доказательства"], consumers: "Readiness · Discovery · Match Score" } },
  { id: 7, name: "Product & Capability Agent", description: "Нормализует продукты, услуги и мощности.", layer: "company", output: { primary: "Нормализованный каталог возможностей", artifacts: ["Product taxonomy", "Технические параметры", "Мощности и ограничения"], consumers: "Company Profile · Readiness · Match Score" } },
  { id: 8, name: "Company Verification Agent", description: "Проверяет компанию, производство и опыт.", layer: "company", output: { primary: "Верифицированное досье компании", artifacts: ["Legal identity", "Проверка производства", "Подтверждённые референсы"], consumers: "Company Profile · Eligibility · Match Score" } },
  { id: 9, name: "Tender Readiness Score Agent", description: "Оценивает общую готовность компании к тендерам.", layer: "company", core: true, output: { primary: "Карта тендерной готовности", artifacts: ["Оценка 0–100", "Блокирующие пробелы", "План улучшений"], consumers: "Discovery · Match Score · Human review" } },
  { id: 10, name: "Credential & Certificate Agent", description: "Управляет лицензиями, сертификатами и сроками.", layer: "company", output: { primary: "Реестр действующих credentials", artifacts: ["Сертификаты и лицензии", "Scope и покрытие", "Expiry alerts"], consumers: "Eligibility · Compliance Matrix · Submission" } },
  { id: 11, name: "Supplier Intelligence Agent", description: "Накапливает проверенные данные о поставщиках.", layer: "company", output: { primary: "Проверенный supplier intelligence dataset", artifacts: ["Supplier profiles", "История поставок", "Риски и performance"], consumers: "Solution Architecture · Cost · Learning" } },
  { id: 12, name: "Partner Capability Graph Agent", description: "Картирует партнёров и их возможности.", layer: "company", output: { primary: "Граф партнёров и компетенций", artifacts: ["Partner nodes", "Capability coverage", "Незакрытые gaps"], consumers: "Participation Route · Solution · JV" } },

  { id: 13, name: "Tender Source Acquisition Agent", previousNames: ["Tender Source Ingestion Agent"], description: "Собирает объявления, оригиналы, вложения и файлы из источников.", layer: "universe", output: { primary: "Нормализованный поток тендерных источников", artifacts: ["Notice objects", "Original attachments", "Source metadata"], consumers: "Tender Discovery · Document Intake" } },
  { id: 14, name: "Tender Discovery Agent", description: "Находит потенциально подходящие возможности.", layer: "universe", core: true, output: { primary: "Ранжированный shortlist тендеров", artifacts: ["Оценка релевантности", "Срок и источник", "Причины исключения"], consumers: "Document Intake · Match Score" } },
  { id: 15, name: "Tender Classification Agent", description: "Классифицирует отрасль, страну и процедуру.", layer: "universe", output: { primary: "Классификационная карточка тендера", artifacts: ["Sector и category", "Country и buyer type", "Procedure и procurement method"], consumers: "Filtering · Discovery · Market Intelligence" } },
  { id: 16, name: "Tender Filtering Agent", description: "Отсеивает явно нерелевантные возможности.", layer: "universe", output: { primary: "Отфильтрованный набор возможностей", artifacts: ["Pass / Reject flags", "Причины исключения", "Применённые thresholds"], consumers: "Tender Discovery · Alerts" } },
  { id: 17, name: "Tender Alert & Deadline Agent", description: "Следит за сроками, изменениями и уведомлениями.", layer: "universe", output: { primary: "Календарь дедлайнов и приоритетных alerts", artifacts: ["Контрольные даты", "Change alerts", "Owners и reminders"], consumers: "Orchestrator · Document Intake · Submission" } },
  { id: 18, name: "Market Intelligence Agent", description: "Анализирует рынки, спрос и тендерный поток.", layer: "universe", output: { primary: "Market intelligence brief", artifacts: ["Demand trends", "Price benchmarks", "Country opportunity map"], consumers: "Discovery · Bid Strategy · Outcome Learning" } },
  { id: 19, name: "Tender Award Intelligence Agent", description: "Связывает тендеры с присуждениями и контрактами, выявляя победителей и закономерности.", layer: "universe", output: { primary: "Связанный dataset тендеров и присуждений", artifacts: ["Award history", "Победители и цены", "Contract patterns"], consumers: "Buyer Intelligence · Scoring · Strategy" } },
  { id: 20, name: "Buyer & Competitor Intelligence Agent", description: "Профилирует заказчиков, конкурентов и лидеров.", layer: "universe", output: { primary: "Досье покупателя и конкурентная карта", artifacts: ["Procurement patterns", "Competitor shortlist", "Price and win bands"], consumers: "Match Score · Bid Strategy · Proposal" } },

  { id: 21, name: "Document Intake Agent", description: "Получает, индексирует и версионирует документы и вложения.", layer: "documents", output: { primary: "Версионированный корпус документов", artifacts: ["Манифест источников", "Хэши файлов", "Очередь OCR и перевода"], consumers: "Requirement Parser · Compliance Matrix" } },
  { id: 22, name: "Tender OCR & Translation Agent", previousNames: ["OCR & Language Agent"], description: "Распознаёт сканы, переводит через канонический английский и кэширует переводы.", layer: "documents", output: { primary: "Поисковый мультиязычный текстовый корпус", artifacts: ["OCR text", "Canonical English", "Translation cache"], consumers: "Tender Structure · Requirement Parser" } },
  { id: 23, name: "Tender Structure Agent", description: "Структурирует лоты, позиции, формы и приложения.", layer: "documents", output: { primary: "Структурная карта тендерного пакета", artifacts: ["Lots и BOQ tree", "Forms registry", "Annex relationships"], consumers: "Requirement Parser · Deliverables · Assembly" } },
  { id: 24, name: "Requirement Parser Agent", description: "Извлекает все требования и условия.", layer: "documents", core: true, output: { primary: "Структурированный реестр требований", artifacts: ["Критерии допуска", "Формы и поставки", "Правила оценки"], consumers: "Eligibility · Compliance Matrix · Solution" } },
  { id: 25, name: "Eligibility & Qualification Agent", description: "Определяет обязательные критерии допуска.", layer: "documents", output: { primary: "Решение о допуске и evidence pack", artifacts: ["Pass / Fail матрица", "Обязательные пробелы", "Документы квалификации"], consumers: "Bid / No-Bid · Compliance Matrix · Human Approval" } },
  { id: 26, name: "Evaluation Criteria Agent", description: "Извлекает баллы, веса и правила оценки.", layer: "documents", output: { primary: "Формальная модель оценки заявки", artifacts: ["Criteria и weights", "Scoring formulas", "Pass thresholds"], consumers: "Match Score · Bid / No-Bid · Proposal Strategy" } },
  { id: 27, name: "Deliverables & Forms Agent", description: "Находит все формы, справки и приложения.", layer: "documents", output: { primary: "Контрольный реестр форм и deliverables", artifacts: ["Required forms", "Owners и due dates", "Completion status"], consumers: "Compliance Matrix · Document Assembly" } },
  { id: 28, name: "Specification Fidelity Agent", previousNames: ["Strict-Spec Agent"], description: "Сохраняет спецификации без домыслов и подмен.", layer: "documents", output: { primary: "Source-locked набор спецификаций", artifacts: ["Exact clauses", "Units и tolerances", "Запреты на substitutions"], consumers: "Requirement Parser · Compliance · Proposal" } },
  { id: 29, name: "Amendment & Change Agent", description: "Сравнивает версии и показывает изменения.", layer: "documents", output: { primary: "Отчёт о влиянии поправок", artifacts: ["Redline изменений", "Затронутые требования", "Required actions"], consumers: "Orchestrator · Compliance · Proposal owners" } },
  { id: 30, name: "Pre-Bid Clarification Agent", previousNames: ["Ambiguity & Clarification Agent"], description: "Находит противоречия и готовит вопросы.", layer: "documents", output: { primary: "Реестр вопросов на clarification", artifacts: ["Противоречия", "Source citations", "Buyer-ready questions"], consumers: "Human Approval · Buyer · Compliance" } },

  { id: 31, name: "Company-to-Tender Match Score Agent", description: "Рассчитывает и объясняет персональный уровень соответствия.", layer: "matching", core: true, output: { primary: "Объяснимая оценка Company × Tender", artifacts: ["Взвешенный fit score", "Сильные стороны и gaps", "Evidence citations"], consumers: "Participation Solution-Fit · Bid / No-Bid" } },
  { id: 32, name: "Participation Solution-Fit Agent", previousNames: ["Solution-Based Matching Agent"], description: "Находит участие за пределами совпадения товаров.", layer: "matching", core: true, output: { primary: "Модель участия и карта solution-fit", artifacts: ["Direct / Partner / JV", "Покрытие решения", "Незакрытые компоненты"], consumers: "Bid / No-Bid · Solution Architecture" } },
  { id: 33, name: "Participation Route Agent", description: "Выбирает оптимальную роль компании в тендере.", layer: "matching", output: { primary: "Рекомендованная модель участия", artifacts: ["Prime / JV / Subcontractor", "Role rationale", "Partner requirements"], consumers: "Partner Discovery · Solution Architecture · Bid Decision" } },
  { id: 34, name: "Tender Gap Remediation Agent", previousNames: ["Gap Analysis Agent"], description: "Показывает недостающие ресурсы и компетенции.", layer: "matching", output: { primary: "План закрытия capability gaps", artifacts: ["Missing capabilities", "Evidence gaps", "Actions, owners и сроки"], consumers: "Readiness · Partner Discovery · Solution" } },
  { id: 35, name: "Bid / No-Bid Decision Agent", previousNames: ["TenderScore / Bid-No-Bid Agent"], description: "Оценивает возможность, вероятность победы и рекомендует Bid / No-Bid.", layer: "matching", core: true, output: { primary: "Рекомендация Bid / No-Bid", artifacts: ["Opportunity score", "Вероятность победы", "Risk / Return rationale"], consumers: "Human Approval · Solution Architecture · Proposal Strategy" } },
  { id: 36, name: "Pre-Bid Execution Feasibility Agent", previousNames: ["Capacity & Execution Agent"], description: "Проверяет реальную способность выполнить контракт.", layer: "matching", output: { primary: "Оценка выполнимости контракта", artifacts: ["Capacity load", "Delivery schedule", "Bottlenecks и mitigations"], consumers: "Bid / No-Bid · Solution · Logistics" } },
  { id: 37, name: "Commercial Attractiveness Agent", description: "Оценивает маржу, денежный поток и коммерческие сценарии.", layer: "matching", output: { primary: "Коммерческий business case", artifacts: ["Margin scenarios", "Cash-flow curve", "Go / No-Go thresholds"], consumers: "Bid / No-Bid · Pricing · Human Approval" } },
  { id: 38, name: "Risk & Integrity Agent", description: "Проверяет санкционные, страновые и регуляторные риски.", layer: "matching", output: { primary: "Реестр integrity и compliance рисков", artifacts: ["Sanctions screening", "Country and regulatory risks", "Mitigation plan"], consumers: "Bid / No-Bid · Human Approval · Legal Review" } },

  { id: 39, name: "Solution Architecture Agent", description: "Собирает полное решение под требования.", layer: "solution", output: { primary: "Архитектура тендерного решения", artifacts: ["Конфигурация продуктов", "Роли партнёров", "Модель поставки"], consumers: "Technical Compliance · Cost · Technical Proposal" } },
  { id: 40, name: "Partner Discovery Agent", description: "Находит партнёров для закрытия пробелов.", layer: "solution", core: true, output: { primary: "Ранжированный shortlist партнёров", artifacts: ["Candidate profiles", "Capability fit", "Evidence и contact path"], consumers: "JV Optimization · Solution Architecture" } },
  { id: 41, name: "JV & Consortium Optimization Agent", description: "Проектирует состав и роли консорциума.", layer: "solution", output: { primary: "Оптимизированная структура консорциума", artifacts: ["Member roles", "Workshare matrix", "Eligibility coverage"], consumers: "Solution Architecture · Proposal · Legal Review" } },
  { id: 42, name: "Local Service & Representation Agent", previousNames: ["Local Representation Agent"], description: "Ищет местных представителей и сервисных партнёров.", layer: "solution", output: { primary: "Shortlist местной сервисной сети", artifacts: ["Representatives", "Geographic coverage", "SLA capabilities"], consumers: "Solution Architecture · Execution & Logistics" } },
  { id: 43, name: "Supplier Discovery Agent", description: "Подбирает дополнительные товары и производителей.", layer: "solution", output: { primary: "Shortlist подходящих поставщиков", artifacts: ["Product and spec fit", "MOQ и lead time", "Initial price range"], consumers: "Supplier Verification · RFQ · Cost" } },
  { id: 44, name: "Supplier Verification Agent", description: "Проверяет поставщика, документы и возможности.", layer: "solution", output: { primary: "Supplier due-diligence dossier", artifacts: ["Legal verification", "Capacity and certificates", "Risk rating"], consumers: "RFQ · Cost · Solution Architecture" } },
  { id: 45, name: "RFQ Orchestrator Agent", description: "Создаёт и управляет запросами котировок.", layer: "solution", output: { primary: "RFQ-пакет и response tracker", artifacts: ["Technical RFQ", "Recipient list", "Deadlines and responses"], consumers: "Quotation Normalization · Cost" } },
  { id: 46, name: "Quotation Normalization Agent", description: "Приводит предложения к единому сравнению.", layer: "solution", output: { primary: "Сопоставимая таблица котировок", artifacts: ["Normalized unit cost", "Incoterms and lead time", "Deviations and exclusions"], consumers: "Cost & Landed-Price · Pricing" } },

  { id: 47, name: "Compliance Matrix Agent", description: "Связывает требования, ответы, доказательства и статус.", layer: "bid", core: true, output: { primary: "Трассируемая матрица соответствия", artifacts: ["Requirement → Response → Evidence", "Owner и статус", "Открытые gaps"], consumers: "Technical Compliance · Proposal · QA" } },
  { id: 48, name: "Technical Compliance Agent", description: "Проверяет решение по техническим требованиям.", layer: "bid", output: { primary: "Заключение о техническом соответствии", artifacts: ["Compliant / Deviation", "Доказательства эквивалентности", "Вопросы на clarification"], consumers: "Technical Proposal · QA · Human Approval" } },
  { id: 49, name: "Commercial Compliance Agent", description: "Проверяет цены, валюты и коммерческие условия.", layer: "bid", output: { primary: "Заключение о коммерческом соответствии", artifacts: ["Currency and tax checks", "Payment and bond terms", "Commercial deviations"], consumers: "Commercial Proposal · Legal Review · QA" } },
  { id: 50, name: "Cost & Landed-Price Agent", description: "Считает полную стоимость поставки и исполнения.", layer: "bid", output: { primary: "Модель полной стоимости поставки", artifacts: ["Unit и total costs", "Фрахт, пошлины, налоги", "Сценарные допущения"], consumers: "Pricing & BOQ · Commercial Proposal" } },
  { id: 51, name: "Pricing & BOQ Agent", description: "Формирует цену и проверяет ведомости объёмов.", layer: "bid", output: { primary: "Проверенная ценовая BOQ", artifacts: ["Line-item prices", "Валюты и налоги", "Margin summary"], consumers: "Commercial Proposal · QA · Submission" } },
  { id: 52, name: "Proposal Strategy Agent", description: "Определяет позиционирование, структуру, акценты и темы победы.", layer: "bid", core: true, output: { primary: "Стратегический бриф предложения", artifacts: ["Win themes", "Позиционирование", "План ответа"], consumers: "Technical Proposal · Commercial Proposal · QA" } },
  { id: 53, name: "Technical Proposal Agent", description: "Готовит техническое предложение и методологию.", layer: "bid", output: { primary: "Черновик технического предложения", artifacts: ["Методология", "План исполнения", "Evidence и annex links"], consumers: "Bid QA · Document Assembly" } },
  { id: 54, name: "Commercial Proposal Agent", description: "Готовит коммерческие формы и допущения.", layer: "bid", output: { primary: "Заполненное коммерческое предложение", artifacts: ["Price schedules", "Commercial terms", "Assumptions and exclusions"], consumers: "Bid QA · Document Assembly" } },
  { id: 55, name: "Bid Credentials & Experience Agent", previousNames: ["Credentials & Experience Agent"], description: "Подбирает опыт, резюме и подтверждения.", layer: "bid", output: { primary: "Evidence-backed credentials pack", artifacts: ["Relevant references", "CVs and experts", "Certificates mapped to requirements"], consumers: "Technical Proposal · Bid QA · Assembly" } },
  { id: 56, name: "Bid QA & Red Team Agent", description: "Ищет пропуски, слабые ответы и противоречия.", layer: "bid", output: { primary: "Red-team review и журнал исправлений", artifacts: ["Compliance defects", "Рейтинг рисков", "Утверждённые исправления"], consumers: "Proposal owners · Document Assembly · Human Approval" } },
  { id: 57, name: "Legal & Contract Review Agent", description: "Выявляет обязательства и договорные риски.", layer: "bid", output: { primary: "Contract risk memo и deviation schedule", artifacts: ["Risk clauses", "Liabilities and securities", "Proposed exceptions"], consumers: "Human Approval · Bid QA · Award-to-Contract" } },
  { id: 58, name: "Document Assembly & Submission Agent", description: "Собирает, проверяет и подаёт пакет.", layer: "bid", output: { primary: "Готовый к подаче тендерный пакет", artifacts: ["Подписанные формы", "File manifest", "Submission receipt"], consumers: "Buyer portal · Award-to-Contract · Audit" } },

  { id: 59, name: "Post-Bid Clarification Response Agent", previousNames: ["Clarification Response Agent"], description: "Готовит ответы на вопросы комиссии.", layer: "learning", output: { primary: "Buyer-ready clarification response package", artifacts: ["Approved answers", "Supporting evidence", "Submission version"], consumers: "Buyer portal · Audit · Proposal owners" } },
  { id: 60, name: "Presentation & Negotiation Agent", description: "Поддерживает презентации и переговоры.", layer: "learning", output: { primary: "Презентационный и negotiation pack", artifacts: ["Slide narrative", "Talking points", "Objection-response matrix"], consumers: "Bid team · Human negotiators · Buyer meeting" } },
  { id: 61, name: "Award-to-Contract Agent", previousNames: ["Award & Contract Agent"], description: "Сопровождает присуждение, гарантии и подписание.", layer: "learning", output: { primary: "Award-to-contract action plan", artifacts: ["Award notice review", "Bonds and securities", "Signing checklist"], consumers: "Legal Review · Execution · Contract Administration" } },
  { id: 62, name: "Execution & Logistics Agent", description: "Поддерживает производство, доставку и внедрение.", layer: "learning", output: { primary: "План и статус исполнения поставки", artifacts: ["Production schedule", "QC and logistics plan", "Installation milestones"], consumers: "Contract Administration · Tender Outcome Learning" } },
  { id: 63, name: "Payment & Contract Administration Agent", description: "Контролирует этапы, документы, платежи и изменения.", layer: "learning", output: { primary: "Реестр исполнения контракта и платежей", artifacts: ["Milestones and invoices", "Retention and guarantees", "Variation log"], consumers: "Finance · Audit · Tender Outcome Learning" } },
  { id: 64, name: "Tender Outcome Learning Agent", previousNames: ["Outcome Learning Agent"], description: "Возвращает результаты в систему знаний.", layer: "learning", core: true, output: { primary: "Запись outcome intelligence", artifacts: ["Award, score и feedback", "Коррекции моделей", "Обновления профиля и graph"], consumers: "Knowledge Graph · Discovery · Scoring models" } },
];

// Platform-side classification is based on responsibility, inputs, outputs and workflow exposure.
// Backend is intentionally exclusive: these agents process or orchestrate without direct user interaction.
const platformSidesByAgentId: Record<number, PlatformSide[]> = {
  1: ["backend"], 2: ["command-center", "client-side"], 3: ["backend"], 4: ["backend"], 5: ["backend"],
  6: ["command-center", "client-side"], 7: ["command-center", "client-side"], 8: ["command-center", "client-side"], 9: ["command-center", "client-side"], 10: ["client-side"],
  11: ["command-center"], 12: ["command-center"], 13: ["backend"], 14: ["command-center", "client-side"], 15: ["backend"],
  16: ["backend"], 17: ["client-side"], 18: ["command-center"], 19: ["command-center"], 20: ["command-center", "client-side"],
  21: ["backend"], 22: ["backend"], 23: ["backend"], 24: ["backend"], 25: ["command-center", "client-side"],
  26: ["backend"], 27: ["client-side"], 28: ["backend"], 29: ["command-center", "client-side"], 30: ["command-center", "client-side"],
  31: ["command-center", "client-side"], 32: ["command-center", "client-side"], 33: ["command-center", "client-side"], 34: ["command-center", "client-side"], 35: ["command-center", "client-side"],
  36: ["client-side"], 37: ["command-center", "client-side"], 38: ["command-center", "client-side"], 39: ["command-center", "client-side"], 40: ["command-center", "client-side"],
  41: ["command-center", "client-side"], 42: ["command-center", "client-side"], 43: ["command-center", "client-side"], 44: ["command-center", "client-side"], 45: ["command-center", "client-side"],
  46: ["command-center", "client-side"], 47: ["command-center", "client-side"], 48: ["command-center", "client-side"], 49: ["command-center", "client-side"], 50: ["command-center", "client-side"],
  51: ["command-center", "client-side"], 52: ["command-center", "client-side"], 53: ["command-center", "client-side"], 54: ["command-center", "client-side"], 55: ["command-center", "client-side"],
  56: ["command-center"], 57: ["command-center", "client-side"], 58: ["command-center", "client-side"], 59: ["command-center", "client-side"], 60: ["command-center", "client-side"],
  61: ["command-center", "client-side"], 62: ["client-side"], 63: ["client-side"], 64: ["backend"],
};

const platformRationaleByAgentId: Record<number, PlatformRationale> = {
  1: { backend: "В фоновом режиме строит маршрут кейса, запускает нужных агентов, повторы и approval gates; пользователю достаточно видеть состояние процесса." },
  2: {
    "command-center": "Консультанты фиксируют исключения, пороги риска и разрешение продолжить кейс, сохраняя ответственного и условия решения.",
    "client-side": "Уполномоченные сотрудники компании подтверждают участие, цену и обязательства, после чего решение открывает следующий этап заявки.",
  },
  3: { backend: "Автоматически прикрепляет источники, provenance и confidence к машинным выводам для Scoring, Compliance и approval без отдельной пользовательской операции." },
  4: { backend: "Незаметно версионирует данные, документы и решения, создавая diff и audit trail для восстановления, контроля качества и расследований." },
  5: { backend: "Поддерживает связи между тендерами, компаниями, документами, awards и contracts, чтобы Discovery, Matching и Learning получали общий контекст." },
  6: {
    "command-center": "Консультанты собирают и проверяют профиль из открытых источников, чтобы искать компании, оценивать их и готовить адресную работу.",
    "client-side": "Компания дополняет мощности, географию и доказательства; подтверждённый профиль повторно используется в readiness, matching и заявках.",
  },
  7: {
    "command-center": "Консультанты переводят разрозненный каталог компании в единую taxonomy для поиска тендеров и сопоставления требований.",
    "client-side": "Производитель подтверждает характеристики, мощности и ограничения, получая пригодный для тендеров каталог возможностей.",
  },
  8: {
    "command-center": "Консультанты проводят due diligence компании до рекомендации или контакта, проверяя юридическую сущность, производство и референсы.",
    "client-side": "Участник получает верифицированное досье, которое подтверждает его квалификацию и усиливает evidence для конкретной заявки.",
  },
  9: {
    "command-center": "Консультанты ранжируют компании по готовности и определяют, где требуются документы, обучение или сопровождение до продвижения тендера.",
    "client-side": "Компания видит score 0–100, блокирующие пробелы и конкретный план повышения общей тендерной готовности.",
  },
  10: { "client-side": "Команда компании ведёт собственные сертификаты, scope и сроки действия, получая предупреждения до qualification и submission." },
  11: { "command-center": "Консультанты накапливают независимые supplier profiles, историю поставок и риски для проектирования решений и проверки рыночных альтернатив." },
  12: { "command-center": "Консультанты картируют внешних партнёров и их компетенции, чтобы заранее закрывать capability gaps и формировать JV или consortium." },
  13: { backend: "Автоматические collectors получают notices, оригиналы, вложения и source metadata, формируя надёжный вход для Discovery и Document Intake." },
  14: {
    "command-center": "Консультанты находят и приоритизируют возможности для отраслевых кампаний, prospecting и последующей проверки подходящих компаний.",
    "client-side": "Компания получает персональный shortlist релевантных тендеров со сроком, источником, score и объяснением отбора.",
  },
  15: { backend: "Фоново присваивает sector, category, geography, buyer type и procedure, чтобы остальные агенты могли фильтровать и сравнивать тендеры." },
  16: { backend: "До показа пользователю применяет geography, category, budget и exclusion thresholds, удаляя явный шум из потока возможностей." },
  17: { "client-side": "Рабочая команда компании получает календарь контрольных дат, change alerts, owners и reminders, необходимые для своевременной подачи." },
  18: { "command-center": "Консультанты сравнивают спрос, страны, ценовые ориентиры и tender flow, чтобы выбирать рынки и направления коммерческой работы." },
  19: { "command-center": "Консультанты исследуют awards, победителей, цены и contract patterns для конкурентных выводов, scoring и стратегии следующих кампаний." },
  20: {
    "command-center": "Консультанты профилируют покупателя и конкурентное поле, чтобы адаптировать позиционирование, outreach и bid strategy.",
    "client-side": "Участник получает procurement patterns, competitor shortlist и ценовые диапазоны для более обоснованного предложения.",
  },
  21: { backend: "Получает, хэширует, индексирует и версионирует файлы до анализа, обеспечивая единый документный корпус без ручной сортировки." },
  22: { backend: "Распознаёт сканы, создаёт canonical English и кэш переводов, чтобы downstream-агенты работали с единым поисковым текстом." },
  23: { backend: "Разбирает пакет на lots, BOQ, forms и annex relationships, подготавливая структуру для Requirement Parser, Deliverables и Assembly." },
  24: { backend: "Машинно извлекает требования, условия, формы и правила оценки из корпуса; пользователи работают уже со структурированным реестром." },
  25: {
    "command-center": "Консультанты быстро проверяют обязательный допуск компании до продвижения возможности и фиксируют доказательства или критические gaps.",
    "client-side": "Компания получает Pass / Fail матрицу, список квалификационных документов и понятные действия для устранения препятствий.",
  },
  26: { backend: "Преобразует текстовые criteria, weights, formulas и thresholds в формальную модель, которую используют Match Score, Bid decision и Strategy." },
  27: { "client-side": "Bid team компании получает полный checklist форм, приложений, владельцев и сроков, чтобы ни один обязательный deliverable не потерялся." },
  28: { backend: "Сохраняет exact clauses, units, tolerances и запреты на substitutions, предотвращая домыслы в compliance и proposal generation." },
  29: {
    "command-center": "Консультанты отслеживают amendments по портфелю кейсов и сразу видят, какие оценки, документы и рекомендации нужно пересмотреть.",
    "client-side": "Команда заявки получает redline, затронутые требования и назначенные действия, чтобы обновить предложение до нового срока.",
  },
  30: {
    "command-center": "Консультанты выявляют противоречия, привязывают их к источникам и формируют корректные buyer-ready clarification questions.",
    "client-side": "Технические и коммерческие эксперты компании уточняют факты и утверждают вопросы, влияющие на цену, решение или обязательства.",
  },
  31: {
    "command-center": "Консультанты ранжируют пары Company × Tender для outreach и объясняют, какие сильные стороны или gaps определили score.",
    "client-side": "Компания видит персональный fit score с evidence, а не общий readiness, и понимает целесообразность именно этого тендера.",
  },
  32: {
    "command-center": "Консультанты находят нетривиальные пути участия и строят предложение даже при неполном прямом совпадении каталога.",
    "client-side": "Компания сравнивает Direct, Partner и JV модели, видя покрытие решения и ещё незакрытые компоненты.",
  },
  33: {
    "command-center": "Консультанты рекомендуют роль Prime, JV member или subcontractor и определяют, каких партнёров требуется привлечь.",
    "client-side": "Руководство компании оценивает контроль, workshare, риски и обязательства предлагаемой модели участия.",
  },
  34: {
    "command-center": "Консультанты диагностируют недостающие capabilities и evidence, превращая пробелы в план сопровождения, партнёрства или подготовки.",
    "client-side": "Компания получает список конкретных gaps с owners и сроками для readiness, solution design и заявки.",
  },
  35: {
    "command-center": "Консультанты приоритизируют кейсы и формируют доказательную рекомендацию Bid / No-Bid для клиента или внутренней кампании.",
    "client-side": "Руководство компании утверждает участие на основе opportunity score, win probability и сопоставления риска с отдачей.",
  },
  36: { "client-side": "Производство и логистика компании проверяют загрузку мощностей, график поставки и bottlenecks перед принятием контрактных обязательств." },
  37: {
    "command-center": "Консультанты сравнивают margin, cash-flow и сценарии, чтобы не продвигать коммерчески слабую возможность.",
    "client-side": "Финансовая команда компании проверяет внутренние допущения и согласует Go / No-Go thresholds для заявки.",
  },
  38: {
    "command-center": "Консультанты проверяют sanctions, country и integrity risks до кампании, рекомендации партнёра или допуска кейса дальше.",
    "client-side": "Legal и compliance функции компании получают risk register и mitigation plan для принятия формального решения.",
  },
  39: {
    "command-center": "Консультанты собирают products, suppliers и partners в целостную конфигурацию, полностью покрывающую требования тендера.",
    "client-side": "Техническая команда компании проверяет архитектуру решения, роли участников и реалистичность модели поставки.",
  },
  40: {
    "command-center": "Консультанты ищут и ранжируют партнёров для кампаний, JV и закрытия gaps конкретного tender solution.",
    "client-side": "Компания получает проверяемый shortlist и contact path для переговоров с кандидатами, подходящими по capability fit.",
  },
  41: {
    "command-center": "Консультанты проектируют состав consortium, workshare и eligibility coverage, сравнивая альтернативные конфигурации.",
    "client-side": "Компания утверждает собственную роль, объём работ, ответственность и зависимость от других участников consortium.",
  },
  42: {
    "command-center": "Консультанты находят местных представителей, монтажные и сервисные организации под географию и SLA тендера.",
    "client-side": "Компания выбирает локальную сеть для поставки, установки, гарантии и последующего обслуживания контракта.",
  },
  43: {
    "command-center": "Консультанты расширяют supply options и получают альтернативы по specification fit, MOQ, lead time и цене.",
    "client-side": "Procurement team компании выбирает дополнительные товары или производителей для комплектации полного решения.",
  },
  44: {
    "command-center": "Консультанты проводят due diligence рекомендованных поставщиков, чтобы не включать непроверенную мощность или сертификат в решение.",
    "client-side": "Компания опирается на legal, capacity и certificate checks при выборе источника и принятии supplier risk.",
  },
  45: {
    "command-center": "Консультанты выпускают единый technical RFQ, управляют recipients и сроками для независимой оценки стоимости решения.",
    "client-side": "Procurement team компании отслеживает запросы, ответы и просрочки, сохраняя контролируемый sourcing process.",
  },
  46: {
    "command-center": "Консультанты приводят vendor quotes к общей базе, чтобы честно сравнить unit cost, Incoterms, сроки и исключения.",
    "client-side": "Компания получает сопоставимую таблицу предложений для выбора поставщика и подтверждения cost assumptions.",
  },
  47: {
    "command-center": "Консультанты управляют сквозным покрытием требований, evidence, owners и открытыми gaps по всему bid workstream.",
    "client-side": "Каждый владелец ответа в компании видит свой статус и traceability от требования до финального доказательства.",
  },
  48: {
    "command-center": "Консультанты независимо проверяют technical response, equivalence evidence и deviations до включения в предложение.",
    "client-side": "Инженеры компании устраняют несоответствия и подтверждают, что предлагаемая конфигурация выполнима и корректна.",
  },
  49: {
    "command-center": "Консультанты проверяют валюту, налоги, payment terms, bonds и deviations против условий тендера.",
    "client-side": "Finance и commercial team компании подтверждают цены и принимают обязательства, влияющие на cash flow и риск.",
  },
  50: {
    "command-center": "Консультанты строят landed-cost scenarios с фрахтом, пошлинами и налогами для коммерческой оценки и pricing advice.",
    "client-side": "Компания вводит реальные закупочные и операционные затраты и утверждает полную стоимость исполнения.",
  },
  51: {
    "command-center": "Консультанты структурируют line-item pricing, проверяют BOQ completeness и выявляют арифметические или валютные ошибки.",
    "client-side": "Компания согласует итоговые цены, маржу, налоги и валюты перед включением BOQ в заявку.",
  },
  52: {
    "command-center": "Консультанты превращают buyer intelligence, scoring и differentiators в win themes, позиционирование и план ответа.",
    "client-side": "Руководство компании подтверждает обещания, конкурентные преимущества и акценты, которые заявка сможет доказать.",
  },
  53: {
    "command-center": "Консультанты формируют связный technical draft из requirements, strategy, solution architecture и evidence.",
    "client-side": "Технические эксперты компании проверяют методологию, план исполнения и обязательства до финализации текста.",
  },
  54: {
    "command-center": "Консультанты заполняют price schedules, commercial terms, assumptions и exclusions в требуемом формате.",
    "client-side": "Finance и sales функции компании утверждают коммерческие формы и подтверждают отсутствие несанкционированных допущений.",
  },
  55: {
    "command-center": "Консультанты подбирают наиболее релевантные references, CVs и certificates под каждый qualification criterion.",
    "client-side": "Компания предоставляет исходные записи, проверяет точность опыта и разрешает использование персональных и корпоративных evidence.",
  },
  56: { "command-center": "Независимая red-team функция консультантов выявляет слабые ответы, противоречия и compliance defects и управляет журналом исправлений до подачи." },
  57: {
    "command-center": "Консультанты выделяют risk clauses, liabilities, securities и negotiation exceptions и готовят decision memo.",
    "client-side": "Юристы и руководство компании решают, какие договорные риски принять, смягчить или вынести как deviation.",
  },
  58: {
    "command-center": "Консультанты собирают версии, проверяют manifest, форматы и portal readiness, предотвращая технически неполную подачу.",
    "client-side": "Уполномоченный представитель компании подписывает и подаёт пакет и получает официальный submission receipt.",
  },
  59: {
    "command-center": "Консультанты готовят согласованный ответ комиссии с source-linked evidence и контролируют версию отправки.",
    "client-side": "Subject owners компании подтверждают факты и утверждают новые технические, ценовые или контрактные обязательства.",
  },
  60: {
    "command-center": "Консультанты создают narrative, talking points и objection-response matrix и проводят подготовку команды к встрече.",
    "client-side": "Представители компании используют пакет на презентации и переговорах, сохраняя согласованную позицию и пределы уступок.",
  },
  61: {
    "command-center": "Консультанты переводят award notice в план действий по guarantees, securities, документам и contract signing.",
    "client-side": "Legal, finance и operations компании исполняют award conditions и принимают контракт в операционную работу.",
  },
  62: { "client-side": "Производство, QC, логистика и монтаж компании ведут реальный график исполнения, milestones и отклонения после award." },
  63: { "client-side": "Finance и contract administration компании контролируют invoices, retention, guarantees, variations и подтверждающие документы до оплаты." },
  64: { backend: "Автоматически возвращает award, score, buyer feedback и delivery outcome в knowledge graph и модели, улучшая будущие Discovery и Scoring." },
};

export const agents: Agent[] = agentDefinitions.map((agent) => ({
  ...agent,
  registryId: `agent:TL-A${String(agent.id).padStart(3, "0")}`,
  platformSides: platformSidesByAgentId[agent.id],
  platformRationale: platformRationaleByAgentId[agent.id],
  profile: agentProfiles[agent.id],
}));

export const agentSearchText = (agent: Agent) => [
  agent.name,
  ...(agent.previousNames ?? []),
  agent.description,
  agent.profile.simply,
  agent.profile.responsibilityScope,
  ...agent.profile.activities,
  ...agent.profile.exclusions,
  ...agent.profile.typicalInputs,
  agent.profile.keyDistinction,
  agent.output.primary,
  ...agent.output.artifacts,
].join(" ");

const missingPlatformClassifications = agents.filter((agent) => !agent.platformSides?.length);
const mixedBackendClassifications = agents.filter(
  (agent) => agent.platformSides.includes("backend") && agent.platformSides.length > 1,
);
const invalidPlatformRationales = agents.filter((agent) => {
  const rationaleSides = Object.keys(agent.platformRationale ?? {}) as PlatformSide[];
  return agent.platformSides.some((side) => !agent.platformRationale?.[side]?.trim()) ||
    rationaleSides.some((side) => !agent.platformSides.includes(side));
});
if (missingPlatformClassifications.length || mixedBackendClassifications.length || invalidPlatformRationales.length) {
  throw new Error("Every agent needs matching platform-side classifications and rationales; Backend must remain behind-the-scenes only.");
}

export const platformSideLabels: Record<PlatformSide, string> = {
  "command-center": "Command Center",
  "client-side": "Client Side",
  backend: "Backend",
};

export const platformFilterOptions: { id: PlatformFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "command-center", label: "Command Center" },
  { id: "client-side", label: "Client Side" },
  { id: "backend", label: "Backend" },
  { id: "shared", label: "Shared" },
];

export const matchesPlatformFilter = (agent: Agent, filter: PlatformFilter) => {
  if (filter === "all") return true;
  if (filter === "shared") return agent.platformSides.length > 1;
  return agent.platformSides.includes(filter);
};

export const platformFilterCounts = Object.fromEntries(
  platformFilterOptions.map(({ id }) => [id, agents.filter((agent) => matchesPlatformFilter(agent, id)).length]),
) as Record<PlatformFilter, number>;

type AgentExample = {
  company: string;
  item: string;
  result: string;
};

export const agentExamples: Record<number, AgentExample> = {
  1: { company: "OakLine Contract Furniture", item: "Комплект мебели для 180 гостиничных номеров", result: "Скоординированы 7 агентов, 520 позиций, один повтор по новым данным и 3 согласования с доказательствами." },
  2: { company: "ErgoForm Seating", item: "Рабочее кресло с синхромеханизмом и 4D-подлокотниками", result: "Предельная цена и пятилетняя гарантия переданы коммерческому директору на утверждение." },
  3: { company: "NordicPanel Works", item: "Корпусная мебель из MDF класса E0", result: "Каждое заявление и уровень уверенности связаны с протоколом эмиссии, паспортом панели и пунктом тендера." },
  4: { company: "SteelWood Systems", item: "Письменные столы с рамой из стали 1,5 мм", result: "Зафиксированы 6 версий чертежей каркаса, кабель-канала и порошкового покрытия." },
  5: { company: "CasaGrid Interiors", item: "Школьная мебель на 720 учебных мест", result: "Связаны заказчик, 26 моделей, поставщики, документы, присуждение, контракт и прошлые результаты." },
  6: { company: "MapleCraft Industries", item: "Модульные офисные столы с кабель-менеджментом", result: "Сформирован профиль фабрики: 38 моделей, станочный парк, мощности и экспортный опыт." },
  7: { company: "FlexiSeat Manufacturing", item: "Формованные кресла производительностью 2000 штук в месяц", result: "Нормализованы модели, виды пены, обивки, услуги сборки и доступная месячная мощность." },
  8: { company: "UrbanShelf Factory", item: "Стеллажи с нагрузкой 80 кг на полку", result: "Подтверждены статус производителя, линия гибки металла и четыре аналогичных контракта." },
  9: { company: "PrimeDesk Export", item: "Офисная мебель с FSC-сертифицированной древесиной", result: "Готовность оценена в 81%: отсутствуют местный установщик и шаблон банковской гарантии." },
  10: { company: "SafeFoam Furnishings", item: "Мягкая мебель с пеной стандарта BS 5852 Crib 5", result: "Обнаружено, что сертификат огнестойкости обивки истекает до даты поставки." },
  11: { company: "PanelLink Supply", item: "HPL 0,8 мм и кромка ABS 2 мм", result: "В базу добавлены 12 поставщиков антифингер-принт ламината, кромки и мебельного клея." },
  12: { company: "RoomSet Alliance", item: "Монтаж мебели в 400 гостиничных номерах за 30 дней", result: "Построена карта монтажников, дизайнеров, перевозчиков и сервисных партнёров по регионам." },
  13: { company: "TenderFurn Feed", item: "Международные закупки контрактной мебели", result: "Из 18 порталов собраны объявления, оригинальные notice-файлы, вложения и ссылки на источники." },
  14: { company: "EduChair Solutions", item: "Регулируемые парты для учеников 4–6 ростовой группы", result: "Найдено 13 закупок, из которых 4 соответствуют каталогу и производственным возможностям." },
  15: { company: "HabiLine Commercial", item: "Антибактериальные прикроватные тумбы", result: "Закупка отнесена к медицинской мебели, Центральной Азии и одноэтапной процедуре." },
  16: { company: "LoftWorks Reseller", item: "Диваны для общественных зон с износостойкой обивкой", result: "Из 92 объявлений оставлены 8 с подходящими материалами, объёмом и географией поставки." },
  17: { company: "SolidTop Furniture", item: "Столы для столовой с цельнолитой столешницей", result: "Зафиксированы четыре контрольные даты; образец отделки требуется отправить через 36 часов." },
  18: { company: "Workspace Insight", item: "Столы sit-stand с диапазоном высоты 650–1250 мм", result: "Определены три растущих рынка и средняя цена сопоставимых закупок эргономичной мебели." },
  19: { company: "DormBuild Modular", item: "Двухъярусные кровати для студенческого общежития", result: "Связаны объявления, присуждения и контракты; 61% победителей использовали местную сборку." },
  20: { company: "CivicSeat Trading", item: "Откидные кресла для актовых залов", result: "Определены действующий поставщик, диапазон цены и три конкурента с сертификатом EN 12727." },
  21: { company: "CleanCabinet Systems", item: "Лабораторные шкафы с химстойким покрытием", result: "Получены по исходным URL и связаны 34 файла: планы, ведомости, формы, поправки и отделки." },
  22: { company: "Polyglot Furnitech", item: "Столярные спецификации на трёх языках", result: "126 страниц распознаны, нормализованы на английском и переведены из кэша с сохранением терминов." },
  23: { company: "FurniLot Logistics", item: "Комплексная поставка офисной мебели", result: "Тендер разделён на 5 лотов, 126 позиций, 14 помещений и 11 обязательных форм." },
  24: { company: "BirchForm Projects", item: "Архивные шкафы с огнестойкостью 45 минут", result: "Извлечено 144 требования к габаритам, материалам, замкам, отделке, монтажу и гарантии." },
  25: { company: "CareBed Furniture", item: "Прикроватные шкафчики с выдвижным столиком", result: "Выявлены минимальный оборот, два медицинских референса и обязательная санитарная декларация." },
  26: { company: "AcousticPod Design", item: "Офисные акустические кабины со снижением шума 32 дБ", result: "Разложены 100 баллов: акустика 30, эргономика 20, опыт 20 и цена 30." },
  27: { company: "FormPack Contracts", item: "Модульные стеллажи для публичной библиотеки", result: "Составлен перечень из 24 форм, сертификатов материалов, образцов отделки и ценовых таблиц." },
  28: { company: "MeasureRight Kitchens", item: "Кухонные корпуса с HPL 0,8 мм и петлями soft-close", result: "Марки и толщины сохранены дословно; эквиваленты не добавлены без разрешения заказчика." },
  29: { company: "MetroBench Studio", item: "Уличные скамьи из термодревесины", result: "В поправке №2 найдены изменения длины, антикоррозийного покрытия и способа анкеровки." },
  30: { company: "TimberAir Kitchens", item: "Водный лак с VOC менее 60 г/л", result: "Обнаружено противоречие между ведомостью отделки и экологическим разделом; подготовлен вопрос." },
  31: { company: "ArcticOffice Furniture", item: "Рабочие станции и сетчатые кресла", result: "Соответствие 92% объяснено пятью преимуществами и тремя ограничениями с доказательствами." },
  32: { company: "ModularLiving Systems", item: "Мебель для модульного студенческого общежития", result: "Найдена возможность поставлять кровати, шкафы и столы через генерального модульного подрядчика." },
  33: { company: "HeritageFurn OEM", item: "Гостиничная корпусная мебель по дизайну заказчика", result: "Рекомендована роль OEM-производителя с дизайнером и местным установщиком в составе предложения." },
  34: { company: "CraftSpan Joinery", item: "Акустические стеновые панели с классом B-s1,d0", result: "Выявлены пробелы: пожарный протокол, монтажная система и один референс общественного здания." },
  35: { company: "NeoSchool Furniture", item: "Ученические столы и стулья EN 1729", result: "Выдано решение BID: прогноз победы 64%, ожидаемая маржа 16% и объяснение ключевых факторов." },
  36: { company: "MassSeat Production", item: "Штабелируемые стулья партией 12 000 штук", result: "Подтверждена способность изготовить партию, упаковать и отгрузить её за 90 дней." },
  37: { company: "PolyWood Tables", item: "Конференц-столы на 20 мест", result: "Сравнены базовый и стресс-сценарии: маржа 18,1%, кассовый разрыв 38 дней и оборотный капитал." },
  38: { company: "SecureStore Lockers", item: "Металлические шкафчики с RFID-замками", result: "Отмечены риски хранения данных, гарантий на электронику и подтверждения происхождения стали." },
  39: { company: "SmartOffice Fitout", item: "Рабочие места с электрификацией и акустическими экранами", result: "Собрано решение: столы, кресла, floor-box, перегородки, монтаж и обучение facility-команды." },
  40: { company: "InstallPro Interiors", item: "Сборка 900 рабочих мест с сервисом за 48 часов", result: "Найдены три местных партнёра, закрывающие доставку, монтаж, вывоз упаковки и гарантию." },
  41: { company: "GrandHotel Furnishing", item: "FF&E-пакет для гостиницы на 250 номеров", result: "Распределены роли производителя, поставщика матрасов, перевозчика, дизайнера и установщика." },
  42: { company: "LocalCare Furnishings", item: "Ремонт офисных кресел с выездом за 24 часа", result: "Подобраны два региональных сервисных партнёра с техниками и складом механизмов." },
  43: { company: "HingeHub Components", item: "Петли soft-close ресурсом 100 000 циклов", result: "Найдены 14 производителей; 5 соответствуют ресурсу, покрытию и сроку поставки." },
  44: { company: "FoamGuard Materials", item: "Мебельная пена плотностью 45 кг/м³ и CAL 117", result: "Проверены фабрика, плотность, огневой протокол, состав материала и экспортный опыт." },
  45: { company: "DeskTech Procurement", item: "Приводы sit-stand на 120 кг и шумом менее 50 дБ", result: "Разослан единый RFQ 9 поставщикам с 31 параметром и требованиями к образцам." },
  46: { company: "ChairBase Trading", item: "Алюминиевые пятилучевые базы и ролики BIFMA", result: "Сопоставлены 7 котировок: диаметр, нагрузка, покрытие, цена, MOQ и срок производства." },
  47: { company: "LabBench Furniture", item: "Лабораторные столы со столешницей из эпоксидной смолы", result: "Матрица связала 102 требования с ответами, протоколами химстойкости и ответственными." },
  48: { company: "ErgoMesh Seating", item: "Сетчатое кресло по ANSI/BIFMA X5.1", result: "Подтверждены 46 из 49 параметров; три отклонения переданы конструктору на проверку." },
  49: { company: "HomeStyle Distribution", item: "Комплект мебели для социальных квартир", result: "Проверены валюта, НДС, аванс, удержание, гарантия и этапы приёмки по помещениям." },
  50: { company: "FlatPack Export", item: "Разборные шкафы с упаковкой по ISTA 3A", result: "Рассчитана полная цена с фурнитурой, коробками, фрахтом, пошлиной и доставкой." },
  51: { company: "CivicTable Systems", item: "Столы переговорные в количестве 320 штук", result: "Заполнены 68 строк BOQ и выявлено расхождение в количестве розеточных модулей." },
  52: { company: "LibraryFlow Furniture", item: "Мебель для центральной городской библиотеки", result: "Выбрано позиционирование и темы победы: модульность, низкий VOC, навигация и быстрый монтаж." },
  53: { company: "CleanRoom Casework", item: "Шкафы из нержавеющей стали AISI 304", result: "Подготовлена методология производства, пассивации, монтажа, приёмки и гарантийного сервиса." },
  54: { company: "RetailDisplay Works", item: "Торговые стеллажи с порошковой окраской по RAL", result: "Собраны ценовые формы, варианты отделки, Incoterms, график платежей и допущения." },
  55: { company: "JoineryExperts Group", item: "Индивидуальные столярные изделия из натурального шпона", result: "Выбраны четыре релевантных проекта и резюме мастера с 18-летним опытом." },
  56: { company: "StadiumSeat Systems", item: "Стадионные кресла с UV-стабилизацией", result: "Красная команда нашла 12 слабых ответов и повысила прогнозную оценку на 10 баллов." },
  57: { company: "WoodCycle Furnishings", item: "Столы из переработанной древесины", result: "Выявлены неограниченная ответственность, требование chain-of-custody и штраф 0,5% в день." },
  58: { company: "BoardRoom Projects", item: "Комплект мебели для зала совета директоров", result: "Собраны 37 файлов, проверены подписи, образцы отделки и успешная загрузка на портал." },
  59: { company: "KinderSpace Furniture", item: "Детская мебель с кромкой R3 и покрытием EN 71-3", result: "Подготовлен ответ комиссии о безопасности углов, красок и крепления высоких шкафов." },
  60: { company: "LoungeLine Contract", item: "Лаунж-кресла с тканью 100 000 циклов Martindale", result: "Собраны образцы и сценарий переговоров по ткани, сроку изготовления и пятилетней гарантии." },
  61: { company: "HotelFit Furniture", item: "Кровати, изголовья и тумбы для 800 номеров", result: "Проверены уведомление о присуждении, гарантия исполнения и условия подписания договора." },
  62: { company: "ExportCrate Furnishings", item: "Разборные кровати с оптимизацией загрузки контейнера", result: "Спланированы производство, контроль качества, flat-pack упаковка, загрузка и монтаж на объекте." },
  63: { company: "CampusDesk Services", item: "Учебные столы с поэтапной поставкой по корпусам", result: "Контролируются 6 этапов, акты установки, удержание 10% и индексация древесных плит." },
  64: { company: "FurniLearn Analytics", item: "Результаты тендера на школьную мебель", result: "Цена победителя, замечания заказчика и оценка 93/100 добавлены в будущие рекомендации." },
};

export const layerById = Object.fromEntries(layers.map((layer) => [layer.id, layer])) as Record<string, Layer>;

export type AgentTier = "main" | "specialized" | "optional";
export type ArchitectureView = "flat" | "hierarchy" | "network" | "matrix";

const mainAgentIds = new Set([1, 6, 9, 14, 21, 24, 25, 31, 32, 35, 39, 47, 48, 50, 51, 52, 53, 56, 58, 64]);
const optionalAgentIds = new Set([11, 12, 18, 19, 20, 22, 28, 29, 30, 33, 40, 41, 42, 43, 44, 45, 46, 59, 60, 61, 62, 63]);

export const getAgentTier = (agentId: number): AgentTier => {
  if (mainAgentIds.has(agentId)) return "main";
  if (optionalAgentIds.has(agentId)) return "optional";
  return "specialized";
};

export const tierLabels: Record<AgentTier, string> = {
  main: "Main",
  specialized: "Specialized",
  optional: "Optional",
};

export const tierActivationLabels: Record<AgentTier, string> = {
  main: "Context routed",
  specialized: "Condition triggered",
  optional: "On demand",
};

const agentsMissingOutput = agents.filter((agent) => !agent.output).map((agent) => agent.id);

if (agentsMissingOutput.length > 0) {
  throw new Error(`Missing output metadata for agents: ${agentsMissingOutput.join(", ")}`);
}

// Explicit architecture relationships. A subagent can support several Main agents.
// Both Flat and Hierarchy views render the canonical `agents` registry above.
export const subagentParentIds: Record<number, number[]> = {
  2: [1, 35, 56, 58],
  3: [1, 9, 24, 31, 47, 56, 64],
  4: [1, 21, 58, 64],
  5: [1, 6, 14, 31, 64],
  7: [6, 9, 31, 32, 39, 48],
  8: [6, 9, 25, 31, 56],
  10: [9, 25, 47, 56, 58],
  11: [6, 32, 39, 50, 64],
  12: [6, 32, 39, 64],
  13: [14, 21],
  15: [14, 31],
  16: [14, 31],
  17: [14, 21, 58],
  18: [14, 35, 52, 64],
  19: [14, 35, 64],
  20: [14, 35, 52, 64],
  22: [21, 24, 53, 58],
  23: [21, 24, 47, 58],
  26: [24, 31, 35, 47, 52],
  27: [24, 47, 58],
  28: [24, 48, 56],
  29: [21, 24, 47, 56, 58],
  30: [24, 47, 53, 56],
  33: [31, 32, 35, 39],
  34: [9, 31, 32, 35, 39],
  36: [9, 25, 31, 35, 39],
  37: [31, 35, 50, 51, 52],
  38: [25, 35, 47, 56],
  40: [32, 39],
  41: [32, 39, 52],
  42: [32, 39, 50],
  43: [32, 39, 50],
  44: [25, 39, 47, 50],
  45: [39, 50, 51],
  46: [50, 51],
  49: [47, 50, 51, 56],
  54: [51, 52, 56, 58],
  55: [9, 25, 47, 52, 53, 56, 58],
  57: [25, 35, 47, 56, 58],
  59: [24, 53, 56, 64],
  60: [52, 53, 64],
  61: [58, 64],
  62: [39, 50, 64],
  63: [50, 64],
};

export const tenderLifecycle = [
  { number: "01", name: "Discover", text: "Найти и классифицировать релевантную возможность." },
  { number: "02", name: "Understand", text: "Преобразовать документы в требования и доказательства." },
  { number: "03", name: "Decide", text: "Сопоставить компанию, риски и коммерческую привлекательность." },
  { number: "04", name: "Prepare", text: "Собрать решение, цену, предложение и пакет подачи." },
  { number: "05", name: "Learn", text: "Сопроводить результат и вернуть знания в систему." },
];
