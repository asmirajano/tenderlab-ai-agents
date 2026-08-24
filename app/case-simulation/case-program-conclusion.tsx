"use client";

import type { ReactNode } from "react";

import {
  cumulativeValidation,
  missingCapabilityCandidates,
  programArchitectureConclusions,
  recurringBoundaryFindings,
} from "./case-program-conclusion-data";
import { useCaseExpansion } from "./case-expansion";

function ConclusionPanel({ id, label, className = "", children }: { id: string; label: string; className?: string; children: ReactNode }) {
  const [expanded, setExpanded] = useCaseExpansion(id, true);
  return <article className={`${className} ${expanded ? "is-expanded" : "is-collapsed"}`}>
    <button type="button" className="program-panel-toggle" aria-expanded={expanded} aria-controls={`${id}-content`} onClick={() => setExpanded((current) => !current)}><span>{label}</span><i aria-hidden="true">{expanded ? "−" : "+"}</i></button>
    <div id={`${id}-content`} hidden={!expanded}>{children}</div>
  </article>;
}

export default function CaseProgramConclusion({ onOpenAgent }: { onOpenAgent: (agentId: number) => void }) {
  const [expanded, setExpanded] = useCaseExpansion("program-conclusion", true);
  return (
    <section className={`case-program-conclusion ${expanded ? "is-expanded" : "is-collapsed"}`} aria-labelledby="case-program-conclusion-title">
      <div className="section-heading">
        <div><p>CASES 1–10 · CUMULATIVE VALIDATION</p><h2 id="case-program-conclusion-title">Итог 10-Case simulation programme</h2></div>
        <span>Coverage demonstrates practical relevance. It does not automatically approve Agent boundaries or create new Agents.</span>
        <button type="button" className="case-section-toggle" aria-expanded={expanded} aria-controls="program-conclusion-content" onClick={() => setExpanded((current) => !current)}><span>{expanded ? "Свернуть" : "Развернуть"}</span><i aria-hidden="true">{expanded ? "−" : "+"}</i></button>
      </div>
      <div id="program-conclusion-content" hidden={!expanded}>
      <div className="program-conclusion-metrics">
        <article><span>CASES</span><strong>{cumulativeValidation.caseCount}</strong><small>materially different scenarios</small></article>
        <article><span>CANONICAL AGENTS</span><strong>{cumulativeValidation.canonicalAgentCount}</strong><small>stable IDs preserved</small></article>
        <article><span>REQUIRED ≥ 1 CASE</span><strong>{cumulativeValidation.requiredAtLeastOnce.length}</strong><small>all Agents reached a defensible required state</small></article>
        <article><span>STRONGLY VALIDATED</span><strong>{cumulativeValidation.stronglyValidated.length}</strong><small>required in 7–10 Cases</small></article>
        <article className="is-review"><span>RARELY REQUIRED</span><strong>{cumulativeValidation.rarelyRequired.length}</strong><small>required in only 1–2 Cases</small></article>
        <article><span>NEVER REQUIRED</span><strong>{cumulativeValidation.neverRequired.length}</strong><small>after Case 10</small></article>
      </div>

      <div className="program-conclusion-grid">
        <ConclusionPanel id="strongly-validated-agents" label="STRONGLY VALIDATED AGENTS">
          <div className="program-agent-list">{cumulativeValidation.stronglyValidated.map((record) => (
            <button type="button" key={record.agentId} onClick={() => onOpenAgent(record.agentId)}>
              <b>{String(record.agentId).padStart(2, "0")} · {record.name}</b><small>{record.required}/10 required</small>
            </button>
          ))}</div>
        </ConclusionPanel>
        <ConclusionPanel id="rarely-required-agents" label="RARELY REQUIRED — KEEP TRIGGER-SPECIFIC" className="is-review">
          <div className="program-agent-list">{cumulativeValidation.rarelyRequired.map((record) => (
            <button type="button" key={record.agentId} onClick={() => onOpenAgent(record.agentId)}>
              <b>{String(record.agentId).padStart(2, "0")} · {record.name}</b><small>{record.required} required · {record.conditional + record.background} conditional/background</small>
            </button>
          ))}</div>
        </ConclusionPanel>
        <ConclusionPanel id="recurring-boundary-questions" label="RECURRING BOUNDARY QUESTIONS">
          <ul>{recurringBoundaryFindings.map((finding) => <li key={finding}>{finding}</li>)}</ul>
        </ConclusionPanel>
        <ConclusionPanel id="missing-capability-candidates" label="MISSING-CAPABILITY CANDIDATES — REVIEW, NOT AUTO-ADD" className="is-review">
          <div className="program-finding-list">{missingCapabilityCandidates.map((finding) => (
            <p key={finding.capability}><small>{finding.firstRaised}</small><b>{finding.capability}</b><span>{finding.evidence}</span></p>
          ))}</div>
        </ConclusionPanel>
        <ConclusionPanel id="major-architecture-conclusions" label="MAJOR ARCHITECTURE CONCLUSIONS" className="is-wide">
          <ul>{programArchitectureConclusions.map((finding) => <li key={finding}>{finding}</li>)}</ul>
        </ConclusionPanel>
      </div>
      </div>
    </section>
  );
}
