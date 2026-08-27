# Contract Logistics & Incoterms Costing — test evidence

Evidence date: 2026-08-27  
Scope: phase-1 Tender AI Agents implementation; protected quotation/workbook not accessed.

## Automated verification

| Check | Command | Result |
|---|---|---|
| Focused domain and simulation suite | `node --experimental-strip-types --test tests/logistics-costing*.test.mjs` | 24 passed, 0 failed |
| Client-product boundary suite | `node --test tests/client-product-boundary.test.mjs` | 4 passed, 0 failed |
| TenderApps type check | `pnpm exec tsc -p apps/tender-apps/tsconfig.json` | passed, no findings |
| TenderApps production build | `npm run build:tender-apps` | passed; independent Vite bundle generated |
| Full Tender Ecosystem build and regression suite | `npm test` | 109 passed, 0 failed |
| Static analysis | `npm run lint` | passed, no findings |
| Production TenderLab build | `npm run build:tenderlab` | passed; Command Center export excludes the costing route and client bundle |
| Ecosystem Atlas build and Agent-spec regeneration | run by `npm test` | passed; 64 canonical Agent Specifications regenerated without adding an Agent |

The final full build/test/lint run passed directly in this worktree. The same source also passed once in an isolated copy against the project's canonical dependency tree while a separate package-manager operation was still linking the worktree, providing an independent environment-parity check.

## Covered simulations

- all 11 Incoterms® 2020 rules and both transport-mode families;
- EXW to FCA/CPT/CIP/DAP/DPU/DDP, FCA to CPT/CIP/DAP, FAS to FOB, FOB to CFR/CIF, CIF to DAP/DDP, CIP to DAP/DDP and DAP to DPU/DDP;
- invalid maritime-rule use on road, rail, air and generic multimodal transport;
- retained-cost double-count prevention, reverse removal and unvalued added/removed-cost findings;
- all named logistics-only scopes plus a custom contract responsibility set;
- standard-rule overlays for component responsibility and independently modified delivery/risk/cost wording;
- CIP Clauses A and CIF Clauses C defaults, higher/custom cover and self-inclusive premium arithmetic;
- DAP/DPU unloading differences and DDP jurisdiction, importer-of-record, registration, clearance, duty and tax gates;
- dated FX, missing/invalid FX, explicit rate-validity contingency and separate import-cost disclosure;
- actual-versus-proxy packing, contradictory or implausible inputs, cube- and weight-driven unit counts, 20ft/40HC/reefer/road/rail/air/inland-waterway/multimodal alternatives;
- non-stackable, fragile, oversized, cold-chain, dangerous-goods, battery/refrigerant and segregated cargo;
- quoted CSV fields, JSON intake and quarantined malicious/irrelevant document instructions;
- source/user/assumption/calculation evidence separation;
- exact 165-line source and resulting-total reconciliation;
- the supplied EXW Guangzhou to CIP Tashkent regression to USD 0.01.

## Live browser verification

The independent TenderApps production build was exercised in the Codex in-app
browser, with no console warnings or errors:

| View / interaction | Evidence |
|---|---|
| Desktop, 1440 × 900 | distinct TenderApps shell, three modes, live regression result, responsibilities, component table, allocation and provenance rendered correctly |
| Tablet, 768 × 900 | document width 753px inside a 768px viewport; single-column hero/workspace; intentional horizontally scrollable status/mode/table regions remained contained |
| Phone, 390 × 844 | document width 375px inside a 390px viewport; 43px responsive heading; one-column form controls; scroll-contained tables |
| Logistics-only | scope selector appeared, target Incoterm disappeared and the existing commercial term remained unchanged |
| Mode restriction | EXW → FOB on rail became `BLOCKED` with a sea/inland-waterway validation finding |
| Scenario comparison | rail CIP/DAP/DPU/DDP, air CIP and sea CIF route/mode/unit/service rows recalculated from one editable basis |
| Product boundary | no Command Center route or backlink existed in the client DOM at any tested viewport |
| Export controls | JSON/CSV export functions are present in the client module; their DOM download helper attaches the link before invocation and revokes the object URL asynchronously |

The browser evidence validates presentation and client-side interaction, not
tenant authorization. The current static surfaces have no applied staff/client
RBAC gate.

## Regression target

| Measure | Expected and reproduced |
|---|---:|
| Source lines | 165 |
| EXW total | USD 1,587,164.00 |
| Packed volume | 118.9 m³ |
| Gross weight | 17,167.8 kg |
| Planning units | 2 × 40HC rail containers plus provisional cold-chain parcel |
| Non-insurance addition | USD 18,900.00 |
| CIP insurance | USD 6,207.24 |
| Total addition | USD 25,107.24 |
| CIP total | USD 1,612,271.24 |
| Uplift | 1.58% |

This regression confirms deterministic arithmetic, not the commercial validity of provisional packing, carrier rates, insurance or route assumptions.
