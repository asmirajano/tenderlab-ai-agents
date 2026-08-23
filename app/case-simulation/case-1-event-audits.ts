import { agents } from "../../packages/catalog-data/src/agents";
import type {
  CaseAuditSummary,
  CaseEventAudit,
  EventAgentAuditDecision,
  EventAgentExecution,
} from "../process-model";
import { case1Chronology, case1Engagements } from "./case-1-data";

type ExecutionSpec = {
  eventStep: number;
  agentId: number;
  role: string;
  action: string;
  necessity?: EventAgentAuditDecision;
  condition?: string;
  activation?: "triggered" | "standby";
  input?: string;
  output?: string;
  handoff?: string;
  rationale?: string;
  absenceImpact?: string;
  overlapNote?: string;
  proposedEventStep?: number;
  provenance?: EventAgentExecution["provenance"];
  validationStatus?: EventAgentExecution["validationStatus"];
};

const agentById = new Map(agents.map((agent) => [agent.id, agent]));
const eventByStep = new Map(case1Chronology.map((event) => [event.step, event]));
const engagementByAgentId = new Map(case1Engagements.map((engagement) => [engagement.agentId, engagement]));

function execution(spec: ExecutionSpec): EventAgentExecution {
  const event = eventByStep.get(spec.eventStep);
  const agent = agentById.get(spec.agentId);
  const engagement = engagementByAgentId.get(spec.agentId);
  if (!event || !agent || !engagement) throw new Error(`Invalid Case 1 Event Audit execution E${spec.eventStep} / Agent ${spec.agentId}.`);

  const output = spec.output ?? engagement.output ?? agent.output.primary;
  const necessity = spec.necessity ?? "justified";
  return {
    eventStep: spec.eventStep,
    agentId: spec.agentId,
    role: spec.role,
    action: spec.action,
    input: spec.input ?? engagement.input ?? event.narrative,
    output,
    handoff: spec.handoff ?? engagement.next ?? event.next,
    evidence: [
      `CASE FACT E${String(event.step).padStart(2, "0")}: ${event.narrative}`,
      `CANONICAL ROLE ${String(agent.id).padStart(2, "0")}: ${agent.description} Expected deliverable — ${agent.output.primary}.`,
    ],
    necessity,
    condition: spec.condition,
    activation: spec.activation,
    necessityRationale: spec.rationale ?? engagement.why,
    absenceImpact: spec.absenceImpact ?? `Без этого исполнения Event E${String(event.step).padStart(2, "0")} не получит агентский deliverable «${output}»; общий результат события станет неполным или недоказуемым.`,
    overlapNote: spec.overlapNote,
    proposedEventStep: spec.proposedEventStep,
    provenance: spec.provenance ?? "case-observed",
    validationStatus: spec.validationStatus ?? "working",
  };
}

