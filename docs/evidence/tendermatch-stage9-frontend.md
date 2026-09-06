# Stage 9 local frontend evidence

## Authority and unchanged boundaries

Selected base: `ae466ae3f15b5e7eddf1a8dfab96b2d847321c4f` on
`codex/tendermatch-neon-all-to-all`, worktree
`C:/CodexWork/tendermatch-neon-all-to-all`. Initial clean preflight and final
fetch/prune both resolved origin/main to
`d230590cf5ee99a679f162b2e3a19b65752c0f16`; selected base is ahead 14/behind 0,
with no upstream. Relevant retrieval-ranking, business, enterprise, current release
and older reconciled worktrees were inspected and preserved, not merged or reset.
The current selected branch descends from the authoritative deployed source.

Read-only live asset reconciliation of `https://tenderapps-ai.web.app` matched the
clean `C:/CodexRelease/tendermatch-d230590` build exactly:

| Asset | Bytes | SHA-256 |
| --- | ---: | --- |
| index-B47XFTdH.js | 1,340,475 | 97cc8072376e0d8a29ae32b87b3d22401676ee4b1c39bfe48ccddefb927a2b63 |
| index-CugebHFU.css | 301,329 | 13c15e609c9b32b06eb128c1eac7f7f949085b1a555b700e44608ff9a30293f3 |

No deployment occurred. Stage 9 is a local checkpoint, not the live release.
Owner remains `agent:TL-A031`. Formula/eligibility/ranking/shortlist/escalation data,
prior Stage 3–8 code and migration 100 are untouched. There are **no new SQL files,
schema changes, Neon connections, source connections or model calls**. Stage 7
owner installation and sealed-plan persistence remain pending at this checkpoint.

The scoring-governor skill preserved fixed-denominator/missingness/authority
separation. Release reconciliation selected the correct UI lineage; real-Agent
development governance required empirical browser/HTTP/PostgreSQL correction and
replay; dashboard guidance shaped explicit scope, bounded data and responsive
detail. No alternate Overview, registry or product identity was introduced.

## Implemented and preserved surfaces

The explicit `mode=all-to-all-dev` branch lazy-loads the new UI before the legacy
runtime can mount. New browser-only transport, scoped stylesheet and component
provide supplier/tender ranked cursor pages, exact selected original pair detail,
explicit attributed review/report/audit intents and existing request/job status.
No silent static fallback, full-universe endpoint, bulk traversal, human write,
grant/job creation, TORS generation, provider or browser-to-DB import exists.

Only two existing source files change: a small lazy-mode wrapper in
`tendermatch-app.tsx` and exact conditional development status wiring in `main.tsx`.
The previous function body and normal-route shell status are retained. All other
files are additive. The source hash guard locks the Overview segment, Formula view
and contract, complete original TenderMatch/shared styles, and other TenderApps
pages. Main's hash is checked after removing only the two exact permitted status
wiring edits; any other shared-shell change fails the guard.

Actual browser comparison serves the verified release build and the new build
separately on loopback, then explicitly opens the unchanged reference routes.
Overview and Formula DOM text, shell status and section/heading geometry match
exactly. Their comparison hashes are respectively
`95b594e271ee45f7e2cc75aabd285fd7b56d30a27f4cebc1c408028c4bc2e489` and
`ea6972c1f4e97670749b03a23329a4844a4dfe2be6bc704ccce223fa77bee3cb`.
The original 301,329-byte CSS asset still has exactly the live release hash.

The preserved Formula page retains an older explanation of outside-scope display
zero. This authorized preservation is not propagated into the new data contract:
the new UI explicitly says the sealed original outside-scope outcomes are
unscored/null. It never treats Missing as incompatibility or declares an automatic
Match/Non-match. All five metrics, shortlist, escalation, human disposition and
execution authority stay visible and separate. Audit-only remains non-promising.

## Actual browser and local database evidence

`tendermatch-stage9-browser.json` binds nine final source/test/harness files and ten
screenshots with SHA-256. Reproducible audit command:
`node scripts/audit-tendermatch-stage9-browser.mjs`, with the explicitly installed
PGlite/Playwright runtimes and verified baseline dist as documented in the runbook.
Browser: headless installed Edge 152.0.4191.66. This is the production-built UI
calling the actual unchanged Stage 8 service over HTTP, not a fake fetch-only UI.

Synthetic 6-supplier × 40-tender projections were processed through the unchanged
Stage 3–7 algorithms and actual SQL into an ephemeral PGlite database: **240
original outcomes, 182 candidates, 58 unscored outcomes and 112 shortlist rows**.
Supplier traversal returned 36 unique candidates in pages of 25 and 11; tender
focus returned 5. Empty, scope-not-demonstrated, outside-scope, zero-scored and
missing-evidence cases are explicit. These are fixtures, not the sealed Neon
707,660-candidate population. No real all-to-all records were fetched or changed.

The final audit passes **23 checks**: initial binding, bounded pagination,
Back/Forward, selected detail and focus, all three intents, lost-successful-POST
retry/reuse, zero and Missing confidence, outside/nonrequestable, audit-only,
responsive/label/keyboard/touch/header clearance at 1920/1280/1024/390 px, empty
focus, stale cursor recovery, obsolete-response cancellation, API 503, eight-second
timeout, missing authenticated bootstrap, actual absent Stage 7 schema, preserved
Overview/Formula DOM and no full-universe/static fetch in development mode.

