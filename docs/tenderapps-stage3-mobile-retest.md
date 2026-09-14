# Stage 3 mobile retest — 14 September 2026

Source: isolated tenderapps-boundaries-stage1 worktree at base 8f1c055 plus uncommitted extraction. Canonical remote remains d230590. Served via registered tender-logistics at http://127.0.0.1:6208/landed-cost. Original TenderApps source/runtime unchanged.

Added logistics-responsive.css, loaded only by the extracted entry. Under 640 px the header participates in document flow, its controls wrap into visible rows, saved-case tabs wrap, long titles can wrap and interactive targets are at least 44 px high. Narrow-screen html/body minimum width no longer forces overflow around the scrollbar. No calculations, records or routes changed. Existing copied styles remain intact; parity tests exclude only the explicitly new responsive stylesheet.

Verified using browser UI:

- 390x844: navigation and Standard/Wide controls visible; case tabs fit, Result/Inputs/Calculation details switch correctly; target rectangles fit within 375 px client width.
- 320x844: after minimum-width fix, document scroll width and client width both 305 px; no page overflow. Layout preference pointer controls and ArrowRight interaction worked.
- 768x900, 1440x900, 1920x900: measured header/case controls remained inside client width; no horizontal page overflow at inspection.
- Mobile overview screenshot visibly confirms unclipped controls and heading. Existing synthetic saved case remains available; no user data deleted.
- Captured browser error/warning logs empty. Temporary viewport override reset; preview left running.

99 regression/extraction/boundary tests and typecheck passed. Production build passed with the existing large ExcelJS chunk warning. This closes the observed navigation/tab clipping finding, not every possible mobile or document-upload workflow. No deployment, origin transfer, database migration, or additional application extraction occurred.
