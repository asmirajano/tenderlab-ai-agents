import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const atlasRoot = path.join(projectRoot, "apps", "ecosystem-atlas", "dist");

test("builds the independent Tender Ecosystem Atlas SPA", async () => {
  const html = await readFile(path.join(atlasRoot, "index.html"), "utf8");
  assert.match(html, /<title>Tender Ecosystem Atlas · by TenderLab\.ai<\/title>/);
  assert.match(html, /<html lang="ru">/);
  assert.match(html, /\/assets\/[^"']+\.js/);
  assert.match(html, /\/assets\/[^"']+\.css/);
  await access(path.join(atlasRoot, "favicon.svg"));

  const assetFiles = await readdir(path.join(atlasRoot, "assets"));
  const javascript = await Promise.all(
    assetFiles.filter((file) => file.endsWith(".js")).map((file) => readFile(path.join(atlasRoot, "assets", file), "utf8")),
  );
  const bundle = javascript.join("\n");
  for (const label of ["Agent Specifications", "Real Agents", "Process Operations", "Sides & Actors", "Data & Sources", "Glossary", "Methodology", "Open TenderLab.ai"]) {
    assert.match(bundle, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(bundle, /Independent catalogues\. Validated connections only/);
  assert.match(bundle, /Relationship Registry/);
  assert.match(bundle, /Definition ≠ Instance ≠ Execution attempt/);
  assert.match(bundle, /Scheduler \+ Trigger Engine/);
  assert.match(bundle, /ADMIN FRONT ≠ EXECUTION BACKEND/);
  assert.match(bundle, /dataset=/, "Dataset catalogue should support stable deep links from TenderLab Agent profiles");
});

test("keeps actors, datasets, sources, and glossary as independent canonical registries", async () => {
  const [actors, datasets, glossary, schema] = await Promise.all([
    readFile(path.join(projectRoot, "packages", "catalog-data", "src", "actors.ts"), "utf8"),
    readFile(path.join(projectRoot, "packages", "catalog-data", "src", "datasets.ts"), "utf8"),
    readFile(path.join(projectRoot, "packages", "catalog-data", "src", "glossary.ts"), "utf8"),
    readFile(path.join(projectRoot, "packages", "catalog-schema", "src", "index.ts"), "utf8"),
  ]);

  assert.equal([...actors.matchAll(/^ {2}side\(/gm)].length, 7, "expected seven canonical Tender Sides");
  assert.equal([...actors.matchAll(/^ {2}actor\(/gm)].length, 44, "expected 44 institutional Actor Types");
  assert.equal([...datasets.matchAll(/^ {2}d\(/gm)].length, 102, "expected the comprehensive logical dataset catalogue");
  assert.equal([...datasets.matchAll(/^ {2}"?[A-Z][A-Z0-9-]*"?:\s*tableDemo\(/gm)].length, 102, "expected one structured demo for every dataset");
  assert.match(schema, /demo: DatasetDemo/);
  assert.equal([...datasets.matchAll(/^ {2}source\(/gm)].length, 17, "expected representative source/provider records");
  assert.equal([...glossary.matchAll(/^ {2}term\(/gm)].length, 45, "expected the shared canonical glossary including runtime and Real Agent Development concepts");

  assert.match(schema, /type CatalogueStatus = "draft" \| "validated" \| "deprecated"/);
  assert.match(schema, /catalogueIdPattern/);
  assert.doesNotMatch(actors, /agentIds?|agents:/i, "actor definitions must not embed Agent relationships yet");
  assert.doesNotMatch(datasets, /agentIds?|agents:/i, "dataset definitions must not embed Agent relationships yet");
});

test("uses one responsive semantic typography system across the Atlas", async () => {
  const [tokens, styles] = await Promise.all([
    readFile(path.join(projectRoot, "packages", "design-system", "src", "tokens.css"), "utf8"),
    readFile(path.join(projectRoot, "apps", "ecosystem-atlas", "src", "styles.css"), "utf8"),
  ]);

  for (const token of ["micro", "meta", "secondary", "body", "control", "card-title"]) {
    assert.match(tokens, new RegExp(`--tl-type-${token}:`));
    assert.match(styles, new RegExp(`var\\(--tl-type-${token}\\)`));
  }
  assert.match(styles, /@media \(min-width: 1800px\)/);
  assert.match(styles, /@media \(max-width: 620px\)/);
  assert.match(styles, /\.dataset-table > header[\s\S]*var\(--tl-type-micro\)/);
  assert.match(styles, /\.catalogue-search input[\s\S]*var\(--tl-type-control\)/);
});

test("gives every canonical dataset a stable ID and three structured demo records", async () => {
  const app = await readFile(path.join(projectRoot, "apps", "ecosystem-atlas", "src", "App.tsx"), "utf8");
  const moduleUrl = pathToFileURL(path.join(projectRoot, "packages", "catalog-data", "src", "datasets.ts")).href;
  const { tenderDatasets } = await import(moduleUrl);
  assert.match(app, /<span>DATASET ID<\/span>/, "Dataset profiles must label the canonical ID explicitly");
  assert.match(app, /<header><span>№<\/span><span>DATASET ID<\/span><span>DATASET<\/span>/, "The catalogue must expose sequence and canonical ID as dedicated columns");
  assert.match(app, /function datasetSequence\(dataset: TenderDataset\)/, "Dataset sequence must be derived from the canonical registry order");
  assert.equal(tenderDatasets.length, 102);
  assert.equal(new Set(tenderDatasets.map((item) => item.id)).size, 102);
  for (const item of tenderDatasets) {
    assert.match(item.id, /^dataset:TEA-DS-[A-Z0-9-]+$/);
    assert.ok(item.demo.columns.length >= 3, `${item.id} needs representative columns`);
    assert.equal(item.demo.rows.length, 3, `${item.id} needs exactly three rows`);
    assert.ok(item.demo.rows.every((row) => row.length === item.demo.columns.length), `${item.id} demo rows must match its columns`);
    assert.match([...item.demo.columns, ...item.demo.rows.flat()].join(" "), /[А-Яа-яЁё]/, `${item.id} needs Russian demo data`);
  }
});

test("expresses Process as an admin-governed element without pretending the Atlas is the runtime", async () => {
  const [app, processModel, caseGraph] = await Promise.all([
    readFile(path.join(projectRoot, "apps", "ecosystem-atlas", "src", "App.tsx"), "utf8"),
    readFile(path.join(projectRoot, "app", "process-model.ts"), "utf8"),
    readFile(path.join(projectRoot, "app", "case-simulation", "case-1-graph.ts"), "utf8"),
  ]);
  assert.match(app, /href: "\/orchestration"/);
  assert.match(app, /case1ProcessGraph\.processes\.map/);
  assert.match(app, /Process Definition Registry/);
  assert.match(app, /Process Instance \/ Run/);
  assert.match(app, /Agent Execution Journal/);
  assert.match(app, /ADMIN FRONT ≠ EXECUTION BACKEND/);
  assert.match(processModel, /kind: "persistent" \| "case-scoped" \| "parallel"/);
  assert.match(processModel, /producerKind: "event" \| "process"/);
  assert.match(caseGraph, /processAgentExecutions/);
  assert.doesNotMatch(app, /const processes\s*=\s*\[/, "Atlas must project the canonical Case graph rather than duplicate Process data");
});

test("projects all Agent surfaces from one typed, versioned canonical registry", async () => {
  const [{ agents, agentSpecifications }, { agentRelationships }, { agentRevisions }] = await Promise.all([
    import(pathToFileURL(path.join(projectRoot, "packages", "catalog-data", "src", "agents.ts")).href),
    import(pathToFileURL(path.join(projectRoot, "packages", "catalog-data", "src", "agent-relationships.ts")).href),
    import(pathToFileURL(path.join(projectRoot, "packages", "catalog-data", "src", "agent-revisions.ts")).href),
  ]);
  assert.strictEqual(agents, agentSpecifications, "the legacy agents export must be an alias, not a second registry");
  assert.equal(agentSpecifications.length, 64);
  assert.equal(new Set(agentSpecifications.map((agent) => agent.registryId)).size, 64);
  assert.equal(new Set(agentSpecifications.map((agent) => agent.slug)).size, 64);
  assert.ok(agentRelationships.length > 64, "typed Agent relationships should be available");
  assert.equal(agentRevisions.filter((revision) => revision.toVersion === "1.0.0").length, 64);

  const artifactDirectory = path.join(atlasRoot, "agent-specifications");
  const files = await readdir(artifactDirectory);
  assert.equal(files.filter((file) => file.endsWith(".md")).length, 64);
  const artifact = JSON.parse(await readFile(path.join(artifactDirectory, "index.json"), "utf8"));
  assert.equal(artifact.count, 64);
  assert.match(artifact.maintenancePolicy, /GENERATED READ-ONLY/);
  assert.equal(artifact.sourceOfTruth, "packages/catalog-data/src/agents.ts#agentSpecifications");

  const reviewed = agentSpecifications.find((agent) => agent.id === 13);
  const generated = artifact.specifications.find((agent) => agent.id === 13);
  assert.equal(generated.name, reviewed.name);
  assert.equal(generated.governance.specificationVersion, reviewed.governance.specificationVersion);
  assert.deepEqual(generated.previousNames, reviewed.previousNames);
  assert.match(await readFile(path.join(artifactDirectory, `${reviewed.slug}.md`), "utf8"), new RegExp(reviewed.name));
});

test("integrates the six approved Dataset Gap candidates without duplicating canonical identities", async () => {
  const moduleUrl = pathToFileURL(path.join(projectRoot, "packages", "catalog-data", "src", "datasets.ts")).href;
  const { tenderDatasets } = await import(moduleUrl);
  const expected = new Map([
    ["dataset:TEA-DS-COMPANY-READINESS-ASSESSMENTS", "Company Tender Readiness Assessments"],
    ["dataset:TEA-DS-COMPANY-TENDER-OPPORTUNITY-ASSESSMENTS", "Company × Tender Opportunity Assessments"],
    ["dataset:TEA-DS-PARTICIPATION-DECISIONS", "Tender Participation Decision Records"],
    ["dataset:TEA-DS-CANDIDATE-ASSESSMENTS", "Tender Sourcing & Partner Candidate Assessments"],
    ["dataset:TEA-DS-SUPPLIER-RFQ-QUOTATIONS", "Supplier RFQ & Quotation Dataset"],
    ["dataset:TEA-DS-BID-COMPLIANCE-ASSURANCE", "Bid Compliance & Assurance Records"],
  ]);
  for (const [id, name] of expected) {
    const dataset = tenderDatasets.find((item) => item.id === id);
    assert.ok(dataset, `${id} must exist`);
    assert.equal(dataset.name.en, name);
    assert.equal(dataset.origin, "internal");
    assert.equal(dataset.demo.rows.length, 3);
  }
  const bids = tenderDatasets.find((item) => item.id === "dataset:TEA-DS-BIDS");
  assert.match(bids.contains, /Draft, approved и submitted/);
  assert.match(bids.contains, /structured solution configuration/);
  assert.match(bids.demo.columns.join(" "), /Версия \/ state/);
});