The review POST was actually persisted locally, its response deliberately replaced
with a 503, and the UI froze content before retrying the same idempotency key. The
second response reused the same immutable intent. Report and audit intents also
recorded without grants/jobs/results. Final local execution authorization, job and
artifact counts were **0 / 0 / 0**. Actual external model calls/tokens/cost were
**0 / 0 / 0**, not synthetic TORS completions. Local data disappeared on closure.

Ten screenshot artifacts cover initial desktop, selected desktop/mobile, four
responsive widths, unavailable state and both protected reference pages. The
desktop-selected, mobile-ranked and mobile-selected images were visually inspected;
the correction ledger below records issues that were found beyond simple overflow
assertions. Zero browser JavaScript exceptions occurred. No credential was written
to browser storage, URLs, screenshots, logs or checked-in evidence. The existing
unrelated `tenderapps:layout-mode` preference is retained.

## Bounds, timing and storage

| Observed local metric | Result |
| --- | ---: |
| Actual API requests in healthy fixture audit | 47 |
| Ranked page requests | 21 |
| Largest API JSON response | 43,348 bytes |
| Local page latency minimum / median / p95 / maximum | 62.40 / 77.45 / 81.30 / 82.97 ms |
| First 25-row production-build ready time | 613.74 ms |
| Browser used JS heap, 25-row page | 6,424,759 bytes |
| Browser used JS heap, page plus selected detail | 8,844,515 bytes |
| DOM elements, page / page plus detail | 472 / 579 |
| Largest DB rowset, including fixture construction | 81,929 bytes |

These are actual single-machine local fixture observations, not network/cold-Neon
SLOs or full-population memory claims. The test process holding three independent
WASM database fixtures ended at ~1.19 GB RSS, predominantly fixture allocation;
that is not browser or production-service RSS. Browser heap observations are
approximate and garbage-collector dependent. No matrix is retained in UI state.

Transport caps remain 25 UI rows (100 API maximum), 524,288 response bytes, 8,192
intent-body bytes and an eight-second deadline. No page prefetch exists; selected
pair loads separately. The service's signed version/focus cursors, fixed query
projection, existing ranking indexes, correlated bounded Formula lookups and
selected-only evidence queries remain unchanged. Stage 8's natural EXPLAIN/BUFFERS
evidence remains applicable source evidence; no new Neon query plan or size is
claimed. UI integration adds no table/index or permanent server-side storage.

Build output: lazy all-to-all JS **31,584 bytes** (10.58 kB gzip), scoped CSS
**7,913 bytes** (2.22 kB gzip). Existing main JS is 1,341,279 bytes, **804 bytes**
larger than the live baseline due to mode/status/chunk wiring; the existing shared
CSS is byte-identical. Existing application code still ships in the main bundle,
but its legacy runtime is not mounted in development mode. No full all-to-all
matrix is embedded or fetched. Large existing bundle warnings are not hidden.

## Correction ledger

| Observation | Cause | Correction and regression |
| --- | --- | --- |
| Strict TS rejected unknown errors as renderable nodes. | Error state was not narrowed. | Explicit Boolean error guards; strict compile and browser paths pass. |
| Hooks lint rejected synchronous effect resets. | Resource state/loading identity was coupled to effects. | Keyed async resource state, derived loading and abort cleanup; late supplier response cannot replace tender focus. |
| Initial validator rejected valid Formula rows. | Display label was confused with stored engine version. | Pin exact `tendermatch-match-formula/1.1.0`; compare browser constant with actual engine constant. |
| Tight validation rejected valid no-evidence detail. | Criterion confidence can be null even when aggregate diagnostic confidence is stored zero. | Preserve nullable criterion confidence and render Missing; actual zero-evidence HTTP/browser test. |
| Browser-storage assertion found one key. | Shared shell intentionally persists layout preference. | Check for absence of session/CSRF secrets and all-to-all storage; preserve unrelated preference. |
| Initial screenshots showed fixed-header overlap and legacy status. | New workspace lacked existing shell clearance; shared header used old snapshot status. | Scoped responsive padding/scroll-margin, explicit detail focus scroll and dev-only status text; browser overlap and unchanged legacy status guards. |

## Validation and next gate

Final full-suite, lint, strict-TS and Git results are recorded in
`tendermatch-stage9-validation.json`. Full `npm test -- --runInBand` passed
**612/612 tests, zero failures/skips**, with all applicable Stage 4–9 evidence flags
and isolated PGlite enabled. Node test time was 52,150.3615 ms, excluding builds.
All three builds passed and generated 64 Agent Specifications. Full lint, scoped
lint, strict frontend TypeScript and staged whitespace checks passed. Existing
large-chunk, vinext CSS filename-conflict, route-classification and plugin-timing
warnings remain nonfatal. The focused suite verifies API contract,
source preservation, token/session/injection/timeout/payload behavior, actual
HTTP/PostgreSQL list/detail parity, idempotency/audit restrictions and missing-schema
failure. The separate evidence test verifies final source and screenshot hashes.

The next gate is not a frontend deployment: Stage 7 migration 100 and exact sealed
plan still require orchestrator-controlled completion, then real development API
binding/auth/latency verification. `docs/tendermatch-stage9-frontend.md` defines the
smallest separate server runtime and outstanding auth/TLS/revocation/role decisions.
No credentials or provider were invented; off-loopback use deliberately remains
unavailable. Human-disposition write/source and entity-name catalogue are future
contracts. No push, merge, deployment, publication, source writes or Neon activity.
