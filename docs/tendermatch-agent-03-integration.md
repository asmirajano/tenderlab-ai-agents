# TenderMatch — TenderApps Agent 03 integration and placement record

Status: local current-tender pilot over a deterministic read-only Central Asia snapshot, 2026-08-30. The active tender runtime is documented in `docs/tendermatch-central-asia-current-pilot.md`; the older 16-tender TenderBoost fixture and formula experiment below remain historical regression evidence only. Campaign Studio and follow-up workflows remain outside TenderMatch. This work does not modify the canonical 64-Agent registry or authorize deployment.

## Mandatory placement re-audit

Audited recurring capability:

`Tender opportunity/company evidence → Company × Tender evaluation and explanation → consultant review/decision support`

Formal disposition: **EXISTING AGENT — STANDALONE IMPLEMENTATION**.

Canonical owner: `agent:TL-A031` Company-to-Tender Match Score Agent.

The 64-Agent matching gate is passed: **yes**. The prior TenderApps conversion did perform the placement gate and provisionally selected `agent:TL-A031`; this independent re-audit confirms that owner. Removing the legacy promotion workflow makes the ownership boundary more exact because the remaining trigger, inputs, calculation, output, and authority match TL-A031 directly.

TL-A031 owns evidence-backed fit for one Company × Tender pair, including weighted fit, strengths, gaps, citations, confidence, and missing-data flags. It excludes general company readiness, participation structure, and Bid/No-Bid. Its trigger requires one selected pair with sufficient structured inputs; insufficient data produces MISSING rather than a fabricated score. Its output is consumed downstream by Participation Solution-Fit and Bid/No-Bid.

### Neighbor comparison

| Canonical capability | Relationship to TenderMatch | Why it is not the owner |
| --- | --- | --- |
| `agent:TL-A014` Tender Discovery Agent | Upstream shortlist and relevance triage | Stops before the full pair evaluation. |
| `agent:TL-A006` Company Profile Agent | Upstream company record | Aggregates reusable company facts; does not assess a tender pair. |
| `agent:TL-A008` Company Verification Agent | Upstream verified company facts | Verifies claims; does not own tender fit. |
| `agent:TL-A011` Supplier Intelligence Agent | Optional upstream reusable supplier knowledge | Maintains cross-case supplier intelligence; it does not score the participating company against one tender. |
| `agent:TL-A003` Evidence & Provenance Agent | Cross-cutting evidence control | Governs claim/source traceability and confidence, not the domain score. |
| `agent:TL-A009` Tender Readiness Score Agent | Separate context | Scores general readiness, explicitly not tender-specific fit. |
| `agent:TL-A017` Tender Alert & Deadline Agent | Time-state handoff | Owns dates and alerts; deadline context must not become Match Support. |
| `agent:TL-A032` Participation Solution-Fit Agent | Downstream consumer | Explores Direct/Partner/JV coverage after the base fit. |
| `agent:TL-A035` Bid / No-Bid Decision Agent | Downstream decision analysis | Integrates fit with eligibility, commercial, capacity, risk, and competition. |
| `agent:TL-A038` Risk & Integrity Agent | Separate risk handoff | Owns sanctions/integrity screening and escalation, not match scoring. |
| Human consultant | Match disposition and override authority | The application explains evidence; the human records approve, hold, or reject. |

No evidence supports a new canonical Agent, `agent:TL-A003`, or a standalone application identity outside the shared TenderApps product.

## Identity and ecosystem placement

- Ecosystem-facing product: **TenderMatch**.
- TenderApps presentation: **TenderApps Agent 03**, meaning practical catalog order `03` only.
- Canonical owner: `agent:TL-A031`.
- Stable migrated implementation ID: `implementation:TEA-RAI-TENDERBOOST`.
- Stable migrated product ID: `product:TA-TENDERBOOST`.
- Canonical TenderApps route: `/tendermatch`.
- Compatibility aliases: `/tenderboost` and `/tenderboost-ai`, normalized to `/tendermatch` inside the shared client.
- Frozen migration source: standalone TenderBoost commit `04b0b2a723223d11617837ee0e7562fa48168cd9`.

The legacy IDs, fixture `TB` identities, and protected source locators remain stable lineage anchors. Active implementation files live under `packages/tendermatch/`. TenderMatch is the ecosystem-facing name; TenderBoost remains the frozen migration-source identity. Campaign Studio is not rendered, linked, persisted, or owned by TenderMatch.

### Terminology and protected-exception matrix

