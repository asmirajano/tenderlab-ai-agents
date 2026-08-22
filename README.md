# TenderLab.ai + Tender Ecosystem Atlas

Two deliberately separate products share design tokens, stable catalogue IDs,
and a canonical glossary without merging their domain models:

- **TenderLab.ai** explains and validates the working 64-agent architecture.
- **Tender Ecosystem Atlas** catalogues procurement Sides, Actor Types,
  datasets, providers, terminology, and methodology.

Agent ↔ Actor ↔ Dataset relationships are intentionally deferred until the
independent catalogues have been validated.

## Routes

### TenderLab.ai

- \`/\` — strategic TenderLab.ai overview
- \`/architecture\` — orchestration, agent tiers, platform sides, layers, and handoffs
- \`/agents\` — canonical 64-agent hierarchy and catalog
- \`/case-simulation\` — Validation / Case Audit, currently limited to Case 1

Legacy routes remain compatible: \`/workflow\` resolves to Architecture and
\`/main-agents-run\` resolves to Validation.

### Tender Ecosystem Atlas

- \`/\` — catalogue overview and product boundary
- \`/actors\` — Tender Sides and institutional Actor Types
- \`/data\` — logical datasets, sources/providers, architecture and proprietary assets
- \`/glossary\` — shared terminology with contextual scopes
- \`/methodology\` — identity, maturity and governance rules

Shared packages live under \`packages/\`: \`catalog-schema\`, \`catalog-data\`,
and \`design-system\`. The Atlas is an independent Vite application under
\`apps/ecosystem-atlas\`.

The current architecture plan and teammate-proposal audit are recorded in
\`AGENT_ARCHITECTURE_PLAN.md\`.

## Local development

Requires Node.js 22.13 or later and pnpm 11.19.

\`\`\`bash
pnpm install --frozen-lockfile
pnpm dev
\`\`\`

## Validation

\`\`\`bash
pnpm lint
pnpm test
\`\`\`

\`pnpm test\` builds both products, exports the TenderLab strategic pages and
compatibility routes, and verifies published assets, catalogue boundaries,
canonical registries, Case 1 methodology, and semantic search.

## Deployment

Firebase Hosting uses two free Hosting sites in the existing Firebase project.
Pushes to \`main\` are linted, built, and tested once before both live sites are
updated through named deploy targets.

- TenderLab.ai: https://tenderlab-ai-agents.web.app
- Tender Ecosystem Atlas: https://tender-ecosystem-atlas.web.app
- Firebase project: \`tenderlab-ai-agents\`
- Deploy targets: \`tenderlab\`, \`ecosystem-atlas\`

Both products are static front-end applications. No paid Firebase services,
Cloud Functions, databases, or server-side compute are enabled.

The original \`.openai/hosting.json\` remains in the repository so the previous
OpenAI Sites deployment can be recovered during the hosting transition.
