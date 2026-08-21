"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- full document navigation keeps the static Firebase export server-independent */

import { useEffect, useMemo, useRef, useState } from "react";
import "./run.css";

type RunStep = {
  id: number;
  name: string;
  phase: string;
  action: string;
  received: string;
  output: string;
  handoff: string;
};

const runSteps: RunStep[] = [
  {
    id: 1,
    name: "TenderLab Orchestrator",
    phase: "Маршрут",
    action: "Формирует ограниченный маршрут, повторы, пороги уверенности и точки контроля.",
    received: "Профиль мебельной компании и ссылка на закупку GE-MES-2026-017.",
    output: "Создан маршрут из 20 Main agents, правила повторов и две точки управленческого решения.",
    handoff: "Контекст компании, тендера, пороги уверенности, доказательства и план выполнения.",
  },
  {
    id: 6,
    name: "Company Profile Agent",
    phase: "Компания",
    action: "Структурирует мощности, опыт, сертификаты и географию поставок.",
    received: "Регистрационные данные, каталог, референсы и производственный план.",
    output: "Мощность 12 000 изделий/месяц; FSC и ISO 9001; партнёр по монтажу в Тбилиси.",
    handoff: "Проверенный профиль производителя и доступные ресурсы.",
  },
  {
    id: 9,
    name: "Tender Readiness Score Agent",
    phase: "Готовность",
    action: "Оценивает готовность компании к международной конкурсной заявке.",
    received: "Профиль, сертификаты, референсы, команда и финансовые лимиты.",
    output: "Готовность 84/100. Нужно подтвердить тендерную гарантию и локальный сервис.",
    handoff: "Оценка готовности 84/100 и два контролируемых пробела.",
  },
  {
    id: 14,
    name: "Tender Discovery Agent",
    phase: "Поиск",
    action: "Проверяет релевантность найденной возможности для компании.",
    received: "Профиль компании, продуктовые категории и география интереса.",
    output: "Закупка школьной мебели в Грузии определена как приоритетная: релевантность 92%.",
    handoff: "Карточка тендера, заказчик, бюджет, сроки и ссылка на документы.",
  },
  {
    id: 21,
    name: "Document Intake Agent",
    phase: "Документы",
    action: "Загружает и индексирует полный пакет конкурсной документации.",
    received: "Карточка закупки и пакет файлов с портала заказчика.",
    output: "Загружено 27 файлов: условия, спецификации, формы, чертежи и 2 разъяснения.",
    handoff: "Версионированный комплект из 27 файлов с оглавлением.",
  },
  {
    id: 24,
    name: "Requirement Parser Agent",
    phase: "Требования",
    action: "Извлекает технические, коммерческие и процедурные требования.",
    received: "27 индексированных файлов и актуальные разъяснения заказчика.",
    output: "Найдено 164 требования, 27 обязательных форм и 6 контрольных дат.",
    handoff: "Реестр требований с источником, приоритетом и сроком.",
  },
  {
    id: 25,
    name: "Eligibility & Qualification Agent",
    phase: "Допуск",
    action: "Проверяет обязательные критерии допуска и квалификации.",
    received: "Реестр требований и подтверждённый профиль компании.",
    output: "Компания допущена при выполнении двух условий: гарантия 2% и местная сервисная линия.",
    handoff: "Статус допуска и перечень условий до подачи.",
  },
  {
    id: 31,
    name: "Company-to-Tender Match Score Agent",
    phase: "Соответствие",
    action: "Сопоставляет возможности компании с требованиями конкретной закупки.",
    received: "Профиль компании, 164 требования и условия допуска.",
    output: "Совпадение 88%: сильные стороны — объём, FSC, школьные референсы и срок.",
    handoff: "Оценка соответствия 88% и карта сильных и слабых сторон.",
  },
  {
    id: 32,
    name: "Solution-Based Matching Agent",
    phase: "Модель участия",
    action: "Определяет практичную конфигурацию участия и исполнения.",
    received: "Карта соответствия и два условия допуска.",
    output: "Выбрана модель: прямой поставщик из Турции плюс грузинский партнёр по монтажу и сервису.",
    handoff: "Роли сторон, зона ответственности и схема поставки.",
  },
  {
    id: 35,
    name: "TenderScore / Bid-No-Bid Agent",
    phase: "Решение",
    action: "Сводит стратегическую, техническую и коммерческую привлекательность.",
    received: "Готовность 84/100, совпадение 88%, модель участия и риски.",
    output: "Решение: участвовать. Прогноз победы 61%, целевая маржа не ниже 13%.",
    handoff: "Подтверждённое решение об участии и целевые ограничения.",
  },
  {
    id: 39,
    name: "Solution Architecture Agent",
    phase: "Решение",
    action: "Собирает единое мебельное и логистическое решение для 74 школ.",
    received: "Решение об участии, требования, роли партнёров и ограничения.",
    output: "Сформированы 4 типоразмера мебели, 6 волн поставки и план монтажа по регионам.",
    handoff: "Архитектура продукта, поставки, монтажа и гарантийного сервиса.",
  },
  {
    id: 47,
    name: "Compliance Matrix Agent",
    phase: "Матрица",
    action: "Связывает каждое требование с ответом, доказательством и ответственным.",
    received: "164 требования и утверждённая архитектура решения.",
    output: "156 пунктов закрыты, 8 ожидают протоколов испытаний и ценовых подтверждений.",
    handoff: "Матрица 164 строк со статусами и ссылками на доказательства.",
  },
  {
    id: 48,
    name: "Technical Compliance Agent",
    phase: "Техника",
    action: "Проверяет мебель по размерам, безопасности, материалам и стандартам.",
    received: "Матрица требований, чертежи и технические паспорта изделий.",
    output: "157 требований подтверждены; 7 отклонений устранены заменой кромки и усилением каркаса.",
    handoff: "Проверенная спецификация: EN 1729, FSC, класс E1 и гарантия 5 лет.",
  },
  {
    id: 50,
    name: "Cost & Landed-Price Agent",
    phase: "Себестоимость",
    action: "Считает полную стоимость производства, доставки, монтажа и рисков.",
    received: "Утверждённая спецификация, объёмы, маршруты и график монтажа.",
    output: "Полная себестоимость — 3,14 млн долларов, включая резерв риска 4,2%.",
    handoff: "Себестоимость по 68 строкам и допустимый ценовой коридор.",
  },
  {
    id: 51,
    name: "Pricing & BOQ Agent",
    phase: "Цена",
    action: "Формирует конкурсную цену и проверяет ведомость объёмов.",
    received: "Себестоимость, бюджет заказчика и целевая маржа.",
    output: "Цена заявки — 3,61 млн долларов; маржа 13,0%; все 68 строк BOQ сверены.",
    handoff: "Утверждённая цена, BOQ и коммерческие допущения.",
  },
  {
    id: 52,
    name: "Proposal Strategy Agent",
    phase: "Стратегия",
    action: "Выбирает структуру ответа и доказательные темы победы.",
    received: "Цена, карта соответствия, критерии оценки и техническое решение.",
    output: "Темы победы: долговечность, быстрый монтаж, низкие выбросы и локальный сервис.",
    handoff: "Каркас предложения, ключевые сообщения и доказательства.",
  },
  {
    id: 53,
    name: "Technical Proposal Agent",
    phase: "Предложение",
    action: "Готовит технический ответ, методологию и график исполнения.",
    received: "Стратегия, матрица, спецификация и план поставки.",
    output: "Собрано 42 страницы: решение, контроль качества, доставка, монтаж и гарантия.",
    handoff: "Техническое предложение, график и приложения для финальной проверки.",
  },
  {
    id: 56,
    name: "Bid QA & Red Team Agent",
    phase: "Контроль",
    action: "Проверяет заявку глазами строгой конкурсной комиссии.",
    received: "Полный технический и коммерческий комплект заявки.",
    output: "Найдено и исправлено 6 замечаний; подтверждено 164 из 164 требований.",
    handoff: "Проверенный пакет без критических несоответствий.",
  },
  {
    id: 58,
    name: "Document Assembly & Submission Agent",
    phase: "Подача",
    action: "Собирает, подписывает и загружает финальный пакет на портал.",
    received: "Проверенная заявка, подписи, гарантия и финальная цена.",
    output: "31 файл загружен за 18 часов до срока; квитанция подачи сохранена.",
    handoff: "Архив поданной заявки, контрольная сумма и квитанция портала.",
  },
  {
    id: 64,
    name: "Outcome Learning Agent",
    phase: "Результат",
    action: "Сохраняет результат и превращает его в знания для следующих заявок.",
    received: "Архив заявки и протокол оценки через 45 дней после подачи.",
    output: "Контракт присуждён. Оценка 91/100; выигрышные аргументы добавлены в базу знаний.",
    handoff: "Обновлённые шаблоны, коэффициенты оценки и факторы победы.",
  },
];

