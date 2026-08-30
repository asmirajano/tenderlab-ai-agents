import type { AuditedEvidenceAssignment, AuditedPairEvidenceMapping } from "./types.ts";

const reviewedAt = "2026-08-30T00:00:00+05:00";

function pair(tenderReference: string, supplierKey: string, assignments: AuditedEvidenceAssignment[]): AuditedPairEvidenceMapping {
  return {
    key: `${tenderReference}::supplier:TB:${supplierKey}`,
    sourceRole: "USER_ASSERTION",
    reviewStatus: "REVIEWED",
    reviewedAt,
    assignments,
  };
}

function technical(semanticBand: 60 | 80 | 100, evidenceIds: string[], rationale: string): AuditedEvidenceAssignment {
  return { component: "technical-relevance", semanticBand, evidenceIds, rationale };
}

function market(semanticBand: 60 | 80 | 100, evidenceIds: string[], rationale: string): AuditedEvidenceAssignment {
  return { component: "market-delivery", semanticBand, evidenceIds, rationale };
}

/**
 * Human-reviewed semantic mappings for the bounded Stage 2 experiment.
 *
 * These records do not create new evidence. They point only to records already
 * present in the frozen supplier fixture. The engine independently rejects a
 * mapping when a record is missing, below the confidence floor, not
 * LEGACY_VERIFIED, or reused across both score components.
 */
export const auditedDemoPairMappings: AuditedPairEvidenceMapping[] = [
  pair("ACCESS/GOVTECH/GD-1", "huawei", [
    technical(100, ["evidence:TB:huawei:products:3"], "Named OptiX, NetEngine, CloudEngine, and FusionServer products directly support the network/server scope."),
    market(100, ["evidence:TB:huawei:bhutanref:7"], "Candidate Bhutan delivery evidence is retained for audit but is UNKNOWN and must be rejected by the engine."),
  ]),
  pair("514122", "yutong", [
    technical(100, ["evidence:TB:yutong:ambulanceline:2"], "Named ZK-series medical vehicles directly support the ambulance component."),
    market(100, ["evidence:TB:yutong:uzbekistanpresence:3"], "Verified Uzbekistan delivery presence is in the tender country."),
  ]),
  pair("514122", "mindray", [
    market(100, ["evidence:TB:mindray:uzbekistanpresence:2"], "Verified Tashkent presence supports same-country delivery context, but no evidence record proves the required equipment scope."),
  ]),
  pair("G05", "kingpeng", [
    technical(100, ["evidence:TB:kingpeng:capability:4"], "Turnkey greenhouse EPC directly supports the tender object."),
    market(80, ["evidence:TB:kingpeng:exportmarkets:3"], "Central Asia export experience supports regional, not same-country, delivery relevance."),
  ]),
  pair("DPA14004203 / ICB 514062", "ncs_testing", [
    technical(100, ["evidence:TB:ncs_testing:crmcatalog:4"], "The certified-reference-material producer record directly supports a named procurement component."),
    market(80, ["evidence:TB:ncs_testing:cisdistribution:3"], "The CIS distributor supports regional logistics relevance rather than a Kyrgyzstan delivery record."),
  ]),
  pair("EC-ENEST/SKP/2026/EA-OP/0053", "mindray", [
    market(100, ["evidence:TB:mindray:northmacedoniaref:6"], "Candidate North Macedonia experience is retained for audit but is UNKNOWN and must be rejected by the engine."),
  ]),
  pair("EC-ENEST/SKP/2026/EA-OP/0053", "united_imaging", [
    technical(60, ["evidence:TB:united_imaging:uzbekistanpresence:2"], "Installed imaging supports only general category relevance, not the specific screening modalities."),
    market(100, ["evidence:TB:united_imaging:northmacedoniadistributor:5"], "Candidate local delivery evidence is UNKNOWN and must be rejected by the engine."),
  ]),
  pair("45376134", "cggc", []),
  pair("44846993", "cggc", []),
  pair("50/G/C2SC4.A16.8/26", "huawei", [
    technical(100, ["evidence:TB:huawei:products:3"], "Named IdeaHub and FusionServer products directly support the smart-classroom/server scope."),
    market(100, ["evidence:TB:huawei:angolaref:6"], "Candidate Angola experience is INFERRED and must be rejected by the engine."),
  ]),
  pair("SKIP_Z07.1", "cggc", []),
  pair("ADB-I/G-R1-LESCO-2026 (Lot-6)", "sieyuan", [
    technical(100, ["evidence:TB:sieyuan:products:2"], "Named high-voltage capacitor banks directly support the tender object."),
    market(100, ["evidence:TB:sieyuan:pakistanref:5"], "Candidate Pakistan delivery evidence is INFERRED and must be rejected by the engine."),
  ]),
  pair("UP/ICB/26/01", "yutong", [
    technical(100, ["evidence:TB:yutong:ambulanceline:2"], "Named ZK-series medical vehicles directly support the ambulance scope."),
    market(100, ["evidence:TB:yutong:uzbekistanorder2023:4"], "A verified 800-bus Tashkent order supports same-country fleet delivery capability."),
  ]),
  pair("514110", "united_imaging", [
    technical(60, ["evidence:TB:united_imaging:fdaclearance:3"], "Cleared imaging systems support general equipment relevance but not an exact MRI/angiography model claim."),
    market(100, ["evidence:TB:united_imaging:uzbekistanpresence:2"], "A verified Uzbekistan imaging installation supports same-country delivery context."),
  ]),
  pair("UZ-CTSIP-10002-CW", "cggc", []),
  pair("SKIP_Z07.5", "cggc", []),
  pair("ZR-SPACE-252528-GO-RFB", "chery", [
    technical(80, ["evidence:TB:chery:fleetreference:2"], "A named Tiggo public-fleet reference supports comparable vehicle relevance but not the exact DRC configuration."),
    market(100, ["evidence:TB:chery:drcpresence:4"], "A verified DRC market-presence record supports same-country delivery context."),
  ]),
  pair("RFQ/ALB/14/2025", "promo_company", [
    market(80, ["evidence:TB:promo_company:europeexport:2"], "Verified Europe export experience supports regional delivery relevance, while product-scope evidence is absent."),
  ]),
];

export const auditedDemoPairMappingByKey = new Map(auditedDemoPairMappings.map((mapping) => [mapping.key, mapping]));
