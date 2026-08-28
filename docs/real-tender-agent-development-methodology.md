# Real Tender Agent Development Methodology

Status: approved consolidated methodology, revised 2026-08-28 after independent audits of the shared development cycle, TenderBalance, and TENDER LOGISTICS COST.

Machine-readable contract: [`real-tender-agent-development-policy.json`](./real-tender-agent-development-policy.json)

## Decision and scope

This methodology fills the layer between approved Tender Agent architecture and Agent-specific implementation. Existing reusable skills already cover canonical placement, architecture, deterministic Agent simulations, regression harnesses, and local-LLM resilience. None owned the complete empirical cycle from real evidence to a validated practical Agent, so the reusable `real-tender-agent-development` skill was created.

The layers remain deliberately separate:

| Knowledge layer | Owns | Does not own | Current home |
|---|---|---|---|
| Agent Strategy & Simulation | The canonical 64-Agent registry, Agent/Dataset/Actor/Process concepts, Case routes, and deterministic demonstrations | Proof that uncertain extraction or reasoning works on real evidence | [`../AGENT_ARCHITECTURE_PLAN.md`](../AGENT_ARCHITECTURE_PLAN.md), canonical catalogues, simulation skills |
| Real Agent Development Methodology | The empirical gates, evidence semantics, canonical-result discipline, client workflow, validation, and feedback loop used to build a real practical Agent | Agent-specific accounting, Incoterms, OCR, or pricing rules | This document, its policy manifest, root `AGENTS.md`, and the reusable skill |
| Agent-specific knowledge | The TOR, schemas, domain rules, fixtures, limitations, and regressions of one capability | A second canonical architecture or a generic method copied into every Agent | [`balance-sheet-digitization-mvp.md`](./balance-sheet-digitization-mvp.md), [`contract-logistics-incoterms-architecture.md`](./contract-logistics-incoterms-architecture.md), their packages and tests |

“Production” in this document means the approved real client-facing workflow and release surface. It does not imply an enterprise runtime. Authentication, tenant isolation, durable Process Instances and Artifacts, server-side approval enforcement, and governed live data remain separate readiness questions.

## Consolidated conclusion

An approved Agent concept becomes a reliable practical Agent only through an evidence-governed, Case-scoped, and versioned transformation process. A polished interface, a passing synthetic fixture, or a successful deployment does not prove that uncertain intelligence works on real evidence.

The development method therefore keeps five identities aligned:

1. **source identity** — what input is authoritative, structural, supporting, or asserted;
2. **value identity** — what is reported, calculated, estimated, assumed, or missing;
3. **result identity** — which complete canonical result and Case every view, export, and handoff represents;
4. **workflow identity** — whether that result is draft, preliminary, reviewed, approved, or released; and
5. **release identity** — which input, code/model version, output artifact, and validation verdict were actually verified.

Client comprehension is part of correctness. The product must explain what the client provides, what the Agent does, what finished product is returned, why it is or is not ready, and the next permitted action.

## Core principle

When the intelligence itself is uncertain—document understanding, semantic extraction, classification, estimation, or recommendation—**experiment first**. Do not put the proposed intelligence directly into the production path and then use the client interface as the experiment.

The experiment must use authorized realistic evidence, preserve inspectable intermediate output, and be independent enough that a failed method cannot corrupt production Cases or canonical data. Synthetic fixtures remain useful for edge cases, but they cannot establish real-world extraction fidelity by themselves.

## Lifecycle and gates

