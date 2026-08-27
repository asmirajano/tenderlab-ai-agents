# TenderBalance — Balance Sheet Digitization MVP

**Product family:** Tender Apps  
**Product:** TenderBalance — verified balance-sheet digitization  
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

`Client uploads balance sheet(s) → local intake/text extraction or OCR → identify the statement page and metadata → extract and preserve reported line items → normalize without overwriting → validate arithmetic and distinguish source findings from extraction uncertainty → automatically show and save the structured result → Prepare IFI Financial Forms → FIN-1 mapping review → generated FIN-1 → Company Profile / Eligibility / future comparison and matching consumers`

The default product contract is **Upload → Agent works → Result**. Human intervention is exception-based: the client is asked only for evidence or information the agent genuinely cannot determine safely. Row inspection, corrections, provenance review, and formal approval remain available under **Advanced Review & Audit**, but do not gate a high-confidence result.

### Purpose

Read, review, and digitize company balance sheets into trustworthy structured records suitable for later tender-related analysis. The capability stops at verified financial facts.

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
- Record grain: one processed balance-sheet document/version, with one line-item record per original label and one value per reported period/column.
- Stable join keys: `reviewId`, `source.documentId`, line-item `id`, `period`, `normalizedConcept`.
- Consumers: verified Company Profile facts, later tender-specific Eligibility checks, future financial comparisons, and future tender matching features.
- A processed result is immediately available and saved as a local case. Optional formal approval means only that a named reviewer reviewed the transcription and checks; it never means the company is financially healthy, eligible, or recommended.

## Downstream FIN-1 workflow

The successful balance result now continues to **Prepare IFI Financial Forms**. The first implemented template is **FIN-1 — Historical Financial Performance**.

The reusable production boundary is:

`source documents → document-role gate → canonical financial dataset → field-level provenance → period normalization → FIN-1 mapping → client review → generated form`

- `FINANCIAL_SOURCE` and traceable `USER_INPUT` may contribute client facts.
- `TEMPLATE` and `OTHER_SUPPORTING_DOCUMENT` are technically ineligible for generated financial values.
- `TEMPLATE_EXAMPLE` provenance can never populate the canonical dataset or FIN-1.
- Historical columns are created only from legitimate source periods. `Average` remains auditable but is not a FIN year.
- A missing required indicator inside an available year is a field-level source-data gap. An unprovided year is not manufactured as a missing column.
- Reported Net Worth is retained as reported and compared with calculated `Assets − Liabilities`; discrepancies remain visible.
- Working Capital is calculated only from eligible Current Assets and Current Liabilities and retains its formula and operand source IDs.
- Balance-only cases can generate a partial FIN-1. Revenue, Profit Before Tax, and Profit After Tax remain explicitly unavailable until a legitimate Income Statement source is supported and supplied.

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
- Subtotal validation only runs when sufficient underlying mapped lines are present. `not-testable` is not treated as passed.
- Cases, corrections, and optional approvals are browser-local state in this static MVP. They survive routes and browser sessions on the same origin, but are not durable server records. Authentication, artifact storage, retention, tenant isolation, synchronization, and server-side access controls require a production runtime.
- The unified client build demonstrates surface separation, not production authentication. A client pilot requires server-enforced client/reviewer authorization and tenant isolation.
- FIN-1 currently consumes balance-derived fields only. Income-statement ingestion, cash-flow analysis, audit-opinion analysis, financial-ratio interpretation, eligibility decisions, and recommendations are not implemented; corresponding FIN-1 income fields remain declared source-data gaps.

## Migration to Quick-Value Agents

Move the capability as a versioned module, not by copying the whole TenderLab application:

1. Copy the versioned `packages/tender-balance` engine, the JSON Schema, focused tests, and only the required fixture shapes.
2. Preserve schema version `1.0.0`, source-reference fields, issue codes, and the separation of reported/normalized/corrected/calculated values.
3. Replace TenderLab UI/navigation with the Quick-Value shell while preserving the **Upload → Agent works → Result** contract, automatic case persistence, focused exception requests, and optional—not mandatory—professional approval controls.
4. Rebind the capability owner to the approved Quick-Value Agent identity; do not carry `agent:TL-A008` as a new Quick-Value identity without a registry placement audit.
5. Add the Quick-Value document/OCR/storage adapters behind the same input/output contracts.
6. Re-run this acceptance suite plus Quick-Value authorization, retention, multilingual OCR, and durable-audit tests before using client evidence.
