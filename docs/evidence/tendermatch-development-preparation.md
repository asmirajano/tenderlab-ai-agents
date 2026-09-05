# Development database preparation evidence

Date: 2026-09-06. Branch: `codex/tendermatch-neon-all-to-all`. Base: `cda9ab646fe768600af455a340f5cd4538c05ca8`; the enclosing commit identifies the prepared artifacts. Fetched `origin/main` remained `d230590cf5ee99a679f162b2e3a19b65752c0f16` during this stage. No push, deployment, Neon connection or real scoring run.

## Final validation

| Gate | Result |
| --- | --- |
| New preparation suite | 25/25, zero failures/skips, including actual disposable SQL execution |
| Focused preparation + all-to-all + census + Formula | 50/50, zero failures/skips; includes the unchanged 1,020-pair Formula oracle |
| Full repository `npm run test` | 408/408, zero failures/skips |
| Production builds (inside full test command) | Command Center/export, Atlas, TenderApps and generated 64 Agent specifications passed |
| Root `npm run lint` | Passed |
| Strict TypeScript | `all-to-all-contract.ts` and imported domain graph passed with `--strict --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --allowImportingTsExtensions --skipLibCheck` |
| New JavaScript runners | ESLint and `node --check` passed; executable behavior covered by focused tests. The app's TS configuration excludes JavaScript; no claim of strict TS checking these MJS files |
| Full-app TypeScript | 24 existing diagnostics in unchanged TenderBalance/Logistics code; reproduced on release base. Current diagnostic hash equals previously retained baseline, below. Not a new pass |
| Disconnected runner | `node scripts/tendermatch-dev-setup.mjs plan` returns `PREPARED_NOT_APPLIED`, `connects:false` |
| Original standalone | Clean at `04b0b2a723223d11617837ee0e7562fa48168cd9`; existing built-output static checks 3/3 passed |
| Scope | No app, dataset, Formula engine, existing result migration, Firebase, registry, lockfile or secret-output changes |

Runtime: Node 24.19.0; existing locked dependencies/junctions. Disposable SQL runtime: PGlite 0.5.3 and pgvector 0.8.1, loaded from the existing temporary dependency root via `TENDERMATCH_PGLITE_ROOT`. This is not Neon/production validation. Synthetic schemas/rows/roles exist only inside the disposable runtime. Source/result target guard SQL remains intact and rejects the transient `postgres` target.

Retained ignored logs under this worktree's `tmp/`:

| File | SHA-256 |
| --- | --- |
| `development-preparation-full.log` | `9751c56c1946256b96a81a4f15614f0587792396a98f05abfbdbd6a0eb60591c` |
| `development-preparation-focused.log` | `ac68565a0bb0d092a638df02605ce9db930d8d420c2d70dccd2a487f5c62c4bb` |
| `development-preparation-lint.log` | `9276ef4bc01832b8616fbf4f4e75861a2ea759898dc6bbbd5912dffe3746eff4` |
| `development-preparation-full-app-types.log` | `e5b45c0ea630571bc2dd1fb39dcd38f60961a8d3b4aa6e6d7eadb756d2394678` |

## What is and is not proven

Proven locally: 117 synthetic canonical identities traverse exactly once; missing/ambiguous/future profiles are handled without latest/fixture fallback; exact legacy claim names remain supporting evidence; private canaries and unlinked artifacts do not become safe claims; same-count ID drift is rejected; reader permissions and writer RLS/denials execute; NULL versus zero and five-component audit reconcile; explicit rollback preserves unrelated source objects.

Not yet proven: live 117 profile/evidence completeness, exact live ID digest, endpoint-to-branch binding refreshed at application time, Neon owner privileges/extension availability, credential/TLS/Windows ACL execution, server-side free-text privacy review, multi-session concurrency, actual all-to-all scoring, hosted API, tenant authentication, embedding quality or TORS operations. No new credential files were created. Browser QA is not applicable: there is no frontend change or new preview.

The [runbook](../tendermatch-development-database-runbook.md) gives exact database selection, SQL order, environment names, validation, rollback and partial-failure recovery. The next authorization is development setup only, not scoring or deployment.
