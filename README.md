# TenderLab.ai Agent Architecture

Strategic explanation and validation environment for a working 64-agent tender
architecture. The presentation moves from the system overview to orchestration,
the canonical agent catalog, and case-based architecture validation.

## Routes

- \`/\` — strategic TenderLab.ai overview
- \`/architecture\` — orchestration, agent tiers, platform sides, layers, and handoffs
- \`/agents\` — canonical 64-agent hierarchy and catalog
- \`/case-simulation\` — Validation / Case Audit, currently limited to Case 1

Legacy routes remain compatible: \`/workflow\` resolves to Architecture and
\`/main-agents-run\` resolves to Validation.

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

\`pnpm test\` creates the production build, exports the strategic pages and
compatibility routes as static Firebase Hosting pages, and verifies the
published HTML, canonical registry, Case 1 methodology, and browser assets.

## Deployment

Firebase Hosting serves \`dist/firebase\`. Pushes to \`main\` are linted, built,
and tested by GitHub Actions before the live site is updated.

- Production: https://tenderlab-ai-agents.web.app
- Firebase project: \`tenderlab-ai-agents\`

The app is a front-end demonstration. Its agents and tender data are simulated
in the browser and are not persisted across devices.

The original \`.openai/hosting.json\` remains in the repository so the previous
OpenAI Sites deployment can be recovered during the hosting transition.
