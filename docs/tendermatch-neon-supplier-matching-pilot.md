# TenderMatch Neon supplier and exploratory-matching pilot

Status: local controlled pilot, 2026-09-01. This document records the approved read-only supplier integration and the isolated matching-method gate for `agent:TL-A031`. It does not authorize deployment, Neon writes, supplier outreach, Bid/No-Bid, or production operation.

## Boundaries and source identities

- Tender input remains the committed 60-record Central Asia current-at-extraction snapshot. No tender was added, removed, or re-extracted in this stage.
- Supplier input is the policy-corrected batch `accio-neutral-suppliers-2026-09-01-v2.1-policy-corrected` from the development project `tender-entity-registry`.
- Consumer contract: `tendermatch_supplier_api.current_supplier_profiles` and `current_supplier_evidence`, backed by immutable v2.1 views.
- The local server verifies the dedicated read-only login and reader-role membership inside a read-only transaction before every query.
- The database credential is read only by the Node server from the explicit local environment file or process environment. It is never passed through `VITE_*`, serialized to an API response, or included in the browser bundle.
- The API exposes normalized profiles and safe non-contact evidence only. Contacts and raw marketplace content are outside the contract.
- A failed supplier connection produces an explicit offline/error state. The ten frozen supplier fixtures remain historical regression evidence and are never a runtime fallback.

## Same-origin local architecture

`Browser → http://127.0.0.1:4177 → built TenderApps files + /api/tendermatch/* → read-only Neon consumer views`

The local Node adapter serves the production Vite build and the API from one origin, so the existing `connect-src 'self'` CSP remains intact. It provides:

| Endpoint | Purpose |
| --- | --- |
| `GET /api/tendermatch/health` | Non-secret loading/ready/error state and aggregate cardinalities |
| `GET /api/tendermatch/runtime` | The 100 normalized profiles, 6,000 precomputed evaluations, and aggregate contract summaries |
| `GET /api/tendermatch/suppliers` | Paginated profile list, with validated readiness/country/category filters and keyset cursor |
| `GET /api/tendermatch/suppliers/:uuid` | One normalized supplier profile |
| `GET /api/tendermatch/suppliers/:uuid/evidence` | Safe non-contact evidence for that supplier |

List order is exactly `lower(display_name), canonical_entity_id`; the page limit is 1–100. IDs, filters, paired cursor fields, and limits fail closed. SQL operands are parameterized. Static SPA routes are resolved only inside the built distribution directory.

Firebase remains a static deployment and has not been changed. Selecting a production API host, authentication model, tenant authorization, managed secret location, serverless/container runtime, cache invalidation strategy, and operational monitoring is a later approval gate.

## Canonical supplier mapping

The active `SupplierRecord` retains stable canonical entity/profile/batch identities, legal/display name, supported country, structured activities/categories/products/materials/capabilities/services/markets, explicit unresolved checks, readiness status, claim totals, and source/artifact identities. Empty or unsupported values render as Unknown / not disclosed.

The mapper deliberately does not produce legacy `technicalFit`, numeric readiness, export-readiness, evidence-completeness, legacy match rows, contacts, precise coordinates, or VERIFIED claims. Readiness is a source state, not a Match Score. Supplier markers use country-level China placement with deterministic visual spacing and are labelled non-precise.

Verified contract totals at the recorded checkpoint:

| Dimension | Result |
| --- | ---: |
| Profiles | 100 |
| Readiness: ready / usable / enrich / excluded | 2 / 94 / 4 / 0 |
| Profile claims: VERIFIED / INFERRED / UNKNOWN | 0 / 1,429 / 971 |
| Safe evidence: VERIFIED / INFERRED / UNKNOWN | 0 / 1,415 / 885 |
| Safe evidence with / without linked artifact | 2,070 / 230 |

## Experimental policy

- Engine: `tendermatch-exploratory-fit/4.0.0`
- Policy: `tendermatch-evidence-overlap/1.0.0`
- Output label: `exploratory-technical-fit` or `insufficient-evidence`
- Value class: `ESTIMATED` or `MISSING`

Tender text comes only from title, object, description, tags, procurement type, country, and region. Supplier text comes only from the approved non-contact evidence fields for activities, categories, products, materials/specifications, manufacturing/capacity, installation/after-sales, capabilities, services, markets, and local presence.

Normalization lowercases and tokenizes text, removes a documented generic vocabulary, and maps a small versioned procurement alias taxonomy. A numeric exploratory technical-fit value is permitted only when all gates pass:

1. procurement type is GOODS or WORKS;
2. the supplier is not excluded from the run;
3. at least two relevant INFERRED technical evidence records exist for that supplier;
4. at least one cited record has a saved artifact;
5. at least one concept overlaps the tender's primary title/object/procurement text; and
6. there is at least one direct primary term or three full-corpus matched terms.

When eligible, the deliberately coarse 5-point-banded estimate is:

`min(85, roundTo5(40 + min(20, concepts × 10) + min(15, terms × 3) + min(10, evidence beyond two × 2)))`

