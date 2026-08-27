import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function read(relativePath) {
  return readFile(path.join(projectRoot, relativePath), "utf8");
}

test("provides one accessible persisted layout preference in the shared Tender Apps shell", async () => {
  const [main, switcher] = await Promise.all([
    read("apps/tender-apps/src/main.tsx"),
    read("apps/tender-apps/src/layout-switcher.tsx"),
  ]);

  assert.match(main, /data-layout=\{layoutMode\}/);
  assert.match(main, /<LayoutSwitcher value=\{layoutMode\} onChange=\{setLayoutMode\}/);
  assert.match(switcher, /tenderapps:layout-mode/);
  assert.match(switcher, /window\.localStorage\.setItem/);
  assert.match(switcher, /aria-label="Workspace layout width"/);
  assert.match(switcher, /aria-pressed=\{value === "standard"\}/);
  assert.match(switcher, /aria-pressed=\{value === "wide"\}/);
  assert.match(switcher, /ArrowLeft/);
  assert.match(switcher, /ArrowRight/);
  assert.match(switcher, />\s*Standard\s*</);
  assert.match(switcher, />\s*Wide\s*</);
});

test("expands only shared workspace limits and lets responsive layouts override Wide", async () => {
  const [shell, balanceSheet, landedCost] = await Promise.all([
    read("apps/tender-apps/src/client-shell.css"),
    read("apps/tender-apps/src/balance-sheet.css"),
    read("apps/tender-apps/src/logistics-costing.css"),
  ]);

  assert.match(shell, /--catalog-content-max-width:\s*1500px/);
  assert.match(shell, /--balance-content-max-width:\s*1580px/);
  assert.match(shell, /--costing-content-max-width:\s*1640px/);
  assert.match(shell, /@media \(min-width: 1280px\)[\s\S]+data-layout="wide"[\s\S]+2400px/);
  assert.match(shell, /@media \(max-width: 760px\)[\s\S]+client-header-controls[\s\S]+overflow-x:\s*auto/);
  assert.match(shell, /client-header-controls[^}]+max-width:\s*100vw[^}]+width:\s*100%/);
  assert.match(balanceSheet, /max-width:\s*var\(--balance-content-max-width\)/);
  assert.match(landedCost, /max-width:\s*var\(--costing-content-max-width\)/);
  assert.doesNotMatch(shell, /data-layout="wide"[^}]+font-size/);
  assert.doesNotMatch(shell, /data-layout="wide"[^}]+zoom/);
});