| Surface | Current TenderMatch naming | Protected TenderBoost lineage exception | Rule |
| --- | --- | --- | --- |
| Product and implementation | `TenderMatch`, `tendermatch`, `TenderApps Agent 03` | `product:TA-TENDERBOOST`, `implementation:TEA-RAI-TENDERBOOST` | Stable IDs remain unchanged lineage identifiers; they are never display names. |
| Active files and package | `tendermatch-app.tsx`, `tendermatch.css`, `packages/tendermatch/`, `docs/tendermatch-*`, `tests/tendermatch-*` | None | No active filesystem path may contain `tenderboost`. |
| Routes and navigation | `/tendermatch`; TenderMatch navigation and page title | `/tenderboost`, `/tenderboost-ai` | Legacy URLs remain compatibility aliases only and do not appear as current navigation. |
| Case persistence | `tenderapps:tendermatch:case:<Case ID>` for current writes | `tenderapps:tenderboost:case:<Case ID>` for historical reads | Loading preserves backward compatibility; migrated saves use only the current key. |
| Frozen source provenance | TenderMatch frozen-source parity | `TenderBoost AI`, source commit `04b0b2a…`, `app/tenderboost-ai/page.tsx` locators | TenderBoost must be qualified as frozen, legacy, source, migration, or compatibility provenance. |
| Frozen symbols and identities | Active policies use `tendermatch-*`; active Case/result identities use `TM` | `TENDERBOOST_*`, `tenderBoostParityManifest`, `TB` fixture identities, historical schema/policy strings | These values bind historical records and deterministic regressions and remain unchanged. |
| Campaign Studio history | Not part of TenderMatch | Historical Git/source records only | Promotion/outreach requires a separate future placement audit; TenderMatch has no Campaign page, control, runtime, or persistence key. |
| Styling namespace | TenderMatch UI | `tb3-*` selectors | The internal namespace remains unchanged to avoid behavior-neutral selector churn. |

## Frozen matching migration contract

The migration baseline is frozen at source commit `04b0b2a723223d11617837ee0e7562fa48168cd9`. Every matching page, section, metric, directory, match mode, evidence surface, map/radar view, control, and meaningful Case transition remains reachable in the TenderApps copy. The source JSON fixture is byte-identical; the tender list preserves the same 16 records and replaces only relative `daysLeft` with the corresponding absolute deadline. The source Campaign Studio family is deliberately excluded by the later approved product-boundary decision.

The intentional presentation difference is the shared TenderApps design system: the common product header, practical-Agent navigation, typography tokens, Standard/Wide preference, content widths, responsive breakpoints, cards, controls, focus behavior, and accessibility conventions replace the standalone TenderBoost chrome. The standalone header, layout switcher, Command Center backlink, Leaflet dependency, external map tiles, Firebase configuration, deployment files, and shell are not migrated.

Truth corrections override literal reproduction when the source could mislead:

- 142 absent pair records are `MISSING`, not 0/100;
- tender freshness and urgency derive from `deadlineAt` and the supplied/current clock; at `TENDERBOOST_DEMO_AS_OF`, `floor((end-of-day deadline - clock) / 24h)` deterministically reproduces the source vector `[1,1,2,2,5,5,8,8,8,8,9,11,15,16,116,135]` without persisting relative time;
- 1,000-item radar universes and frozen coordinates are labelled simulated; the geographic geometry is self-hosted and never presented as a live feed;
- the frozen source's false “Participation Boost proposal sent” field is removed from the active matching surface;
- historical Match Score, readiness, verification quality, audited support, deadline urgency, and consultant decision remain separate;
- no message, call, CRM action, delivery, response, or downstream handoff is claimed.

## Active TOR and capability contract

Purpose: help a consultant understand whether available evidence supports a specific Company × Tender fit and record a reviewable human match disposition.

Contract:

`Selected pair → versioned tender/company/evidence snapshot → evidence gates → audited Match Support or MISSING → explanation and review findings → consultant match decision → explicit downstream handoff`

Primary finished product: one versioned TenderMatch Case result containing:

1. explicit Case, result, tender, company, evidence-snapshot, match, decision, and artifact identities;
2. the immutable legacy estimate beside—not overwritten by—the audited result;
3. component weights, evidence-record links, confidence, reason codes, missing inputs, strengths, and gaps;
4. separately displayed company readiness, pair evidence quality, absolute-deadline context, and consultant decision;
5. current-review findings with the responsible neighboring Agent handoff;
6. consultant decision history with actor, timestamp, rationale, and record revision.

Consumers are the consultant and separately governed Participation Solution-Fit or Bid/No-Bid work. TenderMatch does not decide the participation structure or overall Bid/No-Bid recommendation.

