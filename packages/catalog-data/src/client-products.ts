export type ClientProductStatus = "prototype" | "mvp-simulation" | "pilot" | "production";

export const practicalAgentOverviewRequiredParts = [
  "outcome-promise",
  "input",
  "agent-transformation",
  "finished-output",
  "primary-action",
  "trust-boundary",
] as const;

export type PracticalAgentOverviewPart = (typeof practicalAgentOverviewRequiredParts)[number];

const practicalAgentFirstViewportParts = [
  "outcome-promise",
  "input",
  "agent-transformation",
  "finished-output",
] as const;

export type PracticalAgentOverviewContract = {
  audience: "client" | "consultant" | "internal";
  compositionSourcePath: string;
  implementationSourcePath: string;
  renderedEvidencePath: string;
  requiredParts: readonly PracticalAgentOverviewPart[];
  renderedGate: {
    desktopViewports: readonly { width: number; height: number }[];
    finishedOutputMinimumAreaRatio: number;
    firstViewportParts: readonly Exclude<PracticalAgentOverviewPart, "trust-boundary">[];
    trustBoundaryMustBeVisible: true;
  };
};

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
  overviewContract: PracticalAgentOverviewContract;
  access: ClientProductAccessPolicy;
};

const practicalAgentRenderedGate = {
  desktopViewports: [{ width: 1280, height: 720 }, { width: 1440, height: 900 }],
  finishedOutputMinimumAreaRatio: 1.25,
  firstViewportParts: practicalAgentFirstViewportParts,
  trustBoundaryMustBeVisible: true,
} as const;

export const clientProducts: ClientProduct[] = [
  {
    id: "product:TA-BALANCE",
    catalogOrder: 1,
    family: "Tender Apps",
    name: "TenderBalance",
    descriptor: "Tender-ready financial-form preparation",
    surfaceStatus: "Source-traceable FIN-1 and FIN-2 preparation with human review",
    dataNotice: "Simulation data only",
    status: "mvp-simulation",
    ownerAgentId: "agent:TL-A008",
    commandCenterPath: "/products#tenderbalance",
    clientAppPath: "apps/tender-apps",
    clientRoute: "/balance-sheet-review",
    schemaPath: "packages/catalog-schema/schema/balance-sheet-review.schema.json",
    localPreviewUrl: "http://127.0.0.1:4174",
    overviewContract: {
      audience: "client",
      compositionSourcePath: "apps/tender-apps/src/client-product-manifesto.tsx",
      implementationSourcePath: "apps/tender-apps/src/balance-sheet-app.tsx",
      renderedEvidencePath: "docs/evidence/practical-agent-overview-browser-evidence.json",
      requiredParts: practicalAgentOverviewRequiredParts,
      renderedGate: practicalAgentRenderedGate,
    },
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
    overviewContract: {
      audience: "client",
      compositionSourcePath: "apps/tender-apps/src/logistics-costing-app.tsx",
      implementationSourcePath: "apps/tender-apps/src/logistics-costing-app.tsx",
      renderedEvidencePath: "docs/evidence/practical-agent-overview-browser-evidence.json",
      requiredParts: practicalAgentOverviewRequiredParts,
      renderedGate: practicalAgentRenderedGate,
    },
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
    descriptor: "TenderMatch pilot with 60 current-at-extraction Central Asia tenders, 17 under-review GOODS/WORKS supplier profiles, and evidence-gated exploratory Company × Tender evaluation",
    surfaceStatus: "Pinned v1.3 supplier snapshot · read-only · human disposition",
    dataNotice: "60-tender snapshot · 17 pinned v1.3 supplier profiles · 1,020 completed evaluations, currently all MISSING under the evidence gate · no direct browser database connection",
    status: "pilot",
    ownerAgentId: "agent:TL-A031",
    commandCenterPath: "/products#tendermatch",
    clientAppPath: "apps/tender-apps",
    clientRoute: "/tendermatch",
    schemaPath: "packages/tendermatch/src/types.ts",
    localPreviewUrl: "http://127.0.0.1:4174",
    overviewContract: {
      audience: "consultant",
      compositionSourcePath: "apps/tender-apps/src/tendermatch-app.tsx",
      implementationSourcePath: "apps/tender-apps/src/tendermatch-app.tsx",
      renderedEvidencePath: "docs/evidence/practical-agent-overview-browser-evidence.json",
      requiredParts: practicalAgentOverviewRequiredParts,
      renderedGate: practicalAgentRenderedGate,
    },
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
