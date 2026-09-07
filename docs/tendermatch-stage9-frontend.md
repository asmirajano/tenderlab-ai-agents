# Stage 9: explicit all-to-all development UI

Historical synthetic/local design record. The separately approved real hosted
read-only connection, current session/CORS boundary and fresh evidence are in
[Stage 9 hosted integration](tendermatch-stage9-hosted.md); the intent workflow below
remains synthetic-only and is unavailable on the hosted connection.

Owner: `agent:TL-A031`. This is local interface integration, not a release or a
new scoring/shortlist policy. Start from the approved Stage 8 checkpoint
`ae466ae3f15b5e7eddf1a8dfab96b2d847321c4f`. The verified deployed UI lineage remains
`d230590cf5ee99a679f162b2e3a19b65752c0f16`; nothing was deployed here.

## Route and authority

`/tendermatch?mode=all-to-all-dev` explicitly selects the lazy-loaded new workspace.
Only a provisioned loopback development session can connect it to the exact Stage 8
same-origin `/api/tendermatch/all-to-all/v1` boundary. Without that session, schema,
marker, completed pinned plan or available API, the page reports unavailable. It
does not mount the legacy runtime, fetch its static partitions, or substitute a
17 × 60 snapshot. The normal Overview and Formula URLs remain unchanged. Links
labelled as preserved reference pages explicitly exit development mode.

An authenticated runtime must inject `tendermatch-browser-session/1.0.0` JSON in
`#tendermatch-all-to-all-session`. It contains an expiring opaque user-session token,
separate CSRF token, exact binding, server subject/scopes and initial canonical
supplier/tender IDs. It must never contain a DB password/connection string. The UI
removes this bootstrap element after capture, holds session material only in memory,
never places it in URLs/storage, refuses redirects, and uses the fixed same-origin
API path. The included loopback harness issues random one-hour fixture sessions;
it is not an identity provider or production server.

The shared shell changes only its status text when this explicit mode is selected.
All other paths retain the previous text. The existing Overview/Formula content,
layout and stylesheet are protected by source hashes and a browser comparison to
the verified release's DOM text and element geometry. No source snapshot, Formula
engine, prior Stage 3–8 module, SQL, registry or other TenderApps page is modified.

## Visible independent contracts

- Supplier-focused and tender-focused pages request exactly 25 ranked candidates;
  the server maximum stays 100. Ordering is Retrieval Relevance descending, then
  canonical opposite-entity ID, not a new combined score.
- Next/First and browser Back/Forward retain signed cursor/focus/version identity.
  No prefetch of future pages, automatic exhaustive traversal, matrix download or
  entity-catalogue download occurs. The currently exposed contract has canonical
  IDs, not authoritative display names; the UI does not invent names.
- Selected original pair detail is one bounded additional request. It displays
  exact Formula v1.1 Pair Score, Data Coverage, Assessed-only Fit, Evidence Confidence,
  Retrieval Relevance, eligibility/scope, shortlist tier, escalation reasons and
  omissions, main limitation, separate Human Disposition and execution authority.
- Five criterion contributions retain state, null fit for Missing, points/max,
  nullable criterion confidence, limitations and evidence references. At most 25
  references per criterion are rendered, with explicit total/truncation text.
- Numeric zero is rendered as `0`. Missing is unknown fit, not incompatibility.
  Outside Formula scope is null/unscored, not zero. A zero score or relevance is
  never an automatic Match/Non-match or human decision. The preserved Formula
  reference has an earlier outside-scope display-policy explanation; this workspace
  explicitly describes its own sealed-record behavior without rewriting that page.
- No compatible pinned human-disposition source exists yet: it is unavailable/null,
  not fabricated as pending, accepted or rejected. Existing/future TORS status is
  not a Formula score or human decision. Unknown usage/cost remains unknown.

## Explicit intent, not execution

