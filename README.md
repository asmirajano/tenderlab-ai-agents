# TenderLab.ai Agent Command Center

Interactive demonstration of a 64-agent tender architecture and a 20-step
Main Agents Run for a furniture company.

## Routes

- \`/\` — Agent Command Center and the full agent architecture
- \`/main-agents-run\` — interactive Main-agent workflow simulation

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

\`pnpm test\` creates the production build, exports the two routes as static
Firebase Hosting pages, and verifies the published HTML and browser assets.

## Deployment

Firebase Hosting serves \`dist/firebase\`. Pushes to \`main\` are linted, built,
and tested by GitHub Actions before the live site is updated.

- Production: https://tenderlab-ai-agents.web.app
- Firebase project: \`tenderlab-ai-agents\`

The app is a front-end demonstration. Its agents and tender data are simulated
in the browser and are not persisted across devices.

The original \`.openai/hosting.json\` remains in the repository so the previous
OpenAI Sites deployment can be recovered during the hosting transition.
