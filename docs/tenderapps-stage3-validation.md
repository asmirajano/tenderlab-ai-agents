# Stage 3 — code and clean-install validation; browser gate pending

Historical stage record. Subsequent browser/mobile results and frozen-lockfile validation supersede the pending statements below; see `tenderapps-stage3-checkpoint.md` for current checkpoint disposition.

Date: 2026-09-14. Base 8f1c0556e72aa41ad3542cee6e25fae2418fc0c6; fetched canonical d230590cf5ee99a679f162b2e3a19b65752c0f16. Isolated worktree remains C:/CodexWork/tenderapps-boundaries-stage1. No deployment or cutover.

## Completed

- Extracted app typecheck: passes, no suppression of diagnostics.
- Existing regression/simulation suites, extraction checks, boundary checks and copied regression replay: 99 tests pass.
- The regression replay redirects dynamic implementation imports to apps/tender-logistics; source-text assertions retained from the baseline suite still inspect the old app. Separate extraction checks permit only the explicitly reviewed changes listed below and reject unrelated drift.
- Extracted Vite production build passes with the product-import guard enabled.
- Fresh npm installation in C:/CodexWork/tender-logistics-clean-install: 134 packages installed with scripts disabled, without legacy node_modules junctions. Only extracted app source, Logistics domain and shared design tokens were copied into a validation layout. Typecheck and production build pass there too.
- Clean build emitted matching main JS/CSS filenames and reported sizes. This is not a claim of complete binary-equivalent manifests or frozen-pnpm reproducibility: clean install used the declared exact direct dependencies and independently resolved transitive versions through npm, producing a separate package-lock.json in the validation directory only.

## Reviewed repairs

| Failure | Cause | Correction | Regression protection |
|---|---|---|---|
| Possibly undefined amountLine | Type narrowing through optional value did not narrow its parent | Explicit guard before dereference | Original/extracted semantic quotation regression replay |
| lot scope rejected by types | Existing runtime extractor emits lot; physical model union omitted it | Add lot to DocumentPhysicalEvidence.scope in shared domain types | Existing packing/evidence regressions; no runtime logic change |
| Excel row argument types | ExcelJS declaration and runtime row shape differ | Explicit Number conversion | Excel export regression replay |
| forceFullCalc undeclared | ExcelJS 4.4.0 serializer only writes fullCalcOnLoad, ignoring forceFullCalc | Remove ineffective assignment; retain fullCalcOnLoad | Export formulas and workbook regressions |
| orderNo undeclared | ExcelJS runtime sorts by orderNo but public interface omits it | Narrow documented Worksheet intersection for this existing runtime property | Workbook worksheet-order/export regression |
| Legacy sourceNamedPlace access | CalculationResult does not declare historical optional field | Narrow optional compatibility intersection at existing fallback | Existing saved-case fallback retained; browser reopen still pending |

Only extracted UI files and one shared type union were changed for these repairs. Original TenderApps runtime files remain unchanged; the type union has no emitted runtime effect. The Stage 2 byte-parity check now encodes these exact reviewed transformations rather than allowing arbitrary deviations.

## Outstanding gates

Browser validation has NOT been performed. Tender Logistics has no approved Localhost Manager registration yet; this task did not invent a port, start an unmanaged server or repoint the existing TenderApps entry. Registration and preview launch need explicit approval before continuing browser verification.

Proposed next scope: register Tender Logistics as its own controller-managed development app, retain current TenderApps registration and lifecycle, start only the new app, and test welcome/intake/results/cases, save/reload, Excel download, supported deep links, responsive widths and console/network errors using synthetic data. No real financial cases, origin migration, production deployment or Balance/Match extraction.

Large ExcelJS chunk warning remains; dependency installer emitted upstream deprecation warnings. No dependency upgrades were attempted. Browser data exports, off-device backup and database recovery remain unverified. No cutover is safe based solely on these green code/build checks.

Stage 3 remains PARTIAL until browser validation is completed. All changes remain local and uncommitted.
