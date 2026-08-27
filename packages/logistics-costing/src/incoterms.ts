import type { CostComponentCode, IncotermCode, IncotermProfile, TransportMode } from "./types.ts";

const pack: CostComponentCode[] = ["export_packing"];
const exportSide: CostComponentCode[] = ["origin_loading", "origin_pickup", "origin_terminal", "export_clearance"];
const onBoard: CostComponentCode[] = ["vessel_loading"];
const carriage: CostComponentCode[] = ["main_freight", "transit_handling", "transshipment", "destination_terminal"];
const destination: CostComponentCode[] = ["final_delivery"];

export const incotermProfiles: Record<IncotermCode, IncotermProfile> = {
  EXW: {
    code: "EXW", name: "Ex Works", version: "2020", modeFamily: "any-mode", sellerPaidComponents: [...pack],
    deliveryPoint: "Named place, usually the seller's premises, with goods placed at the buyer's disposal.",
    riskTransferPoint: "At the named place before loading on the collecting vehicle.",
    costBoundary: "Seller bears costs only until goods are placed at the buyer's disposal at the named place.",
    exportClearance: "buyer", importClearance: "buyer", loading: "Buyer unless the contract says otherwise.", unloading: "Buyer.",
    carriage: "Buyer arranges carriage.", insurance: "no-obligation",
    notes: ["Use an explicit override when the seller loads or assists with export clearance."],
  },
  FCA: {
    code: "FCA", name: "Free Carrier", version: "2020", modeFamily: "any-mode", sellerPaidComponents: [...pack, "origin_loading", "export_clearance"],
    deliveryPoint: "Carrier or other buyer-nominated person at the named place.",
    riskTransferPoint: "When delivered to the carrier at the named place; the exact loading state depends on whether it is the seller's premises.",
    costBoundary: "Seller bears cost to the specified FCA delivery point and export clearance.",
    exportClearance: "seller", importClearance: "buyer", loading: "Seller loads at its premises; at another place, delivery is ready for unloading from seller transport.", unloading: "Buyer/carrier after delivery.",
    carriage: "Buyer arranges main carriage, subject to any expressly agreed seller assistance.", insurance: "no-obligation", notes: [],
  },
  CPT: {
    code: "CPT", name: "Carriage Paid To", version: "2020", modeFamily: "any-mode", sellerPaidComponents: [...pack, ...exportSide, ...carriage],
    deliveryPoint: "First carrier or other carrier contracted by the seller.",
    riskTransferPoint: "When handed to the carrier, before the named destination in most routes.",
    costBoundary: "Seller pays contracted carriage to the named destination although risk transfers earlier.",
    exportClearance: "seller", importClearance: "buyer", loading: "Seller to the agreed carrier handover state.", unloading: "Buyer unless included in seller's carriage contract.",
    carriage: "Seller contracts and pays carriage to the named destination.", insurance: "no-obligation", notes: ["Risk and cost transfer occur at different points."],
  },
  CIP: {
    code: "CIP", name: "Carriage and Insurance Paid To", version: "2020", modeFamily: "any-mode", sellerPaidComponents: [...pack, ...exportSide, ...carriage, "insurance"],
    deliveryPoint: "First carrier or other carrier contracted by the seller.",
    riskTransferPoint: "When handed to the carrier, before the named destination in most routes.",
    costBoundary: "Seller pays contracted carriage and required insurance to the named destination although risk transfers earlier.",
    exportClearance: "seller", importClearance: "buyer", loading: "Seller to the agreed carrier handover state.", unloading: "Buyer unless included in seller's carriage contract.",
    carriage: "Seller contracts and pays carriage to the named destination.", insurance: "seller-required-a",
    notes: ["Incoterms® 2020 default is Institute Cargo Clauses (A) or similar; minimum insured amount is normally 110% of the contract price.", "Risk and cost transfer occur at different points."],
  },
  DAP: {
    code: "DAP", name: "Delivered at Place", version: "2020", modeFamily: "any-mode", sellerPaidComponents: [...pack, ...exportSide, ...carriage, ...destination],
    deliveryPoint: "Named destination, on the arriving means of transport, ready for unloading.",
    riskTransferPoint: "At the named destination before unloading.",
    costBoundary: "Seller bears transport cost to the named destination; buyer handles import formalities and unloading.",
    exportClearance: "seller", importClearance: "buyer", loading: "Seller.", unloading: "Buyer.",
    carriage: "Seller arranges carriage to the named destination.", insurance: "no-obligation", notes: [],
  },
  DPU: {
    code: "DPU", name: "Delivered at Place Unloaded", version: "2020", modeFamily: "any-mode", sellerPaidComponents: [...pack, ...exportSide, ...carriage, ...destination, "destination_unloading"],
    deliveryPoint: "Named destination after unloading from the arriving means of transport.",
    riskTransferPoint: "At the named destination after unloading.",
    costBoundary: "Seller bears transport and unloading cost to the named destination; buyer handles import formalities.",
    exportClearance: "seller", importClearance: "buyer", loading: "Seller.", unloading: "Seller.",
    carriage: "Seller arranges carriage and unloading at the named destination.", insurance: "no-obligation", notes: [],
  },
  DDP: {
    code: "DDP", name: "Delivered Duty Paid", version: "2020", modeFamily: "any-mode", sellerPaidComponents: [...pack, ...exportSide, ...carriage, ...destination, "import_clearance", "duty", "vat_tax"],
    deliveryPoint: "Named destination, import-cleared, on the arriving means of transport, ready for unloading.",
    riskTransferPoint: "At the named destination before unloading.",
    costBoundary: "Seller bears transport, import clearance, duties and applicable import taxes to the named destination.",
    exportClearance: "seller", importClearance: "seller", loading: "Seller.", unloading: "Buyer unless modified by contract.",
    carriage: "Seller arranges carriage to the named destination.", insurance: "no-obligation",
    notes: ["Seller import capability, importer-of-record status, tax registration and jurisdictional feasibility require validation."],
  },
  FAS: {
    code: "FAS", name: "Free Alongside Ship", version: "2020", modeFamily: "sea-inland-waterway", sellerPaidComponents: [...pack, ...exportSide],
    deliveryPoint: "Alongside the buyer-nominated vessel at the named port of shipment.",
    riskTransferPoint: "When placed alongside the vessel at the named port of shipment.",
    costBoundary: "Seller bears cost to the alongside delivery point and export clearance.",
    exportClearance: "seller", importClearance: "buyer", loading: "Seller to alongside; buyer loads the vessel.", unloading: "Buyer.",
    carriage: "Buyer arranges main sea or inland-waterway carriage.", insurance: "no-obligation", notes: [],
  },
  FOB: {
    code: "FOB", name: "Free On Board", version: "2020", modeFamily: "sea-inland-waterway", sellerPaidComponents: [...pack, ...exportSide, ...onBoard],
    deliveryPoint: "On board the buyer-nominated vessel at the named port of shipment.",
    riskTransferPoint: "When goods are on board the vessel at the named port of shipment.",
    costBoundary: "Seller bears cost through on-board delivery and export clearance.",
    exportClearance: "seller", importClearance: "buyer", loading: "Seller places goods on board.", unloading: "Buyer.",
    carriage: "Buyer arranges main sea or inland-waterway carriage.", insurance: "no-obligation",
    notes: ["For containerized or multimodal handover at a terminal, FCA is commonly the appropriate rule instead."],
  },
  CFR: {
    code: "CFR", name: "Cost and Freight", version: "2020", modeFamily: "sea-inland-waterway", sellerPaidComponents: [...pack, ...exportSide, ...onBoard, "main_freight", "transshipment"],
    deliveryPoint: "On board the vessel at the named port of shipment.",
    riskTransferPoint: "When goods are on board at the port of shipment.",
    costBoundary: "Seller pays freight to the named destination port although risk transfers at the shipment port.",
    exportClearance: "seller", importClearance: "buyer", loading: "Seller places goods on board.", unloading: "Buyer unless included in seller's carriage contract.",
    carriage: "Seller contracts sea or inland-waterway freight to the named destination port.", insurance: "no-obligation",
    notes: ["Risk and cost transfer occur at different ports."],
  },
  CIF: {
    code: "CIF", name: "Cost Insurance and Freight", version: "2020", modeFamily: "sea-inland-waterway", sellerPaidComponents: [...pack, ...exportSide, ...onBoard, "main_freight", "transshipment", "insurance"],
    deliveryPoint: "On board the vessel at the named port of shipment.",
    riskTransferPoint: "When goods are on board at the port of shipment.",
    costBoundary: "Seller pays freight and required insurance to the named destination port although risk transfers at shipment.",
    exportClearance: "seller", importClearance: "buyer", loading: "Seller places goods on board.", unloading: "Buyer unless included in seller's carriage contract.",
    carriage: "Seller contracts sea or inland-waterway freight to the named destination port.", insurance: "seller-required-c",
    notes: ["Incoterms® 2020 default is Institute Cargo Clauses (C) or similar; minimum insured amount is normally 110% of the contract price.", "For multimodal container movements consider CIP rather than CIF."],
  },
};

export function validateTermMode(term: IncotermCode, mode: TransportMode) {
  const profile = incotermProfiles[term];
  if (profile.modeFamily === "any-mode") return undefined;
  if (mode === "sea" || mode === "inland-waterway") return undefined;
  return `${term} is restricted to sea or inland-waterway transport and is not valid for ${mode}.`;
}

export function isSellerPaid(term: IncotermCode, component: CostComponentCode) {
  return incotermProfiles[term].sellerPaidComponents.includes(component);
}

export const incotermsAuthoritativeSources = [
  { title: "ICC Incoterms® 2020 — rules for any mode or modes", url: "https://library.iccwbo.org/content/tfb/BOOKS/BK_0049/BK_0049_04_RulesAny.htm" },
  { title: "ICC Incoterms® 2020 — sea and inland waterway rules", url: "https://library.iccwbo.org/content/tfb/BOOKS/BK_0049/BK_0049_05_RulesSea.htm" },
  { title: "ICC Incoterms® 2020 overview and insurance changes", url: "https://iccwbo.org/business-solutions/incoterms-rules/incoterms-2020/" },
] as const;
