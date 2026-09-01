# TenderMatch final matching-only parity audit

Final integration baseline: `codex/tendermatch-final-integration`, based on `573af695`; selectively reconciled from TenderMatch 1 Overview `d2834b2` and page-parity `5423a16`.

## Active inventory

The typed source-to-target inventory is `packages/tendermatch/src/legacy-parity.ts`. It contains 65 active matching items:

- preserved: 24
- adapted to TenderApps design: 11
- truth-corrected: 30
- missing: 0

The prior matching-only baseline contained 60 items. Five source-supported matching-map items are restored here: tender map legend, tender focus signal, supplier map legend, supplier focus signal, and supplier map pan.

## Reachable product surface

Five numbered workflow families contain exactly nine views, each registered once: Overview; Market Radar / Tenders; Market Radar / Suppliers; Suppliers / Profiles; Suppliers / Verification; Tenders; Match Matrix / Portfolio; Match Matrix / By tender; and Match Matrix / By supplier. Detailed Case Review was removed by explicit product decision; stale `audit` view values resolve to Full Match Matrix.

The frozen-source parity checkpoint established 16 tenders, 10 suppliers, 160 explicit pairs, 18 evaluated historical pairs, and 142 MISSING pairs. Those counts are historical regression evidence only. The active controlled pilot now combines the committed 60-record Central Asia tender snapshot with 17 pinned Neon v1.3 GOODS/WORKS supplier profiles. All 1,020 completed evaluations remain MISSING under the v5 procurement, artifact and relevance gate; no score is manufactured merely to populate the matrix.

## Explicitly excluded later scope

Campaign Studio and Follow-ups are excluded by the later user-approved TenderMatch boundary. There is no active Campaign/Follow-up destination, page, control, runtime module, persistence key, export, or status field. Stale Campaign/Follow-up compatibility route, query, hash, or saved-view values intentionally fall back to Overview without deleting unrelated browser storage. Historical source and Git provenance remain intact.

## Reconciliation decisions

- The one-glance practical-Agent Overview from `d2834b2` is retained with matching-only language and the current five-family navigation.
- Geographic radar behavior from `5423a16` is ported without its Campaign/Follow-up modules.
- Local world and China geometry preserve frozen coordinates, filters, markers, clusters, selection, legends, attribution, zoom, and supplier-map pointer/keyboard pan without Leaflet or external tiles.
- MISSING remains distinct from zero; deadlines remain clock-derived; consultant disposition remains human-controlled.
- The original TenderBoost source, Firebase configuration, deployment, and standalone shell are not copied or modified.
