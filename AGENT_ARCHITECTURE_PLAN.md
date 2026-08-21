# TenderLab.ai agent architecture plan

## Current decision

Keep the canonical architecture at 64 agents:

- 20 Main agents, including TenderLab Orchestrator;
- 22 Specialized agents;
- 22 Optional agents.

The teammate list A1-A15 is useful as a compact subsystem view, but it does not replace the current registry. Overlapping proposals are mapped to existing agents. Distinct capabilities are incorporated into those agents instead of adding duplicate names or a second hierarchy.

## Teammate proposal audit

| Proposal | Canonical mapping | Decision |
|---|---|---|
| A1 Tender Collection / Source Agents | Tender Source Ingestion Agent + Tender Discovery Agent | Covered; source acquisition wording strengthened |
| A2 Document Acquisition Agent | Tender Source Ingestion Agent + Document Intake Agent | Merged as original-file, attachment, source-URL, indexing, and versioning responsibilities |
| A3 Document Intelligence Agent | OCR & Language Agent + Tender Structure Agent + Requirement Parser Agent | Covered as a subsystem; no duplicate umbrella agent |
| A4 Tender Intelligence / Requirements Agent | Requirement Parser Agent + Eligibility & Qualification Agent + Evaluation Criteria Agent + Amendment & Change Agent | Covered as a subsystem |
| A5 Translation Agent | OCR & Language Agent | Translation through canonical English and translation caching incorporated; remains Optional through the existing agent |
| A6 Qualification & Compliance Agent | Eligibility & Qualification Agent + Compliance Matrix Agent + Technical Compliance Agent + Commercial Compliance Agent | Covered across qualification and bid stages; no cross-stage duplicate |
| A7 Client Profile Agent | Company Profile Agent + Product & Capability Agent + Company Verification Agent | Covered; retain Company terminology |
| A8 Matching / Recommendation Agent | Company-to-Tender Match Score Agent + Solution-Based Matching Agent | Explainable match reasoning incorporated |
| A9 Tender Evaluation / Scoring Agent | Evaluation Criteria Agent + Company-to-Tender Match Score Agent + TenderScore / Bid-No-Bid Agent | Opportunity and win-probability reasoning incorporated while keeping Readiness and Match distinct |
| A10 Award / Contract Intelligence Agent | Tender Award Intelligence Agent + Award & Contract Agent + Tender Knowledge Graph Agent | Tender-to-award-to-contract linkage incorporated |
| A11 Competitor Intelligence Agent | Buyer & Competitor Intelligence Agent + Market Intelligence Agent | Covered |
| A12 Bid Strategy Agent | TenderScore / Bid-No-Bid Agent + Proposal Strategy Agent | Positioning and bid-strategy wording incorporated |
| A13 Commercial Estimation Agent | Commercial Attractiveness Agent + Cost & Landed-Price Agent + Pricing & BOQ Agent | Scenario analysis incorporated; teammate acronym “GP/AAP” remains unconfirmed and is not adopted |
| A14 Knowledge Graph Intelligence | Tender Knowledge Graph Agent | Buyer, supplier, document, award, and contract relationships incorporated |
| A15 TenderLab Orchestrator / Agent Supervisor | TenderLab Orchestrator + Evidence & Provenance Agent + Human Approval Agent + Audit & Version Control Agent | Bounded stages, retries, confidence, provenance, and human-review coordination incorporated without centralizing every responsibility |

## Architecture guardrails

- Preserve exact English agent names and Russian short descriptions.
- Keep Tender Readiness separate from Company-to-Tender Match and win probability.
- Keep Main, Specialized, and Optional as classification; activation is case-specific.
- Do not imply that every agent runs or that the route is universally linear.
- Keep source acquisition, document intelligence, qualification, compliance, and proposal preparation as composable subsystems rather than duplicate umbrella agents.
- Require evidence, confidence, and human approval at the appropriate gates.

## Architecture views

- **Flat** remains the complete agent inventory.
- **Hierarchy** derives Main-parent and subagent relationships from explicit architecture metadata.
- Specialized and Optional agents may support multiple Main agents and appear under every relevant parent.
- Tier, layer, search, and relationship views all reuse the same canonical agent records.

## Updated implementation plan

1. **Canonical registry:** keep the current 64-agent names, layers, and tier counts as the source of truth.
2. **Capability metadata:** add explicit inputs, outputs, activation conditions, skip conditions, ownership, evidence, and confidence fields to the registry.
3. **Unified views:** derive Agent Command Center and Main Agents Run from the same registry instead of maintaining independent agent definitions.
4. **Dynamic routing:** let TenderLab Orchestrator select Main, Specialized, Optional, retry, and human-review paths for each case.
5. **Score contracts:** define Readiness, Match, Eligibility, Compliance, win probability, commercial attractiveness, and Bid / No-Bid as separate metrics with evidence.
6. **Document pipeline:** preserve source URL and original files through acquisition, versioning, OCR, canonical-English normalization, user-language translation, and cache.
7. **Outcome intelligence:** connect tender, award, contract, competitor, and delivery outcomes back into the knowledge graph and Outcome Learning Agent.
8. **Regression audit:** verify names, tiers, language, route state, score semantics, handoffs, responsive behavior, and cross-view consistency after each architecture change.
