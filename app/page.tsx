"use client";

import { useEffect, useMemo, useState } from "react";

type Layer = {
  id: string;
  number: string;
  name: string;
  ru: string;
  mark: string;
  color: string;
};

type Agent = {
  id: number;
  name: string;
  description: string;
  layer: string;
  core?: boolean;
};

const layers: Layer[] = [
  { id: "governance", number: "01", name: "Control", ru: "Управление", mark: "⌘", color: "#8b7cff" },
  { id: "company", number: "02", name: "Company", ru: "Профиль", mark: "◈", color: "#43d9b2" },
  { id: "universe", number: "03", name: "Universe", ru: "Рынок", mark: "◎", color: "#39a9ff" },
  { id: "documents", number: "04", name: "Documents", ru: "Требования", mark: "▤", color: "#f2be5c" },
  { id: "matching", number: "05", name: "Decision", ru: "Решение", mark: "◆", color: "#ff776f" },
  { id: "solution", number: "06", name: "Solution", ru: "Экосистема", mark: "⌁", color: "#c38cff" },
  { id: "bid", number: "07", name: "Bid", ru: "Заявка", mark: "✦", color: "#68d9ef" },
  { id: "learning", number: "08", name: "Learn", ru: "Результат", mark: "↻", color: "#9cdd67" },
];

