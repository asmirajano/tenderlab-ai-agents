# Stage 5 — TenderMatch independent frontend checkpoint

Date: 2026-09-14. Scope: local extraction, not production or backend cutover.

## Source authority

- Canonical remote after fetch/prune: origin/main `d230590cf5ee99a679f162b2e3a19b65752c0f16`.
- Separation/Balance base: `c5cb0a07284198bcf439006e8621a85776988559`.
- Selected newer committed Match development history: `44de97c29f3d136515940650d9b31f01bc196a45`.
- New isolated branch/worktree: `codex/tenderapps-match-extraction`,
  `C:/CodexWork/tenderapps-match-extraction`.
- Non-destructive local merge checkpoint: `00c9ada835d80c81e7cc39d28e81a0c24f8186ad`.
  Both parent histories retained. No push, branch switch in another worktree or deployment.
- Older parallel Match typography/overview branches were inspected; canonical contains
  later retrieval/Formula/table changes. They were not blindly reapplied over canonical.
  Their refs/worktrees remain intact; this is the selected combined working checkpoint,
  not a claim that every historical side branch has been merged or deployed.

## Same safeguards, different backend boundary

| Aspect | Logistics/Balance precedent | Match treatment |
| --- | --- | --- |
| Extraction | New app package and entry; original preserved | Same; 20 UI/helpers copied unchanged |
| Dependencies | Own domain plus explicit shared UI copies | Own domain and design tokens; no sibling-product imports |
| Data | Preserve original sources and browser records | 86 public files (13,441,472 bytes) copied exactly; no database access/migration |
| Browser Cases | Origin-scoped, not implicitly transferred | Existing 4174 storage remains there; 6210 is a separate origin |
| Local lifecycle | Registered permanent controller address | `tender-match`, 6210, own start/stop/restart/health |
| Backend | Client-side/local domain work | Normal pinned snapshot plus separately authenticated hosted development mode |
| Auth adjustment | Not required for prior client extraction | NOT made: hosted contract allows only 4189 and old session has expired |
| Cutover | Validate before removing old coupling | Original TenderApps still working; no old code/coupling removed |

The hosted service, restricted views/roles, SQL, domain and exact origin contract
are unchanged from 44de97c. Database URLs, API keys, DPAPI seeds and private datasets
were not copied into the new public directory. No API origin proxy, automatic session
renewal, hosted deploy, provider call or new authentication grant was added.
The old optional local API service is not implicitly started either.

## Validation

- Independent Vite build and strict app TypeScript pass.
- Fresh frozen pnpm install in `C:/CodexWork/tendermatch-frozen-validation`: seven
  workspaces, 658 packages, 843-entry supply-chain policy pass, scripts disabled.
  Match builds and typechecks there with no sibling app source files present.
- 16 extraction/boundary tests pass, including original/extracted UI and public
  parity, undeclared dependency denial and missing-session refusal.
- Selected existing Match suite: 70 tests, 68 pass, one fail, one skipped. Failure:
  historical Stage 9 production-source assertion expects no Balance typography import
  in original main.tsx; the combined checkpoint intentionally retains that approved
  import. Test not weakened or edited. Live hosted-evidence test remains skipped;
  no fresh hosted functionality claim. Initial Excel export test needed the original
  app's dependency junction; after resolving that test environment it passes.
- Browser: overview renders labelled pinned snapshot; explicit Kossan × G-1.5
  review shows 41 score, 65% coverage, 50% confidence and separate human disposition;
  17 ranked pairs load for that tender. Formula navigation works.
- Development mode shows DEVELOPMENT_SESSION_UNAVAILABLE and explicitly states
  no snapshot/full matrix loaded. Formula link exits development mode correctly.
- Vite reports existing large bundle warnings. Editing the new entry while running
  produced a development HMR duplicate-createRoot warning; fresh-load checks are
  separate from that development-edit observation. No business-rule repair attempted.

## Remaining gate

This stage establishes an independent local frontend, NOT a fully active standalone
authenticated all-to-all application. Next: approve a bounded development-only
origin/session handoff for 6210, adapt the controller-owned session delivery without
exposing credentials, verify exact backend identity/read-only limits, then replay
the authenticated workflow. No database split is required by frontend extraction.
Production release/independent CI and old coupling removal remain later gates.

## Rollback

Stop only `tender-match`; its port reservation remains. Previous apps and datasets
are untouched. Keep this branch and its Git bundle checkpoint; do not delete source
or restore the entire shared controller registry. Future source rollback must use
the controller's stop/select-worktree/start sequence with a verified commit.
