# TenderBoost audited scoring model card

Status: Stage 2 bounded experiment, dated 2026-08-30. Policy version: `tenderboost-audited-match/2.0.0`. Campaign-priority policy: `tenderboost-campaign-priority/2.0.0`. Frozen historical baseline: `tenderboost-legacy-baseline/1.0.0`.

This model card covers the authorized, non-confidential TenderBoost demonstration fixture only. It does not establish production accuracy, live eligibility, probability of award, supplier qualification, Bid/No-Bid, legal outreach authority, or autonomous campaign authority.

## Business question and authority

The bounded question is: **does this historically assessed Company × Tender pair have distinct reviewed evidence for both technical relevance and market/delivery relevance, and what support band follows from those records?**

The result is an evidence-support estimate for consultant review. It is not a probability, prediction, eligibility verdict, or consultant decision. A human consultant retains the match decision and exact campaign-copy approval. No external activity occurs without a separately authorized integration or auditable manual event.

## Input inventory and source roles

| Input | Role and value meaning | Current use |
|---|---|---|
| 16 Tender records | Dated `SUPPORTING_DOCUMENT`; tender fields are `ASSUMED` until refreshed | Pair identity, object/tags, country/region, absolute deadline, snapshot age |
| 10 Supplier profiles | Dated `SUPPORTING_DOCUMENT`; profile fields are not promoted to current facts | Supplier identity and review context |
| Supplier evidence records | Dated `SUPPORTING_DOCUMENT`; legacy VERIFIED becomes `LEGACY_VERIFIED`, not current external-claim approval | Audited component evidence, confidence, provenance, blockers |
| 18 curated legacy pair records | Historical `ESTIMATED` values | Immutable comparison baseline only |
| 142 absent pair records | `MISSING`, not numeric zero | Excluded from audited and campaign results |
| Pair-to-evidence mappings | Reviewed `USER_ASSERTION` in the bounded experiment manifest | Semantic assignment of existing evidence to a component; creates no new evidence |
| Supplier readiness | Historical `ESTIMATED` fixture score with no independently replayed formula | Displayed separately; excluded from audited Match Support and audited Campaign Priority |
| Consultant decision | `SOURCE` user assertion with actor, time, and rationale | Workflow gate only; excluded from audited score and priority formula |
| Absolute deadline and injected clock | Dated input plus deterministic runtime operand | Freshness, closed state, monotonic urgency |

## Frozen Stage 1 baseline

Stage 1 behavior remains reconstructable and is never silently overwritten:

- Match Score: exact curated legacy pair score, or `MISSING` when the pair is absent.
- Readiness: legacy overall-readiness estimate.
- Global verification quality: `(LEGACY_VERIFIED count + 0.35 × INFERRED count) / all evidence count × 100`, rounded.
- Deadline factor: `45` at 0–3 days, `100` at 4–14 days, `82` at 15–30 days, otherwise `48`.
- Human relevance: `100` approved, `20` hold, `60` pending.
- Legacy Campaign Priority: `48% Match + 18% readiness + 16% global verification + 11% deadline factor + 7% human relevance`, rounded.

The audit found that the historical Match and readiness formulas were unavailable; global verification was supplier-wide rather than pair-specific; consultant approval was circularly included in a supposedly separate priority; urgency was non-monotonic; lexical claims could reuse one record more than once; and exact-looking results conveyed unsupported precision. These findings are retained as historical behavior, not repaired in place.

## Audited Match Support 2.0.0

### Calculation gate

An audited score is calculated only when all of these invariants hold:

1. the Company × Tender pair is one of the 18 historically assessed pairs;
2. a reviewed technical-relevance mapping points to at least one existing evidence record;
3. a reviewed market/delivery mapping points to at least one existing evidence record;
4. every contributing record is `LEGACY_VERIFIED` or `REVIEWED` and has confidence of at least 75;
5. no evidence record contributes to both components.

If any invariant fails, the audited result is `MISSING` with component reason codes and actionable missing inputs. It is never converted to zero.

### Semantic bands and formula

The experiment uses deliberately coarse, inspectable bands:

- `100`: direct scope evidence or same-country delivery evidence;
- `80`: comparable scope evidence or same-region delivery evidence;
- `60`: general category evidence or broad/global delivery evidence;
- `MISSING`: no qualifying evidence; this is not a weak or zero match.

When both components exist:

`Audited Match Support = round(Technical relevance × 0.70 + Market/delivery relevance × 0.30)`

Labels are `strong` at 85–100, `review` at 70–84, and `weak` below 70. These are experiment review bands, not win probabilities. The 70/30 weighting is a provisional expert policy: capability relevance is primary for TL-A031, while market/delivery evidence is a secondary practical constraint. It is not learned from outcomes and must be revalidated before production use.

Evidence quality is not weighted into Match Support, preventing the same evidence from influencing the match twice. Pair Evidence Quality is shown separately as the mean confidence of the distinct accepted component records.

## Audited Campaign Priority 2.0.0

