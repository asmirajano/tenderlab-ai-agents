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

const layerById = Object.fromEntries(layers.map((layer) => [layer.id, layer]));

export default function Home() {
  const [activeLayer, setActiveLayer] = useState<string>("all");
  const [mode, setMode] = useState<"all" | "core">("all");
  const [query, setQuery] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const visibleAgents = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return agents.filter((agent) => {
      const layerMatch = activeLayer === "all" || agent.layer === activeLayer;
      const modeMatch = mode === "all" || agent.core;
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
          <a href="#architecture">Architecture</a>
          <a href="#agents">Agents</a>
        </nav>
        <button className="core-jump" onClick={() => { setMode("core"); setActiveLayer("all"); document.getElementById("agents")?.scrollIntoView({ behavior: "smooth" }); }}>
          <span>●</span> Core 12
        </button>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span /> TENDER OPERATING SYSTEM</p>
          <h1>Company <b>→</b><br />Tender <b>→</b><br /><em>Win.</em></h1>
          <p className="hero-note">AI-отдел международных тендеров.<br />От профиля компании до исполнения.</p>
          <div className="metrics" aria-label="Platform metrics">
            <div><strong>64</strong><span>Agents</span></div>
            <div><strong>08</strong><span>Layers</span></div>
            <div><strong>01</strong><span>System</span></div>
          </div>
        </div>

        <div className="system-visual" aria-label="TenderLab agent architecture">
          <div className="orbit orbit-outer" />
          <div className="orbit orbit-inner" />
          <div className="system-core">
            <span className="pulse" />
            <small>ORCHESTRATED</small>
            <strong>TenderLab</strong>
            <em>OS</em>
          </div>
          {layers.map((layer, index) => (
            <button
              key={layer.id}
              className={`orbit-node node-${index + 1}`}
              style={{ "--layer-color": layer.color } as React.CSSProperties}
              onClick={() => selectLayer(layer.id)}
              aria-label={`Show ${layer.name} agents`}
            >
              <span>{layer.mark}</span>
              <b>{layer.name}</b>
              <small>{agents.filter((agent) => agent.layer === layer.id).length}</small>
            </button>
          ))}
          <div className="signal signal-a" />
          <div className="signal signal-b" />
          <div className="signal signal-c" />
        </div>
      </section>

      <section className="proof-strip" aria-label="Operating principle">
        <div><span>01</span><b>AI</b><small>находит</small></div>
        <i>→</i>
        <div><span>02</span><b>Evidence</b><small>проверяет</small></div>
        <i>→</i>
        <div><span>03</span><b>Human</b><small>утверждает</small></div>
      </section>

      <section className="architecture-section" id="architecture">
        <div className="section-heading compact-heading">
          <div>
            <p className="eyebrow"><span /> SYSTEM MAP</p>
            <h2>8 layers. One flow.</h2>
          </div>
          <p>COMPANY → UNIVERSE → MATCH → SOLUTION → BID → EXECUTION → LEARN</p>
        </div>

        <div className="layer-flow">
          {layers.map((layer) => {
            const count = agents.filter((agent) => agent.layer === layer.id).length;
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
              <button className={mode === "core" ? "active" : ""} onClick={() => setMode("core")}>Core 12</button>
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
              return (
                <button
                  className="agent-card"
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent)}
                  style={{ "--layer-color": layer.color } as React.CSSProperties}
                >
                  <span className="card-index">{String(agent.id).padStart(2, "0")}</span>
                  <span className="agent-symbol">{layer.mark}</span>
                  {agent.core && <span className="core-mark">CORE</span>}
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
              {selectedAgent.core && <em>CORE</em>}
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
            <div className="status-line"><span><i /> READY</span><b>TENDERLAB OS</b></div>
          </aside>
        </div>
      )}
    </main>
  );
}
