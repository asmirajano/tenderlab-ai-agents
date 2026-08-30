# TenderMatch — TenderApps Agent 03 integration and placement record

Status: local complete-migration parity baseline over a dated fixture, 2026-08-30. This playbook preserves the full reader-facing TenderBoost source while defining the active TenderMatch contract and isolating the unplaced legacy Campaign Studio module. It does not modify the canonical 64-Agent registry or authorize deployment.

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

The legacy IDs, package path `packages/tenderboost/`, fixture `TB` identities, and document filenames remain stable lineage anchors. TenderMatch is the ecosystem-facing name; TenderBoost remains the frozen migration-source identity. Complete UI parity does not transfer the legacy Campaign Studio responsibility to TL-A031.

## Complete migration parity contract

The migration baseline is frozen at source commit `04b0b2a723223d11617837ee0e7562fa48168cd9`. Every original reader-facing page, section, metric, directory, match mode, evidence surface, map/radar view, Campaign Studio surface, control, and meaningful local state transition must remain reachable in the TenderApps copy. The source JSON fixture is byte-identical; the tender list preserves the same 16 records and replaces only relative `daysLeft` with the corresponding absolute deadline.

The intentional presentation difference is the shared TenderApps design system: the common product header, practical-Agent navigation, typography tokens, Standard/Wide preference, content widths, responsive breakpoints, cards, controls, focus behavior, and accessibility conventions replace the standalone TenderBoost chrome. The standalone header, layout switcher, Command Center backlink, Leaflet dependency, external map tiles, Firebase configuration, deployment files, and shell are not migrated.

Truth corrections override literal reproduction when the source could mislead:

- 142 absent pair records are `MISSING`, not 0/100;
- tender freshness and urgency derive from `deadlineAt` and the supplied/current clock;
- 1,000-item radar universes and fixed geometry are labelled simulated and schematic/non-geospatial;
- “Participation Boost proposal sent” is replaced with `NOT SENT · no event recorded`;
- historical Match Score, readiness, verification quality, audited support, deadline urgency, campaign priority, and consultant decision remain separate;
- Campaign Studio content approval is not external activation authority;
- all post-approval legacy campaign states are explicitly simulation states backed by a local simulation event;
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

The historical **Campaign Studio** concept remains an unplaced future capability candidate in `docs/campaign-studio-future-capability-candidate.md`. For migration parity only, its original local workspace is rendered inside `/tendermatch` as a separately versioned legacy module. It has no registration, product number, canonical Agent ID, independent route, external integration, or place in the TL-A031 Case/result contract. Its schema is `tenderboost-legacy-campaign/1.0.0`, its policy is `tenderboost-legacy-campaign-parity/1.0.0`, and every record has `communicationStatus: NOT_SENT`.

## Source, value, and identity policy

The authorized source is a dated non-confidential demonstration fixture: 16 tenders, 10 company records, and 18 evaluated pair records from the frozen TenderBoost source. Tender and company rows are `SUPPORTING_DOCUMENT` inputs; pair-to-evidence assignments are reviewed `USER_ASSERTION` records for the bounded experiment.

Every material value remains one of `SOURCE`, `CALCULATED`, `ESTIMATED`, `ASSUMED`, or `MISSING`. The 142 absent Company × Tender combinations are unassessed and MISSING, never numeric zero. A future genuine evaluated zero remains a separate numeric value.

The active identity chain uses `case:TM:*`, `result:TM:*`, `match:TM:*`, `match-decision:TM:*`, and `artifact:TM:*`. Frozen input records retain `snapshot:TB:*`, `tender:TB:*`, `supplier:TB:*`, and `evidence:TB:*` so their source lineage is not rewritten.

## Formula and evidence experiment

Policy `tendermatch-audited-match/3.0.0` preserves the Stage 2 audited method while removing all downstream-priority logic from the active result:

`Audited Match Support = technical relevance × 70% + market/delivery relevance × 30%`

Each component requires distinct reviewed evidence, confidence of at least 75, and a reviewed semantic band of 60, 80, or 100. A missing or reused record makes the required component MISSING and therefore makes the result MISSING. Of 18 historically assessed pairs, 6 have both required components and 12 remain MISSING; the other 142 matrix combinations remain unassessed/MISSING.

Company readiness is a frozen historical estimate and not an operand. Pair evidence quality is calculated separately. Deadline urgency is calculated separately from the absolute deadline and supplied clock and does not alter Match Support. The consultant decision never changes the score.

The complete formula audit, policy rationale, experiment table, limitations, and invariants are in `docs/tenderboost-scoring-model-card.md`.

## Review readiness and human authority

TenderMatch may calculate and explain Match Support. It may surface handoffs when the pair is unassessed, audited evidence is incomplete, the tender is closed, the snapshot is stale, current evidence needs refresh, or a material risk signal belongs to the Risk & Integrity Agent.

An approval control is disabled while current-review findings remain. A consultant can still record hold or reject with actor, time, and rationale. The application does not convert the match disposition into a participation plan, overall bid decision, or external action.

## Persistence and migration

