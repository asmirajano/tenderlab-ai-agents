# Stage 4 — unchanged Formula v1.1 on approved scope candidates

Owner: TL-A031 TenderMatch. This is a development scoring checkpoint for
orchestrator review. The primary output is one inspectable numeric evaluation
for every approved candidate intersection; the consumer is the later,
separately authorized development stage. The result does not make a consultant
decision, establish qualification, or introduce a Match/Non-match threshold.

## Selected authority and input contract

Selected base `4b66114330e302f80f9415910d2e029106578d76`, branch
`codex/tendermatch-neon-all-to-all`, worktree
`C:/CodexWork/tendermatch-neon-all-to-all`. The approved Stage 3 run is
`7b3fbc39a401a72a6452c1d9bb050c18bc92d32a0f69acb4829f0a42236e102d`;
its full ordered outcome hash is
`9afc0bf6971a5c0ece68ea1aea01a7f14731cee03ec77e8179e0a6d618d8434a`.

The population remains 117 suppliers × 17,333 OPEN/nondeleted pinned tenders:
2,027,961 intersections. Score exactly 707,660
`CANDIDATE_ELIGIBLE_WITH_LIMITATIONS` outcomes. The other 1,320,301 remain
unscored: 414,604 `SCOPE_NOT_DEMONSTRATED` and 905,697
`OUTSIDE_FORMULA_V1_1_SCOPE`. No supplier readiness, deadline or geography
filter is introduced. These are explicitly selected pinned inputs, not a new
capture or claim about current source databases.

The loader verifies every normalized feature body and association, all Stage
2A readiness bodies, prior implementation hashes, the Stage 3 run identity,
completion counts and hash. Each scoring/readback pass reads all Stage 3
outcomes and independently reproduces their full ordered hash. The worker
connects only to the isolated results database; no supplier or tender source
database connection is made in Stage 4.

## Unchanged Formula and versioned adapter

Formula `tendermatch-match-formula/1.1.0`, policy
`tendermatch-coverage-adjusted-goods-works/1.1.0`. The existing
`scoreCompactPair` provides the scalars; the adapter derives the complete
criterion audit and checks it against those scalars. Synthetic fixtures also
compare against the original `evaluateExploratoryPair` oracle.

| Criterion order | Goods maximum points | Works maximum points |
| --- | ---: | ---: |
| Technical relevance | 35 | 25 |
| Capacity / similar contracts | 20 capacity | 25 similar contracts |
| Comparable experience / personnel and equipment | 20 experience | 20 capacity |
| Market delivery / mobilization | 10 | 15 |
| Financial and procurement readiness | 15 | 15 |
| **Fixed denominator** | **100** | **100** |

The adapter `tendermatch-stage2a-formula-adapter/1.0.0` applies only these
translations from existing evidence:

- Mapped product families, works specializations, industries and materials
  become technical operands using the unchanged Formula token/concept rules.
- Unambiguous physical output, workforce, equipment and facilities quantities
  become the existing supplier-side `capacity` claim. Physical stock may lack
  a reporting vintage, retained explicitly as a limitation. Output needs a
  time basis. Ambiguous amounts/units, negative or contradictory measures,
  uncertain/negated assertions and unavailable artifacts are withheld.
- Mapped geographic markets become market operands. Missing tender country
  withholds the geography criterion, preventing the JavaScript empty-string
  substring case from granting unsupported points.
- Claims keep source IDs, artifact IDs/hashes, `INFERRED` or
  `STATED_UNVERIFIED` status, source value class and individual Stage 2A fact
  IDs. One source claim contributes once per Formula field; clause splitting
  does not multiply its confidence weight.
- Supplier source classification is retained independently from the provisional
  Stage 3 scope. Mixed candidates are evaluated on the evidenced tender scope.
  This adapter projection does not update canonical supplier classification.

Tender scoring terms/concepts come directly from Stage 2's pinned Formula
operands. Display-title truncation, derived lookup tags, boilerplate notice
text, semantic retrieval and embeddings cannot alter the score. Source
timestamps retain their unknown timezone and do not become eligibility tests.

Technical Fit uses the existing normalized overlap rule, 0–5. Existing capacity
claims earn Fit 3, with `TENDER_CAPACITY_THRESHOLD_UNKNOWN`; this is not an
assertion that a tender capacity requirement was met. Geography uses the
unchanged Formula partial-credit rule and retains delivery feasibility as
unverified. Comparable contracts and financial threshold comparisons stay
Missing; neither past revenue nor generic customer prose supplies those facts.

For criterion i, points = maximum × Fit / 5 when assessed, otherwise zero.
Missing Fit remains null and state `MISSING`. An assessed technical Fit 0
remains an assessed zero and contributes its maximum weight to coverage.
Pair Score is the sum of points over the fixed denominator 100. Data Coverage
is the sum of assessed weights. Assessed-only fit is rounded
`100 × points / assessed weight`, or 0 when coverage is 0. Evidence Confidence
is the rounded assessed-weight mean of the unchanged source confidence bands.
None of these quantities is legal eligibility or supplier readiness.

The unchanged notice-level Formula cannot award all 100 points with this
adapter: contracts and financial comparisons are permanently Missing in these
inputs. Even all available operands at their strongest supported level yield
57 Goods points / 52 Works points because capacity remains Fit 3. Coverage
maxima are 65 / 60. A fabricated 100-point fixture would change the contract.

## Compact canonical result and inspectability

Schema `tendermatch-development-formula-result/1.0.0` adds five tables:

