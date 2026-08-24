import type { CaseProcess, ProcessActivityKind, ProcessRelationship } from "../process-model.ts";

export type Case8EventBlueprint = {
  step: number;
  period: string;
  phase: string;
  title: string;
  initiator: string;
  narrative: string;
  result: string;
  next: string;
  agentIds: number[];
  standbyAgentIds?: number[];
  responsibleActorId: string;
  actorIds: string[];
  kind?: ProcessActivityKind;
  trigger: string;
  startDay: number;
  endDay: number;
  column: number;
  lane: "buyer" | "client" | "tenderlab" | "consultant" | "external";
  critical?: boolean;
  scopeBoundary: string;
  missingAgentFinding: string;
};

export type Case8RelationshipSpec = {
  from: number;
  to: number;
  type?: ProcessRelationship["type"];
  label: string;
  condition?: string;
  blocking?: boolean;
  joinPolicy?: ProcessRelationship["joinPolicy"];
};

export const case8EventBlueprints: Case8EventBlueprint[] = [
  {
    step: 1, period: "День 0", phase: "RFQ/PQ publication", title: "Authority публикует RFQ/PQ на единую e-bus concession", initiator: "ATU Lima–Callao",
    narrative: "Официальный RFQ/PQ открывает один lot: 420 e-buses, три depots, 58 MW charging и 15-летний DBFOM availability-payment contract. Published ceiling описывает public-payment envelope, а не гарантированную прибыль или committed funding bidder.",
    result: "Authoritative RFQ/PQ source package, deadline, data-room index и provenance.", next: "E02 технически типизирует публикацию и формирует opportunity record.",
    agentIds: [13, 4], responsibleActorId: "buyer", actorIds: ["buyer", "tenderlab"], kind: "external-event", trigger: "Official international PPP RFQ/PQ publication", startDay: 0, endDay: 0, column: 0, lane: "buyer", critical: true,
    scopeBoundary: "Authority создаёт procurement state; Source Acquisition выполняет source typing, но не business classification или relevance.", missingAgentFinding: "Agents 13 and 15 достаточно разделяют source-item typing и PPP business classification.",
  },
  {
    step: 2, period: "День 0–2", phase: "Discovery", title: "Opportunity классифицируется как PPP/DBFOM", initiator: "TenderLab / Backend",
    narrative: "Classification фиксирует concession/PPP, mixed works-goods-services, RFQ/PQ и competitive dialogue. Filtering применяет geography, policy и deadline constraints; Discovery ранжирует opportunity против verified VoltAxis profile. Relevance 91% не означает qualification, bankability или Bid approval.",
    result: "Opportunity Review Pack 91% с procedure model, hard-filter reasons и evidence caveats.", next: "E03 передаёт preliminary opportunity совету VoltAxis для отдельного assessment mandate.",
    agentIds: [15, 16, 14], responsibleActorId: "tenderlab", actorIds: ["tenderlab"], trigger: "E01 + P01 governance + P02 company baseline", startDay: 0, endDay: 2, column: 1, lane: "tenderlab", critical: true,
    scopeBoundary: "Relevance, readiness, qualification, commercial attractiveness и bankability остаются разными outputs.", missingAgentFinding: "Текущие discovery boundaries достаточны.",
  },
  {
    step: 3, period: "День 2–4", phase: "Assessment gate", title: "VoltAxis разрешает PPP assessment, но не формирование consortium", initiator: "VoltAxis Investment Committee",
    narrative: "Committee получает opportunity pack, Buyer history, preliminary partner gaps и cost-of-pursuit estimate. Оно разрешает controlled assessment/data-room use и consultant budget, но не контактирует с partners, не фиксирует equity и не утверждает Bid.",
    result: "Versioned assessment mandate, authorised users, budget, stop conditions и contact boundary.", next: "E04 и E05 запускают parallel tender/company work; E06 ждёт обе ветви.",
    agentIds: [31, 35, 2, 1], responsibleActorId: "client", actorIds: ["client", "consultant", "tenderlab"], kind: "decision", trigger: "E02 Opportunity Review Pack", startDay: 2, endDay: 4, column: 2, lane: "client", critical: true,
    scopeBoundary: "Assessment permission ≠ partner contact, consortium consent, Bid approval или authority to commit capital.", missingAgentFinding: "Human Approval + Orchestrator покрывают authority transition.",
  },
  {
    step: 4, period: "День 4–12", phase: "PQ intelligence", title: "RFQ/PQ превращается в source-locked qualification model", initiator: "TenderLab document workflow",
    narrative: "Spanish RFQ/PQ, scanned land annexes и data-room files проходят Intake, OCR/translation, structure, requirement parsing, evaluation, forms и fidelity. Модель отделяет sponsor eligibility, consortium aggregate criteria, member-specific evidence, equity thresholds и prohibited post-shortlist substitutions.",
    result: "Current PQ corpus, 126 requirements, 37 forms, pass/fail scorecard и clarification register.", next: "E05 проверяет sponsor; E06 проектирует consortium against exact criteria.",
    agentIds: [21, 22, 23, 24, 26, 27, 28, 30, 3, 4], responsibleActorId: "tenderlab", actorIds: ["tenderlab", "consultant"], trigger: "E01 authoritative RFQ/PQ package", startDay: 4, endDay: 12, column: 3, lane: "tenderlab", critical: true,
    scopeBoundary: "Translation preserves source alignment; procurement meaning belongs to requirement/evaluation Agents and accountable human experts.", missingAgentFinding: "Bilingual PPP package is covered; no new translation capability is needed.",
  },
  {
    step: 5, period: "День 4–14", phase: "Sponsor baseline", title: "Lead sponsor identity, readiness и qualification подтверждаются", initiator: "VoltAxis Bid Director",
    narrative: "Identity, beneficial ownership, PPP references, balance sheet, investment approvals, technical capabilities and credentials receive evidence/provenance. Readiness 78/100; sponsor qualification is conditional on four-member consortium coverage and committed-equity evidence.",
    result: "Verified sponsor dossier, Readiness 78/100 и conditional PQ pass with explicit gaps.", next: "E06 combines exact PQ gaps with participation alternatives.",
    agentIds: [6, 7, 8, 9, 10, 25, 31, 34], responsibleActorId: "client", actorIds: ["client", "tenderlab", "consultant"], trigger: "E03 data-room mandate + E04 PQ model", startDay: 4, endDay: 14, column: 3, lane: "client", critical: true,
    scopeBoundary: "General readiness does not replace tender-specific qualification; a provisional partner claim is not verified consortium evidence.", missingAgentFinding: "Existing Company/Qualification Agents remain distinct.",
  },
  {
    step: 6, period: "День 12–22", phase: "Participation architecture", title: "Consortium composition и SPV route оптимизируются", initiator: "VoltAxis Investment Committee",
    narrative: "Solution-Fit and Participation Route reject solo bidding. Partner Discovery ranks a local operator, charging/EPC integrator and infrastructure equity investor. JV Optimization models workshare, equity, voting, joint liability and dependency coverage; Risk screens integrity and conflicts.",
    result: "Recommended four-member consortium: roles, equity 40/25/20/15, reserved matters, gaps and alternate candidates.", next: "E07 obtains explicit consent and verifies each proposed member before PQQ use.",
    agentIds: [32, 33, 40, 41, 12, 38], responsibleActorId: "client", actorIds: ["client", "consultant", "tenderlab"], trigger: "ALL: E04 PQ model + E05 verified sponsor/gap register", startDay: 12, endDay: 22, column: 4, lane: "client", critical: true,
    scopeBoundary: "Agent 41 recommends structure; members and authorised corporate bodies alone consent to equity, liability and governance.", missingAgentFinding: "Case 8 tests where consortium optimisation ends and Project Company/shareholder governance begins.",
  },
  {
    step: 7, period: "День 22–35", phase: "Consent + due diligence", title: "Three partners consent and pass member-specific verification", initiator: "Proposed consortium members",
    narrative: "Andina Operaciones, IberCharge Infra and TerraPension Infra Fund separately approve disclosure and proposed roles. Company/Supplier Verification checks legal identity, licenses, references, capacity, integrity and funding evidence. Local Service validates the Peruvian operating footprint; humans approve the consortium MOU.",
    result: "Signed consortium MOU, 4/4 verified members, evidence matrix, equity/workshare and substitution controls.", next: "E08 creates and submits one controlled PQQ package.",
    agentIds: [8, 10, 40, 41, 42, 44, 2, 4], responsibleActorId: "client", actorIds: ["client", "external", "consultant", "tenderlab"], kind: "decision", trigger: "E06 recommended structure + member consent", startDay: 22, endDay: 35, column: 5, lane: "client", critical: true,
    scopeBoundary: "TenderLab cannot create consent or bind a member. Verification evaluates evidence; it does not grant membership.", missingAgentFinding: "Agents 08/44 overlap on entity verification; member type and downstream decision must remain explicit.",
  },
  {
    step: 8, period: "День 35–45", phase: "PQQ submission", title: "Consortium PQQ проходит red team и authorised submission", initiator: "VoltAxis Authorised Signatory",
    narrative: "Credentials map each reference, balance-sheet threshold and member role to the PQ criteria. Compliance and red team find two unsigned declarations; owners cure them. The signatory submits one manifest-controlled package and captures the portal receipt.",
    result: "Complete PQQ, member evidence map, signatures, hashes and submission receipt.", next: "E09 waits for Authority shortlist decision and authoritative RFP release.",
    agentIds: [55, 47, 56, 58, 2, 4], responsibleActorId: "client", actorIds: ["client", "consultant", "tenderlab"], trigger: "E07 verified consortium + E04 form register", startDay: 35, endDay: 45, column: 6, lane: "client", critical: true,
    scopeBoundary: "Agents prepare and validate; only authorised consortium signatory submits PQQ.", missingAgentFinding: "No missing capability.",
  },
  {
    step: 9, period: "День 75", phase: "Shortlist + RFP", title: "Authority shortlists consortium и opens dialogue data room", initiator: "ATU Evaluation Committee",
    narrative: "Authority externally confirms PQ pass, shortlists four bidders and issues draft RFP, concession agreement, output specifications, demand data, land/grid studies and dialogue protocol. No Agent manufactures shortlist or official RFP state.",
    result: "Authoritative shortlist notice, draft RFP corpus, dialogue calendar and access rights.", next: "E10 models the concession/evaluation state and dialogue boundaries.",
    agentIds: [13, 15, 21, 17, 4], responsibleActorId: "buyer", actorIds: ["buyer", "client", "tenderlab"], kind: "external-event", trigger: "Authority shortlist decision after E08", startDay: 75, endDay: 75, column: 7, lane: "buyer", critical: true,
    scopeBoundary: "Shortlist and RFP are external Buyer states; Agent records them without predicting or granting access.", missingAgentFinding: "No missing capability.",
  },
  {
    step: 10, period: "День 75–100", phase: "RFP + dialogue model", title: "Draft concession becomes an auditable dialogue model", initiator: "TenderLab + consortium workstream leads",
    narrative: "Document workflow decomposes technical outputs, payment mechanism, evaluation formula, concession clauses, CPs, land/grid dependencies and dialogue rules. Pre-Bid Clarification creates issue records; Legal Review separates negotiable allocations from mandatory terms.",
    result: "Source-locked RFP, 214 requirements, evaluation model, 37 dialogue issues and contract-risk matrix.", next: "E11–E13 run technical, finance and safeguards branches in parallel.",
    agentIds: [21, 23, 24, 26, 27, 28, 30, 57, 3, 4], responsibleActorId: "tenderlab", actorIds: ["tenderlab", "client", "consultant"], trigger: "E09 authoritative shortlist/RFP + data-room access", startDay: 75, endDay: 100, column: 8, lane: "tenderlab", critical: true,
    scopeBoundary: "Issue detection and contract analysis do not authorize concessions; official dialogue positions require Client approval.", missingAgentFinding: "Competitive-dialogue ownership is split between Agents 30 and 60 and requires boundary review.",
  },
  {
    step: 11, period: "День 90–130", phase: "Technical/O&M branch", title: "Fleet, charging, depot и O&M solution is configured", initiator: "Consortium Technical Director",
    narrative: "Solution Architecture builds fleet/depot/charging/service model. Supplier Discovery sources qualified bus, battery and charger vendors; RFQ and normalization compare lifecycle warranty, efficiency, lead time, FX and interfaces. Technical Compliance and Feasibility test output requirements and 24-month delivery.",
    result: "Compliant reference design, verified supplier basis, lifecycle cost inputs and execution-feasibility register.", next: "E14 consumes approved technical assumptions; E17 later writes final technical BAFO.",
    agentIds: [39, 43, 44, 45, 46, 48, 36], responsibleActorId: "client", actorIds: ["client", "external", "consultant", "tenderlab"], trigger: "E10 technical/output model + E07 consortium roles", startDay: 90, endDay: 130, column: 9, lane: "client", critical: true,
    scopeBoundary: "Supplier sourcing supports solution evidence; suppliers are not consortium members or equity decision-makers.", missingAgentFinding: "Agent 43/44 entity boundary remains defensible when vendor and consortium-member types are explicit.",
  },
  {
    step: 12, period: "День 90–140", phase: "Finance/bankability branch", title: "Availability-payment model and lender conditions are developed", initiator: "VoltAxis CFO + lender advisers",
    narrative: "Commercial Attractiveness, Cost, Pricing, Commercial Proposal and Legal/Risk model CAPEX/OPEX, FX, debt service, availability deductions, equity return and downside. Three lenders issue non-binding term sheets; their credit decisions remain external and no canonical Agent owns financial close.",
    result: "Base/downside financial model, BAFO NPV $319.4m, lender term-sheet matrix and unresolved bankability conditions.", next: "E14 carries approved bankability questions; E16 uses downside evidence at BAFO gate.",
    agentIds: [37, 38, 49, 50, 51, 54, 57], responsibleActorId: "client", actorIds: ["client", "external", "consultant", "tenderlab"], trigger: "E10 payment/contract model + E11 cost and technical assumptions", startDay: 90, endDay: 140, column: 9, lane: "client", critical: true,
    scopeBoundary: "Agents model and compare; lenders alone approve debt and Client bodies approve equity/price. Pre-bid attractiveness is not lender credit underwriting.", missingAgentFinding: "No canonical Project Finance / Bankability / Financial Close Agent exists; Agent 37 is materially stretched beyond an ordinary bid business case.",
  },
  {
    step: 13, period: "День 90–135", phase: "Safeguards + permits branch", title: "Land, grid, environmental and social conditions are tested", initiator: "Consortium ESG/Permits Lead",
    narrative: "Risk, Technical Compliance, Legal Review and Credentials map land access, grid connection, environmental permits, labour/community safeguards and local operating licences. Accountable legal, engineering and safeguards experts validate conclusions; Agents do not issue permits.",
    result: "Safeguards/permit matrix, critical dependencies, evidence owners and six Authority questions.", next: "E14 includes authorised dialogue positions; E16 preserves unresolved CPs in BAFO decision.",
    agentIds: [38, 48, 57, 55], responsibleActorId: "consultant", actorIds: ["client", "consultant", "external", "tenderlab"], trigger: "E10 land/grid/contract corpus", startDay: 90, endDay: 135, column: 9, lane: "consultant", critical: true,
    scopeBoundary: "Agents structure evidence; public bodies and licensed experts own permits, safeguards findings and legal opinions.", missingAgentFinding: "Environmental/social safeguards and permitting lack an explicit canonical owner; current composition may be adequate only with mandatory human specialists.",
  },
  {
    step: 14, period: "День 118–145", phase: "Competitive dialogue", title: "Consortium conducts controlled dialogue within approved positions", initiator: "ATU Dialogue Panel",
    narrative: "Question records, technical alternatives, payment/risk proposals and lender concerns converge into three dialogue rounds. Presentation & Negotiation prepares positions and concession limits; authorised consortium representatives speak. Authority owns minutes and may accept, reject or defer issues.",
    result: "Three versioned dialogue records, 22 resolved issues, 15 reserved positions and approved BAFO assumptions.", next: "E15 waits for Authority Revised RFP 02 rather than treating dialogue notes as changed tender terms.",
    agentIds: [30, 52, 53, 60, 2, 4], responsibleActorId: "buyer", actorIds: ["buyer", "client", "consultant", "tenderlab", "external"], kind: "decision", trigger: "ALL: E11 technical + E12 finance + E13 safeguards workstreams", startDay: 118, endDay: 145, column: 10, lane: "buyer", critical: true,
    scopeBoundary: "Dialogue position preparation ≠ official Authority amendment; only authorised people speak and Authority minutes govern outcome.", missingAgentFinding: "Agents 30/60 boundaries between clarification, dialogue and negotiation require explicit procedure semantics.",
  },
  {
    step: 15, period: "День 150", phase: "Revised RFP", title: "Authority issues Revised RFP 02 after dialogue", initiator: "ATU Procurement Committee",
    narrative: "Revised RFP changes availability deductions, battery residual-value allocation, grid interface and final BAFO forms. Amendment Agent compares authoritative versions, routes affected technical/finance/contract items and resets deadlines. Dialogue positions that were not adopted remain non-binding.",
    result: "Current Revised RFP 02, semantic delta, impact register and updated BAFO calendar.", next: "E16 makes final Bid/BAFO decision only against current requirements.",
    agentIds: [29, 17, 21, 24, 26, 28, 4], responsibleActorId: "buyer", actorIds: ["buyer", "tenderlab", "client"], kind: "external-event", trigger: "Official Revised RFP 02 after E14", startDay: 150, endDay: 150, column: 11, lane: "buyer", critical: true,
    scopeBoundary: "Only official Revised RFP changes obligations; Agent 29 does not convert dialogue concessions into law or contract.", missingAgentFinding: "No missing capability.",
  },
  {
    step: 16, period: "День 150–165", phase: "BAFO decision gate", title: "Consortium approves final participation, price and risk limits", initiator: "Four member boards + VoltAxis Investment Committee",
    narrative: "Eligibility, Match, route, gap closure, feasibility, downside, integrity and revised risk allocation converge. Each member confirms workshare/equity; Client approves BAFO NPV ceiling, negotiation red lines and withdrawal triggers. Recommendation never substitutes member board authority.",
    result: "Approved BAFO mandate, member consents, price/risk limits and final workplan.", next: "E17 and E18 create technical and financial proposal branches in parallel.",
    agentIds: [25, 31, 32, 33, 35, 36, 37, 38, 2], responsibleActorId: "client", actorIds: ["client", "external", "consultant", "tenderlab"], kind: "decision", trigger: "E15 current RFP + completed dialogue workstreams", startDay: 150, endDay: 165, column: 12, lane: "client", critical: true,
    scopeBoundary: "Bid recommendation, score and bankability model are decision inputs; member boards approve commitment and BAFO limits.", missingAgentFinding: "Agent 37 supports decision economics but not committed financing.",
  },
  {
    step: 17, period: "День 165–200", phase: "Technical BAFO", title: "Final technical/O&M proposal is produced", initiator: "Consortium Technical Director",
    narrative: "Solution Architecture, compliance, proposal strategy and Technical Proposal convert current outputs into fleet/depot design, implementation schedule, performance regime, O&M method, safeguards plan and evidence-linked credentials. Compliance Matrix maintains owner/status for every requirement.",
    result: "QA-ready technical BAFO with 214/214 requirement traceability and evidence annexes.", next: "E19 red team joins technical package with E18 financial BAFO.",
    agentIds: [39, 47, 48, 52, 53, 55], responsibleActorId: "client", actorIds: ["client", "consultant", "tenderlab"], trigger: "E16 approved mandate + E15 current requirements", startDay: 165, endDay: 200, column: 13, lane: "client", critical: true,
    scopeBoundary: "Proposal Agents author evidence-backed content; accountable technical leads approve engineering assumptions.", missingAgentFinding: "No missing capability.",
  },
  {
    step: 18, period: "День 165–205", phase: "Financial BAFO", title: "Final financial and contractual proposal is produced", initiator: "VoltAxis CFO",
    narrative: "Approved financial model produces CAPEX/OPEX schedules, availability-payment NPV, indexation, deductions, equity commitments, bid security and lender support forms. Legal Review checks contract qualifications; Negotiation boundaries prevent unauthorised exceptions.",
    result: "QA-ready financial BAFO: $319.4m NPV, committed-equity letters, term sheets and contract departures.", next: "E19 joins financial and technical packages for independent red team.",
    agentIds: [37, 49, 50, 51, 54, 57, 60], responsibleActorId: "client", actorIds: ["client", "external", "consultant", "tenderlab"], trigger: "E16 approved price/risk limits + E12 current model", startDay: 165, endDay: 205, column: 13, lane: "client", critical: true,
    scopeBoundary: "Bid financial schedules are not committed debt; non-binding lender support cannot be represented as financial close.", missingAgentFinding: "Agent 51 supports a PPP payment model despite BOQ-oriented naming; boundary with Agents 37/54 needs review.",
  },
  {
    step: 19, period: "День 205–215", phase: "Red team + submission", title: "BAFO passes red team and authorised submission", initiator: "VoltAxis Authorised Signatory",
    narrative: "Independent red team checks both branches, cross-document consistency, signatures, lender-language caveats and portal packaging. Three defects are cured; human signatories approve final files. Submission Agent records manifest, hashes, timestamp and receipt.",
    result: "Submitted BAFO, signed declarations, immutable manifest and Authority receipt.", next: "E20 waits for evaluation, presentation and bounded clarification.",
    agentIds: [56, 58, 2, 4], responsibleActorId: "client", actorIds: ["client", "consultant", "tenderlab"], kind: "decision", trigger: "ALL: E17 technical + E18 financial BAFO", startDay: 205, endDay: 215, column: 14, lane: "client", critical: true,
    scopeBoundary: "No Agent submits or signs without authorised human action; red team cannot alter approved commercial limits.", missingAgentFinding: "No missing capability.",
  },
  {
    step: 20, period: "День 240–260", phase: "Evaluation + preferred bidder", title: "Authority evaluates BAFO and names preferred bidder", initiator: "ATU Evaluation Committee",
    narrative: "Consortium gives an authorised presentation and answers one bounded clarification on lender support, charging redundancy and joint liability. Agents prepare evidence but do not change price or negotiate outside limits. Authority scores technical 89/100 and issues preferred-bidder notice.",
    result: "Accepted clarification, technical 89/100, evaluated NPV $319.4m and preferred-bidder notice.", next: "E21 opens final concession negotiation and conditions-precedent checklist.",
    agentIds: [59, 60, 3, 4], responsibleActorId: "buyer", actorIds: ["buyer", "client", "consultant", "tenderlab"], kind: "external-event", trigger: "Authority evaluation + official clarification request", startDay: 240, endDay: 260, column: 15, lane: "buyer", critical: true,
    scopeBoundary: "Authority owns evaluation/preferred-bidder state; clarification cannot silently become price renegotiation.", missingAgentFinding: "No missing capability.",
  },
  {
    step: 21, period: "День 260–290", phase: "Concession negotiation", title: "Concession, shareholder terms and CPs are finalised", initiator: "ATU + consortium authorised negotiators",
    narrative: "Legal Review and Presentation/Negotiation prepare approved positions. Award-to-Contract reconciles BAFO, preferred-bidder conditions, final concession, securities, direct agreement, shareholder governance and conditions precedent. Authority and member signatories alone bind parties.",
    result: "Signed concession agreement, shareholder baseline, security package and versioned CP register.", next: "E22 waits for external equity/debt approvals, CP evidence and separate Authority NTP.",
    agentIds: [57, 60, 61, 41, 2, 4], responsibleActorId: "buyer", actorIds: ["buyer", "client", "external", "consultant", "tenderlab"], kind: "decision", trigger: "E20 preferred-bidder notice + negotiation mandate", startDay: 260, endDay: 290, column: 16, lane: "buyer", critical: true,
    scopeBoundary: "Agent 41 supports agreed governance and Agent 61 controls transition; neither creates signatures, SPV authority or lender commitments.", missingAgentFinding: "SPV/shareholder-governance ownership after consortium optimisation remains implicit.",
  },
  {
    step: 22, period: "День 290–330", phase: "Financial close + NTP", title: "External lenders close financing and Authority issues NTP", initiator: "Project Company, lenders and ATU",
    narrative: "Project Company closes $162m debt and approved equity after land/grid, insurance, security and legal CPs are evidenced. Award-to-Contract tracks the checklist; humans and external institutions approve every commitment. Authority independently confirms CP satisfaction and issues Notice to Proceed.",
    result: "Financial close, funded SPV, CP completion certificate, Authority NTP and downstream execution handoff.", next: "Case 8 closes; construction, bus delivery, payments and 15-year O&M continue in a separate execution Case.",
    agentIds: [61, 57, 2, 4, 64], responsibleActorId: "client", actorIds: ["client", "external", "buyer", "consultant", "tenderlab"], kind: "external-event", trigger: "E21 signed concession + external credit/equity approvals + satisfied CPs", startDay: 290, endDay: 330, column: 17, lane: "external", critical: true,
    scopeBoundary: "Financial close and NTP are external Actor states. Agents track evidence and handoffs but cannot underwrite debt, commit equity or declare CP satisfaction.", missingAgentFinding: "No canonical Agent owns project-finance underwriting/financial close; Agent 61 can track CPs but cannot replace this missing capability or external authority.",
  },
];

