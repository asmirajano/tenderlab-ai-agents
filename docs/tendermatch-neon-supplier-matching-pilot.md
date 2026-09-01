# TenderMatch Neon v1.3 supplier and exploratory-matching pilot

Status: read-only snapshot pilot, 2026-09-01. This records the approved supplier integration and matching-method gate for `agent:TL-A031`, plus the sanitized Firebase-compatible snapshot release. It does not authorize Neon writes, supplier selection, qualification, Bid/No-Bid, outreach, or production operation.

## Pinned source and authority boundary

- Tender input remains the committed 60-record Central Asia current-at-extraction snapshot. It was not re-extracted in this stage.
- Supplier input is exactly 17 profiles from batch `accio-goods-works-suppliers-2026-09-01-v1.3-critical-evidence-corrected-db-staged`, profile version `v1.3-critical-evidence-corrected-2026-09-01`.
- Consumer contract: `tendermatch-supplier-goods-works-v1.3`; immutable views `supplier_profiles_goods_works_v1_3` and `supplier_evidence_goods_works_v1_3`; current aliases must be byte-set-equivalent to those views.
- Target is the development branch of `tender-entity-registry`, database `tender_entity_registry`, endpoint fingerprint `ep-dark-dew-b15ctyr1`. Production is not connected.
- The dedicated login must be `tendermatch_supplier_consumer_dev`, solely a member of `tendermatch_supplier_reader`, inside a read-only transaction using TLS `verify-full`.
- Only the four approved views are selectable. Old v2.1 views, base tables, writes, DDL, roles, contacts, messaging fields, named people, addresses, raw bodies, raw payloads and private notes are denied.
- A connection, identity, count, version, batch, alias or projection mismatch fails closed. No historical 100-supplier release or frozen ten-supplier fixture is substituted.

## Same-origin local boundary

`Browser → local Node origin → built TenderApps + /api/tendermatch/* → parameterized read-only queries → approved Neon views`

The adapter keeps the existing `connect-src 'self'` CSP. The credential is loaded only by Node from the explicit local environment file or process environment; it is never placed in `VITE_*`, an API response, client code, a bundle, a log, or this document.

| Endpoint | Contract |
| --- | --- |
| `GET /api/tendermatch/health` | Loading/ready/error plus pinned non-secret contract/profile/batch, role, four-view set and counts |
| `GET /api/tendermatch/runtime` | 17 normalized profiles, 1,020 cached evaluations and aggregate summaries with the same pinned non-secret identities |
| `GET /api/tendermatch/suppliers` | Keyset list ordered by `lower(display_name), canonical_entity_id`; limit 1–100; exact ISO2, GOODS/WORKS and readiness filters |
| `GET /api/tendermatch/suppliers/:uuid` | One approved normalized profile |
| `GET /api/tendermatch/suppliers/:uuid/evidence` | That supplier's safe non-contact evidence projection |

Invalid IDs, filters, cursor pairs and limits fail before a data query. Operands are parameterized. A failed source or a malformed same-origin response renders a visible recoverable error and never a blank page or silent historical-fixture fallback.

## Firebase static snapshot release

Firebase Hosting cannot execute the local Node adapter or access Neon secrets. The no-paid production path therefore publishes an intentionally versioned, sanitized snapshot generated from the approved local read-only API:

- runtime: `/tendermatch/data/supplier-runtime-v1.3.json`;
- evidence: `/tendermatch/data/supplier-evidence-v1.3.json`;
- manifest: `/tendermatch/data/supplier-snapshot-v1.3.manifest.json`.

The manifest binds the contract, profile and batch versions, snapshot time, counts and SHA-256 hashes. The exporter removes the database role and view names, rejects contact/email/phone/person/raw-content fields, validates supplier/evidence ownership and cardinalities, and emits only the same safe browser projection already exposed by the local API. Production displays `PINNED V1.3 SNAPSHOT` and its as-of date. This is the primary static release dataset, not a silent substitution of the historical ten-supplier fixture.

Refresh command after the approved local read-only runtime is ready:

`pnpm run export:tendermatch-static-snapshot -- --origin http://127.0.0.1:4177`

The immutable Neon v1.3 views remain authoritative. A live production API, authentication, tenant authorization, managed secret, durable cache and monitoring remain later approval gates.

## Canonical mapping and contract totals

The workspace retains canonical entity/profile/batch/source-candidate identities, legal/display name, supported ISO country/city/region, GOODS/WORKS classification, product families, works specializations, industries, materials, certifications, supported geography, capacity, revenue/turnover, readiness state, claim counts and artifact identities. Empty values stay Unknown / not disclosed.

