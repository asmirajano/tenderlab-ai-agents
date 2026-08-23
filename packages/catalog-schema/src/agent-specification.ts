export type AgentDefinitionStatus = "structured" | "needs-review" | "approved" | "deprecated";
export type AgentTier = "main" | "specialized" | "optional";
export type AgentPlatformSide = "command-center" | "client-side" | "backend";

export type AgentOverlapFinding = {
  agentIds: number[];
  note: string;
};

export type AgentCapabilityProfile = {
  simply: string;
  responsibilityScope: string;
  activities: string[];
  exclusions: string[];
  typicalInputs: string[];
  trigger: string;
  skipCondition: string;
  authority: string;
  responsibilityBoundary: string;
  keyDistinction: string;
  workflowStage: string;
  upstream: string[];
  potentialOverlaps: AgentOverlapFinding[];
  definitionStatus: AgentDefinitionStatus;
  validationFinding?: string;
};

export type AgentOutputSpecification = {
  primary: string;
  artifacts: string[];
  consumers: string;
};

export type AgentExampleSpecification = {
  company: string;
  item: string;
  result: string;
};

export type AgentGovernance = {
  specificationVersion: string;
  status: AgentDefinitionStatus;
  schemaVersion: "1.0.0";
  updatedAt: string;
  steward?: string;
  approvedBy?: string;
  approvedAt?: string;
  sourceRefs: string[];
};

export type AgentStructuredGap = {
  status: "not-structured" | "not-applicable";
  note: string;
};

export type AgentSpecification = {
  id: number;
  registryId: string;
  slug: string;
  name: string;
  aliases: string[];
  previousNames: string[];
  description: string;
  layer: string;
  tier: AgentTier;
  core: boolean;
  governance: AgentGovernance;
  profile: AgentCapabilityProfile;
  output: AgentOutputSpecification;
  platformSides: AgentPlatformSide[];
  platformRationale: Partial<Record<AgentPlatformSide, string>>;
  example: AgentExampleSpecification;
  humanControls: AgentStructuredGap;
  errorBehavior: AgentStructuredGap;
  implementationRequirements: AgentStructuredGap;
};

export type AgentRelationshipType = "supports" | "overlaps" | "upstream" | "handoff";
export type AgentRelationshipStatus = "validated" | "working" | "needs-review";

export type AgentRelationshipEndpoint = {
  kind: "agent" | "external" | "process";
  ref: string;
  label: string;
};

export type AgentRelationship = {
  id: string;
  type: AgentRelationshipType;
  source: AgentRelationshipEndpoint;
  target: AgentRelationshipEndpoint;
  payload?: string;
  artifacts?: string[];
  condition?: string;
  humanApproval?: string;
  rationale: string;
  status: AgentRelationshipStatus;
};

export type AgentRevisionStatus = "recorded" | "approved" | "superseded";

export type AgentRevision = {
  id: string;
  agentId: string;
  fromVersion?: string;
  toVersion: string;
  date: string;
  changedFields: string[];
  summary: string;
  rationale: string;
  status: AgentRevisionStatus;
  approvedBy?: string;
};

export type AgentCaseEvidenceReference = {
  id: string;
  agentId: string;
  caseId: string;
  caseVersion: string;
  eventStep: number;
  eventTitle: string;
  role: string;
  input: string;
  output: string;
  handoff: string;
  evidence: string[];
  validationStatus: "confirmed" | "working" | "needs-review";
};
