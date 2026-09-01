# TenderMatch Match Formula v1.0 model card

Status: active controlled local pilot. Engine `tendermatch-match-formula/1.0.0`; policy `tendermatch-evidence-aware-goods-works/1.0.0`. Inputs are the unchanged 60-tender Central Asia snapshot, 17 pinned Neon v1.3 GOODS/WORKS suppliers and 289 non-contact supplier-evidence records. The result is a **Preliminary notice-level match**, never a formal bid evaluation, legal-eligibility verdict, winner prediction, Bid/No-Bid decision or outreach action.

## Baseline freeze and correction

The frozen predecessor was engine `tendermatch-exploratory-fit/5.0.0` with policy `tendermatch-goods-works-evidence-overlap/2.0.0`. It produced 1,020 MISSING values and zero numeric results because it required a conjunction of artifact linkage and normalized overlap that the batch could not satisfy. That output remains the immutable comparison baseline; historical results are not silently overwritten.

- What happened → all current pairs appeared MISSING.
- Root cause → VERIFIED evidence was effectively treated as a prerequisite for any usable fit signal, although the approved batch truthfully contains zero VERIFIED claims and 226 STATED_UNVERIFIED claims.
- Correction → score only evidence-supported, type-compatible notice-level criteria; preserve claim class, Data Coverage and Evidence Confidence separately.
- Reusable rule → claim confidence limits trust but must not erase supported preliminary evidence; UNKNOWN remains absent from the numerator and reduces coverage.
Regression evidence → deterministic synthetic scenarios, current-pair calibration, exact 1,020-key replay and threshold/invariant tests.

## Intended use and authority

TenderMatch supports a TenderLab consultant reviewing one Supplier × Tender pair under `agent:TL-A031`. The consultant receives a reviewable fit result, weighted explanation, gates, missing inputs, evidence identities and a separate human disposition. Supplier readiness, urgency, confidence and consultant decision never add Match Score points.

The method currently evaluates GOODS and WORKS notices only. CONSULTING, SERVICES and OTHER notices are completed as `UNASSESSED` with `CURRENT_SCOPE_GOODS_WORKS_ONLY`; they are not forced into a procurement class.

## Outputs

Every pair records:

- Match Score 0–100, `ESTIMATED`, or MISSING when minimum coverage is not met;
- Data Coverage 0–100, `CALCULATED`;
- Evidence Confidence 0–100, `CALCULATED` from evidence actually used;
- mandatory gates with `PASS`, `FAIL`, `UNKNOWN` or `NOT_APPLICABLE`;
- exactly one Pair Status: `BINGO_MATCH`, `STRONG_CANDIDATE`, `POTENTIAL_MATCH`, `NEEDS_VERIFICATION`, `NO_MATCH`, `BLOCKED_INELIGIBLE` or `UNASSESSED`;
- main reason, blockers, missing inputs, criterion details, evidence IDs, versions, timestamp and immutable input identities.

The complete 1,020-pair inventory is exportable as CSV and as a typed `.xlsx` audit workbook. The Excel artifact contains a Formula Summary sheet and one Pair Evaluations sheet with numeric score/coverage/confidence cells, a typed evaluation timestamp, the full mandatory-gate and weighted-criterion JSON audits, reason/blocker/missing/evidence fields, consultant disposition, versions and reader label. It does not collapse MISSING values to zero.

`MISSING` is a component value class, not a Pair Status. A genuine evaluated zero remains numeric zero and is distinguishable from missing evidence.

## Weighted criteria

Fit levels are 5 exact/direct, 4 strong, 3 partial, 2 weak, 1 minimal, 0 supported incompatibility and null unknown. Null is excluded from the score denominator and reduces Data Coverage.

`Match Score = 100 × Σ(weight × fit / 5) / Σ(assessed weights)`

`Data Coverage = 100 × assessed applicable weights / all applicable weights`

### GOODS

| Criterion | Weight |
| --- | ---: |
| Product technical fit | 35% |
| Supply capacity and delivery feasibility | 20% |
| Comparable contract experience | 20% |
| Geography, logistics and after-sales | 10% |
| Financial and procurement readiness | 15% |

### WORKS

| Criterion | Weight |
| --- | ---: |
| Works technical fit | 25% |
| Similar contracts and references | 25% |
| Personnel, equipment and capacity | 20% |
| Mobilization and local delivery | 15% |
| Financial and procurement readiness | 15% |

