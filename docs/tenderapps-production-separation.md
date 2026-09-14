# Same-origin production separation

Historical public-release procedure. Since the approved shared-access cutover, use `docs/tenderapps-access-layer.md` and the controlled `scope=tenderapps` workflow. Do not execute the old public Hosting fallback or old public rollback below: they would bypass protected delivery. Independent builds still share one serialized Hosting/gateway release unit.

TenderBalance, Tender Logistics and TenderMatch have independent source entries, builds and asset namespaces. Production preserves the existing tenderapps-ai.web.app origin and routes, so browser case storage stays in place. No database or browser-storage migration is performed.

`npm run build:tender-apps` builds the retained catalog/compatibility shell and all three independent products, then runs the collision-rejecting composer. `dist/tenderapps-production/tenderapps-release.json` identifies the exact source commit and entry/asset hashes for each product. Same-path public files must be byte-identical. Credentials, source maps and hidden files are excluded. All old catalog/public asset routes remain available.

`firebase.tenderapps.json` contains only the TenderApps Hosting target. Its definition must match the corresponding target in firebase.json. Route rewrites select /__apps/balance.html, /__apps/logistics.html and /__apps/match.html. Their JavaScript and CSS reside under separate /assets/balance, /assets/logistics and /assets/match directories.

This is one serialized Firebase site-wide release. Independent builds do not mean three independently atomic cloud deployments. Never publish one product output directly over the shared site. Recompose and verify sibling artifacts for every release.

## Release

The validated release runtime is Node24.19.0 with pnpm11.19.0. CI uses that exact Node version: the former22.13.0 runner failed three Stage10 SQLite statement-lifetime tests that pass under the validated runtime. No tests are skipped to work around that runtime difference.

Run lockfile-consistent install, lint, all tests/build, product typechecks and the composition tests. Preserve the previous Hosting version and Git checkpoint. Fetch/reconcile origin/main immediately before promotion. The existing GitHub workflow runs its full test gate; a push commit tagged `[tenderapps-only]` deploys only TenderApps and skips the four unrelated/legacy deployment steps. Untagged pushes retain the prior all-target behavior. Manual dispatch supports scope=tenderapps or all. This tag does not skip tests.

The scoped manual fallback is `firebase deploy --project tenderlab-ai-agents --config firebase.tenderapps.json --only hosting:tender-apps`, after equivalent checks. Report manual fallback separately from CI success. Never deploy Functions, Firestore rules or other targets as part of this release.

After release, fetch the release manifest, verify each HTML and entry JS/CSS hash, check direct route refresh/aliases and representative UI behavior, and verify unchanged CSP/security headers. Match's production mode is static-pinned-snapshot, not the temporary authenticated Neon development reader. Its local session exchange is not a production endpoint or durable login.

## Rollback

The pre-separation unified deployment was Firebase version5376d562dc81fda5 (release1789381329540000) from source56c22f49b5e176ef5e428c91b7424593a069f03a. Retain that version: a Hosting rollback to it restores the prior complete site, including its routing. Do not delete it. Alternatively rebuild that exact Git checkpoint with its original firebase.json and publish only hosting:tender-apps. Never combine the old artifact with the new rewrite config.

Rollback does not erase browser cases, rename storage keys or migrate data. Preserve the origin. No cleanup or deletion of the old product implementations is part of this release.

## Historical regression baselines

The older Stage9 tests froze sibling UI before subsequently approved Balance/Logistics changes. Their reviewed UI baseline is now the already deployed56c22f4 checkpoint; Formula content and backend query/view/role/cursor protections keep their original baselines. Firebase changes are checked semantically: only TenderApps changes, all other resources remain identical. New composition tests require separate hashed entries, preserve public snapshot/OCR bytes and reject credential artifacts.
