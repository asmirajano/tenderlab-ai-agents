# TenderBoost AI — TenderApps Agent 03 integration contract

Status: local Stage 2 audited-fixture integration, dated 2026-08-30. This document records a reversible practical-product placement, bounded formula experiment, and implementation boundary. It does not alter the canonical 64-Agent registry and does not authorize deployment or outreach.

## Identity and placement

- Practical product name: **TenderBoost AI**.
- TenderApps presentation: **TenderApps Agent 03**, meaning the third practical product page only.
- Stable practical implementation: `implementation:TEA-RAI-TENDERBOOST`.
- Stable client product: `product:TA-TENDERBOOST`.
- TenderApps route: `/tenderboost`; `/tenderboost-ai` is a client-route alias only.
- Frozen migration source: standalone TenderBoost commit `04b0b2a723223d11617837ee0e7562fa48168cd9`.
- Provisional canonical owner: `agent:TL-A031` Company-to-Tender Match Score Agent.
- Placement disposition: `EXISTING AGENT — STANDALONE IMPLEMENTATION`.

The placement is supported because TL-A031 owns an evidence-backed Company × Tender fit score, strengths, gaps, and citations. It explicitly does not own general company readiness, participation structure, or Bid/No-Bid authority. The practical page keeps those boundaries visible.

Supporting capabilities and handoffs remain separate:

| Capability | Relationship to TenderBoost |
|---|---|
| `agent:TL-A014` Tender Discovery Agent | Supplies ranked tender opportunities and deadline/source facts. |
| `agent:TL-A011` Supplier Intelligence Agent | May supply supplier profile and intelligence evidence; does not own the match. |
| `agent:TL-A017` Tender Alert & Deadline Agent | Supplies deadline change monitoring; the local snapshot does not implement it. |
| Evidence & Provenance | Supplies traceable evidence identities and review status. |
| `agent:TL-A038` Risk & Integrity Agent | Supplies compliance screening and unresolved-risk blockers. |
| `agent:TL-A035` Bid / No-Bid Decision Agent | Consumes fit and other evidence for a separate recommendation. |
| Human consultant | Approves/rejects the match and campaign draft and retains all authority over external activation. |

No canonical Agent is added, renamed, renumbered, split, or rewritten by this integration.

## Practical-product contract

`Selected Company × Tender pair → versioned supplier/tender/evidence inputs → evidence-linked match assessment → consultant decision → campaign brief draft → explicit human handoff`

### Purpose and primary outcome

TenderBoost helps a consultant review one supplier against one tender, understand why a legacy match appears relevant, see evidence and freshness gaps, record a decision, and prepare a channel-specific campaign brief without claiming that outreach occurred.

The primary finished product is one versioned, explicit TenderBoost Case result containing:

1. the selected Tender, Supplier, Evidence snapshot, Match, and Decision identities;
2. distinct historical Match Score, audited Match Support, supplier readiness, pair Evidence Quality, deadline urgency, campaign priority, and consultant decision;
3. evidence-linked strengths, unsupported claims, gaps, and trust dimensions;
4. one optional campaign draft and its exact evidence references;
5. activation blockers, campaign events, simulation-only events, artifacts, limitations, and workflow state.

Consumers are the consultant, later participation/Bid-No-Bid analysis, and future authorized campaign services. The current local page does not perform those downstream actions.

### Negative scope and human authority

This stage does not:

- discover or refresh live tenders;
- establish company readiness as fact;
- decide Bid/No-Bid, eligibility, participation route, compliance, or legal contact basis;
- send email, LinkedIn, WhatsApp, telephone, form, advertising, or CRM activity;
- infer a response or no-response from elapsed time;
- create a durable canonical Dataset record;
- implement authentication, tenant isolation, server-side roles, immutable event storage, or orchestration;
- deploy, replace, redirect, or otherwise modify the original TenderBoost application.

The consultant may record a match decision and approve exact draft copy. External activation remains disabled until separate evidence, consent/suppression, risk, runtime, integration, and authorization gates are satisfied.

## Versioned identity contract

