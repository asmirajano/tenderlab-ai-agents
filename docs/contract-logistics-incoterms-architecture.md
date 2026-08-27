# Contract Logistics & Incoterms Costing — architecture decision

Status: approved production product workflow implemented with separate client-product boundary, 2026-08-27
Primary disposition: `EXISTING AGENT — STANDALONE IMPLEMENTATION`

## Placement

The interactive application is a standalone implementation of canonical `agent:TL-A050` — **TENDER LOGISTICS COST**. The canonical 64-Agent registry retains its stable identity and numbering. The pure calculation kernel under `packages/logistics-costing` is intentionally reusable by other Agents, but the governed cost scenario and cost-basis artifact remain Agent 50's business output.

This placement follows the existing registry evidence:

- Agent 50 owns total-cost and landed-price models across suppliers, logistics, duties, taxes and execution assumptions.
- Agent 50 may calculate scenarios and flag missing assumptions; finance retains approval of the final cost basis.
- Agent 46 normalizes quotations but explicitly does not calculate final landed cost.
- Agent 49 checks commercial and Incoterm compliance but does not calculate cost.
- Agent 51 turns an approved cost basis into a bid price/BOQ but does not recreate underlying cost evidence.
- Agent 62 owns actual post-award physical delivery status; Agent 63 owns post-award contract/payment administration.
- Agent 57 reviews non-standard contract language and legal risk.

No 65th canonical Agent is justified.

## Product placement

The capability is presented in **TenderApps**, the client-facing application
suite, as **TENDER LOGISTICS COST**. TenderApps is built independently under
`apps/tender-apps`; it does not inherit the TenderLab Command Center shell,
route tree, glossary UI, or navigation.

The Command Center remains the internal architecture/control surface. It may
open the separately hosted TenderApps origin through a deployment-configured
`NEXT_PUBLIC_TENDER_APPS_URL`, but TenderApps exposes no route or backlink to
the Command Center. The detailed product, hosting, and security boundary is in
`docs/tenderapps-product-boundary.md`.

This is a product-surface decision, not a registry change. Agent 50 still owns
the governed business output, and the deterministic kernel remains shared.

## Operating shape

```text
User / Case trigger
        │
        ├─ client uses TenderApps / TENDER LOGISTICS COST
        │       (separate build and origin; no Command Center shell)
        │
        ├─ optional A021 Document Intake → source manifest
        ├─ optional A046 Quotation Normalization → normalized quotation basis
        └─ required A050 TENDER LOGISTICS COST
              ├─ versioned Incoterms® 2020 responsibility rules
              ├─ deterministic logistics-costing kernel
              ├─ evidence-based cargo / loadability estimator
              ├─ transport-capacity model and dynamic allocation
              ├─ versioned route, equipment, HS and insurance references
              ├─ one current logistics estimate and commercial summary
              └─ audit / assumptions / unresolved-input package
                       │
                       ├─ A003 Evidence & Provenance
                       ├─ A004 Audit & Version Control
                       ├─ A049 Commercial Compliance
                       ├─ A051 Pricing & BOQ
                       ├─ A062 Execution & Logistics
                       ├─ A063 Payment & Contract Administration
                       └─ A002 / authorised finance human approval
```

The former Command Center route `/logistics-costing` is intentionally absent.
The client application is the root of its own TenderApps build and hosting
target. It is an operational prototype workspace, not a Case Simulation page
and not a revival of the legacy Main Agents Run route.

## Process and artifact identity

The reusable definition is `process-definition:TL-PD-LOGISTICS-COSTING`, version `0.1.0`. Its contract is in `packages/logistics-costing/src/process.ts`.

The current TenderApps product is deployed as a client-side deterministic
application. “Production” here means the approved user workflow and release
surface; it does **not** imply server-side case orchestration, live carrier
pricing, or enforceable tenant authorization. A future persistent runtime must
assign separate identifiers for:

1. Process Definition and immutable version;
2. each Case-/contract-bound Process Instance;
3. each Agent Execution attempt;
4. each versioned input or output Artifact.

