# Stage 6 — selective review, not a match decision

Owner: `agent:TL-A031`. Primary product: a bounded, explainable shortlist for a
consultant or a separately authorized expensive-review intake process. Current
maturity is an isolated development method. No frontend, deployed API, AI/TORS
runtime, autonomous review decision or end-user authorization is implemented.

## Frozen input and independent dimensions

Read exactly the sealed Stage 5 candidate ranking over the sealed Stage 4 Formula
records. Stage 3 eligibility, Formula v1.1/denominator 100, numeric Pair Score,
Data Coverage, Evidence Confidence, assessed-only fit, criterion states/references,
retrieval relevance, semantic Missing, human disposition and any future AI/TORS
output remain distinct and unchanged. Nothing is re-extracted from source systems.

The selection projection carries canonical pair IDs, inherited profile identities,
retrieval units/limitations, Formula score, coverage, confidence and main limitation.
It does not create scope, verification, comparable-contract or financial evidence.
The complete underlying Formula record remains the authority for every criterion.

## Compared policies and selected development budget

The full real-data comparison used all 707,660 candidates, including 24,007 with
positive lexical/structured relevance. The selected policy is
`tendermatch-directional-shortlist/1.0.0`, configuration `balanced-100-3`.

| Policy | Review nominations per supplier/tender | Review union | Audit-only union | Total | Candidate share |
| --- | --- | ---: | ---: | ---: | ---: |
| Positive only | All / none | 24,007 | 0 | 24,007 | 3.3924% |
| Focused | 50 / 2 | 13,217 | 9,503 | 22,720 | 3.2106% |
| **Balanced** | **100 / 3** | **18,531** | **9,503** | **28,034** | **3.9615%** |
| Broad | 250 / 5 | 23,404 | 9,503 | 32,907 | 4.6501% |

The balanced review queue alone is approximately 2.619% of all candidates; the
separate audit pool is approximately 1.343%. It reduces positive-review volume by
5,476 rows versus all positives while retaining all 99 suppliers and 5,645 tenders
with any positive evidence. It is a transparent workload budget, not a calibrated
quality threshold. Broader selection nearly restores all positive rows; narrower
selection drops 5,314 additional positive rows without increasing focus coverage.
These comparisons justify the intermediate development budget, not business
accuracy or an optimized cost/recall tradeoff.

### Review nominations

For each supplier independently, take up to 100 positive-retrieval candidates.
For each tender independently, take up to three positive-retrieval candidates.
Order lexicographically by these separate, visible dimensions:

1. retrieval units descending;
2. unchanged Formula Pair Score descending;
3. unchanged Data Coverage descending;
4. unchanged Evidence Confidence descending;
5. opposite canonical UUID ascending.

No arithmetic combines these dimensions. A positive lexical overlap is only an
observed retrieval signal, never proof of fit. `supplierNominationRank` and
`tenderNominationRank` are within this selection-policy ordering, **not** the
Stage 5 relevance/UUID pagination rank. A missing nomination rank is null.
`tieSize` retains the size of the equal four-dimension group before UUID breaking.
Ties do not expand quotas; canonical UUIDs make the budget deterministic.

### Separate blind-spot audit nominations

Among retrieval-zero candidates only, each supplier nominates up to two and each
tender up to one. Order by SHA-256 of the compact JSON array
`[policyVersion,"blind-spot-audit",supplierId,tenderId]`, then opposite UUID.
This stable hash spread avoids repeatedly choosing the first UUID or presenting
a zero-retrieval row with high Formula score as automatically promising. It is
a reproducible audit sample, not random sampling with a statistical recall claim.
Audit `tieSize` records the entire zero-evidence pool, not an inferred confidence.

### Union, fairness and actual bounds

Membership is the deduplicated union of both directions. Review and audit tiers
are disjoint because they require positive and zero retrieval respectively.
Reasons are retained independently: bit 1 supplier review; 2 tender review;
4 supplier audit; 8 tender audit. Bitmasks encode reasons, never a score.