USER_REVIEW, REPORT_REQUEST and AUDIT_REQUEST use only the existing Stage 8 POST
contract. Attribution comes from the authenticated server session, never browser
actor/tenant input. The UI requires justification and the appropriate scope, sends
CSRF and an opaque idempotency key, and displays receipt/reuse independently from
authorization, queue and assessment. An uncertain outcome freezes the submitted
content and reuses the same in-memory key for retry. Reload does not persist a
secret or key; the server's immutable pair/kind input identity still prevents
duplicate work. The server cap is 100 on-demand intents per plan across all users;
the existing 120-request/minute session limit and two-connection bound remain.

An audit-only pair offers only explicit Audit request, labelled non-promising and
not automatically AI-ready. An outside-scope/noncandidate original pair remains
inspectable but not requestable under the sealed Stage 7 policy. No request route
grants authorization, queues a job, invokes a model or generates an artifact.
The user may explicitly read an existing request and at most ten existing job
statuses. No automatic polling or provider execution is present.

## Bounds and failure behavior

Browser JSON is streamed under a 524,288-byte cap and an eight-second deadline;
intent JSON is at most 8,192 bytes. IDs, versions, run binding, component sums,
Missing/null semantics, ordered unique pages and receipt identity are checked.
API/session/permission/budget/stale-cursor errors have safe explicit messages.
Stale cursors offer an explicit first-page reset. Aborted/outdated focus/detail
responses cannot repopulate a new selection. Error recovery never loads legacy data.
All text is rendered through React; no server HTML is injected into detail.

The workspace uses labelled form controls, table captions/headers, live status/error
regions, visible keyboard focus, 44-pixel controls, focus transfer to detail, scoped
fixed-header clearance, internal desktop table scrolling and mobile stacked rows.
Only one page and one selected detail are retained in the component state.

## Reproduce locally

Use an already installed isolated PGlite and Playwright runtime; do not install a
provider, create database credentials, or point this harness at Neon.

```powershell
$env:TENDERMATCH_PGLITE_ROOT='<installed node_modules containing @electric-sql/pglite>'
$env:TENDERMATCH_PLAYWRIGHT_ROOT='<installed node_modules containing playwright>'
$env:TENDERMATCH_STAGE9_BASELINE_DIST='C:/CodexRelease/tendermatch-d230590/apps/tender-apps/dist'
npm run build:tender-apps
node scripts/serve-tendermatch-stage9-fixture.mjs --local-fixture
# Open the printed loopback URL. Stop with Ctrl+C; all fixture data is ephemeral.
# Or run the automated actual HTTP/PostgreSQL/browser audit:
node scripts/audit-tendermatch-stage9-browser.mjs
$env:TENDERMATCH_STAGE9_EVIDENCE='1'
node --test tests/tendermatch-stage9-frontend.test.mjs tests/tendermatch-stage9-evidence.test.mjs
```

`--missing-stage7` on the fixture server tests actual absent migration/marker tables.
All screens and evidence are labelled synthetic local PostgreSQL, not live Neon.
The local browser audit explicitly opens legacy reference routes only for protected
release comparison; those intentional routes are not an all-to-all error fallback.

## Smallest separate runtime and unresolved gates

No new migration is needed. Migration 100 and the exact Stage 7 plan must first be
installed/persisted/independently approved by the orchestrator. Then a separately
approved server-side runtime could mount the existing Stage 8 Node HTTP factory
behind a same-origin TLS reverse proxy with an authenticated short-lived session
bootstrap, a narrowly scoped results role/tenant pin, and a shared rate-limit store
if there is more than one instance. Database credentials stay exclusively on that
server. Static hosting alone cannot supply the service or authentication.

This stage does not choose/deploy that runtime, provision credentials or expose the
loopback-only UI publicly. Required gates: Stage 7 completion; owner-approved auth,
TLS/origin/session/revocation design; exact service binding; least-privilege roles;
real-development latency/query/security verification; explicit release approval.
The present browser deliberately fails closed off loopback. Removing that guard is
a future reviewed integration change, not a configuration guess. Provider/model
execution, human-disposition writes and entity catalogue/name lookup remain separate
future contracts. No source systems, Neon or model endpoints were contacted here.
