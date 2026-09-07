# Stage 9 — authenticated hosted development frontend

Stage-approved base: `f99c942e2c1fa9e90972bf29e819d546fa44b1ba`.
Worktree: `C:/CodexWork/tendermatch-neon-all-to-all`; branch
`codex/tendermatch-neon-all-to-all`. Fresh all-remote fetch/prune confirmed
`origin/main` at `d230590cf5ee99a679f162b2e3a19b65752c0f16` (18 ahead / 0 behind
before this checkpoint). No upstream, push or merge. Parallel worktrees preserved.

This is the separately approved hosted continuation of the existing `ddf2ab2`
Stage 9 UI. Earlier Stage 9 synthetic and Stage 8 deployment-2 evidence remains
historical and byte-for-byte retained. It is not reused as hosted-browser proof.

## Working path and exact identity

Local production-built preview:
`http://127.0.0.1:4189/tendermatch?mode=all-to-all-dev`.

The actual browser calls the development Neon Function directly over HTTPS:
`https://br-polished-boat-b1qddx0m-tendermatchstage8.compute.c-5.eu-central-1.aws.neon.tech`.
No local API proxy or database connection is present in the frontend server.
Development deployment **3**, Node 24, is active; hosted code hash:
`aabb1a3a7732c4d93b4ab6df115164899beabab35b768113737fd78de4194e53`.
Exact binding:
`26e1bab78a38d8d520d59563e702bc4540405213f39cbb7b40a49ecbb03a4080`.

Only project `dry-union-87553313`, development branch `br-polished-boat-b1qddx0m`,
database `tendermatch_results_dev`, Function `tendermatchstage8` was updated.
The backend update adds only the approved local CORS/browser-session contract.
The 24 pinned security-barrier views, restricted reader role (connection cap 3),
SQL, signed cursors, query/response bounds, Formula and ranking policies are unchanged.

Owner remains `agent:TL-A031`; practical order remains 03. Canonical registry,
production Overview/Formula, other TenderApps pages, Firebase configuration and
original standalone TenderBoost are unchanged. Nothing was pushed or released to
Firebase/production. This does not authorize Stage 10 or a production release.

## Audience, session, CORS and credential boundary

- Explicit operator-provisioned **development reader**, not production user login,
  multi-user IAM, tenant enrollment, durable approval or browser-local Case storage.
- Exact origin `http://127.0.0.1:4189`, audience
  `tendermatch-stage9-development-readonly`, read-only scopes and exact sealed binding.
- Browser session lasts at most one hour, held only in memory. The current session
  expires **2026-09-07 14:36:50 UTC / 19:36:50 Tashkent**. No automatic refresh or issuer.
  Expiry clears visible results, aborts pending component work and drops connection
  references. Transport also rejects results arriving after expiry.
- The loopback operator server injects session JSON only into the explicitly selected
  development HTML, omits it after expiry, and the UI removes the bootstrap element.
  This is session delivery, not a public authentication service. Other trusted local
  OS processes can access a running loopback server: do not claim per-user isolation
  from other accounts/processes on the same computer.
- Strict Host, Origin and fetch-metadata checks, no-store, no-referrer, DENY framing,
  same-origin resource policy and a local-only CSP restrict session delivery.
  The production Firebase CSP is untouched. The only new local connect-src is the
  exact development Function. The API requires bearer plus origin/audience, never cookies.
- Preflight permits GET only, exactly Authorization and X-TenderMatch-Audience, on
  known read routes; it returns no data and does not authenticate/acquire the DB.
  No wildcard/credentials CORS. Actual reads still require the short-lived session,
  tenant and full binding. Wrong origin/audience/tenant/binding/cursor fail closed.
- Database URLs/passwords, cursor key and project API key never enter the browser.
  Existing project-scoped encrypted deployment key and reader credential are reused.
  Short-lived operator test sessions are encrypted in CurrentUser DPAPI outside Git;
  browser/API logs and evidence contain no tokens, CSRF values or response bodies.
  The inherited fixture CSRF field is transient and unused by the hosted GET-only client.

