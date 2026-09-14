# Stage 2 — Logistics copy/extraction

Date: 2026-09-14. Worktree: C:/CodexWork/tenderapps-boundaries-stage1. Base HEAD: 8f1c0556e72aa41ad3542cee6e25fae2418fc0c6; freshly fetched canonical origin/main remains d230590cf5ee99a679f162b2e3a19b65752c0f16. Stage 1 files preserved. No Balance/Match development work was merged or overwritten.

## Implemented

- New apps/tender-logistics application entry, HTML, package and type-check configuration.
- Separate Vite output with assets/logistics namespace and build manifest.
- Build-time module guard rejects imports from apps/tender-apps, packages/tender-balance, packages/tendermatch and Tesseract.
- Exact copies of Logistics implementation, local helper modules, shell/layout/preload code and CSS. One Logistics illustration copied byte-for-byte. No old source files removed or edited.
- Logistics domain package and shared design tokens remain shared by reference in the repository.
- Only the new entry/header is different: Logistics-only navigation, explicit undeployed extraction status, public Catalog link, supported Logistics paths and unknown-path fallback.
- Added workspace lockfile importer using only already-resolved versions. All ten dependency specifications and snapshot references were parsed and verified. No existing importer or package resolution changed.

## Validation results

| Check | Result |
|---|---|
| Separate production build | PASS; module boundary guard passed |
| Logistics regression/simulation + Stage 1 guard + extraction tests | 58 passed, 0 failed |
| Source/helper parity | All 13 copied source/style files match original files exactly |
| Illustration and storage key | Byte/content parity checks passed |
| New entry/config/test lint | PASS |
| Diff whitespace | PASS |
| Independent TypeScript check | FAIL: ten inherited diagnostics reproduced against original Logistics files |
| Clean installation | Not proven; build/tests used existing dependency installation through junctions |
| Browser UX/CSS/deep-link/save/reload validation | Not performed; no server registered or launched |
| Full legacy production build / full repository regression | Not run in this stage; old runtime files unchanged |

Build output: initial JS approximately 462.32 kB, CSS 120.19 kB, dynamically loaded PDF/XLSX/ExcelJS plus PDF worker. ExcelJS remains a large chunk; build warning retained rather than suppressed. No OCR runtime or sibling product asset set was copied.

Lockfile generation via pnpm --lockfile-only --offline unexpectedly performed supply-chain registry checks and was cancelled. The new importer was then added with existing exact resolutions and structurally verified. This does not claim a completed package-manager frozen-install check.

## Inherited type-check failures — not silently repaired

- document-semantic-extraction.ts: possibly undefined amountLine (three diagnostics); physical evidence scope includes lot but declared model excludes it (two).
- logistics-calculation-excel.ts: row arguments have incompatible types (two); forceFullCalc and orderNo not declared by ExcelJS types (two).
- logistics-costing-app.tsx: sourceNamedPlace absent from CalculationResult (one).

The same ten diagnostics occur in original files under the same focused compiler options. They are not introduced by copying, but remain real acceptance blockers. No type suppression, business correction or model change was made to hide them.

## Limits and recovery

This is independent build packaging, not independent production hosting or proven visual isolation. Copied client-shell CSS still contains legacy sibling selectors and variables; they are retained for parity, not asserted to be a minimal shared stylesheet. Rendering, CSS-order effects, assets and saved-state behavior require Stage 3 validation.

The case key remains tenderapps.landed-cost.saved-cases.v1. No browser data was read/copied and no database accessed. This task did not change public origin, Firebase, CI, routes, localhost registrations or desired running states. The global registry changed externally during this work; the TenderApps registration still matches the recorded baseline. No unrelated registry change was reverted.

Recovery remains C:/CodexBackups/tenderapps-stage1-20260914. Old app remains available unchanged; no cutover to roll back. All changes remain local and uncommitted. No automatic removal of the extraction directory or old assets is authorized.

## Next gate

Stage 3: resolve inherited type issues with behavior-preserving regression evidence, validate clean dependency setup and browser behavior in an approved controller-managed preview. Controller registration/launch requires its own approved step; do not bypass it for validation. Do not proceed to extracting Balance, switching routes, migrating storage or deploying until those gates pass and the next scope is approved.