The JSON exports and browser-saved approvals are review artifacts, not persisted canonical Artifacts or enterprise approval records.

## Production product status and real-case fidelity

The current application is a **validated preliminary-estimation product**:

- **Domain logic is close to operational calculation behavior.** All 11
  Incoterms® 2020 rules, mode restrictions, cost-set differences, logistics-only
  scopes, contract overrides, insurance, DDP gates, packing proxies, transport
  planning, FX, allocations, evidence types, and negative conditions execute
  through one deterministic kernel and automated tests.
- **Real source-document intake is exercised.** Text-searchable PDF, XLSX/XLS,
  CSV/TSV and JSON inputs are read locally, mapped to one case-data model and
  retained with source/page provenance. Image-only PDFs fail with actionable
  recovery guidance; no OCR result is simulated.
- **The approved quotation is a regression fixture without being copied into
  the repository.** It produces 167 priced evidence rows, a USD 1,586,386
  working line-item baseline, and a visible USD 778 discrepancy against the
  supplier's printed USD 1,587,164 total.
- **Cargo and pricing uncertainty is explicit.** Shipment cube, gross weight,
  loadability, route charges and insurance may be estimated from versioned
  proxies/benchmarks. They are never presented as source facts or live quotes.
- **The runtime remains intentionally local.** There is no carrier/tariff/tax/FX
  API, decimal-money ledger, persisted Process Instance, immutable Artifact
  store, approval journal, tenant authorization or governed live-rate feed.

Accordingly, the product provides one defensible preliminary logistics estimate;
it is not a carrier quotation, customs determination, tax opinion or shipment
execution commitment.

## Reused canonical records

| Purpose | Existing canonical source / target |
|---|---|
| Agent identity and boundaries | `packages/catalog-data/src/agents.ts`, `agent-profiles.ts`, `agent-relationships.ts` |
| Supplier quotation basis | `dataset:TEA-DS-SUPPLIER-RFQ-QUOTATIONS` |
| BOQ and cost lines | `dataset:TEA-DS-BOQ-SCHEDULE`, `dataset:TEA-DS-BOQ-COST-ITEMS` |
| Route/rate evidence | `dataset:TEA-DS-LOGISTICS` |
| Duty/tax evidence | `dataset:TEA-DS-TARIFFS` |
| Dated currency basis | `dataset:TEA-DS-FX-RATES` |
| Product facts | `dataset:TEA-DS-PRODUCT-CATALOGUE` |
| Source files and extracted content | `dataset:TEA-DS-DOCUMENT-CORPUS`, `dataset:TEA-DS-RAW-ARCHIVE` |
| Provenance and rights | `dataset:TEA-DS-PROVENANCE-RIGHTS` |
| Post-award contract baseline | `dataset:TEA-DS-CONTRACT-DOCUMENTS`, `dataset:TEA-DS-CONTRACT-REGISTER` |
| Execution and changes | `dataset:TEA-DS-DELIVERY-MILESTONES`, `dataset:TEA-DS-CONTRACT-CHANGES` |

Agent 50's existing relation to `BOQ-COST-ITEMS` is reused for approved unit cost, freight, duty, tax and scenario-assumption fields. A run is not silently written there: the library is not yet a governed scenario ledger.

## Domain modules

- `types.ts` — scenario, money-line, evidence, contract-boundary override, packing, transport-unit, allocation and intake contracts.
- `incoterms.ts` — one versioned definition for all 11 Incoterms® 2020 rules, including transport-mode family, delivery, risk, cost, clearance, loading/unloading, vessel loading, carriage and insurance.
- `engine.ts` — conversion, logistics-only scope, double-count prevention, contract overrides, dated FX, insurance, DDP validation and item allocation.
- `packing.ts` — actual/proxy packing separation, contradiction checks, special-cargo flags and capacity/weight unit planning.
- `production-estimate.ts` — canonical cargo proxy, loadability, dynamic truck allocation, benchmark cost, insurance, HS-candidate and confidence composition.
- `document-intake.ts` — structured input parsing and quarantine of instruction-like document content.
- `fixtures.ts` — protected-source-free regression fixture.
- `process.ts` — reusable process definition and explicit non-production runtime boundary.
- `apps/tender-apps/src/client-document-extraction.ts` — local PDF/XLSX/structured extraction adapter.
- `apps/tender-apps/src/document-semantic-extraction.ts` — document/line/shipment evidence classification and working-baseline reconciliation.
- `apps/tender-apps` — separately built client shell and TENDER LOGISTICS COST UI.