## Bounded UI and truthful semantics

Reuse the existing lazy-loaded UI, 25-row directional pages, Next/First/history,
explicit focus UUID and one on-demand pair detail. API maximum remains 100; eight-second
browser request deadline and 512 KiB decoded body cap remain. No prefetch, exhaustive
traversal, full matrix, entity-name catalogue or static 17 × 60 fallback is added.
Shared legacy frontend code remains in the existing application bundle, but its
runtime/data loaders are not mounted as an all-to-all error fallback.

Formula v1.1 Pair Score, Data Coverage, assessed-only Fit, Evidence Confidence,
Retrieval Relevance, eligibility/scope, shortlist, escalation metadata, AI/TORS status
and Human Disposition remain visibly distinct. Missing criterion Fit is unknown/null,
not measured 0. Outside scope is null/unscored. No Match/Non-match, Bid/No-Bid or
human disposition is inferred. Scored detail retains all five criteria and evidence
references. Canonical UUIDs are shown because the sealed service has no name catalogue.

Hosted detail has **no intent form**. Review/report/audit requests, Human Disposition
writes, jobs, artifacts, AI/TORS and all execution actions are unavailable; both client
and host refuse write paths. The old synthetic local fixture retains its explicitly
synthetic intent tests; this grants no hosted write authority.

The optional collapsed development observations panel stores only the last 50 safe
request records in memory (path without query, status, bytes, duration, approximate
browser heap), plus total request count and maximum response size. No body, token,
binding, cursor, persistent telemetry or external analytics are recorded.

## Validation and real-browser evidence

- Full repository suite: **643 passed, one unrelated missing MF291 PDF skip** with
  `node --test --test-concurrency=1 tests/*.test.mjs` and all retained/new evidence
  flags enabled; see final checkpoint evidence for exact counts.
- Full lint, strict TenderMatch and hosted TypeScript, three production builds and
  64 generated specification projections pass. The unchanged full-app TypeScript
  baseline still has 24 errors in TenderBalance/Logistics-related files.
- An additional concurrent full run hit the unchanged Stage 7 10ms synthetic lease
  test (`Invalid active lease transition`, subtest plus parent reported as two
  failures). This timing-sensitive baseline was retained, not weakened or silently
  skipped. Final full verification is serial, after builds/lint/typecheck finish.
  The failed run remains in ignored `build/stage9-parallel-validation.log`.
- Real API audit: 24 explicit requests plus four calls through the actual frontend
  transport/parser (**28 total**), exact code/binding, auth/expiry, GET-only CORS,
  tenant, wrong origin/audience, bounds, signed cursors, both focuses, scored and
  outside detail, disabled intent/human/AI/artifact/full-matrix routes.
- Actual in-app browser: supplier and tender pages, 25-row continuation without
  duplicates, First and Back/Forward, keyboard detail focus, five separate metrics,
  missing evidence disclosure, outside unscored, invalid cursor/retry/reset, automatic
  controlled client expiry, real-host expired-token rejection, expired reload and
  ordinary session restoration. Overview/Formula routes explicitly exit dev mode.
- Standard 1280×720 and 1440×900, Wide 1920×1080, tablet 1024×768 and mobile 390×844:
  zero page-level overflow, 44px minimum action height, readable stacked detail and
  no happy-path console errors. Native screenshots are retained in this task; the
  committed browser JSON is a compact observation ledger, not an image archive.

Development observations, **not SLA/load/cold-start evidence**: first browser health
325 ms plus first page 417 ms; 19 retained unique browser request observations,
maximum decoded API payload 42,265 bytes, approximate JS heap 14,083,314–27,284,714
bytes across reloads. Separate API samples: 207–3,870 ms, median 357 ms, maximum
158,806 bytes at the larger API page. No forced-GC/leak/saturation test is claimed.
Initial rollout and negative-test traffic are not hidden inside a happy-path SLA.

