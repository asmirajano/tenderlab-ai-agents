import {
  TENDERMATCH_EXPLORATORY_ENGINE_VERSION,
  TENDERMATCH_EXPLORATORY_POLICY_VERSION,
} from "../../../packages/tendermatch/src/index.ts";

export type FormulaCriterionDefinition = {
  code: string;
  label: string;
  weight: number;
};

export type FormulaWorkedCriterion = FormulaCriterionDefinition & {
  fit: 0 | 1 | 2 | 3 | 4 | 5 | null;
  points: number;
};

export const tenderMatchFormulaPresentation = {
  version: "Formula v1.1",
  engineVersion: TENDERMATCH_EXPLORATORY_ENGINE_VERSION,
  policyVersion: TENDERMATCH_EXPLORATORY_POLICY_VERSION,
  goods: [
    { code: "technical-relevance", label: "Product technical fit", weight: 35 },
    { code: "capacity-delivery", label: "Supply capacity and delivery feasibility", weight: 20 },
    { code: "comparable-experience", label: "Comparable contract experience", weight: 20 },
    { code: "market-delivery", label: "Geography, logistics and after-sales", weight: 10 },
    { code: "financial-procurement-readiness", label: "Financial and procurement readiness", weight: 15 },
  ] satisfies FormulaCriterionDefinition[],
  works: [
    { code: "works-technical-relevance", label: "Works technical fit", weight: 25 },
    { code: "similar-contracts", label: "Similar contracts and references", weight: 25 },
    { code: "personnel-equipment-capacity", label: "Personnel, equipment and capacity", weight: 20 },
    { code: "mobilization-local-delivery", label: "Mobilization and local delivery", weight: 15 },
    { code: "financial-procurement-readiness", label: "Financial and procurement readiness", weight: 15 },
  ] satisfies FormulaCriterionDefinition[],
  fitScale: [
    { value: 5, label: "Exact" },
    { value: 4, label: "Strong" },
    { value: 3, label: "Partial" },
    { value: 2, label: "Weak" },
    { value: 1, label: "Minimal" },
    { value: 0, label: "Supported incompatibility" },
  ],
  workedExample: {
    label: "Illustrative Goods pair",
    criteria: [
      { code: "technical-relevance", label: "Product technical fit", weight: 35, fit: 4, points: 28 },
      { code: "capacity-delivery", label: "Supply capacity and delivery feasibility", weight: 20, fit: 3, points: 12 },
      { code: "comparable-experience", label: "Comparable contract experience", weight: 20, fit: null, points: 0 },
      { code: "market-delivery", label: "Geography, logistics and after-sales", weight: 10, fit: 4, points: 8 },
      { code: "financial-procurement-readiness", label: "Financial and procurement readiness", weight: 15, fit: null, points: 0 },
    ] satisfies FormulaWorkedCriterion[],
    pairScore: 48,
    assessedOnlyFit: 74,
    dataCoverage: 65,
  },
  diagnosticGates: [
    "Procurement type and supplier role",
    "Sanctions, exclusion and debarment",
    "Required licenses and certifications",
    "Turnover threshold",
    "Comparable-contract threshold",
    "Capacity threshold",
    "Local registration or partner requirements",
    "Delivery or mobilization feasibility",
  ],
  separateSignals: [
    "Evidence Confidence",
    "Supplier readiness",
    "Deadline urgency",
    "Consultant disposition",
  ],
  outsideScope: ["Consulting", "Services", "Other"],
} as const;
