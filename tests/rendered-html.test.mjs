import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publishRoot = path.join(projectRoot, "dist", "firebase");
const agentRegistryPath = path.join(projectRoot, "packages", "catalog-data", "src", "agents.ts");

async function readPublished(relativePath) {
  return readFile(path.join(publishRoot, relativePath), "utf8");
}

test("exports the strategic presentation, validation tools, and compatibility routes", async () => {
  const [home, architecture, workflow, agentsPage, run, caseSimulation] = await Promise.all([
    readPublished("index.html"),
    readPublished("architecture.html"),
    readPublished("workflow.html"),
    readPublished("agents.html"),
    readPublished("main-agents-run.html"),
    readPublished("case-simulation.html"),
  ]);

  assert.match(home, /<title>TenderLab\.ai — Agent Architecture/);
  assert.match(home, /Tender intelligence/);
  assert.match(home, /STRATEGIC SYSTEM OVERVIEW/);
  assert.match(home, /64 roles are a hypothesis/);
  assert.match(home, /href="\/architecture"/);
  assert.match(home, /href="\/case-simulation"/);
  assert.doesNotMatch(home, /href="\/main-agents-run"/);
  assert.doesNotMatch(home, /WB-KZ-2026-118/);
  assert.match(home, /aria-current="page"[^>]+href="\/"/);
  assert.doesNotMatch(home, /AGENT ARCHITECTURE/);
  assert.doesNotMatch(home, /Context routes the workflow/);

  for (const architecturePage of [architecture, workflow]) {
    assert.match(architecturePage, /Context activates the right agents/);
    assert.match(architecturePage, /TenderLab Orchestrator/);
    assert.match(architecturePage, /Consultant Command Center/);
    assert.match(architecturePage, /Eight layers cover the tender lifecycle/);
    assert.match(architecturePage, /Every agent must leave a usable artifact/);
    assert.match(architecturePage, /aria-current="page"[^>]+href="\/architecture"/);
    assert.doesNotMatch(architecturePage, /WB-KZ-2026-118/);
  }

  assert.match(agentsPage, /CANONICAL AGENT CATALOG/);
  assert.match(agentsPage, /WORKING ARCHITECTURE · UNDER VALIDATION/);
  assert.match(agentsPage, /Tender Readiness Score Agent/);
  assert.match(agentsPage, />Flat</);
  assert.match(agentsPage, />Hierarchy</);
  assert.match(agentsPage, />Network</);
  assert.match(agentsPage, /aria-label="Architecture view"/);
  assert.match(agentsPage, /USED IN \/ PLATFORM SIDE/);
  assert.match(agentsPage, /aria-label="Filter by platform side"/);
  assert.match(agentsPage, /MY REVIEW STATUS/);
  assert.match(agentsPage, /PERSONAL WORKSPACE/);
  assert.match(agentsPage, /Войти через Google/);
  assert.match(agentsPage, /aria-label="Filter by personal Agent review status"/);
  assert.match(agentsPage, />Command Center(?:<!-- -->)? <b>44<\/b>/);
  assert.match(agentsPage, />Client Side(?:<!-- -->)? <b>45<\/b>/);
  assert.match(agentsPage, />Backend(?:<!-- -->)? <b>14<\/b>/);
  assert.match(agentsPage, />Shared(?:<!-- -->)? <b>39<\/b>/);
  assert.match(agentsPage, /aria-current="page"[^>]+href="\/agents"/);
  assert.match(agentsPage, /aria-pressed="true"[^>]*>Hierarchy<\/button>/);
  assert.match(agentsPage, />Compare<\/span>/);
  assert.match(agentsPage, /aria-label="Open TenderLab Orchestrator profile"/);
  assert.doesNotMatch(agentsPage, /Context activates the right agents/);

  assert.match(run, /Main Run moved to Validation/);
  assert.match(run, /href="\/case-simulation"/);
  assert.doesNotMatch(run, /Tender Readiness Score Agent/);
  assert.doesNotMatch(run, /GE-MES-2026-017/);

  assert.match(caseSimulation, /Case Simulation/);
  assert.match(caseSimulation, /Agent Engagement/);
  assert.match(caseSimulation, /Международная поставка школьной мебели/);
  assert.match(caseSimulation, /Anatolia Workspace A\.Ş\./);
  assert.match(caseSimulation, /aria-controls="case-1-content"/);
  assert.match(caseSimulation, /aria-expanded="true"/);
  assert.match(caseSimulation, /CASE 1 · ORCHESTRATION MAP/);
  assert.match(caseSimulation, /События, ответственность и зависимости/);
  assert.match(caseSimulation, /Map<\/b><small>оркестрация и зависимости/);
  assert.match(caseSimulation, /Хронология событий — Case 1/);
  assert.match(caseSimulation, /Заказчик публикует международную закупку/);
  assert.match(caseSimulation, /Контракт исполняется и результат возвращается в систему/);
  assert.match(caseSimulation, /64 архитектурных роли/);
  assert.match(caseSimulation, /CASE 01 · ACTIVE/);
  assert.match(caseSimulation, /CASE (?:<!-- -->)?10/);
  assert.match(caseSimulation, /aria-current="page"[^>]+href="\/case-simulation"/);
  assert.doesNotMatch(caseSimulation, /href="\/main-agents-run"/);

  for (const html of [home, architecture, workflow, agentsPage, run, caseSimulation]) {
    assert.match(html, /<html[^>]*lang="ru"/);
    assert.match(html, /<script[^>]+src="\/_next\/static\/chunks\//);
    assert.match(html, /Glossary/);
    assert.doesNotMatch(html, /href="\/glossary"/);
    assert.match(html, /aria-haspopup="dialog"/);
    assert.doesNotMatch(html, /codex-preview/);
    assert.doesNotMatch(html, /Your site is taking shape/);
  }
});

test("includes every browser asset referenced by the exported pages", async () => {
  const pages = await Promise.all([
    readPublished("index.html"),
    readPublished("architecture.html"),
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
  const source = await readFile(agentRegistryPath, "utf8");
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
  const source = await readFile(agentRegistryPath, "utf8");
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
  const [source, uiSource] = await Promise.all([
    readFile(agentRegistryPath, "utf8"),
    readFile(path.join(projectRoot, "app", "page.tsx"), "utf8"),
  ]);
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
  assert.match(uiSource, /PLATFORM ROLE \/ WHY/);
});

test("orders the agent detail drawer as one progressive profile", async () => {
  const [source, registrySource] = await Promise.all([
    readFile(path.join(projectRoot, "app", "page.tsx"), "utf8"),
    readFile(agentRegistryPath, "utf8"),
  ]);
  const drawer = source.match(/export function AgentDetailDrawer[\s\S]*?<aside[^>]*className="agent-drawer"[^>]*>([\s\S]*?)<\/aside>/)?.[1];
  assert.ok(drawer, "expected the shared canonical agent detail drawer");

  const progressiveSections = [
    'className="drawer-identity"',
    'className="drawer-working-state"',
    "<AgentCanonicalProfile",
    "<AgentPlatformRationale",
    "<AgentOperatingContract",
    "<AgentDrawerOutput",
    "sim-example",
    "<AgentOperationalMetadata",
  ];
  const positions = progressiveSections.map((section) => drawer.indexOf(section));
  assert.ok(positions.every((position) => position >= 0), "every profile section must remain present");
  assert.deepEqual([...positions].sort((a, b) => a - b), positions, "profile sections must follow the intended information hierarchy");
  assert.match(drawer, /SIMPLY \/ ПРОСТО/);
  assert.match(source, /CORE PURPOSE/);
  assert.match(source, /HOW IT WORKS \/ OPERATING CONTRACT/);
  assert.match(drawer, /REALISTIC EXAMPLE/);
  assert.match(source, /ИСПОЛЬЗУЕТСЯ →/);
  assert.match(registrySource, /Context routed/);
  assert.match(registrySource, /Condition triggered/);
  assert.match(registrySource, /On demand/);
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
  const [pageSource, dataSource, graphSource, agentRegistrySource, agentCatalogSource] = await Promise.all([
    readFile(path.join(projectRoot, "app", "case-simulation", "page.tsx"), "utf8"),
    readFile(path.join(projectRoot, "app", "case-simulation", "case-1-data.ts"), "utf8"),
    readFile(path.join(projectRoot, "app", "case-simulation", "case-1-graph.ts"), "utf8"),
    readFile(agentRegistryPath, "utf8"),
    readFile(path.join(projectRoot, "app", "page.tsx"), "utf8"),
  ]);

  assert.match(pageSource, /aria-controls="case-1-content"/);
  assert.match(pageSource, /aria-expanded=\{caseExpanded\}/);
  assert.match(pageSource, /hidden=\{!caseExpanded\}/);
  assert.match(pageSource, /case1ProcessGraph\.activities\.map/);
  assert.match(pageSource, /useState<"map" \| "narrative">\("map"\)/);
  assert.match(pageSource, /<CaseOrchestrationMap onOpenAgent=\{openAgent\}/);
  assert.match(pageSource, /matrixSectionRef\.current\?\.scrollIntoView/);

  const moduleContentPosition = pageSource.indexOf('className="case-module-content"');
  const chronologyPosition = pageSource.indexOf('className="case-chronology"');
  const findingsPosition = pageSource.indexOf('className="case-audit-findings');
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
  assert.equal(canonicalIds.get("Tender Source Acquisition Agent"), 13);
  assert.match(pageSource, /const agentByName = new Map\(agents\.map/);
  assert.match(pageSource, /chronology-agent-button/);
  assert.match(pageSource, /String\(agent\.id\)\.padStart\(2, "0"\)/);
  assert.match(pageSource, /aria-haspopup="dialog"/);
  assert.match(pageSource, /onClick=\{\(\) => openAgent\(agent\.id, event\.eventStep\)\}/);
  assert.match(agentCatalogSource, /export function AgentDetailDrawer/);
  assert.match(agentCatalogSource, /<AgentDetailDrawer agent=\{selectedAgent\} onClose=/);
  assert.match(pageSource, /<AgentDetailDrawer/);
  assert.match(pageSource, /context=\{selectedDetailContext\}/);
  assert.match(agentCatalogSource, />A · INPUT</);
  assert.match(agentCatalogSource, />B · RESULT \/ OUTPUT</);
  assert.match(agentCatalogSource, />C · NEXT \/ HANDOFF</);
  assert.doesNotMatch(agentCatalogSource, />0[123] · (?:INPUT|RESULT \/ OUTPUT|NEXT \/ HANDOFF)</);
  assert.doesNotMatch(pageSource, /className="case-detail"/);

  const actorRegistry = graphSource.match(/export const case1Actors:[^=]+= \[([\s\S]*?)\n\];/)?.[1];
  const activityRegistry = graphSource.match(/const activitySpecs:[^{]+\{([\s\S]*?)\n\};/)?.[1];
  const dependencyRegistry = graphSource.match(/const dependencySpecs:[^=]+= \[([\s\S]*?)\n\];/)?.[1];
  assert.ok(actorRegistry && activityRegistry && dependencyRegistry, "expected actors, activities, and typed relationships");
  assert.equal([...actorRegistry.matchAll(/\{ id: "[^"]+"/g)].length, 5, "expected five canonical Actor lanes");
  assert.deepEqual([...activityRegistry.matchAll(/^ {2}(\d+): /gm)].map((match) => Number(match[1])), Array.from({ length: 20 }, (_, index) => index + 1));
  assert.ok([...dependencyRegistry.matchAll(/^ {2}\{ from: /gm)].length >= 25, "expected a non-linear dependency network");
  for (const relation of ["branches-to", "joins-at", "waits-for", "approved-by", "rework", "feedback"]) assert.match(dependencyRegistry, new RegExp(`type: "${relation}"`));
  assert.match(graphSource, /Every Case 1 waiting activity needs an explicit trigger/);
});

test("audits all 20 Case 1 Events through distinct Event and Agent execution evidence", async () => {
  const [graphSource, auditSource, mapSource, pageSource, drawerSource, processModelSource, renderedCase] = await Promise.all([
    readFile(path.join(projectRoot, "app", "case-simulation", "case-1-graph.ts"), "utf8"),
    readFile(path.join(projectRoot, "app", "case-simulation", "case-1-event-audits.ts"), "utf8"),
    readFile(path.join(projectRoot, "app", "case-simulation", "case-orchestration-map.tsx"), "utf8"),
    readFile(path.join(projectRoot, "app", "case-simulation", "page.tsx"), "utf8"),
    readFile(path.join(projectRoot, "app", "page.tsx"), "utf8"),
    readFile(path.join(projectRoot, "app", "process-model.ts"), "utf8"),
    readPublished("case-simulation.html"),
  ]);

  assert.match(auditSource, /eventStep: 1, agentId: 13/);
  assert.match(auditSource, /eventStep: 1, agentId: 15,[\s\S]*?necessity: "misplaced"[\s\S]*?proposedEventStep: 2/);
  assert.match(auditSource, /eventStep: 2, agentId: 15/);
  assert.match(auditSource, /eventStep: 4, agentId: 9/);
  assert.match(auditSource, /eventStep: 14, agentId: 55,[\s\S]*?necessity: "redundant"/);
  assert.match(auditSource, /eventStep: 9, agentId: 38,[\s\S]*?provenance: "expert-proposed"[\s\S]*?validationStatus: "needs-review"/);
  assert.deepEqual([...auditSource.matchAll(/^ {2}(\d+): \{ scopeBoundary:/gm)].map((match) => Number(match[1])), Array.from({ length: 20 }, (_, index) => index + 1));
  assert.match(auditSource, /case1EventAudits\.length !== case1Chronology\.length/);
  assert.match(auditSource, /Every conditional Event Agent assignment needs an explicit condition/);
  assert.match(graphSource, /auditedActiveAgentNames/);
  assert.match(graphSource, /from: 15, to: 12, type: "rework"/);
  assert.match(graphSource, /auditSummary: case1AuditSummary/);
  assert.match(processModelSource, /export type EventAgentExecution/);
  assert.match(processModelSource, /export type CaseAuditSummary/);
  assert.match(processModelSource, /CRUCIAL \/ JUSTIFIED/);
  assert.match(mapSource, />EVENT DESCRIPTION</);
  assert.match(mapSource, />COMBINED EVENT RESULT</);
  assert.match(mapSource, /AGENT EXECUTION AUDIT/);
  assert.match(pageSource, /eventAgentEntries/);
  assert.match(drawerSource, /EVENT-SPECIFIC EXECUTION/);
  assert.match(drawerSource, />A · AGENT INPUT</);
  assert.match(drawerSource, />B · AGENT OUTPUT</);
  assert.match(drawerSource, />CASE 1 EVIDENCE</);
  assert.match(drawerSource, />NECESSITY \/ JUSTIFICATION</);
  assert.match(drawerSource, /ЕСЛИ УБРАТЬ ИЗ E\{/);
  assert.match(drawerSource, />УСЛОВИЕ АКТИВАЦИИ</);
  assert.match(renderedCase, /2(?:<!-- -->)? agents(?:<!-- -->)? · 1 audit finding/);
  assert.match(renderedCase, /Итог аудита всех 20 Events/);
  assert.match(renderedCase, /E(?:<!-- -->)?01(?:<!-- -->)? → E(?:<!-- -->)?02/);
  assert.match(renderedCase, /UNRESOLVED \/ PROPOSED/);
  assert.match(renderedCase, /Стартовый внешний Event/);
});

test("defines one TenderLab-specific canonical glossary for the contextual panel", async () => {
  const { contextualGlossaryTermsByPath, scoreTenderGlossaryTerm, tenderGlossaryCategoryLabels, tenderGlossaryTerms } = await import(
    pathToFileURL(path.join(projectRoot, "app", "tender-glossary.ts")).href
  );
  const uiSource = await readFile(path.join(projectRoot, "app", "tender-glossary-ui.tsx"), "utf8");

  assert.ok(tenderGlossaryTerms.length >= 40, "expected the initial TenderLab process vocabulary plus agent-architecture terms");
  assert.equal(new Set(tenderGlossaryTerms.map((item) => item.term.toLocaleLowerCase("en-US"))).size, tenderGlossaryTerms.length);
  assert.equal(Object.keys(tenderGlossaryCategoryLabels).length, 6);
  for (const item of tenderGlossaryTerms) {
    assert.ok(item.translation.length > 5, `${item.term} needs a Russian translation`);
    assert.ok(item.explanation.length > 60, `${item.term} needs a specific technical definition`);
    assert.ok(item.simpleExplanation.length > 35, `${item.term} needs a plain-language explanation`);
    assert.ok(item.example.length > 35, `${item.term} needs a TenderLab example`);
    assert.ok(item.notToConfuseWith.length > 40, `${item.term} needs a specific comparison`);
  }
  for (const term of ["Workflow", "Event", "Actor", "AI Agent", "Dependency", "Waiting State", "Decision Gate", "Critical Path", "Fan-Out / Fan-In", "Dependency Graph", "Swimlane", "Orchestration", "Handoff", "Input", "Output", "Parallel Execution"]) {
    assert.ok(tenderGlossaryTerms.some((item) => item.term === term), `missing required TenderLab term: ${term}`);
  }
  assert.ok(contextualGlossaryTermsByPath["/case-simulation"].includes("Critical Path"));
  assert.ok(contextualGlossaryTermsByPath["/agents"].includes("Agent Registry"));
  assert.equal([...tenderGlossaryTerms].sort((left, right) => scoreTenderGlossaryTerm(right, "критический путь") - scoreTenderGlossaryTerm(left, "критический путь"))[0].term, "Critical Path");
  assert.match(uiSource, /export function TenderGlossaryShell/);
  assert.match(uiSource, /export function TenderGlossaryBrowser/);
  assert.match(uiSource, /Быстрые определения в контексте текущей страницы/);
  assert.doesNotMatch(uiSource, /Открыть полный Glossary/);
  assert.match(uiSource, /splitGlossaryReferences/);
});

test("uses one typed relationship model for Case Audit and the Agent Catalog Network", async () => {
  const [pageSource, networkSource, modelSource, mapSource, registrySource] = await Promise.all([
    readFile(path.join(projectRoot, "app", "page.tsx"), "utf8"),
    readFile(path.join(projectRoot, "app", "agent-network-view.tsx"), "utf8"),
    readFile(path.join(projectRoot, "app", "process-model.ts"), "utf8"),
    readFile(path.join(projectRoot, "app", "case-simulation", "case-orchestration-map.tsx"), "utf8"),
    readFile(agentRegistryPath, "utf8"),
  ]);
  assert.match(registrySource, /type ArchitectureView = "flat" \| "hierarchy" \| "network"/);
  assert.match(pageSource, /<AgentNetworkView/);
  assert.match(registrySource, /export const subagentParentIds/);
  assert.match(networkSource, /case1ProcessGraph\.relationships/);
  assert.match(networkSource, /Support = canonical functional grouping/);
  assert.match(networkSource, /Open canonical profile/);
  assert.match(mapSource, /processRelationshipLabels/);
  assert.match(mapSource, /Critical path/);
  assert.match(mapSource, /Managed waits/);
  for (const relation of ["orchestrated-by", "consumes", "produces", "handoff", "depends-on", "blocks", "triggered-by", "approved-by", "joins-at", "waits-for", "retry", "rework", "feedback"]) assert.match(modelSource, new RegExp(`\\| "${relation}"`));
});

test("keeps personal Agent review state separate and synchronizable", async () => {
  const [pageSource, workspaceSource, layoutSource, rulesSource, firebaseConfig] = await Promise.all([
    readFile(path.join(projectRoot, "app", "page.tsx"), "utf8"),
    readFile(path.join(projectRoot, "app", "agent-workspace.tsx"), "utf8"),
    readFile(path.join(projectRoot, "app", "layout.tsx"), "utf8"),
    readFile(path.join(projectRoot, "firestore.rules"), "utf8"),
    readFile(path.join(projectRoot, "firebase.json"), "utf8"),
  ]);

  assert.match(layoutSource, /<AgentWorkspaceProvider>/);
  assert.match(pageSource, /<AgentReviewControl agentId=\{agent\.id\} canonicalRegistryId=\{agent\.registryId\}/);
  assert.match(pageSource, /MY WORKING STATE/);
  assert.match(workspaceSource, /"understood" \| "in-progress" \| "unclear"/);
  assert.match(workspaceSource, /collection\(services\.db, "users", nextUser\.uid, "agentReview"\)/);
  assert.match(workspaceSource, /signInWithPopup/);
  assert.match(workspaceSource, /serverTimestamp\(\)/);
  assert.match(rulesSource, /request\.auth\.uid == userId/);
  assert.match(rulesSource, /canonicalRegistryId == agentRegistryId/);
  assert.match(rulesSource, /reviewStatus in \['understood', 'in-progress', 'unclear'\]/);
  assert.match(firebaseConfig, /"googleSignIn"/);
  assert.match(firebaseConfig, /"rules": "firestore\.rules"/);
});

test("defines complete canonical responsibility profiles for all 64 Agents", async () => {
  const [{ agents }, { agentProfiles }] = await Promise.all([
    import(pathToFileURL(path.join(projectRoot, "packages", "catalog-data", "src", "agents.ts")).href),
    import(pathToFileURL(path.join(projectRoot, "packages", "catalog-data", "src", "agent-profiles.ts")).href),
  ]);
  assert.equal(agents.length, 64);
  assert.equal(Object.keys(agentProfiles).length, 64);
  const requiredProseFields = ["simply", "responsibilityScope", "trigger", "skipCondition", "authority", "responsibilityBoundary", "keyDistinction"];
  for (const agent of agents) {
    assert.equal(agent.profile, agentProfiles[agent.id], `Agent ${agent.id} must use the canonical profile object`);
    for (const field of requiredProseFields) assert.ok(agent.profile[field].length > 17, `Agent ${agent.id} needs ${field}`);
    assert.ok(agent.profile.workflowStage.length >= 3, `Agent ${agent.id} needs workflowStage`);
    for (const field of ["activities", "exclusions", "typicalInputs"]) assert.ok(agent.profile[field].length >= 2, `Agent ${agent.id} needs ${field}`);
    assert.ok(agent.profile.upstream.length >= 1, `Agent ${agent.id} needs upstream`);
    assert.ok(agent.profile.potentialOverlaps.length >= 1, `Agent ${agent.id} needs an explicit overlap/boundary review`);
    assert.doesNotMatch(JSON.stringify(agent.profile), /NOT STRUCTURED/i);
  }
});

test("provides a registry-backed cross-view Agent Comparison workspace", async () => {
  const [pageSource, comparisonSource, networkSource, mapSource, globalStyles, caseStyles] = await Promise.all([
    readFile(path.join(projectRoot, "app", "page.tsx"), "utf8"),
    readFile(path.join(projectRoot, "app", "agent-comparison.tsx"), "utf8"),
    readFile(path.join(projectRoot, "app", "agent-network-view.tsx"), "utf8"),
    readFile(path.join(projectRoot, "app", "case-simulation", "case-orchestration-map.tsx"), "utf8"),
    readFile(path.join(projectRoot, "app", "globals.css"), "utf8"),
    readFile(path.join(projectRoot, "app", "case-simulation", "case-simulation.css"), "utf8"),
  ]);

  assert.match(pageSource, /comparisonIds/);
  assert.match(pageSource, /<AgentComparisonBar/);
  assert.match(pageSource, /<AgentComparisonModal/);
  assert.match(pageSource, /CANONICAL RESPONSIBILITY PROFILE/);
  assert.match(pageSource, /SIMPLY \/ ПРОСТО/);
  assert.match(pageSource, /<AgentOperatingContract agent=\{agent\}/);
  assert.match(pageSource, /compareSelected=\{comparisonIds\.includes\(agent\.id\)\}/);
  assert.match(comparisonSource, /from "\.\.\/packages\/catalog-data\/src\/agents"/);
  assert.match(comparisonSource, /What it explicitly should NOT do/);
  assert.match(comparisonSource, /Potential duplication/);
  assert.match(comparisonSource, /Simply \/ простыми словами/);
  assert.match(comparisonSource, /Responsibility boundary/);
  assert.match(comparisonSource, /Definition status/);
  assert.doesNotMatch(comparisonSource, /NOT STRUCTURED/);
  assert.match(comparisonSource, /Heuristic only/);
  assert.match(comparisonSource, /ADD AGENT/);
  assert.match(networkSource, /onToggleCompare/);
  assert.match(networkSource, /focusAgent\.profile\.keyDistinction/);
  assert.match(mapSource, /import \{ AgentComparisonBar, AgentComparisonModal \} from "\.\.\/agent-comparison"/);
  assert.match(mapSource, /className="event-agent-compare"/);
  assert.match(mapSource, /aria-pressed=\{comparisonIds\.includes\(agent\.id\)\}/);
  assert.match(mapSource, /<AgentComparisonBar selectedIds=\{comparisonIds\}/);
  assert.match(mapSource, /<AgentComparisonModal/);
  assert.match(mapSource, /const selectActivity = \(activityId: string\) => \{[\s\S]*setComparisonIds\(\[\]\);[\s\S]*setComparisonOpen\(false\)/);
  assert.match(mapSource, /onClick=\{\(\) => selectActivity\(activity\.id\)\}/);
  assert.match(globalStyles, /\.comparison-modal \{/);
  assert.match(globalStyles, /height: calc\(100dvh - 36px\)/);
  assert.match(globalStyles, /\.comparison-table thead th/);
  assert.match(globalStyles, /position: sticky/);
  assert.match(caseStyles, /\.event-agent-compare\[aria-pressed="true"\]/);
  assert.match(caseStyles, /\.inspector-agent-audit-row/);
});

test("renders a compact canonical Agent to Dataset handoff with specific deep links", async () => {
  const pageSource = await readFile(path.join(projectRoot, "app", "page.tsx"), "utf8");
  assert.match(pageSource, /DATA OUTPUTS \/ DATASETS/);
  assert.match(pageSource, /dataset\.name\.en/);
  assert.match(pageSource, /dataset\.id\.replace\("dataset:", ""\)/);
  assert.match(pageSource, /className="dataset-profile-link"/);
  assert.match(pageSource, />Open Dataset ↗<\/a>/);
  assert.doesNotMatch(pageSource, /Canonical Deliverable → typed Dataset contribution/);
  assert.doesNotMatch(pageSource, /<p>\{relation\.rationale\}<\/p>/);
});

test("provides a filter-aware 64-Agent Matrix as the fourth Catalog view", async () => {
  const [pageSource, matrixSource, comparisonSource, registrySource, globalStyles] = await Promise.all([
    readFile(path.join(projectRoot, "app", "page.tsx"), "utf8"),
    readFile(path.join(projectRoot, "app", "agent-matrix-view.tsx"), "utf8"),
    readFile(path.join(projectRoot, "app", "agent-comparison.tsx"), "utf8"),
    readFile(agentRegistryPath, "utf8"),
    readFile(path.join(projectRoot, "app", "globals.css"), "utf8"),
  ]);

  assert.match(registrySource, /type ArchitectureView = "flat" \| "hierarchy" \| "network" \| "matrix"/);
  assert.match(pageSource, />Matrix<\/button>/);
  assert.match(pageSource, /<AgentMatrixView/);
  assert.match(matrixSource, /buildAgentValidationRows/);
  assert.match(matrixSource, /buildAgentAnalysisMap/);
  assert.match(comparisonSource, /export function buildAgentValidationRows/);
  assert.match(matrixSource, /visibleAgents\.filter/);
  assert.match(matrixSource, /onModeChange/);
  assert.match(matrixSource, /onLayerChange/);
  assert.match(matrixSource, /onPlatformChange/);
  assert.match(matrixSource, /onToggleCompare/);
  assert.match(matrixSource, /Focus Mode/);
  assert.match(matrixSource, /Hidden \{hiddenIds\.size\}/);
  assert.match(matrixSource, /18 canonical dimensions/);
  assert.match(matrixSource, /same enriched canonical 64-Agent registry/);
  assert.match(globalStyles, /\.agent-matrix-view\.is-focus/);
  assert.match(globalStyles, /\.agent-matrix-table thead th/);
  assert.match(globalStyles, /\.agent-matrix-table tbody th/);
});

test("ranks canonical agents by name, intent, synonyms, partial wording, and typos", async () => {
  const source = await readFile(agentRegistryPath, "utf8");
  const { createSemanticSearchDocument, rankSemanticDocuments, selectVisibleSemanticResults } = await import(
    pathToFileURL(path.join(projectRoot, "app", "case-simulation", "semantic-search.ts")).href
  );
  const records = [...source.matchAll(/^ {2}\{ id: (\d+), name: "([^"]+)"(?:, previousNames: \[[^\]]+\])?, description: "([^"]+)",[^\n]+output: \{ primary: "([^"]+)", artifacts: \[([^\]]+)\], consumers: "([^"]+)" \} \},?$/gm)];
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
  assert.ok(topNames("pricing / bid decision", 5).includes("Bid / No-Bid Decision Agent"));
  assert.ok(topNames("pricing / bid decision", 15).includes("Pricing & BOQ Agent"), topNames("pricing / bid decision", 20).join(" | "));
  assert.ok(topNames("evidnce check", 4).includes("Evidence & Provenance Agent"), "minor typos must remain discoverable");
  assert.ok(selectVisibleSemanticResults(rankSemanticDocuments("company", documents)).length >= 3, "broad intent must return several candidates");
});

test("finds the source-acquisition owner from natural-language tender publication intent", async () => {
  const [catalogSource, semanticSource] = await Promise.all([
    readFile(path.join(projectRoot, "app", "page.tsx"), "utf8"),
    readFile(path.join(projectRoot, "app", "case-simulation", "semantic-search.ts"), "utf8"),
  ]);
  const { createSemanticSearchDocument, rankSemanticDocuments } = await import(
    pathToFileURL(path.join(projectRoot, "app", "case-simulation", "semantic-search.ts")).href
  );
  const documents = [
    createSemanticSearchDocument({
      id: 13,
      name: "Tender Source Acquisition Agent",
      aliases: ["Tender Source Ingestion Agent"],
      description: "Собирает объявления и файлы из источников. Забирает notice из официальных источников.",
      scope: "Source acquisition and normalization notices and fetch status across procurement sources.",
      activities: "Мониторит источники · Скачивает оригиналы · Создаёт source records",
      inputs: "Procurement source endpoints · Crawl/API schedules",
      trigger: "Источник публикует или изменяет notice.",
      boundary: "Заканчивается на надёжно полученном source package.",
    }),
    createSemanticSearchDocument({
      id: 14,
      name: "Tender Discovery Agent",
      description: "Находит потенциально подходящие возможности.",
      scope: "Candidate retrieval and ranking opportunities by company relevance.",
      activities: "Формирует candidate set · Ранжирует relevance",
      trigger: "Поступили новые или обновлённые tenders.",
      boundary: "Завершает широкий поиск shortlist.",
    }),
    createSemanticSearchDocument({
      id: 21,
      name: "Document Intake Agent",
      description: "Загружает и индексирует уже полученный тендерный пакет.",
      scope: "Internal corpus ingestion of already acquired tender files.",
    }),
  ];

  for (const query of [
    "new tenders",
    "who fetches newly published tenders?",
    "agent responsible for monitoring tender portals",
    "buyer just announced a tender",
    "find tenders from our radar platforms",
    "who receives a new procurement notice?",
    "A Buyer publishes a new tender. Which Agent is responsible for detecting/fetching it from radar platforms?",
  ]) {
    assert.equal(rankSemanticDocuments(query, documents)[0].id, 13, `source-acquisition intent must rank Agent 13 first: ${query}`);
  }
  assert.equal(rankSemanticDocuments("Tender Source Ingestion Agent", documents)[0].id, 13, "a superseded name must resolve through its historical alias");
  assert.ok(rankSemanticDocuments("Tender Source Ingestion Agent", documents)[0].score >= 95, "an exact historical alias must remain a strong traceability match");
  assert.match(catalogSource, /catalogSemanticDocuments = agents\.map/);
  for (const profileField of ["responsibilityScope", "activities", "exclusions", "typicalInputs", "trigger", "responsibilityBoundary", "keyDistinction", "potentialOverlaps"]) {
    assert.match(catalogSource, new RegExp(`agent\\.profile\\.${profileField}`));
  }
  assert.match(catalogSource, /ARCHITECTURE SEARCH/);
  assert.match(catalogSource, /Potential architecture gap/);
  assert.match(catalogSource, /релевантных кандидатов скрывают активные фильтры/);
  assert.match(semanticSource, /SOURCE_OWNER_ACTIONS/);
  assert.match(semanticSource, /SOURCE_OWNER_CHANNELS/);
});

test("preserves the 13 naming-audit identities while exposing only the recommended canonical names", async () => {
  const source = await readFile(agentRegistryPath, "utf8");
  const renames = [
    [13, "Tender Source Ingestion Agent", "Tender Source Acquisition Agent"],
    [22, "OCR & Language Agent", "Tender OCR & Translation Agent"],
    [28, "Strict-Spec Agent", "Specification Fidelity Agent"],
    [30, "Ambiguity & Clarification Agent", "Pre-Bid Clarification Agent"],
    [32, "Solution-Based Matching Agent", "Participation Solution-Fit Agent"],
    [34, "Gap Analysis Agent", "Tender Gap Remediation Agent"],
    [35, "TenderScore / Bid-No-Bid Agent", "Bid / No-Bid Decision Agent"],
    [36, "Capacity & Execution Agent", "Pre-Bid Execution Feasibility Agent"],
    [42, "Local Representation Agent", "Local Service & Representation Agent"],
    [55, "Credentials & Experience Agent", "Bid Credentials & Experience Agent"],
    [59, "Clarification Response Agent", "Post-Bid Clarification Response Agent"],
    [61, "Award & Contract Agent", "Award-to-Contract Agent"],
    [64, "Outcome Learning Agent", "Tender Outcome Learning Agent"],
  ];

  assert.equal([...source.matchAll(/previousNames: \[/g)].length, 13, "only the approved rename set may receive historical aliases");
  for (const [id, previousName, canonicalName] of renames) {
    assert.match(source, new RegExp(`\\{ id: ${id}, name: "${canonicalName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}", previousNames: \\["${previousName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"\\]`));
    assert.doesNotMatch(source, new RegExp(`\\{ id: ${id}, name: "${previousName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
  }
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
  assert.ok(topLevel.includes("architecture.html"));
  assert.ok(topLevel.includes("workflow.html"));
  assert.ok(topLevel.includes("agents.html"));
  assert.ok(topLevel.includes("main-agents-run.html"));
  assert.ok(topLevel.includes("case-simulation.html"));
  assert.ok(!topLevel.includes("glossary.html"));
  assert.ok(topLevel.includes("_next"));
  assert.ok(!topLevel.includes("server"));
  await assert.rejects(access(path.join(publishRoot, ".env")));
});
