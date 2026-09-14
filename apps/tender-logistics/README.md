# Tender Logistics — Stage 2 extraction candidate

This app is an isolated, undeployed copy/extraction. Existing TenderApps remains intact. It is registered as `tender-logistics` at http://127.0.0.1:6208/ through the canonical Localhost Manager. Use the controller for start/stop/restart; do not start Vite directly or invent a port. The checked-in registration JSON records the initial registration, not the current runtime HEAD. Read the canonical registry for current source identity.

Latest validation and open findings: ../../docs/tenderapps-stage3-checkpoint.md. This is a development checkpoint, not a production release.

Build: `npm --prefix apps/tender-logistics run build` from repository root.

Type check: `npm --prefix apps/tender-logistics run typecheck` (passes after the reviewed Stage 3 repairs; see ../../docs/tenderapps-stage3-validation.md).

Routes supported by this entry: /, /landed-cost, /logistics-costing. The Catalog link goes to the existing public catalog; this app does not host sibling products. Header identifies the development extraction. No live route was switched.

The Logistics engine remains in packages/logistics-costing, and design tokens remain shared in packages/design-system. UI/helper/CSS copies are temporary parity snapshots. The extraction parity test detects drift; future approved consolidation must replace that temporary copying arrangement explicitly.

Assets live under public/logistics-cost and built assets/logistics. Existing localStorage case keys are preserved. A new origin cannot automatically read old cases. Do not use real saved cases or change origins before the migration/restore plan is validated.
