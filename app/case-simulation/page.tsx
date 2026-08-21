"use client";

import { useMemo, useState } from "react";
import {
  agents,
  getAgentTier,
  layerById,
  platformSideLabels,
  tierLabels,
  type Agent,
  type AgentTier,
  type PlatformSide,
} from "../page";
import TopNavigation from "../top-navigation";
import {
  case1,
  case1Engagements,
  caseStages,
  type CaseAgentEngagement,
  type EngagementStatus,
} from "./case-1-data";
import "./case-simulation.css";

type StatusFilter = "all" | EngagementStatus;
type TierFilter = "all" | AgentTier;

const statusLabels: Record<EngagementStatus, string> = {
  required: "Обязателен",
  conditional: "Условно",
  "not-involved": "Не участвует",
};

const statusShortLabels: Record<EngagementStatus, string> = {
  required: "CORE",
  conditional: "IF",
  "not-involved": "SKIP",
};

const tierRuLabels: Record<AgentTier, string> = {
  main: "Main",
  specialized: "Specialized",
  optional: "Optional",
};

const sideClasses: Record<PlatformSide, string> = {
  "command-center": "side-command",
  "client-side": "side-client",
  backend: "side-backend",
};

const futureCases = Array.from({ length: 9 }, (_, index) => index + 2);
const engagementByAgentId = new Map(case1Engagements.map((engagement) => [engagement.agentId, engagement]));

function countByStatus(records: CaseAgentEngagement[]) {
  return {
    required: records.filter((record) => record.status === "required").length,
    conditional: records.filter((record) => record.status === "conditional").length,
    "not-involved": records.filter((record) => record.status === "not-involved").length,
  };
}

function PlatformBadges({ agent, compact = false }: { agent: Agent; compact?: boolean }) {
  return (
    <span className={`case-platform-badges ${compact ? "is-compact" : ""}`} aria-label="Сторона платформы">
      {agent.platformSides.map((side) => (
        <i className={sideClasses[side]} key={side}>{platformSideLabels[side]}</i>
      ))}
    </span>
  );
}

