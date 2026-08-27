import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { clientProducts, landedCostProduct, tenderBalanceProduct } from "../packages/catalog-data/src/client-products.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tenderAppsRoot = path.join(projectRoot, "apps", "tender-apps");

async function readProject(relativePath) {
  return readFile(path.join(projectRoot, relativePath), "utf8");
}

test("registers both practical Agents as pages in one Tender Apps product", () => {
  assert.equal(clientProducts.length, 2);
  assert.equal(tenderBalanceProduct.family, "Tender Apps");
  assert.equal(tenderBalanceProduct.name, "TenderBalance");
  assert.equal(tenderBalanceProduct.status, "mvp-simulation");
  assert.equal(tenderBalanceProduct.ownerAgentId, "agent:TL-A008");
  assert.equal(landedCostProduct.ownerAgentId, "agent:TL-A050");
  assert.equal(tenderBalanceProduct.clientAppPath, "apps/tender-apps");
  assert.equal(landedCostProduct.clientAppPath, "apps/tender-apps");
  assert.equal(tenderBalanceProduct.clientRoute, "/balance-sheet-review");
  assert.equal(landedCostProduct.clientRoute, "/landed-cost");
  assert.equal(tenderBalanceProduct.access.commandCenterAudience, "team-admin-only");
  assert.equal(tenderBalanceProduct.access.clientAppToCommandCenter, false);
  assert.equal(tenderBalanceProduct.access.separateOriginRequired, true);
  assert.equal(tenderBalanceProduct.access.serverSideAuthorizationRequired, true);
});

test("builds TenderBalance inside the unified client app without Command Center navigation", async () => {
  const index = await readFile(path.join(tenderAppsRoot, "dist", "index.html"), "utf8");
  const assetNames = await readdir(path.join(tenderAppsRoot, "dist", "assets"));
  const javascript = (await Promise.all(
    assetNames.filter((name) => name.endsWith(".js")).map((name) => readFile(path.join(tenderAppsRoot, "dist", "assets", name), "utf8")),
  )).join("\n");

  assert.match(index, /Tender Apps — Practical Agent catalog/);
  assert.match(index, /noindex,nofollow/);
  assert.match(javascript, /Practical agents/);
  assert.match(javascript, /SYNTHETIC FIXTURE/);
  assert.match(javascript, /Add balance sheet/);
  assert.match(javascript, /Landed Cost Studio/);
  assert.match(javascript, /balance-sheet-review/);
  assert.match(javascript, /landed-cost/);
  assert.doesNotMatch(javascript, /href:"\/(?:agents|architecture|case-simulation|products)/);
  assert.doesNotMatch(javascript, /TenderLab home/);
  await assert.rejects(access(path.join(projectRoot, "apps", "tender-balance", "src", "App.tsx")));
});

test("deploys the temporarily public Command Center and client products through one test-gated workflow", async () => {
  const workflow = await readFile(path.join(projectRoot, ".github", "workflows", "deploy-firebase.yml"), "utf8");
  assert.match(workflow, /target:\s*tenderlab\s*$/m);
  assert.match(workflow, /target:\s*ecosystem-atlas\s*$/m);
  assert.match(workflow, /target:\s*tender-apps\s*$/m);
});

test("keeps the client product out of the internal Command Center route tree", async () => {
  const [navigation, exportScript] = await Promise.all([
    readProject("app/top-navigation.tsx"),
    readProject("scripts/export-firebase.mjs"),
  ]);

  assert.doesNotMatch(navigation, /href=["']\/logistics-costing/);
  assert.doesNotMatch(exportScript, /logistics-costing/);
  assert.doesNotMatch(exportScript, /balance-sheet-app|landed-cost/);
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

test("builds one Tender Apps bundle with dedicated practical-Agent pages and no Command Center backlink", async () => {
  const [html, component, shell, assetNames] = await Promise.all([
    readFile(path.join(tenderAppsRoot, "dist", "index.html"), "utf8"),
    readFile(path.join(tenderAppsRoot, "src", "logistics-costing-app.tsx"), "utf8"),
    readFile(path.join(tenderAppsRoot, "src", "main.tsx"), "utf8"),
    readdir(path.join(tenderAppsRoot, "dist", "assets")),
  ]);

  assert.match(html, /<title>Tender Apps — Practical Agent catalog<\/title>/);
  assert.match(html, /name="robots" content="noindex,nofollow"/);
  assert.ok(assetNames.some((name) => name.endsWith(".js")));
  assert.ok(assetNames.some((name) => name.endsWith(".css")));
  const clientBundle = (await Promise.all(assetNames
    .filter((name) => name.endsWith(".js"))
    .map((name) => readFile(path.join(tenderAppsRoot, "dist", "assets", name), "utf8")))).join("\n");
  assert.match(clientBundle, /LANDED COST STUDIO · PHASE 1/);
  assert.match(clientBundle, /tenderapps\.landed-cost\.audit\.v0\.1/);
  assert.match(shell, /Client workspace/);
  assert.match(shell, /TenderBalance/);
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

test("maps one unified Tender Apps target and keeps old product hosts as redirects", async () => {
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
  const configuredTarget = firebaseProjects.targets?.[firebaseProjects.projects.default]?.hosting?.["tender-apps"];
  assert.deepEqual(configuredTarget, ["tenderapps-ai"]);
  assert.deepEqual(firebaseProjects.targets?.[firebaseProjects.projects.default]?.hosting?.["tender-balance"], ["tenderbalance-ai"]);
  assert.deepEqual(firebaseProjects.targets?.[firebaseProjects.projects.default]?.hosting?.["tender-apps-legacy"], ["tenderapps-landed-cost"]);
  const balanceLegacy = firebaseConfig.hosting.find((entry) => entry.target === "tender-balance");
  const costLegacy = firebaseConfig.hosting.find((entry) => entry.target === "tender-apps-legacy");
  assert.equal(balanceLegacy.redirects[0].destination, "https://tenderapps-ai.web.app/balance-sheet-review");
  assert.equal(costLegacy.redirects[0].destination, "https://tenderapps-ai.web.app/landed-cost");
  assert.match(deployWorkflow, /Deploy unified Tender Apps/);
  assert.doesNotMatch(deployWorkflow, /NEXT_PUBLIC_TENDER_BALANCE_URL/);
});
