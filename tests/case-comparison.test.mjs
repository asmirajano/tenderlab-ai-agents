import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

const projectRoot = process.cwd();

test("builds Case Comparison from a scalable normalized Case registry", async () => {
  const [{ caseComparisonRegistry, comparisonDimensions, compareValues }, component, page, css] = await Promise.all([
    import(pathToFileURL(path.join(projectRoot, "app", "case-simulation", "case-comparison-data.ts")).href),
    readFile(path.join(projectRoot, "app", "case-simulation", "case-comparison.tsx"), "utf8"),
    readFile(path.join(projectRoot, "app", "case-simulation", "page.tsx"), "utf8"),
    readFile(path.join(projectRoot, "app", "case-simulation", "case-simulation.css"), "utf8"),
  ]);

  assert.equal(caseComparisonRegistry.length, 2);
  assert.ok(comparisonDimensions.length >= 24);
  assert.deepEqual(comparisonDimensions.slice(0, 3).map((item) => item.id), ["purpose", "monetization", "consultantIncome"]);
  for (const profile of caseComparisonRegistry) {
    assert.equal(profile.engagements.length, 64);
    assert.ok(profile.eventCount > 0);
    assert.ok(profile.processCount > 0);
    for (const dimension of comparisonDimensions) assert.ok(profile.attributes[dimension.id], `Case ${profile.caseNumber} lacks ${dimension.id}`);
  }
  const trigger = comparisonDimensions.find((item) => item.id === "trigger");
  assert.equal(compareValues(caseComparisonRegistry[0].attributes.trigger, caseComparisonRegistry[1].attributes.trigger, trigger), "same");
  assert.match(caseComparisonRegistry[0].attributes.consultantIncome.text, /DEMO · \$90 250/);
  assert.match(caseComparisonRegistry[1].attributes.consultantIncome.text, /DEMO · \$15 000/);
  assert.match(component, /caseComparisonRegistry\.map/);
  assert.match(component, /AgentLinks/);
  assert.match(component, /compareValues/);
  assert.match(page, /<CaseComparison/);
  assert.ok(page.indexOf("<CaseComparison") < page.indexOf('className="engagement-matrix-section"'));
  assert.match(css, /\.case-comparison-table thead th \{[^}]*position: sticky/);
  assert.match(css, /\.case-comparison-table tbody > tr:not\(\.case-comparison-group\) > th \{[^}]*position: sticky/);
});