Current Cases save only under the explicit key `tenderapps:tendermatch:case:<Case ID>`. Loading requires that exact Case ID and supplied Tender, Company, and deterministic clock; there is no latest-Case fallback. Deadline freshness and all derived context are recomputed whenever a Case is loaded or resumed.

Schema `3.0.0` remains the matching-only TL-A031 Case contract. Historical schema `1.0.0` and Stage 2 schema `2.0.0` records may be read from the legacy TenderBoost storage key. Migration retains matching values and consultant-decision provenance, excludes fields outside TL-A031’s active contract, and writes any later save to the new TenderMatch key. The original legacy browser record remains untouched. Unknown schema versions fail explicitly.

Legacy campaign records use the separate key `tenderapps:tendermatch:legacy-campaigns:v1`. State-changing revisions increment `revision` and append actor/time/rationale events. Loading rejects unsupported schemas or any record whose communication status is not `NOT_SENT`. This browser-local state is not nested into, or presented as, the TenderMatch Case result.

Browser-local state is operational demonstration state, not a canonical `COMPANY-TENDER-OPPORTUNITY-ASSESSMENTS` Dataset write. Durable persistence still requires tenant authorization, record identity, approval rules, versioning, provenance, retention, and negative authorization tests.

## Ecosystem-adjustment audit

| Projection | Adjusted state |
| --- | --- |
| Playbook and model card | TL-A031 matching TOR, complete source-parity contract, legacy Campaign Studio isolation, lineage, formula 3.0.0. |
| Client-product registry | Display name TenderMatch, order 03, TL-A031, `/tendermatch`; stable migrated product ID retained. |
| Real implementation registry | TenderMatch name/slug/TOR/output/limitations; stable migrated implementation ID retained. |
| Practical UI registry and shared shell | TenderMatch card, navigation, concept visual, title, complete-parity status, shared Standard/Wide control. |
| Routes | `/tendermatch` canonical; both legacy paths normalize to it and activate the same navigation item. |
| Command Center Products and Atlas | Both derive their projections from the shared product/implementation registries. |
| Domain engine and Case result | Matching, evidence explanation, deadline context, review findings, decision provenance, explicit persistence; Campaign Studio lives in a separate legacy module/schema. |
| Tests and maturity | Complete frozen-source UI parity plus bounded matching experiment and local campaign simulation; no live, sent, or enterprise claim. |
| Security/runtime | Static browser-local demonstration; no auth, tenant storage, live refresh, scheduler, or external integration. |

Practical order `03` is not used as a canonical ID, matching is not conflated with downstream commercial action, and the shared TenderApps page is not represented as a new canonical Agent. Rendering the legacy module for parity does not reverse these boundaries.

## Source-to-target parity matrix

The typed item-level matrix is `packages/tenderboost/src/legacy-parity.ts`. It contains **79** audited source items: **26 preserved**, **10 adapted to TenderApps design**, **38 truth-corrected**, **5 intentionally isolated for future Agent separation**, and **0 missing**. Tests fail if any item remains `missing`.

| Frozen source surface | TenderApps target | Coverage | Intentional difference |
| --- | --- | --- | --- |
| 01 Dashboard | Overview | truth-corrected | Activation wording becomes dated/local; six metrics separate evaluated, audited, and MISSING. |
| 02 Market Radar / Tenders | Radar · Tenders | truth-corrected | Original 1,000/86/16 metrics and filters remain; local schematic replaces external world-map asset. |
| 02 Market Radar / Suppliers | Radar · Suppliers | truth-corrected | Original 1,000/15/10/11 metrics and filters remain; local schematic replaces Leaflet/OpenStreetMap; false sent proposal removed. |
| 03 Suppliers / Profiles | Supplier Profiles | preserved | All ten rows, identity, activity, readiness, markets, verification counts, and drill-down remain. |
| 03 Suppliers / Verification | Verification | preserved | Every evidence row, status, confidence, source, retrieval date, risk, question, website, and back action remains. |
| 04 Open Tenders | Tender Snapshot | truth-corrected | All sixteen source rows and displayed fields remain; absolute deadline and derived status replace relative-only days. |
| 05 Full Match Matrix | Full Matrix | truth-corrected | Full 10×16 grid remains; 18 source scores display as estimates and 142 absent pairs display as MISSING. |
| 05 AutoMatch by Tenders | By Tender | adapted to TenderApps design | Tender picker, ranked suppliers, replay progress, selected pair review, evidence link, decisions, and local-draft handoff remain. |
| 05 AutoMatch by Suppliers | By Supplier | adapted to TenderApps design | Supplier picker, ranked tenders, replay progress, selected pair review, evidence link, decisions, and local-draft handoff remain. |
| Stage 1/2 matching audit | Case Audit | preserved | Explicit Case/result/evidence/decision identities, value policy, history, limitations, and resume compatibility remain. |
| 06 Campaign Studio / Campaigns | Legacy Campaigns | intentionally isolated | Candidate composer, suggestions, priority, pipeline, objectives, seven channel formats, editable copy, notes, approval, cadence, guardrails, and events remain under a separate local schema. |
| 06 Campaign Studio / Follow-ups | Legacy Follow-ups | intentionally isolated | Metrics, status table, event log, response branches, empty state, and disabled ProposalPrep handoff remain as explicit simulations. |

