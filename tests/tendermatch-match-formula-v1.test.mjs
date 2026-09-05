import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  TENDERMATCH_EXPLORATORY_ENGINE_VERSION,
  TENDERMATCH_EXPLORATORY_POLICY_VERSION,
  buildExploratoryEvaluationInventory,
  evaluateExploratoryPair,
  formulaEvaluationsToCsv,
  runtimeTenders,
  summarizeExploratoryEvaluations,
  tenderMatchFormulaExcelFileName,
} from "../packages/tendermatch/src/index.ts";
import { tenderMatchFormulaToExcel } from "../apps/tender-apps/src/tendermatch-formula-excel.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const evaluatedAt = "2026-09-01T11:09:44.745Z";
const baseTender = runtimeTenders[0];

function supplier(overrides = {}) {
  return {
    canonicalEntityId: "00000000-0000-4000-8000-000000000001",
    profileVersionId: "00000000-0000-4000-8000-000000000002",
    profileVersion: "v1-test",
    batchId: "00000000-0000-4000-8000-000000000003",
    batchCode: "formula-v1-test",
    sourceCandidateId: "candidate-test",
    legalName: "Evidence Test Supplier",
    displayName: "Evidence Test Supplier",
    countryCode: "DE",
    city: null,
    region: null,
    classification: "GOODS",
    productFamilies: [], worksSpecializations: [], industriesServed: [], materials: [], certifications: [], operatingGeography: [], capacity: null, revenueOrTurnover: null,
    readinessStatus: "usable_with_limitations",
    readinessReasons: [], readinessGateResults: {}, readinessContractVersion: "v1", verificationStatus: "under_review", coverageSummary: {}, evidenceClaimCount: 0,
    evidenceVerifiedCount: 0, evidenceInferredCount: 0, evidenceStatedUnverifiedCount: 0, evidenceUnknownCount: 0, claimsWithSavedArtifact: 0, sourceRecordIds: [], sourceArtifactIds: [],
    ...overrides,
  };
}

function tender(type = "GOODS", title = "Supply of power transformers and switchgear") {
  return { ...baseTender, id: `tender:test:${type.toLowerCase()}`, reference: `TEST-${type}`, title, object: type, procurementType: type, description: "Notice boilerplate unrelated to scored technical fit.", tags: [], country: "Uzbekistan", countryCode: "UZ" };
}

function claim(profile, index, field, value, overrides = {}) {
  return {
    canonicalEntityId: profile.canonicalEntityId,
    profileVersionId: profile.profileVersionId,
    claimId: `00000000-0000-4000-8001-${String(index).padStart(12, "0")}`,
    externalClaimId: `claim-${index}`,
    field, value, normalizedValue: value, status: "STATED_UNVERIFIED", sourceSystem: "test-safe-projection", sourceTitle: "Formula fixture", sourceUrl: null,
    retrievedAt: evaluatedAt, sourceRecordId: `record-${index}`, sourceArtifactId: `artifact-${index}`, artifactAvailable: true, artifactStatus: "available", artifactSha256: "a".repeat(64), artifactLimitation: "",
    ...overrides,
  };
}

function sufficientEvidence(profile, technical = "Power transformers; electrical switchgear") {
  return [
    claim(profile, 1, "product_families", technical),
    claim(profile, 2, "industries_served", "Electrical grid; energy infrastructure"),
    claim(profile, 3, "capacity", "Production facilities: 12"),
    claim(profile, 4, "geographic_markets", "Global; Asia"),
  ];
}

test("Formula v1.1 deterministically scores every pair on the fixed 100-point denominator", () => {
  const profile = supplier();
  const first = evaluateExploratoryPair(tender(), profile, sufficientEvidence(profile), evaluatedAt);
  assert.deepEqual(evaluateExploratoryPair(tender(), profile, sufficientEvidence(profile), evaluatedAt), first);
  assert.equal(first.engineVersion, TENDERMATCH_EXPLORATORY_ENGINE_VERSION);
  assert.equal(first.policyVersion, TENDERMATCH_EXPLORATORY_POLICY_VERSION);
  assert.equal(first.value, Math.round(first.assessedFitScore * first.dataCoverage / 100));
  assert.ok(first.value > 0);
  assert.equal(first.valueClass, "ESTIMATED");
  assert.equal(first.dataCoverage, 65);
  assert.equal(first.evidenceConfidence, 50);
  assert.equal(first.pairStatus, "UNASSESSED");
  assert.equal(first.label, "Coverage-adjusted pair score");
});

test("keeps mandatory gates separate without suppressing the numeric score", () => {
  const profile = supplier({ classification: "GOODS" });
  const result = evaluateExploratoryPair(tender("WORKS", "Construction of a public school"), profile, sufficientEvidence(profile), evaluatedAt);
  assert.equal(result.value, 0);
  assert.equal(result.pairStatus, "UNASSESSED");
  assert.equal(result.mainReason, "PROCUREMENT_TYPE_SUPPLIER_ROLE");
  assert.equal(result.mandatoryGates.find((entry) => entry.code === "PROCUREMENT_TYPE_SUPPLIER_ROLE").state, "FAIL");
  assert.ok(result.blockers.length > 0);
});

