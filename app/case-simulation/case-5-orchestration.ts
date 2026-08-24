import type { CaseProcess, ProcessActivityKind, ProcessRelationship } from "../process-model.ts";

export type Case5EventBlueprint = {
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

export type Case5RelationshipSpec = {
  from: number;
  to: number;
  type?: ProcessRelationship["type"];
  label: string;
  condition?: string;
  blocking?: boolean;
  joinPolicy?: ProcessRelationship["joinPolicy"];
};

export const case5EventBlueprints: Case5EventBlueprint[] = [
  {
    step: 1, period: "День 0", phase: "RFP publication", title: "Buyer публикует performance-based logistics RFP", initiator: "Kenya Medical Supplies Authority",
    narrative: "Официальный RFP устанавливает один lot, ceiling $12,40 млн, 36-месячный framework, семь hubs, 18 counties, 72-hour emergency SLA и отсутствие гарантированного call-off volume. Вакцины принадлежат Buyer: bidder продаёт service, а не goods.",
    result: "Source-locked RFP publication, attachments, deadline и provenance.", next: "E02 технически типизирует source item и строит opportunity record.",
    agentIds: [13, 4], responsibleActorId: "buyer", actorIds: ["buyer", "tenderlab"], kind: "external-event", trigger: "Official international RFP publication", startDay: 0, endDay: 0, column: 0, lane: "buyer", critical: true,
    scopeBoundary: "Buyer публикует procurement state; Source Acquisition не определяет business relevance.", missingAgentFinding: "Новый Agent не нужен: source typing и business classification разделены между Agents 13 и 15.",
  },
  {
    step: 2, period: "День 0–1", phase: "Discovery", title: "RFP классифицируется как non-consulting services framework", initiator: "TenderLab / Backend",
    narrative: "Classification фиксирует non-consulting services, performance-based framework и best-value evaluation. Filtering применяет geography/capability policy, а Discovery ранжирует opportunity против verified FrostLink profile. Preliminary relevance 93% не означает qualification или гарантированный доход.",
    result: "Opportunity Review Pack 93% с classification, filter reasons и evidence caveats.", next: "E03 передаёт opportunity руководству FrostLink для отдельного pursuit gate.",
    agentIds: [15, 16, 14], responsibleActorId: "tenderlab", actorIds: ["tenderlab"], trigger: "E01 + P01 policy + P02 company baseline", startDay: 0, endDay: 1, column: 1, lane: "tenderlab", critical: true,
    scopeBoundary: "Relevance, qualification и commercial attractiveness остаются разными outputs.", missingAgentFinding: "Текущие canonical boundaries достаточны.",
  },
  {
    step: 3, period: "День 1–2", phase: "Pursuit gate", title: "FrostLink разрешает tender-specific assessment", initiator: "FrostLink Managing Director",
    narrative: "Руководство получает preliminary Match, Buyer history и framework downside warning. Оно утверждает assessment budget и data-room access, но ещё не утверждает Bid, carrier appointments или rate card.",
    result: "Approved assessment mandate, owner, evidence permissions и stop conditions.", next: "E04 строит current RFP/SLA model; E05 обновляет company evidence.",
    agentIds: [31, 35, 2, 1], responsibleActorId: "client", actorIds: ["client", "consultant", "tenderlab"], kind: "decision", trigger: "E02 Opportunity Review Pack", startDay: 1, endDay: 2, column: 2, lane: "client", critical: true,
    scopeBoundary: "Assessment mandate не является Bid approval и не разрешает contact с carriers без отдельного owner decision.", missingAgentFinding: "Human Approval и Orchestrator покрывают authority transition.",
  },
  {
    step: 4, period: "День 2–7", phase: "RFP intelligence", title: "RFP превращается в source-locked SLA и evaluation model", initiator: "TenderLab document workflow",
    narrative: "Document intake, OCR, structure, requirement parsing, evaluation, forms и fidelity выделяют 148 requirements, 34 SLA metrics, rate-card template, data-retention clauses и 60:40 model. Addendum 02 сокращает emergency threshold с 96 до 72 часов и меняет price schedule.",
    result: "Current RFP corpus, 148 requirements, SLA scorecard, form register и Addendum 02 impact.", next: "E05/E06 используют только current version; P04 поддерживает deadline/change state.",
    agentIds: [21, 22, 23, 24, 26, 27, 28, 29, 30, 3, 4], responsibleActorId: "tenderlab", actorIds: ["tenderlab", "consultant"], trigger: "E01 authoritative RFP", startDay: 2, endDay: 7, column: 3, lane: "tenderlab", critical: true,
    scopeBoundary: "OCR применяется к scan-only permits; business interpretation остаётся у requirements/evaluation Agents и human SME.", missingAgentFinding: "Telemetry/data-retention expertise пока покрывается Technical/Legal review + human SME; отдельный Agent не доказан.",
  },
  {
    step: 5, period: "День 2–8", phase: "Company baseline", title: "Обновляются bidder readiness и qualification evidence", initiator: "FrostLink bid lead",
    narrative: "Legal identity, Kenyan branch, GDP certification, seven-hub capacity, reference contracts и operational controls проверяются с provenance. Readiness 82/100; qualification проходит условно при подтверждении шести local carriers и surge capacity.",
    result: "Verified bidder dossier, Readiness 82/100 и conditional qualification Pass.", next: "E06 строит route/feasibility; E07 закрывает network gap.",
    agentIds: [6, 7, 8, 9, 10, 25, 31, 34], responsibleActorId: "client", actorIds: ["client", "tenderlab", "consultant"], trigger: "E03 data-room mandate + E04 RFP model", startDay: 2, endDay: 8, column: 3, lane: "client", critical: true,
    scopeBoundary: "Readiness измеряет общую готовность; qualification — tender gate; Match — company×tender fit.", missingAgentFinding: "Текущие Agents различимы; SLA-specific evidence остаётся частью company/capability verification.",
  },
  {
    step: 6, period: "День 7–10", phase: "Route + feasibility", title: "Определяется prime route и проверяется downside feasibility", initiator: "TenderLab assessment workflow",
    narrative: "FrostLink остаётся single prime с Kenyan branch и subcontracted carrier network. Feasibility моделирует 72-hour surge, hub redundancy и zero-minimum-volume economics; integrity review исключает prohibited carriers и conflict signals.",
    result: "Prime route, Match 90%, downside feasibility и controlled risk register.", next: "E07/E08 формируют и утверждают service network; E12 получает updated business case.",
    agentIds: [32, 33, 36, 37, 38], responsibleActorId: "tenderlab", actorIds: ["tenderlab", "client", "consultant"], trigger: "ALL: E04 current RFP + E05 verified bidder", startDay: 7, endDay: 10, column: 4, lane: "tenderlab", critical: true,
    scopeBoundary: "Pre-bid feasibility не выполняет post-award operations; subcontractors не становятся JV members.", missingAgentFinding: "Framework downside/call-off uncertainty проверяет границу Agent 37, но отдельный forecasting Agent пока не обоснован.",
  },
  {
    step: 7, period: "День 8–14", phase: "Network discovery", title: "Проектируется local representation и carrier network", initiator: "FrostLink Operations Director",
    narrative: "Partner Discovery определяет capability gaps, Local Service Agent подтверждает in-country coverage model, а Supplier Discovery ищет operational carriers и cold-room operators. Capability Graph показывает шесть candidate roles без смешивания strategic partner и service vendor.",
    result: "Ranked network design: 6 carriers, 7 hubs, county coverage и unresolved evidence list.", next: "E08 получает consent, verification и company approval для каждого candidate.",
    agentIds: [40, 42, 43, 12], responsibleActorId: "client", actorIds: ["client", "consultant", "tenderlab"], trigger: "E05 carrier gap + E06 approved prime route", startDay: 8, endDay: 14, column: 5, lane: "client", critical: true,
    scopeBoundary: "Agent 40 ищет capability route; Agent 43 — operational vendor; Agent 42 — local coverage/representation. Граница требует validation.", missingAgentFinding: "Service subcontractor taxonomy между Partner/Supplier/Local Service Agents остаётся architecture finding.",
  },
  {
    step: 8, period: "День 14–18", phase: "Network approval", title: "Carriers дают consent и проходят verification gate", initiator: "Six candidate carriers",
    narrative: "Каждый carrier разрешает evidence use и предоставляет licence, GDP controls, vehicle telemetry, insurance и capacity declarations. Supplier Verification и integrity screening подтверждают 6/6; Human approver утверждает RFQ recipients и запрещает undisclosed substitution.",
    result: "Approved six-carrier roster, verified dossiers, consent and substitution controls.", next: "E09 выпускает bounded RFQ; P05 продолжает evidence refresh.",
    agentIds: [8, 10, 44, 38, 2, 3], responsibleActorId: "client", actorIds: ["client", "external", "consultant", "tenderlab"], kind: "decision", trigger: "E07 candidate shortlist + carrier consent", startDay: 14, endDay: 18, column: 6, lane: "external", critical: true,
    scopeBoundary: "Carriers own evidence and consent; Agent recommendations не назначают subcontractor без company approval.", missingAgentFinding: "Agent 44 supplier-specific verification отличается от Agent 08 bidder/entity baseline, но service-provider terminology требует review.",
  },
  {
    step: 9, period: "День 18–21", phase: "Carrier RFQ", title: "Approved carriers получают controlled service RFQ", initiator: "FrostLink procurement lead",
    narrative: "RFQ Orchestrator выпускает одинаковые route, temperature, surge, fuel-index и evidence templates только утверждённым recipients. Deliverables register и deadline controls фиксируют questions, responses и late-bid rule.",
    result: "Six issued RFQs, controlled Q&A log и response tracker.", next: "E10 нормализует только timely and compliant responses.",
    agentIds: [45, 27, 17, 4], responsibleActorId: "client", actorIds: ["client", "external", "tenderlab"], trigger: "E08 approved RFQ roster", startDay: 18, endDay: 21, column: 7, lane: "client", critical: true,
    scopeBoundary: "RFQ не является Buyer procurement и не меняет main-tender deadline or award authority.", missingAgentFinding: "Agent 45 достаточно универсален для service RFQ, но canonical examples должны подтвердить это.",
  },
  {
    step: 10, period: "День 21–24", phase: "Quotation normalization", title: "Carrier quotations становятся сопоставимым rate book", initiator: "TenderLab / FrostLink procurement",
    narrative: "Quotation Normalization приводит trip rates, fuel escalators, standby fees, payload, lead time и exclusions к общей basis. Commercial Compliance отделяет non-compliant tax/insurance assumptions; исходные quotes остаются versioned.",
    result: "Comparable six-carrier rate book, deviations and capacity confidence.", next: "E11 соединяет rates с SLA solution и call-off scenarios.",
    agentIds: [46, 49, 3, 4], responsibleActorId: "client", actorIds: ["client", "tenderlab", "consultant"], trigger: "E09 timely RFQ responses", startDay: 21, endDay: 24, column: 8, lane: "tenderlab", critical: true,
    scopeBoundary: "Normalization не выбирает carrier и не устанавливает FrostLink final price.", missingAgentFinding: "Service rate normalization помещается в Agent 46; отдельный service-procurement Agent пока не нужен.",
  },
  {
    step: 11, period: "День 24–27", phase: "Solution + economics", title: "Формируются SLA architecture и framework rate scenarios", initiator: "FrostLink solution team",
    narrative: "Solution Architecture связывает hubs, carriers, telemetry, excursions, surge and business continuity. Pricing строит route-based rate card и low/base/high call-off scenarios; Commercial Attractiveness сохраняет margin floor. Landed Price не активируется: vaccines остаются Buyer-owned.",
    result: "Service architecture, rate card $11,96m evaluated scenario и downside cash-flow model.", next: "E12 получает solution, risk, price and no-guaranteed-volume evidence.",
    agentIds: [39, 51, 37, 36, 47], responsibleActorId: "client", actorIds: ["client", "consultant", "tenderlab"], trigger: "ALL: E04 SLA model + E10 normalized rate book", startDay: 24, endDay: 27, column: 9, lane: "client", critical: true,
    scopeBoundary: "Agent 51 создаёт service rate card; Agent 50 intentionally absent because no purchased/imported goods exist.", missingAgentFinding: "Case 5 повторно подтверждает, что название Pricing & BOQ слишком goods/works-centric для service rate cards.",
  },
  {
    step: 12, period: "День 27–28", phase: "Final BID gate", title: "Company утверждает BID с framework safeguards", initiator: "FrostLink Board Bid Committee",
    narrative: "Board получает qualification, Match, network evidence, feasibility, integrity, legal risk и downside economics. BID одобряется с price floor, carrier no-substitution rule, liability cap и stop condition при unpriced SLA amendment.",
    result: "Approved BID protocol, price/risk boundaries и authorised proposal mandate.", next: "E13 и E14 запускают parallel technical/commercial branches.",
    agentIds: [35, 2, 57, 38, 1], responsibleActorId: "client", actorIds: ["client", "consultant", "tenderlab"], kind: "decision", trigger: "ALL: E05 + E06 + E08 + E11", startDay: 27, endDay: 28, column: 10, lane: "client", critical: true,
    scopeBoundary: "Agents recommend; only authorised committee owns BID and price/risk authority.", missingAgentFinding: "No missing Agent at decision gate; framework-specific safeguards are versioned decision conditions.",
  },
  {
    step: 13, period: "День 28–34", phase: "Technical proposal", title: "Формируется performance-based technical proposal", initiator: "FrostLink Technical Proposal Lead",
    narrative: "Proposal Strategy фиксирует win themes, Technical Proposal описывает cold-chain control tower, hubs, telemetry, emergency drill and business continuity. Compliance maps 148 requirements; Credentials attaches bidder and carrier evidence without inventing performance.",
    result: "QA-ready technical proposal, SLA matrix, network plan and evidence pack.", next: "E15 принимает technical branch после closure of all critical gaps.",
    agentIds: [39, 47, 48, 52, 53, 55], responsibleActorId: "client", actorIds: ["client", "consultant", "tenderlab"], trigger: "E12 approved technical mandate", startDay: 28, endDay: 34, column: 11, lane: "client", critical: true,
    scopeBoundary: "Technical proposal describes service delivery; carrier quotes and final price remain in commercial branch.", missingAgentFinding: "Telemetry/SLA subject-matter review uses Technical Compliance plus human specialist; dedicated Agent remains unproven.",
  },
  {
    step: 14, period: "День 28–33", phase: "Commercial proposal", title: "Отдельно формируется financial rate-card proposal", initiator: "FrostLink Finance Director",
    narrative: "Pricing converts approved scenarios into Buyer rate templates; Commercial Proposal completes financial forms and assumptions; Commercial Compliance checks tax, currency, indexation and zero-volume clauses; Legal Review preserves authorised deviations.",
    result: "Commercial proposal with evaluated $11,96m scenario, rate card and deviation schedule.", next: "E15 receives sealed financial package and commercial QA evidence.",
    agentIds: [51, 49, 54, 57], responsibleActorId: "client", actorIds: ["client", "consultant"], trigger: "E12 approved price/risk mandate", startDay: 28, endDay: 33, column: 11, lane: "client", critical: true,
    scopeBoundary: "Agent 51 owns calculation/rate structure; Agent 54 owns submitted financial forms and narrative.", missingAgentFinding: "Pricing/BOQ naming issue remains; responsibilities themselves are separable.",
  },
  {
    step: 15, period: "День 34–35", phase: "QA + submission", title: "Bid проходит red team, signature и portal submission", initiator: "FrostLink authorised signatory",
    narrative: "Bid QA checks SLA promises, network evidence, rate formulas and legal deviations. Assembly creates signed technical/financial package, deadline control confirms current schedule, and Human signatory submits. Receipt, hash and manifest freeze bid state.",
    result: "Submitted compliant bid, receipt, hashes and frozen evidence/proposal baseline.", next: "E16 waits for Buyer evaluation, oral drill and bounded clarification.",
    agentIds: [56, 58, 4, 17, 2], responsibleActorId: "client", actorIds: ["client", "tenderlab"], kind: "decision", trigger: "ALL: E13 + E14 + authorised signature", startDay: 34, endDay: 35, column: 12, lane: "client", critical: true,
    scopeBoundary: "Portal action and signature belong to authorised person; Agents prepare and evidence the package.", missingAgentFinding: "Submission capability is sufficient.",
  },
  {
    step: 16, period: "День 52–61", phase: "Evaluation + drill", title: "Buyer оценивает proposal, oral drill и clarification", initiator: "KEMSA Evaluation Committee",
    narrative: "Buyer records technical 88/100, observes mandatory emergency-response drill and opens financial proposal after technical pass. Presentation Agent supports authorised team; Post-Bid Clarification answers telemetry retention and backup-hub questions without changing price, network or SLA.",
    result: "Technical 88/100, accepted drill, evaluated rate scenario $11,96m and combined rank 1.", next: "E17 receives award notice and framework conditions.",
    agentIds: [60, 59, 3, 4], responsibleActorId: "buyer", actorIds: ["buyer", "client", "consultant", "tenderlab"], kind: "external-event", trigger: "Buyer evaluation + clarification request", startDay: 52, endDay: 61, column: 13, lane: "buyer", critical: true,
    scopeBoundary: "Buyer owns score, drill acceptance and rank; Agents support presentation, response and evidence only.", missingAgentFinding: "No oral-evaluation Agent is needed beyond Presentation & Negotiation; Buyer authority remains external.",
  },
  {
    step: 17, period: "День 68–78", phase: "Award + framework", title: "Framework contract подписывается и мобилизуется", initiator: "KEMSA Contract Committee",
    narrative: "Award-to-Contract reconciles award, bid and final terms. Legal Review checks call-off, SLA, security and liability clauses. Human approvers sign; seven hubs and six carrier agreements move to controlled ready state. No service volume is created until Buyer issues an authorised call-off.",
    result: "Signed $12,40m-ceiling framework, securities, call-off rules and network mobilisation baseline.", next: "E18 waits for an authorised service order; P06 monitors readiness and contract state.",
    agentIds: [61, 57, 2, 4], responsibleActorId: "buyer", actorIds: ["buyer", "client", "consultant", "tenderlab"], kind: "decision", trigger: "E16 rank 1 + official award notice", startDay: 68, endDay: 78, column: 14, lane: "buyer", critical: true,
    scopeBoundary: "Framework award ≠ guaranteed revenue or operational call-off. Buyer alone issues service orders.", missingAgentFinding: "Canonical registry has no explicit framework/call-off lifecycle owner; Agents 61/63/62 currently compose the boundary.",
  },
  {
    step: 18, period: "День 103", phase: "Emergency call-off", title: "Buyer выпускает первый emergency service order", initiator: "KEMSA Emergency Operations Centre",
    narrative: "Buyer issues a versioned order for 640,000 vaccine doses across 18 counties with 72-hour activation and 21-day completion. Contract Administration validates scope/rates/funding against framework; Deadline control starts operational clock. No Agent invents demand or order authority.",
    result: "Authorised Call-off 001, route quantities, budget, SLA clock and acceptance criteria.", next: "E19 mobilises approved hubs/carriers and records actual execution evidence.",
    agentIds: [63, 17, 4], responsibleActorId: "buyer", actorIds: ["buyer", "client", "tenderlab"], kind: "external-event", trigger: "Buyer-authorised emergency service order", startDay: 103, endDay: 103, column: 15, lane: "buyer", critical: true,
    scopeBoundary: "Call-off is an external Buyer action; Agent 63 validates/administers it but does not create it.", missingAgentFinding: "Call-off lifecycle ownership remains an architecture question between Agents 61, 62 and 63.",
  },
  {
    step: 19, period: "День 103–124", phase: "Service execution", title: "FrostLink выполняет first call-off under live SLA", initiator: "FrostLink Control Tower",
    narrative: "Execution Agent tracks hub release, carrier dispatch, telemetry, proof of delivery, excursions and contingency reroutes. Supplier Verification/Local Service state is refreshed when one vehicle is replaced; change is authorised without substituting the contracted carrier entity.",
    result: "Completed service order: OTIF 98,7%, 0 critical excursions, full chain-of-custody evidence.", next: "E20 Buyer accepts service, certifies payment and transfers learning.",
    agentIds: [62, 44, 42, 4], responsibleActorId: "client", actorIds: ["client", "external", "buyer", "tenderlab"], trigger: "E18 authorised Call-off 001 + ready P05 network", startDay: 103, endDay: 124, column: 16, lane: "client", critical: true,
    scopeBoundary: "Agent 62 supports execution state; operational dispatch and physical custody remain Actor work.", missingAgentFinding: "SLA telemetry/performance monitoring is only implicit in Agent 62 scope; Case 5 tests whether it needs explicit expansion or separate capability.",
  },
  {
    step: 20, period: "День 125–132", phase: "Acceptance + learning", title: "Buyer принимает call-off и подтверждает payment", initiator: "KEMSA Contract Manager",
    narrative: "Buyer validates POD, telemetry and KPI evidence, accepts service and issues payment certificate. Contract Administration records invoice/milestone state; Outcome Learning links award, actual rates, SLA and carrier performance to future discovery/scoring. Remaining framework call-offs transfer to operations.",
    result: "Accepted Call-off 001, payment certificate, performance record and operational handoff.", next: "Case 5 closes; ongoing framework administration continues as downstream operations.",
    agentIds: [63, 64, 5, 19, 4], responsibleActorId: "buyer", actorIds: ["buyer", "client", "tenderlab"], kind: "decision", trigger: "E19 complete evidence package + Buyer acceptance", startDay: 125, endDay: 132, column: 17, lane: "buyer", critical: true,
    scopeBoundary: "Buyer owns acceptance/payment certificate; learning consumes verified outcome only. Future call-offs are excluded.", missingAgentFinding: "Framework continuation needs explicit operational owner but not necessarily a new Agent; Agent 63 boundary requires review.",
  },
];

export const case5Processes: CaseProcess[] = [
  { id: "C5-P01", name: "Governance, taxonomy and evidence policy", ownerActorId: "tenderlab", agentIds: [1, 3, 4, 5], kind: "persistent", timing: "До и на всём протяжении Case", trigger: "Platform governance lifecycle", purpose: "Версионировать policy, classification, evidence и orchestration state.", inputs: [{ name: "Canonical policy and taxonomy", sourceKind: "case-state", availability: "До E01", blocking: true }], outputArtifactIds: ["c5-artifact-p01-policy"], consumerRefs: ["case5-activity-02", "case5-activity-03", "case5-activity-15"], blocking: true, state: "completed" },
  { id: "C5-P02", name: "Company, capability and readiness intelligence", ownerActorId: "tenderlab", agentIds: [6, 7, 8, 9, 10], kind: "persistent", timing: "Reusable baseline + E05 refresh", trigger: "New company, credential or capacity evidence", purpose: "Поддерживать verified bidder baseline отдельно от tender-specific qualification and Match.", inputs: [{ name: "Company and operating evidence", sourceKind: "actor", sourceRef: "client", availability: "Before E03 and refreshed E05", blocking: true }], outputArtifactIds: ["c5-artifact-p02-company"], consumerRefs: ["case5-activity-03", "case5-activity-05", "case5-activity-06"], blocking: true, state: "completed" },
  { id: "C5-P03", name: "Market, award and Buyer intelligence", ownerActorId: "tenderlab", agentIds: [18, 19, 20], kind: "parallel", timing: "E02–E16", trigger: "Qualified logistics opportunity", purpose: "Дать framework award patterns, rate benchmarks, Buyer behaviour and competitor context.", inputs: [{ name: "Public awards, contract and Buyer records", sourceKind: "external", availability: "Before E12", blocking: false }], outputArtifactIds: ["c5-artifact-p03-market"], consumerRefs: ["case5-activity-03", "case5-activity-11", "case5-activity-12"], blocking: false, state: "completed" },
  { id: "C5-P04", name: "Deadline, amendment and procurement-state control", ownerActorId: "tenderlab", agentIds: [17, 29], kind: "case-scoped", timing: "E01–E17", trigger: "Notice, addendum or Buyer communication", purpose: "Поддерживать current schedule, SLA/rate-template version and change impact.", inputs: [{ name: "Official source updates", sourceKind: "external", availability: "Continuous", blocking: true }], outputArtifactIds: ["c5-artifact-p04-calendar"], consumerRefs: ["case5-activity-04", "case5-activity-12", "case5-activity-15"], blocking: true, state: "completed" },
  { id: "C5-P05", name: "Subcontractor network assurance", ownerActorId: "client", agentIds: [8, 10, 11, 12, 42, 43, 44], kind: "case-scoped", timing: "E07–E20", trigger: "New carrier, expired evidence, capacity or substitution signal", purpose: "Поддерживать approved service-network, evidence, capacity and no-substitution controls.", inputs: [{ name: "Carrier identity, licence, capacity and performance evidence", sourceKind: "actor", sourceRef: "external", availability: "Before E09 and refreshed through E19", blocking: true }], outputArtifactIds: ["c5-artifact-p05-network"], consumerRefs: ["case5-activity-09", "case5-activity-13", "case5-activity-19"], blocking: true, state: "completed" },
  { id: "C5-P06", name: "Framework call-off and SLA control", ownerActorId: "client", agentIds: [4, 17, 62, 63], kind: "case-scoped", timing: "E17–E20", trigger: "Signed framework, authorised service order or operational exception", purpose: "Связать contract terms, call-off authority, SLA clock, execution evidence, acceptance and payment state.", inputs: [{ name: "Framework + authorised call-off + operational evidence", sourceKind: "event", sourceRef: "case5-activity-18", availability: "After E18", blocking: true }], outputArtifactIds: ["c5-artifact-p06-sla"], consumerRefs: ["case5-activity-19", "case5-activity-20"], blocking: true, state: "completed" },
  { id: "C5-P07", name: "Outcome and architecture learning", ownerActorId: "tenderlab", agentIds: [5, 19, 64], kind: "persistent", timing: "After E16, E17 and E20", trigger: "Evaluation, award, call-off or performance outcome", purpose: "Связать bid, award, actual SLA, rates, carrier performance and architecture findings.", inputs: [{ name: "Verified Buyer and performance outcomes", sourceKind: "event", sourceRef: "case5-activity-20", availability: "At terminal state", blocking: false }], outputArtifactIds: ["c5-artifact-p07-learning"], consumerRefs: ["future-case", "canonical-agent-review"], blocking: false, state: "completed" },
];

export const case5RelationshipSpecs: Case5RelationshipSpec[] = [
  { from: 1, to: 2, label: "RFP source package", blocking: true },
  { from: 2, to: 3, label: "Opportunity Review Pack", blocking: true },
  { from: 3, to: 4, type: "branches-to", label: "Document mandate", blocking: true },
  { from: 3, to: 5, type: "branches-to", label: "Company evidence mandate", blocking: true },
  { from: 4, to: 6, type: "joins-at", label: "Current RFP/SLA model", blocking: true, joinPolicy: "ALL" },
  { from: 5, to: 6, type: "joins-at", label: "Verified bidder baseline", blocking: true, joinPolicy: "ALL" },
  { from: 6, to: 7, label: "Approved prime route + network gap", blocking: true },
  { from: 7, to: 8, label: "Candidate network", blocking: true },
  { from: 8, to: 9, label: "Approved RFQ roster", blocking: true },
  { from: 9, to: 10, label: "Carrier responses", blocking: true },
  { from: 10, to: 11, label: "Normalized rate book", blocking: true },
  { from: 11, to: 12, label: "Solution + downside economics", blocking: true },
  { from: 12, to: 13, type: "branches-to", label: "Technical mandate", blocking: true },
  { from: 12, to: 14, type: "branches-to", label: "Commercial mandate", blocking: true },
  { from: 13, to: 15, type: "joins-at", label: "Technical proposal", blocking: true, joinPolicy: "ALL" },
  { from: 14, to: 15, type: "joins-at", label: "Commercial proposal", blocking: true, joinPolicy: "ALL" },
  { from: 15, to: 16, type: "waits-for", label: "Buyer evaluation + oral drill", blocking: true },
  { from: 16, to: 17, label: "Rank 1 + award notice", blocking: true },
  { from: 17, to: 18, type: "waits-for", label: "Authorised emergency call-off", blocking: true },
  { from: 18, to: 19, label: "Call-off scope + SLA clock", blocking: true },
  { from: 19, to: 20, label: "Execution + KPI evidence", blocking: true },
];
