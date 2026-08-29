import supplierFixture from "./fixtures/supplier-intelligence.demo.json" with { type: "json" };
import {
  TENDERBOOST_DEMO_AS_OF,
  TENDERBOOST_DEMO_SNAPSHOT_ID,
  type EvidenceRecord,
  type LegacySupplierFixture,
  type SupplierRecord,
  type TenderRecord,
} from "./types.ts";

const fixture = supplierFixture as LegacySupplierFixture[];

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function evidenceRecord(supplierId: string, item: LegacySupplierFixture["evidence"][number], index: number): EvidenceRecord {
  const reviewStatus = item.status === "VERIFIED" ? "LEGACY_VERIFIED" : item.status;
  return {
    id: `evidence:TB:${supplierId}:${slug(item.field)}:${index + 1}`,
    version: "snapshot-2026-08-15",
    supplierId,
    field: item.field,
    value: item.value,
    reviewStatus,
    confidence: item.confidence,
    sourceTitle: item.sourceTitle || "Legacy TenderBoost source reference",
    sourceUrl: item.sourceUrl,
    retrievedAt: item.retrievalDate,
    notes: item.notes,
    sourceRole: "SUPPORTING_DOCUMENT",
    valueClass: item.status === "UNKNOWN" ? "MISSING" : item.status === "INFERRED" ? "ESTIMATED" : "ASSUMED",
    externalClaimEligible: false,
  };
}

export const demoSuppliers: SupplierRecord[] = fixture.map((supplier) => ({
  id: `supplier:TB:${supplier.companyId}`,
  version: "snapshot-2026-08-15",
  legalEnglishName: supplier.legalEnglishName,
  legalChineseName: supplier.legalChineseName,
  headquarters: supplier.headquarters,
  companyType: supplier.companyType,
  officialWebsite: supplier.officialWebsite,
  categories: supplier.categories,
  capabilities: supplier.capabilities,
  products: supplier.products,
  exportMarkets: supplier.exportMarkets,
  evidence: supplier.evidence.map((item, index) => evidenceRecord(supplier.companyId, item, index)),
  legacyTenderMatches: supplier.tenderMatches,
  readiness: {
    value: supplier.scores.overallReadiness,
    valueClass: "ESTIMATED",
    method: "legacy TenderBoost snapshot score; formula not yet independently revalidated",
  },
  technicalFit: supplier.scores.technicalFit,
  exportReadiness: supplier.scores.exportReadiness,
  legacyEvidenceCompleteness: supplier.scores.evidenceCompleteness,
  risks: supplier.risks,
  verificationQuestions: supplier.verificationQuestions,
  suppressionStatus: "UNKNOWN",
  consentStatus: "MISSING",
  snapshotId: TENDERBOOST_DEMO_SNAPSHOT_ID,
}));

function tender(
  reference: string,
  title: string,
  object: string,
  buyer: string,
  country: string,
  region: string,
  sourceLabel: string,
  budgetLabel: string,
  deadlineAt: string,
  tags: string[],
): TenderRecord {
  return {
    id: `tender:TB:${reference}`,
    version: "snapshot-2026-08-15",
    reference,
    title,
    object,
    buyer,
    country,
    region,
    sourceLabel,
    budgetLabel,
    deadlineAt,
    snapshotId: TENDERBOOST_DEMO_SNAPSHOT_ID,
    snapshotAsOf: TENDERBOOST_DEMO_AS_OF,
    sourceRole: "SUPPORTING_DOCUMENT",
    valueClass: "ASSUMED",
    tags,
  };
}

