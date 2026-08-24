import type { CaseProcess, ProcessActivityKind, ProcessRelationship } from "../process-model.ts";

export type Case7EventBlueprint = {
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

export type Case7RelationshipSpec = {
  from: number;
  to: number;
  type?: ProcessRelationship["type"];
  label: string;
  condition?: string;
  blocking?: boolean;
  joinPolicy?: ProcessRelationship["joinPolicy"];
};

export const case7EventBlueprints: Case7EventBlueprint[] = [
  {
    step: 1, period: "День 0", phase: "Default signal", title: "Независимая лаборатория фиксирует material test failure", initiator: "Accredited Materials Laboratory",
    narrative: "Pre-shipment samples incumbent supplier не проходят обязательные fire-retardancy и waterproof tests. Buyer ещё не расторгает контракт: report, chain of custody, affected tranche, performance security и неприёмка фиксируются как раздельные facts.",
    result: "Source-locked lab failure dossier, sample custody, contract baseline and non-acceptance record.", next: "E02 открывает governed recovery Case и отделяет evidence hold от remedy decision.",
    agentIds: [21, 3, 4, 63], responsibleActorId: "external", actorIds: ["external", "buyer", "tenderlab"], kind: "external-event", trigger: "Signed accredited laboratory report", startDay: 0, endDay: 0, column: 0, lane: "external", critical: true,
    scopeBoundary: "Laboratory establishes test result; Buyer owns acceptance and contract action. Agents preserve evidence, not a legal conclusion.", missingAgentFinding: "Canonical registry has no explicit goods inspection/acceptance Agent; external lab + Agents 3/62/63 currently compose the control.",
  },
  {
    step: 2, period: "День 0", phase: "Recovery control", title: "Buyer открывает recovery Case и устанавливает authority hold", initiator: "DSWD Undersecretary / Procurement Head",
    narrative: "TenderLab Orchestrator freezes current evidence, records authorised decision owners and prevents automatic supplier replacement. Integrity screening checks conflicts around incumbent, laboratory and potential emergency route; no Agent may infer termination or award.",
    result: "Governed recovery charter, authority matrix, evidence hold and 48-hour cure clock.", next: "E03 remedy analysis and E04 continuity/requirement branch run in parallel.",
    agentIds: [1, 2, 3, 4, 38], responsibleActorId: "buyer", actorIds: ["buyer", "consultant", "tenderlab"], kind: "decision", trigger: "E01 material failure + Buyer escalation", startDay: 0, endDay: 0, column: 1, lane: "buyer", critical: true,
    scopeBoundary: "Opening a Case authorises analysis only; termination, emergency procedure and award remain Buyer decisions.", missingAgentFinding: "Orchestration and human authority are covered; procurement-recovery policy is still human/legal input.",
  },
  {
    step: 3, period: "День 0–2", phase: "Contract remedy", title: "Legal и contract teams анализируют cure, termination и security", initiator: "DSWD Legal Service",
    narrative: "Legal review maps failure against warranties, cure period, partial termination, liquidated damages and security-call clauses. Contract Administration reconciles accepted quantity (zero), undelivered tranche and guarantee state; authorised counsel prepares options without sending a termination notice.",
    result: "Remedy options memo with evidentiary threshold, claim value $0,78m and required human actions.", next: "E05 receives remedy memo together with continuity/RFQ package from E04.",
    agentIds: [57, 63, 38, 3, 4], responsibleActorId: "buyer", actorIds: ["buyer", "consultant", "tenderlab"], trigger: "E02 recovery charter + current contract", startDay: 0, endDay: 2, column: 2, lane: "consultant", critical: true,
    scopeBoundary: "Agent 57 reviews clauses and Agent 63 records contract state; licensed Buyer counsel owns legal opinion and notices.", missingAgentFinding: "No Agent explicitly owns default remedy, claims and performance-security recovery after award.",
  },
  {
    step: 4, period: "День 0–2", phase: "Continuity requirement", title: "Emergency need превращается в controlled replacement package", initiator: "DSWD Disaster Response Operations",
    narrative: "Operations confirms 12 000 kits, three hubs and 14-day delivery while the technical committee reuses approved standard specification. Requirements, evaluation, forms and fidelity checks separate non-negotiable safety tests from logistics preferences. All authoritative files are machine-readable; OCR remains standby.",
    result: "Replacement requirement pack: 86 requirements, pass/fail safety gate, 70:30 evaluated model and RFQ forms.", next: "E05 decides whether the limited procedure is justified; E08 later consumes the approved pack.",
    agentIds: [21, 23, 24, 26, 27, 28, 3, 4], standbyAgentIds: [22], responsibleActorId: "buyer", actorIds: ["buyer", "consultant", "tenderlab"], trigger: "E02 continuity mandate + approved shelter standard", startDay: 0, endDay: 2, column: 2, lane: "buyer", critical: true,
    scopeBoundary: "Agents structure existing Buyer requirements; they do not invent the emergency need, specification or evaluation policy.", missingAgentFinding: "Procurement planning/procedure justification remains a human Buyer capability outside the current 64 Agents.",
  },
  {
    step: 5, period: "День 2", phase: "Recovery gate", title: "Buyer approves partial termination and accelerated competition", initiator: "DSWD Bids and Awards Committee",
    narrative: "Committee finds the failed tranche uncured, authorises partial termination/security claim and approves a five-invitee limited international RFQ under the emergency exception. Classification records Goods/emergency replacement; the committee documents why direct award and negotiation are prohibited.",
    result: "Signed recovery decision, procedure justification, ceiling $6,80m and no-negotiation rule.", next: "E06 builds a market-backed supplier shortlist; E13 later executes the old-contract notice.",
    agentIds: [2, 1, 15, 57, 63, 38, 4], responsibleActorId: "buyer", actorIds: ["buyer", "consultant", "tenderlab"], kind: "decision", trigger: "ALL: E03 remedy memo + E04 continuity package", startDay: 2, endDay: 2, column: 3, lane: "buyer", critical: true,
    scopeBoundary: "Only the Buyer committee chooses the procedure and remedy. Classification describes the authorised route; it does not justify it.", missingAgentFinding: "Buyer-side Procurement Planning & Procedure Justification is a potential missing capability, not a task to force onto Agent 15.",
  },
  {
    step: 6, period: "День 2–3", phase: "Supplier market", title: "Market evidence создаёт shortlist из пяти replacement suppliers", initiator: "TenderLab Supplier Intelligence workflow",
    narrative: "Supplier Discovery applies product, capacity, 14-day lead-time and regional logistics criteria. Supplier Intelligence adds historical performance without converting rumours into exclusions. Seven candidates become five invitees; incumbent and related entities are excluded by the approved decision.",
    result: "Five-supplier shortlist with sourcing criteria, market evidence and exclusion reasons.", next: "E07 performs entity-level due diligence and qualification before invitations.",
    agentIds: [43, 11, 3], responsibleActorId: "tenderlab", actorIds: ["tenderlab", "consultant", "buyer"], trigger: "E05 approved limited procedure + P03 market baseline", startDay: 2, endDay: 3, column: 4, lane: "tenderlab", critical: true,
    scopeBoundary: "Discovery ranks candidates; it does not approve suppliers, change the invitee count or select an awardee.", missingAgentFinding: "Supplier Discovery and Supplier Intelligence are sufficient if Buyer-side permitted-use and exclusion provenance stay explicit.",
  },
  {
    step: 7, period: "День 3", phase: "Due diligence", title: "Invitees проходят verification, qualification и integrity screen", initiator: "DSWD Procurement Evaluation Secretariat",
    narrative: "Supplier Verification checks identity, capacity, certificates, sanctions, references and beneficial ownership. Eligibility applies RFQ thresholds; one candidate is conditionally cleared after updated fire-test accreditation, while all five remain within the authorised roster by issue time.",
    result: "Five due-diligence dossiers, qualification flags and controlled risk register.", next: "E08 issues one identical RFQ package to the approved roster.",
    agentIds: [44, 25, 38, 3, 4], responsibleActorId: "buyer", actorIds: ["buyer", "consultant", "tenderlab", "external"], trigger: "E06 shortlist + official registries", startDay: 3, endDay: 3, column: 5, lane: "consultant", critical: true,
    scopeBoundary: "Agents recommend verified/conditional/reject status; Buyer approves the invitee roster and any risk acceptance.", missingAgentFinding: "Agent 44 covers external supplier due diligence; Company Verification must not be duplicated here.",
  },
  {
    step: 8, period: "День 3", phase: "RFQ issue", title: "Controlled RFQ выпускается пяти suppliers", initiator: "DSWD Procurement Service",
    narrative: "RFQ Orchestrator packages the approved requirements, forms, 72-hour deadline, evaluation rules and communication channel. Source Acquisition captures the issued procurement publication; Document/Structure controls verify identical recipient packages and Deadline Agent starts the quotation clock.",
    result: "Versioned RFQ package, five-recipient issue log, deadline and immutable source record.", next: "E09 manages supplier questions and official Corrigendum 01 without private guidance.",
    agentIds: [45, 13, 21, 23, 27, 17, 4], responsibleActorId: "buyer", actorIds: ["buyer", "external", "tenderlab"], trigger: "ALL: E04 requirement pack + E07 approved roster", startDay: 3, endDay: 3, column: 6, lane: "buyer", critical: true,
    scopeBoundary: "Agent 45 controls issue/response workflow; Buyer authorises the RFQ. Supplier-specific bid content is outside TenderLab.", missingAgentFinding: "RFQ Orchestrator can support Buyer-side sourcing, but its canonical platform-side permission should be reviewed.",
  },
  {
    step: 9, period: "День 3–4", phase: "Q&A + corrigendum", title: "Buyer публикует единый ответ и Corrigendum 01", initiator: "DSWD Technical Committee",
    narrative: "Three suppliers ask about the ASTM-equivalent fire test. RFQ Orchestrator consolidates questions; authorised technical committee answers all recipients simultaneously. Amendment Agent versions Corrigendum 01, clarifies test method and preserves the deadline. Agent 30 is intentionally absent because it writes bidder questions, not Buyer answers.",
    result: "Equal-information Q&A log, Corrigendum 01 and unchanged 72-hour deadline.", next: "E10 receives quotations only against the current RFQ version.",
    agentIds: [45, 29, 13, 17, 4], responsibleActorId: "buyer", actorIds: ["buyer", "external", "tenderlab"], trigger: "Supplier questions requiring an official common answer", startDay: 3, endDay: 4, column: 7, lane: "buyer", critical: true,
    scopeBoundary: "Human Buyer authors the answer; Agents control fairness, version and dissemination. Agent 30 cannot be repurposed as Buyer authority.", missingAgentFinding: "A Buyer-side Bidder Communication/Addendum capability may be missing; Agents 45/29 currently compose it.",
  },
  {
    step: 10, period: "День 6", phase: "Quotation intake", title: "Four responsive quotations становятся comparable", initiator: "DSWD Procurement Service",
    narrative: "Five invitations yield four timely offers. RFQ Orchestrator freezes originals and response status; Quotation Normalization aligns units, currency, Incoterms, taxes, lead time and exclusions. Landed-Price adds freight, insurance and Philippine import costs without selecting a winner.",
    result: "Four-offer comparison and landed-cost scenarios from $6,21m to $6,76m; one non-response recorded.", next: "E11 evaluates technical/commercial compliance, qualification and integrity.",
    agentIds: [45, 46, 50, 3, 4], responsibleActorId: "buyer", actorIds: ["buyer", "consultant", "tenderlab", "external"], trigger: "RFQ deadline + four received offers", startDay: 6, endDay: 6, column: 8, lane: "tenderlab", critical: true,
    scopeBoundary: "Normalization and landed cost preserve supplier assumptions; evaluation committee owns responsiveness and award ranking.", missingAgentFinding: "Current sourcing Agents provide commercial comparability without becoming a Buyer evaluation engine.",
  },
  {
    step: 11, period: "День 6–7", phase: "Evaluation", title: "Committee evaluates offers through a traceable decision-support pack", initiator: "DSWD Bids and Awards Committee",
    narrative: "Eligibility and Evaluation Criteria apply the approved model. Compliance Matrix links each offer to 86 requirements; Technical and Commercial Compliance record pass/deviation/unknown; Supplier Verification and Integrity refresh bidder risks. These Agents produce evidence, while named evaluators assign and sign official scores.",
    result: "Signed evaluation worksheet: 3 responsive/qualified offers; EcoShelter Asia ranks first at $6,42m evaluated cost.", next: "E12 asks the authorised committee to approve or reject the recommendation.",
    agentIds: [25, 26, 47, 48, 49, 44, 38, 3, 4], responsibleActorId: "buyer", actorIds: ["buyer", "consultant", "tenderlab"], trigger: "E10 normalized offer set + approved evaluation model", startDay: 6, endDay: 7, column: 9, lane: "buyer", critical: true,
    scopeBoundary: "Agents 47–49 provide traceability/domain verdicts; only human evaluators score and recommend award. Their Buyer-side use needs explicit canonical permission.", missingAgentFinding: "No canonical Agent clearly owns Buyer-side Bid Evaluation & Award Recommendation; current Agents cover components, not evaluation authority/workflow.",
  },
  {
    step: 12, period: "День 7", phase: "Award gate", title: "Buyer approves replacement award recommendation", initiator: "DSWD Bids and Awards Committee",
    narrative: "Committee reviews evaluation, integrity, budget, continuity risk and no-negotiation rule. Human Approval records the authorised recommendation for EcoShelter Asia at $6,42m, subject to security and contract conditions. No price negotiation or bidder proposal editing occurs.",
    result: "Approved award recommendation, conditions precedent and authority record.", next: "E13 old-contract remedy and E14 replacement award proceed as separate parallel authority tracks.",
    agentIds: [2, 1, 38, 57, 4], responsibleActorId: "buyer", actorIds: ["buyer", "consultant", "tenderlab"], kind: "decision", trigger: "E11 signed evaluation worksheet", startDay: 7, endDay: 7, column: 10, lane: "buyer", critical: true,
    scopeBoundary: "Recommendation approval is a Buyer act; Agents cannot award, negotiate or waive evaluation defects.", missingAgentFinding: "The missing Buyer evaluation workflow remains visible but does not block a human-controlled DEMO route.",
  },
  {
    step: 13, period: "День 7–9", phase: "Incumbent remedy", title: "Buyer issues partial termination and security claim", initiator: "DSWD Authorised Contracting Officer",
    narrative: "On licensed counsel advice, Buyer terminates the undelivered tranche, rejects the failed goods and issues a $0,78m performance-security claim. Contract Administration versions notices, deadlines and claim status; this branch remains independent of the replacement award.",
    result: "Effective partial-termination notice, rejected-goods disposition and registered security claim.", next: "E18 later reconciles claim status; replacement delivery does not wait for cash recovery.",
    agentIds: [57, 63, 2, 3, 4], responsibleActorId: "buyer", actorIds: ["buyer", "consultant", "external", "tenderlab"], kind: "decision", trigger: "E05 remedy authority + E12 confirmed continuity route", startDay: 7, endDay: 9, column: 11, lane: "buyer", critical: false,
    scopeBoundary: "Licensed counsel and contracting officer own termination/claim. Agents prepare, version and monitor the authorised actions.", missingAgentFinding: "Contract Remedy & Claims remains an explicit architecture gap between Agents 57 and 63.",
  },
  {
    step: 14, period: "День 7–9", phase: "Replacement contract", title: "Replacement award переходит в effective contract", initiator: "DSWD Authorised Contracting Officer",
    narrative: "Award-to-Contract reconciles the approved recommendation, supplier offer, delivery schedule, securities and testing conditions. Legal Review checks warranties and rejection rights; Contract Administration opens the new register. Authorised Buyer and supplier officers sign.",
    result: "Effective $6,42m replacement contract, securities, 13-day delivery plan and acceptance checklist.", next: "E15 starts mobilisation; original security claim continues separately in E13/P02.",
    agentIds: [61, 57, 63, 2, 4], responsibleActorId: "buyer", actorIds: ["buyer", "external", "consultant", "tenderlab"], kind: "decision", trigger: "E12 award approval + conditions precedent", startDay: 7, endDay: 9, column: 11, lane: "buyer", critical: true,
    scopeBoundary: "Agent 61 manages transition records; authorised officers sign and create legal obligations.", missingAgentFinding: "Agent 61 is written from participant perspective; Buyer-side applicability needs explicit scope rather than implicit reuse.",
  },
  {
    step: 15, period: "День 9–19", phase: "Mobilisation + delivery", title: "Supplier производит, консолидирует и доставляет shelter kits", initiator: "EcoShelter Asia Ltd.",
    narrative: "Execution Agent tracks production lots, factory QC, three staging hubs, vessel/airfreight milestones and deviations against the 13-day plan. Deadline control alerts Buyer; Supplier Verification refreshes any critical certificate without replacing operational Actor work.",
    result: "12 000 kits delivered to three hubs on day 13 with complete lot and logistics evidence.", next: "E16 independent inspection tests sampled units before Buyer acceptance.",
    agentIds: [62, 17, 44, 4], responsibleActorId: "external", actorIds: ["external", "buyer", "tenderlab"], trigger: "E14 effective contract + notice to proceed", startDay: 9, endDay: 19, column: 12, lane: "external", critical: true,
    scopeBoundary: "Supplier executes physical work; Agent 62 monitors evidence/state and cannot direct production or accept goods.", missingAgentFinding: "Agent 62 supports emergency goods delivery, but inspection/acceptance remains outside its explicit boundary.",
  },
  {
    step: 16, period: "День 18–20", phase: "Independent inspection", title: "Laboratory и warehouse inspectors подтверждают compliance", initiator: "Independent Inspection Agency",
    narrative: "Inspectors select samples under the contract plan, repeat fire/water tests, inspect packaging and reconcile delivered lots. Evidence Agent binds reports to samples; Execution records status. All sampled units pass, but Buyer acceptance remains a separate decision.",
    result: "Independent inspection report: 100% sampled units pass; lot-level traceability complete.", next: "E17 Buyer decides acceptance using delivery and inspection evidence.",
    agentIds: [62, 3, 4], responsibleActorId: "external", actorIds: ["external", "buyer", "tenderlab"], kind: "external-event", trigger: "E15 delivered lots ready for sampling", startDay: 18, endDay: 20, column: 13, lane: "external", critical: true,
    scopeBoundary: "External inspectors establish test facts; Buyer owns contractual acceptance. Agent 48 is not reused post-award outside its pre-bid scope.", missingAgentFinding: "Goods Inspection & Acceptance is a potential missing Agent/capability; external Actor plus Agents 3/62/63 currently bridge it.",
  },
  {
    step: 17, period: "День 20", phase: "Buyer acceptance", title: "Buyer принимает compliant replacement delivery", initiator: "DSWD Inspection and Acceptance Committee",
    narrative: "Committee reconciles quantity, timing, inspection and documentation, signs acceptance and releases the kits to disaster-response operations. Contract Administration creates the payment milestone; no Agent signs acceptance or certifies public money.",
    result: "Buyer acceptance certificate for 12 000 kits and authorised operational release.", next: "E18 processes supplier payment and continues the separate incumbent claim.",
    agentIds: [62, 63, 3, 2, 4], responsibleActorId: "buyer", actorIds: ["buyer", "external", "tenderlab"], kind: "decision", trigger: "ALL: E15 delivery evidence + E16 inspection Pass", startDay: 20, endDay: 20, column: 14, lane: "buyer", critical: true,
    scopeBoundary: "Buyer committee alone accepts goods; Agents assemble evidence and contract state.", missingAgentFinding: "Acceptance authority is correctly external, but acceptance workflow ownership is not explicit in the Agent registry.",
  },
  {
    step: 18, period: "День 20–35", phase: "Payment + claim", title: "Replacement payment и incumbent claim остаются раздельными", initiator: "DSWD Finance and Legal Services",
    narrative: "Contract Administration validates invoice against accepted quantity and records Buyer payment. Separately, Legal tracks the $0,78m performance-security claim; claim cash is not netted against the replacement supplier. Human authorities approve payment and any settlement.",
    result: "Replacement invoice paid; security claim remains registered with next legal deadline and no false recovery assumption.", next: "E19 records verified outcome, supplier performance and unresolved claim state.",
    agentIds: [63, 57, 2, 3, 4], responsibleActorId: "buyer", actorIds: ["buyer", "consultant", "external", "tenderlab"], kind: "decision", trigger: "E17 acceptance certificate + E13 claim register", startDay: 20, endDay: 35, column: 15, lane: "buyer", critical: true,
    scopeBoundary: "Finance pays and counsel manages claim; Agent 63 records distinct contractual/financial states without offsetting them automatically.", missingAgentFinding: "Claims/recovery lifecycle still lacks one canonical owner; not all claims justify a new Agent until more Cases confirm recurrence.",
  },
  {
    step: 19, period: "День 35", phase: "Closure + learning", title: "Case закрывается verified recovery record", initiator: "TenderLab / DSWD Case Owner",
    narrative: "Outcome Learning compares initial failure, recovery time, supplier due diligence, evaluation, price, delivery and acceptance against predictions. Knowledge Graph links old/new contracts and suppliers; Supplier Intelligence receives verified performance. The open security claim is preserved as open state, not declared recovered.",
    result: "Closed Case 7 record, supplier performance update, recovery KPI and four architecture findings.", next: "Operations uses accepted kits; Buyer legal team continues the claim outside Case 7.",
    agentIds: [64, 5, 19, 11, 4], responsibleActorId: "tenderlab", actorIds: ["tenderlab", "buyer", "consultant"], trigger: "E18 payment state + verified recovery evidence", startDay: 35, endDay: 35, column: 16, lane: "tenderlab", critical: true,
    scopeBoundary: "Learning stages evidence-backed updates; it does not close the open claim or alter canonical Agents automatically.", missingAgentFinding: "Case 7 evidence supports review of four Buyer/recovery capabilities without adding Agents during the simulation.",
  },
];

export const case7Processes: CaseProcess[] = [
  { id: "C7-P01", name: "Governance, authority and evidence control", ownerActorId: "tenderlab", agentIds: [1, 2, 3, 4, 5], kind: "persistent", timing: "До E01 и на всём протяжении Case", trigger: "New evidence, decision or state transition", purpose: "Сохранять authority, provenance, version and orchestration boundaries.", inputs: [{ name: "Canonical policy, Actor authority and source evidence", sourceKind: "case-state", availability: "Continuous", blocking: true }], outputArtifactIds: ["c7-artifact-p01-governance"], consumerRefs: ["case7-activity-02", "case7-activity-05", "case7-activity-12", "case7-activity-17"], blocking: true, state: "completed" },
  { id: "C7-P02", name: "Original contract remedy and security claim", ownerActorId: "buyer", agentIds: [3, 4, 38, 57, 63], kind: "case-scoped", timing: "E01–E19; cash recovery may continue afterwards", trigger: "Material default evidence", purpose: "Keep cure, termination, rejection, security and claim state separate from replacement procurement.", inputs: [{ name: "Original contract, lab failure and authorised notices", sourceKind: "event", sourceRef: "case7-activity-01", availability: "From E01", blocking: true }], outputArtifactIds: ["c7-artifact-p02-remedy"], consumerRefs: ["case7-activity-05", "case7-activity-13", "case7-activity-18"], blocking: true, state: "waiting" },
  { id: "C7-P03", name: "Emergency supplier and market intelligence", ownerActorId: "tenderlab", agentIds: [11, 18, 19, 43], kind: "parallel", timing: "E02–E12; reusable refresh after E19", trigger: "Authorised emergency sourcing need", purpose: "Provide capacity, price, award and supplier evidence without preselecting an awardee.", inputs: [{ name: "Public market, award and supplier-performance records", sourceKind: "external", availability: "Before E06", blocking: false }], outputArtifactIds: ["c7-artifact-p03-market"], consumerRefs: ["case7-activity-06", "case7-activity-07", "case7-activity-11"], blocking: false, state: "completed" },
  { id: "C7-P04", name: "RFQ communication, deadline and change control", ownerActorId: "buyer", agentIds: [4, 13, 17, 29, 45], kind: "case-scoped", timing: "E08–E12", trigger: "Issued RFQ, supplier question or official corrigendum", purpose: "Preserve equal information, current RFQ version and deadline across all invitees.", inputs: [{ name: "Issued RFQ and authorised Buyer communications", sourceKind: "event", sourceRef: "case7-activity-08", availability: "From E08", blocking: true }], outputArtifactIds: ["c7-artifact-p04-rfq-state"], consumerRefs: ["case7-activity-09", "case7-activity-10", "case7-activity-11"], blocking: true, state: "completed" },
  { id: "C7-P05", name: "Supplier due diligence and offer comparison", ownerActorId: "buyer", agentIds: [25, 26, 38, 44, 46, 47, 48, 49, 50], kind: "case-scoped", timing: "E07–E12", trigger: "Approved roster and received quotations", purpose: "Link eligibility, compliance, integrity and comparable cost to human evaluation evidence.", inputs: [{ name: "Supplier dossiers, RFQ requirements and frozen offers", sourceKind: "event", sourceRef: "case7-activity-10", availability: "Before E11", blocking: true }], outputArtifactIds: ["c7-artifact-p05-evaluation"], consumerRefs: ["case7-activity-11", "case7-activity-12"], blocking: true, state: "completed" },
  { id: "C7-P06", name: "Replacement delivery, inspection and acceptance control", ownerActorId: "buyer", agentIds: [3, 4, 17, 44, 62, 63], kind: "case-scoped", timing: "E14–E18", trigger: "Effective replacement contract", purpose: "Connect delivery state, independent tests, Buyer acceptance and invoice evidence without collapsing Actor authority.", inputs: [{ name: "Effective contract, delivery evidence and inspection reports", sourceKind: "event", sourceRef: "case7-activity-14", availability: "From E14", blocking: true }], outputArtifactIds: ["c7-artifact-p06-delivery"], consumerRefs: ["case7-activity-15", "case7-activity-16", "case7-activity-17", "case7-activity-18"], blocking: true, state: "completed" },
  { id: "C7-P07", name: "Recovery outcome and architecture learning", ownerActorId: "tenderlab", agentIds: [4, 5, 11, 19, 64], kind: "persistent", timing: "After E17–E19", trigger: "Verified acceptance, payment, claim and supplier-performance states", purpose: "Turn the recovery outcome into reusable supplier/award knowledge and explicit architecture findings.", inputs: [{ name: "Verified terminal and open-state evidence", sourceKind: "event", sourceRef: "case7-activity-19", availability: "At Case closure", blocking: false }], outputArtifactIds: ["c7-artifact-p07-learning"], consumerRefs: ["future-case", "canonical-agent-review"], blocking: false, state: "completed" },
];

export const case7RelationshipSpecs: Case7RelationshipSpec[] = [
  { from: 1, to: 2, label: "Material failure dossier", blocking: true },
  { from: 2, to: 3, type: "branches-to", label: "Remedy analysis mandate", blocking: true },
  { from: 2, to: 4, type: "branches-to", label: "Continuity requirement mandate", blocking: true },
  { from: 3, to: 5, type: "joins-at", label: "Remedy options", blocking: true, joinPolicy: "ALL" },
  { from: 4, to: 5, type: "joins-at", label: "Replacement need + RFQ pack", blocking: true, joinPolicy: "ALL" },
  { from: 5, to: 6, label: "Authorised limited procedure", blocking: true },
  { from: 6, to: 7, label: "Five-supplier shortlist", blocking: true },
  { from: 4, to: 8, type: "joins-at", label: "Approved requirement pack", blocking: true, joinPolicy: "ALL" },
  { from: 7, to: 8, type: "joins-at", label: "Approved invitee roster", blocking: true, joinPolicy: "ALL" },
  { from: 8, to: 9, label: "Issued RFQ", blocking: true },
  { from: 9, to: 10, type: "waits-for", label: "Current RFQ + quotation deadline", blocking: true },
  { from: 10, to: 11, label: "Normalized offers", blocking: true },
  { from: 11, to: 12, label: "Signed evaluation worksheet", blocking: true },
  { from: 12, to: 13, type: "branches-to", label: "Old-contract remedy authority", blocking: false },
  { from: 12, to: 14, type: "branches-to", label: "Replacement award authority", blocking: true },
  { from: 14, to: 15, label: "Effective replacement contract", blocking: true },
  { from: 15, to: 16, label: "Delivered lots", blocking: true },
  { from: 15, to: 17, type: "joins-at", label: "Quantity and delivery evidence", blocking: true, joinPolicy: "ALL" },
  { from: 16, to: 17, type: "joins-at", label: "Independent inspection Pass", blocking: true, joinPolicy: "ALL" },
  { from: 13, to: 18, type: "joins-at", label: "Open security claim state", blocking: false, joinPolicy: "ALL" },
  { from: 17, to: 18, type: "joins-at", label: "Buyer acceptance certificate", blocking: true, joinPolicy: "ALL" },
  { from: 18, to: 19, label: "Payment + open claim state", blocking: true },
];

if (case7EventBlueprints.length !== 19) throw new Error("Case 7 requires 19 Events.");
if (new Set(case7EventBlueprints.map((event) => event.step)).size !== 19) throw new Error("Case 7 Event steps must be unique.");
