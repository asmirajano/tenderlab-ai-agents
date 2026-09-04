import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  TENDERMATCH_EXPLORATORY_ENGINE_VERSION,
  TENDERMATCH_EXPLORATORY_POLICY_VERSION,
} from "../packages/tendermatch/src/index.ts";
import { tenderMatchFormulaPresentation as formula } from "../apps/tender-apps/src/tendermatch-formula-contract.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => readFile(path.join(projectRoot, relativePath), "utf8");

test("Formula page is version-locked to the active deterministic engine and policy", () => {
  assert.equal(formula.version, "Formula v1.1");
  assert.equal(formula.engineVersion, TENDERMATCH_EXPLORATORY_ENGINE_VERSION);
  assert.equal(formula.policyVersion, TENDERMATCH_EXPLORATORY_POLICY_VERSION);
  assert.deepEqual(formula.goods.map(({ code, label, weight }) => [code, label, weight]), [
    ["technical-relevance", "Product technical fit", 35],
    ["capacity-delivery", "Supply capacity and delivery feasibility", 20],
    ["comparable-experience", "Comparable contract experience", 20],
    ["market-delivery", "Geography, logistics and after-sales", 10],
    ["financial-procurement-readiness", "Financial and procurement readiness", 15],
  ]);
  assert.deepEqual(formula.works.map(({ code, label, weight }) => [code, label, weight]), [
    ["works-technical-relevance", "Works technical fit", 25],
    ["similar-contracts", "Similar contracts and references", 25],
    ["personnel-equipment-capacity", "Personnel, equipment and capacity", 20],
    ["mobilization-local-delivery", "Mobilization and local delivery", 15],
    ["financial-procurement-readiness", "Financial and procurement readiness", 15],
  ]);
  assert.equal(formula.goods.reduce((sum, criterion) => sum + criterion.weight, 0), 100);
  assert.equal(formula.works.reduce((sum, criterion) => sum + criterion.weight, 0), 100);
});

test("worked Formula example is arithmetically exact and distinguishes Missing from Fit 0", () => {
  const example = formula.workedExample;
  for (const criterion of example.criteria) {
    const expected = criterion.fit === null ? 0 : criterion.weight * criterion.fit / 5;
    assert.equal(criterion.points, expected, criterion.label);
  }
  assert.equal(example.criteria.reduce((sum, criterion) => sum + criterion.points, 0), 48);
  const assessedWeight = example.criteria.filter((criterion) => criterion.fit !== null).reduce((sum, criterion) => sum + criterion.weight, 0);
  assert.equal(assessedWeight, 65);
  assert.equal(Math.round(example.pairScore / assessedWeight * 100), 74);
  assert.equal(example.dataCoverage, 65);
  assert.deepEqual(formula.fitScale.map(({ value }) => value), [5, 4, 3, 2, 1, 0]);
  assert.ok(example.criteria.some((criterion) => criterion.fit === null));
  assert.ok(!formula.fitScale.some((level) => level.value === null));
});

test("Formula page exposes scoring scope, diagnostic gates and human-authority boundaries", async () => {
  const [page, formulaView] = await Promise.all([
    read("apps/tender-apps/src/tendermatch-app.tsx"),
    read("apps/tender-apps/src/tendermatch-formula-view.tsx"),
  ]);
  assert.match(page, /id: "formula", label: "Formula", short: "06"/);
  assert.match(page, /view === "formula" && <TenderMatchFormulaView \/>/);
  assert.match(formulaView, /It calculates compatibility; it does not make a Match \/ Non-match decision\./);
  assert.match(formulaView, /Missing is never Fit 0\./);
  assert.match(formulaView, /This arithmetic example demonstrates the active formula; it is not a live pair or a Match recommendation\./);
  assert.match(formulaView, /Visible, but not score points/);
  assert.match(formulaView, /Never modify Pair Score/);
  assert.match(formulaView, /zero does not mean Non-match/);
  assert.match(formulaView, /<details className="tb3-formula-details">/);
  assert.deepEqual(formula.separateSignals, ["Evidence Confidence", "Supplier readiness", "Deadline urgency", "Consultant disposition"]);
  assert.equal(formula.diagnosticGates.length, 8);
});