| Stage | Work | Exit evidence |
|---|---|---|
| 1. Knowledge-layer and placement gate | Confirm the approved canonical Agent placement and identify which of the three knowledge layers may change. | Placement decision, preserved strategy boundary, named Agent-specific owner. |
| 2. Purpose and authority contract | Define TOR, primary client purpose, negative scope, human authority, and prohibited autonomous decisions. | Approved TOR, owner, authority boundary, unsupported-decision list. |
| 3. Real input/output contract | Define what the client provides, what the Agent must return, the primary finished product, consumer, and handoff. | Versioned input/output contract with stable identity and trace fields. |
| 4. Canonical data contract | Define source roles, value classes, provenance, trust dimensions, Case identity, workflow states, and artifact identity. | Versioned schema/policy with normalization and derivation rules. |
| 5. Evidence plan | Select permitted realistic examples and clearly labelled synthetic edge cases; define comparison criteria and confidentiality handling. | Evidence manifest, evidence-strength labels, expected outputs or review rubric. |
| 6. Isolated experiment | Exercise uncertain intelligence outside the production workflow. | Reproducible input, raw/intermediate/final outputs, timings, and failure state. |
| 7. Actual-output audit | Compare every expected field, source reference, transformation, calculation, exception, artifact, and user-visible state. | Field-level observations, purpose assessment, and artifact inspection. |
| 8. Failure-layer diagnosis | Locate the failing phase and record What happened → Root cause → Correction → Reusable rule → Regression evidence. | Evidence-supported diagnosis at the asset, decoding, perception, structure, mapping, validation, review, persistence, or export layer. |
| 9. Correct and repeat | Apply the smallest general correction and re-run the representative evidence set. | Improved outputs without filename, page, amount, or answer-key shortcuts. |
| 10. Methodology approval | Approve the method, acceptance thresholds, limitations, and bounded production move. | Explicit acceptance, confidence criteria, and production scope. |
| 11. Production integration | Connect the approved method to one complete canonical result, explicit Case, exports, and downstream handoffs. | One versioned composite result drives every consumer. |
| 12. Human-workflow integration | Implement actionable blockers and distinct persistence, review, approval, and release transitions. | Truthful `draft → preliminary → reviewed → approved → released` behavior and recovery routes. |
| 13. Production verification | Replay realistic and failure cases through the actual build and inspect generated artifacts. | Focused/full tests, build, browser/accessibility evidence, and output comparison. |
| 14. Release-evidence gate | Bind the candidate to code/model version, evidence, outputs, validation verdict, limitations, and current documentation. | Fresh release ledger with no stale test count, artifact, or revision claim. |
| 15. Authorized deployment | Publish only after explicit release authorization and verify the deployed revision. | Deployment record, exact revision, routes, assets, and security posture. |
| 16. Deployed-equivalent replay | Re-run authorized representative inputs against the released or exactly equivalent build. | Archived result identities, parity verdict, observations, and recovery evidence. |
| 17. Knowledge feedback | Add only independently reusable learning to this methodology and retain domain rules in the owning Agent. | Separated general updates, Agent-specific regressions, limitations, and next experiment. |

Stages 6–9 are the empirical loop; stages 11–13 are the production-hardening loop. A method moves forward because representative outputs, failure boundaries, and limitations are understood—not because one sample, test suite, or deployment happens to pass.

## Canonical evidence and result contract

### Separate source roles before values

A document or input first receives a role:

- **Authoritative source** — eligible to contribute source facts with traceability.
- **Structure template** — defines fields, layout, or requirements only. Example names, years, and values are technically ineligible for client facts.
- **Supporting document** — may explain context but does not silently populate the canonical result.
- **User assertion/correction** — eligible only when explicitly supplied, attributed, and kept distinct from the immutable reported value.

This role gate precedes field mapping. A form that visually resembles a client statement is not evidence that its populated examples belong to the client.

User input is an origin, not automatically a value class. A user-entered value may be source-backed, calculated, estimated, assumed, or a correction; classify it from its evidence and derivation rather than from who typed it.

### Preserve source structure before semantic mapping

Format adapters should recover the strongest inspectable intermediate structure available before domain mapping:

- PDF coordinates, lines, pages, reading order, and meaningful column gaps;
- spreadsheet sheets, rows, columns, headers, merged regions, formulas, and printed totals;
- OCR regions, page candidates, recognition alternatives, and confidence; and
- document, statement, table, or section boundaries.

Deterministic structural arithmetic and reconciliation should be attempted before declaring a required value `MISSING`, when the product contract permits that calculation. The calculation remains a separate `CALCULATED` record; it never overwrites the reported source value.

### Separate value meaning

| Class | Meaning | Required trace |
|---|---|---|
| `SOURCE` | A value directly reported in eligible evidence. | Document identity, page/sheet, original label, reported period/column, original value, extraction/review status. |
| `CALCULATED` | A deterministic derivation. | Formula/version, operand values and source IDs, precision/rounding rule. |
| `ESTIMATED` | An evidence-based model or benchmark result. | Method/version, evidence basis, benchmark vintage, assumptions, confidence or interval. |
| `ASSUMED` | An explicit premise not established as a source fact. | Owner, rationale, date, affected fields, override/review path. |
| `MISSING` | No supported value exists. It is not zero and has no invented number. | Required purpose/field, reason unavailable, requested recovery action, blocking effect. |