The mapper does not create contacts, URLs outside the safe projection, precise coordinates, legacy technical-fit/readiness scores, evidence-completeness percentages, legacy pair scores, VERIFIED claims or automatic decisions. Supplier markers use a local world map and country-level placement with deterministic visual spacing only.

| Dimension | Pinned v1.3 result |
| --- | ---: |
| Profiles | 17 |
| Classification GOODS / WORKS | 14 / 3 |
| Readiness usable-with-limitations | 17 |
| Evidence rows | 289 |
| VERIFIED / INFERRED / STATED_UNVERIFIED / UNKNOWN | 0 / 17 / 226 / 46 |
| Artifact available / unavailable with limitation | 243 / 46 |
| Supplier countries | 14 |

`STATED_UNVERIFIED` is source-backed but unverified. It may support exploratory matching only when the claim has a saved artifact. It never becomes VERIFIED. UNKNOWN stays MISSING and is never zero or negative evidence.

## Match Formula v1.0

- Engine: `tendermatch-match-formula/1.0.0`
- Policy: `tendermatch-evidence-aware-goods-works/1.0.0`
- Reader label: `Preliminary notice-level match`

The v5 all-MISSING output is frozen in `docs/evidence/tendermatch-match-formula-v1-baseline.json`. Formula v1.0 separates Match Score, Data Coverage, Evidence Confidence, mandatory gates, Pair Status and consultant disposition. The complete formula, weights, confidence bands, thresholds and limitations are in `docs/tendermatch-scoring-model-card.md`.

The formula uses title/object/tags for scored technical overlap; the complete source description remains available to retrieval and explanation but boilerplate prose cannot create points. Supplier technical evidence is limited to the approved product, works, industry and material claims. Capacity and geography claims support their own bounded criteria and are not reused. Tender-specific financial, comparable-contract and mandatory eligibility comparisons remain MISSING or UNKNOWN when unsupported.

The isolated deterministic experiment covers strong overlap, weak overlap, genuine zero, missing evidence, unsupported procurement type, supplier-role failure, unavailable artifacts and confidence changes. A 25-pair current-data calibration then exposed description-boilerplate false positives; the corrected policy removed full-description terms from scored overlap. Calibration is retained in `docs/evidence/tendermatch-match-formula-v1-calibration.json`.

The fixed full replay at `2026-09-01T11:09:44.745Z` produced:

| Outcome | Count |
| --- | ---: |
| Unique pair identities | 1,020 |
| Numeric preliminary results | 48 |
| MISSING values | 972 |
| Needs verification | 3 |
| No match | 45 |
| Blocked / ineligible | 37 |
| Unassessed | 935 |
| Bingo / Strong / Potential | 0 / 0 / 0 |

The 935 unassessed pairs belong to CONSULTING, SERVICES or OTHER notices outside the approved v1.0 calculation scope. The 37 blocked pairs have an explicit GOODS/WORKS supplier-role mismatch. The 48 type-compatible pairs have 60–65% coverage and 50% confidence; three reach score 60 but remain Needs verification, while 45 have supported notice-level fit below 60. The result does not claim predictive accuracy.

- What happened → v5 erased every preliminary result.
- Root cause → its complete gate conjunction made zero VERIFIED claims function as a universal no-result rule.
- Correction → preserve evidence class as confidence, calculate only assessed criteria, retain missing criteria in Data Coverage and keep mandatory gates separate.
- Reusable rule → incomplete evidence must limit status and confidence without being silently treated as either verified truth or zero.
- Regression evidence → `tests/tendermatch-match-formula-v1.test.mjs`, exact 1,020-key replay, manifest hashes and current-pair calibration.

## UI and remaining limits

The server precomputes and caches all 1,020 results before ready state, so the browser performs no database or bulk matching work. The Overview, radar, 17-profile directory, evidence review, 60-tender directory, 17 × 60 full matrix, tender-first review, supplier-first review and explicit Case reconstruction consume the same inventory. The Full Matrix provides both CSV and a real typed Excel workbook export of all 1,020 pair evaluations; the workbook preserves audit identities, numeric value types, status/gates/criteria, evidence references and versions. Current counts are data-derived. Historical Cases keep their supplier identity and are not silently remapped.

This remains an `isolated-method-validated` read-only snapshot pilot. Predictive validity, automatic tender/supplier refresh, multilingual taxonomy depth, technical-specification parsing, qualification, tender-threshold comparison, commercial/delivery analysis, authentication, tenant isolation, durable result/artifact storage and a live production API remain unresolved. Consultant disposition is explicit and separate; TenderMatch never selects a bidder, issues Bid/No-Bid, promotes a tender or sends outreach.
