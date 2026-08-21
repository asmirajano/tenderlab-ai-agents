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

test("exports both TenderLab routes as static HTML", async () => {
  const [home, run] = await Promise.all([
    readPublished("index.html"),
    readPublished("main-agents-run.html"),
  ]);

  assert.match(home, /<title>TenderLab\.ai/);
  assert.match(home, /Agent Command Center/);
  assert.match(home, /Tender Readiness Score Agent/);
  assert.match(home, /href="\/main-agents-run"/);
  assert.match(home, />Flat</);
  assert.match(home, />Hierarchy</);
  assert.match(home, /aria-label="Architecture view"/);

  assert.match(run, /Main Agents Run/);
  assert.match(run, /TenderLab Orchestrator/);
  assert.match(run, /Tender Readiness Score Agent/);
  assert.match(run, /href="\/"/);

  for (const html of [home, run]) {
    assert.match(html, /<html[^>]*lang="ru"/);
    assert.match(html, /<script[^>]+src="\/_next\/static\/chunks\//);
    assert.doesNotMatch(html, /codex-preview/);
    assert.doesNotMatch(html, /Your site is taking shape/);
  }
});

test("includes every browser asset referenced by the exported pages", async () => {
  const pages = await Promise.all([
    readPublished("index.html"),
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

test("defines concrete output metadata for every Main agent", async () => {
  const source = await readFile(path.join(projectRoot, "app", "page.tsx"), "utf8");
  const mainIdsSource = source.match(/const mainAgentIds = new Set\(\[([^\]]+)\]\)/)?.[1];
  assert.ok(mainIdsSource, "expected the canonical Main-agent ID registry");
  const mainIds = [...mainIdsSource.matchAll(/\d+/g)].map((match) => Number(match[0]));
  assert.equal(mainIds.length, 20);

  for (const agentId of mainIds) {
    const record = source.split("\n").find((line) => line.includes(`{ id: ${agentId},`));
    assert.ok(record, `expected agent ${agentId} in the registry`);
    const primary = record.match(/primary: "([^"]+)"/)?.[1];
    const artifacts = record.match(/artifacts: \[([^\]]+)\]/)?.[1];
    const consumers = record.match(/consumers: "([^"]+)"/)?.[1];
    assert.ok(primary && primary.length > 12, `agent ${agentId} needs a specific primary output`);
    assert.ok(artifacts && [...artifacts.matchAll(/"[^"]+"/g)].length >= 3, `agent ${agentId} needs concrete artifacts`);
    assert.ok(consumers && consumers.length > 8, `agent ${agentId} needs downstream consumers`);
    assert.doesNotMatch(primary, /analysis completed|result generated|анализ завершён|результат создан/i);
  }
});

test("publishes client files only", async () => {
  const topLevel = await readdir(publishRoot);
  assert.ok(topLevel.includes("index.html"));
  assert.ok(topLevel.includes("main-agents-run.html"));
  assert.ok(topLevel.includes("_next"));
  assert.ok(!topLevel.includes("server"));
  await assert.rejects(access(path.join(publishRoot, ".env")));
});