Document role, value class, confidence, and review status are separate dimensions. Agent-specific vocabularies may be more detailed, but they must map to these meanings without collapsing user input, template content, estimates, and source facts into one provenance field.

The classes are not a universal overwrite hierarchy. `SOURCE → CALCULATED → ESTIMATED → ASSUMED → MISSING` can describe a product-specific search for a usable value, but all supported values must remain inspectable when they coexist or disagree. A versioned product policy selects the effective value for a specific purpose.

### Block only when semantics require it

`MISSING` blocks only when all of the following are true:

1. the field is required for the requested finished product;
2. no supported source/user value exists;
3. no permitted deterministic calculation exists;
4. no explicitly permitted estimate/assumption path exists; and
5. the product contract does not allow a truthful partial result.

An unrequested year, optional enrichment, or unavailable income-statement field in a deliberately partial balance-derived form is not automatically a workflow blocker. Conversely, an unreadable required balance total cannot become ready merely because some other field was extracted.

### One complete canonical result model

The same versioned composite model must drive:

`intake → normalized evidence → validations/calculations → primary result → saved Case → export → downstream form or Agent handoff`

Completeness includes the headline answer and its explanatory submodels: source facts, normalization, formulas, estimates, assumptions, exceptions, confidence/trust, human changes, workflow state, visuals, and artifact identities. Do not persist only the commercial or financial headline while a separate transient model drives explanation, packing, transport, validation, or exports.

Do not reconstruct a second “display result” from raw UI state. Never silently replace a reported value with a calculated, corrected, estimated, or assumed value. Show reported versus calculated values and their difference when they disagree.

Agent/global pages explain or initiate a reusable capability. A Case result is a versioned output for one explicit Case. Result and downstream-form URLs retain the Case ID and never fall back to “latest” when an ID is missing or stale.

### Separate extraction confidence from overall trust

A high recognition score does not make a semantically impossible result trustworthy. Evaluate at least these dimensions when relevant:

1. **recognition** — were characters, cells, and figures read reliably;
2. **structural** — were pages, tables, rows, columns, periods, and hierarchy reconstructed correctly;
3. **semantic** — were source roles, entities, fields, classifications, and units mapped correctly;
4. **arithmetic/domain** — do totals, formulas, and domain relationships reconcile without silent correction; and
5. **review** — which uncertainties, corrections, or approvals remain under human authority.

The displayed trust/readiness verdict must account for contradictions among these dimensions. Preserve the component evidence instead of reducing every dimension to one extraction percentage.

## Client product and workflow rules

- The first viewport should make `what the client provides → what the Agent does → what the client receives` understandable in seconds. The finished product, not explanatory documentation, is the visual hero.
- The primary result must match the Agent’s purpose. TenderBalance foregrounds the digitized, traceable statement; TENDER LOGISTICS COST foregrounds one reconciled preliminary logistics estimate and its commercial consequence.
- Visualizations explain the result. A truck/loading view must reconcile with cargo and capacity calculations; a financial preview must reflect the canonical statement. Decorative diagrams must not imply unsupported facts.
- Precision must match provenance. Exact source/calculated values remain exact; estimates use approximation, confidence, basis, and vintage.
- A disabled action must explain the exact blocker, the remaining count, the next action, and where it occurs. Readiness activates automatically when requirements are satisfied.
- Saving, reviewing, approving, and releasing are separate transitions. When the product contract allows a truthful partial result, let the client retain a clearly labelled preliminary Case without weakening formal approval or release gates.
- Use explicit workflow states such as `draft → preliminary → reviewed → approved → released`. Do not present an incomplete or assumed result as approved merely because it was persisted.
- The saved, inspectable Case is the primary workflow outcome. JSON/CSV/Excel are optional outputs, not substitutes for the Case history and canonical result.
- A legacy or stale Case must receive an explicit recovery route. No client should reverse-engineer the state machine from disabled buttons.

