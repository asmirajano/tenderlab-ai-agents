# Stage 1 — dependency contract, not application extraction

Prepared 2026-09-14 in an isolated detached worktree at 8f1c0556e72aa41ad3542cee6e25fae2418fc0c6, one Logistics correction beyond canonical d230590cf5ee99a679f162b2e3a19b65752c0f16. This is a working checkpoint, not a release or deployment. New Balance and Match branches have not been merged or replaced.

## Implemented boundary

`docs/product-boundaries.json` declares three domain roots. Every TS/JS domain module is checked, not only the package index. A domain's local imports must stay inside its own source root. External libraries must be declared. Logistics UI dependencies are traversed transitively from its entry; only the named helpers and Logistics domain are allowed. Dynamic nonliteral imports fail closed for review. TypeScript's parser handles imports, type imports, reexports, import-equals, dynamic imports and require calls; comments are not mistaken for dependencies.

Run `node --test tests/product-boundaries.test.mjs` for enforcement and mutation checks. Run `node scripts/check-product-boundaries.mjs` for the edge inventory. The test follows the repository's existing tests/*.test.mjs convention; no CI/deploy workflow changed.

## Product and shared-code ownership

| Owner | Contract |
|---|---|
| Logistics domain | packages/logistics-costing/src/index.ts is its current public barrel; preserve business types, evidence distinctions and calculation behavior |
| Logistics UI | Costing app/styles, document/semantic extraction, calculation Excel export and logistics-cost assets are product-owned |
| Shared UI candidates | TrialNotice, AgentRoleCallout and PracticalAgentOverview may be shared only while free of sibling business imports |
| Balance | Keep financial parsing, OCR, FX, forms, data and tests together; reconcile parallel changes before extraction |
| Match | Keep matching/retrieval contracts, snapshot data and backend edition boundaries together; development services are not implicitly production |
| Shared catalog | Canonical product IDs and metadata remain owned by the existing catalog, not duplicated into each product |

No package export rewrites, files moved, product app roots, runtime changes or server launches were made. Deep relative imports are retained for compatibility until extraction. Domain public entry points and named helpers are the initial boundary, not a claim that workspace package encapsulation is finished.

## Guard limits

This is a source-import boundary check, not complete bundler/runtime isolation. CSS @imports/selectors, URL-referenced assets, fetch/data flows, eval/custom loaders, deployment composition and browser storage are not verified by this guard. CSS files are allowed as explicit leaves. Unknown path aliases and new external dependencies fail until reviewed in the contract; do not broaden the allowlist just to silence a failure.

## Validation

- Existing Logistics engine/simulation suites: 50 passed, 0 failed on Node 24.19.0.
- New dependency guard tests: 4 passed, 0 failed, including missing-helper and undeclared-external rejection.
- Tests used synthetic existing fixtures and existing dependency installations via node_modules junctions. This is not clean-install reproducibility evidence.
- No full production build, browser replay, database test or deployment was performed. App source/runtime was not edited.

## Recovery and next gate

Local recovery: C:/CodexBackups/tenderapps-stage1-20260914. Bundle verified and restored into a separate mirror; all 31 recorded commits were found. Copies of 99 artifact files and 13 dirty tracked/relevant untracked source files were hash-verified. Recovery manifest records paths and limitations. No off-device recovery, browser-state export or DB restore has been demonstrated.

Next is Stage 2, copy/extract Logistics in isolation, only after separate approval. Keep existing TenderApps executable and public origin unchanged. Validate equivalent calculations, saved cases, documents, exports, CSS and assets before any routing/localhost/deploy change. Independent localhost registrations and deployment remain separately gated.