test("scores out-of-scope and partial-evidence pairs numerically while preserving applicability and coverage", () => {
  const profile = supplier();
  const outOfScope = evaluateExploratoryPair(tender("CONSULTING", "Consulting services"), profile, sufficientEvidence(profile), evaluatedAt);
  const insufficient = evaluateExploratoryPair(tender(), profile, [claim(profile, 7, "product_families", "Power transformers")], evaluatedAt);
  assert.equal(outOfScope.value, 0);
  assert.ok(insufficient.value > 0);
  assert.deepEqual([outOfScope.pairStatus, insufficient.pairStatus], ["UNASSESSED", "UNASSESSED"]);
  assert.equal(outOfScope.mainReason, "CURRENT_SCOPE_GOODS_WORKS_ONLY");
  assert.ok(insufficient.dataCoverage < 50);
});

test("preserves genuine evaluated zero-fit evidence without issuing a Non-match verdict", () => {
  const profile = supplier();
  const evidence = [
    claim(profile, 1, "product_families", "Office furniture; chairs and desks"),
    claim(profile, 2, "industries_served", "Hospitality interiors"),
    claim(profile, 3, "capacity", "Production facilities: 12"),
    claim(profile, 4, "geographic_markets", "Global; Asia"),
  ];
  const result = evaluateExploratoryPair(tender(), profile, evidence, evaluatedAt);
  const technical = result.criteria.find((entry) => entry.code === "technical-relevance");
  assert.equal(technical.fitLevel, 0);
  assert.equal(technical.valueClass, "ESTIMATED");
  assert.notEqual(result.value, null);
  assert.equal(result.pairStatus, "UNASSESSED");
  assert.ok(result.reasonCodes.includes("SUPPORTED_TECHNICAL_INCOMPATIBILITY"));
});

test("is monotonic on technical overlap while leaving readiness, deadline and consultant decision out of the formula", () => {
  const profile = supplier();
  const weak = evaluateExploratoryPair(tender(), profile, sufficientEvidence(profile, "Office furniture"), evaluatedAt);
  const strong = evaluateExploratoryPair(tender(), profile, sufficientEvidence(profile), evaluatedAt);
  const ready = evaluateExploratoryPair(tender(), { ...profile, readinessStatus: "ready_for_exploratory_matching" }, sufficientEvidence(profile), evaluatedAt);
  const nearDeadline = evaluateExploratoryPair({ ...tender(), deadlineAt: "2026-09-02T23:59:59.999+05:00" }, profile, sufficientEvidence(profile), evaluatedAt);
  assert.ok(weak.value < strong.value);
  assert.equal(ready.value, strong.value);
  assert.equal(nearDeadline.value, strong.value);
  assert.equal("consultantDecision" in strong, true);
  assert.equal(strong.consultantDecision, "pending");
});

test("confidence bands never inflate STATED_UNVERIFIED or artifact-unavailable claims", () => {
  const profile = supplier();
  const stated = sufficientEvidence(profile);
  const verified = stated.map((entry) => ({ ...entry, status: "VERIFIED" }));
  const unavailable = stated.map((entry) => ({ ...entry, artifactAvailable: false, sourceArtifactId: null, artifactStatus: "not-linked" }));
  const statedResult = evaluateExploratoryPair(tender(), profile, stated, evaluatedAt);
  const verifiedResult = evaluateExploratoryPair(tender(), profile, verified, evaluatedAt);
  const unavailableResult = evaluateExploratoryPair(tender(), profile, unavailable, evaluatedAt);
  assert.equal(statedResult.evidenceConfidence, 50);
  assert.equal(verifiedResult.evidenceConfidence, 100);
  assert.equal(unavailableResult.evidenceConfidence, 30);
  assert.equal(statedResult.value, verifiedResult.value);
  assert.ok(unavailableResult.reasonCodes.includes("CITED_ARTIFACT_UNAVAILABLE"));
});

test("does not double-count evidence across criteria and cites only the relevant supplier", () => {
  const profile = supplier();
  const result = evaluateExploratoryPair(tender(), profile, sufficientEvidence(profile), evaluatedAt);
  const cited = result.criteria.flatMap((entry) => entry.evidenceIds);
  assert.equal(new Set(cited).size, cited.length);
  assert.ok(result.evidenceIds.every((id) => sufficientEvidence(profile).some((entry) => entry.claimId === id)));
});