## Failure-layer diagnosis

Before correcting a symptom, identify which phase failed:

1. asset or module loading;
2. file decoding or format support;
3. OCR or other perception;
4. structural reconstruction;
5. semantic mapping or classification;
6. arithmetic/domain validation;
7. human review/readiness;
8. Case persistence/navigation; or
9. export/downstream transformation.

A failure in one layer must not be reported as another. For example, a stale browser chunk is not OCR failure, readable text with collapsed columns is not low recognition confidence, and an unmapped source value is not evidence that the source omitted it.

## Evidence strength, artifact parity, and release

Describe evidence strength explicitly. A useful minimum ladder is:

1. unit or synthetic fixture;
2. isolated authorized realistic document;
3. local production-build replay;
4. deployed smoke verification; and
5. deployed or deployed-equivalent representative replay.

Do not use a lower level as evidence for a higher claim. Every retained result or release candidate should bind:

- input identity or safe hash;
- explicit Case and result identity;
- extraction/calculation/model and code version;
- output artifact identity or hash;
- validation and trust verdict;
- workflow/release status; and
- known limitations and authorization basis.

Treat earlier artifacts as immutable historical evidence, not as proof of the current build. Validate release notes and test counts against current automated results so stale documentation cannot become release evidence.

Post-deployment replay must respect confidentiality. Use public, synthetic, anonymized, or explicitly authorized inputs on the public surface. Test protected client material only in a secure authorized environment or locally against the exact released build, retaining safe hashes and observations rather than publishing the documents.

## Consolidated failure audit

The examples below are evidence for the general rules, not a domain-rule catalogue. FIN mappings, accounting equations, Incoterm logic, freight, insurance, OCR patterns, and benchmark amounts remain in their owning Agent documentation and tests.

