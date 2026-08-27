import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appUrl = new URL("../apps/tender-apps/src/balance-sheet-app.tsx", import.meta.url);
const cssUrl = new URL("../apps/tender-apps/src/balance-sheet.css", import.meta.url);

test("TenderBalance starts with a clean client surface and keeps demos separate", async () => {
  const source = await readFile(appUrl, "utf8");

  assert.match(source, /useState<BalanceSurface>\("welcome"\)/);
  assert.match(source, /useState<BalanceSheetReview\[]>\(readClientCases\)/);
  assert.doesNotMatch(source, /const \[reviews[^\n]+syntheticBalanceSheetReviews/);
  assert.match(source, /Open a clearly labelled demo/);
  assert.match(source, /setDemoMode\(true\)/);
  assert.match(source, /SYNTHETIC FIXTURE\|NOT CLIENT EVIDENCE/);
  assert.match(source, /was not saved as client evidence/);
  assert.match(source, /Demo workspace · never stored as client evidence/);
});

test("TenderBalance provides guided multi-document intake and client-facing clarification", async () => {
  const source = await readFile(appUrl, "utf8");

  assert.match(source, /Start financial statement review/);
  assert.match(source, /type="file" multiple/);
  assert.match(source, /Company or case context/);
  assert.match(source, /tenderapps:tenderbalance:case-contexts:v1/);
  assert.match(source, /Please confirm the extracted context/);
  assert.match(source, /Confirm and open review/);
  assert.match(source, /what happened|clientIssueCopy/);
  assert.match(source, /Please add the complete statement/);
  assert.match(source, /No figures have been invented/);
  assert.match(await readFile(new URL("./fixtures/SYNTHETIC_Client_Intake_Balance.txt", import.meta.url), "utf8"), /SYNTHETIC FIXTURE - NOT CLIENT EVIDENCE/);
});

test("TenderBalance exposes result approval, persistent cases, and an advanced audit layer", async () => {
  const [source, css] = await Promise.all([readFile(appUrl, "utf8"), readFile(cssUrl, "utf8")]);

  assert.match(source, /tenderapps:tenderbalance:client-cases:v1/);
  assert.match(source, /window\.localStorage\.setItem/);
  assert.match(source, /Financial statement[\s\S]*review cases/);
  assert.match(source, /Approve result/);
  assert.match(source, /View saved case/);
  assert.match(source, /Advanced audit and developer details/);
  assert.match(source, /Original reported figures remain separate/);
  assert.match(css, /\.bs-case-list/);
  assert.match(css, /\.bs-result-overview/);
  assert.match(css, /@media \(max-width: 650px\)[\s\S]+bs-client-dropzone/);
});
