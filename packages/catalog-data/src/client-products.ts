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
  family: "Tender Apps";
  name: string;
  descriptor: string;
  status: ClientProductStatus;
  ownerAgentId: string;
  commandCenterPath: string;
  clientAppPath: string;
  schemaPath: string;
  localPreviewUrl: string;
  access: ClientProductAccessPolicy;
};

export const clientProducts: ClientProduct[] = [
  {
    id: "product:TA-BALANCE",
    family: "Tender Apps",
    name: "TenderBalance",
    descriptor: "Verified balance-sheet digitization",
    status: "mvp-simulation",
    ownerAgentId: "agent:TL-A008",
    commandCenterPath: "/products#tenderbalance",
    clientAppPath: "apps/tender-balance",
    schemaPath: "packages/catalog-schema/schema/balance-sheet-review.schema.json",
    localPreviewUrl: "http://127.0.0.1:4175",
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
    family: "Tender Apps",
    name: "Landed Cost Studio",
    descriptor: "Incoterms conversion and auditable logistics costing",
    status: "mvp-simulation",
    ownerAgentId: "agent:TL-A050",
    commandCenterPath: "/products#landed-cost",
    clientAppPath: "apps/tender-apps",
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
];

export const tenderBalanceProduct = clientProducts[0];
export const landedCostProduct = clientProducts[1];
