# TenderMatch Neon v1.3 supplier and exploratory-matching pilot

Status: local controlled pilot, 2026-09-01. This records the approved development-only, read-only supplier integration and matching-method gate for `agent:TL-A031`. It does not authorize deployment, Neon writes, supplier selection, qualification, Bid/No-Bid, outreach, or production operation.

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

Invalid IDs, filters, cursor pairs and limits fail before a data query. Operands are parameterized. A failed source or a malformed same-origin response renders a visible recoverable error and never a blank page or silent fixture fallback. Firebase remains static and unchanged; a production API host, authentication, tenant authorization, managed secret, durable cache and monitoring are later approval gates.

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

## Matching policy v5

- Engine: `tendermatch-exploratory-fit/5.0.0`
- Policy: `tendermatch-goods-works-evidence-overlap/2.0.0`
- Outputs: `exploratory-technical-fit` / `ESTIMATED`, or `insufficient-evidence` / `MISSING`

Tender text is limited to the committed title, object, description, tags, procurement type and geography. Supplier technical text is limited to the approved `product_families`, `works_specializations`, `industries_served` and `materials` evidence. Normalization uses a small versioned alias taxonomy and a generic-token stop set.

A numeric exploratory value is allowed only when all conditions pass:

1. the source tender procurement type is explicitly GOODS or WORKS and exactly matches the supplier classification;
2. the supplier is not excluded;
3. at least two relevant technical claims overlap the tender;
4. each cited input used by the score has a saved artifact and is INFERRED or STATED_UNVERIFIED;
5. at least one versioned concept overlaps the primary tender title/object/procurement corpus; and
6. at least one direct primary term or three full-corpus terms overlap.

Eligible values remain coarse and capped:

`min(85, roundTo5(40 + min(20, concepts × 10) + min(15, terms × 3) + min(10, evidence beyond two × 2)))`

Market/delivery, eligibility, compliance, references, readiness, freshness and human disposition remain separate. Capacity and revenue/turnover are stored as separate source components and are not used in technical fit unless a future tender-specific comparable requirement is explicitly mapped and reviewed. Every evaluation records tender snapshot/version, supplier profile/batch version, cited evidence IDs, engine/policy version, timestamp, components, limitations, reason codes and a pending consultant disposition.

## Isolated experiment, expansion gate and actual output audit

The isolated fixtures prove one strong GOODS pair can produce an artifact-linked, evidence-cited ESTIMATED result, while procurement mismatch, weak overlap, UNKNOWN-only evidence, artifact-unavailable evidence, and capacity/turnover-only evidence remain MISSING. Repeated fixed-version results are deterministic.

The method then evaluated all 60 × 17 identities at the fixed audit clock `2026-09-01T10:30:00.000Z`:

| Outcome | Count |
| --- | ---: |
| Unique pair identities | 1,020 |
| Numeric exploratory results | 0 |
| MISSING results | 1,020 |

Gate audit: 48 pairs had exact procurement-class applicability; 89 had at least two artifact-linked relevant claims; 45 passed the normalized-overlap sub-gate; zero passed all gates jointly. There were 313 pairs with at least one overlapping STATED_UNVERIFIED input, but none were promoted into a numeric result without the complete gate. This is the intended conservative outcome, not a failed calculation.

Non-exclusive reason counts: procurement mismatch 972; insufficient relevant evidence 931; insufficient normalized overlap 975; zero VERIFIED claims 1,020; capacity separated 1,020; turnover separated 1,020; market/delivery unknown 900; market claim overlap 120; compliance unknown 1,020; references unknown 1,020; STATED_UNVERIFIED overlap 313; tender no longer current at the audit clock 136.

`What happened →` the approved release produced no all-gates-passing pair.
`Root cause →` the exact procurement-class gate, artifact-linked minimum evidence gate and primary semantic-overlap gate had no joint intersection in the authorized 60 × 17 inputs.
`Correction →` preserve all 1,020 completed outcomes as MISSING; do not loosen a gate merely to manufacture scores.
`Reusable rule →` expansion means completing the evaluation inventory, not guaranteeing numeric scores; sparse or zero numeric output is truthful when evidence is insufficient.
`Regression evidence →` strong/weak/mismatch/artifact/capacity tests, deterministic 1,020-key replay, aggregate false-positive audit and live read-only contract checks.

## UI and remaining limits

The server precomputes and caches all 1,020 results before ready state, so the browser performs no database or bulk matching work. The Overview, radar, 17-profile directory, evidence review, 60-tender directory, 17 × 60 full matrix, tender-first review, supplier-first review and explicit Case reconstruction consume the same inventory. Current counts are data-derived. Historical Cases keep their supplier identity and are not silently remapped.

This remains an `isolated-method-validated` development pilot. Predictive validity, joint tender/supplier refresh, multilingual taxonomy depth, technical-specification parsing, qualification, capacity comparison, commercial/delivery analysis, authentication, tenant isolation, durable result/artifact storage and production hosting remain unresolved. Consultant disposition is explicit and separate; TenderMatch never selects a bidder, issues Bid/No-Bid, promotes a tender or sends outreach.
