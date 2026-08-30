# TenderMatch audited scoring model card

Status: Stage 2 matching-policy evidence experiment retained inside the complete TenderBoost migration baseline, 2026-08-30. This model card governs the TL-A031 result only; the separately versioned legacy Campaign Studio parity module is not a scoring output. Active policy: `tendermatch-audited-match/3.0.0`. Deadline-context policy: `tendermatch-deadline-context/3.0.0`. Frozen source comparison: `tenderboost-legacy-baseline/1.0.0`.

## Intended use

The policy estimates evidence support for one Company × Tender fit under `agent:TL-A031`. It supports consultant review; it is not a probability of award, eligibility verdict, general readiness score, participation design, Bid/No-Bid recommendation, or external commercial action.

The only authorized evidence for this experiment is the non-confidential frozen TenderBoost fixture at source commit `04b0b2a723223d11617837ee0e7562fa48168cd9`, plus the reviewed pair-to-evidence mapping in `packages/tenderboost/src/experiment-data.ts`.

## Input inventory and semantics

| Input | Role/value meaning | Active use |
| --- | --- | --- |
| 16 tender records | Dated `SUPPORTING_DOCUMENT`; tender fields are `ASSUMED` until refreshed | Pair identity, description, absolute deadline, time context |
| 10 company records | Dated `SUPPORTING_DOCUMENT` | Company identity and evidence lookup |
| 18 legacy pair rows | Historical curated `ESTIMATED` values | Comparison only; not an audited operand |
| 142 absent pair rows | `MISSING`, not zero | Excluded from evaluated/audited results |
| Evidence records | Legacy-reviewed, inferred, unknown, or reviewed records with confidence and provenance | Component eligibility and explanation |
| Pair evidence mappings | Reviewed `USER_ASSERTION` semantic assignments | Component semantic bands for the bounded experiment |
| Company readiness | Historical `ESTIMATED` fixture value | Displayed separately; never an audited operand |
| Absolute deadline + injected clock | Dated source fact + runtime context | Separate calculated urgency/freshness; never an audited operand |
| Consultant decision | `SOURCE` user assertion with actor/time/rationale | Separate human disposition; never an audited operand |

## Frozen baseline versus active policy

The legacy 65–95 pair scores are retained exactly but their formula cannot be replayed from the fixture. The engine does not manufacture evidence to reproduce them. Their compatibility status is historical estimate only.

The active policy uses two distinct components:

`Audited Match Support = technical relevance × 70% + market/delivery relevance × 30%`

Each component requires:

1. a reviewed pair-to-evidence assignment;
2. at least one referenced record that exists;
3. record status `LEGACY_VERIFIED` or `REVIEWED` for this bounded experiment;
4. confidence at least 75;
5. a semantic band of 60, 80, or 100;
6. evidence identities not reused across both components.

If either required component fails, the whole audited result is MISSING. Numeric zero is reserved for a future genuinely evaluated zero and cannot be produced from absence. Complete results are labelled `strong` at 85–100, `review` at 70–84, and `weak` below 70. These are review bands, not win probabilities.

The 70/30 weighting is a provisional expert policy. Technical relevance is primary for TL-A031; market/delivery relevance is a bounded secondary fit constraint. It is not learned from outcomes and must be revalidated before production use.

## Separate dimensions

- **Legacy Match Score:** frozen curated estimate.
- **Audited Match Support:** evidence-gated estimate under the active formula.
- **Company readiness:** general historical estimate owned conceptually by `agent:TL-A009`, not part of pair fit.
- **Evidence quality:** mean confidence of distinct records accepted for the audited pair, not global company coverage.
- **Deadline urgency:** monotonic time context from the absolute deadline and supplied clock; it never changes Match Support.

Frozen-baseline conversion is deterministic: tenders use absolute end-of-day instants, and positive whole days remaining are `floor((deadlineAt - suppliedClock) / 24h)`. At `TENDERBOOST_DEMO_AS_OF` this reproduces the original 16-value `daysLeft` vector `[1,1,2,2,5,5,8,8,8,8,9,11,15,16,116,135]`; resumed Cases always recompute from the new injected clock.
- **Consultant decision:** human approve/hold/reject record; it never changes any score.

