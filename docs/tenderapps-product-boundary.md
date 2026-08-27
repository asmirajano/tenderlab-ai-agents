# TenderApps client-product boundary

Status: implemented product separation; deployment and production authorization pending, 2026-08-27

## Naming decision

**TenderApps** is the client-facing product umbrella. It is short, describes a suite rather than one calculator, and avoids conflating client tools with the internal TenderLab Command Center or the Tender Ecosystem Atlas. The first module is **Landed Cost Studio**.

The names describe product surfaces, not new canonical Agents. Landed Cost Studio remains a standalone implementation of `agent:TL-A050` — Cost & Landed-Price Agent — and imports the shared `packages/logistics-costing` kernel.

## Surface contract

| Surface | Audience | Responsibility | Navigation contract |
|---|---|---|---|
| TenderLab.ai Command Center | TenderLab team and administrators | Architecture, Agent registry, validation, review, and future product administration | May open the separate TenderApps origin after `NEXT_PUBLIC_TENDER_APPS_URL` is configured |
| Tender Ecosystem Atlas | Internal architecture/data administration and reference | Dataset, Actor, Process, Artifact, and methodology catalogues | Separate product; not a client execution surface |
| TenderApps | Clients and explicitly authorized support staff | Usable tender applications, starting with Landed Cost Studio | Contains no Command Center route, shell, backlink, or client-side copy of the Command Center pages |

The Command Center launch uses an absolute HTTPS URL, opens a separate origin, and passes no quotation values, client IDs, document IDs, tokens, or other sensitive context in the URL. Local development may use `http://localhost` or `http://127.0.0.1`.

## Build and hosting separation

- Command Center source: `app/`; static export: `dist/firebase`.
- TenderApps source: `apps/tender-apps/`; static build: `apps/tender-apps/dist`.
- Shared deterministic logic: `packages/logistics-costing/`.
- Separate prepared Firebase target: `tender-apps`.
- The TenderApps target has not been mapped to a Firebase site, deployed, or added to the deployment workflow.
- The old Command Center route `/logistics-costing` is not generated or published.

This prevents accidental shell/navigation coupling and permits separate release, domain, CSP, cache, monitoring, and identity policies. It does not by itself authorize users.

## Security truth

The repository currently has no applied tenant/RBAC route guard for TenderLab, Atlas, or TenderApps. Existing Firebase sign-in protects only each user's saved Agent-review records through Firestore rules; it does not protect pages. `app/chatgpt-auth.ts` is dormant and requires a trusted dynamic host that injects verified headers.

Therefore:

1. the current TenderApps build is suitable only for non-confidential prototype data and local calculation;
2. the existing TenderLab and Atlas deployments must not be described as staff-only enforcement merely because their intended audience is internal;
3. sensitive quotations, rates, saved scenarios, source documents, and tenant records must never be embedded in static bundles;
4. production requires authenticated identity, tenant membership, explicit client/admin roles, protected data paths or a trusted backend, negative authorization tests, and deployed/verified security rules;
5. a static password, hidden route, disabled navigation item, or local-storage flag is not an acceptable confidentiality boundary.

## Production handoff requirements

Before any client release:

- map `tender-apps` to a separately approved site/domain;
- enforce staff-only authorization on the Command Center and administrative Atlas surfaces;
- define TenderApps tenant/client/support roles and least-privilege data rules;
- add Firestore/Storage emulator tests for anonymous, cross-tenant, client, support, and administrator access;
- retrieve sensitive inputs only after authorization;
- use backend-issued, short-lived handoff references if a staff member must open an existing client scenario;
- keep sensitive state out of query strings, browser history, referrers, analytics, and static output;
- verify CSP, retention, audit journal, incident recovery, and rule deployment in CI.

No migration, deployment, or publication outside the Tender AI Agents Project was performed in this phase.