const specs: ExecutionSpec[] = [
  // E01 · source publication. This remains the reference audit.
  { eventStep: 1, agentId: 13, role: "Шлюз получения первичного источника", action: "Получает notice GE-MES-2026-017 и все 27 вложений из двух официальных каналов; формирует единый source manifest.", output: "Нормализованный notice object, 27 оригинальных файлов и source manifest с URL, каналом и временем получения.", handoff: "Agent 04 получает manifest для baseline; E02 получает нормализованный notice.", overlapNote: "Agent 13 получает и нормализует источник; он не классифицирует тендер и не управляет версиями." },
  { eventStep: 1, agentId: 4, role: "Фиксация исходной версии и audit trail", action: "Регистрирует получение пакета и сохраняет первую воспроизводимую версию tender package.", input: "Notice object, 27 файлов и source manifest от Agent 13.", output: "Audit entry публикации и baseline tender-package-v1 с source lineage.", handoff: "Baseline сопровождает корпус документов и последующий amendment monitoring.", overlapNote: "Agent 04 фиксирует lineage; Agent 13 получает источники, а Agent 21 строит рабочий корпус." },
  { eventStep: 1, agentId: 15, role: "Классификация полученной возможности", action: "Классифицирует уже полученный notice, поэтому не исполняет внешний Event публикации.", necessity: "misplaced", input: "Нормализованный notice от E01.", output: "Классификационная карточка Goods · школьная мебель · Грузия · open international · один лот.", handoff: "Перенесён в E02 как вход Filtering, Discovery и Market Intelligence.", rationale: "Capability нужна Case 1, но относится к первичной обработке после получения источника, а не к границе внешнего Event E01.", absenceImpact: "Из E01 ничего не исчезает; без переноса E02 останется без классификационного входа.", overlapNote: "Agent 13 получает источник; Agent 15 интерпретирует его.", proposedEventStep: 2, validationStatus: "confirmed" },

  // E02 · classify, filter, rank and benchmark.
  { eventStep: 2, agentId: 15, role: "Классификация opportunity", action: "Присваивает тип закупки, категорию, географию, процедуру и структуру лота до фильтрации.", input: "Нормализованный notice и source metadata из E01.", output: "Классификационная карточка Goods · школьная мебель · Грузия · open international · один лот.", handoff: "Agents 16, 14, 18 и 20 получают единые классификационные признаки." },
  { eventStep: 2, agentId: 16, role: "Дешёвый первичный фильтр", action: "Проверяет категорию, географию, бюджет, срок и процедуру по фильтрам компании до дорогого анализа." },
  { eventStep: 2, agentId: 14, role: "Ранжирование возможности", action: "Сопоставляет прошедший фильтры tender с профилем компании и объясняет relevance 92%." },
  { eventStep: 2, agentId: 17, role: "Формирование внешнего календаря", action: "Извлекает шесть официальных контрольных дат из notice и назначает первичные alerts.", input: "Notice, submission deadline и procurement schedule.", output: "Календарь шести внешних контрольных дат с первичными owners и reminders.", handoff: "E03 уточняет внутренних владельцев; E11 и E16 используют milestone alerts." },
  { eventStep: 2, agentId: 18, role: "Рыночный benchmark", action: "Строит ценовой и спросовый ориентир после сигнала о высокой конкуренции.", necessity: "conditional", condition: "Высокая ценовая конкуренция названа ключевой сложностью Case 1.", activation: "triggered" },
  { eventStep: 2, agentId: 19, role: "История сопоставимых awards", action: "Связывает шесть найденных award notices с победителями, ценами и моделями исполнения.", necessity: "conditional", condition: "Найдены шесть сопоставимых award notices с достаточными данными.", activation: "triggered" },
  { eventStep: 2, agentId: 20, role: "Buyer и competitor brief", action: "Профилирует заказчика и вероятных участников на базе открытых данных и award history.", necessity: "conditional", condition: "Ожидается высокая международная конкуренция.", activation: "triggered" },

  // E03 · accept the opportunity and open a governed Case.
  { eventStep: 3, agentId: 1, role: "Открытие управляемого Case", action: "Создаёт Case state, разрешённые ветви, контрольные точки и правила human approval после согласия компании.", output: "Управляемый Case 1 с маршрутом, owners, gates и audit context.", handoff: "E04 и E05 запускаются параллельно по разрешённым ветвям." },
  { eventStep: 3, agentId: 2, role: "Фиксация согласия компании", action: "Передаёт decision gate коммерческому директору и записывает разрешение на tender-specific assessment.", input: "Opportunity card 92% и запрос на углублённую проверку.", output: "Протокол: продолжить assessment; назначены bid manager, technical lead, finance и legal owners.", handoff: "Orchestrator открывает E04 и E05, но не подменяет будущее BID решение." },
  { eventStep: 3, agentId: 17, role: "Внутренний календарь подготовки", action: "Связывает внешние даты E02 с назначенными компанией владельцами и внутренними checkpoints.", output: "Согласованный календарь внутренней подготовки с owners.", handoff: "Orchestrator и ответственные получают reminders до E16." },

  // E04 · verify company and score readiness.
  { eventStep: 4, agentId: 6, role: "Структурирование профиля", action: "Собирает регистрационные, производственные, финансовые и reference-данные в канонический профиль Anatolia." },
  { eventStep: 4, agentId: 7, role: "Нормализация продуктов и мощности", action: "Нормализует каталог, производственные параметры и capacity 12 000 изделий в месяц." },
  { eventStep: 4, agentId: 8, role: "Проверка юридической и производственной реальности", action: "Проверяет legal identity, фабрику, четыре аналогичных контракта и completion certificates." },
  { eventStep: 4, agentId: 10, role: "Реестр credentials", action: "Проверяет владельца, scope и срок FSC, ISO 9001 и test reports." },
  { eventStep: 4, agentId: 3, role: "Provenance профиля", action: "Связывает ключевые утверждения профиля с регистрами, сертификатами и reference documents.", input: "Проверенные регистрационные, производственные и credential sources.", output: "Evidence ledger профиля с source citations и confidence.", handoff: "Agent 09 и E07 получают доказуемый профиль." },
  { eventStep: 4, agentId: 9, role: "Оценка общей готовности", action: "Рассчитывает Tender Readiness 84/100 отдельно от tender-specific Match.", input: "Структурированный и верифицированный профиль, credentials, опыт, команда и финансы.", output: "Readiness 84/100 и два readiness gaps: bid security confirmation и local service.", handoff: "E07 получает readiness baseline; E08 получает gaps как decision input." },

  // E05 · build the document corpus.
  { eventStep: 5, agentId: 21, role: "Индексирование tender package", action: "Получает 27 файлов из manifest, считает checksum, индексирует и формирует рабочий документный корпус." },
  { eventStep: 5, agentId: 23, role: "Структура пакета", action: "Выделяет один лот, 68 BOQ-позиций, 180 delivery points, 27 форм и связи приложений." },
  { eventStep: 5, agentId: 4, role: "Версионная фиксация корпуса", action: "Связывает checksum и индекс каждого файла с baseline tender-package-v1.", input: "Indexed corpus и checksum manifest от Agent 21.", output: "Версионный реестр corpus-v1 и audit trail обработки.", handoff: "E06 работает только с source-locked corpus-v1.", overlapNote: "Agent 21 управляет intake/index; Agent 04 — неизменяемым lineage и diff." },
  { eventStep: 5, agentId: 22, role: "OCR / translation exception", action: "Не запускается на цифровом англоязычном пакете; готов к обработке проблемного файла.", necessity: "conditional", condition: "Появится скан или файл без пригодной английской версии.", activation: "standby" },
  { eventStep: 5, agentId: 29, role: "Addendum exception", action: "Остаётся в резерве до публикации официальной поправки.", necessity: "conditional", condition: "Buyer публикует addendum или заменяет файл.", activation: "standby" },

  // E06 · requirements and evaluation model.
  { eventStep: 6, agentId: 24, role: "Полное извлечение требований", action: "Извлекает 164 требования из instructions, specs, BOQ и contract conditions." },
  { eventStep: 6, agentId: 25, role: "Предварительная eligibility проверка", action: "Отделяет mandatory pass/fail и формирует conditional Pass с двумя незакрытыми условиями." },
  { eventStep: 6, agentId: 26, role: "Формализация evaluation model", action: "Извлекает rated criteria, evaluated-price rules, weights и thresholds." },
  { eventStep: 6, agentId: 27, role: "Реестр forms и deliverables", action: "Выделяет 27 обязательных форм, owners и due dates." },
  { eventStep: 6, agentId: 28, role: "Source-locked specifications", action: "Фиксирует 68 спецификаций, units, tolerances и запреты substitutions без домыслов." },
  { eventStep: 6, agentId: 3, role: "Provenance требований", action: "Связывает каждое извлечённое требование, критерий и форму с исходной страницей и clause.", input: "Corpus-v1, extracted clauses и source coordinates.", output: "Evidence links и confidence для 164 требований, evaluation model и forms register.", handoff: "E07 и E12 получают source-traceable требования." },
  { eventStep: 6, agentId: 30, role: "Clarification exception", action: "Проверяет неоднозначности, но не формирует искусственный вопрос при отсутствии material conflict.", necessity: "conditional", condition: "Обнаружено противоречие, влияющее на цену, допуск или решение.", activation: "standby" },

  // E07 · tender-specific match and gaps.
  { eventStep: 7, agentId: 31, role: "Company × Tender score", action: "Сопоставляет verified profile с требованиями и рассчитывает объяснимый Match 88%." },
  { eventStep: 7, agentId: 32, role: "Solution-fit", action: "Проверяет прямое покрытие решения и необходимость service partner без преждевременного выбора контрагента." },
  { eventStep: 7, agentId: 34, role: "План закрытия gaps", action: "Назначает owner и срок для bid security и local service gaps." },
  { eventStep: 7, agentId: 3, role: "Evidence для score", action: "Связывает факторы Match 88% и gaps с профилем, требованиями и проверяемыми источниками.", input: "Verified profile, requirements register и source citations.", output: "Evidence-backed score explanation и список неподтверждённых gaps.", handoff: "E08 получает доказуемый match pack." },

  // E08 · Bid / No-Bid gate.
  { eventStep: 8, agentId: 35, role: "Bid / No-Bid recommendation", action: "Сводит Match, eligibility, feasibility, business case и risks в рекомендацию BID с четырьмя условиями." },
  { eventStep: 8, agentId: 36, role: "Capacity feasibility", action: "Проверяет, можно ли произвести и поставить 26 130 изделий за 150 дней." },
  { eventStep: 8, agentId: 37, role: "Предварительный business case", action: "Рассчитывает margin threshold 13% и cash gap 42 дня до окончательной BOQ." },
  { eventStep: 8, agentId: 38, role: "Integrity и risk pack", action: "Проверяет sanctions, country, payment, logistics и первоначальные third-party risks." },
  { eventStep: 8, agentId: 2, role: "Управленческий decision gate", action: "Передаёт recommendation tender committee и фиксирует условное решение BID.", input: "Bid scorecard, feasibility, preliminary economics, risks и Match 88%.", output: "Подписанный Bid / No-Bid protocol с четырьмя условиями и risk limits.", handoff: "E09, E10 и E13 разрешены при контроле условий." },

  // E09 · conditional local-service branch.
  { eventStep: 9, agentId: 42, role: "Поиск local service", action: "Находит три грузинские сервисные компании с нужной географией, монтажом и warranty SLA.", necessity: "conditional", condition: "Активирован обязательный gap local service.", activation: "triggered" },
  { eventStep: 9, agentId: 12, role: "Capability graph партнёра", action: "Проверяет coverage выбранного кандидата по 180 школам, команде, SLA и гарантийным выездам.", necessity: "conditional", condition: "Выбран local-service candidate для проверки.", activation: "triggered" },
  { eventStep: 9, agentId: 33, role: "Модель участия", action: "Фиксирует Anatolia как prime bidder, а грузинского партнёра — как service subcontractor.", necessity: "conditional", condition: "Local service нельзя закрыть собственными ресурсами Anatolia.", activation: "triggered" },
  { eventStep: 9, agentId: 8, role: "Проверка контрагента", action: "Проверяет legal identity, команду и подтверждённый опыт выбранного service subcontractor.", necessity: "conditional", condition: "Shortlist привёл к выбранному юридическому лицу.", activation: "triggered", input: "Регистрационные данные, staff evidence, SLA и references кандидата из Тбилиси.", output: "Верифицированное досье local service subcontractor.", handoff: "Agent 33 и E10 получают проверенного участника.", overlapNote: "Agent 08 проверяет организацию и опыт; Agent 12 проверяет capability coverage. Integrity screening остаётся отдельным открытым вопросом." },
  { eventStep: 9, agentId: 38, role: "Предлагаемая проверка integrity партнёра", action: "Должен повторно проверить sanctions, beneficial ownership и third-party risk после выбора конкретного subcontractor.", necessity: "conditional", condition: "До утверждения выбранного local service subcontractor.", activation: "triggered", input: "Верифицированное досье выбранного партнёра из E09.", output: "Partner integrity addendum к риск-регистру.", handoff: "E10 и E15 получают подтверждение либо mitigation.", rationale: "E08 проверяет риск до выбора конкретного партнёра; в Case facts нет отдельного результата после выбора, поэтому участие предлагается, но не считается доказанным.", absenceImpact: "Маршрут prime + subcontractor останется без явно доказанной sanctions/integrity проверки выбранного контрагента.", provenance: "expert-proposed", validationStatus: "needs-review" },

  // E10 · design the solution; no contract execution yet.
  { eventStep: 10, agentId: 39, role: "Архитектура решения", action: "Собирает продуктовую конфигурацию, роли сторон, шесть delivery waves и service model." },
  { eventStep: 10, agentId: 36, role: "Проверка capacity plan", action: "Проверяет загрузку фабрики, buffers и выполнимость каждой из шести волн.", output: "Подтверждённый capacity plan с шестью волнами и двумя buffer windows.", handoff: "Agents 39, 50 и 62 получают исполнимые ограничения." },
  { eventStep: 10, agentId: 62, role: "Предконтрактное логистическое проектирование", action: "Проектирует site sequence, last-mile windows, installation и acceptance как вход решения, не открывая contract execution.", input: "Solution concept, 180 school sites, six-wave schedule и partner coverage.", output: "Предконтрактный logistics plan и installation milestones.", handoff: "Agent 39 включает план в architecture; E19 превращает его в contract baseline.", overlapNote: "Agent 36 доказывает feasibility; Agent 39 соединяет решение; Agent 62 проектирует операционный маршрут. Live execution начинается только в E20." },
  { eventStep: 10, agentId: 7, role: "Конфигурация продуктовых семейств", action: "Группирует 68 BOQ-позиций в четыре производимые продуктовые семьи и передаёт технические параметры." },

  // E11 · managed clarification / amendment wait.
  { eventStep: 11, agentId: 17, role: "Контроль clarification milestone", action: "Следит за deadline вопросов и фиксирует его прохождение без искусственной отправки вопроса.", input: "Clarification deadline и status register.", output: "Закрытый clarification milestone и продолжение baseline calendar.", handoff: "E12 продолжается на corpus-v1." },
  { eventStep: 11, agentId: 30, role: "Buyer-question exception", action: "Остаётся в резерве; запускается только при material ambiguity.", necessity: "conditional", condition: "Найдено материальное противоречие до deadline вопросов.", activation: "standby" },
  { eventStep: 11, agentId: 29, role: "Addendum monitoring", action: "Отслеживает официальный портал, но не создаёт change report без addendum.", necessity: "conditional", condition: "Buyer публикует addendum или заменяет документ.", activation: "standby" },

  // E12 · close compliance and qualification gaps.
  { eventStep: 12, agentId: 47, role: "Requirement-response control", action: "Связывает 164 требования с response, owner, evidence и статусом." },
  { eventStep: 12, agentId: 48, role: "Technical compliance", action: "Проверяет размеры, материалы, durability и emissions; контролирует семь корректировок конструкции." },
  { eventStep: 12, agentId: 49, role: "Commercial compliance", action: "Проверяет валюту, taxes, payment terms, 2% security и коммерческие формы." },
  { eventStep: 12, agentId: 55, role: "Qualification evidence pack", action: "Отбирает четыре аналогичных контракта, CV, certificates и completion evidence под требования Case 1.", output: "Готовый credentials pack с mapped evidence.", handoff: "E14 использует pack как вход без повторного выполнения Agent 55." },
  { eventStep: 12, agentId: 3, role: "Evidence ledger compliance", action: "Связывает каждый compliance claim и credential с source document и clause.", input: "Compliance matrix, credentials, test reports и source coordinates.", output: "Traceable evidence package без неподтверждённых mandatory claims.", handoff: "E14 и E15 получают source-linked evidence." },
  { eventStep: 12, agentId: 25, role: "Финальное eligibility решение", action: "Повторно проверяет conditional eligibility после подтверждения bid security и local service.", input: "Preliminary conditional Pass, bank confirmation, verified partner и qualification pack.", output: "Final eligibility Pass без открытых mandatory gaps.", handoff: "E14 получает подтверждённый qualification status; E15 проверяет его сохранность." },

  // E13 · final cost and BOQ.
  { eventStep: 13, agentId: 50, role: "Landed cost model", action: "Считает производство, упаковку, фрахт, пошлины, last mile, монтаж, warranty и reserve 4,2%." },
  { eventStep: 13, agentId: 51, role: "Line-item pricing", action: "Распределяет цену по 68 BOQ-позициям и проверяет арифметику, currency и taxes." },
  { eventStep: 13, agentId: 37, role: "Финальный business case", action: "Обновляет margin и cash-flow по landed cost $3,14 млн и bid price $3,61 млн.", input: "Final landed cost, bid price, payment terms и working capital.", output: "Подтверждённая маржа 13% и cash-flow case в пределах E08 thresholds.", handoff: "E15 Human Approval получает коммерческое обоснование." },
  { eventStep: 13, agentId: 49, role: "Проверка согласованности цены", action: "Проверяет BOQ против commercial clauses, currency, taxes и price schedules.", input: "Final BOQ, commercial clauses и bid security terms.", output: "Commercial Compliance Pass для окончательной цены.", handoff: "E14 получает согласованные commercial inputs." },

  // E14 · draft the proposal; credentials are consumed, not regenerated.
  { eventStep: 14, agentId: 52, role: "Proposal strategy", action: "Связывает evaluation criteria с четырьмя win themes и структурой ответа." },
  { eventStep: 14, agentId: 53, role: "Technical proposal", action: "Готовит 42-страничный технический ответ, методологию, schedule и evidence links." },
  { eventStep: 14, agentId: 54, role: "Commercial proposal", action: "Заполняет commercial schedules и assumptions строго по BOQ $3,61 млн." },
  { eventStep: 14, agentId: 55, role: "Повторное формирование credentials", action: "Новых credentials не создаёт: E14 должен потреблять уже готовый pack из E12.", necessity: "redundant", input: "Credentials pack, уже завершённый в E12.", output: "Отдельный новый output отсутствует; pack только встраивается Agents 53/54 и Document Assembly.", handoff: "Удалён из активных исполнителей E14; остаётся CRUCIAL / JUSTIFIED в E12.", rationale: "Повторное назначение не имеет отдельного Event-specific deliverable и смешивает производство artifact с его использованием.", absenceImpact: "E14 не теряет output: готовый credentials pack остаётся входом из E12.", overlapNote: "Agent 55 производит pack в E12; Agent 53 и затем Agent 58 включают его в proposal/submission.", validationStatus: "confirmed" },

  // E15 · QA, legal review and content approval.
  { eventStep: 15, agentId: 56, role: "Independent red team", action: "Находит шесть defects, ранжирует их и ведёт correction log до закрытия." },
  { eventStep: 15, agentId: 57, role: "Legal review", action: "Проверяет liabilities, penalties, guarantees и draft contract; оформляет risk memo." },
  { eventStep: 15, agentId: 2, role: "Content и commercial approval", action: "Получает от руководителей отдельные approvals цены, рисков и полного submission package.", input: "Closed red-team log, contract memo, final price и proposal draft.", output: "Протокол содержательного утверждения final bid package.", handoff: "E16 может запросить отдельное release-to-submit approval." },
  { eventStep: 15, agentId: 4, role: "Заморозка approved version", action: "Фиксирует исправления и блокирует final-approved package от несогласованных изменений.", input: "Исправленный proposal, approvals и red-team log.", output: "Immutable final-approved version и closed correction history.", handoff: "E16 получает единственную разрешённую версию для assembly." },

  // E16 · release and submit.
  { eventStep: 16, agentId: 58, role: "Assembly и portal submission", action: "Проверяет комплектность, собирает 31 подписанный файл, загружает их и сверяет manifest." },
  { eventStep: 16, agentId: 17, role: "Deadline control", action: "Проверяет release window и подтверждает подачу за 18 часов до срока.", input: "Submission deadline, upload status и receipt timestamp.", output: "Deadline Pass и закрытый submission milestone.", handoff: "Orchestrator переводит Case в managed wait evaluation." },
  { eventStep: 16, agentId: 4, role: "Submission evidence", action: "Фиксирует filenames, checksums, receipt и точную версию пакета, полученного Buyer.", input: "31 uploaded files, final manifest и portal receipt.", output: "Immutable submitted-package baseline и audit entry.", handoff: "E17 может отвечать только на основе submitted baseline." },
  { eventStep: 16, agentId: 2, role: "Release-to-submit approval", action: "Фиксирует отдельное необратимое разрешение уполномоченному представителю нажать Submit.", input: "Final-approved package, completeness check и deadline status.", output: "Протокол release-to-submit с ответственным и timestamp.", handoff: "Agent 58 завершает отправку; этот gate не дублирует content approval E15." },

  // E17 · conditional buyer clarification.
  { eventStep: 17, agentId: 59, role: "Clarification response", action: "Готовит source-linked ответы по emissions и installation schedule без изменения цены и обязательств.", necessity: "conditional", condition: "Buyer направил официальный clarification request.", activation: "triggered" },
  { eventStep: 17, agentId: 3, role: "Evidence response", action: "Связывает каждый ответ с submitted bid, test reports и approved schedule.", necessity: "conditional", condition: "Clarification требует доказательств по emissions и schedule.", activation: "triggered", input: "Buyer questions, submitted baseline, test reports и schedule.", output: "Evidence map clarification package.", handoff: "Agent 59 включает citations в approved response." },
  { eventStep: 17, agentId: 57, role: "No-new-obligation review", action: "Проверяет, что ответ не меняет цену, scope или contractual commitments.", necessity: "conditional", condition: "Clarification response готов к согласованию.", activation: "triggered", input: "Draft clarification response и submitted contract position.", output: "Legal clearance clarification response.", handoff: "Agent 02 получает очищенный от новых обязательств draft." },
  { eventStep: 17, agentId: 2, role: "Human approval clarification", action: "Передаёт ответ уполномоченным людям и фиксирует разрешение на отправку.", necessity: "conditional", condition: "Buyer request требует официального ответа.", activation: "triggered", input: "Evidence-backed и legally cleared clarification draft.", output: "Approval protocol clarification submission.", handoff: "Agent 59 подаёт ответ." },
  { eventStep: 17, agentId: 17, role: "Clarification deadline", action: "Регистрирует срок ответа комиссии и контролирует своевременную подачу.", necessity: "conditional", condition: "Buyer request содержит официальный response deadline.", activation: "triggered", input: "Buyer request timestamp и due date.", output: "Clarification deadline alert и timely-submission status.", handoff: "Agent 59 и Orchestrator получают time gate." },
  { eventStep: 17, agentId: 4, role: "Версия clarification package", action: "Фиксирует одобренный ответ, supporting files и receipt отдельно от исходной заявки.", necessity: "conditional", condition: "Clarification package подан Buyer.", activation: "triggered", input: "Approved clarification files и portal receipt.", output: "Immutable clarification-response version и audit entry.", handoff: "E18 получает подтверждённый evaluation record." },

  // E18 · intention to award and standstill.
  { eventStep: 18, agentId: 61, role: "Award transition plan", action: "Проверяет Notice of Intention to Award и формирует performance-security, signing и mobilization actions." },
  { eventStep: 18, agentId: 17, role: "Standstill calendar", action: "Фиксирует standstill end date, complaint window и signing deadlines.", input: "Award notice и procedural standstill rules.", output: "Award calendar с standstill и signing controls.", handoff: "E19 блокируется до завершения standstill." },
  { eventStep: 18, agentId: 57, role: "Award conditions review", action: "Сверяет evaluated price и award conditions с submitted bid и approved deviations." },
  { eventStep: 18, agentId: 2, role: "Acceptance of award conditions", action: "Передаёт условия руководству и фиксирует согласие продолжить после standstill.", input: "Award notice, legal memo, guarantee requirements и approval limits.", output: "Approval protocol award conditions.", handoff: "Agent 61 готовит E19 после standstill." },
  { eventStep: 18, agentId: 4, role: "Фиксация official award notice", action: "Сохраняет исходный notice, received timestamp и standstill baseline.", input: "Official Notice of Intention to Award.", output: "Immutable award-notice record и standstill audit entry.", handoff: "E19 получает source-locked award basis." },

  // E19 · sign the contract and mobilize.
  { eventStep: 19, agentId: 61, role: "Award-to-contract closure", action: "Контролирует performance security, signing checklist и переход из award в signed contract." },
  { eventStep: 19, agentId: 57, role: "Final contract conformity", action: "Сверяет final contract с submitted bid, award conditions и approved deviations." },
  { eventStep: 19, agentId: 62, role: "Mobilization baseline", action: "Превращает pre-award logistics plan E10 в approved site sequence и execution schedule.", input: "Signed contract, E10 logistics plan и partner workshare.", output: "Approved mobilization plan, baseline schedule и site delivery sequence.", handoff: "E20 запускает live execution по baseline." },
  { eventStep: 19, agentId: 63, role: "Contract administration setup", action: "Создаёт six-milestone register, guarantee, invoice, retention и variation controls.", input: "Signed contract, payment conditions и acceptance milestones.", output: "Contract-administration baseline и payment register.", handoff: "E20 обновляет реестр фактическими событиями." },
  { eventStep: 19, agentId: 2, role: "Contract signature approval", action: "Фиксирует человеческое разрешение подписать final contract и предоставить performance security.", input: "Final contract conformity, risk limits и signing checklist.", output: "Approval protocol contract signature.", handoff: "Уполномоченные стороны подписывают; Agents 62/63 открывают mobilization." },
  { eventStep: 19, agentId: 4, role: "Contract baseline version", action: "Фиксирует signed contract, approved schedule и milestone register как contract baseline.", input: "Executed contract и mobilization artifacts.", output: "Immutable contract-baseline-v1 и signing audit trail.", handoff: "E20 variations сравниваются только с baseline-v1." },

  // E20 · execute, administer and learn.
  { eventStep: 20, agentId: 62, role: "Live execution and logistics", action: "Отслеживает production, QC, six-wave transport, last mile, installation и acceptance по 180 школам.", input: "Contract baseline, site schedule и actual milestone evidence.", output: "Live execution status и завершённый delivery/installation record.", handoff: "Agent 63 управляет milestones; Agent 64 получает performance outcome." },
  { eventStep: 20, agentId: 63, role: "Payments and variations", action: "Контролирует acceptance, invoices, guarantees, retention и approved variations по шести milestones." },
  { eventStep: 20, agentId: 64, role: "Outcome learning", action: "Сравнивает обещания с award, score, delivery performance и buyer feedback; предлагает model corrections." },
  { eventStep: 20, agentId: 5, role: "Knowledge graph update", action: "Связывает company, tender, submitted package, award, contract, 180 schools и final outcome." },
  { eventStep: 20, agentId: 4, role: "Закрывающий audit trail", action: "Версионирует milestones, variations, acceptance и final closure record.", input: "Actual contract records, receipts, approvals и outcome package.", output: "Complete immutable Case 1 audit history от notice до contract closure.", handoff: "Expert review получает воспроизводимый Case; Case 2 не открывается автоматически." },
];