const AUTO_STEP_MS = 2800;

function caseStage(index: number) {
  if (index < 0) return "Готов к запуску";
  if (index <= 2) return "Проверка готовности";
  if (index <= 6) return "Разбор возможности";
  if (index <= 9) return "Решение об участии";
  if (index <= 16) return "Подготовка заявки";
  if (index <= 18) return "Контроль и подача";
  return "Контракт присуждён";
}

function stepState(index: number, current: number) {
  if (current < 0) return "upcoming";
  if (index < current) return "completed";
  if (index === current) return "active";
  return "upcoming";
}

export default function MainAgentsRunPage() {
  const [currentStep, setCurrentStep] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);
  const activeStep = currentStep >= 0 ? runSteps[currentStep] : null;
  const isComplete = currentStep === runSteps.length - 1;

  useEffect(() => {
    if (!isRunning || currentStep < 0 || isComplete) return;
    const timer = window.setTimeout(() => {
      const nextStep = Math.min(currentStep + 1, runSteps.length - 1);
      setCurrentStep(nextStep);
      if (nextStep === runSteps.length - 1) setIsRunning(false);
    }, AUTO_STEP_MS);
    return () => window.clearTimeout(timer);
  }, [currentStep, isComplete, isRunning]);

  useEffect(() => {
    if (currentStep < 0 || !railRef.current) return;
    railRef.current.querySelector<HTMLElement>(`[data-step="${currentStep}"]`)?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [currentStep]);

  const progress = currentStep < 0 ? 0 : ((currentStep + 1) / runSteps.length) * 100;
  const metrics = useMemo(
    () => [
      { label: "Готовность", value: currentStep >= 2 ? "84/100" : "—" },
      { label: "Соответствие", value: currentStep >= 7 ? "88%" : "—" },
      { label: "Решение", value: currentStep >= 9 ? "Участвовать" : "—" },
      { label: "Цена заявки", value: currentStep >= 14 ? "$3,61 млн" : "—" },
      { label: "Соответствие ТЗ", value: currentStep >= 17 ? "164/164" : currentStep >= 12 ? "157/164" : "—" },
    ],
    [currentStep],
  );

  const startRun = () => {
    setCurrentStep(0);
    setIsRunning(true);
  };

  const restartRun = () => {
    setCurrentStep(0);
    setIsRunning(true);
  };

  const nextStep = () => {
    setIsRunning(false);
    setCurrentStep((step) => (step < 0 ? 0 : Math.min(step + 1, runSteps.length - 1)));
  };

  const reviewStep = (index: number) => {
    setIsRunning(false);
    setCurrentStep(index);
  };

  return (
    <main className="run-page">
      <header className="run-topbar">
        <a className="brand" href="/" aria-label="TenderLab home">
          <span className="brand-mark"><i /><i /><i /></span>
          <span>TenderLab<span className="brand-dot">.ai</span></span>
        </a>
        <div className="run-nav-title"><span>LIVE WORKFLOW</span><b>Main Agents Run</b></div>
        <a className="run-back" href="/">← Agent Architecture</a>
      </header>

      <section className="run-hero">
        <div className="run-hero-copy">
          <p className="run-eyebrow"><span /> ДЕМО · МЕБЕЛЬНЫЙ ТЕНДЕР</p>
          <h1>Main Agents Run</h1>
          <p>Живой маршрут заявки: от профиля компании до результата закупки.</p>
        </div>
        <button className="run-primary" type="button" onClick={startRun}>
          <span className="run-play">▶</span>
          <span><b>RUN</b><small>запустить сценарий</small></span>
        </button>
      </section>

      <section className="case-card" aria-label="Описание тендерного сценария">
        <div className="case-id"><span>АКТИВНЫЙ КЕЙС</span><b>GE-MES-2026-017</b></div>
        <div className="case-main">
          <span className="country-code">GE</span>
          <div>
            <h2>Мебель для 74 государственных школ</h2>
            <p>Министерство образования и науки Грузии · финансирование Всемирного банка</p>
          </div>
        </div>
        <div className="case-facts">
          <span><small>КОМПАНИЯ</small><b>Anatolia Workspace A.Ş.</b></span>
          <span><small>ОБЪЁМ</small><b>26 130 изделий</b></span>
          <span><small>БЮДЖЕТ</small><b>$3,85 млн</b></span>
          <span><small>ДО ПОДАЧИ</small><b>28 дней</b></span>
        </div>
      </section>

      <section className="run-status-board" aria-label="Статус симуляции">
        <div className="run-status-copy">
          <span className={`status-signal ${isRunning ? "is-live" : ""}`} />
          <div><small>СТАТУС КЕЙСА</small><b>{caseStage(currentStep)}</b></div>
        </div>
        <div className="run-progress-copy">
          <b>{currentStep < 0 ? "Готово к запуску" : `Шаг ${currentStep + 1} из ${runSteps.length}`}</b>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="run-progress-track"><i style={{ width: `${progress}%` }} /></div>
        <div className="run-controls" aria-label="Управление симуляцией">
          <button type="button" onClick={() => setIsRunning(false)} disabled={!isRunning}>Ⅱ <span>Пауза</span></button>
          <button type="button" onClick={() => setIsRunning(true)} disabled={isRunning || currentStep < 0 || isComplete}>▶ <span>Продолжить</span></button>
          <button type="button" onClick={restartRun}>↻ <span>Перезапуск</span></button>
          <button className="next-control" type="button" onClick={nextStep} disabled={isComplete}>Следующий шаг <span>→</span></button>
        </div>
      </section>

      <section className="metrics-strip" aria-label="Ключевые результаты">
        {metrics.map((metric) => (
          <div key={metric.label} className={metric.value !== "—" ? "has-value" : ""}>
            <span>{metric.label}</span><b>{metric.value}</b>
          </div>
        ))}
      </section>

      <section className="workflow-section">
        <div className="section-heading">
          <div><span>НАПРАВЛЕНИЕ ПОТОКА →</span><h2>Маршрут Main agents</h2></div>
          <p><b>Нажмите на любого агента</b>, чтобы остановить поток и просмотреть вход и результат.</p>
        </div>
        <div className="agent-rail" ref={railRef}>
          {runSteps.map((step, index) => {
            const state = stepState(index, currentStep);
            return (
              <button
                aria-label={`Открыть шаг ${index + 1}: ${step.name}`}
                aria-pressed={state === "active"}
                className={`rail-step ${state}`}
                data-step={index}
                key={step.id}
                onClick={() => reviewStep(index)}
                type="button"
              >
                <div className="rail-node">
                  <span>{state === "completed" ? "✓" : String(index + 1).padStart(2, "0")}</span>
                  {state === "active" && <i />}
                </div>
                <div className="rail-label"><small>{step.phase}</small><b>{step.name}</b></div>
                {index < runSteps.length - 1 && <span className="rail-arrow">→</span>}
              </button>
            );
          })}
        </div>
      </section>

      <section className={`active-workspace ${activeStep ? "has-active" : ""}`} aria-live="polite">
        <aside className="sequence-panel">
          <div className="panel-title"><span>ОЧЕРЕДЬ</span><b>20 Main agents</b></div>
          <div className="sequence-list">
            {runSteps.map((step, index) => {
              const state = stepState(index, currentStep);
              return (
                <button
                  aria-label={`Просмотреть шаг ${index + 1}: ${step.name}`}
                  aria-pressed={state === "active"}
                  className={`sequence-row ${state}`}
                  key={step.id}
                  onClick={() => reviewStep(index)}
                  type="button"
                >
                  <span className="sequence-index">{state === "completed" ? "✓" : index + 1}</span>
                  <div><b>{step.name}</b><small>{step.phase}</small></div>
                  <em>{state === "completed" ? "Готово" : state === "active" ? isRunning ? "Сейчас" : "Просмотр" : "Далее"}</em>
                </button>
              );
            })}
          </div>
        </aside>

        <article className="active-agent-card">
          {activeStep ? (
            <>
              <div className="active-agent-head">
                <div className="agent-orbit"><span>{String(currentStep + 1).padStart(2, "0")}</span><i /><i /></div>
                <div><span className="live-label"><i /> {isRunning ? "ВЫПОЛНЯЕТСЯ" : isComplete ? "ЗАВЕРШЕНО" : "ПРОСМОТР ШАГА"}</span><h2>{activeStep.name}</h2><p>{activeStep.action}</p></div>
              </div>
              <div className="data-flow">
                <div className="data-block input-data"><span>01 · ПОЛУЧЕНО</span><p>{activeStep.received}</p></div>
                <div className="flow-arrow"><i /> <span>ОБРАБОТКА</span> <i /></div>
                <div className="data-block output-data"><span>02 · РЕЗУЛЬТАТ</span><p>{activeStep.output}</p></div>
              </div>
              <div className="handoff-card">
                <div className="handoff-icon">↗</div>
                <div><span>ПЕРЕДАЁТ ДАЛЬШЕ</span><p>{activeStep.handoff}</p></div>
                <div className="handoff-target"><small>СЛЕДУЮЩИЙ</small><b>{currentStep < runSteps.length - 1 ? runSteps[currentStep + 1].name : "База знаний TenderLab"}</b></div>
              </div>
            </>
          ) : (
            <div className="run-empty">
              <div className="empty-orbit"><span>▶</span><i /><i /></div>
              <span>СЦЕНАРИЙ ГОТОВ</span>
              <h2>Запустите Main Agents Run</h2>
              <p>Система покажет действия агентов, решения и передачу данных на каждом шаге.</p>
              <button type="button" onClick={startRun}>RUN · начать симуляцию</button>
            </div>
          )}
        </article>

        <aside className="handoff-feed">
          <div className="panel-title"><span>ЖУРНАЛ</span><b>Передача данных</b></div>
          <div className="feed-list">
            {currentStep < 0 ? (
              <div className="feed-placeholder">События появятся после запуска.</div>
            ) : (
              runSteps.slice(0, currentStep + 1).reverse().slice(0, 6).map((step, reverseIndex) => {
                const originalIndex = currentStep - reverseIndex;
                return (
                  <div className={`feed-event ${reverseIndex === 0 ? "latest" : ""}`} key={step.id}>
                    <span>{String(originalIndex + 1).padStart(2, "0")}</span>
                    <div><b>{step.name}</b><p>{step.handoff}</p><small>{reverseIndex === 0 ? "только что" : `${reverseIndex * 3} мин назад`}</small></div>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      </section>

      <footer className="run-footer"><span>TenderLab.ai · Main Agents Run</span><span>Демонстрационный сценарий · данные вымышлены</span></footer>
    </main>
  );
}
