export type CatalogueStatus = "draft" | "validated" | "deprecated";

export * from "./agent-specification";

export type LocalizedText = {
  en: string;
  ru?: string;
};

export type CatalogueRecord = {
  id: string;
  slug: string;
  catalogue: string;
  status: CatalogueStatus;
  version: string;
  name: LocalizedText;
  aliases: string[];
  summary: string;
  sourceRefs: string[];
  updatedAt: string;
};

export type Directness = "direct" | "indirect" | "context-dependent";

export type TenderSide = CatalogueRecord & {
  code: string;
  purpose: string;
  color: string;
  actorTypeIds: string[];
};

export type ActorType = CatalogueRecord & {
  sideIds: string[];
  directness: Directness;
  represents: string;
  role: string;
  stages: string[];
  authority: "A0" | "A1" | "A2" | "A3" | "A4" | "A5";
  contractualPosition: string;
  typicalInputs: string[];
  typicalOutputs: string[];
  participationNote?: string;
};

export type DataPriority = "core" | "high-value" | "expansion" | "specialized";
export type DataOrigin = "external" | "internal" | "hybrid";
export type DataVisibility = "public" | "registration" | "paid" | "restricted" | "private";

export type DataFamily = CatalogueRecord & {
  code: string;
  purpose: string;
  color: string;
};

export type DatasetDemo = {
  columns: string[];
  rows: string[][];
};

export type TenderDataset = CatalogueRecord & {
  familyId: string;
  contains: string;
  demo: DatasetDemo;
  exampleSources: string[];
  origin: DataOrigin;
  visibility: DataVisibility[];
  accessTypes: string[];
  updateFrequency: string;
  historicalDepth: string;
  geographicCoverage: string;
  lifecycle: string[];
  value: string;
  priority: DataPriority;
  difficulty: "L" | "M" | "H" | "VH";
};

export type AgentDeliverableDisposition =
  | "dataset-record"
  | "operational-state"
  | "audit-only"
  | "transient"
  | "potential-dataset-gap";

export type AgentDatasetRelationshipType =
  | "creates-record"
  | "updates-record"
  | "enriches-record"
  | "validates-record"
  | "appends-event"
  | "materializes-asset";

export type AgentDatasetRelationStatus = "proposed" | "validated" | "deprecated";

export type AgentDeliverable = {
  id: string;
  agentId: string;
  name: string;
  payloadFields: string[];
  disposition: AgentDeliverableDisposition;
  rationale: string;
};

export type AgentDatasetContribution = {
  id: string;
  agentId: string;
  deliverableId: string;
  datasetId: string;
  relationshipType: AgentDatasetRelationshipType;
  provides: string[];
  targetFields: string[];
  recordIdentity?: string;
  condition: string;
  rationale: string;
  provenanceRequirement: string;
  status: AgentDatasetRelationStatus;
  validationFinding?: string;
};

export type AgentDatasetGap = {
  id: string;
  agentId: string;
  deliverableId: string;
  proposedName: string;
  neededRecord: string;
  whyExistingDatasetsDoNotFit: string;
  status: "proposed" | "resolved" | "rejected";
};

export type DataSourceRecord = CatalogueRecord & {
  provider: string;
  datasets: string[];
  coverage: string;
  access: string[];
  rightsNote: string;
  url: string;
};

export type GlossaryScope = "core" | "tenderlab" | "agents" | "cases" | "actors" | "data" | "rules";

export type GlossaryTerm = CatalogueRecord & {
  term: string;
  definition: string;
  scopes: GlossaryScope[];
  relatedTerms: string[];
  contextualNotes?: Partial<Record<GlossaryScope, string>>;
};

export const catalogueIdPattern = /^(agent:TL-A\d{3}|side:TEA-S\d{2}|actor-type:TEA-AT-[A-Z0-9-]+|dataset:TEA-DS-[A-Z0-9-]+|source:TEA-SRC-[A-Z0-9-]+|term:TEA-G-[A-Z0-9-]+)$/;

export function assertUniqueCatalogueRecords(records: CatalogueRecord[], label: string) {
  const ids = new Set<string>();
  const slugs = new Set<string>();
  for (const record of records) {
    if (ids.has(record.id)) throw new Error(`${label}: duplicate id ${record.id}`);
    if (slugs.has(record.slug)) throw new Error(`${label}: duplicate slug ${record.slug}`);
    ids.add(record.id);
    slugs.add(record.slug);
  }
}