The limits above are **directional nomination caps, not final incident caps**.
Other focuses can nominate a pair. With the current population the union spans
all 108 suppliers and 9,592 tenders having any Formula candidate; the 9 suppliers
and 7,741 tenders without candidates receive no invented membership.
Actual final incident counts are 52–2,361 per covered supplier and 1–49 per
covered tender; review-only maxima are 1,771 and 48. The separate audit pool spans
108 suppliers and 9,502 tenders, with 48–1,887 audit pairs per supplier and 1–2 per
tender. The remaining 90 candidate tenders have no retrieval-zero candidate.

Fairness here means each focus has the same nomination opportunity, not equal
case load or demographic fairness. Unbalanced evidence and candidate degrees
produce uneven union counts. The implementation does not promise hard final
per-supplier/per-tender caps or allow ties to silently enlarge nomination caps.
Batch scheduling and per-reviewer operational limits remain separate future work.

## Readiness and nonmembership

`REVIEW_CANDIDATE` means selection-qualified for **possible** future selective
review intake: expected intake candidates 18,531. It does not mean evidence is
complete or AI execution is authorized. Actual AI/TORS-ready/authorized count
is zero because no such readiness/authority contract has been implemented.
`AUDIT_ONLY` means blind-spot investigation, not promising, qualified, Non-match,
or automatically AI-ready. The audit-only planning count is 9,503.

An existing candidate not stored in this shortlist remains
`NOT_STORED_IN_SHORTLIST`, with `onDemandEscalationEligible: true` and the original
Formula/retrieval data. A later user-opened escalation is possible under its own
gate. Membership never deletes or changes the complete deterministic results.
Pairs without Formula candidate eligibility return `NOT_A_FORMULA_CANDIDATE`;
Stage 6 does not reconsider their eligibility or manufacture a zero score.

## Immutable reuse and dependency-local invalidation

Create one focus context for every pinned entity, including empty focuses. Bind
it to policy/code hash, ranking method, Formula policy, own profile identity and
the ordered candidate projection with both endpoint profile identities. Extract
directional nominations once and reuse the exact context when those inputs agree.
Retain the nomination result digest separately and reject corrupt cache bodies.

A supplier change invalidates its supplier context and each tender context whose
candidate list contains it. Tender changes are symmetric. The union memberships
whose endpoint contexts change are conservatively rebound; unrelated context
and pair identities reuse their results. No selection output changes another
context's ordering, so there is no recursive selection feedback/cascade.

This dependency closure can be broad in a dense all-to-all candidate graph.
It is not falsely advertised as recalculating only the changed endpoint's pairs:
top-N membership can change for a competitor in the same focus. Different global
run identity alone does not invalidate equivalent focus evidence; a changed
ranking method or selection-policy/code identity does. Old runs remain readable.

## Persistence and query contract

Five additive tables: immutable focus contexts, run identities, pinned run/context
members, compact union pairs, and sealed completions. Context creation is checked
against independent SQL nomination logic and a database-computed input signature.
Reused contexts in a new ranking run must have the identical database signature.
Membership is sealed in the run-creation transaction; pair rows reference actual
Stage 5 records and must reproduce their two contexts' reasons/ranks/tier.
Completion verifies the complete unique nomination union, not a requested subset.

`queryShortlist` requires explicit sealed run, supplier/tender direction and pinned
focus; limit is 1–100 (default 25). The keyset cursor binds run/direction/focus and
orders review tier first, then audit, then canonical opposite ID within each tier.
This is deterministic list traversal, not another relevance score or recommendation
rank. Two focused B-tree indexes serve it. A bounded materialized page joins the
unchanged Stage 5/Formula records once; no whole universe is returned to a caller.

`selectedShortlistDetail` requires explicit pair IDs, exposes independent signals,
full Formula criterion audit and both nomination-context explanations. It also
supports a non-shortlisted candidate without changing or writing its membership.
No implicit latest-run selection, human decision or AI/TORS record is loaded.

Owner-only 090 DDL is separately gated. Writer SELECT/INSERT only, RLS tenant GUC,
immutable update/delete triggers, foreign keys and independent nomination checks.
This is a trusted-service tenant boundary, not authentication for arbitrary users.
No new database, role, extension, vector, model, source connection or deployment.
