# Contract Logistics & Incoterms Costing — production test evidence

Evidence date: 2026-08-27  
Scope: production Landed Cost Studio implementation in TenderApps, backed by the canonical `agent:TL-A050` capability and shared deterministic `packages/logistics-costing` package.

## Automated verification

| Check | Command | Result |
|---|---|---|
| Focused logistics domain, extraction and production-dashboard suite | `node --experimental-strip-types --test --test-reporter=dot tests/logistics-costing.test.mjs` | 26 passed, 0 failed |
| Client product/deployment boundary suite | `node --experimental-strip-types --test tests/client-product-boundary.test.mjs` | 7 passed, 0 failed |
| Static analysis | `pnpm run lint` | passed, no findings |
| TenderApps production build | `pnpm --filter @tenderlab/tender-apps build` | passed; PDF/XLSX workers and client bundle generated |
| Full Tender Ecosystem build and regression suite | `pnpm run test` | 162 passed, 0 failed |
| Agent-spec regeneration | run by `pnpm run test` | passed; 64 canonical Agent Specifications retained without adding a duplicate Agent |

The build reports only the repository's existing large-chunk advisory. It does not prevent production output and no calculation or reconciliation gate was bypassed.

## Production workflow coverage

- local PDF, JSON, CSV/TSV and XLS/XLSX document parsing, with image-only PDF failure reported as an actionable recovery state;
- quarantining of instructions embedded in uploaded documents;
- complete priced-row evidence retention while separating primary commercial lines from subordinate priced accessories;
- calculated line-item baseline preferred over a conflicting printed quotation total, with the discrepancy preserved visibly;
- source fact, calculated value, evidence-based estimate, benchmark assumption and client override kept distinct;
- estimated packed cube and gross weight from product/category evidence without treating product dimensions, capacities or weights as shipment-level packing facts;
- mandatory transport mode and exact named destination before calculation;
- deterministic Incoterms® 2020 responsibility filtering and target-scope inheritance;
- one benchmark-derived current estimate, not a live carrier quotation and not a scenario range;
- estimated insurance on a disclosed insured-value basis, separate from freight and excluded import duties/VAT under standard CIP;
- `requiredTruckCount + 1` visualization, full/partial/free states, volume and weight utilization, and algorithmic limiting factor;
- internal full precision with practical rounded `≈` presentation only at the UI boundary;
- cost-component-to-logistics-total and EXW-plus-logistics-to-CIP reconciliation;
- special-cargo warning and declaration gate without silently assuming standard cargo;
- reference HS candidates with confidence and non-definitive customs warning;
- expandable source, method, benchmark vintage and confidence lineage.

The broader domain suite also continues to cover all 11 Incoterms® 2020 rules, sea-only mode restrictions, logistics-only scopes, contract deviations, DAP/DPU/DDP responsibility differences, currency conversion, duties/tax gates, packing contradictions, special cargo, evidence separation and the earlier EXW Guangzhou to CIP Tashkent arithmetic regression.

## Approved quotation verification

The user-authorized quotation `Updated Quotation-OOO Premier United-20260804.pdf` was read locally in the browser and was not copied into, committed to or deployed with the project.

| Measure | Production result |
|---|---:|
| Price-bearing evidence rows retained | 167 |
| Primary commercial lines used for working baseline | 165 |
| Subordinate priced accessory lines retained but excluded from duplicate baseline addition | 2 |
| Calculated working EXW baseline | USD 1,586,386.00 |
| Supplier printed total | USD 1,587,164.00 |
| Preserved discrepancy warning | USD 778.00 |
| Estimated packed volume | 85.769150405 m³ internally; displayed ≈ 86 m³ |
| Estimated gross weight | 10,758.668 kg internally; displayed ≈ 10,759 kg |
| Planning volume after loadability | approximately 109.96 m³ internally; displayed ≈ 110 m³ |
| Transport requirement | 2 × 13.6 m enclosed road truck + 1 free capacity reference |
| Truck 1 utilization | ≈ 100% volume; ≈ 38% weight |
| Truck 2 utilization | ≈ 28% volume; ≈ 11% weight |
| Limiting factor | VOLUME / LOADABILITY |
| Non-insurance logistics estimate | USD 22,550.00 |
| Estimated insurance | USD 6,218.34 |
| Reconciled logistics addition | USD 28,768.34; hero displayed ≈ USD 29,000 |
| Reconciled CIP total | USD 1,615,154.34; summary displayed ≈ USD 1,615,000 |
| Estimated uplift | ≈ 1.8% |
| Confidence | 45% · Medium/Low |

These figures are the approved methodology fixture, not hard-coded production values. The production result is recalculated from the current case data, route/mode reference and editable cost inputs.

## Browser verification

The complete production workflow was exercised at the dedicated local route `/landed-cost`:

`Upload quotation → local extraction → review/correct fields → EXW current term → CIP target term → inherited CIP scope → prepared benchmark costs → review → result`

Verified outcomes:

- extracted values populated the actual shared case state and remained editable;
- the target CIP responsibility boundary was inherited rather than asking the client to redefine it;
- the result showed one dominant logistics estimate and a secondary commercial summary;
- all three truck states, data-driven cargo fill, utilization and limiting factor rendered correctly;
- the dynamic Russian explanation matched the volume-driven result;
- benchmark, packing, pickup, special-cargo and printed-total warnings remained visible;
- no competing scenario selector or multiple headline estimates were introduced;
- desktop and 720 px narrow layouts remained contained and readable;
- no browser console errors occurred during the verified workflow.

## Known production boundaries

- Freight and insurance are preliminary maintained benchmarks, not live carrier or insurer quotations.
- Product descriptions support preliminary HS candidates only; legal customs classification still requires verification.
- Text-layer PDFs and spreadsheets are parsed locally. Image-only logistics PDFs currently require a clearer/text-based source or manual recovery.
- Packing/loadability remains estimate-sensitive until a supplier packing list or confirmed shipment-level data is supplied.
- The current browser-local client product does not add enterprise persistence, tenant RBAC or a server-side document-processing service.
