import { tenderMatchFormulaPresentation as formula } from "./tendermatch-formula-contract.ts";

function WeightModel({ title, criteria }: { title: string; criteria: readonly { code: string; label: string; weight: number }[] }) {
  return <article className="tb3-formula-model">
    <header><span>{title}</span><b>100 points</b></header>
    <div>{criteria.map((criterion) => <section key={criterion.code}>
      <p><b>{criterion.label}</b><span>{criterion.weight}</span></p>
      <i aria-hidden="true"><b style={{ width: `${criterion.weight}%` }} /></i>
    </section>)}</div>
  </article>;
}

export function TenderMatchFormulaView() {
  const example = formula.workedExample;
  return <section className="tb3-formula-page" aria-labelledby="tendermatch-formula-title">
    <header className="tb3-formula-hero">
      <div><span>06 · Scoring method</span><h1 id="tendermatch-formula-title">How Formula v1.1 works</h1><p>TenderMatch Formula v1.1 is a deterministic 0–100 scoring system. It calculates compatibility; it does not make a Match / Non-match decision.</p></div>
      <aside><span>Active formula</span><b>0–100</b><small>Scoring only · no decision threshold</small></aside>
    </header>

    <section className="tb3-formula-flow" aria-label="TenderMatch scoring flow">
      <article><span>1</span><div><b>Supplier evidence</b><small>Capabilities, capacity and supported markets</small></div></article>
      <i aria-hidden="true">+</i>
      <article><span>2</span><div><b>Tender requirements</b><small>Title, object, type and explicit tags</small></div></article>
      <i aria-hidden="true">→</i>
      <article className="engine"><span>3</span><div><b>Fit 0–5</b><small>Evidence-aware criterion assessment</small></div></article>
      <i aria-hidden="true">→</i>
      <article><span>4</span><div><b>Weighted points</b><small>Weight × Fit ÷ 5</small></div></article>
      <i aria-hidden="true">→</i>
      <article className="result"><span>5</span><div><b>Pair Score</b><strong>0–100</strong></div></article>
    </section>

    <section className="tb3-formula-equation" aria-label="Formula arithmetic">
      <div><span>Criterion points</span><b>Criterion weight × Fit ÷ 5</b></div><i aria-hidden="true">→</i><div><span>Pair Score</span><b>Sum of criterion points</b></div>
    </section>

    <section className="tb3-formula-models" aria-label="Formula criterion weights">
      <WeightModel title="Goods" criteria={formula.goods} />
      <WeightModel title="Works" criteria={formula.works} />
    </section>

    <section className="tb3-formula-fit" aria-labelledby="fit-scale-title">
      <header><div><span>Fit scale</span><h2 id="fit-scale-title">Supported compatibility, criterion by criterion</h2></div><p>Fit describes supported evidence. It is not a consultant decision.</p></header>
      <div className="tb3-fit-scale">{formula.fitScale.map((level) => <article key={level.value}><b>{level.value}</b><span>{level.label}</span></article>)}</div>
      <article className="tb3-fit-missing"><b>Missing</b><span>Insufficient evidence</span><p>Contributes zero points, keeps the denominator at 100, and remains explicitly Missing. Missing is never Fit 0.</p></article>
    </section>

    <section className="tb3-formula-example" aria-labelledby="worked-example-title">
      <header><div><span>Worked example · illustrative</span><h2 id="worked-example-title">A reviewable Goods calculation</h2><p>This arithmetic example demonstrates the active formula; it is not a live pair or a Match recommendation.</p></div><div className="tb3-formula-primary-score"><b>{example.pairScore}</b><span>Pair Score / 100</span></div></header>
      <div className="tb3-example-grid">
        <div className="tb3-example-criteria">{example.criteria.map((criterion) => <article key={criterion.code} className={criterion.fit === null ? "missing" : ""}>
          <div><b>{criterion.label}</b><span>Weight {criterion.weight}</span></div>
          <p><span>{criterion.fit === null ? "Missing" : `Fit ${criterion.fit}/5`}</span><strong>{criterion.points} pts</strong></p>
          <i aria-hidden="true"><b style={{ width: `${criterion.points / criterion.weight * 100}%` }} /></i>
        </article>)}</div>
        <aside className="tb3-example-diagnostics"><article><b>{example.assessedOnlyFit}</b><span>Assessed-only Fit / 100</span></article><article><b>{example.dataCoverage}%</b><span>Data Coverage</span></article><p><strong>48</strong> points are supported across <strong>65</strong> assessed weight. Two criteria remain Missing and visible.</p></aside>
      </div>
    </section>

    <section className="tb3-formula-boundaries">
      <article><span>Current scope</span><h2>Goods and Works only</h2><p>{formula.outsideScope.join(", ")} receive zero under this policy because they are outside the current scoring scope. That zero does not mean Non-match.</p></article>
      <article><span>Diagnostic gates</span><h2>Visible, but not score points</h2><div>{formula.diagnosticGates.map((gate) => <small key={gate}>✓ {gate}</small>)}</div></article>
      <article><span>Separate signals</span><h2>Never modify Pair Score</h2><div>{formula.separateSignals.map((signal) => <small key={signal}>— {signal}</small>)}</div></article>
    </section>

    <details className="tb3-formula-details">
      <summary>Exact technical rules and version identities</summary>
      <div>
        <section><h3>Technical fit</h3><p>Formula v1.1 compares supported supplier product families, works specializations, industries served and materials with the tender title, object, procurement type and explicit tags. Boilerplate description text does not award points.</p><ul><li>Fit 5: at least two normalized concepts, or one concept plus two direct terms.</li><li>Fit 4: one concept plus one direct term.</li><li>Fit 3: one normalized concept.</li><li>Fit 2: at least two direct terms.</li><li>Fit 1: one direct term.</li><li>Fit 0: supported scope with no normalized overlap.</li></ul></section>
        <section><h3>Current evidence rules</h3><p>A usable supplier capacity claim receives Fit 3 because no comparable tender threshold is mapped. Geography receives Fit 5 for the tender country or Central Asia, Fit 4 for Global, Asia or international support, and Fit 2 for other supported geography. Comparable contracts and financial threshold comparisons remain Missing until adequate evidence exists.</p></section>
        <footer><code>{formula.engineVersion}</code><code>{formula.policyVersion}</code></footer>
      </div>
    </details>
  </section>;
}

