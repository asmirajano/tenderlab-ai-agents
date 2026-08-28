export type RealAgentMaturity =
  | "concept-or-simulation"
  | "isolated-method-validated"
  | "validated-client-workflow"
  | "controlled-pilot"
  | "enterprise-runtime";

export type RealAgentEvidenceStrength =
  | "unit-or-synthetic-fixture"
  | "isolated-authorized-realistic-document"
  | "local-production-build-replay"
  | "deployed-smoke-verification"
  | "deployed-or-equivalent-representative-replay";

export type RealAgentDeploymentStatus =
  | "not-deployed"
  | "deployed-test-surface"
  | "controlled-pilot"
  | "production";

export type RealAgentRuntimeReadiness =
  | "static-client-workflow"
  | "controlled-pilot-runtime"
  | "enterprise-runtime";

export type RealAgentKnowledgeStatus = "candidate" | "validated" | "superseded";
export type RealAgentLessonClassification = "general" | "agent-specific";
export type RealAgentLessonEvidenceScope = "single-implementation" | "multiple-implementations";

export type RealAgentImplementation = {
  id: `implementation:TEA-RAI-${string}`;
  slug: string;
  name: string;
  ownerAgentId: `agent:TL-A${string}`;
  clientProductId: `product:${string}`;
  descriptor: string;
  tor: string;
  primaryInputs: string[];
  primaryOutput: string;
  downstreamConsumer: string;
  maturity: RealAgentMaturity;
  evidenceStrength: RealAgentEvidenceStrength;
  deploymentStatus: RealAgentDeploymentStatus;
  runtimeReadiness: RealAgentRuntimeReadiness;
  methodologyVersion: string;
  methodRefs: string[];
  playbookRefs: string[];
  knownLimitations: string[];
  patternIds: `pattern:TEA-RAP-${string}`[];
  lessonIds: `lesson:TEA-RAL-${string}`[];
  updatedAt: string;
};

export type RealAgentReusablePattern = {
  id: `pattern:TEA-RAP-${string}`;
  slug: string;
  title: string;
  problem: string;
  rule: string;
  methodologyGateIds: string[];
  confirmedByImplementationIds: `implementation:TEA-RAI-${string}`[];
  lessonIds: `lesson:TEA-RAL-${string}`[];
  evidenceStrength: RealAgentEvidenceStrength;
  status: RealAgentKnowledgeStatus;
};

export type RealAgentLesson = {
  id: `lesson:TEA-RAL-${string}`;
  title: string;
  classification: RealAgentLessonClassification;
  status: RealAgentKnowledgeStatus;
  evidenceScope: RealAgentLessonEvidenceScope;
  implementationIds: `implementation:TEA-RAI-${string}`[];
  failureLayer: string;
  whatHappened: string;
  rootCause: string;
  reusableRule: string;
  methodologyImpact: string;
  playbookRefs: string[];
  regressionRefs: string[];
  learnedAt: string;
};

export const realAgentImplementationIdPattern = /^implementation:TEA-RAI-[A-Z0-9-]+$/;
export const realAgentPatternIdPattern = /^pattern:TEA-RAP-[A-Z0-9-]+$/;
export const realAgentLessonIdPattern = /^lesson:TEA-RAL-[A-Z0-9-]+$/;
