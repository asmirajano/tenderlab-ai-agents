import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const moduleUrl = (relativePath) => pathToFileURL(path.join(projectRoot, relativePath)).href;

const [{ agents }, { clientProducts }, knowledge, validator] = await Promise.all([
  import(moduleUrl("packages/catalog-data/src/agents.ts")),
  import(moduleUrl("packages/catalog-data/src/client-products.ts")),
  import(moduleUrl("packages/catalog-data/src/real-agent-development.ts")),
  import(moduleUrl("packages/catalog-data/src/validate.ts")),
]);

const {
  realAgentImplementations,
  realAgentLessons,
  realAgentReusablePatterns,
} = knowledge;

test("registers Real Agent implementations with stable Agent and product identities", () => {
  assert.deepEqual(validator.validateRealAgentDevelopmentKnowledge(), {
    implementations: 3,
    patterns: 6,
    lessons: 9,
  });
  assert.equal(realAgentImplementations.length, 3);
  assert.equal(new Set(realAgentImplementations.map((item) => item.id)).size, 3);
  assert.equal(new Set(realAgentImplementations.map((item) => item.slug)).size, 3);

  const agentIds = new Set(agents.map((item) => item.registryId));
  const productsById = new Map(clientProducts.map((item) => [item.id, item]));
  for (const implementation of realAgentImplementations) {
    assert.match(implementation.id, /^implementation:TEA-RAI-[A-Z0-9-]+$/);
    assert.ok(agentIds.has(implementation.ownerAgentId));
    assert.equal(productsById.get(implementation.clientProductId)?.ownerAgentId, implementation.ownerAgentId);
    if (implementation.id === "implementation:TEA-RAI-TENDERBOOST") {
      assert.equal(implementation.name, "TenderMatch · TenderApps Agent 03");
      assert.equal(implementation.slug, "tendermatch");
      assert.equal(implementation.ownerAgentId, "agent:TL-A031");
      assert.doesNotMatch(implementation.primaryOutput, /campaign|outreach|crm/i);
      assert.match(implementation.tor, /matching-only human-review workspace/i);
      assert.ok(implementation.knownLimitations.some((item) => /Historical Campaign Studio and follow-up simulation pages were removed[\s\S]+Git\/source history/i.test(item)));
      assert.equal(implementation.maturity, "concept-or-simulation");
      assert.equal(implementation.evidenceStrength, "unit-or-synthetic-fixture");
      assert.equal(implementation.deploymentStatus, "not-deployed");
    } else {
      assert.equal(implementation.maturity, "validated-client-workflow");
      assert.equal(implementation.deploymentStatus, "deployed-test-surface");
    }
    assert.equal(implementation.runtimeReadiness, "static-client-workflow");
    assert.notEqual(implementation.maturity, "enterprise-runtime");
    assert.ok(implementation.primaryInputs.length > 0);
    assert.ok(implementation.primaryOutput);
    assert.ok(implementation.knownLimitations.length > 0);
    assert.ok(implementation.methodRefs.includes("docs/real-tender-agent-development-methodology.md"));
    assert.ok(implementation.playbookRefs.length > 0);
  }
});

test("keeps reusable patterns and lessons linked bidirectionally to implementation evidence", () => {
  assert.equal(realAgentReusablePatterns.length, 6);
  assert.equal(realAgentLessons.length, 9);
  assert.equal(new Set(realAgentReusablePatterns.map((item) => item.id)).size, 6);
  assert.equal(new Set(realAgentLessons.map((item) => item.id)).size, 9);

  const implementationById = new Map(realAgentImplementations.map((item) => [item.id, item]));
  for (const pattern of realAgentReusablePatterns) {
    assert.equal(pattern.status, "validated");
    assert.ok(pattern.confirmedByImplementationIds.length > 0);
    assert.ok(pattern.methodologyGateIds.length > 0);
    for (const id of pattern.confirmedByImplementationIds) {
      assert.ok(implementationById.get(id)?.patternIds.includes(pattern.id));
    }
  }

  for (const lesson of realAgentLessons) {
    assert.ok(lesson.regressionRefs.length > 0);
    if (lesson.evidenceScope === "multiple-implementations") assert.ok(lesson.implementationIds.length >= 2);
    if (lesson.classification === "agent-specific") assert.ok(lesson.playbookRefs.length > 0);
    for (const id of lesson.implementationIds) {
      assert.ok(implementationById.get(id)?.lessonIds.includes(lesson.id));
    }
  }
});

test("projects the canonical knowledge registries into one Atlas area without JSX duplicates", async () => {
  const [app, agentSpecifications, styles, validator] = await Promise.all([
    readFile(path.join(projectRoot, "apps/ecosystem-atlas/src/App.tsx"), "utf8"),
    readFile(path.join(projectRoot, "apps/ecosystem-atlas/src/AgentSpecifications.tsx"), "utf8"),
    readFile(path.join(projectRoot, "apps/ecosystem-atlas/src/styles.css"), "utf8"),
    readFile(path.join(projectRoot, "packages/catalog-data/src/validate.ts"), "utf8"),
  ]);

  assert.match(app, /href: "\/real-agents", label: "Real Agents"/);
  assert.match(app, /From Agent Strategy/);
  assert.match(app, /Implementations/);
  assert.match(app, /Reusable Patterns/);
  assert.match(app, /Lessons Learned/);
  assert.match(app, /realAgentImplementations\.map/);
  assert.match(app, /implementation\.deploymentStatus !== "not-deployed"/);
  assert.match(app, /local integration only/);
  assert.match(app, /realAgentReusablePatterns\.map/);
  assert.doesNotMatch(app, /implementation:TEA-RAI-/, "implementation identities belong only in the registry");
  assert.match(agentSpecifications, /realAgentImplementationsForAgent/);
  assert.match(agentSpecifications, /Open implementation dossier/);
  assert.match(styles, /\.real-agent-view-nav/);
  assert.match(styles, /@media \(max-width: 620px\)[\s\S]*\.real-agent-bridge/);
  assert.match(validator, /validateRealAgentDevelopmentKnowledge/);
  assert.match(validator, /overstates its evidence scope/);
  assert.match(validator, /inflates static workflow maturity/);
});

test("keeps human-facing Atlas knowledge separate from Codex instructions and domain playbooks", async () => {
  const registry = await readFile(path.join(projectRoot, "packages/catalog-data/src/real-agent-development.ts"), "utf8");
  assert.match(registry, /docs\/real-tender-agent-development-methodology\.md/);
  assert.match(registry, /docs\/balance-sheet-digitization-mvp\.md/);
  assert.match(registry, /docs\/contract-logistics-incoterms-architecture\.md/);
  assert.match(registry, /Retained as TenderBalance playbook knowledge/);
  assert.match(registry, /Retained as Logistics playbook knowledge/);
  assert.doesNotMatch(registry, /C:\\Users|OneDrive|uploaded-[a-f0-9]+/i, "Atlas knowledge must not embed local or client-document paths");
});