Negative scope of the **TL-A031 result and authority**:

- tender promotion, advertising, or offering a tender to a company;
- campaign design, content drafting, channel selection, activation, or lifecycle tracking;
- email, call, social messaging, CRM, delivery, response, consent, or suppression operations;
- tender discovery, general company readiness, eligibility, participation design, win probability, Bid/No-Bid, or risk acceptance;
- live tender refresh, autonomous workflow scheduling, canonical Dataset writes, or enterprise persistence.

The historical **Campaign Studio** concept remains an unplaced future capability candidate in `docs/campaign-studio-future-capability-candidate.md`. It is not rendered inside `/tendermatch`, has no reachable view or control, and has no active package export or TenderMatch persistence key. Historical implementation evidence remains in Git and the untouched frozen standalone source. No Marketing Agent is created in this stage.

## Historical Stage 1/2 source, value, and identity policy

The historical regression source is a dated non-confidential demonstration fixture: 16 tenders, 10 company records, and 18 evaluated pair records from the frozen TenderBoost source. Those tender rows no longer power runtime views. They remain `SUPPORTING_DOCUMENT` inputs for legacy regression tests; pair-to-evidence assignments remain reviewed `USER_ASSERTION` records for that bounded historical experiment.

Every material value remains one of `SOURCE`, `CALCULATED`, `ESTIMATED`, `ASSUMED`, or `MISSING`. The 142 absent Company × Tender combinations are unassessed and MISSING, never numeric zero. A future genuine evaluated zero remains a separate numeric value.

The active identity chain uses `case:TM:*`, `result:TM:*`, `match:TM:*`, `match-decision:TM:*`, and `artifact:TM:*`. Frozen input records retain `snapshot:TB:*`, `tender:TB:*`, `supplier:TB:*`, and `evidence:TB:*` so their source lineage is not rewritten.

## Formula and evidence experiment

Policy `tendermatch-audited-match/3.0.0` preserves the Stage 2 audited method while removing all downstream-priority logic from the active result:

`Audited Match Support = technical relevance × 70% + market/delivery relevance × 30%`

Each component requires distinct reviewed evidence, confidence of at least 75, and a reviewed semantic band of 60, 80, or 100. A missing or reused record makes the required component MISSING and therefore makes the result MISSING. Of 18 historically assessed pairs, 6 have both required components and 12 remain MISSING; the other 142 matrix combinations remain unassessed/MISSING.

Company readiness is a frozen historical estimate and not an operand. Pair evidence quality is calculated separately. Deadline urgency is calculated separately from the absolute deadline and supplied clock and does not alter Match Support. The consultant decision never changes the score.

The complete formula audit, policy rationale, experiment table, limitations, and invariants are in `docs/tendermatch-scoring-model-card.md`.

## Review readiness and human authority

TenderMatch may calculate and explain Match Support. It may surface handoffs when the pair is unassessed, audited evidence is incomplete, the tender is closed, the snapshot is stale, current evidence needs refresh, or a material risk signal belongs to the Risk & Integrity Agent.

An approval control is disabled while current-review findings remain. A consultant can still record hold or reject with actor, time, and rationale. The application does not convert the match disposition into a participation plan, overall bid decision, or external action.

## Persistence and migration

Current Cases save only under the explicit key `tenderapps:tendermatch:case:<Case ID>`. Loading requires that exact Case ID and supplied Tender, Company, and deterministic clock; there is no latest-Case fallback. Deadline freshness and all derived context are recomputed whenever a Case is loaded or resumed.

Schema `3.0.0` remains the matching-only TL-A031 Case contract. Historical schema `1.0.0` and Stage 2 schema `2.0.0` records may be read from the legacy TenderBoost storage key. Migration retains matching values and consultant-decision provenance, excludes fields outside TL-A031’s active contract, and writes any later save to the new TenderMatch key. The original legacy browser record remains untouched. Unknown schema versions fail explicitly.

Removed Campaign Studio storage keys are not read, migrated, or written by TenderMatch. Existing browser values are left untouched and inert. Case-save failures remain visible and recoverable; valid in-memory matching state remains usable.

Browser-local state is operational demonstration state, not a canonical `COMPANY-TENDER-OPPORTUNITY-ASSESSMENTS` Dataset write. Durable persistence still requires tenant authorization, record identity, approval rules, versioning, provenance, retention, and negative authorization tests.

## Ecosystem-adjustment audit