export const demoTenders: TenderRecord[] = [
  tender("ACCESS/GOVTECH/GD-1", "Bhutan GovNet backbone and server modernization", "Servers", "GovTech Agency, Royal Government of Bhutan", "Bhutan", "Asia Pacific", "World Bank", "$198K", "2026-08-16T23:59:59+05:00", ["ict", "networking", "servers", "datacenter"]),
  tender("514122", "Diagnostic equipment and ambulances for Karakalpakstan and Khorezm", "Ambulances", "Ministry of Health of Uzbekistan", "Uzbekistan", "Central Asia", "KfW", "Not disclosed", "2026-08-16T23:59:59+05:00", ["medical-imaging", "healthcare", "ambulances", "installation"]),
  tender("G05", "Modern greenhouse complexes for Tajikistan agriculture", "Greenhouses", "Ministry of Agriculture of Tajikistan", "Tajikistan", "Central Asia", "ADB", "$1.30M", "2026-08-17T23:59:59+05:00", ["greenhouse", "agriculture", "steel-structure", "installation"]),
  tender("DPA14004203 / ICB 514062", "Analytical laboratory equipment and certified reference materials", "Laboratory Equipment", "Ministry of Finance of the Kyrgyz Republic", "Kyrgyzstan", "Central Asia", "KfW", "Not disclosed", "2026-08-17T23:59:59+05:00", ["laboratory", "testing", "metrology", "installation"]),
  tender("EC-ENEST/SKP/2026/EA-OP/0053", "Cancer-screening and neonatal-care equipment", "Medical Equipment", "EU Delegation to North Macedonia", "North Macedonia", "Europe", "European Union", "Not disclosed", "2026-08-20T23:59:59+05:00", ["medical-imaging", "healthcare", "neonatal", "workstations"]),
  tender("45376134", "Dangara water-supply modernization and meter installation", "Water Meters", "SUE KMK on behalf of Tajikistan", "Tajikistan", "Central Asia", "EBRD", "Not disclosed", "2026-08-20T23:59:59+05:00", ["water", "pipelines", "meters", "civil-works"]),
  tender("44846993", "Vahdat–Rogun road reconstruction and expansion", "Road Construction", "Road Rehabilitation Project Implementation Unit", "Tajikistan", "Central Asia", "EBRD", "Not disclosed", "2026-08-23T23:59:59+05:00", ["roads", "civil-works", "construction", "prequalification"]),
  tender("50/G/C2SC4.A16.8/26", "Digital infrastructure and technical furniture for 11 universities", "ICT Infrastructure", "Ministry of Higher Education, Science, Technology and Innovation", "Angola", "Africa", "World Bank", "$6.91M", "2026-08-23T23:59:59+05:00", ["ict", "networking", "technical-furniture", "laboratory"]),
  tender("SKIP_Z07.1", "Irrigation and water infrastructure rehabilitation in Bayzak", "Irrigation Infrastructure", "Kazvodkhoz Republican State Enterprise", "Kazakhstan", "Central Asia", "EBRD", "Not disclosed", "2026-08-23T23:59:59+05:00", ["water", "irrigation", "civil-works", "construction"]),
  tender("ADB-I/G-R1-LESCO-2026 (Lot-6)", "High-voltage capacitor banks for LESCO grid modernization", "Capacitor Banks", "Lahore Electric Supply Company", "Pakistan", "Asia Pacific", "ADB", "$1.26M", "2026-08-23T23:59:59+05:00", ["electrical", "capacitor-banks", "power-distribution", "installation"]),
  tender("UP/ICB/26/01", "Thirty-three ambulances for Uzbekistan medical institutions", "Ambulances", "Ministry of Health of Uzbekistan Project Unit", "Uzbekistan", "Central Asia", "KFAED", "Not disclosed", "2026-08-24T23:59:59+05:00", ["ambulances", "vehicles", "healthcare", "export"]),
  tender("514110", "MRI and angiography systems for regional medical centers", "MRI & Angiography", "Ministry of Health of Uzbekistan", "Uzbekistan", "Central Asia", "KfW", "Not disclosed", "2026-08-26T23:59:59+05:00", ["medical-imaging", "healthcare", "installation", "equipment"]),
  tender("UZ-CTSIP-10002-CW", "Reconstruction of the M41 international highway section", "Highway Construction", "Avtoyulinvest Agency", "Uzbekistan", "Central Asia", "World Bank", "$168.23M", "2026-08-30T23:59:59+05:00", ["roads", "civil-works", "bridges", "construction"]),
  tender("SKIP_Z07.5", "Water and irrigation rehabilitation in Utegen and Uzyn", "Irrigation Infrastructure", "Kazvodkhoz Republican State Enterprise", "Kazakhstan", "Central Asia", "EBRD", "Not disclosed", "2026-08-31T23:59:59+05:00", ["water", "irrigation", "civil-works", "construction"]),
  tender("ZR-SPACE-252528-GO-RFB", "Eleven SUVs for the DRC education-sector project", "SUVs", "PERSE Education Sector Coordination Secretariat", "Democratic Republic of the Congo", "Africa", "World Bank", "Not disclosed", "2026-12-09T23:59:59+05:00", ["vehicles", "suv", "education", "export"]),
  tender("RFQ/ALB/14/2025", "OSCE-branded promotional products for Albania", "Promotional Products", "OSCE Presence in Albania", "Albania", "Europe", "OSCE", "Not disclosed", "2026-12-28T23:59:59+05:00", ["promotional-items", "branding", "textiles", "gifts"]),
];

export const demoSnapshot = {
  id: TENDERBOOST_DEMO_SNAPSHOT_ID,
  asOf: TENDERBOOST_DEMO_AS_OF,
  sourceCommit: "04b0b2a723223d11617837ee0e7562fa48168cd9",
  classification: "DATED DEMONSTRATION SNAPSHOT",
  tenderCount: demoTenders.length,
  supplierCount: demoSuppliers.length,
} as const;