export const case8Processes: CaseProcess[] = [
  { id: "C8-P01", name: "Governance, evidence and Case-state control", ownerActorId: "tenderlab", agentIds: [1, 3, 4, 5], kind: "persistent", timing: "До и на всём протяжении Case", trigger: "Platform governance lifecycle", purpose: "Версионировать orchestration, evidence, decisions and entity relationships.", inputs: [{ name: "Canonical policy, taxonomy and Agent registry", sourceKind: "case-state", availability: "До E01", blocking: true }], outputArtifactIds: ["c8-artifact-p01-governance"], consumerRefs: ["case8-activity-02", "case8-activity-03", "case8-activity-22"], blocking: true, state: "completed" },
  { id: "C8-P02", name: "Sponsor identity, capability and readiness intelligence", ownerActorId: "tenderlab", agentIds: [6, 7, 8, 9, 10], kind: "persistent", timing: "Reusable baseline + E05 refresh", trigger: "New sponsor, credential, reference or financial-capacity evidence", purpose: "Maintain verified sponsor baseline separately from PQ and consortium aggregate qualification.", inputs: [{ name: "Sponsor evidence and authorised data room", sourceKind: "actor", sourceRef: "client", availability: "Before E03; refreshed E05", blocking: true }], outputArtifactIds: ["c8-artifact-p02-sponsor"], consumerRefs: ["case8-activity-03", "case8-activity-05", "case8-activity-06"], blocking: true, state: "completed" },
  { id: "C8-P03", name: "PPP market, award, Buyer and competitor intelligence", ownerActorId: "tenderlab", agentIds: [18, 19, 20], kind: "parallel", timing: "E02–E20", trigger: "Qualified PPP opportunity", purpose: "Provide comparable concessions, award terms, Buyer behaviour, competitor/consortium and payment benchmarks.", inputs: [{ name: "Public PPP pipeline, awards and Buyer records", sourceKind: "external", availability: "Before E16", blocking: false }], outputArtifactIds: ["c8-artifact-p03-market"], consumerRefs: ["case8-activity-03", "case8-activity-12", "case8-activity-16"], blocking: false, state: "completed" },
  { id: "C8-P04", name: "Data room, deadline and change control", ownerActorId: "tenderlab", agentIds: [13, 17, 21, 22, 29], kind: "case-scoped", timing: "E01–E22", trigger: "Official source, access, dialogue memorandum, addendum or deadline change", purpose: "Keep source corpus, permitted access, current RFP version and schedule authoritative.", inputs: [{ name: "Official procurement publications and data-room updates", sourceKind: "external", availability: "Continuous", blocking: true }], outputArtifactIds: ["c8-artifact-p04-procurement-state"], consumerRefs: ["case8-activity-04", "case8-activity-10", "case8-activity-15", "case8-activity-19"], blocking: true, state: "completed" },
  { id: "C8-P05", name: "Consortium consent, capability and governance control", ownerActorId: "client", agentIds: [11, 12, 33, 40, 41, 42, 44], kind: "case-scoped", timing: "E06–E22", trigger: "Candidate member, consent, evidence, workshare, equity or substitution change", purpose: "Maintain member identity, permission, capability coverage, dependencies and approved governance without inventing consent.", inputs: [{ name: "Member evidence, consents and governance records", sourceKind: "actor", sourceRef: "external", availability: "Before E08; refreshed through E22", blocking: true }], outputArtifactIds: ["c8-artifact-p05-consortium"], consumerRefs: ["case8-activity-07", "case8-activity-08", "case8-activity-16", "case8-activity-21"], blocking: true, state: "completed" },
  { id: "C8-P06", name: "Bankability, pricing and risk workstream", ownerActorId: "client", agentIds: [37, 38, 49, 50, 51, 57], kind: "parallel", timing: "E10–E22", trigger: "Current payment mechanism, cost, risk allocation, lender term or CP change", purpose: "Maintain approved financial assumptions and unresolved bankability conditions while preserving external lender authority.", inputs: [{ name: "Current RFP, technical cost basis, risk allocation and lender terms", sourceKind: "event", sourceRef: "case8-activity-12", availability: "Before E16 and refreshed E21", blocking: true }], outputArtifactIds: ["c8-artifact-p06-bankability"], consumerRefs: ["case8-activity-14", "case8-activity-16", "case8-activity-18", "case8-activity-22"], blocking: true, state: "completed" },
  { id: "C8-P07", name: "Dialogue and negotiation position register", ownerActorId: "consultant", agentIds: [30, 52, 60], kind: "case-scoped", timing: "E10–E21", trigger: "Approved issue, position, concession limit, dialogue minute or preferred-bidder negotiation", purpose: "Separate internal recommendations, authorised positions, Authority responses and final contract state.", inputs: [{ name: "Issue records and human-approved position limits", sourceKind: "event", sourceRef: "case8-activity-14", availability: "Before each dialogue/negotiation session", blocking: true }], outputArtifactIds: ["c8-artifact-p07-dialogue"], consumerRefs: ["case8-activity-14", "case8-activity-16", "case8-activity-20", "case8-activity-21"], blocking: true, state: "completed" },
  { id: "C8-P08", name: "Outcome and architecture learning", ownerActorId: "tenderlab", agentIds: [5, 19, 64], kind: "persistent", timing: "After shortlist, preferred bidder, signing and financial close", trigger: "Verified external procurement or financing outcome", purpose: "Link outcome, consortium, pricing, risk, contract and architecture findings for future cases.", inputs: [{ name: "Verified shortlist, award, contract and financial-close outcomes", sourceKind: "event", sourceRef: "case8-activity-22", availability: "At terminal state", blocking: false }], outputArtifactIds: ["c8-artifact-p08-learning"], consumerRefs: ["future-case", "canonical-agent-review"], blocking: false, state: "completed" },
];