## Cost and responsibility resolution

For each cost line the engine resolves two independently versioned sets:

1. services included in the starting commercial basis;
2. services included in the target rule or selected logistics-only scope.

The evidence precedence is:

1. source-linked contract override;
2. explicit line-level inclusion fact or user input;
3. selected logistics scope;
4. Incoterms® 2020 default model.

The set intersection is retained, target-only services are added, and start-only services are removed. The same line cannot be both retained and added. Risk-transfer text is never used as a shortcut for cost responsibility.

Contract deviations remain explicit findings and calculation inputs. Component allocation and the textual delivery/risk/cost boundary are independent overrides: changing who pays unloading does not silently move risk, while an express clause can replace any displayed boundary with its source reference. DAP plus seller unloading, DDP exclusions, or another non-standard allocation does not mutate the base Incoterms rule. Logistics-only custom scope can select a responsibility set without creating a target Incoterm.

## Insurance

CIP and CIF are treated separately:

- CIP Incoterms® 2020 defaults to Institute Cargo Clauses (A) or similar cover.
- CIF Incoterms® 2020 defaults to Institute Cargo Clauses (C) or similar cover.
- The modeled minimum insured amount is normally 110% of contract value, subject to the parties' actual contract and insurer terms.

For a premium quoted as a percentage of the final insured contract value, the engine solves:

```text
premium = pre-insurance value × (rate × coverage factor)
          ─────────────────────────────────────────────
                    1 − (rate × coverage factor)
```

That formula reproduces the user-supplied regression premium without a hard-coded amount.

## Evidence and trust

Every cost line is one of `sourced-fact`, `user-input`, `assumption`, or `calculation`, with confidence and optional source/date metadata. Uploaded-document strings remain document content. Instruction-like values are quarantined and never promoted to user or system authority.

The user-supplied quotation was accessed locally after explicit permission for
regression verification. It was not copied, indexed, committed or deployed.
Document text and extracted case state remain in the local browser session
unless the user explicitly exports the audit package.

## Authoritative rule basis

- ICC, Incoterms® 2020 rules for any mode or modes of transport: <https://library.iccwbo.org/content/tfb/BOOKS/BK_0049/BK_0049_04_RulesAny.htm>
- ICC, Incoterms® 2020 sea and inland-waterway rules: <https://library.iccwbo.org/content/tfb/BOOKS/BK_0049/BK_0049_05_RulesSea.htm>
- ICC, Incoterms® 2020 overview and insurance changes: <https://iccwbo.org/business-solutions/incoterms-rules/incoterms-2020/>

The application is a calculation and review aid, not legal, tax, customs, insurance, or carrier advice. The licensed ICC rules remain authoritative.

## Architecture findings kept open

1. A persistent calculation ledger does not yet exist; `BOQ-COST-ITEMS` must not be overloaded without a data-model decision.
2. Agent 50's canonical trigger is bid-oriented. Logistics-only and post-award reuse may justify a bounded profile clarification after more Case evidence, not a new Agent.
3. Packed dimensions, stackability, reefer/segregation flags, route benchmarks and transport-unit capacities require governed canonical datasets before enterprise runtime use.
4. Evidence metadata does not yet provide a platform-wide value-envelope contract for sourced/user/assumed/calculated values.
5. Client-side export is not persistent audit storage or approval enforcement.
6. The separate static product origin is not authentication. Command Center
   staff access and TenderApps tenant/client roles still require enforceable
   identity, authorization, protected data paths, and negative security tests.
