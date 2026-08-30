import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appUrl = new URL("../apps/tender-apps/src/balance-sheet-app.tsx", import.meta.url);
const cssUrl = new URL("../apps/tender-apps/src/balance-sheet.css", import.meta.url);
const manifestoUrl = new URL("../apps/tender-apps/src/client-product-manifesto.tsx", import.meta.url);
const workspaceUrl = new URL("../apps/tender-apps/src/collapsible-workspace.tsx", import.meta.url);
const finWorkspaceUrl = new URL("../apps/tender-apps/src/fin-forms-workspace.tsx", import.meta.url);
const finSharedUrl = new URL("../apps/tender-apps/src/fin-form-shared.tsx", import.meta.url);
const fin2WorkspaceUrl = new URL("../apps/tender-apps/src/fin2-workspace.tsx", import.meta.url);
const finCssUrl = new URL("../apps/tender-apps/src/fin-forms.css", import.meta.url);

test("TenderBalance starts with a clean client surface and keeps demos separate", async () => {
  const source = await readFile(appUrl, "utf8");

  assert.match(source, /parseBalanceNavigation\(window\.location\.href\)/);
  assert.match(source, /useState<BalanceSurface>\(initialNavigation\.surface\)/);
  assert.match(source, /useState<BalanceSheetReview\[]>\(readClientCases\)/);
  assert.doesNotMatch(source, /const \[reviews[^\n]+syntheticBalanceSheetReviews/);
  assert.match(source, /Open a clearly labelled demo/);
  assert.match(source, /navigateTo\(\{ surface: "review", caseId: firstDemo\.reviewId, demo: true \}\)/);
  assert.match(source, /SYNTHETIC FIXTURE\|NOT CLIENT EVIDENCE/);
  assert.match(source, /was not saved as client evidence/);
  assert.match(source, /Demo workspace · never stored as client evidence/);
});

test("TenderBalance makes upload the only required client action before the result", async () => {
  const source = await readFile(appUrl, "utf8");

  assert.match(source, /Digitize a balance sheet/);
  assert.match(source, /type="file" multiple/);
  assert.match(source, /Add an optional internal company or case reference/);
  assert.match(source, /tenderapps:tenderbalance:case-contexts:v1/);
  assert.match(source, /Upload[\s\S]*Agent works[\s\S]*Result/);
  assert.match(source, /navigateTo\(\{ surface: "review", caseId: next\.reviewId, demo: false \}\)/);
  assert.match(source, /Preparing the finished digital balance sheet and saving the case/);
  assert.doesNotMatch(source, /Confirm and open review/);
  assert.match(source, /Please add the complete statement/);
  assert.match(source, /No figures have been invented/);
  assert.match(await readFile(new URL("./fixtures/SYNTHETIC_Client_Intake_Balance.txt", import.meta.url), "utf8"), /SYNTHETIC FIXTURE - NOT CLIENT EVIDENCE/);
});

test("TenderBalance declares input, transformation, and the tangible finished product before intake", async () => {
  const [source, manifesto] = await Promise.all([readFile(appUrl, "utf8"), readFile(manifestoUrl, "utf8")]);

  assert.match(manifesto, /audience-neutral practical-/);
  assert.match(manifesto, /part="outcome-promise"[\s\S]*part="input"[\s\S]*part="agent-transformation"[\s\S]*part="finished-output"[\s\S]*part="primary-action"/);
  assert.match(manifesto, /Client input, agent transformation, and finished product/);
  assert.match(source, /WHAT YOU PROVIDE/);
  assert.match(source, /Read[\s\S]*Identify[\s\S]*Extract[\s\S]*Structure[\s\S]*Check/);
  assert.match(source, /WHAT YOU RECEIVE/);
  assert.match(source, /Digitized Balance Sheet/);
  assert.match(source, /ILLUSTRATIVE PRODUCT PREVIEW · NOT CLIENT EVIDENCE/);
  assert.match(source, /Original labels preserved/);
  assert.match(source, /Ready for downstream tender analysis/);
  assert.match(source, /How it works, accepted inputs, and scope/);
});

test("TenderBalance exposes the finished result, automatic cases, and optional advanced controls", async () => {
  const [source, css] = await Promise.all([readFile(appUrl, "utf8"), readFile(cssUrl, "utf8")]);

  assert.match(source, /tenderapps:tenderbalance:client-cases:v1/);
  assert.match(source, /window\.localStorage\.setItem/);
  assert.match(source, /Your balance sheet[\s\S]*is ready/);
  assert.match(source, /Digitized Balance Sheet/);
  assert.match(source, /saved automatically to Cases/);
  assert.match(source, /Advanced Review & Audit/);
  assert.match(source, /This is not required to receive, save, inspect, or export the result/);
  assert.match(source, /No reported value was silently altered/);
  assert.match(source, /Export Excel/);
  assert.match(source, /application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/);
  assert.match(css, /\.bs-case-list/);
  assert.match(css, /\.bs-result-overview/);
  assert.match(css, /@media \(max-width: 650px\)[\s\S]+bs-client-dropzone/);
});

test("TenderBalance keeps correction, comparison, traceability, and formal approval behind the result", async () => {
  const [source, css] = await Promise.all([readFile(appUrl, "utf8"), readFile(cssUrl, "utf8")]);

  assert.match(source, /PRIMARY OUTPUT/);
  assert.match(source, /AUTOMATIC VALIDATION/);
  assert.match(source, /View detailed findings/);
  assert.match(source, /OPTIONAL CORRECTION/);
  assert.match(source, /OPTIONAL COMPARISON/);
  assert.match(source, /OPTIONAL FORMAL CONTROL/);
  assert.match(source, /Accept agent-validated rows/);
  assert.match(source, /tenderapps:tenderbalance:comparison-decisions:v1/);
  assert.match(source, /tender-balance-client-package\/v1/);
  assert.match(source, /These controls do not block the client result/);
  assert.match(css, /\.bs-professional-controls/);
  assert.match(css, /\.bs-client-result-table/);
});

test("TenderBalance provides registered global expansion controls without enrolling nested disclosures", async () => {
  const [source, workspace] = await Promise.all([readFile(appUrl, "utf8"), readFile(workspaceUrl, "utf8")]);

  assert.match(source, /<CollapsibleWorkspaceProvider>/);
  assert.match(source, /<WorkspaceGlobalControls \/>/);
  assert.match(source, /sectionId="balance-sheet-output"/);
  assert.match(source, /sectionId="automatic-validation"/);
  assert.match(source, /sectionId="advanced-review-audit"/);
  assert.match(source, /<details className="bs-finding-details">/);
  assert.match(source, /<details className="bs-audit-details">/);
  assert.match(workspace, /registerSection/);
  assert.match(workspace, /unregisterSection/);
  assert.match(workspace, /registered\.every\(\(\[, section\]\) => section\.expanded\)/);
  assert.match(workspace, /allExpanded \? "Collapse all" : "Expand all"/);
  assert.match(workspace, /aria-controls=\{controlledIds\}/);
  assert.match(workspace, /aria-expanded=\{expanded\}/);
});

test("TenderBalance Focus Mode is keyboard accessible and restores page scrolling and focus", async () => {
  const [workspace, css] = await Promise.all([readFile(workspaceUrl, "utf8"), readFile(cssUrl, "utf8")]);

  assert.match(workspace, /aria-pressed=\{focusActive\}/);
  assert.match(workspace, /aria-keyshortcuts=\{focusActive \? "Escape"/);
  assert.match(workspace, /event\.key !== "Escape"/);
  assert.match(workspace, /document\.body\.style\.overflow = "hidden"/);
  assert.match(workspace, /document\.documentElement\.style\.overflow = "hidden"/);
  assert.match(workspace, /document\.body\.style\.overflow = bodyOverflow/);
  assert.match(workspace, /focusButton\?\.focus\(\)/);
  assert.match(workspace, /focusActive: expanded \? current\[sectionId\]\.focusActive : false/);
  assert.match(workspace, /exitFocus\(sectionId\)/);
  assert.match(css, /\.bs-workspace-section\.is-focus-mode \{[^}]*position: fixed/);
  assert.match(css, /\.bs-workspace-section\.is-focus-mode > \.bs-workspace-section-content \{[^}]*overflow: auto/);
  assert.match(css, /@media \(max-width: 650px\)[\s\S]+\.bs-workspace-controls/);
});

test("TenderBalance continues from the digitized result into the shared FIN-1 and FIN-2 workflow", async () => {
  const [source, finWorkspace, finShared, fin2Workspace] = await Promise.all([readFile(appUrl, "utf8"), readFile(finWorkspaceUrl, "utf8"), readFile(finSharedUrl, "utf8"), readFile(fin2WorkspaceUrl, "utf8")]);

  assert.match(source, /Prepare this Case’s FIN Forms/);
  assert.match(source, /navigateTo\(\{ surface: "fin", caseId: review\.reviewId/);
  assert.match(source, /<FinFormsWorkspace/);
  assert.match(finWorkspace, /FIN-1/);
  assert.match(finWorkspace, /Historical Financial Performance/);
  assert.match(finWorkspace, /Review FIN-1 mapping/);
  assert.match(finWorkspace, /Generate \{targetCurrency\} FIN-1/);
  assert.match(finWorkspace, /<FinCurrencySwitcher/);
  assert.match(finShared, /FIN presentation currency/);
  assert.match(finShared, /\["USD", "EUR"\]/);
  assert.match(finWorkspace, /FORM FIN–2/);
  assert.match(finWorkspace, /Review FIN-2 mapping/);
  assert.match(fin2Workspace, /Average Annual Turnover/);
  assert.match(fin2Workspace, /Single bidder · no JV logic/);
  assert.match(finWorkspace, /Source &amp; Mapping/);
  assert.match(finWorkspace, /Re-digitize source/);
  assert.match(finWorkspace, /Re-digitize or add source/);
  assert.match(finWorkspace, /finReady=\{form\.readiness\.canGenerate\}/);
  assert.match(finWorkspace, /no reliable financial year/);
  assert.match(finWorkspace, /Extraction review required/);
  assert.match(source, /EXTRACTION REVIEW REQUIRED/);
  assert.match(source, /This saved result needs/);
  assert.match(source, /Re-digitization required/);
});

test("TenderBalance separates Agent pages from selected-Case outputs", async () => {
  const source = await readFile(appUrl, "utf8");

  assert.match(source, /aria-label="TenderBalance Agent pages"/);
  assert.match(source, /Overview[\s\S]*New review[\s\S]*Cases/);
  assert.doesNotMatch(source.match(/function BalanceClientNav[\s\S]*?\n\}/)?.[0] ?? "", />Result<|>FIN Forms</);
  assert.match(source, /aria-label={`Selected case: \$\{identity\}`}/);
  assert.match(source, /aria-label={`\$\{review\.statement\.reportingEntity\} case outputs`}/);
  assert.match(source, />Result<\/button>/);
  assert.match(source, />FIN Forms <span>FIN-1 · FIN-2<\/span>/);
  assert.match(source, /resolveBalanceCase\(availableReviews, selectedReviewId\)/);
  assert.doesNotMatch(source, /resolveBalanceCase\(availableReviews, selectedReviewId\) \?\?/);
});

test("FIN-1 UI exposes the source-role gate, truthful blockers, and dynamic period rendering", async () => {
  const [finWorkspace, finCss] = await Promise.all([readFile(finWorkspaceUrl, "utf8"), readFile(finCssUrl, "utf8")]);

  assert.match(finWorkspace, /SOURCE-ROLE GATE/);
  assert.match(finWorkspace, /TEMPLATE/);
  assert.match(finWorkspace, /technically blocked from client financial data/);
  assert.match(finWorkspace, /presentedForm\.years\.map/);
  assert.match(finWorkspace, /mapping\.sourceSummary/);
  assert.match(finWorkspace, /Resolve the blocking source mappings/);
  assert.match(finWorkspace, /disabled=\{!canGenerate\}/);
  assert.match(finWorkspace, /No figures were estimated/);
  assert.doesNotMatch(finWorkspace, /ingestion is intentionally outside this first validated release/);
  assert.doesNotMatch(finWorkspace, /Earlier historical period|Additional historical period/);
  assert.match(finCss, /\.fin-mapping-table-wrap \{[^}]*overflow-x: auto/);
  assert.match(finCss, /@media \(max-width: 700px\)/);
});

test("FIN-1 offers a native Excel export alongside CSV and audit navigation", async () => {
  const finWorkspace = await readFile(finWorkspaceUrl, "utf8");

  assert.match(finWorkspace, /Export \{presentedForm\.currency\} FIN-1 Excel/);
  assert.match(finWorkspace, /Export CSV/);
  assert.match(finWorkspace, /fin1ToExcel/);
  assert.match(finWorkspace, /application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/);
});

test("FIN-2 UI exposes source turnover, year-end FX, calculated average, and case-scoped inputs", async () => {
  const [fin2Workspace, finCss] = await Promise.all([readFile(fin2WorkspaceUrl, "utf8"), readFile(finCssUrl, "utf8")]);

  assert.match(fin2Workspace, /tenderapps:fin2-case-input:\$\{review\.reviewId\}/);
  assert.match(fin2Workspace, /Original turnover/);
  assert.match(fin2Workspace, /Exchange rate/);
  assert.match(fin2Workspace, /convertedProvenance/);
  assert.match(fin2Workspace, /averageAnnualTurnover\.formula/);
  assert.match(fin2Workspace, /Export \{comparisonCurrency\} FIN-2 Excel/);
  assert.match(fin2Workspace, /Template examples and JV\/Consortium fields are excluded/);
  assert.match(finCss, /\.fin2-mapping-table \{[^}]*min-width/);
  assert.match(finCss, /\.fin2-admin-grid/);
});