export const case8RelationshipSpecs: Case8RelationshipSpec[] = [
  { from: 1, to: 2, label: "RFQ/PQ source package", blocking: true },
  { from: 2, to: 3, label: "Opportunity Review Pack", blocking: true },
  { from: 3, to: 4, type: "branches-to", label: "PQ intelligence mandate", blocking: true },
  { from: 3, to: 5, type: "branches-to", label: "Sponsor verification mandate", blocking: true },
  { from: 4, to: 6, type: "joins-at", label: "PQ model + consortium criteria", blocking: true, joinPolicy: "ALL" },
  { from: 5, to: 6, type: "joins-at", label: "Verified sponsor + gaps", blocking: true, joinPolicy: "ALL" },
  { from: 6, to: 7, label: "Recommended consortium structure", blocking: true },
  { from: 7, to: 8, label: "Consents + verified member evidence", blocking: true },
  { from: 8, to: 9, type: "waits-for", label: "Authority shortlist + RFP", blocking: true },
  { from: 9, to: 10, label: "Authoritative RFP + dialogue access", blocking: true },
  { from: 10, to: 11, type: "branches-to", label: "Technical/O&M workstream", blocking: true },
  { from: 10, to: 12, type: "branches-to", label: "Finance/bankability workstream", blocking: true },
  { from: 10, to: 13, type: "branches-to", label: "Safeguards/permits workstream", blocking: true },
  { from: 11, to: 14, type: "joins-at", label: "Technical dialogue positions", blocking: true, joinPolicy: "ALL" },
  { from: 12, to: 14, type: "joins-at", label: "Bankability dialogue positions", blocking: true, joinPolicy: "ALL" },
  { from: 13, to: 14, type: "joins-at", label: "Safeguards/permit positions", blocking: true, joinPolicy: "ALL" },
  { from: 14, to: 15, type: "waits-for", label: "Official Revised RFP 02", blocking: true },
  { from: 15, to: 16, label: "Current obligations + impact register", blocking: true },
  { from: 16, to: 17, type: "branches-to", label: "Technical BAFO mandate", blocking: true },
  { from: 16, to: 18, type: "branches-to", label: "Financial BAFO mandate", blocking: true },
  { from: 17, to: 19, type: "joins-at", label: "Technical BAFO", blocking: true, joinPolicy: "ALL" },
  { from: 18, to: 19, type: "joins-at", label: "Financial BAFO", blocking: true, joinPolicy: "ALL" },
  { from: 19, to: 20, type: "waits-for", label: "Evaluation + clarification", blocking: true },
  { from: 20, to: 21, label: "Preferred-bidder notice", blocking: true },
  { from: 21, to: 22, type: "waits-for", label: "External CP and financing approvals", blocking: true },
];
