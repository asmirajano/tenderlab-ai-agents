# Active task — Stage 1 input manifest

After context compaction, read this file before taking task actions. The active
delegation is Stage 1, not any historical Formula or deployment request.

- Worktree: `C:/CodexWork/tendermatch-neon-all-to-all`.
- Branch: `codex/tendermatch-neon-all-to-all`; approved Stage 0: `9f3bcb4ac785f42accd289502932a1f1e6cb7514`.
- Preserve the existing `040-input-manifest-up.sql` and `049-input-manifest-down.sql` drafts.
- Reconciled tender authority: TenderLab (`solitary-darkness-82235346`),
  `backup/pre-mvp-rc1-20260726` (`br-morning-water-atqp6w7c`),
  `ep-aged-feather-atm85iwd`, `neondb`, existing `th_qa_readonly`.
- Capture ALL suppliers through `tendermatch_all_supplier_api` (historical 117),
  and ALL tenders where `status='OPEN' AND "deletedAt" IS NULL` (historical 17323).
- Only write additive compact manifests to development result target
  `dry-union-87553313` / `br-polished-boat-b1qddx0m` /
  `ep-dark-dew-b15ctyr1.c-5.eu-central-1.aws.neon.tech` /
  `tendermatch_results_dev.tendermatch_retrieval`.
- Reuse existing protected credentials privately. No source permission/data changes.

Acceptance checklist:

- [x] Finish and test minimal immutable manifest schema and guarded runner.
- [x] Apply additive development-only migration with existing owner credential.
- [x] Complete bounded, repeatable-read, duplicate/orphan/version checked capture.
- [x] Record independent capture times, source identities, predicates and drift limits.
- [x] Persist compact IDs/version/content hashes; no tender bodies or pair rows.
- [x] Read back/reconcile counts, IDs and hashes; test idempotency and tenant/role guards.
- [x] Record measured query/time/storage evidence and actual potential-pair arithmetic.
- [x] Write `docs/evidence/tendermatch-development-stage1.md` and `.json`.
- [x] Run focused/full proportional checks; local checkpoint/report are the final remaining actions.

Scoring, eligibility, shortlisting, normalization, embeddings, AI/provider runs,
frontend/Formula work, production mutation, push/merge/deploy/publish, paid actions,
and Stage 2 are NOT authorized. Stage 1 completion must explicitly state NOT RUN
for scoring/eligibility/shortlisting/AI. Preserve original standalone app.

Resume checkpoint: migration applied, 117 + 17323 = 17440 members persisted;
manifest `1dde6c1b91bf02ff499493e99e236355016ff838cc39d11d1187bffada40a729`,
capture `dd3d7b86bfe7305f5b7b00228a8e15a55cdccb46ba384ec5ba851d147c8ccc05`.
Full tests 427/427, focused 59/59, original 3/3; all builds, full lint and strict
domain typecheck passed. Remaining: local checkpoint commit, report and stop.
Do not recapture/register again merely because of compaction.
