import { useMemo, useState } from "react";
import {
  buildAllMatches,
  createCaseResult,
  demoSnapshot,
  demoSuppliers,
  demoTenders,
  loadCaseResult,
  saveCaseResult,
  setConsultantDecision,
  type ConsultantDecision,
  type SupplierRecord,
  type TenderMatchCaseResult,
  type TenderRecord,
} from "../../../packages/tenderboost/src/index";

// The legacy filename/package path is intentionally retained for migration traceability.
type WorkspaceTab = "overview" | "match" | "audit";

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 72);
}

function caseIdFor(tender: TenderRecord, supplier: SupplierRecord) {
  return `case:TM-DEMO:${slug(tender.reference)}:${slug(supplier.id)}`;
}

function deadlineLabel(value: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Asia/Tashkent" }).format(new Date(value));
}

export default function TenderMatchApp() {
  const sessionNow = useMemo(() => new Date().toISOString(), []);
  const allMatches = useMemo(() => buildAllMatches(demoTenders, demoSuppliers, sessionNow), [sessionNow]);
  const initialMatch = allMatches.find((item) => (item.auditedMatch.value ?? -1) > 0 && item.tenderFreshness.status !== "closed")
    ?? allMatches.find((item) => (item.auditedMatch.value ?? -1) > 0)
    ?? allMatches[0];
  const initialTender = demoTenders.find((item) => item.id === initialMatch.tenderId) ?? demoTenders[0];
  const initialSupplier = demoSuppliers.find((item) => item.id === initialMatch.supplierId) ?? demoSuppliers[0];
  const [result, setResult] = useState(() => createCaseResult(caseIdFor(initialTender, initialSupplier), initialTender, initialSupplier, sessionNow));
  const [tab, setTab] = useState<WorkspaceTab>("overview");
  const [persistenceMessage, setPersistenceMessage] = useState("Not saved in this browser session");
  const [actionError, setActionError] = useState<string | null>(null);

  const tender = demoTenders.find((item) => item.id === result.tenderIdentity.id) ?? initialTender;
  const supplier = demoSuppliers.find((item) => item.id === result.supplierIdentity.id) ?? initialSupplier;
  const evaluatedPairs = allMatches.filter((item) => item.matchScore.value !== null).length;
  const unassessedPairs = allMatches.length - evaluatedPairs;
  const auditedPairs = allMatches.filter((item) => item.auditedMatch.value !== null).length;
  const incompleteAuditedPairs = allMatches.filter((item) => item.exactLegacyPair && item.auditedMatch.value === null).length;

  const runAction = (action: () => TenderMatchCaseResult) => {
    try {
      setResult(action());
      setActionError(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "The requested action could not be completed.");
    }
  };

  const selectPair = (nextTenderId: string, nextSupplierId: string) => {
    const nextTender = demoTenders.find((item) => item.id === nextTenderId) ?? tender;
    const nextSupplier = demoSuppliers.find((item) => item.id === nextSupplierId) ?? supplier;
    setResult(createCaseResult(caseIdFor(nextTender, nextSupplier), nextTender, nextSupplier, new Date().toISOString()));
    setPersistenceMessage("Not saved in this browser session");
    setActionError(null);
  };

  const decide = (decision: ConsultantDecision) => runAction(() => setConsultantDecision(result, decision, new Date().toISOString(), {
    actorId: "local-consultant-demo",
    rationale: `Consultant recorded ${decision} through the TenderMatch review workspace.`,
  }));

  const saveCase = () => {
    saveCaseResult(window.localStorage, result);
    setPersistenceMessage(`Saved explicit Case ${result.caseIdentity.id}`);
  };

  const loadCase = () => {
    try {
      const saved = loadCaseResult(window.localStorage, result.caseIdentity.id, {
        tender,
        supplier,
        nowIso: new Date().toISOString(),
      });
      if (!saved) {
        setPersistenceMessage(`No saved result exists for ${result.caseIdentity.id}`);
        return;
      }
      setResult(saved);
      setPersistenceMessage(`Reconstructed ${saved.resultIdentity.id}`);
      setActionError(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "The saved Case could not be reconstructed.");
    }
  };

  return (
    <main className="tb3-page">
      <section className="tb3-hero">
        <div className="tb3-hero-copy">
          <p><span /> TENDERAPPS AGENT 03 · DATED DEMONSTRATION</p>
          <h1>Tender<em>Match</em></h1>
          <h2>Evidence-linked Company × Tender evaluation and consultant decision support.</h2>
          <p className="tb3-hero-description">Select one pair, compare the frozen TenderBoost estimate with the audited result, inspect evidence and gaps, and record a human decision. Participation design and Bid/No-Bid remain separate downstream responsibilities.</p>
          <div className="tb3-hero-actions">
            <button onClick={() => setTab("match")}>Review selected match →</button>
            <button className="secondary" onClick={() => setTab("audit")}>Open Case audit</button>
          </div>
        </div>
        <aside className="tb3-result-card">
          <span>PRIMARY CASE RESULT</span>
          <div className="tb3-score-orbit"><strong>{result.match.auditedMatch.value ?? "—"}</strong><small>{result.match.auditedMatch.value === null ? "MISSING" : "/100"}</small></div>
          <h2>{supplier.legalEnglishName}</h2>
          <p>{tender.reference} · {tender.object}</p>
          <dl>
            <div><dt>Audited Match Support</dt><dd>{result.match.auditedMatch.value === null ? "Insufficient evidence · MISSING" : `${result.match.auditedMatch.value} · ${result.match.auditedMatch.label}`}</dd></div>
            <div><dt>Legacy Match Score</dt><dd>{result.match.matchScore.value === null ? "Not evaluated · MISSING" : `${result.match.matchScore.value} · historical estimate`}</dd></div>
            <div><dt>Consultant decision</dt><dd>{result.match.consultantDecision}</dd></div>
            <div><dt>Current-decision support</dt><dd>{result.reviewSupport.readyForCurrentDecision ? "ready" : `${result.reviewSupport.findings.length} findings`}</dd></div>
            <div><dt>Workflow</dt><dd>{result.workflowState}</dd></div>
          </dl>
        </aside>
      </section>

      <section className="tb3-snapshot" role="status">
        <div><span>SNAPSHOT</span><strong>{demoSnapshot.classification}</strong><small>Frozen {deadlineLabel(demoSnapshot.asOf)} · source commit {demoSnapshot.sourceCommit.slice(0, 7)}</small></div>
        <p>Deadlines are absolute. Urgency is recalculated from the supplied clock and never changes Match Support.</p>
        <b>{result.match.tenderFreshness.freshness.toUpperCase()} · {result.match.tenderFreshness.status.toUpperCase()}</b>
      </section>

      <section className="tb3-metrics" aria-label="Demonstration dataset summary">
        <article><span>01</span><b>{demoSnapshot.tenderCount}</b><p>Tenders in dated snapshot</p></article>
        <article><span>02</span><b>{demoSnapshot.supplierCount}</b><p>Supplier profiles</p></article>
        <article><span>03</span><b>{evaluatedPairs}</b><p>Evaluated pairs · {unassessedPairs} not evaluated</p></article>
        <article><span>04</span><b>{auditedPairs}</b><p>Audited scores · {incompleteAuditedPairs} assessed pairs remain MISSING</p></article>
      </section>

      <section className="tb3-case-controls">
        <label><span>TENDER</span><select value={tender.id} onChange={(event) => selectPair(event.target.value, supplier.id)}>{demoTenders.map((item) => <option key={item.id} value={item.id}>{item.reference} · {item.object}</option>)}</select></label>
        <label><span>COMPANY</span><select value={supplier.id} onChange={(event) => selectPair(tender.id, event.target.value)}>{demoSuppliers.map((item) => <option key={item.id} value={item.id}>{item.legalEnglishName}</option>)}</select></label>
        <div><span>EXPLICIT CASE ID</span><code>{result.caseIdentity.id}</code></div>
        <div className="tb3-persistence-actions"><button onClick={saveCase}>Save this Case</button><button onClick={loadCase}>Load this Case</button><small>{persistenceMessage}</small></div>
      </section>

      <nav className="tb3-tabs" aria-label="TenderMatch workspace">
        {(["overview", "match", "audit"] as WorkspaceTab[]).map((item, index) => <button aria-current={tab === item ? "page" : undefined} className={tab === item ? "active" : ""} key={item} onClick={() => setTab(item)}><span>0{index + 1}</span>{item === "match" ? "Match review" : item}</button>)}
      </nav>

      {actionError && <div className="tb3-action-error" role="alert"><strong>Action blocked</strong><span>{actionError}</span></div>}

      {tab === "overview" && <section className="tb3-workspace tb3-overview">
        <article className="tb3-flow-card">
          <header><span>CLIENT OUTCOME</span><h2>One explicit Case, five separate judgments</h2></header>
          <div className="tb3-flow">
            <div><span>01</span><b>Tender + Company</b><small>Versioned dated inputs</small></div><i>→</i>
            <div><span>02</span><b>Evidence-linked match</b><small>Strengths, gaps, MISSING</small></div><i>→</i>
            <div><span>03</span><b>Consultant decision</b><small>Human authority and provenance</small></div>
          </div>
          <div className="tb3-dimension-grid">
            <div><span>AUDITED MATCH</span><strong>{result.match.auditedMatch.value ?? "—"}</strong><small>{result.match.auditedMatch.value === null ? "MISSING · insufficient evidence" : `${result.match.auditedMatch.label} support`}</small></div>
            <div><span>READINESS</span><strong>{result.match.supplierReadiness.value}</strong><small>Separate legacy company estimate</small></div>
            <div><span>EVIDENCE QUALITY</span><strong>{result.match.verificationQuality.value ?? "—"}</strong><small>Pair-specific · distinct records</small></div>
            <div><span>DEADLINE URGENCY</span><strong>{result.match.deadlineUrgency.value ?? "—"}</strong><small>Separate time context</small></div>
            <div><span>DECISION</span><strong className="word">{result.match.consultantDecision}</strong><small>Consultant-controlled</small></div>
          </div>
        </article>
        <article className="tb3-map-card">
          <header><span>SCHEMATIC · NON-GEOSPATIAL</span><h2>Regional relationship diagram</h2><p>Fixed explanatory geometry only. It is not a live map, distance model, coordinate plot, or routing result.</p></header>
          <div className="tb3-map-fallback" data-map-mode="schematic-non-geospatial" role="img" aria-label="Schematic non-geospatial company and tender regional relationship diagram">
            <i className="region asia">ASIA</i><i className="region central">CENTRAL ASIA</i><i className="region europe">EUROPE</i><i className="region africa">AFRICA</i>
            <span className="supplier-dot" title={supplier.headquarters.country} /><span className="tender-dot" title={tender.country} />
            <svg viewBox="0 0 400 220" aria-hidden="true"><path d="M80 62c58-38 93 9 137-8 54-21 93-5 115 27-18 24-3 43-36 56-51 21-78-10-124 8-47 18-93-7-105-45-7-22-3-28 13-38Z" /><path d="m96 94 218 35" /></svg>
          </div>
          <footer><span className="supplier-key">Company · {supplier.headquarters.country}</span><span className="tender-key">Tender · {tender.country}</span></footer>
        </article>
      </section>}

      {tab === "match" && <section className="tb3-workspace tb3-match-review">
        <article className="tb3-match-main">
          <header><div><span>COMPANY × TENDER</span><h2>{supplier.legalEnglishName}</h2><p>{tender.title}</p></div><div className="tb3-deadline"><span>ABSOLUTE DEADLINE</span><strong>{deadlineLabel(tender.deadlineAt)}</strong><small>{result.match.tenderFreshness.daysRemaining} days remaining · {result.match.tenderFreshness.freshness}</small></div></header>
          <div className="tb3-formula-comparison">
            <div><span>LEGACY TENDERBOOST BASELINE · 1.0.0</span><strong>{result.match.matchScore.value ?? "—"}</strong><small>Historical curated estimate · never overwritten</small></div>
            <i>→</i>
            <div><span>TENDERMATCH AUDITED SUPPORT · 3.0.0</span><strong>{result.match.auditedMatch.value ?? "MISSING"}</strong><small>{result.match.auditedMatch.value === null ? result.match.auditedMatch.missingInputs.join(" · ") : `Difference from legacy: ${result.match.auditedMatch.legacyDelta! > 0 ? "+" : ""}${result.match.auditedMatch.legacyDelta}`}</small></div>
          </div>
          <div className="tb3-evidence-columns">
            <section><span>AUDITED COMPONENTS</span>{result.match.auditedMatch.components.map((component) => <article className={component.value === null ? "missing" : ""} key={component.code}><b>{component.code.replaceAll("-", " ")} · {component.value ?? "MISSING"}</b><p>{component.rationale}</p><div>{component.evidenceIds.map((id) => <code key={id}>{id}</code>)}</div><small>{component.value === null ? component.reasonCodes.join(" · ") : `Weight ${component.weight * 100}% · evidence confidence ${component.evidenceConfidence}`}</small></article>)}</section>
            <section><span>MISSING / GAPS / LEGACY CLAIMS</span>{result.match.auditedMatch.reasonCodes.map((reason) => <p key={reason}>! {reason.replaceAll("_", " ")}</p>)}{result.match.gaps.length ? result.match.gaps.map((gap) => <p key={gap}>? {gap}</p>) : <p>No recorded gaps in the legacy fixture.</p>}<details><summary>Historical lexical claim links</summary>{result.match.linkedStrengths.map((claim) => <article key={claim.id}><b>{claim.text}</b><div>{claim.evidenceIds.map((id) => <code key={id}>{id}</code>)}</div><small>Historical internal explanation only · refresh required for current use</small></article>)}</details></section>
          </div>
        </article>
        <aside className="tb3-decision-panel">
          <span>HUMAN AUTHORITY</span><h2>Consultant decision</h2><p>The decision is distinct from Match Support, company readiness, evidence quality, deadline context, participation design, and Bid/No-Bid.</p>
          <div className="tb3-decision-actions"><button disabled={!result.reviewSupport.readyForCurrentDecision} className={result.match.consultantDecision === "approved" ? "selected" : ""} onClick={() => decide("approved")}>Approve match</button><button className={result.match.consultantDecision === "hold" ? "selected" : ""} onClick={() => decide("hold")}>Hold</button><button className={result.match.consultantDecision === "rejected" ? "selected reject" : ""} onClick={() => decide("rejected")}>Reject</button></div>
          <div className="tb3-review-findings"><strong>{result.reviewSupport.readyForCurrentDecision ? "Current evidence supports review" : "Current approval is blocked"}</strong>{result.reviewSupport.findings.map((item) => <article key={item.code}><b>{item.code.replaceAll("_", " ")}</b><p>{item.message}</p><small>{item.ownerAgentId} · Next: {item.nextAction}</small></article>)}</div>
          <dl>{Object.entries(result.match.trust).map(([key, value]) => <div key={key}><dt>{key.replace(/([A-Z])/g, " $1")}</dt><dd>{value}</dd></div>)}</dl>
        </aside>
      </section>}

      {tab === "audit" && <section className="tb3-workspace tb3-audit">
        <article><span>IDENTITY CHAIN</span><h2>One matching result</h2><dl><div><dt>Case</dt><dd>{result.caseIdentity.id} · {result.caseIdentity.version}</dd></div><div><dt>Result</dt><dd>{result.resultIdentity.id}</dd></div><div><dt>Tender</dt><dd>{result.tenderIdentity.id}</dd></div><div><dt>Company</dt><dd>{result.supplierIdentity.id}</dd></div><div><dt>Match</dt><dd>{result.match.id} · {result.match.version}</dd></div><div><dt>Evidence</dt><dd>{result.evidenceSnapshotIdentity.id}</dd></div><div><dt>Decision</dt><dd>{result.decisionIdentity.id} · {result.match.decisionHistory.length} recorded</dd></div></dl></article>
        <article><span>SOURCE + VALUE POLICY</span><h2>Dated inputs, explicit meanings</h2><p>Legacy score and readiness remain historical estimates. Audited Match Support exists only when both evidence components qualify; otherwise it remains MISSING, never zero. Evidence quality, deadline urgency, and the consultant decision stay separate.</p><div className="tb3-value-classes">{["SOURCE", "CALCULATED", "ESTIMATED", "ASSUMED", "MISSING"].map((item) => <b key={item}>{item}</b>)}</div><p><strong>Policies:</strong> {result.match.auditedMatch.policyVersion} · {result.match.deadlineUrgency.policyVersion}</p></article>
        <article><span>DECISION PROVENANCE</span><h2>Human review history</h2><p>TenderMatch records the consultant’s match disposition. It does not make the downstream participation or Bid/No-Bid decision.</p><div className="tb3-decision-history">{result.match.decisionHistory.length ? result.match.decisionHistory.map((item) => <div key={item.id}><b>{item.decision}</b><span>{item.actorId} · {item.decidedAt}</span><p>{item.rationale}</p></div>) : <small>No consultant decision event recorded.</small>}</div></article>
        <article><span>KNOWN LIMITATIONS</span><h2>Current safe boundary</h2>{result.knownLimitations.map((item) => <p key={item}>— {item}</p>)}<p><strong>Case compatibility:</strong> {result.migration.status} · {result.migration.note}</p></article>
      </section>}
    </main>
  );
}
