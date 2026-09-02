# TenderBalance — Tender Financial Forms MVP

**Product family:** Tender Apps  
**Product:** TenderBalance — source-traceable FIN-1 and FIN-2 preparation
**Current maturity:** interactive MVP with a real-document benchmark; not a production client-data service

## Architecture placement

**Disposition:** `EXISTING AGENT — SPECIALIZED CAPABILITY`

TenderBalance is a dedicated page inside the unified Tender Apps client application, powered by a bounded capability of **TL-A008 Company Verification Agent**. It is not a 65th canonical Agent and it is not a client route inside the internal Command Center.

- TL-A008 owns evidence-backed verification of company facts and the verified company dossier.
- TL-A022 Tender OCR & Translation Agent may provide a readable text layer, but does not interpret financial meaning.
- TL-A003 Evidence & Provenance Agent governs source/claim traceability.
- TL-A004 Audit & Version Control Agent governs versions and change history.
- TL-A002 Human Approval Agent supplies an optional professional-control pattern. Formal approval is not required in the default client journey.
- TL-A025 Eligibility & Qualification Agent is a downstream consumer only. It may use approved financial facts against a tender criterion, but this MVP never makes that decision.

The persistent output extends the existing `dataset:TEA-DS-FINANCIAL-FILINGS` record. The original authorized client file belongs in `dataset:TEA-DS-EVIDENCE-VAULT`. UI selection, draft corrections, and synthetic fixtures are not canonical client evidence.

## TOR and execution contract

`Client uploads financial statement(s) → local intake/text extraction or OCR → identify statement pages and metadata → extract and preserve reported line items → normalize without overwriting → validate arithmetic and distinguish source findings from extraction uncertainty → save the canonical financial evidence Case → map eligible evidence into IFI financial forms → client review → generated FIN-1 and FIN-2 → tender-submission preparation / later qualification consumers`

The default product contract is **Upload → Agent works → Result**. Human intervention is exception-based: the client is asked only for evidence or information the agent genuinely cannot determine safely. Row inspection, corrections, provenance review, and formal approval remain available under **Advanced Review & Audit**, but do not gate a high-confidence result.

### Purpose

Turn supplied financial statements into source-traceable, reviewable FIN-1 Historical Financial Performance and FIN-2 Average Annual Turnover forms for tender use. Balance-sheet digitization and reconciliation are intermediate evidence work; the capability does not decide tender eligibility or approve a submission.

### Inputs

- explicitly supplied digital PDF, TXT, image, or JSON extraction envelope;
- source file identity, hash, page count, and any known expected page count;
- digital text, externally produced OCR text with confidence, or manual transcription;
- optional explicit reporting entity, period, currency, unit, language, and line-item mappings.

No access to an originating-session client audit report is assumed.

### Ordered checks

1. Compute or preserve file identity and page manifest.
2. Identify reporting entity, reporting date/periods, currency, units, language, and comparative columns.
3. Preserve every original label and reported cell value.
4. Map supported labels to normalized balance-sheet concepts and classifications.
5. Keep normalized values, reviewer corrections, and calculated values separate from reported values.
6. Validate `Assets = Liabilities + Equity`, `Net assets = Assets - Liabilities`, and testable current subtotals.
7. Distinguish extraction uncertainty from a faithfully extracted source discrepancy; minor reported rounding differences are findings, not mandatory review work.
8. Automatically present and save a high-confidence result. Ask one focused question or request only the missing evidence when a genuine blocker prevents safe processing.
9. Offer source traceability, corrections, cross-document comparison, formal approval, JSON, CSV, and formatted Excel export as optional controls. No external-system write occurs.

### Output and handoff

