"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  agents,
  getAgentTier,
  layerById,
  layers,
  platformFilterOptions,
  tierLabels,
  type Agent,
  type AgentTier,
  type PlatformFilter,
} from "../packages/catalog-data/src/agents";
import { buildAgentAnalysisMap, buildAgentValidationRows } from "./agent-comparison";
import {
  AgentReviewBadge,
  AgentReviewControl,
  agentReviewOptions,
  type AgentReviewFilter,
} from "./agent-workspace";

type MatrixProps = {
  visibleAgents: Agent[];
  query: string;
  mode: "all" | AgentTier;
  activeLayer: string;
  platformFilter: PlatformFilter;
  reviewFilter: AgentReviewFilter;
  selectedIds: number[];
  onQueryChange: (value: string) => void;
  onModeChange: (value: "all" | AgentTier) => void;
  onLayerChange: (value: string) => void;
  onPlatformChange: (value: PlatformFilter) => void;
  onReviewFilterChange: (value: AgentReviewFilter) => void;
  onOpenAgent: (agent: Agent) => void;
  onToggleCompare: (agentId: number) => void;
  onCompare: () => void;
};

export default function AgentMatrixView({
  visibleAgents,
  query,
  mode,
  activeLayer,
  platformFilter,
  reviewFilter,
  selectedIds,
  onQueryChange,
  onModeChange,
  onLayerChange,
  onPlatformChange,
  onReviewFilterChange,
  onOpenAgent,
  onToggleCompare,
  onCompare,
}: MatrixProps) {
  const [hiddenIds, setHiddenIds] = useState<Set<number>>(new Set());
  const [focusMode, setFocusMode] = useState(false);
  const displayedAgents = useMemo(
    () => visibleAgents.filter((agent) => !hiddenIds.has(agent.id)),
    [hiddenIds, visibleAgents],
  );
  const hiddenAgents = useMemo(
    () => agents.filter((agent) => hiddenIds.has(agent.id)),
    [hiddenIds],
  );
  const analyses = useMemo(
    () => buildAgentAnalysisMap(displayedAgents, agents),
    [displayedAgents],
  );
  const rows = useMemo(() => buildAgentValidationRows(analyses, "matrix", onOpenAgent), [analyses, onOpenAgent]);

  useEffect(() => {
    if (!focusMode) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFocusMode(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [focusMode]);

  const hideAgent = (agentId: number) => {
    setHiddenIds((current) => new Set(current).add(agentId));
  };

  const restoreAgent = (agentId: number) => {
    setHiddenIds((current) => {
      const next = new Set(current);
      next.delete(agentId);
      return next;
    });
  };

  return (
    <section
      className={`agent-matrix-view ${focusMode ? "is-focus" : ""}`.trim()}
      aria-label="Full 64-Agent architecture matrix"
      aria-modal={focusMode || undefined}
      role={focusMode ? "dialog" : undefined}
    >
      <header className="matrix-heading">
        <div>
          <span>AGENT ARCHITECTURE VALIDATION</span>
          <h3>64-Agent Matrix</h3>
          <p>Columns = Agents · Rows = 18 canonical dimensions · boundaries and review findings stay visible across all 64 profiles.</p>
        </div>
        <div className="matrix-metrics" aria-label="Matrix coverage">
          <span><b>{displayedAgents.length}</b> visible</span>
          <span><b>{selectedIds.length}</b> selected</span>
          <span><b>{hiddenIds.size}</b> hidden</span>
        </div>
        <button
          type="button"
          className="matrix-focus-toggle"
          aria-pressed={focusMode}
          onClick={() => setFocusMode((current) => !current)}
        >
          <span>{focusMode ? "↙" : "⛶"}</span>{focusMode ? "Exit Focus" : "Focus Mode"}
        </button>
      </header>

      <div className="matrix-toolbar" aria-label="Matrix filters and actions">
        <label className="matrix-search"><span>SEARCH</span><input type="search" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="ID, name or purpose" /></label>
        <label><span>CLASS</span><select value={mode} onChange={(event) => onModeChange(event.target.value as "all" | AgentTier)}><option value="all">All classes</option><option value="main">Main</option><option value="specialized">Specialized</option><option value="optional">Optional</option></select></label>
        <label><span>LAYER</span><select value={activeLayer} onChange={(event) => onLayerChange(event.target.value)}><option value="all">All layers</option>{layers.map((layer) => <option value={layer.id} key={layer.id}>{layer.number} · {layer.name}</option>)}</select></label>
        <label><span>PLATFORM SIDE</span><select value={platformFilter} onChange={(event) => onPlatformChange(event.target.value as PlatformFilter)}>{platformFilterOptions.map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}</select></label>
        <label><span>MY REVIEW STATUS</span><select value={reviewFilter} onChange={(event) => onReviewFilterChange(event.target.value as AgentReviewFilter)}>{agentReviewOptions.map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}</select></label>
        <details className="matrix-hidden-menu">
          <summary>Hidden {hiddenIds.size}</summary>
          <div>
            {hiddenAgents.length ? hiddenAgents.map((agent) => <button type="button" onClick={() => restoreAgent(agent.id)} key={agent.id}><b>{String(agent.id).padStart(2, "0")}</b>{agent.name}<span>Show</span></button>) : <p>No hidden Agents.</p>}
            {hiddenAgents.length > 1 && <button type="button" className="matrix-show-all" onClick={() => setHiddenIds(new Set())}>Show all hidden Agents</button>}
          </div>
        </details>
        <button type="button" className="matrix-compare-action" disabled={selectedIds.length < 2} onClick={onCompare}>Compare {selectedIds.length || ""}<span>↗</span></button>
      </div>

      <div className="matrix-scroll" role="region" aria-label="Scrollable 64-Agent comparison matrix">
        {displayedAgents.length ? (
          <table className="agent-matrix-table">
            <thead>
              <tr>
                <th>DIMENSION</th>
                {displayedAgents.map((agent) => {
                  const selected = selectedIds.includes(agent.id);
                  return (
                    <th style={{ "--matrix-layer": layerById[agent.layer].color } as CSSProperties} key={agent.id}>
                      <span>{String(agent.id).padStart(2, "0")} · {layerById[agent.layer].name}</span>
                      <button type="button" className="matrix-agent-name" onClick={() => onOpenAgent(agent)}>{agent.name}</button>
                      <small>{tierLabels[getAgentTier(agent.id)]}</small>
                      <AgentReviewControl agentId={agent.id} canonicalRegistryId={agent.registryId} compact />
                      <div>
                        <button type="button" aria-pressed={selected} onClick={() => onToggleCompare(agent.id)}>{selected ? "✓ Selected" : "+ Compare"}</button>
                        <button type="button" onClick={() => hideAgent(agent.id)}>Hide</button>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              <tr className="matrix-review-status-row">
                <th scope="row"><span>My review status</span></th>
                {displayedAgents.map((agent) => <td key={agent.id}><AgentReviewBadge agentId={agent.id} /></td>)}
              </tr>
              {rows.map((row) => (
                <tr key={row.id}>
                  <th scope="row"><span>{row.label}</span></th>
                  {displayedAgents.map((agent) => <td key={agent.id}>{row.render(agent)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="matrix-empty"><strong>No visible Agents</strong><p>Reset filters or restore temporarily hidden Agent columns.</p><button type="button" onClick={() => setHiddenIds(new Set())}>Show hidden Agents</button></div>
        )}
      </div>

      <footer className="matrix-footer">
        <p><b>ONE SOURCE OF TRUTH:</b> Matrix, Compare, Agent Cards, Hierarchy and Network share the same enriched canonical 64-Agent registry. Overlap findings are review signals, not merge decisions.</p>
        <span>Shift + mouse wheel or trackpad to inspect Agent columns →</span>
      </footer>
    </section>
  );
}