Independent readback retains **2,027,961 outcomes**, **707,660 scored pairs**,
**28,034 shortlist decisions**, one plan and **500 existing requests**; zero grants,
jobs, artifacts and events. No source/result/Human Disposition writes, model/TORS
calls, refresh, recalculation or new intent execution occurred.

## Failure/correction ledger

| What happened | Failure layer / cause | Correction / reusable rule | Regression evidence |
| --- | --- | --- | --- |
| Browser preflight initially returned deployment-2 hash while an authenticated GET returned deployment-3 hash. | Runtime rollout/version propagation mismatch observed; provider cache/isolate internals not proven. | Kept auth/CORS checks intact; refused completion until OPTIONS and GET agreed, then used explicit retry. Metadata status alone is not release parity. | Subsequent exact-hash API probes and actual browser recovery. |
| The inherited development detail described a recordable intent even though the hosted service is read-only. | Capability/UI mismatch. | Hosted session renders unavailable AI/write boundary instead of synthetic intent form; transport refuses intents/status before network. Preserve the synthetic harness separately. | Unit denial, real 405/404 probes and zero browser intent forms. |
| A successful response could finish after the client session deadline. | Transport lifecycle gap. | Check expiry after body read as well as at admission; clear result/connection and abort UI resources on expiry. | Injected-clock in-flight regression, actual browser 20-second controlled expiry and real-host expired seed. |
| A single large JSON diagnostic line could overflow narrow layouts. | Diagnostic presentation. | Scoped pre-wrap/anywhere rule only in isolated development styles. | Mobile zero-overflow observation. |

## Reproduce, limitations and rollback

Use the existing approved operator vault, never create a broader key. Build the
Function with `scripts/build-tendermatch-stage8-function.mjs` and the frontend with
`npm run build:tender-apps`. The separately authorized dev deploy command is
`node scripts/tendermatch-stage9-hosted-deploy.mjs --deploy-approved`; it rotates
only short-lived browser test seeds/adds the exact origin and changes no DB grants.
Do not run it merely to inspect status. Run the preview with
`node scripts/serve-tendermatch-stage9-hosted.mjs --hosted-readonly-approved`.
The session pointer under ignored `build/tendermatch-stage9/` has only a vault name,
code identity and expiry. It is not a credential or deployable frontend config.

API regression: `node scripts/audit-tendermatch-stage9-hosted-api.mjs`.
Read-only final seal/build reconciliation:
`node scripts/verify-tendermatch-stage9-checkpoint.mjs`.
Fresh hosted evidence test uses `TENDERMATCH_STAGE9_HOSTED_EVIDENCE=1`; older evidence
flags test their explicitly historical artifacts, not a new live claim.

Maturity: **controlled development read-only pilot**, not production/enterprise
runtime. Unimplemented: real user login/renewal/revocation, tenant onboarding,
distributed rate limiting, durable security telemetry, client release, source/name
lookup and write/AI workflows. Existing Neon compute billing continues; no new
purchase, billing change, zero-hosting-cost or spending cap is claimed.

Rollback: stop only this task's 4189 preview; production is unaffected. Under bounded
rollback authority, redeploy the preserved Stage 8 deployment-2 sources/config with
empty browser origins or revoke only these browser seeds. Do not alter sealed tables,
restricted role/views, original app, project key, production branch or Firebase.
No rollback, push, merge or production release was performed here. Stop at this
local checkpoint and request review before any next stage.

Evidence: [deployment](evidence/tendermatch-stage9-hosted-deployment.json),
[API probes](evidence/tendermatch-stage9-hosted-api.json),
[browser](evidence/tendermatch-stage9-hosted-browser.json),
[regression observations](evidence/tendermatch-stage9-hosted-observations.json),
[exact source/build/checkpoint ledger](evidence/tendermatch-stage9-hosted-checkpoint.json).
