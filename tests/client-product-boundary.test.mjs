import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { tenderBalanceProduct } from "../packages/catalog-data/src/client-products.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tenderBalanceRoot = path.join(projectRoot, "apps", "tender-balance");

test("registers TenderBalance as a separately built Tender Apps product", () => {
  assert.equal(tenderBalanceProduct.family, "Tender Apps");
  assert.equal(tenderBalanceProduct.name, "TenderBalance");
  assert.equal(tenderBalanceProduct.status, "mvp-simulation");
  assert.equal(tenderBalanceProduct.ownerAgentId, "agent:TL-A008");
  assert.equal(tenderBalanceProduct.access.commandCenterAudience, "team-admin-only");
  assert.equal(tenderBalanceProduct.access.clientAppToCommandCenter, false);
  assert.equal(tenderBalanceProduct.access.separateOriginRequired, true);
  assert.equal(tenderBalanceProduct.access.serverSideAuthorizationRequired, true);
});

test("builds a standalone client app without internal Command Center navigation", async () => {
  const index = await readFile(path.join(tenderBalanceRoot, "dist", "index.html"), "utf8");
  const assetNames = await readdir(path.join(tenderBalanceRoot, "dist", "assets"));
  const javascript = (await Promise.all(
    assetNames.filter((name) => name.endsWith(".js")).map((name) => readFile(path.join(tenderBalanceRoot, "dist", "assets", name), "utf8")),
  )).join("\n");

  assert.match(index, /TenderBalance — Verified balance-sheet digitization/);
  assert.match(index, /noindex,nofollow,noarchive/);
  assert.match(javascript, /PRIVATE CLIENT WORKSPACE/);
  assert.match(javascript, /SYNTHETIC FIXTURE/);
  assert.match(javascript, /Add balance sheet/);
  assert.doesNotMatch(javascript, /href:"\/(?:agents|architecture|case-simulation|products)/);
  assert.doesNotMatch(javascript, /TenderLab home/);
});

test("keeps the public Firebase workflow from deploying the internal Command Center target", async () => {
  const workflow = await readFile(path.join(projectRoot, ".github", "workflows", "deploy-firebase.yml"), "utf8");
  assert.doesNotMatch(workflow, /target:\s*tenderlab\s*$/m);
  assert.match(workflow, /target:\s*ecosystem-atlas\s*$/m);
});