Deadline urgency is monotonic for an open tender: `round(102.5 − 2.5 × days remaining)`, clamped to 25–100. A closed tender has `MISSING` urgency.

Campaign Priority is calculated only when Audited Match Support, Pair Evidence Quality, and open-tender Deadline Urgency all exist:

`Campaign Priority = round(Audited Match Support × 0.65 + Pair Evidence Quality × 0.20 + Deadline Urgency × 0.15)`

Legacy readiness is excluded because its source formula has not been independently replayed. Consultant decision is excluded to avoid circularity. Both remain separately visible and still control workflow eligibility. Suppression, consent, compliance risk, freshness, evidence-for-external-claims, approval, and outreach events are blockers rather than hidden score penalties.

## Bounded experiment results

The experiment evaluated all 18 historically assessed pairs and preserved the other 142 as unassessed `MISSING` pairs.

| Tender | Supplier | Legacy | Audited | Difference | Verdict |
|---|---|---:|---:|---:|---|
| `UP/ICB/26/01` | Yutong | 95 | 100 | +5 | Direct ambulance evidence + same-country fleet delivery evidence |
| `514122` | Yutong | 92 | 100 | +8 | Direct ambulance evidence + Uzbekistan presence |
| `G05` | Kingpeng | 85 | 94 | +9 | Direct greenhouse EPC + regional delivery evidence |
| `DPA14004203 / ICB 514062` | NCS Testing | 92 | 94 | +2 | Direct CRM evidence + regional distributor evidence |
| `514110` | United Imaging | 92 | 72 | −20 | General imaging support + same-country installation; exact modality remains unproved |
| `ZR-SPACE-252528-GO-RFB` | Chery | 88 | 86 | −2 | Comparable public-fleet evidence + DRC market presence |
| Remaining 12 assessed pairs | Various | 65–95 | `MISSING` | — | A required component was absent, inferred, unknown, below threshold, or otherwise unsupported |
| Remaining 142 combinations | Various | `MISSING` | `MISSING` | — | Never assessed in the source fixture |

No legacy score was reverse-engineered. The six numeric audited results arise from the declared component bands; differences are exposed rather than overwritten. The result set demonstrates why high curated scores cannot be treated as evidence completeness: twelve historically positive pairs still lack enough distinct evidence for the audited calculation.

## Representative deterministic scenarios

1. **Evidence-sufficient strong match:** Yutong × `UP/ICB/26/01` produces 100 from two distinct qualifying records.
2. **Partial evidence:** Huawei × `ACCESS/GOVTECH/GD-1` has direct technical evidence but UNKNOWN Bhutan evidence, so the overall audited result is `MISSING` and activation remains blocked.
3. **Unassessed pair:** any one of the other 142 pairs remains `MISSING`, not zero.
4. **Closed/stale tender:** the supplied clock recomputes closed/freshness state; urgency and priority become `MISSING`, and activation is blocked.
5. **Suppression/consent/compliance/material risk:** these remain explicit blockers and never become score penalties or positive claims.
6. **Lifecycle truth:** current match approval, campaign approval provenance, and a non-simulation outreach event with an external identity are all required before `active`; later states require their own recorded event.

## Confidence and explanation policy

Recognition, structure, semantics, arithmetic/domain, and human review remain separate. Evidence confidence is carried at record and component level. It determines whether a record qualifies and is displayed as pair Evidence Quality, but does not change a semantic band. This avoids false precision and double-counting.

Each component stores its code, value or `MISSING`, weight, evidence IDs, evidence confidence, rationale, and reason codes. Each Case stores the policy/engine/schema versions, legacy comparison, audited result, priority operands, decision history, events, blockers, and Artifact identities in one composite result.

## Saved-Case compatibility

- Schema `2.0.0` Cases are recomputed on resume using the supplied Tender, Supplier, and deterministic clock.
- Schema `1.0.0` Cases are `compatible-historical`: human decision/event/campaign history and legacy values are retained, while audited derived fields and freshness are recomputed under 2.0.0. Migration provenance is recorded in the Case.
- Unknown schema versions fail with an explicit migration requirement.
- No latest-Case fallback exists.
- Historical generated copy is retained as historical content; it is not silently represented as regenerated 2.0.0 copy.

## Limitations and next evidence gate

The fixture includes source references but the underlying documents were not freshly retrieved or replayed in this stage. All external-claim eligibility remains false. Supplier readiness, full tender requirements, consent, suppression, legal contact basis, current compliance, and current tender amendments remain unsupported or missing. The policy is therefore still `concept-or-simulation` with `unit-or-synthetic-fixture` evidence strength, despite the completed bounded formula audit.

The next safe gate is an authorized replay using current, source-complete tender requirements and supplier evidence, with blinded mapping review, calibration against human judgments and outcomes, sensitivity analysis for weights/bands, negative authorization tests, and an explicit methodology-approval decision. Deployment, sending, CRM operation, and canonical Dataset writes remain separate authorization gates.
