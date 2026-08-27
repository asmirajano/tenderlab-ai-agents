# TenderLab.ai + Tender Ecosystem Atlas + TenderApps

Three deliberately separate products share design tokens, stable catalogue IDs,
and a canonical glossary without merging their domain models:

- **TenderLab.ai Command Center** explains and validates the working 64-agent architecture for the internal team and administrators.
- **Tender Ecosystem Atlas** catalogues procurement Sides, Actor Types,
  datasets, providers, terminology, and methodology.
- **TenderApps** is the separate client-facing product suite. Its first module,
  **Landed Cost Studio**, implements Agent 50 logistics and Incoterms costing
  without exposing Command Center navigation or bundling its route tree.

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

Legacy routes remain compatible: \`/workflow\` resolves to Architecture and
\`/main-agents-run\` resolves to Validation.

### Tender Ecosystem Atlas

- \`/\` — catalogue overview and product boundary
- \`/orchestration\` — admin Process registry, Agent executions, Artifacts and production-readiness gaps
- \`/actors\` — Tender Sides and institutional Actor Types
- \`/data\` — logical datasets, sources/providers, architecture and proprietary assets
- \`/glossary\` — shared terminology with contextual scopes
- \`/methodology\` — identity, maturity and governance rules

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

The current architecture plan and teammate-proposal audit are recorded in
\`AGENT_ARCHITECTURE_PLAN.md\`.

## Local development

Requires Node.js 22.13 or later and pnpm 11.19.

\`\`\`bash
pnpm install --frozen-lockfile
pnpm dev
pnpm --dir apps/tender-apps dev
\`\`\`

## Validation

\`\`\`bash
pnpm lint
pnpm test
\`\`\`

\`pnpm test\` builds all three products, exports the TenderLab strategic pages and
compatibility routes, and verifies published assets, catalogue boundaries,
the client-product boundary, canonical registries, Case methodology, and
semantic search.

## Deployment

Firebase Hosting currently uses two live sites in the existing Firebase
project. Pushes to \`main\` are linted, built, and tested once before those two
sites are updated through named deploy targets.

- TenderLab.ai: https://tenderlab-ai-agents.web.app
- Tender Ecosystem Atlas: https://tender-ecosystem-atlas.web.app
- TenderApps: separate \`tender-apps\` target prepared, **not mapped or deployed**
- Firebase project: \`tenderlab-ai-agents\`
- Live deploy targets: \`tenderlab\`, \`ecosystem-atlas\`

All current products are static front-end applications. No paid Firebase services,
Cloud Functions, databases, or server-side compute are enabled.

The original \`.openai/hosting.json\` remains in the repository so the previous
OpenAI Sites deployment can be recovered during the hosting transition.