- Schema: [`packages/catalog-schema/schema/balance-sheet-review.schema.json`](../packages/catalog-schema/schema/balance-sheet-review.schema.json)
- FIN-1 schema: [`packages/catalog-schema/schema/fin1-historical-performance.schema.json`](../packages/catalog-schema/schema/fin1-historical-performance.schema.json)
- FIN-2 schema: [`packages/catalog-schema/schema/fin2-size-of-operation.schema.json`](../packages/catalog-schema/schema/fin2-size-of-operation.schema.json)
- Record grain: one processed balance-sheet document/version, with one line-item record per original label and one value per reported period/column.
- Stable join keys: `reviewId`, `source.documentId`, line-item `id`, `period`, `normalizedConcept`.
- Primary client output: reviewable FIN-1 and FIN-2 tender-form artifacts derived from the saved canonical financial evidence Case.
- Consumers: client tender-submission preparation, verified Company Profile facts, later tender-specific Eligibility checks, future financial comparisons, and future tender matching features.
- A processed result is immediately available and saved as a local case. Optional formal approval means only that a named reviewer reviewed the transcription and checks; it never means the company is financially healthy, eligible, or recommended.

## Downstream FIN Forms workflow

The successful balance result now continues to **Prepare IFI Financial Forms**. The shared framework implements **FIN-1 — Historical Financial Performance** and **FIN-2 — Size of Operation (Average Annual Turnover)**.

The reusable production boundary is:

`source documents → document-role gate → canonical financial dataset → field-level provenance → period normalization → FIN-1 mapping → client review → USD/EUR presentation → generated form`

- `FINANCIAL_SOURCE` and traceable `USER_INPUT` may contribute client facts.
- `TEMPLATE` and `OTHER_SUPPORTING_DOCUMENT` are technically ineligible for generated financial values.
- `TEMPLATE_EXAMPLE` provenance can never populate the canonical dataset or FIN-1.
- Historical columns are created only from legitimate source periods. `Average` remains auditable but is not a FIN year.
- A missing required indicator inside an available year is a field-level source-data gap. An unprovided year is not manufactured as a missing column.
- Reported Net Worth is retained as reported and compared with calculated `Assets − Liabilities`; discrepancies remain visible.
- Working Capital is calculated only from eligible Current Assets and Current Liabilities and retains its formula and operand source IDs.
- When the supplied financial document contains a clearly titled Income Statement or Statement of Operations, FIN-1 extracts Revenue, Profit Before Tax, and Profit After Tax with page-level source traceability. A genuinely balance-only case can still generate a partial FIN-1 with those fields explicitly unavailable.

### FIN-1 exchange-rate presentation

The digitized balance sheet and canonical financial dataset always retain the source currency and source units. FIN-1 is a separate calculated presentation in either **USD** or **EUR**, selected by the client.

- The versioned app dataset `TEA-DS-CBU-FIN-FX-2015-2025` is generated from 132 official monthly exchange-rate archives published by the Central Bank of the Republic of Uzbekistan. It covers 2015–2025 and the currencies present in those archives.
- The importer is [`scripts/fetch-cbu-fin-fx.mjs`](../scripts/fetch-cbu-fin-fx.mjs); the generated app asset is [`packages/tender-balance/src/data/cbu-fin-fx-2015-2025.json`](../packages/tender-balance/src/data/cbu-fin-fx-2015-2025.json).
- Each CBU rate is normalized for its published nominal before cross-rate calculation. Balance-sheet indicators use the last common official observation on or before 31 December of the source-driven year. Income indicators use the arithmetic mean of common official daily cross-rates for that year.
- Every converted field is `CALCULATED`, retains the original source value/currency/provenance, and carries the provider, dataset identity/hash, rate type, rate, closing date where applicable, observation count, and formula.
- The FIN Excel artifact contains separate **FIN-1 Form**, **Source & Mapping**, and **FX Conversion Audit** sheets. Changing USD/EUR does not mutate the saved Case or digitized balance sheet.
- Conversion is blocked when the source currency or historical year is outside the saved evidence. No current rate, guessed rate, template value, or silent extrapolation is used.

### FIN-2 data and calculation contract

FIN-2 is a separate Case-scoped projection of the same canonical financial dataset. Its template supplies only field structure and calculation requirements; populated bidder names, years, turnover, rates, equivalents, and averages are ineligible client evidence.

`eligible revenue/turnover evidence → source-driven years → year-end closing FX → converted equivalent → calculated average annual turnover`

