import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const projectRoot = process.cwd();
const read = (relativePath) => readFile(path.join(projectRoot, relativePath), "utf8");

test("uses one accessible role-callout grammar with distinct Agent-specific meaning", async () => {
  const [component, styles, balance, logistics, match] = await Promise.all([
    read("apps/tender-apps/src/agent-role-callout.tsx"),
    read("apps/tender-apps/src/agent-role-callout.css"),
    read("apps/tender-apps/src/balance-sheet-app.tsx"),
    read("apps/tender-apps/src/logistics-costing-app.tsx"),
    read("apps/tender-apps/src/tendermatch-app.tsx"),
  ]);

  assert.match(component, /<aside className=\{classes\} aria-labelledby=\{titleId\}>/);
  assert.match(component, /<img src=\{imageSrc\} alt=\{imageAlt\}/);
  assert.match(component, /<ul className="agent-role-callout__tags"/);
  assert.match(styles, /\.agent-role-callout::after/);
  assert.match(styles, /border-radius: 42% 58% 48% 52% \/ 35% 42% 58% 65%/);
  assert.match(styles, /@media \(max-width: 440px\)[\s\S]+grid-template-columns: 1fr/);

  assert.match(balance, /AgentRoleCallout[\s\S]+CLIENT FINANCIAL EVIDENCE WORKSPACE[\s\S]+#Digitize[\s\S]+#Reconcile[\s\S]+#Trace[\s\S]+Financial evidence workspace/);
  assert.match(logistics, /AgentRoleCallout[\s\S]+CLIENT LOGISTICS PLANNING WORKSPACE[\s\S]+#Scope[\s\S]+#Cost[\s\S]+#Explain[\s\S]+Delivery cost workspace/);
  assert.match(match, /AgentRoleCallout[\s\S]+TENDERLAB CONSULTANT WORKSPACE[\s\S]+#Discover[\s\S]+#Compare[\s\S]+#Explain[\s\S]+Tender matching workspace/);

  const imagePaths = [
    "apps/tender-apps/public/tenderbalance/illustrations/tenderbalance-finance-reviewer.png",
    "apps/tender-apps/public/logistics-cost/illustrations/logistics-cost-planner.png",
    "apps/tender-apps/public/tendermatch/illustrations/tendermatch-consultant.png",
  ];
  const images = await Promise.all(imagePaths.map((imagePath) => readFile(path.join(projectRoot, imagePath))));
  const hashes = images.map((image) => createHash("sha256").update(image).digest("hex"));
  assert.equal(new Set(hashes).size, 3, "each practical Agent must use a distinct local role image");
  assert.ok(images.every((image) => image.byteLength > 100_000));
});

test("places each role callout inside the outcome header without changing the domain story", async () => {
  const [manifesto, balance, logistics] = await Promise.all([
    read("apps/tender-apps/src/client-product-manifesto.tsx"),
    read("apps/tender-apps/src/balance-sheet-app.tsx"),
    read("apps/tender-apps/src/logistics-costing-app.tsx"),
  ]);

  assert.match(manifesto, /part="outcome-promise"[\s\S]+\{roleCallout\}[\s\S]+part="input"/);
  assert.ok(balance.indexOf("roleCallout") < balance.indexOf("WHAT YOU PROVIDE"));
  assert.ok(logistics.indexOf("cost-role-callout") < logistics.indexOf("WHAT YOU PROVIDE"));
  assert.doesNotMatch(`${balance}\n${logistics}`, /https?:\/\/[^"']+\.(?:png|jpe?g|webp)/i);
});
