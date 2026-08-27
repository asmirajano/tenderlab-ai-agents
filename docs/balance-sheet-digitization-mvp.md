# TenderBalance — Balance Sheet Digitization MVP

**Product family:** Tender Apps  
**Product:** TenderBalance — verified balance-sheet digitization  
**Current maturity:** interactive MVP simulation; not a production client-data service

## Architecture placement

**Disposition:** `EXISTING AGENT — SPECIALIZED CAPABILITY`

TenderBalance is a standalone client-facing product powered by a bounded capability of **TL-A008 Company Verification Agent**. It is not a 65th canonical Agent and it is not a client route inside the internal Command Center.

- TL-A008 owns evidence-backed verification of company facts and the verified company dossier.
- TL-A022 Tender OCR & Translation Agent may provide a readable text layer, but does not interpret financial meaning.
- TL-A003 Evidence & Provenance Agent governs source/claim traceability.
- TL-A004 Audit & Version Control Agent governs versions and change history.
- TL-A002 Human Approval Agent supplies the approval pattern; the reviewer remains the authority.
- TL-A025 Eligibility & Qualification Agent is a downstream consumer only. It may use approved financial facts against a tender criterion, but this MVP never makes that decision.

The persistent output extends the existing `dataset:TEA-DS-FINANCIAL-FILINGS` record. The original authorized client file belongs in `dataset:TEA-DS-EVIDENCE-VAULT`. UI selection, draft corrections, and synthetic fixtures are not canonical client evidence.

## TOR and execution contract

`Company reviewer supplies a balance sheet → local intake/text extraction → identify statement metadata → extract reported line items → normalize without overwriting → validate arithmetic and exceptions → human correction/approval → versioned structured output → Company Profile / Eligibility / future comparison and matching consumers`

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
7. Flag missing pages, absent text/OCR need, low confidence, missing required totals, arithmetic mismatch, comparative discrepancy, and sign/classification anomalies.
8. Require line inspection and clear all blocking issues before statement approval.
9. Export the stable JSON or flat CSV representation. No external-system write occurs.

### Output and handoff

- Schema: [`packages/catalog-schema/schema/balance-sheet-review.schema.json`](../packages/catalog-schema/schema/balance-sheet-review.schema.json)
- Record grain: one reviewed balance-sheet document/version, with one line-item record per original label and one value per reported period/column.
- Stable join keys: `reviewId`, `source.documentId`, line-item `id`, `period`, `normalizedConcept`.
- Consumers: verified Company Profile facts, later tender-specific Eligibility checks, future financial comparisons, and future tender matching features.
- Approval means “the transcription and checks were reviewed.” It never means the company is financially healthy, eligible, or recommended.

## Running the MVP

```bash
pnpm install --frozen-lockfile
pnpm dev:tender-balance
```

Open `http://127.0.0.1:4175`.

The internal Command Center runs separately with `pnpm dev` at `http://127.0.0.1:3000`. Its `/products` page is a team-facing register that can open TenderBalance; the TenderBalance app has no navigation, route, or permission path back into the Command Center.

The page starts with five clearly labelled synthetic fixtures. Use **Add balance sheet** for a local file. Digital PDFs are read client-side. Image-only inputs are accepted into a blocked review state and require OCR or manual transcription; the MVP does not send them to an external OCR service.

Run validation with:

```bash
node --experimental-strip-types --test tests/balance-sheet-review.test.mjs
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

## What is real and what is simulated

The MVP is a **workflow-faithful simulation**, not a client-case accuracy benchmark.

Implemented and exercised as real software:

- client-side text extraction from a genuine generated PDF text layer;
- metadata/line parsing, normalization, immutable raw values, source-page/column references, confidence, and review state;
- arithmetic and cross-document validations;
- correction audit entries, approval gates, comparison, JSON export, and CSV export;
- responsive standalone product UI and explicit exception states.

Simulated or assumed:

- every displayed entity, document identity, figure, and scenario;
- OCR results and confidence in the low-confidence fixture—the app does not run an OCR engine;
- reviewer identity, storage, tenancy, retention, authentication, malware scanning, and production audit logging;
- statement layouts beyond the tested text patterns and fixture taxonomy.

Accordingly, the workflow closely represents how a real reviewer would inspect, correct, approve, compare, and export a balance-sheet record, but extraction accuracy on real client documents remains unmeasured until authorized representative files are tested.

## Known limitations

- Image-only PDF and image OCR is not bundled. The app flags the requirement instead of inventing values. A reviewed JSON extraction envelope can carry externally produced OCR text and confidence.
- Digital PDF parsing uses its text layer. Complex tables, merged cells, rotated pages, handwritten notes, and unusual layouts may require an adapter or manual mapping.
- The label taxonomy covers the MVP concepts and common English, Russian, and Uzbek labels; unmapped labels remain visible and flagged.
- Currency/unit detection is heuristic unless supplied explicitly.
- Subtotal validation only runs when sufficient underlying mapped lines are present. `not-testable` is not treated as passed.
- Corrections and approvals are browser-memory state in this static MVP. Export the record to preserve work; durable authentication, artifact storage, retention, tenant isolation, and server-side access controls require a production runtime.
- The local standalone build demonstrates surface separation, not production authentication. A client pilot must run on a separate origin with its own server-enforced client/reviewer access policy.
- No income statement, cash-flow statement, audit-opinion analysis, financial ratio interpretation, eligibility decision, or recommendation is implemented.

## Migration to Quick-Value Agents

Move the capability as a versioned module, not by copying the whole TenderLab application:

1. Copy the versioned `packages/tender-balance` engine, the JSON Schema, focused tests, and only the required fixture shapes.
2. Preserve schema version `1.0.0`, source-reference fields, issue codes, and the separation of reported/normalized/corrected/calculated values.
3. Replace TenderLab UI/navigation with the Quick-Value shell while keeping the approval gate and export contract.
4. Rebind the capability owner to the approved Quick-Value Agent identity; do not carry `agent:TL-A008` as a new Quick-Value identity without a registry placement audit.
5. Add the Quick-Value document/OCR/storage adapters behind the same input/output contracts.
6. Re-run this acceptance suite plus Quick-Value authorization, retention, multilingual OCR, and durable-audit tests before using client evidence.
