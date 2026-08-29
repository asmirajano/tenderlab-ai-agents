# TenderApps client-product boundary

Status: unified client application implemented; static deployment is not production authorization, 2026-08-27

## Naming decision

**Tender Apps** is the single client-facing application for practical Agents. Each practical capability receives a dedicated page inside the shared application rather than a new app or origin. Current pages are **TenderBalance**, **TENDER LOGISTICS COST**, and **TenderBoost AI**.

The page names describe client experiences, not new canonical identities. TenderBalance remains a bounded implementation of `agent:TL-A008`; TENDER LOGISTICS COST remains the user-facing name of `agent:TL-A050`; TenderBoost AI is provisionally placed under `agent:TL-A031`. “Agent 03” is its practical page order, not `agent:TL-A003`, and does not change the canonical 64-Agent registry. Their reusable logic remains in shared packages.

## Surface contract

| Surface | Audience | Responsibility | Navigation contract |
|---|---|---|---|
| TenderLab.ai Command Center | TenderLab team and administrators | Architecture, Agent registry, validation, review, and future product administration | May open the separate TenderApps origin after `NEXT_PUBLIC_TENDER_APPS_URL` is configured |
| Tender Ecosystem Atlas | Internal architecture/data administration and reference | Dataset, Actor, Process, Artifact, and methodology catalogues | Separate product; not a client execution surface |
| Tender Apps | Clients and explicitly authorized support staff | Unified practical-Agent catalog and dedicated workflow pages | Contains no Command Center route, shell, backlink, or client-side copy of the Command Center pages |

The Command Center launch uses an absolute HTTPS URL, opens a separate origin, and passes no quotation values, client IDs, document IDs, tokens, or other sensitive context in the URL. Local development may use `http://localhost` or `http://127.0.0.1`.

## Build and hosting separation

- Command Center source: `app/`; static export: `dist/firebase`.
- Tender Apps source: `apps/tender-apps/`; static build: `apps/tender-apps/dist`.
- Page routes: `/`, `/balance-sheet-review`, `/landed-cost`, and `/tenderboost`; `/tenderboost-ai` is a shared-client compatibility alias.
- Shared deterministic logic: `packages/tender-balance/`, `packages/logistics-costing/`, and `packages/tenderboost/`.
- One Firebase target: `tender-apps` → `tenderapps-ai`.
- Historic product-specific sites are redirects into the corresponding page on the unified origin.
- The old Command Center route `/logistics-costing` is not generated or published.

This prevents accidental shell/navigation coupling and permits separate release, domain, CSP, cache, monitoring, and identity policies. It does not by itself authorize users.

TenderBoost currently uses a dated, non-confidential demonstration snapshot with absolute deadlines, explicit Case/result identity, evidence-linked legacy match inputs, consultant decisions, and non-sending campaign drafts. It does not implement live tender refresh, outreach, response tracking, durable campaign storage, consent/suppression services, or tenant authorization. Its bounded contract is `docs/tenderboost-agent-03-integration.md`.

## Security truth

The repository currently has no applied tenant/RBAC route guard for TenderLab, Atlas, or TenderApps. Existing Firebase sign-in protects only each user's saved Agent-review records through Firestore rules; it does not protect pages. `app/chatgpt-auth.ts` is dormant and requires a trusted dynamic host that injects verified headers.

Therefore:

1. the current TenderApps build is suitable only for non-confidential prototype data and local calculation;
2. the existing TenderLab and Atlas deployments must not be described as staff-only enforcement merely because their intended audience is internal;
3. sensitive quotations, rates, saved scenarios, source documents, and tenant records must never be embedded in static bundles;
4. production requires authenticated identity, tenant membership, explicit client/admin roles, protected data paths or a trusted backend, negative authorization tests, and deployed/verified security rules;
5. a static password, hidden route, disabled navigation item, or local-storage flag is not an acceptable confidentiality boundary.

## Production handoff requirements

Before any confidential client release:

- retain one approved Tender Apps origin and route-level tenant authorization;
- enforce staff-only authorization on the Command Center and administrative Atlas surfaces;
- define TenderApps tenant/client/support roles and least-privilege data rules;
- add Firestore/Storage emulator tests for anonymous, cross-tenant, client, support, and administrator access;
- retrieve sensitive inputs only after authorization;
- use backend-issued, short-lived handoff references if a staff member must open an existing client scenario;
- keep sensitive state out of query strings, browser history, referrers, analytics, and static output;
- verify CSP, retention, audit journal, incident recovery, and rule deployment in CI.

The current Command Center and Tender Apps Firebase releases are public,
search-hidden static MVPs for testing. They are not access-controlled and must
not receive confidential client evidence. Staff-only administrator authorization
remains a production prerequisite.
