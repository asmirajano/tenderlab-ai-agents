# TenderMatch navigation audit

## Authority and scope

- Frozen source: `04b0b2a723223d11617837ee0e7562fa48168cd9`, `app/tenderboost-ai/page.tsx`.
- Reference screenshot: cropped original TenderBoost workflow navigation.
- Current target: all 12 `WorkspaceView` surfaces in `apps/tender-apps/src/tendermatch-app.tsx`.
- Scope: navigation hierarchy, order, active/expanded states, and operational page shell only. The TenderMatch Overview body, datasets, matching rules, Case state, and legacy module behavior are unchanged.

## One-to-one mapping

| Family | Frozen TenderBoost page | TenderMatch view | Target label | Treatment |
|---|---|---|---|---|
| 01 Overview | `dashboard` | `dashboard` | Overview | Standalone first page; TenderApps successor to Dashboard |
| 02 Market Radar | `radartenders` | `radar-tenders` | Tenders | Nested source-discovery view |
| 02 Market Radar | `radarsuppliers` | `radar-suppliers` | Suppliers | Nested source-discovery view |
| 03 Suppliers | `companies` | `suppliers` | Profiles | Nested supplier directory |
| 03 Suppliers | `evidence` | `verification` | Verification | Nested evidence/provenance view |
| 04 Tenders | `tenders` | `tenders` | Tenders | Standalone opportunity directory |
| 05 Match Matrix | `fullmatrix` | `matrix` | Full Match Matrix | Nested portfolio view |
| 05 Match Matrix | `automatch` | `match-tenders` | AutoMatch by Tenders | Nested tender-first view |
| 05 Match Matrix | `automatchcompanies` | `match-suppliers` | AutoMatch by Suppliers | Nested supplier-first view |
| 05 Match Matrix | no separate source navigation item | `audit` | Detailed Case Review | Existing TenderMatch Case/audit surface, nested once after the matching views |
| 06 Campaign Studio | `campaign` | `campaigns` | Campaigns | Isolated legacy-parity module; local drafts remain `NOT SENT` |
| 06 Campaign Studio | `outreach` | `followups` | Follow-ups | Isolated local simulation events; no delivery or CRM implication |

## Reusable interaction contract

- Each view appears exactly once in the typed navigation registry.
- Families 02, 03, 05, and 06 expose semantic `aria-expanded` disclosure controls and linked child containers.
- The active child uses `aria-current="page"`; its parent family remains visibly current even when collapsed.
- Navigating to a child expands its family. The active family may still be intentionally collapsed without hiding the current family label.
- Desktop uses a sticky, internally scrollable workflow rail. Tablet and mobile use a separate collapsed workflow drawer rather than a compressed desktop sidebar.
- The responsive drawer identifies the current family and page while closed, closes after a destination is selected, and preserves the same six-family order.
- Family 06 is visually and textually distinguished as legacy parity and remains outside TL-A031 ownership.

## Rendered production-preview evidence

Build source: local production build from the `codex/tendermatch-revision` working tree, served at `http://127.0.0.1:4176/tendermatch` on 30 August 2026.

| Surface | Viewport | Result |
|---|---:|---|
| Desktop Wide | 1440 × 900 | Six numbered families visible; disclosure and child active states verified; page overflow 0 px |
| Tablet | 1024 × 768 | Desktop rail replaced by collapsed workflow drawer; keyboard-opened Match Matrix and selected Full Match Matrix; drawer closed after selection; page overflow 0 px |
| Mobile | 390 × 844 | Six-family drawer, nested Supplier pages, 54 px minimum tested target height, automatic close after Verification selection; page overflow 0 px |

Interaction and route checks:

- Pointer and keyboard activation both changed the active child, current parent family, focus target, and rendered workspace.
- An active family remained identified by its current child label when collapsed.
- All 12 views were opened once from the navigation; every view produced one `aria-current="page"`, the expected workspace region, and 0 px page overflow.
- The explicit Case ID remained `case:TM-DEMO:zr-space-252528-go-rfb:supplier-tb-chery` before and after the 12-view traversal.
- `/tendermatch`, `/tenderboost`, and `/tenderboost-ai` loaded and refreshed directly with the TenderMatch product navigation active and Overview selected; browser back/forward preserved route history.
- Browser console warning/error count was zero during desktop, tablet, mobile, disclosure, and route checks.
