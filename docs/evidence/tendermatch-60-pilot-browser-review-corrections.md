# TenderMatch 60-pilot browser-review corrections

## Scope and source

- Base: `528f29aad39c3e290c7d4b89ef17edd38c7f3ead` on `codex/tendermatch-final-integration`.
- Frozen comparison source: `04b0b2a723223d11617837ee0e7562fa48168cd9`, read-only.
- Runtime data remains the committed 60-tender Central Asia snapshot; no extraction or data-contract change is part of this correction.

## Visible before and after

| Surface | Before | Corrected contract |
|---|---|---|
| Market Radar / Tenders | Aggregate map reserved a second column for one persistent Selected Tender card. | Full-width aggregate map; marker activation opens the surviving tender-first review destination. |
| Market Radar / Suppliers | Aggregate map reserved a second column for one persistent Target Supplier card. | Full-width aggregate map; marker activation opens the surviving supplier Verification destination. |
| Supplier geography | The bundled China prefecture asset was drawn at `0.25` opacity and appeared blank behind the grid. | The same licensed local asset is visibly rendered at `0.86` opacity with its original geometry, markers, clusters, filters, zoom, pan, legend and attribution. |
| Tender Snapshot | Dense fixed columns allowed long source values and titles to collide visually. | Deliberate column minima, wrapped cell content, taller rows and a single labelled internal horizontal scroll region prevent cell collision and page-level overflow. |
| Match Matrix navigation | Ten views included an additional Detailed Case Review page. | Five families contain nine views; stale `audit` values resolve to Full Match Matrix. Review by Tender and Review by Supplier remain. |
| Workspace rail | A visible Canonical Owner card occupied the rail footer. | The UI card and reserved spacing are removed; canonical ownership remains in typed product metadata. |

The active parity inventory has 62 items after removing the two aggregate-page single-record detail surfaces and the non-source Detailed Case Review surface. Those removals are explicit user decisions, not missing implementation.

## Verification record

- Focused TenderMatch/navigation/map/pilot tests: 24 passed.
- Full repository tests: 261 passed.
- Repository lint: passed.
- TenderApps production build and complete repository build: passed.
- At this historical browser-review checkpoint, snapshot invariants were 60 tenders, 10 frozen suppliers and 600 explicitly MISSING/unassessed pairs. The later Neon supplier integration supersedes these active-runtime counts without rewriting this evidence record.
- The local production preview is served at `http://127.0.0.1:4177/tendermatch`.

Rendered browser automation could not complete because the in-app browser rejected localhost inspection under its URL safety policy. No alternate browser surface or policy workaround was used. The preview remains available for the user's direct visual review; no automated viewport screenshot claim is made for this checkpoint.
