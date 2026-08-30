# TenderMatch — TenderApps Agent 03 integration and placement record

Status: local matching-only dated-fixture experiment, 2026-08-30. This playbook preserves the TenderBoost migration history while defining the active TenderMatch contract. It does not modify the canonical 64-Agent registry or authorize deployment.

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

The legacy IDs, package path `packages/tenderboost/`, fixture `TB` identities, and document filenames remain stable lineage anchors. They are not current display names and do not grant the active product its former broader scope.

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

Negative scope:

- tender promotion, advertising, or offering a tender to a company;
- campaign design, content drafting, channel selection, activation, or lifecycle tracking;
- email, call, social messaging, CRM, delivery, response, consent, or suppression operations;
- tender discovery, general company readiness, eligibility, participation design, win probability, Bid/No-Bid, or risk acceptance;
- live tender refresh, autonomous workflow scheduling, canonical Dataset writes, or enterprise persistence.

The historical **Campaign Studio** concept is retained only as an unplaced future capability candidate in `docs/campaign-studio-future-capability-candidate.md`. It has no registration, product number, canonical Agent ID, route, or active TenderMatch contract.

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

Schema `3.0.0` is the matching-only contract. Historical schema `1.0.0` and Stage 2 schema `2.0.0` records may be read from the legacy TenderBoost storage key. Migration retains matching values and consultant-decision provenance, excludes fields outside TL-A031’s active contract, and writes any later save to the new TenderMatch key. The original legacy browser record remains untouched. Unknown schema versions fail explicitly.

Browser-local state is operational demonstration state, not a canonical `COMPANY-TENDER-OPPORTUNITY-ASSESSMENTS` Dataset write. Durable persistence still requires tenant authorization, record identity, approval rules, versioning, provenance, retention, and negative authorization tests.

## Ecosystem-adjustment audit

| Projection | Adjusted state |
| --- | --- |
| Playbook and model card | TenderMatch matching-only TOR, TL-A031 owner, negative scope, legacy lineage, formula 3.0.0. |
| Client-product registry | Display name TenderMatch, order 03, TL-A031, `/tendermatch`; stable migrated product ID retained. |
| Real implementation registry | TenderMatch name/slug/TOR/output/limitations; stable migrated implementation ID retained. |
| Practical UI registry and shared shell | TenderMatch card, navigation, concept visual, title, matching-only status. |
| Routes | `/tendermatch` canonical; both legacy paths normalize to it and activate the same navigation item. |
| Command Center Products and Atlas | Both derive their projections from the shared product/implementation registries. |
| Domain engine and Case result | Matching, evidence explanation, deadline context, review findings, decision provenance, explicit persistence; no downstream action workflow. |
| Tests and maturity | Matching-only fixture experiment, local static-client workflow, no live or enterprise claim. |
| Security/runtime | Static browser-local demonstration; no auth, tenant storage, live refresh, scheduler, or external integration. |

After the re-scope, practical order `03` is not used as a canonical ID, matching is not conflated with downstream commercial action, and the shared TenderApps page is not represented as a new canonical Agent.

## Correction ledger

| What happened | Root cause | Correction | Reusable rule | Regression evidence |
| --- | --- | --- | --- | --- |
| The migrated product combined TL-A031 matching with a downstream promotion workspace. | Legacy product scope was carried into the practical Agent after provisional placement. | Rename to TenderMatch and remove the downstream workflow from UI, types, engine, registries, docs, and active tests. | A practical implementation must remain inside its owner Agent’s responsibility boundary. | Matching-only source and registry assertions. |
| 142 absent pair records could be read as zero. | A full matrix was constructed from only 18 evaluated records. | Preserve `null/MISSING`; keep numeric zero distinct. | Absence of an assessment is not an adverse assessment. | Matrix cardinality and zero-versus-MISSING tests. |
| Saved time state could become stale. | Relative state was persisted. | Recompute from absolute deadline and injected clock on resume. | Persist dated facts; derive clock-relative state. | Stale persisted-Case test. |
| Legacy and audited results could appear equivalent. | Historical curated scores had no replayable formula. | Keep immutable legacy estimates beside evidence-gated audited support. | Never reverse-engineer evidence to reproduce a historical score. | 18-pair experiment and policy tests. |
| A fixed relationship picture could imply geographic accuracy. | Labels changed while geometry did not. | Mark it visibly and semantically as schematic/non-geospatial. | Fixed geometry must never claim live map meaning. | UI/CSP fallback assertions. |

## Current maturity

This is a local `concept-or-simulation` implementation backed by a bounded, dated-fixture formula experiment. Matching calculations, explicit MISSING behavior, evidence linkage, consultant-decision provenance, deterministic resume behavior, and browser-local explicit-Case reconstruction are functional. Live-source validity, production accuracy, tenant security, durable records, Dataset activation, and deployment remain unproven and out of scope.