| What happened | Root cause | Correction | Reusable rule | Regression evidence |
|---|---|---|---|---|
| TenderBalance and costing were initially represented as separate product links/apps despite the agreed unified client suite. | Product-page identity was conflated with application and canonical Agent identity. | Unified both practical Agents inside Tender Apps; Command Center lists and opens pages on the separate client origin. | A practical Agent page is not automatically a new app or a new canonical Agent. Confirm placement and audience boundaries first. | `tests/client-product-boundary.test.mjs`; [`tenderapps-product-boundary.md`](./tenderapps-product-boundary.md). |
| The TenderBalance landing page explained the product but did not make the finished deliverable tangible. | Architecture/TOR text was treated as the primary UX instead of the client’s product promise. | Introduced a reusable input → transformation → dominant finished-product manifesto and miniature result preview. | The primary viewport must visualize the Agent’s sellable finished product before asking for input. | `tests/tender-balance-client-workflow.test.mjs` manifesto assertion; equivalent logistics product-story assertions. |
| The client reached disabled approval controls without a clear next action. | Technical readiness conditions were exposed as button state, not translated into a guided human workflow. | Added remaining-action status, sequential review, actionable blockers, automatic readiness, approved-result state, and saved Cases. | Never make the client infer a state machine. Every blocker names why, what, where, and the next action. | TenderBalance client-workflow approval and saved-result regressions. |
| A straightforward public balance-sheet PDF was easy to read manually but the product initially relied too heavily on synthetic/envelope paths. | Real extraction ability had not been independently benchmarked before production claims. | Ran a Codex benchmark, then added local PDF/OCR extraction and exact MF291 row/value observations before production integration. | Test uncertain document intelligence on authorized realistic documents outside production before implementing it. | `tests/evidence/tender-balance-mf291-benchmark-observations.json`; 35-row/105-value benchmark test. |
| PDF years and figures such as `202` + `4` or adjacent numeric fragments were split or collapsed across columns. | Flat PDF.js text concatenation ignored glyph geometry and line boundaries. | Added geometry-aware page reconstruction that joins adjacent glyph fragments but preserves meaningful column gaps. | Preserve layout semantics before semantic parsing; test the actual low-level fragment shape that failed. | `reconstructs adjacent PDF number fragments without collapsing reporting columns`. |
| FIN-1 used false years/values or showed gaps even though the uploaded publication contained legitimate balance and income statements. | Document-wide periods, structure templates, and statement content were not separated before canonical mapping. | Added document-role eligibility, statement-local period normalization, template-example exclusion, and source-traceable income mappings. | Role gate first, isolate statement context second, map fields third. Never let template examples or unrelated periods enter canonical facts. | FIN-1 contamination and multi-statement regressions; Exhibit B observation file. |
| Notes pages headed with “Balance Sheet” could become the primary statement, while a valid comprehensive-income title and common labels were missed. | Statement detection was simultaneously too permissive about page context and too narrow about legitimate title/label variants. | Required statement-local title evidence, excluded notes tables from primary selection, and expanded title/label patterns based on the observed failure family. | Classify the statement/page before extracting its fields; broaden by semantic family, never by filename or page number. | `keeps note tables out of the primary balance sheet and accepts comprehensive-income statement titles`. |
| FIN readiness conflated extraction problems, mapping problems, genuine source gaps, and historical coverage; some partial forms could not proceed truthfully. | One generic “missing” state stood in for several different causes and blocking semantics. | Added problem taxonomy, balance-field readiness, partial FIN generation for genuine optional/source gaps, and separate coverage requirements. | Missing is a semantic state, not a generic error. Block only when the requested output cannot be produced truthfully. | FIN-1 missing/partial/coverage tests and `FinancialProblemType`. |
| Result/FIN pages could resolve stale state or the latest Case instead of the explicitly selected Case. | Agent-level navigation and Case-scoped output identity shared implicit state. | Added explicit Case IDs, route parsing, and no-latest-case fallback. | Global Agent pages and Case outputs are different objects; all output navigation must preserve explicit Case identity. | `tests/tender-balance-navigation.test.mjs`. |
| Logistics results risked looking exact or live even when packing, freight, insurance, and loadability were benchmark-derived. | Calculation correctness, evidence quality, and display precision were not represented as separate dimensions. | Separated source facts, calculations, estimates, assumptions, confidence, benchmark vintage, exact arithmetic, and `≈` presentation. | UI precision and visual certainty must follow provenance, not the number of decimal places available. | Logistics evidence-class, benchmark-status, exact/approximate UI, and reconciliation tests. |
| Supplier printed totals and subordinate priced accessories could be double-counted or treated as unquestioned truth. | A printed summary and every price-bearing row were assumed to share the same canonical grain. | Retained all evidence rows, identified primary commercial lines, preserved the printed-total discrepancy, and reconciled the working baseline deterministically. | Preserve all source evidence, but define the canonical calculation grain and reconcile competing totals explicitly. | Semantic quotation extraction and 165-line allocation regressions. |
| A spreadsheet quotation could be read as cells without producing a trustworthy commercial total or source term. | Flattened document text discarded the worksheet row/column relationships needed to recognize priced lines and totals. | Added a spreadsheet-specific commercial adapter that calculates priced rows and preserves printed-total comparison before feeding the shared case model. | Use format-aware extraction adapters to recover structure, then converge on one canonical result model; do not make the UI the parser. | `spreadsheet quotation extraction calculates the commercial total from priced rows`. |
| Clients could not tell which logistics workflow to select or why Continue was disabled. | Internal calculation modes were presented without client-intent guidance or an exact missing-input list. | Added “Choose this when” guidance and per-step “To continue, complete…” messages. | Translate technical modes and gates into client decisions and actionable missing information. | Guided client-flow assertions in `tests/logistics-costing.test.mjs`. |
| A useful preliminary logistics result could not be saved unless every formal approval condition was satisfied. | Case persistence was conflated with approval, making a non-blocking review condition a dead end. | Separated preliminary and approved Case states; saving remains available while approval retains its stricter evidence gates. | Preserve a truthful partial/preliminary product when the contract allows it; formal approval is a state transition, not the only persistence path. | Logistics client-workflow assertions for `Save preliminary case` and `Confirm and save estimate`. |
| Large scanned PDFs and stale deployed chunks could leave upload apparently stuck or unrecoverable. | OCR attempted expensive work without bounded discovery, and cached module failures had no safe one-time recovery. | Added semantic OCR triage in bounded batches, candidate prioritization, retry-safe worker acquisition, progress stages, and guarded preload reload. | Bound expensive perception, expose real progress, and make transient release/runtime failures recoverable without loops. | `tests/tender-balance-upload-resilience.test.mjs`. |
| Synthetic fixtures, authorized public benchmarks, and local client documents risked being described with the same evidentiary weight. | “Demo works” and “real source verified” were not consistently separated. | Labelled synthetic evidence, recorded authorized benchmark observations, and kept protected client documents out of the repository and deployment. | Always state what is real, synthetic, assumed, authorized, local-only, and unmeasured. | TenderBalance “What is real and what is simulated”; logistics test-evidence source handling. |

