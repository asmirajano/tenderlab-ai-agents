# Tender Apps product boundary

## Naming decision

**Tender Apps** is the client-product family. **TenderBalance** is its first product, described as “verified balance-sheet digitization.”

This keeps the architecture coherent:

- Tender Ecosystem is the overall strategy and shared domain;
- TenderLab Command Center is the internal strategy, architecture, governance, and administration surface;
- Tender Apps is the monetizable client-product family;
- TenderBalance is one focused client app, backed by the existing TL-A008 specialized capability.

“Tender Intelligence” is retained as a broader capability/category term. It is too wide for a product whose TOR intentionally stops at balance-sheet digitization and approval.

## Access and navigation contract

| Surface | Allowed audience | May link to | Must not expose |
|---|---|---|---|
| Command Center | TenderLab team and administrators | Client products | Access to unapproved users |
| TenderBalance | Assigned client users and authorized reviewers | Its own review/export workflow | Command Center routes, strategy, Agent catalog, admin navigation |

Required production controls:

1. Use separate origins and separately deployable builds.
2. Enforce Command Center membership at the hosting/dispatch layer. Client-side hiding is not authorization.
3. Enforce client-app authentication and tenant/document authorization server-side.
4. Never reuse the Command Center allowlist for client users.
5. Permit one-way operational links from Command Center to TenderBalance; do not render Command Center links in TenderBalance.
6. Keep document storage, audit logs, and export permissions tenant-scoped.

## Current repository state

- The Command Center app is the root Vinext build.
- TenderBalance is the independent Vite app in `apps/tender-balance`.
- Its UI-agnostic extraction/review engine is in `packages/tender-balance`.
- `/products` is the internal product register.
- `/balance-sheet-review` is a legacy Command Center route that redirects to the product register; it no longer contains the client workspace.
- The existing ChatGPT Site access policy was verified as custom, owner-only, and without external visitors on 2026-08-27.
- The public Firebase workflow no longer deploys the Command Center target. Any historic public Command Center deployment must be explicitly disabled or replaced before client onboarding.
- The historic `tenderlab-ai-agents.web.app` root still returned the Command Center with HTTP 200 in an unauthenticated check on 2026-08-27. This is a known access violation until that legacy hosting target is decommissioned; no client onboarding should occur beforehand.

## Production gate

This change deliberately does not claim production security. TenderBalance remains a local/static MVP until an approved hosting environment supplies server-enforced identity, organization membership, tenant isolation, durable storage, retention, malware scanning, and audit logging. Publishing and external-system writes remain out of scope.