| Projection | Adjusted state |
| --- | --- |
| Playbook and model card | TL-A031 matching TOR, frozen matching-source contract, explicit downstream exclusion, lineage, formula 3.0.0. |
| Client-product registry | Display name TenderMatch, order 03, TL-A031, `/tendermatch`; stable migrated product ID retained. |
| Real implementation registry | TenderMatch name/slug/TOR/output/limitations; stable migrated implementation ID retained. |
| Practical UI registry and shared shell | TenderMatch card, five navigation families, ten reachable views, concept visual, title, shared Standard/Wide control. |
| Routes | `/tendermatch` canonical; both legacy paths normalize to it and activate the same navigation item. |
| Command Center Products and Atlas | Both derive their projections from the shared product/implementation registries. |
| Domain engine and Case result | Matching, evidence explanation, deadline context, review findings, decision provenance, and explicit Case persistence only. |
| Tests and maturity | Frozen-source matching UI plus bounded matching experiment; no promotion, outreach, live, or enterprise claim. |
| Security/runtime | Static browser-local demonstration; no auth, tenant storage, live refresh, scheduler, or external integration. |

Practical order `03` is not used as a canonical ID, matching is not conflated with downstream commercial action, and the shared TenderApps page is not represented as a new canonical Agent.

## Source-to-target parity matrix

The active typed matching inventory is `packages/tendermatch/src/legacy-parity.ts`. It contains **65** audited matching-source items: **24 preserved**, **11 adapted to TenderApps design**, **30 truth-corrected**, and **0 missing**. The five restored map items are the tender legend, tender focus signal, supplier legend, supplier focus signal, and supplier-map pan. Campaign Studio and Follow-ups entries were removed from the active manifest after the approved boundary decision; this is a deliberate scope exclusion, not a claim that those frozen-source capabilities migrated into TenderMatch.

The historical 48-state strict-parity review is retained in `docs/tendermatch-strict-parity-browser-qa.md` as evidence for the superseded parity checkpoint. Current navigation evidence is recorded separately and covers the five-family, ten-view matching workspace.

| Frozen source surface | TenderApps target | Coverage | Intentional difference |
| --- | --- | --- | --- |
| 01 Dashboard | Overview | truth-corrected | Activation wording becomes dated/local; six metrics separate evaluated, audited, and MISSING. |
| 02 Market Radar / Tenders | Radar · Tenders | truth-corrected | Original 1,000/86/16 metrics, filters, local world geography, clusters, markers, zoom, legend, attribution, focus signal and drill-down remain; data are frozen/simulated. |
| 02 Market Radar / Suppliers | Radar · Suppliers | truth-corrected | Original 1,000/15/10/11 metrics, filters, local China geography, clusters, coordinates, zoom/pan, legend, attribution, target signal and drill-down remain; external tiles and false action claims do not. |
| 03 Suppliers / Profiles | Supplier Profiles | preserved | All ten rows, identity, activity, readiness, markets, verification counts, and drill-down remain. |
| 03 Suppliers / Verification | Verification | preserved | Every evidence row, status, confidence, source, retrieval date, risk, question, website, and back action remains. |
| 04 Open Tenders | Tender Snapshot | truth-corrected | All sixteen source rows and displayed fields remain; absolute deadline and derived status replace relative-only days. |
| 05 Full Match Matrix | Full Matrix | truth-corrected | Full 10×16 grid remains; 18 source scores display as estimates and 142 absent pairs display as MISSING. |
| 05 AutoMatch by Tenders | By Tender | adapted to TenderApps design | Tender picker, ranked suppliers, replay progress, selected pair review, evidence link, and match decisions remain. |
| 05 AutoMatch by Suppliers | By Supplier | adapted to TenderApps design | Supplier picker, ranked tenders, replay progress, selected pair review, evidence link, and match decisions remain. |
| Stage 1/2 matching audit | Case Audit | preserved | Explicit Case/result/evidence/decision identities, value policy, history, limitations, and resume compatibility remain. |

