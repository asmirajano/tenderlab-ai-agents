# TenderMatch Pair Scoring Formula v1.1 model card

Status: approved scoring-stage pilot. Engine `tendermatch-match-formula/1.1.0`; policy `tendermatch-coverage-adjusted-goods-works/1.1.0`. Inputs are the unchanged 60-tender Central Asia snapshot, 17 pinned Neon v1.3 GOODS/WORKS suppliers and 289 non-contact supplier-evidence records.

The output is a **Pair Score from 0 to 100 for every Supplier × Tender pair**. Formula v1.1 does not decide whether a pair is a Match or Non-match. It is not a formal bid evaluation, legal-eligibility verdict, winner prediction, Bid/No-Bid decision or outreach action.

## Historical baseline

The frozen predecessor `tendermatch-exploratory-fit/5.0.0` produced 1,020 MISSING numeric values. Formula v1.0 then scored only sufficiently covered pairs. Both remain historical comparison evidence; Formula v1.1 is the active scoring rule.

## Formula

Fit levels are: 5 exact/direct, 4 strong, 3 partial, 2 weak, 1 minimal, 0 supported incompatibility and MISSING when evidence is unavailable.

`Pair Score = ROUND(100 × Σ(weight × available fit / 5) / Σ(all applicable criterion weights), 0)`

For arithmetic only, a MISSING criterion contributes zero points. It remains labelled MISSING in the explanation and reduces Data Coverage; it is not rewritten as evidence of incompatibility.

The app also retains an audit-only comparison measure:

`Assessed-only Fit = ROUND(100 × Σ(weight × available fit / 5) / Σ(assessed criterion weights), 0)`

Data Coverage and Evidence Confidence stay separate from both scores. Supplier readiness, deadline urgency, risk and consultant disposition never add score points.

## Criteria

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

CONSULTING, SERVICES and OTHER notices receive a numeric zero under the current GOODS/WORKS-only policy and retain `CURRENT_SCOPE_GOODS_WORKS_ONLY` as the reason. That zero means no supported points under this formula, not a confirmed Non-match.

## Gates and evidence

Procurement type/supplier role, restrictions, licenses, turnover, comparable contracts, capacity, local registration and delivery feasibility remain explicit diagnostic gates. Gates do not add weighted points. Evidence retains its source identity and value class (`VERIFIED`, `STATED_UNVERIFIED`, `INFERRED` or `UNKNOWN`).

Evidence Confidence is the weight-adjusted confidence of records used by assessed criteria. Data Coverage is the share of applicable criterion weight supported by usable evidence. Neither is a Match verdict.

## Current complete replay

Fixed evaluation time: `2026-09-01T11:09:44.745Z`.

| Outcome | Count |
| --- | ---: |
| Unique Supplier × Tender pairs | 1,020 |
| Numeric Pair Scores | 1,020 |
| Missing numeric scores | 0 |
| Score 0 | 972 |
| Score 1–20 | 39 |
| Score 21–40 | 7 |
| Score 41–60 | 2 |
| Score 61–100 | 0 |

Formula v1.1 deliberately creates no Bingo, Strong, Potential, Match or Non-match class. Any later threshold policy must be separately calibrated, reviewed and approved.

## Exports and invariants

CSV and `.xlsx` exports include Pair Score, Assessed-only Fit, Data Coverage, Evidence Confidence, gates, criterion details, reasons, blockers, missing inputs, evidence IDs, input versions and evaluation time.

1. Every canonical pair key is unique and receives an integer Pair Score from 0 to 100.
2. MISSING remains visible at criterion level and contributes no points.
3. A zero Pair Score is not automatically a Non-match.
4. Evidence IDs belong to the evaluated supplier; criteria do not reuse another supplier's claims.
5. Better supported fit cannot reduce Pair Score when other inputs are fixed.
6. Readiness, urgency and human disposition do not alter Pair Score.
7. No Match label is emitted until a threshold policy is separately approved.
8. Results retain tender snapshot, supplier batch, engine, policy and timestamp identities.

This remains an evidence-aware scoring pilot, not predictive validation. Tender specifications, comparable-contract proof, tender-specific qualification thresholds, independent eligibility evidence and delivery feasibility remain incomplete.