export default function CaseSimulationPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);

  const metrics = useMemo(() => countByStatus(case1Engagements), []);
  const conditionalTriggered = case1Engagements.filter((record) => record.status === "conditional" && record.activation === "triggered").length;
  const conditionalStandby = case1Engagements.filter((record) => record.status === "conditional" && record.activation === "standby").length;

  const tierMetrics = useMemo(() => (["main", "specialized", "optional"] as AgentTier[]).map((tier) => {
    const records = agents
      .filter((agent) => getAgentTier(agent.id) === tier)
      .map((agent) => engagementByAgentId.get(agent.id)!);
    return { tier, total: records.length, ...countByStatus(records) };
  }), []);

  const platformMetrics = useMemo(() => (["command-center", "client-side", "backend"] as PlatformSide[]).map((side) => {
    const records = agents
      .filter((agent) => agent.platformSides.includes(side))
      .map((agent) => engagementByAgentId.get(agent.id)!);
    return {
      side,
      total: records.length,
      engaged: records.filter((record) => record.status !== "not-involved").length,
    };
  }), []);

  const filteredAgents = useMemo(() => agents.filter((agent) => {
    const engagement = engagementByAgentId.get(agent.id)!;
    const normalizedQuery = query.trim().toLowerCase();
    return (statusFilter === "all" || engagement.status === statusFilter)
      && (tierFilter === "all" || getAgentTier(agent.id) === tierFilter)
      && (stageFilter === "all" || engagement.stageId === stageFilter)
      && (!normalizedQuery || agent.name.toLowerCase().includes(normalizedQuery) || agent.description.toLowerCase().includes(normalizedQuery));
  }), [query, stageFilter, statusFilter, tierFilter]);

  const groupedRows = useMemo(() => caseStages.map((stage) => ({
    stage,
    agents: filteredAgents.filter((agent) => engagementByAgentId.get(agent.id)?.stageId === stage.id),
  })).filter((group) => group.agents.length > 0), [filteredAgents]);

  const selectedAgent = selectedAgentId ? agents.find((agent) => agent.id === selectedAgentId) ?? null : null;
  const selectedEngagement = selectedAgent ? engagementByAgentId.get(selectedAgent.id) ?? null : null;
  const selectedStage = selectedEngagement ? caseStages.find((stage) => stage.id === selectedEngagement.stageId) ?? null : null;

  const openAdjacentAgent = (direction: -1 | 1) => {
    if (!selectedAgent) return;
    const index = filteredAgents.findIndex((agent) => agent.id === selectedAgent.id);
    if (index < 0) return;
    const nextIndex = Math.min(Math.max(index + direction, 0), filteredAgents.length - 1);
    setSelectedAgentId(filteredAgents[nextIndex]?.id ?? selectedAgent.id);
  };

  return (
    <main className="case-audit-page">
      <TopNavigation active="case-simulation" />

      <section className="case-audit-hero">
        <div>
          <p className="case-eyebrow"><span /> АУДИТ АРХИТЕКТУРЫ · КЕЙС 01</p>
          <h1>Case Simulation<br /><em>Agent Engagement</em></h1>
          <p>Практическая проверка участия 64 агентов в одном полном маршруте — от обнаружения закупки до исполнения контракта.</p>
        </div>
        <div className="case-audit-version">
          <span>МЕТОДИКА</span>
          <b>CASE 01 · V1</b>
          <small>Следующие кейсы добавляются только после аудита текущего.</small>
        </div>
      </section>

      <section className="case-dossier" aria-label="Параметры Case 1">
        <div className="case-dossier-title">
          <span>DEMO · {case1.id}</span>
          <h2>{case1.name}</h2>
          <p>{case1.situation}</p>
        </div>
        <div className="case-dossier-facts">
          <article><small>КОМПАНИЯ</small><b>{case1.company}</b><span>{case1.companyCountry} · {case1.companyType}</span></article>
          <article><small>ОРГАНИЗАТОР</small><b>{case1.organizerCountry}</b><span>{case1.organizer} · {case1.funding}</span></article>
          <article><small>ТИП / ПРЕДМЕТ</small><b>{case1.tenderType}</b><span>{case1.subject}</span></article>
          <article><small>ЛОТ / БЮДЖЕТ</small><b>{case1.budget}</b><span>{case1.lot} · {case1.quantity}</span></article>
          <article><small>ПРОЦЕДУРА</small><b>{case1.procurementMethod}</b><span>Подача: {case1.submissionWindow} · исполнение: {case1.deliveryWindow}</span></article>
        </div>
      </section>

      <section className="case-audit-metrics" aria-label="Метрики участия агентов">
        <article className="metric-total"><span>ВСЕГО АГЕНТОВ</span><strong>64</strong><small>единый canonical registry</small></article>
        <article className="metric-required"><span>ОБЯЗАТЕЛЬНЫЕ</span><strong>{metrics.required}</strong><small>реально выполняются</small></article>
        <article className="metric-conditional"><span>УСЛОВНЫЕ</span><strong>{metrics.conditional}</strong><small>{conditionalTriggered} сработали · {conditionalStandby} в резерве</small></article>
        <article className="metric-skipped"><span>НЕ УЧАСТВУЮТ</span><strong>{metrics["not-involved"]}</strong><small>есть объяснение skip</small></article>
        <article className="metric-gap"><span>НЕПОКРЫТЫЕ ДЕЙСТВИЯ</span><strong>0<sup>предв.</sup></strong><small>подлежит экспертной проверке</small></article>
      </section>

      <section className="case-audit-breakdown">
        <div className="breakdown-block">
          <div className="section-kicker"><span>КЛАСС АГЕНТА</span><b>статус участия</b></div>
          <div className="tier-breakdown">
            {tierMetrics.map((item) => (
              <article key={item.tier}>
                <span className={`tier-dot tier-${item.tier}`} />
                <b>{tierRuLabels[item.tier]} <small>{item.total}</small></b>
                <p><i>{item.required} core</i><i>{item.conditional} if</i><i>{item["not-involved"]} skip</i></p>
              </article>
            ))}
          </div>
        </div>
        <div className="breakdown-block">
          <div className="section-kicker"><span>СТОРОНА ПЛАТФОРМЫ</span><b>пересекающиеся группы</b></div>
          <div className="platform-breakdown">
            {platformMetrics.map((item) => (
              <article key={item.side}>
                <span className={sideClasses[item.side]}>{platformSideLabels[item.side]}</span>
                <b>{item.engaged}<small> / {item.total}</small></b>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="engagement-flow" aria-label="Последовательность участия">
        <div className="section-heading">
          <div><p>ЦЕПОЧКА ВЫПОЛНЕНИЯ →</p><h2>Этапы, агенты и передаваемый результат</h2></div>
          <span>Conditional учитываются отдельно от обязательного маршрута.</span>
        </div>
        <div className="stage-rail">
          {caseStages.map((stage) => {
            const stageRecords = case1Engagements.filter((record) => record.stageId === stage.id);
            const required = stageRecords.filter((record) => record.status === "required").length;
            const conditional = stageRecords.filter((record) => record.status === "conditional").length;
            return (
              <article className="stage-card" key={stage.id}>
                <div><span>{stage.number}</span><small>{required} core{conditional ? ` · ${conditional} if` : ""}</small></div>
                <h3>{stage.title}</h3>
                <p>{stage.description}</p>
                <footer><small>ПЕРЕДАЁТ ДАЛЬШЕ</small><b>{stage.handoff}</b></footer>
              </article>
            );
          })}
        </div>
      </section>

      <section className="engagement-matrix-section">
        <div className="section-heading matrix-heading">
          <div><p>CASES × 64 AGENTS</p><h2>Матрица вовлечения</h2></div>
          <span>Нажмите статус Case 1, чтобы увидеть input, output и handoff.</span>
        </div>

        <div className="matrix-toolbar" aria-label="Фильтры матрицы">
          <label className="matrix-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти агента" /></label>
          <div className="matrix-segment" aria-label="Фильтр статуса">
            {(["all", "required", "conditional", "not-involved"] as StatusFilter[]).map((status) => (
              <button key={status} type="button" aria-pressed={statusFilter === status} onClick={() => setStatusFilter(status)}>
                {status === "all" ? "Все" : statusLabels[status]}
              </button>
            ))}
          </div>
          <div className="matrix-segment" aria-label="Фильтр класса агента">
            {(["all", "main", "specialized", "optional"] as TierFilter[]).map((tier) => (
              <button key={tier} type="button" aria-pressed={tierFilter === tier} onClick={() => setTierFilter(tier)}>
                {tier === "all" ? "Все классы" : tierLabels[tier]}
              </button>
            ))}
          </div>
          <label className="stage-select"><span>ЭТАП</span><select value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}><option value="all">Все этапы</option>{caseStages.map((stage) => <option value={stage.id} key={stage.id}>{stage.number} · {stage.title}</option>)}</select></label>
          <span className="matrix-result-count">{filteredAgents.length} / 64</span>
        </div>

        <div className="matrix-legend" aria-label="Легенда матрицы">
          <span className="legend-required"><i /> Обязателен</span>
          <span className="legend-conditional"><i /> Условно</span>
          <span className="legend-skipped"><i /> Не участвует</span>
          <small>Conditional: сплошная метка — условие сработало; контурная — резерв.</small>
        </div>

        <div className="matrix-scroll" aria-label="Прокручиваемая матрица Case 1 и будущих кейсов">
          <table className="engagement-matrix">
            <thead>
              <tr>
                <th className="agent-column"><span>AGENTS</span><b>64 архитектурных роли</b></th>
                <th className="case-one-column"><span>CASE 01 · ACTIVE</span><b>Школьная мебель</b><small>Грузия · $3,85 млн</small></th>
                {futureCases.map((caseNumber) => <th className="future-case" key={caseNumber}><span>CASE {String(caseNumber).padStart(2, "0")}</span><b>После аудита</b></th>)}
              </tr>
            </thead>
            <tbody>
              {groupedRows.map(({ stage, agents: stageAgents }) => (
                <StageRows stage={stage} stageAgents={stageAgents} onSelect={setSelectedAgentId} key={stage.id} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="case-audit-findings" aria-label="Предварительные архитектурные наблюдения">
        <div className="section-heading"><div><p>ARCHITECTURE REVIEW</p><h2>Что Case 1 уже позволяет проверить</h2></div><span>Это наблюдения V1, а не окончательные выводы.</span></div>
        <div className="finding-grid">
          <article><span>01 · ПЕРЕСЕЧЕНИЕ</span><h3>Partner Discovery vs Local Representation</h3><p>Широкий Partner Discovery намеренно пропущен: для локального сервиса более точен Local Representation. Нужно подтвердить границу scopes.</p></article>
          <article><span>02 · ОСОЗНАННЫЙ SKIP</span><h3>Supplier-side chain</h3><p>Supplier Intelligence, Discovery, Verification, RFQ и Quotation Normalization не запускаются: компания производит весь предмет одного лота сама.</p></article>
          <article><span>03 · РЕЗЕРВ</span><h3>Document exception route</h3><p>OCR, Amendment и Ambiguity остаются conditional standby. Их нельзя считать выполненными без скана, addendum или реального противоречия.</p></article>
        </div>
      </section>

      {selectedAgent && selectedEngagement && selectedStage && (
        <div className="case-detail-shell" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedAgentId(null); }}>
          <aside className="case-detail" role="dialog" aria-modal="true" aria-labelledby="case-agent-title">
            <button className="case-detail-close" type="button" onClick={() => setSelectedAgentId(null)} aria-label="Закрыть">×</button>
            <div className="case-detail-meta"><span>AGENT {String(selectedAgent.id).padStart(2, "0")}</span><b>{selectedStage.number} · {selectedStage.title}</b></div>
            <div className="case-detail-title">
              <i style={{ "--agent-color": layerById[selectedAgent.layer].color } as React.CSSProperties}>{layerById[selectedAgent.layer].mark}</i>
              <div><h2 id="case-agent-title">{selectedAgent.name}</h2><p>{selectedAgent.description}</p></div>
            </div>
            <div className="case-detail-tags">
              <span className={`case-status status-${selectedEngagement.status}`}>{statusLabels[selectedEngagement.status]}</span>
              <span>{tierLabels[getAgentTier(selectedAgent.id)]}</span>
              <span>{layerById[selectedAgent.layer].number} · {layerById[selectedAgent.layer].name}</span>
              <PlatformBadges agent={selectedAgent} />
            </div>

            <section className="detail-reason">
              <div><small>КОГДА</small><b>{selectedEngagement.when}</b></div>
              <div><small>ПОЧЕМУ</small><b>{selectedEngagement.why}</b></div>
              {selectedEngagement.condition && <div className={`detail-condition condition-${selectedEngagement.activation}`}><small>УСЛОВИЕ</small><b>{selectedEngagement.condition}</b></div>}
            </section>

            {selectedEngagement.status === "not-involved" ? (
              <section className="detail-skip">
                <span>SKIP ОБОСНОВАН</span>
                <h3>Практической роли в Case 1 нет</h3>
                <p>{selectedEngagement.coveredBy}</p>
              </section>
            ) : (
              <section className="detail-io" aria-label="Input, output и handoff">
                <article><span>01 · INPUT</span><p>{selectedEngagement.input}</p></article>
                <i>→</i>
                <article className="detail-output"><span>02 · RESULT / OUTPUT</span><p>{selectedEngagement.output}</p><small>CANONICAL DELIVERABLE · {selectedAgent.output.primary}</small></article>
                <i>→</i>
                <article><span>03 · NEXT / HANDOFF</span><p>{selectedEngagement.next}</p></article>
              </section>
            )}

            <footer className="case-detail-footer">
              <button type="button" onClick={() => openAdjacentAgent(-1)} disabled={filteredAgents[0]?.id === selectedAgent.id}>← Предыдущий</button>
              <span>CASE 01 · V1</span>
              <button type="button" onClick={() => openAdjacentAgent(1)} disabled={filteredAgents.at(-1)?.id === selectedAgent.id}>Следующий →</button>
            </footer>
          </aside>
        </div>
      )}
    </main>
  );
}

function StageRows({ stage, stageAgents, onSelect }: { stage: (typeof caseStages)[number]; stageAgents: Agent[]; onSelect: (agentId: number) => void }) {
  return (
    <>
      <tr className="matrix-stage-row">
        <th colSpan={11}><span>{stage.number}</span><b>{stage.title}</b><small>{stageAgents.length} агентов в текущем фильтре</small></th>
      </tr>
      {stageAgents.map((agent) => {
        const engagement = engagementByAgentId.get(agent.id)!;
        const tier = getAgentTier(agent.id);
        return (
          <tr key={agent.id}>
            <th className="agent-column agent-matrix-card" scope="row">
              <span className="matrix-agent-id">{String(agent.id).padStart(2, "0")}</span>
              <i className="matrix-agent-mark" style={{ "--agent-color": layerById[agent.layer].color } as React.CSSProperties}>{layerById[agent.layer].mark}</i>
              <span className="matrix-agent-copy"><b>{agent.name}</b><small>{layerById[agent.layer].name} · {tierRuLabels[tier]}</small></span>
              <PlatformBadges agent={agent} compact />
            </th>
            <td className="case-one-column">
              <button className={`engagement-cell cell-${engagement.status} ${engagement.activation ? `cell-${engagement.activation}` : ""}`} type="button" onClick={() => onSelect(agent.id)} aria-label={`${agent.name}: ${statusLabels[engagement.status]}`}>
                <span>{statusShortLabels[engagement.status]}</span>
                <b>{statusLabels[engagement.status]}</b>
                <small>{engagement.status === "conditional" ? (engagement.activation === "triggered" ? "условие сработало" : "резерв") : engagement.when}</small>
              </button>
            </td>
            {futureCases.map((caseNumber) => <td className="future-case" key={caseNumber}><span>—</span></td>)}
          </tr>
        );
      })}
    </>
  );
}