| Table | Purpose |
| --- | --- |
| formula_input | One immutable adapter projection per entity version, including normalized operands and shared evidence reference groups. |
| formula_run | Formula, adapter, code, policy, Stage 2/2A/3 and whole-input identities, counts and actual creation time. |
| formula_member | One input per supplier/tender for the selected run; sealed at transaction commit and checked against Stage 3 membership. |
| formula_pair | One reusable evaluation per policy and supplier/tender input key, numeric score including zero, coverage, assessed-only fit, confidence and all five criterion arrays. |
| formula_completion | Exact scored/unscored counts and complete ordered readback hash; inserted only after verification. |

Criterion arrays retain Fit, explicit state, points, maximum points, confidence,
reference group and limitation bitmask. Reference groups 0/1/2/3 mean
none/technical/capacity/market. State 0 is Missing; state 1 is assessed. SQL null
Fit is distinct from assessed zero. Reference arrays are shared by an entity,
not duplicated across hundreds of thousands of pair rows. The versioned
`expandCriterionAudit` reconstructs full claim/fact/artifact references,
limitations and tender source feature identity for each criterion.

Limitation bits, in order: missing criterion evidence, unknown tender capacity
threshold, missing independent verification, no normalized technical overlap,
notice-level technical comparison, unverified delivery feasibility. The
deterministic principal limitation is the criterion with most unearned points;
ties prefer Missing, then the original Formula order. The original generic
Formula main reason remains separately reproducible.

Noncandidate pairs have no `formula_pair` row. The full Stage 3 universe joined
to this ledger yields a null score for every such outcome. The full traversal
verifies that no excluded outcome has a score and no candidate lacks one.
Bounded supplier/tender/detail query helpers return stored numeric candidates
in canonical ID order; there is no relevance ranking, shortlist or threshold.
Detail and expanded export use the same stored record. No frontend was built.

## Identity, resumption and incremental changes

Pair key is `(policy hash, supplier adapter input key, tender adapter input key)`.
Policy binds Formula/schema/adapter, Stage 3 policy, limitation dictionary and
LF-normalized canonical-JSON SHA-256 hashes of all scoring/runtime/migration
files. Adapter input keys cover complete source versions, feature/readiness
identity, scope key, normalized operands and evidence references. Run identity
additionally binds the whole approved input snapshot and Stage 3 outcome hash.
Evaluation timestamps are metadata and do not change deterministic scoring.

An unchanged rerun reads every pair and reuses all candidate evaluations with
zero insertions. A changed supplier invalidates its candidate intersections;
a changed tender invalidates its candidate suppliers. Unscored intersections
are not manufactured into zero-score cache entries. Version changes preserve
old runs and evaluations. Isolated SQL tests create changed evidence/inputs
and prove proportional recomputation with historical readback intact. Real
source data is never modified to manufacture an incremental experiment.

Each page contains at most 4,096 universe outcomes, with at most that many
scoring records. The worker never allocates the full matrix. Atomic SQL retries
are restricted to serialization/deadlock errors, at most three attempts;
ambiguous network and permission failures stop for explicit idempotent resume.

## Persistence boundary, security and execution

Existing development project `dry-union-87553313`, branch
`br-polished-boat-b1qddx0m`, endpoint
`ep-dark-dew-b15ctyr1.c-5.eu-central-1.aws.neon.tech`, database
`tendermatch_results_dev`, schema `tendermatch_retrieval`.
The existing `tendermatch_result_writer_dev` login inherits
`tendermatch_result_writer`. No role, credential or billing change is made.

Migration `070-formula-up.sql` requires the owner, exact development database
marker, branch attestation, exact five prior migrations and approved Stage 3
completion. It adds only Stage 4 tables/functions/indexes, writer SELECT/INSERT
grants and its migration record. PostgreSQL enforces candidate scope, pinned
membership, complete population, five criterion weights/shapes, Missing versus
zero semantics, component/scalar sums, references and principal limitation.
PUBLIC receives no table/function grants. Writer UPDATE/DELETE/TRUNCATE/DDL
are denied, and immutable triggers additionally prevent history rewriting.
RLS uses the existing trusted-service tenant setting, not end-user authentication.

```text
node --experimental-strip-types scripts/tendermatch-score-formula.mjs plan
node --experimental-strip-types scripts/tendermatch-score-formula.mjs inspect --execute-approved
node --experimental-strip-types scripts/tendermatch-score-formula.mjs execute --execute-approved
node --experimental-strip-types scripts/tendermatch-score-formula.mjs replay --execute-approved
```

The plan is disconnected. Inspect loads and verifies approved inputs and reads
the complete Stage 3 population; candidate calculations go to a discarded sink.
Execute registers immutable inputs, persists candidate scores, independently
recalculates the entire scored population, seals completion and reruns the
unchanged cache. Replay performs readback without inserts. Credentials are
read only from the existing ignored result-writer secret file with exact
endpoint/database/role/TLS guards; no secret enters reports or bundles.

The prepared `070-formula-down.sql` is not executed. It refuses populated
history and requires the exact development owner/target. It does not cascade
or remove prior Stage 3 data.

No source writes, semantic retrieval, embeddings, AI/TORS, ranking, frontend,
human disposition, push, merge, deployment or publication is authorized here.
Stop at the locally committed evidence checkpoint for orchestrator review.

Completed counts, measurements, validation and limitations are recorded in
[the Stage 4 evidence report](evidence/tendermatch-stage4-formula.md).
