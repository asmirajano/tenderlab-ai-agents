import assert from "node:assert/strict";
import test from "node:test";

import { generateFin1, FIN1_FIELDS } from "../packages/tender-balance/src/fin-forms.ts";
import { cbuFinFxMetadata, prepareFin1Presentation } from "../packages/tender-balance/src/fin1-fx.ts";
import { fin1ToExcel } from "../packages/tender-balance/src/excel.ts";

function buildSourceForm(currency = "UZS", year = "2024") {
  const values = Object.fromEntries(FIN1_FIELDS.map((field, index) => [field.id, (index === 7 || index === 8 ? -1 : 1) * (100_000_000 + index * 5_000_000)]));
  return generateFin1({
    schemaVersion: "1.0.0",
    entity: "SYNTHETIC FX COMPANY",
    currency,
    unitLabel: "thousands",
    unitScale: 1_000,
    incomeStatementDetected: true,
    documents: [],
    periodMappings: [],
    availableYears: [year],
    sources: [],
    values: FIN1_FIELDS.map((field) => ({
      id: `value:${field.id}:${year}`,
      field: field.id,
      displayYear: year,
      value: values[field.id],
      currency,
      unitScale: 1_000,
      reportedValue: field.sourceType === "calculated" ? null : values[field.id],
      calculatedValue: field.sourceType === "calculated" ? values[field.id] : null,
      difference: null,
      provenance: field.sourceType === "calculated" ? "CALCULATED" : "SOURCE",
      sourceIds: [],
      calculationFormula: field.sourceType === "calculated" ? "Synthetic deterministic calculation" : undefined,
      status: "ready",
    })),
    issues: [],
  });
}

function readStoredZipEntries(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  const entries = new Map();
  let offset = 0;
  while (offset + 30 <= bytes.length && view.getUint32(offset, true) === 0x04034b50) {
    const size = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const name = decoder.decode(bytes.subarray(nameStart, nameStart + nameLength));
    entries.set(name, decoder.decode(bytes.subarray(dataStart, dataStart + size)));
    offset = dataStart + size;
  }
  return entries;
}

test("ships the versioned CBU FIN exchange-rate archive for 2015–2025", () => {
  const metadata = cbuFinFxMetadata();
  assert.equal(metadata.datasetId, "TEA-DS-CBU-FIN-FX-2015-2025");
  assert.deepEqual(metadata.range, { from: "2015-01-01", to: "2025-12-31" });
  assert.ok(metadata.normalizedObservationCount > 100_000);
  assert.match(metadata.normalizedObservationSha256, /^[a-f0-9]{64}$/);
  assert.ok(metadata.supportedCurrencies.includes("UZS"));
  assert.ok(metadata.supportedCurrencies.includes("USD"));
  assert.ok(metadata.supportedCurrencies.includes("EUR"));
});

test("converts UZS source evidence into independently selectable USD and EUR FIN presentations", () => {
  const sourceForm = buildSourceForm("UZS", "2024");
  const originalAsset = sourceForm.mappings.find((mapping) => mapping.field === "total_assets");
  const usd = prepareFin1Presentation(sourceForm, "USD");
  const eur = prepareFin1Presentation(sourceForm, "EUR");
  assert.equal(usd.status, "ready");
  assert.equal(eur.status, "ready");
  assert.equal(usd.form.currency, "USD");
  assert.equal(eur.form.currency, "EUR");
  assert.equal(usd.form.unitLabel, "thousands");
  assert.equal(usd.form.unitScale, 1_000);

  const usdAsset = usd.form.mappings.find((mapping) => mapping.field === "total_assets");
  const usdRevenue = usd.form.mappings.find((mapping) => mapping.field === "total_revenue");
  const eurAsset = eur.form.mappings.find((mapping) => mapping.field === "total_assets");
  assert.equal(usdAsset.fx.rateType, "closing");
  assert.equal(usdRevenue.fx.rateType, "average");
  assert.equal(usdAsset.sourceValue, originalAsset.value);
  assert.equal(usdAsset.sourceCurrency, "UZS");
  assert.equal(usdAsset.provenance, "CALCULATED");
  assert.equal(usdAsset.value, originalAsset.value * usdAsset.fx.targetUnitsPerSourceUnit);
  assert.notEqual(usdAsset.value, eurAsset.value);
  assert.equal(sourceForm.currency, "UZS");
  assert.equal(originalAsset.value, 100_000_000);
  assert.ok(usd.form.mappings.find((mapping) => mapping.field === "profit_before_tax").value < 0);
});

test("uses identity conversion without CBU coverage when source and FIN currencies match", () => {
  const sourceForm = buildSourceForm("USD", "2014");
  const result = prepareFin1Presentation(sourceForm, "USD");
  assert.equal(result.status, "ready");
  assert.equal(result.form.mappings.every((mapping) => mapping.fx?.rateType === "identity"), true);
  assert.equal(result.form.mappings[0].value, sourceForm.mappings[0].value);
  assert.equal(result.form.mappings[0].sourceProvenance, result.form.mappings[0].provenance);
});

test("blocks unsupported historical conversion instead of guessing a rate", () => {
  const result = prepareFin1Presentation(buildSourceForm("UZS", "2014"), "EUR");
  assert.equal(result.status, "unavailable");
  assert.equal(result.form, null);
  assert.ok(result.issues.some((issue) => issue.year === "2014" && /No saved EUR/.test(issue.message)));
});

test("exports the converted FIN form with source mapping and FX audit sheets", () => {
  const presentation = prepareFin1Presentation(buildSourceForm("UZS", "2024"), "USD");
  const entries = readStoredZipEntries(fin1ToExcel(presentation.form));
  const workbook = entries.get("xl/workbook.xml");
  assert.match(workbook, /FIN-1 Form/);
  assert.match(workbook, /Source &amp; Mapping/);
  assert.match(workbook, /FX Conversion Audit/);
  const combinedSheets = [...entries.entries()].filter(([name]) => name.startsWith("xl/worksheets/")).map(([, xml]) => xml).join("\n");
  assert.match(combinedSheets, /Central Bank of the Republic of Uzbekistan/);
  assert.match(combinedSheets, /CALCULATED/);
  assert.match(combinedSheets, /TEA-DS-CBU-FIN-FX-2015-2025/);
});