const agents: Agent[] = [
  { id: 1, name: "TenderLab Orchestrator", description: "Координирует агентов, процессы, зависимости и согласования.", layer: "governance", core: true },
  { id: 2, name: "Human Approval Agent", description: "Передаёт критические решения ответственному человеку.", layer: "governance" },
  { id: 3, name: "Evidence & Provenance Agent", description: "Связывает выводы с проверяемыми источниками.", layer: "governance" },
  { id: 4, name: "Audit & Version Control Agent", description: "Фиксирует версии данных, документов и решений.", layer: "governance" },
  { id: 5, name: "Tender Knowledge Graph Agent", description: "Связывает компании, тендеры, товары и результаты.", layer: "governance" },

  { id: 6, name: "Company Profile Agent", description: "Создаёт структурированный профиль компании.", layer: "company", core: true },
  { id: 7, name: "Product & Capability Agent", description: "Нормализует продукты, услуги и мощности.", layer: "company" },
  { id: 8, name: "Company Verification Agent", description: "Проверяет компанию, производство и опыт.", layer: "company" },
  { id: 9, name: "Tender Readiness Score Agent", description: "Оценивает общую готовность компании к тендерам.", layer: "company", core: true },
  { id: 10, name: "Credential & Certificate Agent", description: "Управляет лицензиями, сертификатами и сроками.", layer: "company" },
  { id: 11, name: "Supplier Intelligence Agent", description: "Накапливает проверенные данные о поставщиках.", layer: "company" },
  { id: 12, name: "Partner Capability Graph Agent", description: "Картирует партнёров и их возможности.", layer: "company" },

  { id: 13, name: "Tender Source Ingestion Agent", description: "Собирает объявления и документы из источников.", layer: "universe" },
  { id: 14, name: "Tender Discovery Agent", description: "Находит потенциально подходящие возможности.", layer: "universe", core: true },
  { id: 15, name: "Tender Classification Agent", description: "Классифицирует отрасль, страну и процедуру.", layer: "universe" },
  { id: 16, name: "Tender Filtering Agent", description: "Отсеивает явно нерелевантные возможности.", layer: "universe" },
  { id: 17, name: "Tender Alert & Deadline Agent", description: "Следит за сроками, изменениями и уведомлениями.", layer: "universe" },
  { id: 18, name: "Market Intelligence Agent", description: "Анализирует рынки, спрос и тендерный поток.", layer: "universe" },
  { id: 19, name: "Tender Award Intelligence Agent", description: "Выявляет победителей и закономерности закупок.", layer: "universe" },
  { id: 20, name: "Buyer & Competitor Intelligence Agent", description: "Профилирует заказчиков, конкурентов и лидеров.", layer: "universe" },

  { id: 21, name: "Document Intake Agent", description: "Загружает, индексирует и версионирует файлы.", layer: "documents" },
  { id: 22, name: "OCR & Language Agent", description: "Распознаёт сканы и контролирует перевод.", layer: "documents" },
  { id: 23, name: "Tender Structure Agent", description: "Структурирует лоты, позиции, формы и приложения.", layer: "documents" },
  { id: 24, name: "Requirement Parser Agent", description: "Извлекает все требования и условия.", layer: "documents", core: true },
  { id: 25, name: "Eligibility & Qualification Agent", description: "Определяет обязательные критерии допуска.", layer: "documents" },
  { id: 26, name: "Evaluation Criteria Agent", description: "Извлекает баллы, веса и правила оценки.", layer: "documents" },
  { id: 27, name: "Deliverables & Forms Agent", description: "Находит все формы, справки и приложения.", layer: "documents" },
  { id: 28, name: "Strict-Spec Agent", description: "Сохраняет спецификации без домыслов и подмен.", layer: "documents" },
  { id: 29, name: "Amendment & Change Agent", description: "Сравнивает версии и показывает изменения.", layer: "documents" },
  { id: 30, name: "Ambiguity & Clarification Agent", description: "Находит противоречия и готовит вопросы.", layer: "documents" },

  { id: 31, name: "Company-to-Tender Match Score Agent", description: "Рассчитывает персональный уровень соответствия.", layer: "matching", core: true },
  { id: 32, name: "Solution-Based Matching Agent", description: "Находит участие за пределами совпадения товаров.", layer: "matching", core: true },
  { id: 33, name: "Participation Route Agent", description: "Выбирает оптимальную роль компании в тендере.", layer: "matching" },
  { id: 34, name: "Gap Analysis Agent", description: "Показывает недостающие ресурсы и компетенции.", layer: "matching" },
  { id: 35, name: "TenderScore / Bid-No-Bid Agent", description: "Рекомендует участвовать или отказаться.", layer: "matching", core: true },
  { id: 36, name: "Capacity & Execution Agent", description: "Проверяет реальную способность выполнить контракт.", layer: "matching" },
  { id: 37, name: "Commercial Attractiveness Agent", description: "Оценивает маржу, денежный поток и ценность.", layer: "matching" },
  { id: 38, name: "Risk & Integrity Agent", description: "Проверяет санкционные, страновые и регуляторные риски.", layer: "matching" },

  { id: 39, name: "Solution Architecture Agent", description: "Собирает полное решение под требования.", layer: "solution" },
  { id: 40, name: "Partner Discovery Agent", description: "Находит партнёров для закрытия пробелов.", layer: "solution", core: true },
  { id: 41, name: "JV & Consortium Optimization Agent", description: "Проектирует состав и роли консорциума.", layer: "solution" },
  { id: 42, name: "Local Representation Agent", description: "Ищет местных представителей и сервисных партнёров.", layer: "solution" },
  { id: 43, name: "Supplier Discovery Agent", description: "Подбирает дополнительные товары и производителей.", layer: "solution" },
  { id: 44, name: "Supplier Verification Agent", description: "Проверяет поставщика, документы и возможности.", layer: "solution" },
  { id: 45, name: "RFQ Orchestrator Agent", description: "Создаёт и управляет запросами котировок.", layer: "solution" },
  { id: 46, name: "Quotation Normalization Agent", description: "Приводит предложения к единому сравнению.", layer: "solution" },

  { id: 47, name: "Compliance Matrix Agent", description: "Связывает требования, ответы, доказательства и статус.", layer: "bid", core: true },
  { id: 48, name: "Technical Compliance Agent", description: "Проверяет решение по техническим требованиям.", layer: "bid" },
  { id: 49, name: "Commercial Compliance Agent", description: "Проверяет цены, валюты и коммерческие условия.", layer: "bid" },
  { id: 50, name: "Cost & Landed-Price Agent", description: "Считает полную стоимость поставки и исполнения.", layer: "bid" },
  { id: 51, name: "Pricing & BOQ Agent", description: "Формирует цену и проверяет ведомости объёмов.", layer: "bid" },
  { id: 52, name: "Proposal Strategy Agent", description: "Определяет структуру, акценты и темы победы.", layer: "bid", core: true },
  { id: 53, name: "Technical Proposal Agent", description: "Готовит техническое предложение и методологию.", layer: "bid" },
  { id: 54, name: "Commercial Proposal Agent", description: "Готовит коммерческие формы и допущения.", layer: "bid" },
  { id: 55, name: "Credentials & Experience Agent", description: "Подбирает опыт, резюме и подтверждения.", layer: "bid" },
  { id: 56, name: "Bid QA & Red Team Agent", description: "Ищет пропуски, слабые ответы и противоречия.", layer: "bid" },
  { id: 57, name: "Legal & Contract Review Agent", description: "Выявляет обязательства и договорные риски.", layer: "bid" },
  { id: 58, name: "Document Assembly & Submission Agent", description: "Собирает, проверяет и подаёт пакет.", layer: "bid" },

  { id: 59, name: "Clarification Response Agent", description: "Готовит ответы на вопросы комиссии.", layer: "learning" },
  { id: 60, name: "Presentation & Negotiation Agent", description: "Поддерживает презентации и переговоры.", layer: "learning" },
  { id: 61, name: "Award & Contract Agent", description: "Сопровождает присуждение, гарантии и подписание.", layer: "learning" },
  { id: 62, name: "Execution & Logistics Agent", description: "Поддерживает производство, доставку и внедрение.", layer: "learning" },
  { id: 63, name: "Payment & Contract Administration Agent", description: "Контролирует этапы, документы, платежи и изменения.", layer: "learning" },
  { id: 64, name: "Outcome Learning Agent", description: "Возвращает результаты в систему знаний.", layer: "learning", core: true },
];

