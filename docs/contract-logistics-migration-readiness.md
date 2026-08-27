# Contract Logistics & Incoterms Costing — migration-readiness package

Destination named by the user: Quick-Value Agents project.  
Migration status: **prepared, not executed**. No files have been copied, deployed or published outside the Tender AI Agents Project.

## Package contents

| Item | Tender AI Agents location |
|---|---|
| Architecture decision and lineage | `docs/contract-logistics-incoterms-architecture.md` |
| Client-product and access boundary | `docs/tenderapps-product-boundary.md` |
| Build, simulation and responsive evidence | `docs/contract-logistics-test-evidence.md` |
| Domain contracts | `packages/logistics-costing/src/types.ts` |
| Incoterms® responsibility rules | `packages/logistics-costing/src/incoterms.ts` |
| Deterministic calculator | `packages/logistics-costing/src/engine.ts` |
| Packing and transport-unit estimator | `packages/logistics-costing/src/packing.ts` |
| Production cargo/rate/confidence composer | `packages/logistics-costing/src/production-estimate.ts` |
| Structured document trust adapter | `packages/logistics-costing/src/document-intake.ts` |
| PDF/XLSX extraction adapter | `apps/tender-apps/src/client-document-extraction.ts` |
| Semantic evidence mapper | `apps/tender-apps/src/document-semantic-extraction.ts` |
| Process definition | `packages/logistics-costing/src/process.ts` |
| Protected-source-free regression fixture | `packages/logistics-costing/src/fixtures.ts` |
| Interactive client application | `apps/tender-apps/` |
| Automated arithmetic/negative tests | `tests/logistics-costing.test.mjs` |
| Automated simulation matrix | `tests/logistics-costing-simulations.test.mjs` |

## Dependencies

The production client uses React, Vite, the shared design system, `pdfjs-dist`
for local text-searchable PDF parsing, and `xlsx` for local workbook parsing.
The static app keeps case state in the browser and exports JSON/CSV. All pinned
dependencies are recorded in the workspace lockfile.

Before migration, the destination must provide or replace:

- React/client route integration and design tokens;
- an authorised persistence model if calculations must be saved;
- an OCR adapter if image-only PDFs must be processed automatically;
- a decimal-money implementation for production-grade high-value/multi-currency accounting;
- canonical identity mapping if destination Agent IDs differ;
- access control, retention and source-document confidentiality rules;
- a separately deployed client origin plus enforceable tenant/client/support
  roles; origin separation alone is not authorization;
- an approval record and immutable calculation-version journal;
- jurisdiction-specific tariff, tax, importer-of-record and regulatory data sources;
- governed carrier/rate validity and transport-unit reference data.

## Migration sequence

1. Freeze this source version and record its git revision.
2. Copy only `packages/logistics-costing` and its tests into an isolated destination branch after explicit user approval.
3. Replace TenderLab canonical IDs with a documented destination mapping; do not rename Agent 50 semantics silently.
4. Preserve one Incoterms rule module. Do not copy rule tables into the destination UI or fixtures.
5. Replace browser `number` money with decimal strings plus a decimal/rational library before production financial use.
6. Implement a source adapter interface for PDF, spreadsheet and structured inputs. Keep extraction outputs distinct from document instructions.
7. Add persistence only after Process Instance, Agent Execution and Artifact identities, access, retention and approval rules are defined.
8. Re-run every regression and negative simulation in the destination environment.
9. Compare JSON audit output field-by-field and reconcile all allocated line totals.
10. Obtain finance, logistics, customs/tax and legal review before calling the migrated app production-ready.
11. Preserve the client-product boundary: do not place the client module inside
    an internal Command Center shell or add a reverse navigation route.

## Acceptance evidence required at migration

- all 11 Incoterms® 2020 codes and mode families remain unique and versioned;
- risk, delivery and cost boundaries remain separate fields;
- reverse conversions remove only valued source-included costs;
- the approved quotation preserves 167 priced evidence rows, uses 165 primary
  commercial lines for the USD 1,586,386 working baseline, and exposes the USD
  778 printed-total discrepancy;
- displayed truck count equals required transport units plus one free reference;
- displayed cost components reconcile to the unrounded logistics estimate;
- the exact commercial baseline plus the unrounded logistics estimate reconciles to the revised commercial total;
- logistics-only scope leaves the commercial Incoterm unchanged;
- DDP is blocked without jurisdiction/importer/tax inputs;
- CIF/CIP insurance defaults and contractual changes remain distinct;
- actual packing and proxy packing remain distinguishable;
- malicious document instructions remain inert;
- every result line retains evidence kind, source/date when supplied, confidence and formula version;
- responsive interaction is verified on phone, tablet and desktop;
- output export round-trips without arithmetic drift.

## Known phase-1 limitations

1. Only Incoterms® 2020 is modeled. The UI does not convert historical 2010/DAT terms.
2. The component matrix is a planning abstraction, not a replacement for the complete licensed ICC A1–A10/B1–B10 text.
3. FCA named-place variants and carriage-contract unloading inclusions require explicit line facts/overrides; route-leg inference is not yet granular enough for all cases.
4. Money uses JavaScript numbers and two-decimal output rounding. Production should use decimal strings and declared currency minor units.
5. Item allocation is source-value pro rata with final-line residual reconciliation. Weight, volume, unit, manual and direct allocation methods are not yet interactive.
6. Transport-unit capacities are planning defaults. Carrier equipment, road/rail gauge, pallet positions, reefer capacity and loadability need verified reference data.
7. Text-searchable PDFs and worksheet cells are parsed locally. Image-only PDFs require OCR or manual recovery; complex table layouts may still require client correction.
8. No tariff, tax, FX, insurer or carrier API is connected. Route and insurance values use dated internal benchmarks unless the user supplies better evidence.
9. No server persistence, Process Instance journal, Artifact store, tenant/RBAC
   access, or approval enforcement exists. TenderLab and Atlas static routes are
   not currently staff-authorized.
10. The earlier integrated route was exercised at desktop, 768px tablet and
    390px phone viewports. The separately built TenderApps surface must retain
    those checks after every shell change; persistent multi-engine/touch
    automation is not yet a repository dependency.
11. The approved quotation was exercised locally without being copied into the repository. Its extracted product rows and source provenance remain local browser state.
12. HS codes are reference candidates, not legally definitive customs classifications.

These limitations must travel with the code. Matching the regression alone is not sufficient evidence of readiness.
