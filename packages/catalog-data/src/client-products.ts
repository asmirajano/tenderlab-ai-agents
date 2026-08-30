export type ClientProductStatus = "prototype" | "mvp-simulation" | "pilot" | "production";

export type ClientProductAccessPolicy = {
  commandCenterAudience: "team-admin-only";
  clientAppAudience: "assigned-client-users-and-reviewers";
  commandCenterToClientApp: true;
  clientAppToCommandCenter: false;
  separateOriginRequired: true;
  serverSideAuthorizationRequired: true;
};

export type ClientProduct = {
  id: string;
  catalogOrder: number;
  family: "Tender Apps";
  name: string;
  descriptor: string;
  surfaceStatus: string;
  dataNotice: string;
  status: ClientProductStatus;
  ownerAgentId: string;
  commandCenterPath: string;
  clientAppPath: string;
  clientRoute: string;
  schemaPath: string;
  localPreviewUrl: string;
  access: ClientProductAccessPolicy;
};

export const clientProducts: ClientProduct[] = [
  {
    id: "product:TA-BALANCE",
    catalogOrder: 1,
    family: "Tender Apps",
    name: "TenderBalance",
    descriptor: "Verified balance-sheet digitization",
    surfaceStatus: "Source-traceable extraction and human review",
    dataNotice: "Simulation data only",
    status: "mvp-simulation",
    ownerAgentId: "agent:TL-A008",
    commandCenterPath: "/products#tenderbalance",
    clientAppPath: "apps/tender-apps",
    clientRoute: "/balance-sheet-review",
    schemaPath: "packages/catalog-schema/schema/balance-sheet-review.schema.json",
    localPreviewUrl: "http://127.0.0.1:4174",
    access: {
      commandCenterAudience: "team-admin-only",
      clientAppAudience: "assigned-client-users-and-reviewers",
      commandCenterToClientApp: true,
      clientAppToCommandCenter: false,
      separateOriginRequired: true,
      serverSideAuthorizationRequired: true,
    },
  },
  {
    id: "product:TA-LANDED-COST",
    catalogOrder: 2,
    family: "Tender Apps",
    name: "TENDER LOGISTICS COST",
    descriptor: "Estimate transport, logistics and Incoterms-related costs for tender shipments",
    surfaceStatus: "Evidence-aware deterministic estimate",
    dataNotice: "Simulation data only",
    status: "mvp-simulation",
    ownerAgentId: "agent:TL-A050",
    commandCenterPath: "/products#landed-cost",
    clientAppPath: "apps/tender-apps",
    clientRoute: "/landed-cost",
    schemaPath: "packages/logistics-costing/src/types.ts",
    localPreviewUrl: "http://127.0.0.1:4174",
    access: {
      commandCenterAudience: "team-admin-only",
      clientAppAudience: "assigned-client-users-and-reviewers",
      commandCenterToClientApp: true,
      clientAppToCommandCenter: false,
      separateOriginRequired: true,
      serverSideAuthorizationRequired: true,
    },
  },
  {
    // Stable ID retained from the TenderBoost migration; the active product name and route are TenderMatch.
    id: "product:TA-TENDERBOOST",
    catalogOrder: 3,
    family: "Tender Apps",
    name: "TenderMatch",
    descriptor: "Evidence-linked Company × Tender evaluation and consultant decision support",
    surfaceStatus: "Audited dated-fixture experiment · matching only",
    dataNotice: "Dated demonstration snapshot only",
    status: "mvp-simulation",
    ownerAgentId: "agent:TL-A031",
    commandCenterPath: "/products#tendermatch",
    clientAppPath: "apps/tender-apps",
    clientRoute: "/tendermatch",
    schemaPath: "packages/tenderboost/src/types.ts",
    localPreviewUrl: "http://127.0.0.1:4174",
    access: {
      commandCenterAudience: "team-admin-only",
      clientAppAudience: "assigned-client-users-and-reviewers",
      commandCenterToClientApp: true,
      clientAppToCommandCenter: false,
      separateOriginRequired: true,
      serverSideAuthorizationRequired: true,
    },
  },
];

export const tenderBalanceProduct = clientProducts.find((product) => product.id === "product:TA-BALANCE")!;
export const landedCostProduct = clientProducts.find((product) => product.id === "product:TA-LANDED-COST")!;
export const tenderMatchProduct = clientProducts.find((product) => product.id === "product:TA-TENDERBOOST")!;
