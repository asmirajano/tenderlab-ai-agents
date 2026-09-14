# Active task: Stage 2A — Supplier Readiness Alignment

Re-read this entire file immediately after any context compaction. Historical Formula deployment, frontend releases, and the stale 25a9 checkout are not the active objective.

## Authoritative base

- Worktree: `C:/CodexWork/tendermatch-neon-all-to-all`
- Branch: `codex/tendermatch-neon-all-to-all`
- Accepted Stage 2 checkpoint: `c1cdb6fb7070d62602bc44d09abadec4e7c35581`
- Development only: neither a release candidate nor deployed.
- Before implementation: fetch/prune, verify HEAD, clean state (apart from this authorized contract), divergence, relevant worktrees and parallel work. Preserve unrelated changes; stop on material differences.

## Execute Stage 2A

Establish one versioned, field-level readiness/mapping layer for all 117 suppliers: 100 neutral-research suppliers and the original 17. Reuse existing authorized research; do not re-research from scratch.

Map genuine evidence consistently into Formula v1.1-compatible supplier inputs:

- Supported Goods/Works classification.
- Products, materials, industries and works capabilities.
- Separate output, facility, workforce, equipment and specification quantities, with explicit units and periods.
- Geography, local presence and delivery reach.
- Certifications and genuine comparable contracts.
- Financial metric, amount/range, currency and reporting period as distinct fields.

Preserve exact supplier/profile/claim/source/artifact lineage and existing evidence statuses. Retain service, consulting, mixed, uncertain and unsupported cases explicitly as UNKNOWN, NEEDS_EVIDENCE or outside-v1.1-scope; never force Goods/Works or interpret unknown as non-match or exclusion.

Correct misleading semantics across both batches:

- Backlog/order-book is not production capacity.
- Performance percentages are not turnover.
- Headquarters or exhibition attendance is not delivery reach.
- Customer count, rating or years of experience is not a comparable contract.

Extract once per supplier with versioned mapping and derivation inputs for future reuse. Add tests and Markdown plus JSON evidence comparing before/after readiness for the 100, the 17 and all 117.

## Acceptance and prohibitions

- All 117 suppliers receive a traceable reviewed readiness outcome.
- Equivalent evidence maps under equivalent rules.
- Ambiguous and absent facts stay explicit; invent no years, currencies, metrics, classifications, verification or capacity.
- Prove deterministic and idempotent extraction.
- Preserve Formula v1.1 weights and scoring semantics unchanged.
- No eligibility outcomes, pair scoring, retrieval, embeddings, shortlist, AI/TORS, human dispositions, frontend work, source writes, push, merge, deploy, publish or Stage 3.
- Preserve Stage 2 evidence, original TenderBoost source/worktree and production/live state.

## Authorized scope

Local code, tests, documentation and migrations in this isolated worktree. Only minimal additive writes to the already approved `tendermatch_results_dev` environment if necessary to persist versioned supplier-readiness outputs. No production or canonical-source mutation, credential disclosure, destructive Git action, paid action or deployment.

## Handoff

Report verified base and final commit, changed files/schema, readiness counts for 100/17/117, UNKNOWN/NEEDS_EVIDENCE counts, correction examples, lineage/version IDs, tests, validation and limitations. Confirm Stage 3 did not begin and nothing was deployed. Stop for orchestrator review.

Use GPT-6 Astra Extra High (`xhigh`), not Ultra.

## Checklist

- [x] Verify base, worktrees, remote and parallel state; read applicable skills.
- [x] Inspect all 117 authorized supplier evidence sets and define the versioned mapping contract.
- [x] Implement reusable alignment without source or Formula mutations.
- [x] Audit actual outputs for all suppliers; correct failures and retain before/after evidence.
- [x] Validate determinism, idempotence, lineage, semantic negatives and repository compatibility.
- [x] Prepare the coherent local checkpoint and completion report; stop for review after committing.

## Completion boundary

Implementation and validation are complete; the enclosing commit is the Stage 2A
checkpoint. Evidence: `docs/evidence/tendermatch-stage2a-readiness.md` and `.json`.
35 new tests, 119 focused tests and 492 full tests passed; all builds, lint, strict
changed-module typecheck and original standalone 3/3 checks passed. All 117
outcomes remain NEEDS_EVIDENCE. No Stage 3, source write, database write or deploy.
After the checkpoint, WAIT for orchestrator review; do not resume old deployment
work or infer permission for the next stage.
