# TenderMatch navigation audit

## Authority and scope

- Frozen source: `04b0b2a723223d11617837ee0e7562fa48168cd9`, `app/tenderboost-ai/page.tsx`.
- Reference screenshot: cropped frozen-source TenderBoost workflow navigation.
- Current target: all 10 matching `WorkspaceView` surfaces in `apps/tender-apps/src/tendermatch-app.tsx`.
- Scope: navigation hierarchy, order, active/expanded states, and operational page shell. Campaign Studio and Follow-ups were subsequently removed from TenderMatch by product-boundary decision.

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

The frozen source's `campaign` and `outreach` pages have no TenderMatch target. Promotion, outreach, CRM action, and response tracking belong to a separately audited future capability; they are not registered or implemented here.

## Reusable interaction contract

- Each view appears exactly once in the typed navigation registry.
- Families 02, 03, and 05 expose semantic `aria-expanded` disclosure controls and linked child containers.
- The active child uses `aria-current="page"`; its parent family remains visibly current even when collapsed.
- Navigating to a child expands its family. The active family may still be intentionally collapsed without hiding the current family label.
- Desktop uses a sticky, internally scrollable workflow rail. Tablet and mobile use a separate collapsed workflow drawer rather than a compressed desktop sidebar.
- The responsive drawer identifies the current family and page while closed, closes after a destination is selected, and preserves the same five-family order.
- Removed or unknown `view` query/hash values resolve to Overview; no Campaign page can be restored from stale navigation state.

## Rendered production-preview evidence

Build source: local production build from the `codex/tendermatch-revision` working tree, served at `http://127.0.0.1:4176/tendermatch` on 30 August 2026.

| Surface | Viewport | Result |
|---|---:|---|
| Desktop Wide | 1440 × 900 | Five numbered families visible; disclosure and child active states verified; page overflow 0 px |
| Tablet | 1024 × 768 | Desktop rail replaced by collapsed workflow drawer; keyboard-opened Match Matrix and selected Full Match Matrix; drawer closed after selection; page overflow 0 px |
| Mobile | 390 × 844 | Five-family drawer, nested Supplier pages, minimum touch target and automatic-close behavior verified; page overflow 0 px |

Interaction and route checks:

- Pointer and keyboard activation both changed the active child, current parent family, focus target, and rendered workspace.
- An active family remained identified by its current child label when collapsed.
- All 10 matching views were opened once from the navigation; every view produced one `aria-current="page"`, the expected workspace region, and 0 px page overflow.
- The explicit Case ID remained `case:TM-DEMO:zr-space-252528-go-rfb:supplier-tb-chery` before and after the 12-view traversal.
- `/tendermatch`, `/tenderboost`, and `/tenderboost-ai` loaded and refreshed directly with the TenderMatch product navigation active and Overview selected; browser back/forward preserved route history.
- Browser console warning/error count was zero during desktop, tablet, mobile, disclosure, and route checks.