Technical points use normalized title/object/tag terms and a versioned procurement alias taxonomy. Full notice descriptions remain retrieval inputs, but boilerplate project prose cannot create technical points. Capacity claims may support a bounded supplier-side criterion; without a mapped tender threshold the mandatory capacity gate remains UNKNOWN. Industries served are never presented as comparable contracts. Readiness is never a proxy criterion.

## Mandatory gates

The policy keeps procurement type/supplier role, exclusion or restriction, required licenses/certifications, turnover threshold, comparable-contract threshold, capacity threshold, local registration/partner and delivery/mobilization impossibility outside weighted arithmetic. A supported FAIL produces `BLOCKED_INELIGIBLE`. Relevant UNKNOWN gates can produce `NEEDS_VERIFICATION`. The same fact cannot contribute both gate points and weighted points because gates carry no score weight.

## Confidence policy

Evidence confidence bands are: VERIFIED or official reviewed evidence up to 100; reliable corroborated evidence 85; supplier official published evidence 70; marketplace or STATED_UNVERIFIED evidence 50; INFERRED evidence 30; UNKNOWN 0/no coverage. An unavailable saved artifact caps confidence at 30 and remains visibly identified. This v1.3 batch contains zero VERIFIED claims, so no current result can inherit verified status.

Evidence Confidence is the weight-adjusted confidence of records used by assessed criteria. It is not global supplier quality, Data Coverage or supplier readiness.

## Status thresholds

- `BINGO_MATCH`: score ≥85, coverage ≥85, confidence ≥75, no FAIL and no unresolved mandatory gate.
- `STRONG_CANDIDATE`: score ≥75, coverage ≥70, confidence ≥60 and no FAIL.
- `POTENTIAL_MATCH`: score ≥60, coverage ≥50, minimum evidence and no FAIL.
- `NEEDS_VERIFICATION`: promising fit with low coverage/confidence or relevant mandatory UNKNOWN.
- `NO_MATCH`: supported objective incompatibility or score below 60 with coverage at least 50.
- `BLOCKED_INELIGIBLE`: a supported mandatory FAIL.
- `UNASSESSED`: coverage below 50, missing core input or currently unsupported procurement type.

## Current full replay

Fixed evaluation time: `2026-09-01T11:09:44.745Z`.

| Outcome | Count |
| --- | ---: |
| Unique Supplier × Tender pairs | 1,020 |
| Numeric preliminary Match Scores | 48 |
| MISSING scores | 972 |
| Bingo / Strong / Potential | 0 / 0 / 0 |
| Needs verification | 3 |
| No match | 45 |
| Blocked / ineligible | 37 |
| Unassessed | 935 |

The 935 unassessed pairs are notices outside the current GOODS/WORKS formula scope. The 37 blocked pairs are in-scope notices with a supported supplier-role mismatch. All 48 compatible pairs meet 60–65% Data Coverage; three have a score at or above 60 but remain `NEEDS_VERIFICATION` because evidence confidence is 50 and mandatory gates are unresolved. Forty-five are supported `NO_MATCH` preliminary outcomes. No result qualifies as Bingo or Strong.

The calibration ledger is `docs/evidence/tendermatch-match-formula-v1-calibration.json`; the baseline freeze is `docs/evidence/tendermatch-match-formula-v1-baseline.json`.

## Invariants and limits

1. UNKNOWN/MISSING is never converted to zero.
2. A supported zero is numeric and retains cited supplier-scope evidence.
3. Evidence IDs belong to the evaluated supplier; criteria do not reuse the same claim.
4. Improved technical overlap cannot reduce Match Score with other inputs fixed.
5. Supplier readiness, deadline, consultant decision and general company size do not change Match Score.
6. A closed tender changes freshness/review context, not historical fit arithmetic.
7. No BINGO or STRONG label may appear below its score, coverage and confidence thresholds.
8. The result retains tender snapshot/version, supplier profile/batch version, engine/policy version and evaluation timestamp.

This remains `isolated-method-validated`, not predictive validation. Tender specifications, comparable contracts, tender-specific qualification thresholds, independent risk/eligibility evidence and delivery feasibility remain incomplete. Authentication, tenant-isolated persistence, production API hosting and a durable execution journal remain later gates.
