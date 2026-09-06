# Stage 2A — supplier readiness alignment evidence

2026-09-06. Development-only checkpoint on `codex/tendermatch-neon-all-to-all`,
worktree `C:/CodexWork/tendermatch-neon-all-to-all`. Accepted base
`c1cdb6fb7070d62602bc44d09abadec4e7c35581`. The enclosing commit identifies this
completed stage. No release candidate, frontend change, database migration or
deployment is implied.

## Result and scope

All 117 supplier inputs and all 1,553 safe claims were inspected and processed by
one versioned field-level alignment policy. The source hash matched the accepted
Stage 2 supplier membership on both initial capture and fresh final capture.
Every claim has an audit disposition and exact source/artifact lineage; every
supplier has a result identity and all 25 field states. No supplier was removed.

The 100 neutral profiles contribute 1,400 claims. The original 17 contribute 153
claims through this Stage 2 safe matching-field projection (9 each); this is not
a claim that the separate legacy 289-row profile API was replaced or reduced.
No source API, source profile, evidence row, status or artifact was modified.

| Measure | Neutral 100 | Original 17 | All 117 |
| --- | ---: | ---: | ---: |
| Source classification before | 100 unknown | 14 Goods / 3 Works | 100 unknown / 14 Goods / 3 Works |
| Scope candidate after: Goods | 80 | 13 | 93 |
| Scope candidate after: Works | 0 | 3 | 3 |
| Scope candidate after: Services | 9 | 0 | 9 |
| Scope candidate after: Mixed | 11 | 1 | 12 |
| Scope candidate after: Consulting / Unknown | 0 / 0 | 0 / 0 | 0 / 0 |
| Overall NEEDS_EVIDENCE | 100 | 17 | 117 |
| Overall UNKNOWN | 0 | 0 | 0 |
| Field cells MAPPED | 544 | 111 | 655 |
| Field cells NEEDS_EVIDENCE | 300 | 15 | 315 |
| Field cells UNKNOWN | 1,656 | 299 | 1,955 |
| Mapped technical candidate coverage | 82 | 17 | 99 |

These are **scope candidates and evidence-completeness outcomes**, not eligibility
or Match/Non-match classifications. The 100 new scope interpretations are
provisional, evidence-linked lexical inferences requiring review; no classification
was written back. Elsewedy's original Goods classification is preserved while its
explicit EPC capability additionally produces a mixed-scope review warning.
Consulting and unknown inputs are supported by negative tests even though no
final real-source record lands in those two categories under this policy.

All 117 remain NEEDS_EVIDENCE because independent verification, compliance and
tender-specific requirements have not been established. `MAPPED` does not mean
VERIFIED, eligible, ready to bid, ready to score or human-approved. Field totals
include optional/nonapplicable dimensions (for example works for Goods suppliers)
and must not be presented as a readiness percentage.

## Field coverage

Cells show `MAPPED / NEEDS_EVIDENCE / UNKNOWN`, suppliers not claim counts.
The JSON report includes all 25 fields, before-source field coverage and all
individual supplier/claim outcomes.