| Cross-cutting source item group | Count / fields | Target treatment | Status |
| --- | --- | --- | --- |
| Tender fixture | 16 records; reference, title, object, buyer, country, region, source, budget, deadline, tags | Same source content; absolute deadlines and derived freshness | preserved + truth-corrected |
| Supplier fixture | 10 records; identity, headquarters, type, site, categories, capabilities, products, markets, evidence, matches, scores, risks, questions | Byte-identical JSON transformed into versioned records | preserved |
| Match fixture | 18 assessed pairs with scores 65–95 | Immutable legacy estimates beside evidence-gated audited results | preserved + truth-corrected |
| Absent matrix pairs | 142 combinations | Explicit `null/MISSING`; future evaluated zero stays numeric | truth-corrected |
| Radar interactions | two tabs, region filters, zoom, pointer/keyboard marker selection, supplier-map pan, detail drill-down | Same meaningful controls over self-hosted geographic geometry | adapted + truth-corrected |
| Directory interactions | supplier/tender row selection and drill-down | Semantic buttons, keyboard focus, responsive internal scrolling | adapted |
| Match interactions | full matrix cell selection, two ranked modes, replay progress, evidence link, approve/hold/reject | Explicit Case result and current evidence/deadline gates | truth-corrected |
| Layout | standalone Standard/Wide | shared TenderApps Standard/Wide preference | adapted |
| Empty/error states | MISSING-aware results and Case failures | Explicit MISSING states and visible `role=alert` Case errors | truth-corrected |
| Persistence | layout/session state | shared layout preference and guarded explicit Case storage | adapted + truth-corrected |
| External map/deployment shell | Leaflet/OSM runtime, Wikimedia geometry reference, standalone header/backlink/Firebase | external tile/runtime requests remain excluded; source-linked world and China geography are self-hosted with visible attribution | adapted to TenderApps design |

## Correction ledger

| What happened | Root cause | Correction | Reusable rule | Regression evidence |
| --- | --- | --- | --- | --- |
| The first migration reduced the original application too aggressively. | The owner-Agent contract was incorrectly used as permission to discard reader-facing matching scope. | Restore the complete matching workspace and audit every source surface. | Product migration coverage and canonical capability ownership are separate dimensions. | Source-located active manifest, behavioral route/UI tests, and responsive browser evidence. |
| 142 absent pair records could be read as zero. | A full matrix was constructed from only 18 evaluated records. | Preserve `null/MISSING`; keep numeric zero distinct. | Absence of an assessment is not an adverse assessment. | Matrix cardinality and zero-versus-MISSING tests. |
| Saved time state could become stale. | Relative state was persisted. | Recompute from absolute deadline and injected clock on resume. | Persist dated facts; derive clock-relative state. | Stale persisted-Case test. |
| Reconstructed frozen deadlines were all one day high. | End-of-day instants were combined with `Math.ceil`, counting a partial terminal day as another full day. | Use a deterministic floor of positive deadline distance; keep zero/closed handling clock-derived. | When migrating a frozen relative-day fixture to absolute end-of-day instants, specify and regression-test the calendar conversion. | Exact 16-value baseline-vector test. |
| Legacy and audited results could appear equivalent. | Historical curated scores had no replayable formula. | Keep immutable legacy estimates beside evidence-gated audited support. | Never reverse-engineer evidence to reproduce a historical score. | 18-pair experiment and policy tests. |
| The first matching-only integration replaced geographic maps with schematic blobs and dropped legends, focus signals, and supplier-map pan. | CSP safety was mistaken for permission to substitute a meaningful visualization. | Bundle source-linked geometry locally, preserve frozen coordinates, restore interaction cues, and label it as frozen with no live tiles. | CSP-safe adaptation must preserve the source visualization contract; a schematic is not geographic parity. | Map-asset, legend, focus-signal, selection, zoom/pan, CSP, and browser regressions. |
| The original supplier radar claimed a Participation Boost proposal was sent. | UI copy treated a target-status idea as an integration event. | Remove the action-status field from the active matching product. | A matching-only product must not expose downstream workflow state. | Absence assertions and rendered supplier-profile review. |
| A parity checkpoint temporarily rendered Campaign Studio inside TenderMatch. | Migration parity was prioritized over the confirmed product boundary. | Remove both pages, controls, runtime/persistence code, and active manifest entries; retain only downstream history. | A capability outside the owner Agent must not remain reachable merely for legacy parity. | Five-family/ten-view registry assertions, stale-view fallback, absence checks, and browser navigation review. |
| Case persistence failures were unguarded. | Browser storage was treated as reliable. | Announce recoverable Case-save errors with `role=alert` and retain the current in-memory state. | Browser-local persistence is fallible and must never silently destroy the active review state. | Failing-storage tests and rendered alert/status assertions. |

## Current maturity

This is a local `concept-or-simulation` implementation with a complete frozen matching workspace and a bounded, dated-fixture experiment. All matching data rows, map/radar interactions, directories, match modes, evidence views, Case controls, and consultant decisions remain functional inside the TenderApps design system. Campaign Studio and Follow-ups are absent from navigation, runtime, persistence, and the active parity manifest. Live-source validity, production accuracy, tenant security, durable records, Dataset activation, downstream marketing capability, and deployment remain unproven and out of scope.
