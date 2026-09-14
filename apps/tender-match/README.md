# TenderMatch — independent local frontend

Controller identity: `tender-match`, permanent address `http://127.0.0.1:6210/`.
Use `C:\Users\Cowork 2\.codex\bin\codex-localhost.cmd start tender-match`,
`stop tender-match`, `restart tender-match`, or `open tender-match`.
Do not use historical 4189 launch recipes or start a second server.

Build: `pnpm --dir apps/tender-match build`. Typecheck: `pnpm --dir apps/tender-match typecheck`.
Install from the workspace root with the committed frozen pnpm lockfile.
The app owns its entry, package, public files and build. Its domain stays in
`packages/tendermatch`; only design tokens remain a shared package dependency.
No import from the old TenderApps, Balance or Logistics app is required.
No production deployment configuration has been created or changed.

## Data and authenticated mode

Normal routes retain the explicit 1 September 2026 pinned snapshot: 17 suppliers,
60 tenders, bounded pair review and Formula. This is not a live Neon data view.
All 86 public data/map/illustration files are unchanged copies of the selected source.
Browser Case keys are preserved, but browser storage is origin-scoped: existing
Cases at port 4174 remain there and are NOT copied to port 6210.

`/tendermatch?mode=all-to-all-dev` retains the newer authenticated development UI.
Without an authorized session it fails closed and does not load the static matrix.
The existing backend/browser contract was historically pinned to origin 4189;
this approved development stage adapts the same contract to the registered
6210 controller origin without changing its audience, binding, scopes, or
read-only limits. The controller-managed `/__tendermatch/session` exchange keeps
the short-lived credential out of HTML, URLs, persistent browser storage, and
logs. Do not weaken the origin check, inject old tokens, provision
new credentials, change grants/schema, or use a second server.

## Checkpoint and rollback

See `docs/tenderapps-stage5-match.md`. Canonical controller state is authoritative
for the selected commit; `docs/match-localhost.json` records initial registration.
Stop only `tender-match` to roll back local exposure. The original TenderApps and
the independent Balance/Logistics registrations still use their previous sources.
No old code, database, public deployment or saved Case was removed or migrated.