| Cross-cutting source item group | Count / fields | Target treatment | Status |
| --- | --- | --- | --- |
| Tender fixture | 16 records; reference, title, object, buyer, country, region, source, budget, deadline, tags | Same source content; absolute deadlines and derived freshness | preserved + truth-corrected |
| Supplier fixture | 10 records; identity, headquarters, type, site, categories, capabilities, products, markets, evidence, matches, scores, risks, questions | Byte-identical JSON transformed into versioned records | preserved |
| Match fixture | 18 assessed pairs with scores 65–95 | Immutable legacy estimates beside evidence-gated audited results | preserved + truth-corrected |
| Absent matrix pairs | 142 combinations | Explicit `null/MISSING`; future evaluated zero stays numeric | truth-corrected |
| Radar interactions | two tabs, region filters, zoom, marker selection, detail drill-down | Same meaningful controls over local schematic geometry | adapted + truth-corrected |
| Directory interactions | supplier/tender row selection and drill-down | Semantic buttons, keyboard focus, responsive internal scrolling | adapted |
| Match interactions | full matrix cell selection, two ranked modes, replay progress, evidence link, approve/hold/reject | Explicit Case result and current evidence/deadline gates | truth-corrected |
| Layout | standalone Standard/Wide | shared TenderApps Standard/Wide preference | adapted |
| Empty/error states | priority, campaign, follow-up, implicit failures | MISSING-aware empty states and visible `role=alert` errors | truth-corrected |
| Campaign drafting | create by tender/supplier/current pair, objective, channel, editable content, note, approval | Local versioned draft; evidence-linked claims only; `NOT_SENT` | isolated + truth-corrected |
| Campaign lifecycle | active, follow-up, interested, no-response, closed | Corresponding simulation-only states require `SIMULATION_STARTED` event | isolated + truth-corrected |
| Persistence | layout/session state | shared layout preference, explicit Case storage, separate legacy campaign storage | adapted + truth-corrected |
| External map/deployment shell | Leaflet, OSM, Wikimedia, standalone header/backlink/Firebase | deliberately excluded; local visuals and shared shell used instead | adapted to TenderApps design |

## Correction ledger

| What happened | Root cause | Correction | Reusable rule | Regression evidence |
| --- | --- | --- | --- | --- |
| The first migration reduced the complete TenderBoost application to three matching-only views. | The owner-Agent contract was incorrectly used as permission to discard reader-facing migration scope. | Restore every original surface and interaction, while isolating Campaign Studio in a separate local schema outside TL-A031. | Product migration parity and canonical capability ownership are separate dimensions; preserve both explicitly. | Typed 79-item parity manifest, route/UI tests, and responsive browser matrix. |
| 142 absent pair records could be read as zero. | A full matrix was constructed from only 18 evaluated records. | Preserve `null/MISSING`; keep numeric zero distinct. | Absence of an assessment is not an adverse assessment. | Matrix cardinality and zero-versus-MISSING tests. |
| Saved time state could become stale. | Relative state was persisted. | Recompute from absolute deadline and injected clock on resume. | Persist dated facts; derive clock-relative state. | Stale persisted-Case test. |
| Legacy and audited results could appear equivalent. | Historical curated scores had no replayable formula. | Keep immutable legacy estimates beside evidence-gated audited support. | Never reverse-engineer evidence to reproduce a historical score. | 18-pair experiment and policy tests. |
| A fixed relationship picture could imply geographic accuracy. | Labels changed while geometry did not. | Mark it visibly and semantically as schematic/non-geospatial. | Fixed geometry must never claim live map meaning. | UI/CSP fallback assertions. |
| The original supplier radar claimed a Participation Boost proposal was sent. | UI copy treated a target-status idea as an integration event. | Replace it with `NOT SENT · no event recorded` everywhere. | External action requires an integration/event record. | Truthfulness and browser text assertions. |
| Original campaign lifecycle labels could imply real activation or responses. | Local demonstration state was not separated from external event truth. | Use a separate versioned module; content approval is provenance only; post-approval states are explicit simulations requiring a simulation event. | Simulation state must be named and structurally distinct from operational state. | Campaign transition, no-response, interested, storage, and no-send tests. |

## Current maturity

This is a local `concept-or-simulation` implementation with complete reader-facing migration parity and a bounded, dated-fixture matching experiment. All original view families, data rows, map/radar interactions, directories, match modes, evidence views, and local Campaign Studio interactions are functional inside the TenderApps design system. Matching calculations, explicit MISSING behavior, evidence linkage, consultant-decision provenance, deterministic resume behavior, and browser-local explicit-Case reconstruction remain functional. The legacy campaign module supports local drafting, content approval, persistence, and explicitly simulated lifecycle branches; it cannot send, operate CRM, record an external response, or hand off downstream. Live-source validity, production accuracy, tenant security, durable records, Dataset activation, external integrations, canonical Campaign Studio placement, and deployment remain unproven and out of scope.