- The current bidder model is deliberately `SINGLE_BIDDER`. JV, Consortium, member percentages, combined turnover, and partner qualification are not represented.
- Strongly identified Revenue, Net Revenue, Sales Revenue, Net Sales, or Annual Turnover lines can supply Annual Turnover. Generic Sales, Receipts, or Income labels produce `MAPPING_REVIEW_REQUIRED` rather than an automatic semantic substitution.
- Original labels, raw reported values, source pages, periods, currency, units, and provenance remain visible. Missing turnover stays `MISSING`; it is never estimated.
- FIN-2 uses the last common official CBU observation on or before year-end for each year by default, matching the form's annual exchange-rate structure. The exact rate, date, dataset/hash, quote convention, conversion formula, and converted result remain auditable.
- Average Annual Turnover includes only legitimate converted turnover values, lists the included years and mapping IDs, and is `CALCULATED`. Required historical coverage is separate: two supplied years remain two columns even when a tender requires three.
- Bidding process, invitation number, purchaser, and required-year count are explicit browser-local, Case-scoped user inputs. They are never inferred from template examples.
- The FIN-2 Excel artifact contains **FIN-2 Form**, **Source & Mapping**, and **FX Conversion Audit** sheets; CSV is also available.

## Running the MVP

```bash
pnpm install --frozen-lockfile
pnpm dev:tender-apps
```

Open `http://127.0.0.1:4174/balance-sheet-review`.

The internal Command Center runs separately with `pnpm dev` at `http://127.0.0.1:3000`. Its `/products` page is a team-facing register that opens the TenderBalance page on the separate Tender Apps origin; Tender Apps has no navigation, route, or permission path back into the Command Center.

Use **Add balance sheet** for one or more local files. The client takes one required action—upload—and then sees real processing stages for reading, extraction, structuring, arithmetic checks, and result preparation. A successful result opens automatically and is saved to **Cases** in browser storage. Clearly labelled synthetic demonstrations remain available separately for scenario testing. Digital PDFs are read client-side; supported image inputs use the bundled local OCR path and are never sent to an external OCR service.

Run validation with:

```bash
node --experimental-strip-types --test tests/balance-sheet-review.test.mjs
node --experimental-strip-types --test tests/tender-balance-fin1.test.mjs
node --experimental-strip-types --test tests/tender-balance-fin1-fx.test.mjs
node --experimental-strip-types --test tests/tender-balance-fin2.test.mjs
pnpm lint
pnpm test
```

## Synthetic acceptance fixtures

| Fixture | Coverage |
|---|---|
| Clean digital PDF | two reporting periods, traceable rows, exact subtotals and accounting equation |
| Low-confidence scan | OCR confidence below review threshold, multilingual labels, explicit manual review |
| Negative balance | accumulated loss preserved as negative; no silent sign correction |
| Missing statement page | partial extraction remains visible, approval stays blocked |
| Comparative conflict | overlapping prior-period values compared across documents and discrepancies surfaced |

All fixture entities, filenames, hashes, and amounts are synthetic and are labelled as such in the UI and dataset demo.

## Authorized real-document benchmark

The supplied public example `balance-sheet-a-financial-management-tool_MF291.pdf` is a real extraction benchmark, not a synthetic fixture and not client evidence. The engine independently identifies page 3 as the statement and produces:

| Measure | Result |
|---|---:|
| Reporting entity | Joe and Jean Farmer |
| Reporting year | 2017 |
| Columns | January 1; December 31; Average |
| Source rows | 35 / 35 |
| Reported values | 105 / 105 |
| Unreadable values | 0 |
| Ambiguous mappings | 0 |
| Genuine source findings | 8 minor $1–2 rounding differences |
| Blocking extraction issues | 0 |

The benchmark is covered by the automated suite. It verifies statement-page isolation, wrapped-label handling, full hierarchy, current/noncurrent and personal sections, zero values, reported totals, and the separation of extraction confidence from source arithmetic findings. The normal client path is one upload followed by the completed digitized statement and an automatically saved case.

## What is real and what is simulated

