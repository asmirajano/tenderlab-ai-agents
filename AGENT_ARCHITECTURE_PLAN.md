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
| A1 Tender Collection / Source Agents | Tender Source Acquisition Agent + Tender Discovery Agent | Covered; source acquisition wording strengthened |
| A2 Document Acquisition Agent | Tender Source Acquisition Agent + Document Intake Agent | Merged as original-file, attachment, source-URL, indexing, and versioning responsibilities |
| A3 Document Intelligence Agent | Tender OCR & Translation Agent + Tender Structure Agent + Requirement Parser Agent | Covered as a subsystem; no duplicate umbrella agent |
| A4 Tender Intelligence / Requirements Agent | Requirement Parser Agent + Eligibility & Qualification Agent + Evaluation Criteria Agent + Amendment & Change Agent | Covered as a subsystem |
| A5 Translation Agent | Tender OCR & Translation Agent | Translation through canonical English and translation caching incorporated; remains Optional through the existing agent |
| A6 Qualification & Compliance Agent | Eligibility & Qualification Agent + Compliance Matrix Agent + Technical Compliance Agent + Commercial Compliance Agent | Covered across qualification and bid stages; no cross-stage duplicate |
| A7 Client Profile Agent | Company Profile Agent + Product & Capability Agent + Company Verification Agent | Covered; retain Company terminology |
| A8 Matching / Recommendation Agent | Company-to-Tender Match Score Agent + Participation Solution-Fit Agent | Explainable match reasoning incorporated |
| A9 Tender Evaluation / Scoring Agent | Evaluation Criteria Agent + Company-to-Tender Match Score Agent + Bid / No-Bid Decision Agent | Opportunity and win-probability reasoning incorporated while keeping Readiness and Match distinct |
| A10 Award / Contract Intelligence Agent | Tender Award Intelligence Agent + Award-to-Contract Agent + Tender Knowledge Graph Agent | Tender-to-award-to-contract linkage incorporated |
| A11 Competitor Intelligence Agent | Buyer & Competitor Intelligence Agent + Market Intelligence Agent | Covered |
| A12 Bid Strategy Agent | Bid / No-Bid Decision Agent + Proposal Strategy Agent | Positioning and bid-strategy wording incorporated |
| A13 Commercial Estimation Agent | Commercial Attractiveness Agent + TENDER LOGISTICS COST + Pricing & BOQ Agent | Scenario analysis incorporated; teammate acronym “GP/AAP” remains unconfirmed and is not adopted |
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
- Every agent record defines a primary output, concrete artifacts, and downstream consumers; the same metadata powers Main hierarchy outputs and all 64 individual agent cards.
- Primary navigation is route-based: Command Center (`/`), Workflow (`/workflow`), Agents (`/agents`), Main Run (`/main-agents-run`), and Case Audit (`/case-simulation`) render independent pages from shared components and data.
- Hierarchy rows render the flow as Main agent → supporting subagents → Result / Output.
- Tier, layer, search, and relationship views all reuse the same canonical agent records.
- Every agent also carries audited platform-use metadata: Command Center, Client Side, or Backend. Shared is derived only when an agent genuinely serves both Command Center and Client Side.
- Backend remains an exclusive behind-the-scenes classification; platform-side filters compose with Flat / Hierarchy, tier, layer, and search filters.
- Every assigned platform side has an agent-specific rationale derived from its users, inputs, outputs, and workflow; Shared agents explain Command Center and Client Side separately in the individual-agent drawer.
- All entry points use one canonical individual-agent drawer with a progressive profile hierarchy: identity and purpose → platform role → operating model → canonical result and handoff → realistic example → operational metadata. Case Audit adds an explicit case/event context layer without mutating the canonical agent registry.

## Case simulation audit

- The canonical Case model is **Case → Events + Processes → Agent executions → Outputs / Artifacts**. Events are bounded occurrences; Processes are first-class continuing work and are explicitly typed as persistent, Case-scoped, or parallel.
- Every Process has an owner Actor, Trigger, Inputs, participating canonical Agent IDs, state, owned Artifacts, and typed consumers. An Agent may participate in a Process without being assigned artificially to an Event.
- Artifacts belong to the Event or Process that produced them. Process → Event, Event → Process, and Process → Process dependencies use the same typed relationship registry as Event → Event handoffs.
- Production identity is split into Process Definition, Process Instance, Agent Execution attempt, and Artifact. Tender Ecosystem Atlas is the admin control/reference surface for definitions, instances, lineage, readiness and exceptions; scheduler, durable state, execution journal, artifact storage and recovery belong to a separate production runtime.

- Case Audit is designed as **Agents as rows × Cases as columns** so the current Case 1 analysis can grow to ten cases without changing the matrix model.
- Agent identity, tier, layer, platform side, purpose, and canonical output continue to come from the shared 64-agent registry. Case records store only case-specific engagement decisions and handoffs.
- Case 1 is **«Международная поставка школьной мебели»**: one international Goods tender, one lot, Georgia as organizer country, a Turkish furniture manufacturer, and a DEMO budget of $3.85 million.
- The first audit classifies all 64 agents as 47 Required / Core, 9 Conditional, and 8 Not involved. Conditional records distinguish six triggered conditions from three standby conditions.
- Each involved record defines its workflow stage, practical reason, input, case-specific output, and next consumer. Each skipped record defines which active capability covers the work or why no practical role exists.
- Twelve route stages expose the end-to-end handoff from control and discovery through bid preparation, submission, evaluation, award, contract execution, and learning.
- All Case 1-specific content is packaged as one accessible, collapsible case module so future approved cases can remain self-contained rather than extending one uninterrupted page.
- A 20-event Russian review chronology follows the compact workflow. It tells the concrete simulated story from publication through discovery, company consent, qualification, proposal, submission, evaluation, award, execution, closeout, and learning; every event names its initiator, agents, result, and next handoff.
- Chronology agent chips resolve their labels and IDs from the canonical 64-agent registry. Each chip opens the canonical Agent drawer enriched with Case 1 event context, agent-specific A/B/C input-output-handoff data, and a DEMO event example without changing the reader's chronology position.
- The global Cases × 64 Agents matrix is a separate page-level audit surface outside every individual case module. Collapsing Case 1 never hides the ten-case matrix or its filters.
- Cases 2–10 remain visible only as future matrix placeholders until Case 1 methodology and assignments are approved.

## Updated implementation plan

1. **Canonical registry:** keep the current 64-agent names, layers, and tier counts as the source of truth.
2. **Capability metadata:** add explicit inputs, outputs, activation conditions, skip conditions, ownership, evidence, and confidence fields to the registry.
3. **Unified views:** derive Agent Command Center and Main Agents Run from the same registry instead of maintaining independent agent definitions.
4. **Dynamic routing:** let TenderLab Orchestrator select Main, Specialized, Optional, retry, and human-review paths for each case.
5. **Score contracts:** define Readiness, Match, Eligibility, Compliance, win probability, commercial attractiveness, and Bid / No-Bid as separate metrics with evidence.
6. **Document pipeline:** preserve source URL and original files through acquisition, versioning, OCR, canonical-English normalization, user-language translation, and cache.
7. **Outcome intelligence:** connect tender, award, contract, competitor, and delivery outcomes back into the knowledge graph and Tender Outcome Learning Agent.
8. **Regression audit:** verify names, tiers, language, route state, score semantics, handoffs, responsive behavior, and cross-view consistency after each architecture change.
9. **Platform-use audit:** review responsibility, inputs, outputs, and workflow exposure before changing Command Center, Client Side, Backend, or Shared classifications.