| Record | Identity rule |
|---|---|
| Tender | `tender:TB:<source reference>` plus snapshot version and absolute deadline. |
| Supplier | `supplier:TB:<legacy company id>` plus snapshot version. |
| Evidence | `evidence:TB:<supplier>:<field>:<ordinal>` with source role, value class, review status, retrieval date, and eligibility for external claims. |
| Match | Stable `match:TB:<tender>:<supplier>` identity plus a record revision that increments when the decision or derived clock state changes. Score, readiness, verification, priority, and decision remain separate. |
| Decision | Immutable `match-decision:TB:<case>:<sequence>` records retain actor, timestamp, rationale, source role, and value meaning. |
| Campaign | `campaign:TB:<case>`; one logical campaign connects Supplier, Tender, Match, and Case, and its record revision increments for approval and lifecycle changes. |
| Campaign Event | `campaign-event:TB:<case>:<sequence>`; real events require a non-simulation mode and external record identity. |
| Case | Explicit caller-selected `case:TB-DEMO:<tender>:<supplier>`; never resolved through a latest-Case fallback. |
| Result | `result:TB:<case>:v<n>`; one composite model drives the page and local persistence. |
| Artifact | Versioned Case JSON and campaign-brief identities derived from the same result. |

## Source, value, and confidence policy

The migrated 16-tender/10-supplier fixture is `snapshot:TB-DEMO-2026-08-15`, classified as a **DATED DEMONSTRATION SNAPSHOT**. Its source commit is retained in metadata. It is supporting material, not a live source feed.

Material values retain one of these meanings:

- `SOURCE`: current traceable value from eligible evidence;
- `CALCULATED`: deterministic formula with named operands and method;
- `ESTIMATED`: bounded score/model result with method and limitations;
- `ASSUMED`: explicit unverified legacy or user premise;
- `MISSING`: no supported value; never converted to zero.

The fixture contains 18 evaluated Company × Tender pairs with legacy scores from 65–95. The other 142 combinations are `MISSING / not evaluated`, not `0/100`; they are excluded from evaluated-match and campaign results. A future genuine evaluated zero remains a distinct numeric score and blocker. The legacy match and readiness values are `ESTIMATED`, not authoritative facts. Stage 2 calculates Audited Match Support for only 6 of the 18 assessed pairs; the other 12 remain `MISSING` because one of two required distinct evidence components is unsupported. Pair Evidence Quality, deadline urgency, and campaign priority are separate `CALCULATED` values when their required operands exist. Tender facts and old supplier facts are treated as dated supporting inputs until refreshed. Evidence links are stable, but legacy-verification status is not automatically eligible for external claims.

The full formula, evidence manifest contract, output audit, and 18-pair comparison are in `docs/tenderboost-scoring-model-card.md`. Historical Stage 1 calculations remain available under `tenderboost-legacy-baseline/1.0.0`; they are not silently rewritten.

Recognition, structural, semantic, arithmetic/domain, and human-review confidence are independent. A readable fixture does not prove that its match formula, eligibility interpretation, or external claims are current.

## Deadline and dated-snapshot policy

Legacy relative `daysLeft` values were converted once from the frozen 2026-08-15 snapshot into absolute ISO deadlines. Runtime urgency is calculated from the absolute deadline and the caller’s current time. Closed tender status and snapshot age are therefore derived, not stored as authoritative relative values.

A snapshot older than seven days is stale. Stale data can be inspected and saved as a preliminary Case but cannot become activation-ready. Deadline refresh, amendments, and official closure checks are deferred to authorized source integrations.

Persistence never freezes a relative deadline status. Loading or resuming a Case requires an injected ISO clock plus the matching Tender and Supplier context; the engine recomputes deadline status, snapshot freshness, priority, and activation blockers deterministically and creates a new Match/result revision. It does not call an implicit wall clock inside persistence logic.

## Campaign policy

The logical campaign lifecycle is `draft → approved → active → follow-up → interested/no-response → closed`, with `rejected` available as a terminal consultant decision.

Truth constraints:

- unassessed, genuine zero-score, rejected, closed, suppressed, or consent-revoked pairs cannot produce a campaign draft;
- stale evidence, unknown suppression, missing consent, material risk, and unavailable external-claim evidence remain explicit activation blockers;
- `approved` means only that the consultant approved the exact draft; it does not mean sent;
- a later `hold` or `rejected` Match decision blocks activation even when an outreach event exists;
- `active` requires an explicit non-simulation `outreach-sent` event with an integration/manual-record identity;
- `follow-up` requires an active campaign backed by that outreach event;
- `interested` and `no-response` require explicit non-simulation response/observation events;
- simulation-preview events stay in a separate collection and never advance the real lifecycle;
- no message, call, CRM handoff, response, or downstream transfer is claimed without its event record.

