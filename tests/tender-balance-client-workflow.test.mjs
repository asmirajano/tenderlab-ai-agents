import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appUrl = new URL("../apps/tender-apps/src/balance-sheet-app.tsx", import.meta.url);
const cssUrl = new URL("../apps/tender-apps/src/balance-sheet.css", import.meta.url);
const manifestoUrl = new URL("../apps/tender-apps/src/client-product-manifesto.tsx", import.meta.url);

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

test("TenderBalance declares input, transformation, and the tangible finished product before intake", async () => {
  const [source, manifesto] = await Promise.all([readFile(appUrl, "utf8"), readFile(manifestoUrl, "utf8")]);

  assert.match(manifesto, /client material -> compact agent transformation -> tangible client product/);
  assert.match(manifesto, /Client input, agent transformation, and finished product/);
  assert.match(source, /WHAT YOU PROVIDE/);
  assert.match(source, /Read[\s\S]*Structure[\s\S]*Validate[\s\S]*Reconcile[\s\S]*Review/);
  assert.match(source, /WHAT YOU RECEIVE/);
  assert.match(source, /Reviewed Financial Evidence/);
  assert.match(source, /ILLUSTRATIVE PRODUCT PREVIEW · NOT CLIENT EVIDENCE/);
  assert.match(source, /Original labels preserved/);
  assert.match(source, /Ready for downstream tender analysis/);
  assert.match(source, /How it works, accepted inputs, and scope/);
});

test("TenderBalance exposes result approval, persistent cases, and an advanced audit layer", async () => {
  const [source, css] = await Promise.all([readFile(appUrl, "utf8"), readFile(cssUrl, "utf8")]);

  assert.match(source, /tenderapps:tenderbalance:client-cases:v1/);
  assert.match(source, /window\.localStorage\.setItem/);
  assert.match(source, /Financial statement[\s\S]*review cases/);
  assert.match(source, /Approve result/);
  assert.match(source, /Open saved case/);
  assert.match(source, /Advanced audit and developer details/);
  assert.match(source, /Original reported figures remain separate/);
  assert.match(css, /\.bs-case-list/);
  assert.match(css, /\.bs-result-overview/);
  assert.match(css, /@media \(max-width: 650px\)[\s\S]+bs-client-dropzone/);
});

test("TenderBalance guides every approval blocker and reveals the saved finished-product state", async () => {
  const [source, css] = await Promise.all([readFile(appUrl, "utf8"), readFile(cssUrl, "utf8")]);

  assert.match(source, /BEFORE THIS RESULT CAN BE APPROVED/);
  assert.match(source, /remainingActionCount/);
  assert.match(source, /Continue review →/);
  assert.match(source, /Mark reviewed and continue →/);
  assert.match(source, /Accept agent-validated rows/);
  assert.match(source, /Resolve exceptions manually/);
  assert.match(source, /tenderapps:tenderbalance:comparison-decisions:v1/);
  assert.match(source, /The selected documents identify different reporting entities/);
  assert.match(source, /Acknowledge & retain/);
  assert.match(source, /unacknowledged cross-document discrepanc/);
  assert.match(source, /tender-balance-client-package\/v1/);
  assert.match(source, /Activates automatically when blockers, unreviewed rows, and unacknowledged differences reach zero/);
  assert.match(source, /Why approval is locked:/);
  assert.match(source, /Review remaining items →/);
  assert.match(source, /Review complete — ready for approval/);
  assert.match(source, /Financial evidence approved/);
  assert.match(source, /Saved automatically to Cases/);
  assert.match(source, /View approved result/);
  assert.match(source, /Open saved case/);
  assert.match(css, /\.bs-approval-readiness/);
  assert.match(css, /\.bs-approved-result/);
});