| Field | Neutral 100 | Original 17 | All 117 |
| --- | --- | --- | --- |
| Classification | 0 / 100 / 0 | 16 / 1 / 0 | 16 / 101 / 0 |
| Products | 82 / 11 / 7 | 14 / 0 / 3 | 96 / 11 / 10 |
| Works capabilities | 1 / 0 / 99 | 4 / 0 / 13 | 5 / 0 / 112 |
| Industries | 1 / 0 / 99 | 17 / 0 / 0 | 18 / 0 / 99 |
| Materials | 66 / 6 / 28 | 14 / 0 / 3 | 80 / 6 / 31 |
| Output capacity | 0 / 6 / 94 | 1 / 5 / 11 | 1 / 11 / 105 |
| Facilities | 0 / 24 / 76 | 1 / 5 / 11 | 1 / 29 / 87 |
| Workforce | 0 / 17 / 83 | 1 / 0 / 16 | 1 / 17 / 99 |
| Equipment | 0 / 6 / 94 | 0 / 0 / 17 | 0 / 6 / 111 |
| Specifications | 79 / 7 / 14 | 0 / 0 / 17 | 79 / 7 / 31 |
| Markets / reach | 50 / 8 / 42 | 17 / 0 / 0 | 67 / 8 / 42 |
| Local presence | 29 / 0 / 71 | 0 / 1 / 16 | 29 / 1 / 87 |
| Delivery terms | 55 / 8 / 37 | 0 / 0 / 17 | 55 / 8 / 54 |
| Credentials | 20 / 16 / 64 | 9 / 0 / 8 | 29 / 16 / 72 |
| Identifiable comparable-contract evidence | 0 / 0 / 100 | 0 / 0 / 17 | 0 / 0 / 117 |
| Named financial metrics | 0 / 5 / 95 | 17 / 0 / 0 | 17 / 5 / 95 |

The 14 neutral suppliers with other monetary figures retain them separately as
financial-other candidates, not turnover. Known amounts without a currency or
reporting period are retained as partial values. The 16 financial-other supplier
outcomes across both batches include the two original backlog/order-book claims.
Missing time periods do not erase physical measurements; complete/partial values
remain inspectable inside the ignored result artifact.

Source statuses remain exactly 820 INFERRED, 126 STATED_UNVERIFIED, 607 UNKNOWN,
zero VERIFIED. Claim-audit mapping outcomes are 750 mapped, 195 needs evidence,
608 unknown. The extra unknown versus the registry's 607 is an INFERRED claim
whose text starts `UNKNOWN`; its original status is retained, not upgraded.
No confidence percentage was invented or averaged.

## Concrete corrections and lineage examples

| Supplier / source claim ID | Correction |
| --- | --- |
| EEI / `7d418b10-7bbc-4d09-82fc-607f270e5b06` | PHP 36.85 billion remains backlog, not physical capacity. Its separate FY2024 revenue is retained independently. |
| Budimex / `e57b7d10-3e11-4b23-916a-58b7babd4353` | PLN 17.86 billion remains order book, not physical capacity. Revenue of PLN 4,262,947 thousand retains H1 2026 and exact decimal scaling. |
| Changle Jiaxiang / `e4659872-2829-512d-a128-4109c43f8edb` | 100.0% dispatch performance is an operating metric, not turnover. |
| Shanghai Hongruibang / `a3e6515e-39b4-5ed4-9baa-b5d9790f5254` | Annual export-revenue amount 5 million survives; currency and reporting year remain unknown. Source wording Verified does not change INFERRED status. |
| Elsewedy / supplier `6ea1abc6-affc-571f-a43b-821220b15ed7` | Preserve declared Goods and flag additional explicit Works/EPC scope for review, without source rewrite. |
| Shenzhen Dajuxing / supplier `2037bfbe-038a-5525-820c-1b8b63cb2970` | Preserve freight-forwarding/service scope; do not force into Goods merely to satisfy the old Formula input type. |

## Experiment corrections before final replay

| What happened | Root cause / layer | Correction | Reusable rule | Regression evidence |
| --- | --- | --- | --- | --- |
| A printer's 8–9 colours could be typed as machine count | Quantity semantics favoured equipment nouns over measure qualifiers | Classify colour specification before equipment count | A number describes its measure, not the nearest object | Colour/litre/tolerance tests and full replay |
| `+- 0.005mm` could look like a negative amount | Sign grammar omitted an alternate plus/minus notation | Preserve plus/minus explicitly, positive magnitude and mm | Qualifiers need their own grammar | Plus/minus test and source replay |
| Two conflicting factory-area numbers could appear as one selected value | Parser retained the first number despite ambiguity | Preserve both observations and no effective numeric selection | Never choose silently between conflicting measures | Competing-area regression |
| Shipping cartons and truck freight could pollute capability scope | Keyword matching ignored product/service phrase context | Ignore packaging's shipping adjective and transport vehicles in freight phrases | Classify the offering, not an isolated noun | Goods-versus-transport tests |
| Unknown model labels could be dropped from product explanation | Narrow physical lexicon omitted ambiguous fragments | Preserve all unresolved fragments with explicit needs-evidence reasons | Unrecognized is not absent | Full claim-audit coverage and unknown tests |