export const case1EventAgentExecutions: EventAgentExecution[] = specs.map(execution);

const auditMeta: Record<number, Omit<CaseEventAudit, "eventStep" | "auditVersion" | "status">> = {
  1: { scopeBoundary: "Buyer публикует notice; TenderLab получает пакет и фиксирует baseline. Классификация относится к E02.", missingAgentFinding: "Новый Agent не нужен. Agent 15 перенесён в E02; E01 сохраняет только ingestion и baseline control.", missingAgentIds: [], movedOutAgentIds: [15] },
  2: { scopeBoundary: "TenderLab классифицирует, фильтрует, ранжирует и при необходимости обогащает opportunity; company acceptance относится к E03.", missingAgentFinding: "Agent 15 перенесён из E01; Agent 17 добавлен для заявленного календаря шести дат.", missingAgentIds: [], movedInAgentIds: [15], addedAgentIds: [17] },
  3: { scopeBoundary: "Company разрешает assessment и назначает людей; это ещё не BID decision.", missingAgentFinding: "Дополнительных capabilities не требуется: Orchestrator, Human Approval и Deadline разделяют state, consent и calendar.", missingAgentIds: [] },
  4: { scopeBoundary: "Формируется доказуемый company baseline и общий readiness; tender-specific match начинается в E07.", missingAgentFinding: "Добавлен пропущенный Agent 09: именно он производит явно заявленный Readiness 84/100.", missingAgentIds: [], addedAgentIds: [9] },
  5: { scopeBoundary: "Создаётся рабочий source-locked corpus; требования ещё не интерпретируются.", missingAgentFinding: "OCR и Amendment остаются conditional standby; запуск без скана/addendum был бы искусственным.", missingAgentIds: [] },
  6: { scopeBoundary: "Corpus превращается в requirements/evaluation/forms model; company fit и решение остаются последующими Events.", missingAgentFinding: "Добавлен Agent 03 для source-level provenance 164 требований; Agent 30 остаётся standby.", missingAgentIds: [], addedAgentIds: [3] },
  7: { scopeBoundary: "Рассчитывается Company × Tender fit и gaps; BID decision не принимается.", missingAgentFinding: "Новых Agents не требуется; readiness, eligibility и evidence приходят как inputs.", missingAgentIds: [] },
  8: { scopeBoundary: "Tender committee принимает условное BID на базе анализа; Event не выбирает конкретного партнёра и не финализирует BOQ.", missingAgentFinding: "Текущий набор покрывает recommendation, feasibility, economics, risks и human gate.", missingAgentIds: [] },
  9: { scopeBoundary: "Условная ветвь выбирает и проверяет local-service route; product supplier/JV цепочки не запускаются.", missingAgentFinding: "Предлагается Agent 38 для повторной integrity-проверки уже выбранного subcontractor; Case facts пока не подтверждают результат.", missingAgentIds: [38], unresolvedFinding: "Нужно подтвердить, была ли выполнена sanctions/beneficial-owner проверка выбранного грузинского партнёра." },
  10: { scopeBoundary: "Проектируется предконтрактное решение и логистика; live contract execution ещё не начинается.", missingAgentFinding: "Новый Agent не нужен. Для Agent 62 зафиксирована граница: design input сейчас, live execution — E20.", missingAgentIds: [] },
  11: { scopeBoundary: "Управляемое ожидание clarification/addendum; отсутствие события является валидным результатом monitoring.", missingAgentFinding: "Agent 17 активен; Agents 29/30 остаются conditional standby и не имитируют несуществующие изменения.", missingAgentIds: [] },
  12: { scopeBoundary: "Закрываются technical/commercial/qualification gaps и evidence; proposal drafting относится к E14.", missingAgentFinding: "Добавлен Agent 25 для final eligibility Pass после закрытия двух условий.", missingAgentIds: [], addedAgentIds: [25] },
  13: { scopeBoundary: "Формируется final cost/BOQ и commercial validation; human price approval остаётся E15.", missingAgentFinding: "Текущие четыре outputs необходимы и не дублируют друг друга.", missingAgentIds: [] },
  14: { scopeBoundary: "Создаются proposal narratives и schedules из готовых inputs; qualification pack не производится повторно.", missingAgentFinding: "Agent 55 удалён из E14 как redundant assignment: его pack создан в E12 и только потребляется.", missingAgentIds: [], removedAgentIds: [55] },
  15: { scopeBoundary: "Выполняются QA, legal review, content/commercial approval и freeze; portal submission относится к E16.", missingAgentFinding: "Новых Agents не требуется. Rework разделён: evidence/compliance возвращается в E12, proposal defects — в E14.", missingAgentIds: [] },
  16: { scopeBoundary: "Approved package получает release, собирается и подаётся; содержательное редактирование запрещено.", missingAgentFinding: "Текущий набор покрывает release gate, assembly, deadline и immutable submission evidence.", missingAgentIds: [] },
  17: { scopeBoundary: "Условный Buyer request получает evidence-only response без изменения bid scope/price.", missingAgentFinding: "Добавлены Agents 17 и 04 для response deadline и отдельной immutable версии clarification package.", missingAgentIds: [], addedAgentIds: [17, 4] },
  18: { scopeBoundary: "Intention to Award и standstill проверяются и принимаются; contract signing относится к E19.", missingAgentFinding: "Добавлен Agent 04 для source-locked award notice и standstill audit baseline.", missingAgentIds: [], addedAgentIds: [4] },
  19: { scopeBoundary: "После standstill стороны утверждают и подписывают contract; создаётся mobilization/administration baseline.", missingAgentFinding: "Добавлены Agents 02 и 04 для signature approval и immutable contract baseline.", missingAgentIds: [], addedAgentIds: [2, 4] },
  20: { scopeBoundary: "Исполняется и закрывается signed contract; фактические outcomes возвращаются в knowledge/scoring.", missingAgentFinding: "Текущий набор покрывает execution, administration, learning, graph update и closing audit.", missingAgentIds: [] },
};

