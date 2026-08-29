import { useMemo, useState } from "react";
import {
  approveCampaignDraft,
  buildAllMatches,
  createCampaignDraft,
  createCaseResult,
  demoSnapshot,
  demoSuppliers,
  demoTenders,
  loadCaseResult,
  recordCampaignEvent,
  saveCaseResult,
  setConsultantDecision,
  type CampaignChannel,
  type ConsultantDecision,
  type SupplierRecord,
  type TenderBoostCaseResult,
  type TenderRecord,
} from "../../../packages/tenderboost/src/index";

type WorkspaceTab = "overview" | "match" | "campaign" | "audit";

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 72);
}

function caseIdFor(tender: TenderRecord, supplier: SupplierRecord) {
  return `case:TB-DEMO:${slug(tender.reference)}:${slug(supplier.id)}`;
}

function deadlineLabel(value: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Asia/Tashkent" }).format(new Date(value));
}

function statusLabel(result: TenderBoostCaseResult) {
  if (result.campaignEvents.length) return `${result.campaignEvents.length} recorded external event${result.campaignEvents.length === 1 ? "" : "s"}`;
  if (result.simulationEvents.length) return "Simulation preview only · no outreach recorded";
  return "No outreach recorded";
}

export default function TenderBoostApp() {
  const sessionNow = useMemo(() => new Date().toISOString(), []);
  const allMatches = useMemo(() => buildAllMatches(demoTenders, demoSuppliers, sessionNow), [sessionNow]);
  const initialMatch = allMatches.find((item) => (item.matchScore.value ?? -1) > 0 && item.tenderFreshness.status !== "closed")
    ?? allMatches.find((item) => (item.matchScore.value ?? -1) > 0)
    ?? allMatches[0];
  const initialTender = demoTenders.find((item) => item.id === initialMatch.tenderId) ?? demoTenders[0];
  const initialSupplier = demoSuppliers.find((item) => item.id === initialMatch.supplierId) ?? demoSuppliers[0];
  const [result, setResult] = useState(() => createCaseResult(caseIdFor(initialTender, initialSupplier), initialTender, initialSupplier, sessionNow));
  const [tab, setTab] = useState<WorkspaceTab>("overview");
  const [channel, setChannel] = useState<CampaignChannel>("Email");
  const [persistenceMessage, setPersistenceMessage] = useState("Not saved in this browser session");
  const [actionError, setActionError] = useState<string | null>(null);

  const tender = demoTenders.find((item) => item.id === result.tenderIdentity.id) ?? initialTender;
  const supplier = demoSuppliers.find((item) => item.id === result.supplierIdentity.id) ?? initialSupplier;
  const evaluatedPairs = allMatches.filter((item) => item.matchScore.value !== null).length;
  const unassessedPairs = allMatches.length - evaluatedPairs;
  const linkedEvidenceCount = allMatches.reduce((count, item) => count + item.linkedStrengths.reduce((sum, claim) => sum + claim.evidenceIds.length, 0), 0);
  const externalClaimCount = result.match.linkedStrengths.filter((claim) => claim.externalClaimEligible).length;

  const runAction = (action: () => TenderBoostCaseResult) => {
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
    const nextCaseId = caseIdFor(nextTender, nextSupplier);
    setResult(createCaseResult(nextCaseId, nextTender, nextSupplier, new Date().toISOString()));
    setPersistenceMessage("Not saved in this browser session");
    setActionError(null);
  };

  const decide = (decision: ConsultantDecision) => runAction(() => setConsultantDecision(result, supplier, decision, new Date().toISOString(), {
    actorId: "local-consultant-demo",
    rationale: `Consultant recorded ${decision} through the TenderBoost Match Review workspace.`,
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

  const simulatePreview = () => runAction(() => recordCampaignEvent(result, supplier, {
    type: "simulation-preview",
    mode: "simulation",
    occurredAt: new Date().toISOString(),
    externalRecordId: null,
    note: "Local preview only; no message, call, response, or CRM action occurred.",
  }, new Date().toISOString()));

  return (
    <main className="tb3-page">
      <section className="tb3-hero">
        <div className="tb3-hero-copy">
          <p><span /> TENDERAPPS AGENT 03 · DATED DEMONSTRATION</p>
          <h1>TenderBoost <em>AI</em></h1>
          <h2>Evidence-linked Company × Tender matching and consultant-controlled campaign preparation.</h2>
          <p className="tb3-hero-description">Select one pair, inspect the linked evidence and gaps, record a human decision, and prepare a truthful channel draft. This workspace does not send outreach.</p>
          <div className="tb3-hero-actions">
            <button onClick={() => setTab("match")}>Review selected match →</button>
            <button className="secondary" onClick={() => setTab("campaign")}>Open campaign brief</button>
          </div>
        </div>
        <aside className="tb3-result-card">
          <span>PRIMARY CASE RESULT</span>
          <div className="tb3-score-orbit"><strong>{result.match.matchScore.value ?? "—"}</strong><small>{result.match.matchScore.value === null ? "MISSING" : "/100"}</small></div>
          <h2>{supplier.legalEnglishName}</h2>
          <p>{tender.reference} · {tender.object}</p>
          <dl>
            <div><dt>Match Score</dt><dd>{result.match.matchScore.value === null ? "Not evaluated · MISSING" : `${result.match.matchScore.value} · estimated`}</dd></div>
            <div><dt>Consultant decision</dt><dd>{result.match.consultantDecision}</dd></div>
            <div><dt>Workflow</dt><dd>{result.workflowState}</dd></div>
            <div><dt>Communication</dt><dd>{statusLabel(result)}</dd></div>
          </dl>
        </aside>
      </section>

      <section className="tb3-snapshot" role="status">
        <div><span>SNAPSHOT</span><strong>{demoSnapshot.classification}</strong><small>Frozen {deadlineLabel(demoSnapshot.asOf)} · source commit {demoSnapshot.sourceCommit.slice(0, 7)}</small></div>
        <p>Deadlines are absolute. Urgency is calculated at runtime; this snapshot is not a live tender feed.</p>
        <b>{result.match.tenderFreshness.freshness.toUpperCase()} · {result.match.tenderFreshness.status.toUpperCase()}</b>
      </section>

      <section className="tb3-metrics" aria-label="Demonstration dataset summary">
        <article><span>01</span><b>{demoSnapshot.tenderCount}</b><p>Tenders in dated snapshot</p></article>
        <article><span>02</span><b>{demoSnapshot.supplierCount}</b><p>Supplier profiles</p></article>
        <article><span>03</span><b>{evaluatedPairs}</b><p>Evaluated pairs · {unassessedPairs} not evaluated</p></article>
        <article><span>04</span><b>{linkedEvidenceCount}</b><p>Claim-to-evidence links</p></article>
      </section>

      <section className="tb3-case-controls">
        <label><span>TENDER</span><select value={tender.id} onChange={(event) => selectPair(event.target.value, supplier.id)}>{demoTenders.map((item) => <option key={item.id} value={item.id}>{item.reference} · {item.object}</option>)}</select></label>
        <label><span>SUPPLIER</span><select value={supplier.id} onChange={(event) => selectPair(tender.id, event.target.value)}>{demoSuppliers.map((item) => <option key={item.id} value={item.id}>{item.legalEnglishName}</option>)}</select></label>
        <div><span>EXPLICIT CASE ID</span><code>{result.caseIdentity.id}</code></div>
        <div className="tb3-persistence-actions"><button onClick={saveCase}>Save this Case</button><button onClick={loadCase}>Load this Case</button><small>{persistenceMessage}</small></div>
      </section>

      <nav className="tb3-tabs" aria-label="TenderBoost workspace">
        {(["overview", "match", "campaign", "audit"] as WorkspaceTab[]).map((item, index) => <button aria-current={tab === item ? "page" : undefined} className={tab === item ? "active" : ""} key={item} onClick={() => setTab(item)}><span>0{index + 1}</span>{item === "match" ? "Match review" : item}</button>)}
      </nav>

      {actionError && <div className="tb3-action-error" role="alert"><strong>Action blocked</strong><span>{actionError}</span></div>}

      {tab === "overview" && <section className="tb3-workspace tb3-overview">
        <article className="tb3-flow-card">
          <header><span>CLIENT OUTCOME</span><h2>One explicit Case, five distinct judgments</h2></header>
          <div className="tb3-flow">
            <div><span>01</span><b>Tender + Supplier</b><small>Versioned dated inputs</small></div><i>→</i>
            <div><span>02</span><b>Evidence-linked match</b><small>Strengths and gaps</small></div><i>→</i>
            <div><span>03</span><b>Consultant decision</b><small>Human authority</small></div><i>→</i>
            <div><span>04</span><b>Campaign brief</b><small>Draft only · no sending</small></div>
          </div>
          <div className="tb3-dimension-grid">
            <div><span>MATCH SCORE</span><strong>{result.match.matchScore.value ?? "—"}</strong><small>{result.match.matchScore.value === null ? "MISSING · not evaluated" : "Estimated pair fit"}</small></div>
            <div><span>READINESS</span><strong>{result.match.supplierReadiness.value}</strong><small>Legacy supplier estimate</small></div>
            <div><span>VERIFICATION</span><strong>{result.match.verificationQuality.value}</strong><small>Calculated legacy coverage</small></div>
            <div><span>PRIORITY</span><strong>{result.match.campaignPriority.value ?? "—"}</strong><small>Calculated, not a decision</small></div>
            <div><span>DECISION</span><strong className="word">{result.match.consultantDecision}</strong><small>Consultant-controlled</small></div>
          </div>
        </article>
        <article className="tb3-map-card">
          <header><span>SCHEMATIC · NON-GEOSPATIAL</span><h2>Regional relationship diagram</h2><p>Fixed explanatory geometry only. It is not a live map, distance model, coordinate plot, or routing result.</p></header>
          <div className="tb3-map-fallback" data-map-mode="schematic-non-geospatial" role="img" aria-label="Schematic non-geospatial supplier and tender regional relationship diagram">
            <i className="region asia">ASIA</i><i className="region central">CENTRAL ASIA</i><i className="region europe">EUROPE</i><i className="region africa">AFRICA</i>
            <span className="supplier-dot" title={supplier.headquarters.country} /><span className="tender-dot" title={tender.country} />
            <svg viewBox="0 0 400 220" aria-hidden="true"><path d="M80 62c58-38 93 9 137-8 54-21 93-5 115 27-18 24-3 43-36 56-51 21-78-10-124 8-47 18-93-7-105-45-7-22-3-28 13-38Z" /><path d="m96 94 218 35" /></svg>
          </div>
          <footer><span className="supplier-key">Supplier · {supplier.headquarters.country}</span><span className="tender-key">Tender · {tender.country}</span></footer>
        </article>
      </section>}

      {tab === "match" && <section className="tb3-workspace tb3-match-review">
        <article className="tb3-match-main">
          <header><div><span>COMPANY × TENDER</span><h2>{supplier.legalEnglishName}</h2><p>{tender.title}</p></div><div className="tb3-deadline"><span>ABSOLUTE DEADLINE</span><strong>{deadlineLabel(tender.deadlineAt)}</strong><small>{result.match.tenderFreshness.daysRemaining} days remaining · {result.match.tenderFreshness.freshness}</small></div></header>
          <div className="tb3-evidence-columns">
            <section><span>LINKED LEGACY STRENGTHS</span>{result.match.linkedStrengths.length ? result.match.linkedStrengths.map((claim) => <article key={claim.id}><b>{claim.text}</b><div>{claim.evidenceIds.map((id) => <code key={id}>{id}</code>)}</div><small>{claim.externalClaimEligible ? "Eligible for external claim" : "Refresh required before external use"}</small></article>) : <p>No legacy strength could be linked to a specific evidence record.</p>}</section>
            <section><span>GAPS / UNSUPPORTED</span>{result.match.gaps.length ? result.match.gaps.map((gap) => <p key={gap}>? {gap}</p>) : <p>No recorded gaps in the legacy fixture.</p>}</section>
          </div>
        </article>
        <aside className="tb3-decision-panel">
          <span>HUMAN AUTHORITY</span><h2>Consultant decision</h2><p>The decision is distinct from Match Score and campaign priority.</p>
          <div className="tb3-decision-actions"><button className={result.match.consultantDecision === "approved" ? "selected" : ""} onClick={() => decide("approved")}>Approve match</button><button className={result.match.consultantDecision === "hold" ? "selected" : ""} onClick={() => decide("hold")}>Hold</button><button className={result.match.consultantDecision === "rejected" ? "selected reject" : ""} onClick={() => decide("rejected")}>Reject</button></div>
          <dl>{Object.entries(result.match.trust).map(([key, value]) => <div key={key}><dt>{key.replace(/([A-Z])/g, " $1")}</dt><dd>{value}</dd></div>)}</dl>
        </aside>
      </section>}

      {tab === "campaign" && <section className="tb3-workspace tb3-campaign">
        <article className="tb3-campaign-editor">
          <header><div><span>CONSULTANT-CONTROLLED CAMPAIGN</span><h2>{result.campaign ? "Campaign brief" : "Prepare a campaign brief"}</h2><p>One logical campaign linked to this Supplier, Tender, Match, and Case.</p></div><b>{result.campaign?.lifecycle ?? "not created"}</b></header>
          <div className="tb3-campaign-controls"><label><span>CHANNEL</span><select value={result.campaign?.channel ?? channel} onChange={(event) => setChannel(event.target.value as CampaignChannel)} disabled={Boolean(result.campaign)}>{(["Email", "LinkedIn", "Telephone", "WhatsApp", "Website form", "Manual outreach"] as CampaignChannel[]).map((item) => <option key={item}>{item}</option>)}</select></label><button disabled={Boolean(result.campaign) || !result.activation.canPrepareDraft} onClick={() => runAction(() => createCampaignDraft(result, tender, supplier, new Date().toISOString(), channel))}>Create draft</button><button disabled={!result.campaign || result.campaign.lifecycle !== "draft"} onClick={() => runAction(() => approveCampaignDraft(result, supplier, "local-consultant-demo", new Date().toISOString()))}>Approve exact draft</button></div>
          {result.campaign ? <><textarea aria-label="Campaign copy preview" readOnly value={result.campaign.copy} /><div className="tb3-copy-foot"><span>{result.campaign.copyEvidenceIds.length} current claim evidence IDs</span><strong>NOT SENT</strong></div></> : <div className="tb3-empty-campaign"><strong>No campaign exists for this Case.</strong><p>A positive, open, non-rejected pair may be drafted even when activation blockers remain.</p></div>}
          <div className="tb3-simulation"><div><span>SIMULATION SEPARATION</span><strong>Preview a response workflow without changing the real lifecycle.</strong><p>Simulation events are stored separately and cannot create active, follow-up, interested, or no-response states.</p></div><button disabled={!result.campaign} onClick={simulatePreview}>Add simulation preview</button></div>
        </article>
        <aside className="tb3-blockers">
          <span>ACTIVATION READINESS</span><h2>{result.activation.eligibleForActivation ? "Ready for a separately authorized integration" : `${result.activation.blockers.length} blockers`}</h2>
          {result.activation.blockers.map((item) => <article key={item.code}><b>{item.code.replaceAll("_", " ")}</b><p>{item.message}</p><small>Next: {item.nextAction}</small></article>)}
          <div className="tb3-no-send"><i /><strong>No send integration connected</strong><span>No message, call, CRM action, response, or transfer is claimed.</span></div>
        </aside>
      </section>}

      {tab === "audit" && <section className="tb3-workspace tb3-audit">
        <article><span>IDENTITY CHAIN</span><h2>One composite result</h2><dl><div><dt>Case</dt><dd>{result.caseIdentity.id} · {result.caseIdentity.version}</dd></div><div><dt>Result</dt><dd>{result.resultIdentity.id}</dd></div><div><dt>Tender</dt><dd>{result.tenderIdentity.id}</dd></div><div><dt>Supplier</dt><dd>{result.supplierIdentity.id}</dd></div><div><dt>Match</dt><dd>{result.match.id} · {result.match.version}</dd></div><div><dt>Evidence snapshot</dt><dd>{result.evidenceSnapshotIdentity.id}</dd></div><div><dt>Decision</dt><dd>{result.decisionIdentity.id} · {result.match.decisionHistory.length} recorded</dd></div>{result.campaign && <div><dt>Campaign</dt><dd>{result.campaign.id} · {result.campaign.version} · {result.campaign.lifecycle}</dd></div>}</dl></article>
        <article><span>SOURCE + VALUE POLICY</span><h2>Dated inputs, explicit meanings</h2><p>Tender and supplier fixture values are supporting demonstration inputs. Match and readiness are estimated; verification and priority are calculated; missing consent is not converted to approval.</p><div className="tb3-value-classes">{["SOURCE", "CALCULATED", "ESTIMATED", "ASSUMED", "MISSING"].map((item) => <b key={item}>{item}</b>)}</div><p><strong>{externalClaimCount}</strong> current reviewed claims are eligible for external copy in this Case.</p></article>
        <article><span>EVENT + DECISION TRUTH</span><h2>Recorded versus simulated</h2><dl><div><dt>Real campaign events</dt><dd>{result.campaignEvents.length}</dd></div><div><dt>Simulation-only events</dt><dd>{result.simulationEvents.length}</dd></div><div><dt>Communication status</dt><dd>{statusLabel(result)}</dd></div></dl><p>Simulation events never advance the real campaign lifecycle.</p><div className="tb3-decision-history">{result.match.decisionHistory.length ? result.match.decisionHistory.map((item) => <div key={item.id}><b>{item.decision}</b><span>{item.actorId} · {item.decidedAt}</span><p>{item.rationale}</p></div>) : <small>No consultant decision event recorded.</small>}</div></article>
        <article><span>KNOWN LIMITATIONS</span><h2>Current safe boundary</h2>{result.knownLimitations.map((item) => <p key={item}>— {item}</p>)}</article>
      </section>}
    </main>
  );
}
