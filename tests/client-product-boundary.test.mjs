import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tenderAppsRoot = path.join(projectRoot, "apps", "tender-apps");

async function readProject(relativePath) {
  return readFile(path.join(projectRoot, relativePath), "utf8");
}

test("keeps the client product out of the internal Command Center route tree", async () => {
  const commandAssetsRoot = path.join(projectRoot, "dist", "firebase", "_next");
  const [navigation, exportScript, publishedFiles, commandAssetNames] = await Promise.all([
    readProject("app/top-navigation.tsx"),
    readProject("scripts/export-firebase.mjs"),
    readdir(path.join(projectRoot, "dist", "firebase")),
    readdir(commandAssetsRoot, { recursive: true }),
  ]);
  const commandAssetText = (await Promise.all(commandAssetNames
    .filter((name) => /\.(?:js|css)$/.test(name))
    .map((name) => readFile(path.join(commandAssetsRoot, name), "utf8")))).join("\n");

  assert.doesNotMatch(navigation, /href=["']\/logistics-costing/);
  assert.doesNotMatch(exportScript, /logistics-costing/);
  assert.ok(!publishedFiles.includes("logistics-costing.html"));
  assert.doesNotMatch(commandAssetText, /LANDED COST STUDIO · PHASE 1|Initial regression reproduced|tenderapps\.landed-cost/);
  await assert.rejects(access(path.join(projectRoot, "app", "logistics-costing")));
});

test("provides a one-way, separately configured Command Center launch", async () => {
  const navigation = await readProject("app/top-navigation.tsx");

  assert.match(navigation, /NEXT_PUBLIC_TENDER_APPS_URL/);
  assert.match(navigation, /new URL\(configured\)/);
  assert.match(navigation, /target="_blank"/);
  assert.match(navigation, /rel="noreferrer"/);
  assert.match(navigation, /TenderApps/);
  assert.doesNotMatch(navigation, /NEXT_PUBLIC_TENDER_APPS_URL[^\n]+\?\?[^\n]+\//);
});

test("builds TenderApps as a separately branded client bundle with no Command Center backlink", async () => {
  const [html, component, shell, assetNames] = await Promise.all([
    readFile(path.join(tenderAppsRoot, "dist", "index.html"), "utf8"),
    readFile(path.join(tenderAppsRoot, "src", "logistics-costing-app.tsx"), "utf8"),
    readFile(path.join(tenderAppsRoot, "src", "main.tsx"), "utf8"),
    readdir(path.join(tenderAppsRoot, "dist", "assets")),
  ]);

  assert.match(html, /<title>TenderApps — Landed Cost Studio<\/title>/);
  assert.match(html, /name="robots" content="noindex,nofollow"/);
  assert.ok(assetNames.some((name) => name.endsWith(".js")));
  assert.ok(assetNames.some((name) => name.endsWith(".css")));
  const clientBundle = (await Promise.all(assetNames
    .filter((name) => name.endsWith(".js"))
    .map((name) => readFile(path.join(tenderAppsRoot, "dist", "assets", name), "utf8")))).join("\n");
  assert.match(clientBundle, /LANDED COST STUDIO · PHASE 1/);
  assert.match(clientBundle, /tenderapps\.landed-cost\.audit\.v0\.1/);
  assert.match(shell, /Client workspace/);
  assert.match(shell, /Landed Cost Studio/);
  assert.match(component, /LANDED COST STUDIO · PHASE 1/);
  assert.match(component, /Incoterms conversion/);
  assert.match(component, /Logistics only/);
  assert.match(component, /Scenario comparison/);
  assert.match(component, /Initial regression reproduced/);
  assert.doesNotMatch(component, /href=["']\/(?:agents|architecture|case-simulation|main-agents-run)/);
  assert.doesNotMatch(component, /TL-A050|A021 · A046|A049 · A051/);
  assert.doesNotMatch(shell, /Command Center|top-navigation/);
});

test("prepares an independent TenderApps build without mapping or deploying it", async () => {
  const [firebaseConfig, rootPackage, firebaseProjects, deployWorkflow] = await Promise.all([
    readProject("firebase.json").then(JSON.parse),
    readProject("package.json").then(JSON.parse),
    readProject(".firebaserc").then(JSON.parse),
    readProject(".github/workflows/deploy-firebase.yml"),
  ]);
  const clientHosting = firebaseConfig.hosting.find((entry) => entry.target === "tender-apps");

  assert.ok(clientHosting, "expected a distinct TenderApps Firebase target");
  assert.equal(clientHosting.public, "apps/tender-apps/dist");
  assert.notEqual(clientHosting.public, firebaseConfig.hosting.find((entry) => entry.target === "tenderlab")?.public);
  assert.match(JSON.stringify(clientHosting.headers), /frame-ancestors 'none'/);
  assert.match(JSON.stringify(clientHosting.headers), /noindex, nofollow, noarchive/);
  assert.match(rootPackage.scripts.build, /build:tender-apps/);
  assert.equal(rootPackage.scripts["build:tender-apps"], "npm --prefix apps/tender-apps run build");
  assert.equal(firebaseProjects.targets?.[firebaseProjects.projects.default]?.hosting?.["tender-apps"], undefined);
  assert.doesNotMatch(deployWorkflow, /hosting:tender-apps/);
});