Risk, stale/closed state, and evidence refresh appear as separately owned review findings. They do not become hidden score penalties.

## Experiment results

| Outcome | Count | Meaning |
| --- | ---: | --- |
| Historically assessed pairs | 18 | Source fixture contains a numeric legacy estimate |
| Audited Match Support available | 6 | Both distinct evidence components pass |
| Assessed but audited MISSING | 12 | At least one required component is unsupported |
| Unassessed / MISSING | 142 | No pair row exists; never interpreted as zero |

The six evidence-sufficient scenarios are Yutong × `514122` (100), Kingpeng × `G05` (94), NCS Testing × `DPA14004203 / ICB 514062` (94), Yutong × `UP/ICB/26/01` (100), United Imaging × `514110` (72), and Chery × `ZR-SPACE-252528-GO-RFB` (86).

The audited values differ from historical scores because the historical scores are not reproduced. Differences are displayed, never silently overwritten.

## Representative deterministic scenarios

- Evidence-sufficient strong match: both distinct records pass, producing a weighted result and evidence IDs.
- Partial evidence: one component is MISSING, so the result is MISSING and current approval is held.
- Unassessed pair: no legacy row, so both legacy and audited values are MISSING rather than zero.
- Genuine zero: a synthetic evaluated zero remains numeric zero and distinct from absent data.
- Closed or stale tender: Match Support remains the evidence result, while current-decision support receives a TL-A017 finding.
- Material risk signal: score remains separate and the finding is handed to `agent:TL-A038`.
- Human decision: actor, timestamp, rationale, and revision are recorded without changing the formula.

## Formula audit findings

| Risk found | Correction in active policy |
| --- | --- |
| Historical score has no replayable operands | Retain as immutable comparison only |
| Company readiness could double-count broad capability evidence | Exclude it from pair Match Support |
| Global evidence coverage could masquerade as pair evidence | Calculate quality only from accepted pair records |
| One record could support multiple dimensions | Reject record reuse across required components |
| Missing evidence could become zero through default arithmetic | Stop calculation and return MISSING |
| Deadline pressure could inflate fit | Keep time context separate from Match Support |
| Consultant approval could circularly increase the number under review | Keep decision outside every formula |
| Narrow semantic assignments could imply unsupported precision | Use three coarse bands and mark the result ESTIMATED |

## Confidence and limitations

Recognition and fixture structure are high-confidence because parsing is deterministic. Semantic and arithmetic/domain confidence remain bounded because the source evidence is old, the semantic bands were expert-reviewed rather than outcome-trained, and underlying source documents were not freshly replayed. Human-review confidence changes only when the consultant records a disposition; it does not upgrade source evidence.

This policy cannot establish production accuracy, live tender status, complete eligibility, risk clearance, or general company readiness. The snapshot is stale at the current project clock. No result may be called current until upstream source, deadline, evidence, and risk handoffs are satisfied.

## Invariants

1. MISSING is never coerced to zero.
2. An unassessed pair never receives a numeric Match Support value.
3. A numeric zero remains distinguishable from MISSING.
4. Both required components must exist before weighted arithmetic runs.
5. One evidence record cannot satisfy both components.
6. Unsupported, low-confidence, or missing records cannot contribute.
7. Company readiness, deadline urgency, and consultant decision cannot affect Match Support.
8. Every accepted component exposes evidence IDs, confidence, rationale, weight, and policy version.
9. Loaded Cases recompute deadline freshness with the supplied clock.
10. The primary UI, saved Case, explanations, and future handoffs read one composite result with an explicit Case ID.

## Versioning and saved Cases

Schema/engine `3.0.0` is a major contract change: the active Case contains only matching, explanation, review findings, and consultant-decision provenance. New records use TenderMatch identities and the TenderMatch storage namespace.

Historical schema `1.0.0` and `2.0.0` records are compatible inputs only. Migration reconstructs the active formula from supplied Tender, Company, evidence, and clock; preserves decision history; records the source schema/product; excludes fields outside the TL-A031 contract; and leaves the original legacy browser key intact. Unknown versions fail explicitly.
