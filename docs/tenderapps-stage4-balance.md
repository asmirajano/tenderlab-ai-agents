# Stage 4 — TenderBalance independent development app

Date: 2026-09-14. The user approved proceeding with separation and explicitly deferred incidental product inconsistencies. No old coupling is removed and no production cutover is performed.

## Logistics precedent and Balance-specific treatment

| Concern | Logistics precedent | Balance implementation |
|---|---|---|
| Safe extraction | Copy, validate, retain old app | Same; 19 copied UI/helper files remain exact matches |
| App structure | Own entry/package/build in one monorepo | `apps/tender-balance`; own `assets/balance` output |
| Engine/shared code | Product domain plus shared design tokens | `packages/tender-balance` plus tokens; FIN workspaces, manifesto and collapse/focus helpers retained |
| Source/history | Isolated worktree and checkpoint | New `codex/tenderapps-balance-extraction` branch; newer committed Balance work retained |
| Persistence | Existing localStorage keys; no origin migration | Cases, contexts, comparison decisions, FIN currency/admin settings retain their existing code and keys |
| OCR | No Tesseract in Logistics | Balance retains Tesseract 7, local worker, embedded-WASM core wrapper and English traineddata |
| Reference data | Logistics-owned benchmarks | Existing CBU 2015–2025 FX JSON and financial rules preserved, not refreshed or replaced |
| DB/API/auth | Browser-local client; no migration | No database/authenticated API/secret dependency found in inspected Balance client/domain source; root repository Firebase dependencies do not imply a Balance data migration |
| Localhost | Permanent controller identity, loopback, health | `tender-balance`, allocated port 6209, independent lifecycle |
| Release | No production switch | Same; Firebase, domains, CI/CD, databases and production data unchanged |
| Rollback | Checkpoint plus old app retained | Parent reconciled checkpoint and new branch retained; stop only the Balance preview if necessary |

## Source reconciliation

- Canonical fetched `origin/main`: `d230590cf5ee99a679f162b2e3a19b65752c0f16`.
- Selected committed Balance base: `430c9503b68eccc2126b214292316ca398f2c615`, descends from canonical and adds four commits: table styling, late-title income statement recognition, full-currency-unit FIN presentation, financial typography.
- Prior separation commits `8f1c055` and `51130ad` were replayed into this new worktree without conflicts as `38ffb31` and `a99c34227c025aeba822d759fa4a7d97c628679f`. Original commits/branches remain preserved. No rewrite of their history or remote push.
- Worktree: `C:/CodexWork/tenderapps-balance-extraction`. Parent checkpoint before new extraction: `a99c34227c025aeba822d759fa4a7d97c628679f`.
- The older dirty 8224 worktree remains untouched: six modified tracked files plus the untracked Chinese-statement regression. Some subject matter already has canonical regressions, but this is NOT a claim that every dirty change is redundant or integrated. Remaining unique work needs separate reconciliation before promotion, not automatic overwrite of the newer committed source.
- Existing TenderApps and running Logistics are not repointed to this combined worktree. Logistics remains at its own `51130ad` checkpoint on port 6208.

## Changes and configuration

New app HTML/React entry, package, focused TypeScript config and Vite config. All copied business UI and domain code remain behavior-identical to the selected Balance source. Shared domain files, existing TenderApps files, FX JSON, case IDs and financial semantics were not edited.

The existing product-import audit now accepts explicit additional product contracts. Balance's closure is restricted to its domain and named shared/helper files. Its production build rejects modules from the old app, Logistics app/domain and Match domain. CSS remains copied for parity; this is not a claim of fully minimized CSS or separate dependency installations in the working preview.

Unlike the old closeBundle-only OCR copying, the new app also serves the three approved OCR assets through its own development middleware. Exact route allowlist and GET/HEAD only; no arbitrary file endpoint, secret, external API or additional server port. Production builds copy the same assets to `dist/ocr`.

Lockfile change is the new Balance importer only, using existing versions. pnpm attempted an unrelated root Drizzle peer-resolution rewrite; that change was removed before frozen-install validation. No dependency upgrade retained.

## Validation

| Check | Result |
|---|---|
| Balance regression files | 75 passed |
| Core balance and financial typography suites | 30 passed, 1 skipped because explicitly supplied MF291 benchmark PDF is absent |
| New Balance + existing Logistics extraction/boundary checks | 12 passed |
| Overall above | 117 passed, 0 failed, 1 skipped |
| 19 copied files, illustration and storage keys | Parity checks pass |
| Selected-worktree production build | Pass; sibling-module guard enabled |
| New entry/config/guard/tests lint | Pass |
| Fresh frozen installation | pnpm 11.19.0, all 6 workspace manifests, 658 packages, scripts disabled; supply-chain policy pass |
| Clean production build | Pass in `C:/CodexWork/tenderbalance-frozen-validation` |
| Reproducibility | All five built JS/CSS/worker assets and three OCR files match SHA256 between selected and clean builds. Manifest source paths differ due to dependency locations |
| Lockfile preservation | Source and clean-copy SHA256 `58B28815A4331FB542D539FFD2362987B809CDE14C5C66F54832703291963F1C` |
| Local OCR URLs | HTTP 200; downloaded bytes exactly match built files: worker 111307 bytes, core 3896484 bytes, language 2952873 bytes |
| Browser overview/intake | Renders independently with only Balance navigation and explicit undeployed label |
| Synthetic TXT intake | 10 rows, 20 values, 12/12 arithmetic checks; source periods 2025/2024 retained |
| Synthetic isolation | Demo mode, Cases 0; fixture not silently persisted as real client evidence |
| FIN workflow | FIN-1/FIN-2 catalog and mapping render; absent income/turnover remains missing; FIN-1 generated with declared gaps |
| Full-unit regression | Browser FIN-1 displays 2025 assets 10000000 USD from 10000 USD-thousands, preserving the selected newer presentation fix |

Browser automation reported one click timeout during FIN navigation; subsequent visible state confirmed navigation and generated-form verification completed. No repeated click or alternate hidden-state mechanism was used.

## Deferred, not silently fixed

Focused TypeScript check reports 14 inherited diagnostics, reproduced with the same codes and source locations against original and extracted Balance: file-reader line 288 (2); fin1-fx lines 150,167,206,252,263,264,265 (7); fin2 lines 239,240,241,245 (4); model line 1042 (1). These are NOT a typecheck pass. No suppression or finance/parsing logic patch was introduced to hide them. Build and runtime smoke validation pass despite these inherited issues.

The Logistics summary inconsistency remains deferred by explicit user instruction and does not block this development extraction. Large build chunks remain warnings. Native full browser OCR recognition, comprehensive mobile/accessibility, real-record save/reload/origin migration, all exports, database recovery and production readiness are not claimed from this bounded replay. Core regression did exercise its supplied OCR image and synthetic PDF through the domain pipeline separately.

## Rollback and next gate

Old TenderApps remains usable at its unchanged source/address; Logistics keeps its existing source/address. There is no production route/data switch to undo. To withdraw the new local preview, stop `tender-balance` through the controller, retaining its reservation and files. Do not delete the old app, worktree, records or registered directories. New stage work is retained in the branch commit containing this report; the parent checkpoint remains reachable.

Next separation stage: extract TenderMatch after reconciling its static client versus development backend edition and divergent work. Production switch, database/origin migration, removal of old coupling and independent deployment pipelines remain separately gated. Functional cleanups can follow independent operation as requested.
