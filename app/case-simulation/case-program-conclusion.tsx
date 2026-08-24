"use client";

import {
  cumulativeValidation,
  missingCapabilityCandidates,
  programArchitectureConclusions,
  recurringBoundaryFindings,
} from "./case-program-conclusion-data";

export default function CaseProgramConclusion({ onOpenAgent }: { onOpenAgent: (agentId: number) => void }) {
  return (
    <section className="case-program-conclusion" aria-labelledby="case-program-conclusion-title">
      <div className="section-heading">
        <div><p>CASES 1–10 · CUMULATIVE VALIDATION</p><h2 id="case-program-conclusion-title">Итог 10-Case simulation programme</h2></div>
        <span>Coverage demonstrates practical relevance. It does not automatically approve Agent boundaries or create new Agents.</span>
      </div>

      <div className="program-conclusion-metrics">
        <article><span>CASES</span><strong>{cumulativeValidation.caseCount}</strong><small>materially different scenarios</small></article>
        <article><span>CANONICAL AGENTS</span><strong>{cumulativeValidation.canonicalAgentCount}</strong><small>stable IDs preserved</small></article>
        <article><span>REQUIRED ≥ 1 CASE</span><strong>{cumulativeValidation.requiredAtLeastOnce.length}</strong><small>all Agents reached a defensible required state</small></article>
        <article><span>STRONGLY VALIDATED</span><strong>{cumulativeValidation.stronglyValidated.length}</strong><small>required in 7–10 Cases</small></article>
        <article className="is-review"><span>RARELY REQUIRED</span><strong>{cumulativeValidation.rarelyRequired.length}</strong><small>required in only 1–2 Cases</small></article>
        <article><span>NEVER REQUIRED</span><strong>{cumulativeValidation.neverRequired.length}</strong><small>after Case 10</small></article>
      </div>

      <div className="program-conclusion-grid">
        <article>
          <span>STRONGLY VALIDATED AGENTS</span>
          <div className="program-agent-list">{cumulativeValidation.stronglyValidated.map((record) => (
            <button type="button" key={record.agentId} onClick={() => onOpenAgent(record.agentId)}>
              <b>{String(record.agentId).padStart(2, "0")} · {record.name}</b><small>{record.required}/10 required</small>
            </button>
          ))}</div>
        </article>
        <article className="is-review">
          <span>RARELY REQUIRED — KEEP TRIGGER-SPECIFIC</span>
          <div className="program-agent-list">{cumulativeValidation.rarelyRequired.map((record) => (
            <button type="button" key={record.agentId} onClick={() => onOpenAgent(record.agentId)}>
              <b>{String(record.agentId).padStart(2, "0")} · {record.name}</b><small>{record.required} required · {record.conditional + record.background} conditional/background</small>
            </button>
          ))}</div>
        </article>
        <article>
          <span>RECURRING BOUNDARY QUESTIONS</span>
          <ul>{recurringBoundaryFindings.map((finding) => <li key={finding}>{finding}</li>)}</ul>
        </article>
        <article className="is-review">
          <span>MISSING-CAPABILITY CANDIDATES — REVIEW, NOT AUTO-ADD</span>
          <div className="program-finding-list">{missingCapabilityCandidates.map((finding) => (
            <p key={finding.capability}><small>{finding.firstRaised}</small><b>{finding.capability}</b><span>{finding.evidence}</span></p>
          ))}</div>
        </article>
        <article className="is-wide">
          <span>MAJOR ARCHITECTURE CONCLUSIONS</span>
          <ul>{programArchitectureConclusions.map((finding) => <li key={finding}>{finding}</li>)}</ul>
        </article>
      </div>
    </section>
  );
}