Campaign approval remains retained provenance after a valid transition to `active`, `follow-up`, `interested`, `no-response`, or `closed`; downstream status does not create a false `CAMPAIGN_APPROVAL_REQUIRED` blocker. Eligibility can still become false later when a resumed Case discovers a closed/stale tender, a changed decision, or another current blocker.

The page recommends an objective and channel but preserves consultant control. Generated copy includes only evidence records marked eligible for external claims. In the dated fixture none are current enough, so copy truthfully says that no current reviewed claim is approved for external use.

## Persistence and Dataset boundary

The current page stores one complete Case result in browser local storage under a key containing the explicit Case ID. Loading requires that same ID. There is no latest-Case key or fallback.

This is browser-local operational state, not a write to `COMPANY-TENDER-OPPORTUNITY-ASSESSMENTS` or any other canonical Dataset. Schema `2.0.0` Cases recompute audited derived values and clock state on resume. Schema `1.0.0` Cases use an explicit `compatible-historical` migration that retains legacy values and human/event provenance while recomputing audited fields; unknown versions fail explicitly. A future durable implementation would require record identity, tenant authorization, approval conditions, versioning, provenance, retention, and migration policy before writing Match, Campaign, Event, consent, suppression, or delivery records.

## Runtime and security classification

- Maturity: `concept-or-simulation`.
- Evidence strength: `unit-or-synthetic-fixture`.
- Deployment status: `not-deployed`.
- Runtime readiness: `static-client-workflow`.
- Demonstration data: non-confidential fixture only.

The current static client does not enforce authenticated tenant membership, server-side roles, tenant-isolated Case/Artifact storage, immutable event journals, secrets, consent/suppression services, or negative authorization tests. These are required before confidential or external campaign operation.

## Selective migration boundary

Selectively reused and adapted:

- the original TenderBoost page as a workflow and terminology reference;
- the scoped visual language as design inspiration;
- the 16-tender and 10-supplier fixture as explicitly dated demonstration data;
- deterministic pair lookup, historical score separation, objective/channel recommendation, channel-copy structure, and lifecycle concepts; the Stage 1 priority factors are retained only as a frozen compatibility baseline;
- the rule that only relevant verified evidence may support external claims.

Deliberately excluded:

- `.firebaserc`, `firebase.json`, the standalone Firebase workflow, static-export scripts, lockfiles, package shell, and Command Center backlink;
- the standalone header, sidebar, and layout control;
- Leaflet, OpenStreetMap tiles, Wikimedia imagery, and other CSP-conflicting external resources;
- the false `Participation Boost proposal sent` statement;
- autonomous lifecycle advancement, implied responses, and unrecorded outreach status.

The integrated page uses a self-contained **schematic, non-geospatial** relationship diagram with fixed explanatory geometry. It does not represent coordinates, distance, routing, or live geographic accuracy and does not weaken the TenderApps CSP. A real interactive map remains deferred until local assets or an explicitly approved CSP-compatible source contract exists.

## Failure and correction ledger