The MVP combines synthetic workflow simulations with one authorized real-document extraction benchmark. It is not yet a production client-data service or a representative accuracy study across client document families.

Implemented and exercised as real software:

- client-side PDF text extraction and local image OCR;
- metadata/line parsing, normalization, immutable raw values, source-page/column references, confidence, and review state;
- arithmetic and cross-document validations;
- automatic result presentation and browser-local case persistence after successful processing;
- optional correction audit entries, formal approval, comparison, JSON, CSV, and multi-sheet Excel export;
- responsive practical-Agent page inside the unified Tender Apps shell, visible processing progress, and focused exception states;
- exact page-3, 35-row, 105-value extraction of the authorized MF291 benchmark.
- dynamic FIN-1 generation from normalized source periods, with field-level mapping provenance and a hard template-example eligibility gate.
- deterministic USD/EUR FIN presentation from the saved 2015–2025 CBU archive, with original-value retention and Excel FX-audit evidence.

Simulated or assumed:

- the five built-in demonstration entities, document identities, figures, and scenarios;
- low-confidence fixture OCR outcomes and confidence values;
- reviewer identity, durable storage, tenancy, retention, authentication, malware scanning, and production audit logging;
- statement layouts beyond the tested text patterns and fixture taxonomy.

Accordingly, the product now demonstrates the intended client journey and one exact real-document result. Extraction accuracy across representative client statements remains unmeasured until a broader, authorized benchmark set is tested.

## Known limitations

- Local image OCR is available but will be less reliable than a clear PDF text layer; unreadable or genuinely ambiguous inputs remain explicit blockers and figures are never invented. A reviewed JSON extraction envelope can also carry externally produced OCR text and confidence.
- Digital PDF parsing uses its text layer. Complex tables, merged cells, rotated pages, handwriting, multi-statement publications, and unusual layouts may still require layout adapters or a focused client clarification.
- The label taxonomy covers the MVP concepts and common English, Russian, and Uzbek labels; unmapped labels remain visible and flagged.
- Currency/unit detection is heuristic unless supplied explicitly.
- Automatic FIN exchange-rate presentation is currently bounded to source-driven years 2015–2025 and currencies available in the saved CBU archive. Identity conversion remains valid outside this range when the source and selected FIN currency are the same. Other years or unsupported currencies require a separately authorized rate workflow; the app does not extrapolate.
- Subtotal validation only runs when sufficient underlying mapped lines are present. `not-testable` is not treated as passed.
- Cases, corrections, and optional approvals are browser-local state in this static MVP. They survive routes and browser sessions on the same origin, but are not durable server records. Authentication, artifact storage, retention, tenant isolation, synchronization, and server-side access controls require a production runtime.
- The unified client build demonstrates surface separation, not production authentication. A client pilot requires server-enforced client/reviewer authorization and tenant isolation.
- FIN-1 consumes the required balance-derived fields plus Revenue, Profit Before Tax, and Profit After Tax from a clearly identified Income Statement or Statement of Operations in the supplied evidence. Broader income-statement analysis, cash-flow analysis, audit-opinion analysis, financial-ratio interpretation, eligibility decisions, and recommendations remain out of scope.

## Migration to Quick-Value Agents

Move the capability as a versioned module, not by copying the whole TenderLab application:

1. Copy the versioned `packages/tender-balance` engine, the JSON Schema, focused tests, and only the required fixture shapes.
2. Preserve schema version `1.0.0`, source-reference fields, issue codes, and the separation of reported/normalized/corrected/calculated values.
3. Replace TenderLab UI/navigation with the Quick-Value shell while preserving the **Upload → Agent works → Result** contract, automatic case persistence, focused exception requests, and optional—not mandatory—professional approval controls.
4. Rebind the capability owner to the approved Quick-Value Agent identity; do not carry `agent:TL-A008` as a new Quick-Value identity without a registry placement audit.
5. Add the Quick-Value document/OCR/storage adapters behind the same input/output contracts.
6. Re-run this acceptance suite plus Quick-Value authorization, retention, multilingual OCR, and durable-audit tests before using client evidence.
