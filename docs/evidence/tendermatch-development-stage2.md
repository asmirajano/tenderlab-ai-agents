# TenderMatch Stage 2 — completed normalization experiment

Status: **implemented, executed and verified in results development; awaiting
orchestrator review**. No Stage 3 or release authorization is inferred.

Worktree: `C:/CodexWork/tendermatch-neon-all-to-all`; branch
`codex/tendermatch-neon-all-to-all`; approved base
`074d17fc1e4f062d98420fc6205b906a2d96bf93`. Remote `origin/main` remains
`d230590cf5ee99a679f162b2e3a19b65752c0f16`. The scoped successor commit contains
this report; exact executed source hashes are in the accompanying JSON, avoiding
a circular self-referential commit hash. Nothing was pushed, merged or deployed.

## Input boundary and complete coverage

The original 117 + 17,323 manifest
`1dde6c1b91bf02ff499493e99e236355016ff838cc39d11d1187bffada40a729` remains intact.
Source drift was detected before normalization persistence. The existing guarded
Stage 1 runner registered a new complete manifest:

- Manifest: `e928df5e6a432fa23c8ea95dbfbf1aee4f1c883646d5ed72fd2856d994102ac2`.
- Capture: `5cedcbb7a4226046528bd49c090280acf7faf90ae31dee9fe2300cb129515c25`.
- Delta: 10 added tenders; zero removed or changed old tenders; all 117 suppliers
  unchanged. Independent owner readback verifies this, not just the new count.
- Complete new boundary: 117 suppliers + 17,333 OPEN/nondeleted tenders = **17,450
  inputs**. The 2,027,961 potential pairs were **not evaluated or materialized**.
- Both captures remain: 2 manifests, 34,890 membership rows, 2 capture records.

The execution reread every source ID and evidence row in bounded independent
repeatable-read transactions, reconciled exact versions/content hashes, and found
the new boundary unchanged. Source profiles use the same approved v2.1/v1.3 pins.
No predicates, source contracts, credentials or permissions were widened.

## Feature contract and outcome

Mapping/runbook: [Stage 2 normalization](../tendermatch-stage2-normalization.md).
Feature version `tendermatch-source-features/2.0.0`; adapter and schema `1.0.0`.
Canonical owner remains TL-A031. Existing Formula v1.1 and weights are unchanged;
compatible synthetic tests verify the prepared technical/capacity/market operands.
The new whole-universe feature contract does not silently relabel itself as the
old 17-company API or enable unsupported source fields as Formula operands.

| Result | Verified count |
| --- | ---: |
| New normalized_feature records | 17,450 |
| New manifest feature associations | 17,450 |
| New normalization snapshots | 1 |
| LIMITED outcomes (explicit extraction/evidence gaps) | 17,450 |
| NORMALIZED / QUARANTINED outcomes in this source population | 0 / 0 |
| Unchanged retry: reused / recomputed features | 17,450 / 0 |
| Retry: new features / associations / snapshots | 0 / 0 / 0 |
| Full feature bodies and outcome hashes read back | 17,450 |

Normalization snapshot:
`782f8b38737b21f6940b5c3f4fe4ec6eb890be4e2d168f19ba29b4952530e5f9`.
Normalizer code hash:
`08c85b9b2ef32e9ca93a132b5fc1dc1913b052cd521f001589a6982663913fa7`.
Outcome hash:
`3503f4b0c4f42661f469b23bdc01945aa6619860f1d2ebb946f20a25d9de8caf`.

LIMITED is not ineligible, unready, zero-fit, approved or scored. Every ID is
represented; meaningful unknowns have explicit reasons. Unresolved profiles have
a tested QUARANTINED path; malformed/orphan evidence fails before persistence.

Preserved supplier classifications: 14 GOODS, 3 WORKS, **100 MISSING**.
Evidence: 1,553 records = 126 STATED_UNVERIFIED + 820 INFERRED + 607 UNKNOWN;
zero independently VERIFIED claims. SOURCE=946, MISSING=607; 167 unavailable
artifacts retain explicit limitations. All 22 approved safe evidence fields are
accounted for, with original profile, claim, source-record and artifact identities.

Quantities: 234 candidate claim fields, **40 typed** and **194 explicitly missing**.
Of the missing fields: 89 are source-missing, 101 have unsupported/compound
structure, 3 monetary claims lack currency, and 1 lacks unit/currency. Missing
reporting periods remain explicit on 17 typed quantities. Named financial metrics,
employees, floor area, plants, output, project throughput and order book are never
interchanged. Original amounts/ranges/qualifiers/currency/periods remain traceable.

Tender coverage includes all seven source scopes, 1,979 OPEN but past-deadline
records (not filtered out), 420 missing countries, 15,776 records with linked tags,
7,331 reported budgets including **229 genuine zeros**, and **10,002 missing
budgets**. All reported budgets carry currency. Source timezone is absent on all
17,333 records: timestamps are retained verbatim without inventing UTC semantics.

## Experiment and corrections

Retained baseline: `tendermatch-stage2-isolated-experiment.json` (read-only, never
persisted). The actual-output audit caught three currency-less export-revenue
claims incorrectly parsing marketplace `(Verified)` annotations as units. The
correction requires financial currency and an explicit physical-unit allowlist;
it does not upgrade the source status. General employee-range, floor-space,
project-throughput and fiscal-period/scale rules were also validated against
available source examples. This is an extraction correction, not source enrichment.

