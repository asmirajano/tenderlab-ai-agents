import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const projectRoot = process.cwd();
const load = (relativePath) => import(pathToFileURL(path.join(projectRoot, relativePath)).href);

test("derives Participation from all 10 Case engagement registries", async () => {
  const [{ agents }, { validationCases }] = await Promise.all([
    load("packages/catalog-data/src/agents.ts"),
    load("app/case-simulation/case-program-conclusion-data.ts"),
  ]);

  assert.equal(validationCases.length, 10);
  assert.ok(validationCases.every((records) => records.length === 64));

  const participation = new Map(agents.map((agent) => {
    const cases = validationCases.filter((records) => records.find((record) => record.agentId === agent.id)?.status !== "not-involved").length;
    return [agent.id, { cases, percent: cases / validationCases.length * 100 }];
  }));

  assert.equal(participation.size, 64);
  assert.deepEqual(participation.get(1), { cases: 10, percent: 100 });
  assert.deepEqual(participation.get(41), { cases: 3, percent: 30 });
  assert.ok([...participation.values()].every((record) => Number.isInteger(record.percent) && record.percent % 10 === 0));
});

test("renders an accessible sortable Participation column after Case 10", async () => {
  const [page, css] = await Promise.all([
    readFile(path.join(projectRoot, "app", "case-simulation", "page.tsx"), "utf8"),
    readFile(path.join(projectRoot, "app", "case-simulation", "case-simulation.css"), "utf8"),
  ]);

  const caseTenHeader = page.indexOf('className="case-ten-column"');
  const participationHeader = page.indexOf('className="participation-column"', caseTenHeader);
  assert.ok(caseTenHeader >= 0 && participationHeader > caseTenHeader);
  assert.match(page, /validationCases\.reduce/);
  assert.match(page, /engagement\.status !== "not-involved"/);
  assert.match(page, /aria-sort=\{participationSort/);
  assert.match(page, /role="progressbar"/);
  assert.match(page, /colSpan=\{12\}/);
  assert.match(css, /\.participation-sort-button/);
  assert.match(css, /\.participation-track/);
  assert.match(css, /position: sticky;[\s\S]*right: 0;/);
});