test("full pinned replay has 1,020 numeric scores and no Match threshold", async () => {
  const runtime = JSON.parse(await readFile(path.join(projectRoot, "apps/tender-apps/public/tendermatch/data/supplier-runtime-v1.3.json"), "utf8"));
  const evidenceSnapshot = JSON.parse(await readFile(path.join(projectRoot, "apps/tender-apps/public/tendermatch/data/supplier-evidence-v1.3.json"), "utf8"));
  const evaluations = buildExploratoryEvaluationInventory(runtimeTenders, runtime.suppliers, Object.values(evidenceSnapshot.evidenceBySupplier).flat(), evaluatedAt);
  const summary = summarizeExploratoryEvaluations(evaluations);
  assert.equal(evaluations.length, 1020);
  assert.equal(new Set(evaluations.map((entry) => entry.key)).size, 1020);
  assert.deepEqual(summary.byStatus, { BINGO_MATCH: 0, STRONG_CANDIDATE: 0, POTENTIAL_MATCH: 0, NEEDS_VERIFICATION: 0, NO_MATCH: 0, BLOCKED_INELIGIBLE: 0, UNASSESSED: 1020 });
  assert.equal(summary.numeric, 1020);
  assert.equal(summary.missing, 0);
  assert.ok(evaluations.every((entry) => Number.isInteger(entry.value) && entry.value >= 0 && entry.value <= 100));
  assert.ok(evaluations.every((entry) => entry.pairStatus === "UNASSESSED"));
  assert.ok(evaluations.some((entry) => entry.value === 0 && entry.dataCoverage === 0));
});

test("exports one auditable row per pair with versions, gates, criteria and evidence identities", async () => {
  const runtime = JSON.parse(await readFile(path.join(projectRoot, "apps/tender-apps/public/tendermatch/data/supplier-runtime-v1.3.json"), "utf8"));
  const csv = formulaEvaluationsToCsv(runtime.evaluations, runtimeTenders, runtime.suppliers);
  const lines = csv.trim().split(/\r?\n/);
  assert.equal(lines.length, 1021);
  for (const header of ["Tender ID", "Supplier ID", "Scoring stage", "Pair Score", "Assessed Fit Score", "Data Coverage", "Evidence Confidence", "Mandatory gates", "Weighted criteria", "Main reason", "Blockers", "Missing inputs", "Evidence IDs", "Engine version", "Policy version", "Evaluated at"]) assert.match(lines[0], new RegExp(header));
  assert.match(csv, /tendermatch-match-formula\/1\.1\.0/);
  assert.match(csv, /SCORING_ONLY/);
  assert.match(csv, /CURRENT_SCOPE_GOODS_WORKS_ONLY/);
});

test("exports a typed Formula v1.1 Excel workbook with 1,020 auditable pair rows", async () => {
  const runtime = JSON.parse(await readFile(path.join(projectRoot, "apps/tender-apps/public/tendermatch/data/supplier-runtime-v1.3.json"), "utf8"));
  const bytes = await tenderMatchFormulaToExcel(runtime.evaluations, runtimeTenders, runtime.suppliers);
  const ExcelJS = (await import(pathToFileURL(path.join(projectRoot, "apps", "tender-apps", "node_modules", "exceljs", "excel.js")).href)).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes);

  assert.equal(tenderMatchFormulaExcelFileName(runtime.evaluations[0].evaluatedAt), "TenderMatch-Formula-v1-2026-09-01.xlsx");
  assert.deepEqual(workbook.worksheets.map((sheet) => sheet.name), ["Formula Summary", "Pair Evaluations"]);
  const summary = workbook.getWorksheet("Formula Summary");
  const pairs = workbook.getWorksheet("Pair Evaluations");
  assert.equal(summary.getCell("B8").value, 1020);
  assert.equal(summary.getCell("B9").value, 1020);
  assert.equal(summary.getCell("B10").value, 0);
  assert.equal(pairs.rowCount, 1021);
  assert.deepEqual(pairs.getRow(1).values.slice(1), [
    "Tender ID", "Tender reference", "Tender procurement type", "Tender snapshot", "Tender version",
    "Supplier ID", "Supplier name", "Supplier role", "Supplier profile version", "Supplier batch",
    "Scoring stage", "Pair Score", "Assessed Fit Score", "Score value class", "Data Coverage", "Evidence Confidence",
    "Mandatory gates", "Weighted criteria", "Main reason", "Blockers", "Missing inputs", "Evidence IDs",
    "Consultant decision", "Engine version", "Policy version", "Evaluated at", "Reader label",
  ]);
  const numericRow = pairs.getRows(2, 1020).find((row) => row.getCell(11).value === "SCORING_ONLY" && row.getCell(12).value > 0);
  assert.ok(numericRow);
  assert.equal(typeof numericRow.getCell(12).value, "number");
  assert.equal(typeof numericRow.getCell(15).value, "number");
  assert.equal(typeof numericRow.getCell(16).value, "number");
  assert.ok(numericRow.getCell(26).value instanceof Date);
  assert.ok(Array.isArray(JSON.parse(numericRow.getCell(17).value)));
  assert.ok(Array.isArray(JSON.parse(numericRow.getCell(18).value)));
  assert.match(numericRow.getCell(24).value, /tendermatch-match-formula\/1\.1\.0/);

  const appSource = await readFile(path.join(projectRoot, "apps", "tender-apps", "src", "tendermatch-app.tsx"), "utf8");
  assert.match(appSource, /Export Formula v1\.1 CSV/);
  assert.match(appSource, /Export Formula v1\.1 Excel/);
  assert.match(appSource, /useState\(10\)[\s\S]+useState\(25\)/);
  assert.match(appSource, /supplierPageSize[\s\S]+tenderPageSize[\s\S]+visibleMatrixTenders/);
});
