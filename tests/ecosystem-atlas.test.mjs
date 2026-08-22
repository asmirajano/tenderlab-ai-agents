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
  for (const label of ["Sides & Actors", "Data & Sources", "Glossary", "Methodology", "Open TenderLab.ai"]) {
    assert.match(bundle, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(bundle, /Independent catalogues now/);
  assert.match(bundle, /Relationship Registry/);
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
  assert.equal([...datasets.matchAll(/^ {2}d\(/gm)].length, 96, "expected the comprehensive logical dataset catalogue");
  assert.equal([...datasets.matchAll(/^ {2}"?[A-Z][A-Z0-9-]*"?:\s*"[^"\r\n]*[А-Яа-яЁё][^"\r\n]*",?$/gm)].length, 96, "expected one Russian example for every dataset");
  assert.match(schema, /exampleRu: string/);
  assert.equal([...datasets.matchAll(/^ {2}source\(/gm)].length, 17, "expected representative source/provider records");
  assert.equal([...glossary.matchAll(/^ {2}term\(/gm)].length, 35, "expected a shared canonical glossary");

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

test("gives every canonical dataset a stable ID and a unique Russian example", async () => {
  const moduleUrl = pathToFileURL(path.join(projectRoot, "packages", "catalog-data", "src", "datasets.ts")).href;
  const { tenderDatasets } = await import(moduleUrl);
  assert.equal(tenderDatasets.length, 96);
  assert.equal(new Set(tenderDatasets.map((item) => item.id)).size, 96);
  assert.equal(new Set(tenderDatasets.map((item) => item.exampleRu)).size, 96);
  for (const item of tenderDatasets) {
    assert.match(item.id, /^dataset:TEA-DS-[A-Z0-9-]+$/);
    assert.match(item.exampleRu, /[А-Яа-яЁё]/, `${item.id} needs a Russian example`);
  }
});