## Automated safeguards and evidence map

The policy manifest makes the lifecycle order, knowledge layers, provenance classes, trust dimensions, workflow states, failure layers, artifact-parity fields, blocking rule, failure-audit fields, and minimum test families machine-checkable. `tests/real-tender-agent-development-methodology.test.mjs` protects that contract and verifies that project instructions and this document remain discoverable.

Concrete behavior remains protected in the owning suites rather than duplicated here:

- TenderBalance extraction, traceability, arithmetic, PDF/OCR, negative/zero, missing-page, Excel, and benchmark behavior: `tests/balance-sheet-review.test.mjs`.
- FIN-1 roles, source/template isolation, statement periods, missing semantics, source/calculated reconciliation, and export: `tests/tender-balance-fin1.test.mjs`.
- Case/Agent page separation and explicit output identity: `tests/tender-balance-navigation.test.mjs`.
- Client product promise, guided review, saved Cases, optional audit, and accessibility controls: `tests/tender-balance-client-workflow.test.mjs`.
- TENDER LOGISTICS COST Incoterms, exact arithmetic, estimation, provenance, loadability, document trust, workflow, and result hierarchy: `tests/logistics-costing.test.mjs` and `tests/logistics-costing-simulations.test.mjs`.

## Known methodology gaps and next improvements

1. A platform-wide value envelope is not implemented. TenderBalance and logistics currently use compatible but different local vocabularies for user input, assumptions, calculations, estimates, and missingness. The next cross-Agent data-contract change should normalize those dimensions without erasing the richer local terms.
2. TenderBalance has exact authorized benchmarks but not yet a statistically representative, multilingual client-document corpus with field-level precision/recall metrics.
3. TENDER LOGISTICS COST has a verified quotation and deterministic benchmark model, but no governed live carrier, tariff, tax, FX, packing, or equipment-capacity feeds; browser `number` arithmetic should become decimal/rational money before high-value production use.
4. Browser-local Cases are not durable Artifacts. Authentication, tenant authorization, immutable versioning, approval enforcement, retention, and server-side audit remain production-runtime work.
5. Several UI safeguards are source-level contract tests. A future test layer should add multi-browser, keyboard, tablet, mobile, stale-release, and persisted-Case end-to-end coverage.
6. Every completed real-Agent cycle should append only genuinely general lessons here; extraction patterns, Incoterms rules, FIN fields, and benchmark amounts stay in the owning Agent’s files.
7. Overall trust calibration still needs representative labelled corpora and empirically justified thresholds; extraction confidence alone must not be presented as result trust.
8. Release evidence is not yet generated as one automated parity ledger across every practical Agent. Until it is, revision, artifact, test, documentation, and replay freshness require an explicit audit.

## End-of-cycle handoff template

| Deliverable | Required result |
|---|---|
| Approved input/output contract | Real inputs, primary finished product, consumer, and negative scope are explicit. |
| Experiment evidence | Authorized realistic examples, actual outputs, and comparison observations are retained safely. |
| Failure audit | Each important failure includes cause, general correction, reusable rule, and regression. |
| Production result | One canonical result drives UI, Case, exports, and downstream handoffs. |
| Trust and readiness | Recognition, structure, semantic mapping, arithmetic/domain checks, and human review are assessed without collapsing contradictions into one score. |
| Persistence states | Draft/preliminary retention, review, approval, and release are distinct and truthful. |
| Verification | Focused tests, realistic replay, production build, generated-artifact inspection, and proportionate full suite pass. |
| Limitations | Unsupported formats, data sources, security/runtime gaps, and uncertainty are visible. |
| Release status | Input/result identities, code/model revision, artifact verdict, deployment authorization, replay evidence, or explicit not-deployed state are recorded. |
| Methodology feedback | General lessons, Agent-specific updates, and the next experiment are separated. |