The ceiling prevents the exploratory lexical method from appearing definitive. A completed evaluation that fails any minimum gate has `value: null`, `valueClass: MISSING`, explicit reason codes, and the relevant missing-input explanation. MISSING is not zero.

Market/delivery overlap is recorded separately as supported or unknown with `value: null`; it is never blended into technical fit. Eligibility, compliance, references, deadline freshness, evidence coverage, supplier readiness, and consultant disposition are also separate. Every result binds tender snapshot/version, supplier profile/batch version, evidence IDs, engine/policy version, evaluation timestamp, component outputs, limitations, reason codes, and a pending human disposition.

## Isolated experiment and audit

The experiment first covered synthetic strong-overlap, weak-overlap, UNKNOWN, and wrong-supplier evidence cases, then replayed the full authorized contract. Repeated runs with the same inputs, versions, and clock are byte-equivalent after serialization.

An initial broad lexical candidate admitted 48 numeric results, including generic training/technical overlaps. This failed the relevance audit.

`What happened →` generic description terms created false-positive numeric candidates.
`Root cause →` overlap was allowed anywhere in the tender corpus without requiring a primary procurement concept.
`Correction →` require a title/object/procurement concept, restrict numeric evaluation to GOODS/WORKS for v1, require two supplier evidence records and one artifact, and keep a coarse ceiling.
`Reusable rule →` source-grounded text is necessary but not sufficient; a numeric semantic claim also needs a versioned minimum-relevance gate.
`Regression evidence →` deterministic strong/weak/missing/foreign-evidence tests and the audited 6,000-pair distribution below.

Final fixed-contract result:

| Outcome | Count |
| --- | ---: |
| Unique Supplier × Tender keys | 6,000 |
| Numeric exploratory technical fit | 4 |
| MISSING / insufficient evidence | 5,996 |
| Score distribution | 60 × 1; 65 × 1; 75 × 2 |

Reason codes are non-exclusive: insufficient relevant evidence 5,590; insufficient normalized overlap 5,996; zero VERIFIED claims 6,000; market/delivery unknown 5,700 and source-overlap present 300; compliance unknown 5,760; references unknown 4,380; supplier enrichment required 240; cited artifact unavailable 130. At the recorded evaluation clock `2026-09-01T00:20:03.796Z`, eight tenders had passed their deadline, producing 800 separate freshness findings without changing technical fit. This clock-derived count may change on a later server replay while the tender snapshot remains unchanged.

Four sparse estimates are enough to show that the method can emit a bounded numeric result, not enough to establish predictive validity. No historical legacy score is copied, no outcome calibration exists, no supplier claim is upgraded to VERIFIED, and no consultant decision is automatic.

## Canonical result and UI behavior

The server precomputes and caches the deterministic 6,000-result inventory before returning ready state, avoiding browser-side database or matching work. The shared app consumes that one inventory for the radar counts, directories, paginated 100 × 60 matrix, tender-first review, supplier-first review, selected Case, explanations, and human disposition.

The UI distinguishes supplier connection/loading/error, retrieved under-review profiles, completed evaluation count, numeric exploratory eligibility, MISSING results, evidence classes, freshness, and human decision. Evidence detail loads on demand. Existing saved Cases retain their explicit supplier identity; historical fixture Cases remain compatible historical records and are not silently remapped to Neon entities.

## Remaining limitations and next gate

- Supplier data are read live only through a local development adapter; production hosting and authorization are unresolved.
- The 60 tenders remain a committed snapshot, while suppliers come from a stable read view. Their refresh cadence is not jointly orchestrated.
- The lexical taxonomy is small, English-oriented, not outcome-trained, and not a replacement for technical specification, eligibility, capacity, commercial, delivery, integrity, or reference review.
- Zero claims are VERIFIED in this batch. INFERRED overlap must be reviewed against saved artifacts before business use.
- Browser-local Case persistence is not tenant-isolated or durable.
- Production rollout requires approved authentication, tenant storage, secret management, immutable result/artifact persistence, operational monitoring, and deployed-equivalent representative replay.

## Local checkpoint verification

- Focused TenderMatch, boundary, registry, layout, and methodology tests: 62 passed, 0 failed, 0 skipped.
- Complete repository tests: 267 passed, 0 failed, 0 skipped.
- Full-repository ESLint and the strict TenderMatch changed-surface TypeScript project passed.
- The full TenderApps TypeScript project still reports only pre-existing errors in unchanged TenderBalance and Logistics sources; no changed TenderMatch file appears in that output.
- The complete repository production build passed, including TenderLab, Atlas, TenderApps, Firebase export preparation, and generation of all 64 Agent specifications. Nothing was deployed.
- The regression-harness observation document passed the skill validator with zero failures.
- A content scan of repository files and the built TenderApps distribution found zero occurrences of the actual database credential; client source/build files also contain no database URL, login, or supplier secret-variable marker.
- Automated rendered-browser QA is explicitly blocked by the enabled browser tool's localhost URL policy and is not claimed. Direct HTTP route/API checks passed, and the review preview remains available for user inspection; see `docs/evidence/tendermatch-neon-supplier-browser-qa.md`.
