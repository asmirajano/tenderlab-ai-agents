import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const reviewedPath = "C:/Users/Cowork 2/.codex/private/tendermatch-pilot/tendermatch-general-rule.html";
const pagePath = "apps/tender-match/src/tendermatch-general-rule.html";
const approvedDigest = "21a40b9cfb953294a1a8043347043106298b7397a1d5ab1e220debfbc0ea4936";

test("integrated How it works HTML is the exact reviewed Russian document", () => {
  const page = readFileSync(pagePath);
  assert.equal(createHash("sha256").update(page).digest("hex"), approvedDigest);
  if (existsSync(reviewedPath)) assert.deepEqual(page, readFileSync(reviewedPath));
});

test("approved sections and original interactive arithmetic are present", () => {
  const page = readFileSync(pagePath, "utf8");
  for (const id of ["retrieval-heading", "fixed-heading", "formula-heading", "funnel-heading", "details-heading", "wc", "wt", "ws", "cc", "ct", "cs", "calculation"]) {
    assert.match(page, new RegExp(`id="${id}"`));
  }
  assert.match(page, /800000\*ws\/wu/);
  assert.match(page, /200000\*cs\/cu/);
  assert.match(page, /200 000 \+ 80 000 = 280 000 \/ 1 000 000/);
  assert.match(page, /Formula: 35 \+ 12 \+ 0 \+ 8 \+ 0 = 55 \/ 100/);
  assert.match(page, /MISSING, не «провален»/);
  assert.match(page, /<details class="try">/);
  assert.match(page, /<details><summary><span class="badge real"/);
});

test("TenderMatch hosts the source document and keeps Formula as its own route", () => {
  const view = readFileSync("apps/tender-match/src/tendermatch-how-it-works-view.tsx", "utf8");
  const app = readFileSync("apps/tender-match/src/tendermatch-app.tsx", "utf8");
  assert.match(view, /import approvedHtml from "\.\/tendermatch-general-rule\.html\?raw"/);
  assert.match(view, /srcDoc=\{approvedHtml\}/);
  assert.match(view, /href="\/tendermatch\?view=formula"/);
  assert.match(app, /id: "how-it-works", label: "How it works"/);
  assert.match(app, /view === "formula" && <TenderMatchFormulaView \/>/);
  assert.match(app, /view === "how-it-works" && <TenderMatchHowItWorksView \/>/);
});