No filename, supplier-name, supplier-ID, tender, expected score, currency or year
answer key is used by the alignment policy.

## Identity and persistence evidence

- Schema: `tendermatch-supplier-readiness/1.0.0`.
- Policy: `tendermatch-supplier-alignment/1.0.0`.
- Source hash: `d4cc46e56aadd97a90e7d0c65bfc2224c9a0af85db375844d105ad4ca3275102`.
- Implementation hash: `0436e05a9b82add71744dc9ea9d5042bd546a52d4f537c56ffad302a3088800e`.
- Run ID: `ce4d742d71cccc329a3129bb549273c41f4efe3fafcdd3b862dbe4ef6058d844`.
- Outcome hash: `ecb47df168f0df87a802d40a2bef623c1695a4c12ffdb6d3e7fe21f8f6aa5396`.
- Local immutable output: `outputs/stage2a/readiness-<run ID>.json`; source capture
  is `outputs/stage2a/source-<source hash>.json`. Both are Git-ignored and excluded
  from Hosting. The committed JSON is a safe audit projection, not raw research.
- First extraction: 117 records. Second pass: **117 reused, 0 extracted**.
- Reversed supplier and evidence input order: identical outcome hash.
- Full saved-artifact reload: 117 exact content/identity matches.
- Changed supplier invalidates only that supplier; changed mapping/code invalidates
  its versioned results. Corrupt cache fails closed.

Read-only database postflight: 17,450 Stage 2 features and associations, one
normalization snapshot, two input manifests unchanged. All 15 business/model
tables remain empty, including pair scores, retrieval, embeddings, AI jobs and
human dispositions. No database write, migration, new role or credential occurred.

## Validation

- New readiness suite: **35/35**.
- Focused Stage 0/1/2/2A/all-to-all compatibility: **119/119**, no skips; optional
  ephemeral PGlite SQL checks enabled. These are synthetic regression operations,
  not actual supplier/tender scoring or writes to Neon.
- Full repository `npm test`: **492/492**, no failures or skips.
- Root lint: pass.
- Strict changed-module TypeScript: pass.
- All production builds (Command Center, Atlas, TenderApps) plus 64 generated Agent
  specifications: pass. Existing large-chunk, CSS filename-conflict and static
  route-classification warnings remain; no unrelated fixes were attempted.
- Original standalone read-only checks: **3/3**; worktree clean at
  `04b0b2a723223d11617837ee0e7562fa48168cd9`.
- No browser QA required/performed: this stage changes no frontend or served UI.

## Limitations and review gate

This is a tested local alignment method, not activated production inputs. It does
not re-open original artifacts or independently verify claims; it consumes the
authorized pinned safe evidence projection. The lexical policy is bounded and
conservative, not a universal classifier or translation engine. Ambiguous source
terminology, compound measurements, generic credentials, missing financial periods,
absent identifiable contracts and incomplete compliance remain explicit.

Formula v1.1 source, weights and semantics are byte-identical to Stage 2. Typed
capacity facts are not concatenated into a legacy capacity string. Financial,
credential and contract fields are not wired into unsupported Formula criteria.
Repeated corroborating claims are not summed. A later approved adapter must retain
measure/period compatibility and evidence deduplication.

Stage 3 has **not started**. No tender eligibility, pair score, shortlist, retrieval,
AI/TORS, human disposition, source update, push, merge, publish or deployment.
Next safe decision: orchestrator review of this alignment policy and its explicit
remaining evidence gaps. No subsequent stage is authorized by completion.