| What happened | Root cause | Correction | Reusable rule | Regression evidence |
|---|---|---|---|---|
| Relative `daysLeft` became stale while still looking authoritative. | Snapshot-relative UI state was stored as tender truth. | Convert the frozen values to absolute deadlines and derive current urgency/freshness. | Store absolute dated facts; derive relative labels at runtime. | `tests/tenderboost-agent-03.test.mjs` deadline and stale/closed cases. |
| Legacy verified-strength strings lacked record identities. | Presentation strings were used as evidence. | Link supported claims deterministically to evidence IDs and retain unsupported claims as gaps. | A claim is not evidence; every promoted claim needs record-level lineage. | Evidence-link assertions in the focused suite. |
| `active`, follow-up, interested, and no-response could be advanced without actual outreach. | Workflow state and simulation state were conflated. | Require typed non-simulation events with external record identities; keep simulations separate. | No communication state without a communication event. | Lifecycle and simulation regressions. |
| The supplier radar said a proposal was sent without an event. | Demonstration copy implied an external action. | Remove the statement and default every Case to no outreach recorded. | External action claims require an integration or auditable manual record. | Source/bundle truth-language assertions. |
| The 142 unassessed Company × Tender combinations appeared equivalent to scored zeroes. | Pair expansion supplied a numeric default for absent assessments. | Preserve `null / MISSING / not evaluated` and reserve numeric zero for a genuine evaluated score. | Missing evidence is never a zero. | Fixture-count and evaluated-zero regressions. |
| A persisted pre-deadline Case could retain a current status after its deadline. | Derived relative state was accepted from storage. | Require an injected clock and matching Tender/Supplier context on resume, then revision the recomputed result. | Persist dated facts; recompute time-relative state at every resume boundary. | Stale persisted-Case regression. |
| A campaign could activate after the Match decision changed to `hold`. | Activation checked the outreach event but not the complete current eligibility gate. | Re-evaluate Match decision, tender freshness, evidence, compliance, consent, suppression, campaign approval, and outreach evidence at activation. | A lifecycle transition must enforce the current composite result, not a historical partial gate. | `hold → outreach event → active` rejection regression. |
| A valid active campaign immediately appeared to need campaign approval again. | Approval readiness was inferred only from the current lifecycle label. | Retain `approvedAt` and `approvedBy` as approval provenance across downstream states. | Approval evidence and workflow state are separate facts. | Post-activation blocker regression. |
| Match decisions and Campaign state changes were described as versioned without revision behavior. | Schema version and mutable-record revision were conflated. | Keep the schema version global, increment Match/Campaign/Case/result revisions on state-changing updates, and append immutable decision provenance. | Versioned records need explicit revision semantics and actor/time/rationale evidence. | Decision-history and revision assertions. |
| Leaflet and external tiles conflicted with the shared CSP, while fixed geometry could imply accuracy. | The standalone page owned its asset policy and the replacement visual changed labels over fixed shapes. | Use a visibly labelled schematic, non-geospatial relationship diagram and document the deferred map capability. | A child page follows the shared security boundary and must not imply geographic fidelity it cannot provide. | Schematic-label and CSP assertions. |
| The rendered TenderBoost title sat underneath the shared two-row header at tablet and mobile widths. | The new page retained a desktop content offset while the shared navigation becomes a second fixed row below 1040px. | Add page-specific responsive top clearance aligned to the shared header breakpoints. | Responsive verification must start from the actual rendered route and fixed-shell geometry. | Browser checks at 1440×1000, 900×900, and 390×844 plus responsive CSS assertions. |
| A curated legacy Match Score looked like a reproducible calculation. | The fixture retained final scores but not the original formula or requirement-level operands. | Freeze legacy behavior and add a separately versioned audited result that calculates only from qualifying evidence components. | Never reverse-engineer evidence to reproduce a historical score. | Legacy compatibility, 18-pair experiment, and legacy-versus-audited difference regressions. |
| Supplier-wide evidence-status coverage was presented as pair verification. | The formula counted all records regardless of relevance to the selected tender. | Calculate pair Evidence Quality only from distinct records accepted for audited components. | Global completeness and pair-specific verification are different metrics. | Pair-relevance and irrelevant-evidence invariance tests. |
| One evidence record could support multiple claims and be counted more than once. | Lexical matching had no assignment exclusivity rule. | Reject an audited calculation when one record is assigned to both weighted components. | A score must declare and enforce evidence contribution cardinality. | Duplicate-evidence rejection regression. |
| Consultant approval changed Campaign Priority. | Human authority was also used as a numeric relevance operand. | Remove the decision from the audited priority formula and keep it as a separate eligibility gate. | A human decision must not circularly manufacture the score it is reviewing. | Decision-independence and activation-gate tests. |
| The deadline factor fell from 100 to 45 in the final three days. | Discontinuous bands mixed urgency with an unstated actionability penalty. | Use a named monotonic urgency calculation for open tenders and `MISSING` after closure. | Penalties and urgency must not be hidden in the same metric. | Deadline monotonicity, boundary, and closed-state tests. |
| A missing audited component could have been interpreted as weak fit. | Numeric scoring lacked a calculation eligibility gate. | Require both technical and market/delivery evidence; return reason-coded `MISSING` otherwise. | Absence of evidence is neither zero nor negative evidence. | Six calculated / twelve incomplete / 142 unassessed count regressions. |

## Current completion and next gate

Stage 2 is complete only when the audited package, TenderApps explanation surface, registries, model card, saved-Case migration, focused tests, full build, responsive QA, and proportionate suite pass on the named integration branch. The bounded fixture experiment does not increase maturity beyond `concept-or-simulation`: underlying source documents were not freshly replayed, and method approval for production evidence remains outstanding.

Deployment, external integrations, confidential data, canonical Dataset writes, and live representative replay remain separately authorized later stages.
