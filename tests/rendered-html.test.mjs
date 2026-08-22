import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publishRoot = path.join(projectRoot, "dist", "firebase");

async function readPublished(relativePath) {
  return readFile(path.join(publishRoot, relativePath), "utf8");
}

test("exports all five TenderLab pages as static HTML", async () => {
  const [home, workflow, agentsPage, run, caseSimulation] = await Promise.all([
    readPublished("index.html"),
    readPublished("workflow.html"),
    readPublished("agents.html"),
    readPublished("main-agents-run.html"),
    readPublished("case-simulation.html"),
  ]);

  assert.match(home, /<title>TenderLab\.ai/);
  assert.match(home, /<h1>Agent Command Center/);
  assert.match(home, /href="\/main-agents-run"/);
  assert.match(home, /aria-current="page"[^>]+href="\/"/);
  assert.doesNotMatch(home, /AGENT ARCHITECTURE/);
  assert.doesNotMatch(home, /Context routes the workflow/);

  assert.match(workflow, /Context routes the workflow/);
  assert.match(workflow, /TenderLab Orchestrator/);
  assert.match(workflow, /aria-current="page"[^>]+href="\/workflow"/);
  assert.doesNotMatch(workflow, /<h1>Agent Command Center/);
  assert.doesNotMatch(workflow, /AGENT ARCHITECTURE/);

  assert.match(agentsPage, /AGENT ARCHITECTURE/);
  assert.match(agentsPage, /Tender Readiness Score Agent/);
  assert.match(agentsPage, />Flat</);
  assert.match(agentsPage, />Hierarchy</);
  assert.match(agentsPage, /aria-label="Architecture view"/);
  assert.match(agentsPage, /USED IN \/ PLATFORM SIDE/);
  assert.match(agentsPage, /aria-label="Filter by platform side"/);
  assert.match(agentsPage, />Command Center(?:<!-- -->)? <b>44<\/b>/);
  assert.match(agentsPage, />Client Side(?:<!-- -->)? <b>45<\/b>/);
  assert.match(agentsPage, />Backend(?:<!-- -->)? <b>14<\/b>/);
  assert.match(agentsPage, />Shared(?:<!-- -->)? <b>39<\/b>/);
  assert.match(agentsPage, /aria-current="page"[^>]+href="\/agents"/);
  assert.doesNotMatch(agentsPage, /<h1>Agent Command Center/);
  assert.doesNotMatch(agentsPage, /Context routes the workflow/);

  assert.match(run, /Main Agents Run/);
  assert.match(run, /TenderLab Orchestrator/);
  assert.match(run, /Tender Readiness Score Agent/);
  assert.match(run, /aria-current="page"[^>]+href="\/main-agents-run"/);

  assert.match(caseSimulation, /Case Simulation/);
  assert.match(caseSimulation, /Agent Engagement/);
  assert.match(caseSimulation, /Международная поставка школьной мебели/);
  assert.match(caseSimulation, /Anatolia Workspace A\.Ş\./);
  assert.match(caseSimulation, /aria-controls="case-1-content"/);
  assert.match(caseSimulation, /aria-expanded="true"/);
  assert.match(caseSimulation, /Хронология событий — Case 1/);
  assert.match(caseSimulation, /Заказчик публикует международную закупку/);
  assert.match(caseSimulation, /Контракт исполняется и результат возвращается в систему/);
  assert.match(caseSimulation, /64 архитектурных роли/);
  assert.match(caseSimulation, /CASE 01 · ACTIVE/);
  assert.match(caseSimulation, /CASE (?:<!-- -->)?10/);
  assert.match(caseSimulation, /aria-current="page"[^>]+href="\/case-simulation"/);

  for (const html of [home, workflow, agentsPage, run, caseSimulation]) {
    assert.match(html, /<html[^>]*lang="ru"/);
    assert.match(html, /<script[^>]+src="\/_next\/static\/chunks\//);
    assert.doesNotMatch(html, /codex-preview/);
    assert.doesNotMatch(html, /Your site is taking shape/);
  }
});

test("includes every browser asset referenced by the exported pages", async () => {
  const pages = await Promise.all([
    readPublished("index.html"),
    readPublished("workflow.html"),
    readPublished("agents.html"),
    readPublished("main-agents-run.html"),
    readPublished("case-simulation.html"),
  ]);
  const referencedAssets = new Set();

  for (const html of pages) {
    for (const match of html.matchAll(/(?:src|href)="(\/_next\/[^"?#]+|\/[^"?#]+\.(?:png|svg|woff2))[^"]*"/g)) {
      referencedAssets.add(match[1]);
    }
  }

  assert.ok(referencedAssets.size > 4, "expected scripts, styles, fonts, and images");
  await Promise.all(
    [...referencedAssets].map((asset) => access(path.join(publishRoot, asset.slice(1)))),
  );
});

test("defines concrete output metadata for all 64 agents", async () => {
  const source = await readFile(path.join(projectRoot, "app", "page.tsx"), "utf8");
  const agentRecords = [...source.matchAll(/^ {2}\{ id: (\d+), name: [^\n]+$/gm)];
  assert.equal(agentRecords.length, 64, "expected 64 canonical agent records");

  for (const match of agentRecords) {
    const agentId = Number(match[1]);
    const record = match[0];
    const primary = record.match(/primary: "([^"]+)"/)?.[1];
    const artifacts = record.match(/artifacts: \[([^\]]+)\]/)?.[1];
    const consumers = record.match(/consumers: "([^"]+)"/)?.[1];
    assert.ok(primary && primary.length > 12, `agent ${agentId} needs a specific primary output`);
    assert.ok(artifacts && [...artifacts.matchAll(/"[^"]+"/g)].length >= 3, `agent ${agentId} needs concrete artifacts`);
    assert.ok(consumers && consumers.length > 8, `agent ${agentId} needs downstream consumers`);
    assert.doesNotMatch(primary, /analysis completed|result generated|анализ завершён|результат создан/i);
  }
});

test("classifies all 64 agents by audited platform use", async () => {
  const source = await readFile(path.join(projectRoot, "app", "page.tsx"), "utf8");
  const mapping = source.match(/const platformSidesByAgentId:[^{]+\{([\s\S]*?)\n\};/)?.[1];
  assert.ok(mapping, "expected canonical platform-side mapping");

  const entries = [...mapping.matchAll(/(\d+): \[([^\]]+)\]/g)].map((match) => ({
    id: Number(match[1]),
    sides: [...match[2].matchAll(/"([^"]+)"/g)].map((side) => side[1]),
  }));
  assert.equal(entries.length, 64, "expected one platform-side record per agent");
  assert.deepEqual(entries.map((entry) => entry.id).sort((a, b) => a - b), Array.from({ length: 64 }, (_, index) => index + 1));

  const allowedSides = new Set(["command-center", "client-side", "backend"]);
  for (const entry of entries) {
    assert.ok(entry.sides.length > 0, `agent ${entry.id} needs a platform side`);
    assert.ok(entry.sides.every((side) => allowedSides.has(side)), `agent ${entry.id} has an invalid platform side`);
    if (entry.sides.includes("backend")) assert.equal(entry.sides.length, 1, `agent ${entry.id} must be Backend-only`);
  }

  assert.equal(entries.filter((entry) => entry.sides.includes("command-center")).length, 44);
  assert.equal(entries.filter((entry) => entry.sides.includes("client-side")).length, 45);
  assert.equal(entries.filter((entry) => entry.sides.includes("backend")).length, 14);
  assert.equal(entries.filter((entry) => entry.sides.length > 1).length, 39);
});

test("defines an individual rationale for every agent and assigned platform side", async () => {
  const source = await readFile(path.join(projectRoot, "app", "page.tsx"), "utf8");
  const sideMapping = source.match(/const platformSidesByAgentId:[^{]+\{([\s\S]*?)\n\};/)?.[1];
  const rationaleMapping = source.match(/const platformRationaleByAgentId:[^{]+\{([\s\S]*?)\n\};/)?.[1];
  assert.ok(sideMapping && rationaleMapping, "expected platform-side and rationale registries");

  const sidesByAgent = new Map(
    [...sideMapping.matchAll(/(\d+): \[([^\]]+)\]/g)].map((match) => [
      Number(match[1]),
      [...match[2].matchAll(/"([^"]+)"/g)].map((side) => side[1]).sort(),
    ]),
  );
  const rationaleRecords = [...rationaleMapping.matchAll(/^ {2}(\d+): \{([\s\S]*?)(?=^ {2}\d+: \{|(?![\s\S]))/gm)];
  assert.equal(rationaleRecords.length, 64, "expected one rationale record per agent");

  const allRationales = [];
  for (const record of rationaleRecords) {
    const agentId = Number(record[1]);
    const rationaleEntries = [...record[2].matchAll(/"?(command-center|client-side|backend)"?: "([^"]+)"/g)];
    const rationaleSides = rationaleEntries.map((entry) => entry[1]).sort();
    assert.deepEqual(rationaleSides, sidesByAgent.get(agentId), `agent ${agentId} rationales must match assigned sides`);
    for (const entry of rationaleEntries) {
      assert.ok(entry[2].length > 60, `agent ${agentId} needs a specific platform rationale`);
      assert.doesNotMatch(entry[2], /используется здесь|нужен пользователям|работает на платформе|общая поддержка/i);
      allRationales.push(entry[2]);
    }
  }

  assert.equal(allRationales.length, 103, "expected separate Command Center and Client Side rationales for Shared agents");
  assert.equal(new Set(allRationales).size, allRationales.length, "platform rationales must not be duplicated");
  assert.match(source, /PLATFORM ROLE \/ WHY/);
});

test("orders the agent detail drawer as one progressive profile", async () => {
  const source = await readFile(path.join(projectRoot, "app", "page.tsx"), "utf8");
  const drawer = source.match(/\{selectedAgent && \(([\s\S]*?)<\/aside>/)?.[1];
  assert.ok(drawer, "expected the individual agent detail drawer");

  const progressiveSections = [
    'className="drawer-identity"',
    "<AgentPlatformRationale",
    'className="drawer-process"',
    "<AgentDrawerOutput",
    'className="sim-example"',
    "<AgentOperationalMetadata",
  ];
  const positions = progressiveSections.map((section) => drawer.indexOf(section));
  assert.ok(positions.every((position) => position >= 0), "every profile section must remain present");
  assert.deepEqual([...positions].sort((a, b) => a - b), positions, "profile sections must follow the intended information hierarchy");
  assert.match(drawer, /PURPOSE/);
  assert.match(drawer, /HOW IT WORKS/);
  assert.match(drawer, /REALISTIC EXAMPLE/);
  assert.match(source, /ИСПОЛЬЗУЕТСЯ →/);
  assert.match(source, /Context routed/);
  assert.match(source, /Condition triggered/);
  assert.match(source, /On demand/);
});

test("defines one complete Case 1 engagement decision for all 64 canonical agents", async () => {
  const source = await readFile(path.join(projectRoot, "app", "case-simulation", "case-1-data.ts"), "utf8");
  const records = [...source.matchAll(/^ {2}\{ agentId: (\d+), status: "(required|conditional|not-involved)"[^\n]+$/gm)].map((match) => ({
    id: Number(match[1]),
    status: match[2],
    source: match[0],
  }));

  assert.equal(records.length, 64, "expected one Case 1 decision per canonical agent");
  assert.deepEqual(records.map((record) => record.id).sort((a, b) => a - b), Array.from({ length: 64 }, (_, index) => index + 1));
  assert.equal(records.filter((record) => record.status === "required").length, 47);
  assert.equal(records.filter((record) => record.status === "conditional").length, 9);
  assert.equal(records.filter((record) => record.status === "not-involved").length, 8);

  for (const record of records.filter((item) => item.status !== "not-involved")) {
    assert.match(record.source, /when: "[^"]+"/);
    assert.match(record.source, /why: "[^"]+"/);
    assert.match(record.source, /input: "[^"]+"/);
    assert.match(record.source, /output: "[^"]+"/);
    assert.match(record.source, /next: "[^"]+"/);
  }
  for (const record of records.filter((item) => item.status === "not-involved")) {
    assert.match(record.source, /coveredBy: "[^"]+"/);
  }
  assert.equal([...source.matchAll(/status: "conditional", activation: "triggered"/g)].length, 6);
  assert.equal([...source.matchAll(/status: "conditional", activation: "standby"/g)].length, 3);
  assert.match(source, /1 тендер · 1 лот/);
  assert.match(source, /budget: "\$3,85 млн"/);
  assert.match(source, /organizerCountry: "Грузия"/);
  assert.match(source, /companyCountry: "Турция"/);
  assert.match(source, /tenderType: "Товары"/);
});

test("packages Case 1 as a collapsible module with a complete review chronology", async () => {
  const [pageSource, dataSource, agentRegistrySource] = await Promise.all([
    readFile(path.join(projectRoot, "app", "case-simulation", "page.tsx"), "utf8"),
    readFile(path.join(projectRoot, "app", "case-simulation", "case-1-data.ts"), "utf8"),
    readFile(path.join(projectRoot, "app", "page.tsx"), "utf8"),
  ]);

  assert.match(pageSource, /aria-controls="case-1-content"/);
  assert.match(pageSource, /aria-expanded=\{caseExpanded\}/);
  assert.match(pageSource, /hidden=\{!caseExpanded\}/);
  assert.match(pageSource, /case1Chronology\.map/);

  const moduleContentPosition = pageSource.indexOf('className="case-module-content"');
  const chronologyPosition = pageSource.indexOf('className="case-chronology"');
  const findingsPosition = pageSource.indexOf('className="case-audit-findings"');
  const matrixPosition = pageSource.indexOf('className="engagement-matrix-section"');
  assert.ok(moduleContentPosition < chronologyPosition, "chronology must remain inside the Case 1 module");
  assert.ok(chronologyPosition < findingsPosition, "Case 1 findings must follow its chronology");
  assert.ok(findingsPosition < matrixPosition, "the global matrix must follow the complete Case 1 module");
  assert.match(pageSource.slice(matrixPosition - 120, matrixPosition), /<\/div>\r?\n {6}<\/section>\r?\n\s*<section /, "the Case 1 module must close before the global matrix opens");
  assert.equal([...pageSource.matchAll(/className="engagement-matrix-section"/g)].length, 1, "expected one global matrix source");

  const chronology = dataSource.match(/export const case1Chronology:[^=]+= \[([\s\S]*?)\n\];/)?.[1];
  assert.ok(chronology, "expected the canonical Case 1 chronology registry");
  const events = [...chronology.matchAll(/^ {4}step: (\d+),$/gm)].map((match) => Number(match[1]));
  assert.deepEqual(events, Array.from({ length: 20 }, (_, index) => index + 1));
  assert.equal([...chronology.matchAll(/^ {4}initiator: /gm)].length, 20);
  assert.equal([...chronology.matchAll(/^ {4}agents: /gm)].length, 20);
  assert.equal([...chronology.matchAll(/^ {4}result: /gm)].length, 20);
  assert.equal([...chronology.matchAll(/^ {4}next: /gm)].length, 20);
  assert.match(chronology, /Tender Readiness 84\/100/);
  assert.match(chronology, /релевантностью 92%/);
  assert.match(chronology, /Match 88%/);
  assert.match(chronology, /вероятность победы 61%/);
  assert.match(chronology, /164\/164/);

  const canonicalIds = new Map(
    [...agentRegistrySource.matchAll(/\{ id: (\d+), name: "([^"]+)"/g)].map((match) => [match[2], Number(match[1])]),
  );
  const chronologyNames = [...chronology.matchAll(/agents: \[([^\]]+)\]/g)]
    .flatMap((match) => [...match[1].matchAll(/"([^"]+)"/g)].map((item) => item[1].replace(/ — резерв$/, "")));
  assert.ok(chronologyNames.length > 50, "expected the chronology to reference canonical agents throughout the case");
  for (const name of chronologyNames) assert.ok(canonicalIds.has(name), `chronology agent must exist in canonical registry: ${name}`);
  assert.equal(canonicalIds.get("Tender Source Ingestion Agent"), 13);
  assert.match(pageSource, /const agentByName = new Map\(agents\.map/);
  assert.match(pageSource, /className="chronology-agent-button"/);
  assert.match(pageSource, /String\(agent\.id\)\.padStart\(2, "0"\)/);
  assert.match(pageSource, /aria-haspopup="dialog"/);
  assert.match(pageSource, /onClick=\{\(\) => setSelectedAgentId\(agent\.id\)\}/);
});

test("ranks canonical agents by name, intent, synonyms, partial wording, and typos", async () => {
  const source = await readFile(path.join(projectRoot, "app", "page.tsx"), "utf8");
  const { createSemanticSearchDocument, rankSemanticDocuments, selectVisibleSemanticResults } = await import(
    pathToFileURL(path.join(projectRoot, "app", "case-simulation", "semantic-search.ts")).href
  );
  const records = [...source.matchAll(/^ {2}\{ id: (\d+), name: "([^"]+)", description: "([^"]+)",[^\n]+output: \{ primary: "([^"]+)", artifacts: \[([^\]]+)\], consumers: "([^"]+)" \} \},?$/gm)];
  assert.equal(records.length, 64, "semantic search must index the canonical 64-agent registry");

  const documents = records.map((record) => createSemanticSearchDocument({
    id: Number(record[1]),
    name: record[2],
    description: record[3],
    output: [record[4], ...[...record[5].matchAll(/"([^"]+)"/g)].map((artifact) => artifact[1]), record[6]].join(" · "),
  }));
  const namesById = new Map(records.map((record) => [Number(record[1]), record[2]]));
  const topNames = (query, count = 3) => rankSemanticDocuments(query, documents).slice(0, count).map((result) => namesById.get(result.id));

  assert.equal(topNames("Evidence & Provenance Agent", 1)[0], "Evidence & Provenance Agent");
  assert.equal(rankSemanticDocuments("Evidence & Provenance Agent", documents)[0].score, 100, "exact names must remain strongest");
  assert.equal(topNames("company readiness", 1)[0], "Tender Readiness Score Agent");
  assert.equal(topNames("human approval", 1)[0], "Human Approval Agent");
  assert.equal(topNames("find suitable tender", 1)[0], "Tender Discovery Agent");
  assert.ok(topNames("certificate verification", 4).includes("Credential & Certificate Agent"));
  assert.ok(topNames("pricing / bid decision", 5).includes("TenderScore / Bid-No-Bid Agent"));
  assert.ok(topNames("pricing / bid decision", 12).includes("Pricing & BOQ Agent"), topNames("pricing / bid decision", 20).join(" | "));
  assert.ok(topNames("evidnce check", 4).includes("Evidence & Provenance Agent"), "minor typos must remain discoverable");
  assert.ok(selectVisibleSemanticResults(rankSemanticDocuments("company", documents)).length >= 3, "broad intent must return several candidates");
});

test("defines one responsive readability scale across every application surface", async () => {
  const [globalStyles, runStyles, caseStyles] = await Promise.all([
    readFile(path.join(projectRoot, "app", "globals.css"), "utf8"),
    readFile(path.join(projectRoot, "app", "main-agents-run", "run.css"), "utf8"),
    readFile(path.join(projectRoot, "app", "case-simulation", "case-simulation.css"), "utf8"),
  ]);

  for (const token of ["--type-micro", "--type-label", "--type-small", "--type-body", "--type-control", "--type-card-title"]) {
    assert.match(globalStyles, new RegExp(`${token}: clamp\\(`));
  }
  assert.match(globalStyles, /\.topbar nav a \{ font-size: var\(--type-control\)/);
  assert.match(globalStyles, /\.agent-card > strong \{ font-size: var\(--type-card-title\)/);
  assert.match(globalStyles, /@media \(min-width: 1680px\)/);
  assert.match(runStyles, /Main Run readability upgrade/);
  assert.match(caseStyles, /Case Audit readability upgrade/);
  assert.match(caseStyles, /\.engagement-matrix \{ min-width: 1750px/);
});

test("publishes client files only", async () => {
  const topLevel = await readdir(publishRoot);
  assert.ok(topLevel.includes("index.html"));
  assert.ok(topLevel.includes("workflow.html"));
  assert.ok(topLevel.includes("agents.html"));
  assert.ok(topLevel.includes("main-agents-run.html"));
  assert.ok(topLevel.includes("case-simulation.html"));
  assert.ok(topLevel.includes("_next"));
  assert.ok(!topLevel.includes("server"));
  await assert.rejects(access(path.join(publishRoot, ".env")));
});