export const case1EventAudits: CaseEventAudit[] = case1Chronology.map((event) => ({
  eventStep: event.step,
  auditVersion: `E${String(event.step).padStart(2, "0")} · V1`,
  status: "in-review",
  ...auditMeta[event.step],
}));

export const case1AuditSummary: CaseAuditSummary = {
  auditedEventCount: case1EventAudits.length,
  eventAgentFindingCount: case1EventAgentExecutions.length,
  retainedAssignmentCount: case1EventAgentExecutions.filter((item) => (item.necessity === "justified" || item.necessity === "conditional") && item.validationStatus !== "needs-review").length,
  conditionalAssignmentCount: case1EventAgentExecutions.filter((item) => item.necessity === "conditional").length,
  addedAgentIds: [17, 9, 3, 25, 4, 2],
  movedAssignments: [{ agentId: 15, fromEventStep: 1, toEventStep: 2, reason: "Classification consumes the normalized notice produced by E01 and is evidence-backed by the E02 narrative." }],
  removedAssignments: [{ agentId: 55, eventStep: 14, retainedEventStep: 12, reason: "Credentials pack is produced in E12 and consumed in E14; a second execution has no distinct output." }],
  proposedMissingAgentIds: [38],
  overlapFindings: [
    "Agents 21/04: Document Intake owns corpus/index; Audit & Version Control owns immutable lineage and diff.",
    "Agents 24/25/26/27: Parser extracts raw requirements; specialists create eligibility, evaluation and forms deliverables.",
    "Agents 36/39/62: feasibility, solution architecture and operational logistics are separate outputs; live execution starts only in E20.",
    "Agents 08/12 in E09: Company Verification checks the legal entity/experience; Partner Capability Graph checks service coverage.",
    "Agents 57/61: Legal Review owns contractual risk; Award & Contract owns the transition plan and signing checklist.",
  ],
  unresolvedFindings: [
    "E09 lacks case-observed evidence that the selected service subcontractor received a fresh Agent 38 integrity screening.",
    "The canonical scope of Agent 08 should clarify whether «Company» includes partner/subcontractor verification.",
    "The canonical scope of Agent 62 should explicitly distinguish pre-award logistics design from post-award live execution.",
  ],
  canonicalRegistryImplications: [
    "No Agent ID, name, tier or canonical output is changed by this Case audit.",
    "No merge or split is justified yet; two descriptions may need scope clarification after expert review.",
    "The 64-Agent registry remains the source of truth; all findings are Case 1 assignments and relationship evidence.",
  ],
};

if (case1EventAudits.length !== case1Chronology.length) throw new Error("Every Case 1 Event needs exactly one Event Audit.");
if (new Set(case1EventAudits.map((audit) => audit.eventStep)).size !== case1Chronology.length) throw new Error("Case 1 Event Audit steps must be unique.");
if (case1EventAgentExecutions.some((item) => !case1EventAudits.some((audit) => audit.eventStep === item.eventStep))) throw new Error("Every Event-specific Agent Execution needs an audited Event.");
if (case1EventAudits.some((audit) => !case1EventAgentExecutions.some((item) => item.eventStep === audit.eventStep))) throw new Error("Every audited Event needs at least one Event-specific Agent finding.");
if (new Set(case1EventAgentExecutions.map((item) => `${item.eventStep}:${item.agentId}`)).size !== case1EventAgentExecutions.length) throw new Error("Case 1 Event × Agent findings must be unique.");
if (case1EventAgentExecutions.some((item) => item.necessity === "conditional" && !item.condition)) throw new Error("Every conditional Event Agent assignment needs an explicit condition.");
if (case1EventAgentExecutions.some((item) => item.necessity === "misplaced" && !item.proposedEventStep)) throw new Error("Every misplaced Event Agent assignment needs a proposed Event.");