type AgentExample = {
  company: string;
  item: string;
  result: string;
};

const agentExamples: Record<number, AgentExample> = {
  1: { company: "OakLine Contract Furniture", item: "Комплект мебели для 180 гостиничных номеров", result: "Скоординированы 7 агентов, 520 мебельных позиций, график образцов и 3 согласования до подачи." },
  2: { company: "ErgoForm Seating", item: "Рабочее кресло с синхромеханизмом и 4D-подлокотниками", result: "Предельная цена и пятилетняя гарантия переданы коммерческому директору на утверждение." },
  3: { company: "NordicPanel Works", item: "Корпусная мебель из MDF класса E0", result: "Каждое заявление связано с протоколом эмиссии формальдегида, паспортом панели и пунктом тендера." },
  4: { company: "SteelWood Systems", item: "Письменные столы с рамой из стали 1,5 мм", result: "Зафиксированы 6 версий чертежей каркаса, кабель-канала и порошкового покрытия." },
  5: { company: "CasaGrid Interiors", item: "Школьная мебель на 720 учебных мест", result: "Связаны заказчик, 26 моделей, 5 поставщиков материалов, 3 монтажные бригады и прошлые результаты." },
  6: { company: "MapleCraft Industries", item: "Модульные офисные столы с кабель-менеджментом", result: "Сформирован профиль фабрики: 38 моделей, станочный парк, мощности и экспортный опыт." },
  7: { company: "FlexiSeat Manufacturing", item: "Формованные кресла производительностью 2000 штук в месяц", result: "Нормализованы модели, виды пены, обивки, услуги сборки и доступная месячная мощность." },
  8: { company: "UrbanShelf Factory", item: "Стеллажи с нагрузкой 80 кг на полку", result: "Подтверждены статус производителя, линия гибки металла и четыре аналогичных контракта." },
  9: { company: "PrimeDesk Export", item: "Офисная мебель с FSC-сертифицированной древесиной", result: "Готовность оценена в 81%: отсутствуют местный установщик и шаблон банковской гарантии." },
  10: { company: "SafeFoam Furnishings", item: "Мягкая мебель с пеной стандарта BS 5852 Crib 5", result: "Обнаружено, что сертификат огнестойкости обивки истекает до даты поставки." },
  11: { company: "PanelLink Supply", item: "HPL 0,8 мм и кромка ABS 2 мм", result: "В базу добавлены 12 поставщиков антифингер-принт ламината, кромки и мебельного клея." },
  12: { company: "RoomSet Alliance", item: "Монтаж мебели в 400 гостиничных номерах за 30 дней", result: "Построена карта монтажников, дизайнеров, перевозчиков и сервисных партнёров по регионам." },
  13: { company: "TenderFurn Feed", item: "Международные закупки контрактной мебели", result: "Из 18 порталов собраны объявления, лоты и документы по офисной, школьной и гостиничной мебели." },
  14: { company: "EduChair Solutions", item: "Регулируемые парты для учеников 4–6 ростовой группы", result: "Найдено 13 закупок, из которых 4 соответствуют каталогу и производственным возможностям." },
  15: { company: "HabiLine Commercial", item: "Антибактериальные прикроватные тумбы", result: "Закупка отнесена к медицинской мебели, Центральной Азии и одноэтапной процедуре." },
  16: { company: "LoftWorks Reseller", item: "Диваны для общественных зон с износостойкой обивкой", result: "Из 92 объявлений оставлены 8 с подходящими материалами, объёмом и географией поставки." },
  17: { company: "SolidTop Furniture", item: "Столы для столовой с цельнолитой столешницей", result: "Зафиксированы четыре контрольные даты; образец отделки требуется отправить через 36 часов." },
  18: { company: "Workspace Insight", item: "Столы sit-stand с диапазоном высоты 650–1250 мм", result: "Определены три растущих рынка и средняя цена сопоставимых закупок эргономичной мебели." },
  19: { company: "DormBuild Modular", item: "Двухъярусные кровати для студенческого общежития", result: "Выявлено, что 61% прошлых контрактов выигрывали поставщики с местной сборкой." },
  20: { company: "CivicSeat Trading", item: "Откидные кресла для актовых залов", result: "Определены действующий поставщик, диапазон цены и три конкурента с сертификатом EN 12727." },
  21: { company: "CleanCabinet Systems", item: "Лабораторные шкафы с химстойким покрытием", result: "Загружены и связаны 34 файла: планы помещений, ведомости, формы, поправки и отделки." },
  22: { company: "Polyglot Furnitech", item: "Столярные спецификации на трёх языках", result: "Распознаны сканы и переведены 126 страниц с сохранением терминов шпона, фурнитуры и соединений." },
  23: { company: "FurniLot Logistics", item: "Комплексная поставка офисной мебели", result: "Тендер разделён на 5 лотов, 126 позиций, 14 помещений и 11 обязательных форм." },
  24: { company: "BirchForm Projects", item: "Архивные шкафы с огнестойкостью 45 минут", result: "Извлечено 144 требования к габаритам, материалам, замкам, отделке, монтажу и гарантии." },
  25: { company: "CareBed Furniture", item: "Прикроватные шкафчики с выдвижным столиком", result: "Выявлены минимальный оборот, два медицинских референса и обязательная санитарная декларация." },
  26: { company: "AcousticPod Design", item: "Офисные акустические кабины со снижением шума 32 дБ", result: "Разложены 100 баллов: акустика 30, эргономика 20, опыт 20 и цена 30." },
  27: { company: "FormPack Contracts", item: "Модульные стеллажи для публичной библиотеки", result: "Составлен перечень из 24 форм, сертификатов материалов, образцов отделки и ценовых таблиц." },
  28: { company: "MeasureRight Kitchens", item: "Кухонные корпуса с HPL 0,8 мм и петлями soft-close", result: "Марки и толщины сохранены дословно; эквиваленты не добавлены без разрешения заказчика." },
  29: { company: "MetroBench Studio", item: "Уличные скамьи из термодревесины", result: "В поправке №2 найдены изменения длины, антикоррозийного покрытия и способа анкеровки." },
  30: { company: "TimberAir Kitchens", item: "Водный лак с VOC менее 60 г/л", result: "Обнаружено противоречие между ведомостью отделки и экологическим разделом; подготовлен вопрос." },
  31: { company: "ArcticOffice Furniture", item: "Рабочие станции и сетчатые кресла", result: "Соответствие компании тендеру рассчитано в 92% с пятью доказанными преимуществами." },
  32: { company: "ModularLiving Systems", item: "Мебель для модульного студенческого общежития", result: "Найдена возможность поставлять кровати, шкафы и столы через генерального модульного подрядчика." },
  33: { company: "HeritageFurn OEM", item: "Гостиничная корпусная мебель по дизайну заказчика", result: "Рекомендована роль OEM-производителя с дизайнером и местным установщиком в составе предложения." },
  34: { company: "CraftSpan Joinery", item: "Акустические стеновые панели с классом B-s1,d0", result: "Выявлены пробелы: пожарный протокол, монтажная система и один референс общественного здания." },
  35: { company: "NeoSchool Furniture", item: "Ученические столы и стулья EN 1729", result: "Выдано решение BID: полное техническое соответствие и ожидаемая маржа 16%." },
  36: { company: "MassSeat Production", item: "Штабелируемые стулья партией 12 000 штук", result: "Подтверждена способность изготовить партию, упаковать и отгрузить её за 90 дней." },
  37: { company: "PolyWood Tables", item: "Конференц-столы на 20 мест", result: "Рассчитаны маржа 18,1%, кассовый разрыв 38 дней и потребность в оборотном капитале." },
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
  52: { company: "LibraryFlow Furniture", item: "Мебель для центральной городской библиотеки", result: "Сформированы темы победы: модульность, низкий VOC, простая навигация и быстрый монтаж." },
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

const layerById = Object.fromEntries(layers.map((layer) => [layer.id, layer]));

type AgentTier = "main" | "specialized" | "optional";

const mainAgentIds = new Set([1, 6, 14, 21, 24, 25, 31, 32, 35, 39, 47, 48, 50, 51, 52, 53, 56, 58, 64]);
const optionalAgentIds = new Set([11, 12, 18, 19, 20, 22, 28, 29, 30, 33, 40, 41, 42, 43, 44, 45, 46, 59, 60, 61, 62, 63]);

const getAgentTier = (agentId: number): AgentTier => {
  if (mainAgentIds.has(agentId)) return "main";
  if (optionalAgentIds.has(agentId)) return "optional";
  return "specialized";
};

const tierLabels: Record<AgentTier, string> = {
  main: "Main",
  specialized: "Specialized",
  optional: "Optional",
};

export default function Home() {
  const [activeLayer, setActiveLayer] = useState<string>("all");
  const [mode, setMode] = useState<"all" | AgentTier>("all");
  const [query, setQuery] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const visibleAgents = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return agents.filter((agent) => {
      const layerMatch = activeLayer === "all" || agent.layer === activeLayer;
      const modeMatch = mode === "all" || getAgentTier(agent.id) === mode;
      const searchMatch =
        !normalizedQuery ||
        agent.name.toLocaleLowerCase().includes(normalizedQuery) ||
        agent.description.toLocaleLowerCase().includes(normalizedQuery);
      return layerMatch && modeMatch && searchMatch;
    });
  }, [activeLayer, mode, query]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedAgent(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  const selectLayer = (id: string) => {
    setActiveLayer(id);
    document.getElementById("agents")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="TenderLab home">
          <span className="brand-mark"><i /><i /><i /></span>
          <span>TenderLab<span className="brand-dot">.ai</span></span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#top" className="nav-active">Command Center</a>
          <a href="#architecture">Workflow</a>
          <a href="#agents">Agents</a>
        </nav>
        <button className="core-jump" onClick={() => { setMode("main"); setActiveLayer("all"); document.getElementById("agents")?.scrollIntoView({ behavior: "smooth" }); }}>
          <span>●</span> Main 19
        </button>
      </header>

      <section className="command-hero" id="top">
        <div className="command-titlebar">
          <div>
            <p className="eyebrow"><span /> LIVE OPERATIONS</p>
            <h1>Agent Command Center</h1>
            <p>64 агента управляют полным тендерным циклом мебельной компании.</p>
          </div>
          <div className="system-health">
            <span><i /> SYSTEM ONLINE</span>
            <b>09 AUG 2026</b>
          </div>
        </div>

        <div className="command-metrics" aria-label="Platform metrics">
          <div className="command-metric primary"><span>ACTIVE AGENTS</span><strong>12<sup>/64</sup></strong><i>+3 today</i></div>
          <div className="command-metric"><span>OPEN TENDERS</span><strong>27</strong><i>6 priority</i></div>
          <div className="command-metric"><span>AVG. MATCH</span><strong>82<sup>%</sup></strong><i>↑ 8.4%</i></div>
          <div className="command-metric"><span>DEADLINES</span><strong>04</strong><i>next 7 days</i></div>
        </div>

        <div className="command-grid">
          <section className="operation-board" aria-label="Active tender operation">
            <div className="panel-head">
              <div><span className="panel-kicker">ACTIVE OPERATION</span><h2>WB-KZ-2026-118</h2></div>
              <div className="operation-score"><b>72%</b><span>complete</span></div>
            </div>
            <div className="tender-meta">
              <span>KAZAKHSTAN</span><i>•</i><span>WORLD BANK</span><i>•</i><span>SCHOOL FURNITURE</span><b>12d : 04h</b>
            </div>
            <div className="operation-progress"><i /></div>
            <div className="agent-run-list">
              <button className="main-run" onClick={() => setSelectedAgent(agents[23])}>
                <span className="run-icon done">✓</span><div><b>Requirement Parser Agent</b><small>186 требований извлечено</small></div><em>DONE</em><strong>02:14</strong>
              </button>
              <button className="main-run" onClick={() => setSelectedAgent(agents[30])}>
                <span className="run-icon running">◌</span><div><b>Company-to-Tender Match Score Agent</b><small>Расчёт соответствия компании</small></div><em className="live">RUNNING</em><strong>68%</strong>
              </button>
              <button className="specialized-run" onClick={() => setSelectedAgent(agents[33])}>
                <span className="run-icon review">!</span><div><b>Gap Analysis Agent</b><small>Требуется подтверждение 3 сертификатов</small></div><em className="attention">REVIEW</em><strong>03</strong>
              </button>
              <button className="optional-run skipped-run" onClick={() => setSelectedAgent(agents[39])}>
                <span className="run-icon skipped">—</span><div><b>Partner Discovery Agent</b><small>Не требуется: монтаж закрывает компания</small></div><em className="skipped">SKIPPED</em><strong>—</strong>
              </button>
              <button className="main-run" onClick={() => setSelectedAgent(agents[38])}>
                <span className="run-icon queued">→</span><div><b>Solution Architecture Agent</b><small>Ожидает завершения Match Score</small></div><em>QUEUED</em><strong>—</strong>
              </button>
            </div>
            <div className="board-foot">
              <span><i /> 3 active · 1 review · 1 skipped</span>
              <button onClick={() => { setMode("main"); document.getElementById("agents")?.scrollIntoView({ behavior: "smooth" }); }}>View main agents →</button>
            </div>
          </section>

          <aside className="activity-panel" aria-label="Agent activity">
            <div className="panel-head slim"><div><span className="panel-kicker">COMMAND QUEUE</span><h2>Live activity</h2></div><span className="activity-count">07</span></div>
            <div className="activity-feed">
              <div><span className="feed-dot blue" /><p><b>Tender Discovery Agent</b><small>Найдено 14 новых возможностей</small></p><time>now</time></div>
              <div><span className="feed-dot green" /><p><b>Company Verification Agent</b><small>Профиль OakLine Furniture подтверждён</small></p><time>4m</time></div>
              <div><span className="feed-dot amber" /><p><b>Human Approval Agent</b><small>Ожидает решения Bid / No-Bid</small></p><time>12m</time></div>
              <div><span className="feed-dot violet" /><p><b>Quotation Normalization Agent</b><small>Сравнено 8 предложений</small></p><time>31m</time></div>
            </div>
            <button className="activity-link" onClick={() => document.getElementById("agents")?.scrollIntoView({ behavior: "smooth" })}>Open all agents <span>↗</span></button>
          </aside>
        </div>
      </section>

      <section className="principle-bar" aria-label="Operating principle">
        <span>OPERATING CONTROL</span>
        <div><b>AI</b><small>находит</small></div><i>→</i>
        <div><b>Evidence</b><small>проверяет</small></div><i>→</i>
        <div><b>Human</b><small>утверждает</small></div>
      </section>

      <section className="architecture-section" id="architecture">
        <div className="section-heading compact-heading">
          <div>
            <p className="eyebrow"><span /> DYNAMIC ARCHITECTURE</p>
            <h2>Context routes the workflow.</h2>
          </div>
          <p>ACTIVATE ↗ BRANCH ↔ SKIP ↘ REJOIN</p>
        </div>

        <div className="routing-map" aria-label="Dynamic agent routing">
          <div className="context-inputs">
            <span>CONTEXT INPUTS</span>
            <div><i>01</i><b>Tender</b><small>тип и процедура</small></div>
            <div><i>02</i><b>Company</b><small>профиль и пробелы</small></div>
            <div><i>03</i><b>Evidence</b><small>доступные данные</small></div>
            <div><i>04</i><b>Decision</b><small>текущий путь</small></div>
          </div>
          <div className="route-connector"><span>→</span><small>ROUTE</small></div>
          <div className="router-core">
            <span>CONTEXT ROUTER</span>
            <strong>TenderLab Orchestrator</strong>
            <p>Активирует нужных агентов и обходит нерелевантные.</p>
            <div><i /><i /><i /></div>
          </div>
          <div className="route-connector branch"><span>↗</span><small>BRANCH</small></div>
          <div className="route-outcomes">
            <button className="outcome-main" onClick={() => { setMode("main"); document.getElementById("agents")?.scrollIntoView({ behavior: "smooth" }); }}><span>Main</span><b>19</b><small>ведут основные этапы</small></button>
            <button className="outcome-specialized" onClick={() => { setMode("specialized"); document.getElementById("agents")?.scrollIntoView({ behavior: "smooth" }); }}><span>Specialized</span><b>23</b><small>включаются по условию</small></button>
            <button className="outcome-optional" onClick={() => { setMode("optional"); document.getElementById("agents")?.scrollIntoView({ behavior: "smooth" }); }}><span>Optional</span><b>22</b><small>пропускаются без необходимости</small></button>
          </div>
        </div>

        <div className="routing-note"><span><i className="main-dot" />Main — обычно ведёт поток</span><span><i className="specialized-dot" />Specialized — активируется по данным</span><span><i className="optional-dot" />Optional — skipped when not relevant</span></div>

        <div className="layer-flow">
          {layers.map((layer) => {
            const layerAgents = agents.filter((agent) => agent.layer === layer.id);
            const count = layerAgents.length;
            const mainCount = layerAgents.filter((agent) => getAgentTier(agent.id) === "main").length;
            const specializedCount = layerAgents.filter((agent) => getAgentTier(agent.id) === "specialized").length;
            const optionalCount = layerAgents.filter((agent) => getAgentTier(agent.id) === "optional").length;
            return (
              <button
                key={layer.id}
                className={activeLayer === layer.id ? "active" : ""}
                style={{ "--layer-color": layer.color } as React.CSSProperties}
                onClick={() => selectLayer(layer.id)}
              >
                <span className="layer-number">{layer.number}</span>
                <i>{layer.mark}</i>
                <strong>{layer.name}</strong>
                <small>{layer.ru}</small>
                <b>{String(count).padStart(2, "0")}</b>
                <div className="layer-mix"><span className="mix-main">{mainCount}</span><span className="mix-specialized">{specializedCount}</span><span className="mix-optional">{optionalCount}</span></div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="agents-section" id="agents">
        <div className="section-heading agents-heading">
          <div>
            <p className="eyebrow"><span /> AGENT ARCHITECTURE</p>
            <h2>{visibleAgents.length}<sup>/64</sup> agents</h2>
          </div>
          <div className="catalog-tools">
            <div className="mode-switch" role="group" aria-label="Agent set">
              <button className={mode === "all" ? "active" : ""} onClick={() => setMode("all")}>All</button>
              <button className={mode === "main" ? "active main-mode" : "main-mode"} onClick={() => setMode("main")}>Main 19</button>
              <button className={mode === "specialized" ? "active" : ""} onClick={() => setMode("specialized")}>Specialized</button>
              <button className={mode === "optional" ? "active" : ""} onClick={() => setMode("optional")}>Optional</button>
            </div>
            <label className="search-box">
              <span>⌕</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти агента" />
            </label>
          </div>
        </div>

        <div className="layer-filters" role="group" aria-label="Filter by layer">
          <button className={activeLayer === "all" ? "active" : ""} onClick={() => setActiveLayer("all")}>All layers</button>
          {layers.map((layer) => (
            <button
              key={layer.id}
              className={activeLayer === layer.id ? "active" : ""}
              style={{ "--layer-color": layer.color } as React.CSSProperties}
              onClick={() => setActiveLayer(layer.id)}
            >
              <i /> {layer.name}
            </button>
          ))}
        </div>

        {visibleAgents.length > 0 ? (
          <div className="agent-grid">
            {visibleAgents.map((agent) => {
              const layer = layerById[agent.layer];
              const tier = getAgentTier(agent.id);
              return (
                <button
                  className={`agent-card tier-${tier}`}
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent)}
                  style={{ "--layer-color": layer.color } as React.CSSProperties}
                >
                  <span className="card-index">{String(agent.id).padStart(2, "0")}</span>
                  <span className="agent-symbol">{layer.mark}</span>
                  <span className={`tier-badge badge-${tier}`}>{tierLabels[tier]}</span>
                  <strong>{agent.name}</strong>
                  <p>{agent.description}</p>
                  <span className="card-layer">{layer.number} · {layer.name}</span>
                  <span className="card-arrow">↗</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <span>⌕</span><strong>Ничего не найдено</strong>
            <button onClick={() => { setQuery(""); setActiveLayer("all"); setMode("all"); }}>Сбросить</button>
          </div>
        )}
      </section>

      <footer>
        <a className="brand footer-brand" href="#top"><span className="brand-mark"><i /><i /><i /></span>TenderLab<span className="brand-dot">.ai</span></a>
        <p>ONE PLACE. EVERY TENDER. WORLDWIDE.</p>
        <span>AI TENDER OPERATING SYSTEM · 2026</span>
      </footer>

      {selectedAgent && (
        <div className="drawer-shell" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedAgent(null); }}>
          <aside className="agent-drawer" role="dialog" aria-modal="true" aria-labelledby="agent-title" style={{ "--layer-color": layerById[selectedAgent.layer].color } as React.CSSProperties}>
            <button className="drawer-close" onClick={() => setSelectedAgent(null)} aria-label="Close">×</button>
            <div className="drawer-topline">
              <span>{String(selectedAgent.id).padStart(2, "0")}</span>
              <b>{layerById[selectedAgent.layer].number} · {layerById[selectedAgent.layer].name}</b>
              <em className={`drawer-tier drawer-${getAgentTier(selectedAgent.id)}`}>{tierLabels[getAgentTier(selectedAgent.id)]}</em>
            </div>
            <div className="drawer-icon">{layerById[selectedAgent.layer].mark}</div>
            <h3 id="agent-title">{selectedAgent.name}</h3>
            <p>{selectedAgent.description}</p>
            <div className="drawer-flow">
              <div><span>AI</span><small>находит</small></div>
              <i>→</i>
              <div><span>Evidence</span><small>проверяет</small></div>
              <i>→</i>
              <div><span>Human</span><small>решает</small></div>
            </div>
            <section className="sim-example" aria-label="Симулированный пример">
              <div className="example-label"><span>СИМУЛИРОВАННЫЙ ПРИМЕР</span><b>DEMO</b></div>
              <div className="example-company"><i />{agentExamples[selectedAgent.id].company}</div>
              <h4>{agentExamples[selectedAgent.id].item}</h4>
              <p>{agentExamples[selectedAgent.id].result}</p>
            </section>
            <div className="status-line"><span><i /> {getAgentTier(selectedAgent.id) === "optional" ? "ON DEMAND" : "AVAILABLE"}</span><b>{tierLabels[getAgentTier(selectedAgent.id)]} agent</b></div>
          </aside>
        </div>
      )}
    </main>
  );
}
