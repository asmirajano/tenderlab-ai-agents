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
  assert.match(switcher, /className="client-layout-options"/);
  assert.doesNotMatch(switcher, />\s*Layout\s*</);
  assert.match(switcher, /ArrowLeft/);
  assert.match(switcher, /ArrowRight/);
  assert.match(switcher, />\s*Standard\s*</);
  assert.match(switcher, />\s*Wide\s*</);
});

test("uses one practical-product coverage contract and lets responsive layouts override Wide", async () => {
  const [shell, manifesto, balanceSheet, landedCost, tenderMatch] = await Promise.all([
    read("apps/tender-apps/src/client-shell.css"),
    read("apps/tender-apps/src/client-product-manifesto.css"),
    read("apps/tender-apps/src/balance-sheet.css"),
    read("apps/tender-apps/src/logistics-costing.css"),
    read("apps/tender-apps/src/tendermatch.css"),
  ]);

  assert.match(shell, /--catalog-content-max-width:\s*1500px/);
  assert.match(shell, /--practical-content-max-width:\s*2100px/);
  assert.match(shell, /--balance-content-max-width:\s*var\(--practical-content-max-width\)/);
  assert.match(shell, /--costing-content-max-width:\s*var\(--practical-content-max-width\)/);
  assert.match(shell, /--match-content-max-width:\s*var\(--practical-content-max-width\)/);
  assert.match(shell, /--practical-overview-title-size:\s*clamp\(48px, 4vw, 72px\)/);
  assert.match(shell, /@media \(min-width: 1280px\)[\s\S]+data-layout="wide"[\s\S]+--practical-content-max-width:\s*2800px/);
  assert.match(shell, /@media \(max-width: 1040px\)[\s\S]+client-header-controls[\s\S]+overflow-x:\s*auto/);
  assert.match(shell, /client-layout-options[\s\S]+border-radius:\s*999px/);
  assert.match(shell, /client-header-controls[^}]+max-width:\s*100vw[^}]+width:\s*100%/);
  assert.match(balanceSheet, /max-width:\s*var\(--balance-content-max-width\)/);
  assert.match(landedCost, /max-width:\s*var\(--costing-content-max-width\)/);
  assert.match(manifesto, /padding:\s*var\(--practical-overview-top-space\)/);
  assert.match(manifesto, /font-size:\s*var\(--practical-overview-title-size\)/);
  assert.match(landedCost, /\.cost-product-heading h1 \{[^}]+font-size:\s*var\(--practical-overview-title-size\)/);
  assert.match(tenderMatch, /\.tb3-page-overview \.tb3-overview-heading h1 \{[^}]+font-size:\s*var\(--practical-overview-title-size\)/);
  assert.match(tenderMatch, /\.tb3-page-overview \{\s*padding-top:\s*148px/);
  assert.doesNotMatch(shell, /data-layout="wide"[^}]+font-size/);
  assert.doesNotMatch(shell, /data-layout="wide"[^}]+zoom/);
});

test("uses one responsive typography scale across every Tender Apps surface", async () => {
  const [shell, balanceSheet, finForms, landedCost] = await Promise.all([
    read("apps/tender-apps/src/client-shell.css"),
    read("apps/tender-apps/src/balance-sheet.css"),
    read("apps/tender-apps/src/fin-forms.css"),
    read("apps/tender-apps/src/logistics-costing.css"),
  ]);

  assert.match(shell, /\.tender-apps-product \{[\s\S]+--type-micro:\s*clamp\(/);
  assert.match(shell, /--type-body:\s*clamp\(/);
  assert.match(shell, /--type-control:\s*clamp\(/);
  assert.match(shell, /font-size:\s*var\(--type-body\)/);
  assert.ok((balanceSheet.match(/var\(--type-(?:micro|label|small)\)/g) ?? []).length > 100);
  assert.ok((finForms.match(/var\(--type-(?:micro|label|small)\)/g) ?? []).length > 35);
  assert.ok((landedCost.match(/var\(--type-(?:micro|label|small|body|control|card-title)\)/g) ?? []).length > 55);
  assert.doesNotMatch(`${balanceSheet}\n${finForms}\n${landedCost}`, /font-size:\s*(?:6|7|8|9|10|11)px(?:\s*!important)?;/);
});

test("separates the platform catalog, scalable Agent navigation, and view controls", async () => {
  const [main, shell, registry, catalog] = await Promise.all([
    read("apps/tender-apps/src/main.tsx"),
    read("apps/tender-apps/src/client-shell.css"),
    read("apps/tender-apps/src/practical-agent-registry.tsx"),
    read("apps/tender-apps/src/catalog-page.tsx"),
  ]);

  assert.match(main, /className="client-catalog-link"[\s\S]+Catalog/);
  assert.match(main, /className="client-navigation-flow">→/);
  assert.match(main, /aria-label="Tender Apps practical Agents" className="client-agent-nav"/);
  assert.match(main, /client-navigation-cluster[\s\S]+client-catalog-link[\s\S]+client-agent-nav[\s\S]+<LayoutSwitcher/);
  assert.match(main, /practicalAgents\.map/);
  assert.match(shell, /\.client-catalog-link\[aria-current="page"\]/);
  assert.match(shell, /\.client-agent-nav a\[aria-current="page"\]/);
  assert.match(shell, /\.client-layout-switcher \{[^}]*border-left:/);
  assert.match(shell, /\.client-agent-nav \{[^}]*display:\s*flex;[^}]*gap:\s*8px/);
  assert.doesNotMatch(shell, /\.client-agent-nav \{[^}]*(?:background|border|border-radius|padding):/);
  assert.match(shell, /\.client-agent-nav a \{[^}]*background:\s*white;[^}]*border:\s*1px solid[^}]*border-radius:\s*11px/);
  assert.match(shell, /\.client-layout-options \{[^}]*border-radius:\s*999px/);
  assert.match(registry, /canonicalName:\s*product\.name/);
  assert.match(registry, /productId:\s*"product:TA-LANDED-COST"[\s\S]+displayName:\s*"Tender Logistics Cost"/);
  assert.match(registry, /productId:\s*"product:TA-TENDERBOOST"[\s\S]+displayName:\s*"TenderMatch"/);
  assert.match(catalog, /PracticalAgentVisual/);
  assert.match(shell, /\.client-agent-card > header[\s\S]+\.client-agent-visual/);
});
