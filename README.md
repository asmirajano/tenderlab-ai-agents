# TenderLab.ai + Tender Ecosystem Atlas + Tender Apps

Three deliberately separate product surfaces share selected design tokens, stable catalogue IDs,
and canonical contracts without merging their audiences or domain models:

- **TenderLab.ai Command Center** explains and validates the working 64-agent architecture for the internal team and administrators.
- **Tender Ecosystem Atlas** catalogues procurement Sides, Actor Types,
  datasets, providers, terminology, and methodology.
- **Tender Apps** is the separate client-facing product family. Its current
  products are **TenderBalance**, for supplied balance sheets, and **Landed
  Cost Studio**, for Agent 50 logistics and Incoterms costing.

TenderLab.ai is the internal **Command Center** for team members and administrators.
Client users belong only in their assigned Tender App and must never receive a
Command Center route or access grant.

The product boundary is implemented, but the current static TenderLab and Atlas
hosts do not yet enforce staff roles. Treat them as non-confidential validation
surfaces until a trusted identity/tenant authorization layer is added. Separate
origins and hidden links are not authentication.

Agent ↔ Actor ↔ Dataset relationships are intentionally deferred until the
independent catalogues have been validated.

The canonical Case orchestration model is:

`Case → Events + Processes → Agent executions → Outputs / Artifacts`

- **Event** is a bounded occurrence or state change.
- **Process** is continuing work with its own owner, trigger, inputs, Agent
  participation and outputs; it may be persistent, Case-scoped or parallel.
- Artifacts belong to their producing Event or Process and move through typed
  Event↔Process relationships rather than existing as free-floating results.

Production identity is deliberately separated into **Process Definition →
Process Instance → Agent Execution → Artifact**. Tender Ecosystem Atlas exposes
these definitions, Case instances, ownership, lineage and runtime-readiness to
admins at `/orchestration`. It is an admin control/reference surface, not the
execution backend. A production runtime still requires a scheduler/trigger
engine, durable state/checkpoints, dependency resolution, an execution journal,
artifact storage, approvals, observability/recovery and security governance.

## Routes

### TenderLab.ai

- \`/\` — strategic TenderLab.ai overview
- \`/architecture\` — orchestration, agent tiers, platform sides, layers, and handoffs
- \`/agents\` — canonical 64-agent hierarchy and catalog
- \`/case-simulation\` — Validation / Case Audit across the current case portfolio
- \`/products\` — internal Tender Apps product register and management entry
- \`/balance-sheet-review\` — compatibility redirect to the TenderBalance product record

Legacy routes remain compatible: \`/workflow\` resolves to Architecture and
\`/main-agents-run\` resolves to Validation.

### Tender Ecosystem Atlas

- \`/\` — catalogue overview and product boundary
- \`/orchestration\` — admin Process registry, Agent executions, Artifacts and production-readiness gaps
- \`/actors\` — Tender Sides and institutional Actor Types
- \`/data\` — logical datasets, sources/providers, architecture and proprietary assets
- \`/glossary\` — shared terminology with contextual scopes
- \`/methodology\` — identity, maturity and governance rules

### TenderBalance

- independent Vite app under \`apps/tender-balance\`
- local product URL: \`http://127.0.0.1:4175\`
- no Command Center navigation or routes

### TenderApps

TenderApps is an independent Vite application under \`apps/tender-apps\`. Its
root opens **Landed Cost Studio** with Incoterms conversion, standalone
logistics costing, packing/unit planning, scenario comparison, and auditable
exports. It has no link back to the Command Center. The internal header can
open a separately deployed TenderApps origin only when
\`NEXT_PUBLIC_TENDER_APPS_URL\` is configured with an absolute HTTPS URL (or a
localhost URL during development).

Shared packages live under \`packages/\`: \`catalog-schema\`, \`catalog-data\`,
\`design-system\`, and the reusable \`logistics-costing\` calculation kernel. The
Atlas and TenderApps are independent Vite applications under \`apps/\`.

The TenderBalance engine lives in \`packages/tender-balance\`; its app shell is
separate from both internal catalogue products.

The current architecture plan and teammate-proposal audit are recorded in
\`AGENT_ARCHITECTURE_PLAN.md\`.

## Local development

Requires Node.js 22.13 or later and pnpm 11.19.

\`\`\`bash
pnpm install --frozen-lockfile
pnpm dev
pnpm --dir apps/tender-apps dev
\`\`\`

Run the client product separately:

\`\`\`bash
pnpm dev:tender-balance
\`\`\`

## Validation

\`\`\`bash
pnpm lint
pnpm test
\`\`\`

\`pnpm test\` builds all product surfaces, exports the TenderLab strategic pages and
compatibility routes, and verifies published assets, catalogue boundaries,
the client-product boundary, canonical registries, Case methodology, and
semantic search.

The balance-sheet MVP TOR, schema, synthetic fixtures, limitations, and
Quick-Value migration path are documented in
[`docs/balance-sheet-digitization-mvp.md`](docs/balance-sheet-digitization-mvp.md).

## Deployment and access boundary

- The Command Center’s existing ChatGPT Site is custom-access and owner-only.
- Each client product is built and deployed from its own directory and Firebase
  Hosting target. No client bundle includes Command Center navigation.
- Static Hosting is public delivery, even when marked noindex. Production client
  onboarding still requires server-enforced authorization, tenant isolation,
  durable storage, retention, and audit logging.

See \`docs/tender-apps-product-boundary.md\` for the complete access contract.

Firebase Hosting uses named sites in the existing Firebase project. Pushes to
\`main\` are linted, built, and tested before configured sites are updated.

- TenderLab.ai: https://tenderlab-ai-agents.web.app
- Tender Ecosystem Atlas: https://tender-ecosystem-atlas.web.app
- TenderBalance and TenderApps: separate client-product targets
- Firebase project: \`tenderlab-ai-agents\`
- Live deploy targets: \`tenderlab\`, \`ecosystem-atlas\`

All current products are static front-end applications. No paid Firebase services,
Cloud Functions, databases, or server-side compute are enabled.

The original \`.openai/hosting.json\` remains in the repository so the previous
OpenAI Sites deployment can be recovered during the hosting transition.
