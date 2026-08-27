# TenderLab.ai + Tender Ecosystem Atlas + Tender Apps

Three deliberately separate product surfaces share selected design tokens, stable catalogue IDs,
and canonical contracts without merging their audiences or domain models:

- **TenderLab.ai** explains and validates the working 64-agent architecture.
- **Tender Ecosystem Atlas** catalogues procurement Sides, Actor Types,
  datasets, providers, terminology, and methodology.
- **Tender Apps** is the client-product family. Its first standalone app,
  **TenderBalance**, digitizes and verifies supplied balance sheets.

TenderLab.ai is the internal **Command Center** for team members and administrators.
Client users belong only in their assigned Tender App and must never receive a
Command Center route or access grant.

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
- \`/case-simulation\` — Validation / Case Audit, currently limited to Case 1
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

Shared packages live under \`packages/\`: \`catalog-schema\`, \`catalog-data\`,
and \`design-system\`. The Atlas is an independent Vite application under
\`apps/ecosystem-atlas\`.

The TenderBalance engine lives in \`packages/tender-balance\`; its app shell is
separate from both internal catalogue products.

The current architecture plan and teammate-proposal audit are recorded in
\`AGENT_ARCHITECTURE_PLAN.md\`.

## Local development

Requires Node.js 22.13 or later and pnpm 11.19.

\`\`\`bash
pnpm install --frozen-lockfile
pnpm dev
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

\`pnpm test\` builds all three product surfaces, exports the TenderLab strategic pages and
compatibility routes, and verifies published assets, catalogue boundaries,
canonical registries, Case 1 methodology, and semantic search.

The balance-sheet MVP TOR, schema, synthetic fixtures, limitations, and
Quick-Value migration path are documented in
[`docs/balance-sheet-digitization-mvp.md`](docs/balance-sheet-digitization-mvp.md).

## Deployment and access boundary

- The Command Center’s existing ChatGPT Site is custom-access and owner-only.
- The public Firebase workflow deploys only Tender Ecosystem Atlas. The legacy
  public TenderLab target is no longer updated and must be disabled before any
  client onboarding.
- TenderBalance is intentionally local-only at this stage. A pilot deployment
  must use its own origin, server-enforced client/reviewer authorization, tenant
  isolation, durable storage, retention, and audit logging.
- Publishing and deployment of TenderBalance are out of scope for this MVP.

See \`docs/tender-apps-product-boundary.md\` for the complete access contract.
