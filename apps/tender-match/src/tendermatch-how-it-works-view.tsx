import { useMemo, useState } from "react";

function Badge({ children, tone = "rule" }: { children: string; tone?: "rule" | "sim" }) {
  return <span className={`tm-how-badge ${tone}`}>{children}</span>;
}

export function TenderMatchHowItWorksView({ onFormula }: { onFormula: () => void }) {
  const [companyWords, setCompanyWords] = useState(10);
  const [tenderWords, setTenderWords] = useState(5);
  const [sharedWords, setSharedWords] = useState(3);
  const calculation = useMemo(() => {
    const common = Math.min(Math.max(sharedWords, 0), companyWords, tenderWords);
    const union = companyWords + tenderWords - common;
    const relevance = union ? Math.floor((800000 * common) / union) : 0;
    return { common, union, relevance };
  }, [companyWords, tenderWords, sharedWords]);
  return <section className="tm-how-page" aria-labelledby="tm-how-title">
    <header className="tm-how-hero">
      <div><span>07 · TenderMatch method</span><h1 id="tm-how-title">How TenderMatch turns data into an opportunity</h1><p>One company × one tender, evaluated through separate signals. There is no invented combined Match percentage.</p></div>
      <aside><b>Company + Tender</b><span>→ reviewable opportunity</span></aside>
    </header>

    <section className="tm-how-flow" aria-label="TenderMatch general rule">
      <article className="tm-how-node"><Badge>RULE</Badge><h2>Company</h2><div className="tm-how-visual"><strong>Profile</strong><span>capabilities · markets · evidence</span></div><small>Verified, stated, inferred or missing claims stay labelled.</small></article>
      <div className="tm-how-arrow" aria-hidden="true">+</div>
      <article className="tm-how-node"><Badge>RULE</Badge><h2>Tender</h2><div className="tm-how-visual"><strong>Opportunity</strong><span>title · object · deadline · scope</span></div><small>Freshness and requirements are checked at review time.</small></article>
      <div className="tm-how-arrow" aria-hidden="true">→</div>
      <article className="tm-how-node tm-how-engine"><Badge>RULE</Badge><h2>TenderMatch</h2><div className="tm-how-steps"><span>Retrieve</span><span>Score</span><span>Check</span></div><small>Retrieval Relevance, Formula, eligibility and evidence remain separate.</small></article>
      <div className="tm-how-arrow" aria-hidden="true">→</div>
      <article className="tm-how-result"><Badge>SIMULATED EXAMPLE</Badge><h2>Reviewable match</h2><strong>Company × Tender</strong><dl><div><dt>Formula</dt><dd>55 / 100</dd></div><div><dt>Coverage</dt><dd>65 / 100</dd></div><div><dt>Evidence</dt><dd>Needs review</dd></div><div><dt>Decision</dt><dd>Consultant</dd></div></dl></article>
    </section>

    <section className="tm-how-signals" aria-label="Independent evaluation questions">
      <article><Badge>1 · Retrieval</Badge><h2>Are there shared words and concepts?</h2><p>Ranks candidates up to 1,000,000 using separate 800,000 word and 200,000 concept weights.</p></article>
      <article><Badge>2 · Formula</Badge><h2>What does the evidence support?</h2><p>Formula v1.1 scores five criteria on a 0–100 denominator. Missing evidence stays Missing.</p><button type="button" onClick={onFormula}>Open Formula details →</button></article>
      <article><Badge>3 · Eligibility</Badge><h2>Can participation be supported?</h2><p>Scope, compliance, material risk, freshness and evidence gaps are surfaced for review.</p></article>
    </section>

    <section className="tm-how-human"><Badge>HUMAN AUTHORITY</Badge><h2>Consultant review completes the opportunity</h2><p>A positive number is not permission to bid. The consultant checks the tender, evidence, deadline and execution reality, then records the decision.</p><div className="tm-how-gate"><span>Missing authorization</span><b>→ request evidence before approval</b></div></section>

    <section className="tm-how-funnel" aria-labelledby="tm-how-funnel-title"><header><div><span>SIMULATED EXAMPLE</span><h2 id="tm-how-funnel-title">From OPEN tenders to verified opportunity</h2></div><small>Illustrative counts only — not live TenderMatch measurements.</small></header><div className="tm-how-funnel-row">{["OPEN tenders", "In Formula scope", "Separate scores", "Candidate review", "Eligibility check", "Verified opportunity"].map((label, index) => <div key={label}><b>{[10000, 6000, 6000, 400, 20, 8][index].toLocaleString()}</b><span>{label}</span></div>)}</div></section>

    <details className="tm-how-details"><summary>What changes for each pair?</summary><p>The word/concept sets, overlap, denominator, Formula criteria, Coverage, Evidence Confidence, freshness and consultant decision vary by Company × Tender pair. The 800,000 / 200,000 retrieval weights and Formula v1.1 policy remain fixed.</p></details>
    <details className="tm-how-details"><summary>Try the retrieval arithmetic (simulated)</summary><div className="tm-how-inputs"><label>Company words<input type="number" min="0" value={companyWords} onChange={(e) => setCompanyWords(Number(e.target.value))} /></label><label>Tender words<input type="number" min="0" value={tenderWords} onChange={(e) => setTenderWords(Number(e.target.value))} /></label><label>Shared words<input type="number" min="0" value={sharedWords} onChange={(e) => setSharedWords(Number(e.target.value))} /></label></div><output aria-live="polite">{companyWords} + {tenderWords} − {calculation.common} = {calculation.union} unique words → {calculation.relevance.toLocaleString()} / 800,000. This is ranking relevance, not probability.</output></details>

    <footer className="tm-how-boundary"><b>Scope boundary</b><span>TenderMatch is TenderLab Consultants’ internal matching workspace. It does not promote tenders, contact suppliers, send outreach, operate CRM, or authorize a Bid / No-Bid decision. Outputs may later feed a separate TenderMarketing capability.</span></footer>
  </section>;
}
