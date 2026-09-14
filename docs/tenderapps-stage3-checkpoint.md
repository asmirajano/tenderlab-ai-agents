# Tender Logistics development checkpoint

Date: 2026-09-14. Scope: close upload/export and frozen-install validation, then preserve a reviewed local Git checkpoint. No Balance/Match extraction, remote push, production deployment, database migration, real-record transfer or existing TenderApps lifecycle changes.

## Source identity

- Selected worktree: `C:/CodexWork/tenderapps-boundaries-stage1`.
- Parent: `8f1c0556e72aa41ad3542cee6e25fae2418fc0c6`, one commit ahead of fetched canonical `d230590cf5ee99a679f162b2e3a19b65752c0f16`.
- Checkpoint commit: the commit containing this report, to be retained on `codex/tender-logistics-stage3-checkpoint`. This is not a deployed release.
- All 31 worktree identities inventoried; relevant Logistics and Balance parallel work remains untouched. Balance table-template branch `430c9503b68eccc2126b214292316ca398f2c615` and the dirty 8224 worktree must be reconciled before a Balance extraction.
- Preview: controller-managed `tender-logistics`, permanent port 6208. Initial registration evidence is `logistics-localhost.json`; canonical registry owns its current expected HEAD.

## Verification

| Check | Evidence / result |
|---|---|
| Regression suite | 99/99 tests pass: original Logistics, simulations, extracted replay, parity and dependency guards |
| Selected-worktree typecheck/build | Pass; production build rejects sibling app/domain imports |
| ESLint | Pass for extracted source/config, boundary script, new tests and changed shared type |
| Browser XLSX upload | Repository fixture `tests/fixtures/logistics-business-document.synthetic.xlsx`, read locally; 1 processed, 0 rejected/manual-recovery, 0 failed |
| Mapped fields | 10 transaction fields and 7 costs; source compared independently with fixture cells |
| Representative values | USD 250000; 24 pallets; Guangzhou to Tashkent; rail; 52.4 m3; 8400 kg; EXW carried to next step with row provenance |
| Missing fields | Current named place remains missing, consistent with fixture; not inferred from supplier origin |
| Saved-case isolation | Existing synthetic saved case retained; upload replay not saved as an additional case |
| Actual downloaded export | 23093-byte XLSX found in Downloads; opened with ExcelJS and independently inspected with Artifact Tool without modifying it |
| Workbook content | Executive Summary, Cost Calculation, Cargo Calculation, Source & Inputs, Audit & Checks; named synthetic case and EXW-to-CIP route preserved |
| Export totals | Exact logistics cost 28768.34, displayed rounded estimate 29000, target commercial total 1615154.34 |
| Export reconciliation | Seven stored audit results PASS with zero variance; no formula-error matches in inspected workbook. These are stored results, not proof of native Excel recalculation |
| Frozen lockfile | pnpm 11.19.0 `install --frozen-lockfile --ignore-scripts` succeeded in clean `C:/CodexWork/tenderapps-pnpm-frozen-validation`, all 5 workspace manifests, 658 packages, 843-entry supply-chain policy pass |
| Lockfile preservation | Source and validation SHA256 `30BE8818E1AD327A1941AF46499837000E45710BC16F979E259ACAFC10E28D6B`; no dependency re-resolution or lockfile rewrite |
| Clean frozen-install typecheck/build | Both pass using the fresh workspace install, including the latest mobile stylesheet |
| Asset equivalence | All six emitted JS/CSS/worker assets have matching SHA256 hashes between selected-worktree and clean frozen-install builds. Vite manifest source paths differ because one install uses existing dependency junctions; manifests are not byte-identical |
| Browser console | No captured warning/error logs during upload replay; preview returned to Overview with Saved cases 1 |

Actual downloaded file: `C:/Users/Cowork 2/Downloads/STAGE3-SYNTHETIC-Logistics-Browser-Test-calculation.xlsx`. SHA256 `C50B498A64D35E3A65E68F0440E080CB58A81C3959FB8482A95C18761E6D6BDB`. It is synthetic, not client data. No regenerated workbook was substituted for the browser download.

## Open finding: contradictory document summary

What happened: XLSX summary says "shipment weight / cube not found" while the review fields correctly map 52.4 m3 and 8400 kg with worksheet provenance.

Cause: the spreadsheet adapter builds labelled-key rows and merges semantic facts, but `documentProfile` retains `textExtraction.profile.shipmentMetricsFound`. The summary badge reads that semantic-only flag, not the final mapped transaction values. The copied original adapter and UI contain the same behavior; the extraction parity guard confirms this was inherited rather than introduced by separation.

Disposition: recorded, not repaired in this validation/checkpoint step. A follow-up should reconcile summary metadata with the final mapped evidence while preserving shipment-versus-product physical distinctions, then add a focused fixture regression. Do not change confidence or relabel product dimensions merely to remove the warning.

## Limits and next gate

This is a development checkpoint with an open UI consistency finding, not an unconditional release pass. PDF upload/OCR behavior, native Excel recalculation, comprehensive network/accessibility checks, production-origin saved-case transfer, off-device backups and database recovery were not verified here. Existing ExcelJS large-chunk warning remains. Frozen installation disabled lifecycle scripts intentionally; this does not validate every other workspace app or install-time script.

Before Balance extraction: address or explicitly accept the summary finding, reconcile the newer and uncommitted Balance work, and agree the selected source. Before any production switch: validate origin/data recovery and the deployment composition/rollback plan separately. Existing TenderApps remains the functioning release path throughout.
