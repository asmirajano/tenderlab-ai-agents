import { agents } from "../../packages/catalog-data/src/agents.ts";
import type { CaseAgentEngagement } from "./case-1-data.ts";
import { case1Engagements } from "./case-1-data.ts";
import { case2Engagements } from "./case-2-data.ts";
import { case3Engagements } from "./case-3-data.ts";
import { case4Engagements } from "./case-4-data.ts";
import { case5Engagements } from "./case-5-data.ts";
import { case6Engagements } from "./case-6-data.ts";
import { case7Engagements } from "./case-7-data.ts";
import { case8Engagements } from "./case-8-data.ts";
import { case9Engagements } from "./case-9-data.ts";
import { case10Engagements } from "./case-10-data.ts";

export const validationCases: CaseAgentEngagement[][] = [
  case1Engagements,
  case2Engagements,
  case3Engagements,
  case4Engagements,
  case5Engagements,
  case6Engagements,
  case7Engagements,
  case8Engagements,
  case9Engagements,
  case10Engagements,
];

export const cumulativeAgentCoverage = agents.map((agent) => {
  const records = validationCases.map((engagements) => engagements.find((record) => record.agentId === agent.id)!);
  return {
    agentId: agent.id,
    name: agent.name,
    required: records.filter((record) => record.status === "required").length,
    conditional: records.filter((record) => record.status === "conditional").length,
    background: records.filter((record) => record.status === "background").length,
    notInvolved: records.filter((record) => record.status === "not-involved").length,
  };
});

export const cumulativeValidation = {
  caseCount: validationCases.length,
  canonicalAgentCount: agents.length,
  requiredAtLeastOnce: cumulativeAgentCoverage.filter((record) => record.required > 0),
  stronglyValidated: cumulativeAgentCoverage.filter((record) => record.required >= 7),
  rarelyRequired: cumulativeAgentCoverage.filter((record) => record.required <= 2),
  neverRequired: cumulativeAgentCoverage.filter((record) => record.required === 0),
  requiredExecutions: validationCases.flat().filter((record) => record.status === "required").length,
  conditionalExecutions: validationCases.flat().filter((record) => record.status === "conditional").length,
  backgroundExecutions: validationCases.flat().filter((record) => record.status === "background").length,
  skippedExecutions: validationCases.flat().filter((record) => record.status === "not-involved").length,
} as const;

export const recurringBoundaryFindings = [
  "13 / 15 / 16 / 14 — source acquisition, source-item routing, business classification, policy filtering and relevance ranking need explicit sequential contracts.",
  "09 / 25 / 31 / 32 / 35 — readiness, eligibility, match, solution fit and Bid / No-Bid are different questions; no score owns human authority.",
  "08 / 44 and 12 / 40 / 41 / 42 — own-company, supplier and partner verification plus graph, discovery, consortium and local-representation roles need entity- and consent-specific boundaries.",
  "36 / 39 / 62 — pre-bid feasibility, promised solution design and post-award execution are separate lifecycle states.",
  "37 / 50 / 51 / 54 — attractiveness, cost basis, pricing schedule and final commercial response share assumptions but must not duplicate outputs.",
  "30 / 59 / 60 — pre-bid clarification, post-bid response and dialogue/negotiation are direction- and stage-specific capabilities.",
  "57 / 61 / 63 — legal interpretation, award-to-contract transition and live contract/payment administration require explicit handoffs.",
] as const;

export const missingCapabilityCandidates = [
  { firstRaised: "Case 6", capability: "Procurement Complaint / Remedies", evidence: "Standing, complaint package, filing, remedy status and re-evaluation handoff have no canonical owner." },
  { firstRaised: "Case 7", capability: "Buyer-side Procurement Planning, Evaluation & Acceptance", evidence: "Buyer procedure justification, award recommendation, inspection and acceptance are only composed from bidder-oriented roles." },
  { firstRaised: "Case 8", capability: "Project Finance / Bankability", evidence: "Lender diligence, financing plan and financial-close readiness stretch Commercial Attractiveness beyond its current boundary." },
  { firstRaised: "Case 8", capability: "Environmental & Social Safeguards / Permitting", evidence: "Land, grid, environmental and social approvals rely on human specialists without a canonical workflow owner." },
  { firstRaised: "Case 9", capability: "Contract Claims / Delay Analysis", evidence: "Entitlement, claim lifecycle, critical-path causation, concurrency and EOT quantum remain split across change, legal and administration roles." },
  { firstRaised: "Case 10", capability: "Beneficial Ownership / Sanctions / Integrity Due Diligence", evidence: "UBO, PEP, debarment and conflict screening across partners and suppliers lack an explicit owner." },
  { firstRaised: "Case 10", capability: "Cybersecurity / Data Protection Compliance", evidence: "Sovereign hosting, escrow and security-control evidence are only partially covered by fidelity, risk, solution, technical and legal roles." },
  { firstRaised: "Case 10", capability: "Privacy / Data Governance", evidence: "Consent, purpose limitation, retention, deletion and permitted learning for private third-party evidence need an explicit governed owner." },
] as const;

export const programArchitectureConclusions = [
  "All 64 canonical Agents became required in at least one realistic Case; this proves scenario relevance, not production readiness or optimal granularity.",
  "Agents 01–04, 17 and 38 were required in all ten Cases, validating orchestration, human approval, provenance, audit/version control, deadline/change monitoring and risk/integrity as cross-cutting controls.",
  "Rare use is legitimate when the trigger is explicit: Award Intelligence and OCR/Translation became required only in Case 10; JV, amendments and post-bid clarification remain scenario-specific.",
  "A governed No-Bid with zero submission is a successful terminal state. Proposal, submission, award and execution Agents must remain visibly stopped, not artificially activated.",
  "Several gaps are capability candidates, not automatic new Agents. Each needs a boundary/dataset/runtime review before the canonical registry changes.",
] as const;

if (validationCases.length !== 10 || validationCases.some((records) => records.length !== 64)) {
  throw new Error("The cumulative validation programme requires exactly 10 Cases × 64 Agent engagement records.");
}