The corrected complete isolated replay is retained in
`tendermatch-stage2-corrected-experiment.json`. Its normalization identity and
outcome hash exactly equal the persisted execution. The final runner additionally
records full connection telemetry; that reporting-only addition did not change
normalizer inputs or output semantics. See the reusable failure ledger in the
mapping document and the dedicated annotation/unit regressions.

## Runtime, storage and reuse evidence

Execution: **2026-09-06 11:58:07–12:03:05 UTC**, 298.094 seconds including three
full-body readbacks, two persistence attempts, cache verification and denial tests.

| Measured stage | Evidence |
| --- | --- |
| Supplier capture | 2 profile + 4 evidence pages; 3.271 s; 1,621,296 JSON response bytes |
| Tender capture | 35 × up to 500 rows; 31.244 s; 53,867,731 JSON response bytes |
| New feature preparation | 17,450 once per entity; 35 cache queries; 15.710 s |
| First persistence + readback | 147 queries; 81.248 s |
| Cached full-body verification | 17,450 reused, 0 normalized; 52.744 s |
| Idempotent insertion + readback | 112 queries; 69.271 s; all inserts zero |
| Post-commit full readback | 37 queries; all body and association hashes equal |
| Total connections | Results 489 queries; supplier 19; tender 44 |
| Response volume | Results 328,620,061; supplier 1,621,578; tender 53,867,772 JSON bytes |
| Largest response page | 3,147,297 JSON bytes; source maximum 1,691,880 |
| Feature JSON payload | About 70.1 MiB total; maximum feature about 15.6 KiB |
| Memory | Sampled peak preparation/reuse heap 421.9 MiB; end RSS 799.2 MiB (not a measured peak) |
| PostgreSQL feature storage | 122,773,504 bytes including TOAST/indexes; heap 24,870,912 |
| Associations + header | 11,288,576 + 49,152 total bytes |

Response bytes are measured JSON serialization, not network-wire billing bytes.
Readback intentionally dominates this audit run. Cache reuse avoids re-extraction,
but fetching/revalidating whole features was slower than simple deterministic
normalization. Do not claim a speedup from cache-hit counts. Optimizing verification
traffic/retained memory for a larger universe is follow-up work, not completed here.
No per-pair inputs, narratives, embeddings or raw descriptions were persisted.

Keys include complete consumed input/lookup identity and code/schema/adapter
versions, not manifest/capture clock. Tests prove unchanged cross-manifest reuse,
one-entity invalidation, reference-country/tag invalidation, and rejection of a
changed-body feature attached to an old manifest. Source mutations were not used
as test fixtures.

## Security, validation and preserved boundaries

Only `tendermatch_results_dev` on project `dry-union-87553313`, development branch
`br-polished-boat-b1qddx0m`, received the approved additive migration and feature
writes. Existing restricted credentials were reused privately. No rotations or
role changes. Temporary owner material was cleared and the Console password hidden.

Writer SELECT/INSERT succeeds; UPDATE/DELETE/TRUNCATE/DDL, cross-tenant writes and
late association insertion fail. Cross-tenant reads return zero. The tenant GUC
is a trusted-service boundary, not end-user authentication. An independent owner
read-only postflight at 12:05:14 UTC confirms global counts, exactly four inherited
SELECT/INSERT grants on the two new tables, and zero ownership by application roles.

All 15 non-feature business/model tables remain **globally empty**, including
eligibility/universe pairs, scores, retrieval, embeddings, assessments and human
dispositions. Existing indexes are only maintained as a normal consequence of
feature inserts; no retrieval/ANN/model activation occurred.

- Focused Stage 0/1/2 + all-to-all contracts: **84 passed, 0 failed, 0 skipped**.
- Stage 2-specific suite: **30 passed**, including executable ephemeral SQL gates.
- Full repository suite: **457 passed, 0 failed, 0 skipped**.
- Full lint and changed-source strict TypeScript: **pass**.
- Command Center, Atlas and TenderApps production builds; 64 generated Agent
  specifications: **pass**. Existing chunk-size, emitted CSS filename and static
  route classification warnings remain unchanged.
- Original standalone worktree: clean at
  `04b0b2a723223d11617837ee0e7562fa48168cd9`; **3/3 static checks pass**.
- Source owner audit: 117 canonical companies, 117 all-company profiles, 1,553
  safe evidence records; legacy API remains **17 profiles / 289 evidence records**.
- No frontend changes; no browser workflow or UI replacement is claimed.

## Residual limitations and stop gate

This is a **validated development normalization experiment**, not enterprise
matching readiness. Unknown classifications, unverified claims, missing currencies,
unsupported compound quantities and absent structured tender thresholds stay visible.
Descriptions are transient 12,000-character prefixes (413 truncated); general terms
are capped at 128; full Formula technical vocabulary stays separate. Unicode is
preserved, but concepts are English-only and no translation is claimed. Supplier
fields from the newer source vocabulary are not silently reassigned Formula roles.

Stage 2 is ready for orchestrator review. The next safe decision is acceptance of
this feature contract and limitations, or a bounded normalization correction. No
eligibility, pair scoring, retrieval, embeddings, AI, frontend stage, source
replacement, production deployment or paid work starts without further authority.
