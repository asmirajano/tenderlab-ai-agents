import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publishRoot = path.join(projectRoot, "dist", "firebase");

async function readPublished(relativePath) {
  return readFile(path.join(publishRoot, relativePath), "utf8");
}

test("exports all four TenderLab pages as static HTML", async () => {
  const [home, workflow, agentsPage, run] = await Promise.all([
    readPublished("index.html"),
    readPublished("workflow.html"),
    readPublished("agents.html"),
    readPublished("main-agents-run.html"),
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

  for (const html of [home, workflow, agentsPage, run]) {
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

test("publishes client files only", async () => {
  const topLevel = await readdir(publishRoot);
  assert.ok(topLevel.includes("index.html"));
  assert.ok(topLevel.includes("workflow.html"));
  assert.ok(topLevel.includes("agents.html"));
  assert.ok(topLevel.includes("main-agents-run.html"));
  assert.ok(topLevel.includes("_next"));
  assert.ok(!topLevel.includes("server"));
  await assert.rejects(access(path.join(publishRoot, ".env")));
});
