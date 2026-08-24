import type { CaseProcess, ProcessActivityKind, ProcessRelationship } from "../process-model.ts";

export type Case4EventBlueprint = {
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

export type Case4RelationshipSpec = {
  from: number;
  to: number;
  type?: ProcessRelationship["type"];
  label: string;
  condition?: string;
  blocking?: boolean;
  joinPolicy?: ProcessRelationship["joinPolicy"];
};

export const case4EventBlueprints: Case4EventBlueprint[] = [
  {
    step: 1, period: "День 0", phase: "REOI publication", title: "Buyer публикует REOI на consulting services", initiator: "Rwanda Biomedical Centre",
    narrative: "Официальный REOI описывает national digital-health interoperability assignment, 36-месячный time-based contract и 21 день на Expression of Interest. TenderLab сохраняет authoritative source package; procurement ещё не является RFP и не содержит финальной price form.",
    result: "Source-locked REOI, publication baseline, deadline и provenance.", next: "E02 классифицирует procurement как Consultants/QCBS и проверяет portfolio rules.",
    agentIds: [13, 4], responsibleActorId: "buyer", actorIds: ["buyer", "tenderlab"], kind: "external-event", trigger: "Official World Bank REOI publication", startDay: 0, endDay: 0, column: 0, lane: "buyer", critical: true,
    scopeBoundary: "Buyer публикует; source acquisition не выполняет business classification.", missingAgentFinding: "Новый Agent не нужен: Agent 13 владеет source item, Agent 15 — procurement classification.",
  },
  {
    step: 2, period: "День 0–1", phase: "Discovery", title: "REOI проходит classification, filtering и opportunity ranking", initiator: "TenderLab / Backend",
    narrative: "Consultants/QCBS, health information systems, Rwanda и one-lot scope нормализуются отдельно от relevance. Filtering применяет policy, а Discovery ранжирует opportunity против готового профиля NorthStar. Preliminary relevance 89% не означает shortlist или eligibility.",
    result: "Opportunity Review Pack 89% с filter reasons и evidence limitations.", next: "E03 получает verified company baseline и принимает human REOI decision.",
    agentIds: [15, 16, 14], responsibleActorId: "tenderlab", actorIds: ["tenderlab"], trigger: "E01 + P01 policy + P02 company profile", startDay: 0, endDay: 1, column: 1, lane: "tenderlab", critical: true,
    scopeBoundary: "Classification, filtering и ranking имеют разные outputs; shortlist остаётся внешним Buyer decision.", missingAgentFinding: "Текущие границы Agents достаточны.",
  },
  {
    step: 3, period: "День 1–2", phase: "REOI gate", title: "NorthStar утверждает подачу EOI", initiator: "Managing Partner · NorthStar",
    narrative: "Company×Opportunity Match, preliminary qualification и risk pack показывают релевантность, но также отсутствие Rwanda reference и local privacy expertise. Руководство утверждает ограниченный REOI budget без обязательства подавать последующий RFP proposal.",
    result: "Approved REOI decision, owner, budget и stop conditions.", next: "E04 собирает evidence, experience и expert availability только для EOI.",
    agentIds: [31, 35, 2, 1], responsibleActorId: "client", actorIds: ["client", "consultant", "tenderlab"], kind: "decision", trigger: "E02 + P02/P03 evidence", startDay: 1, endDay: 2, column: 2, lane: "client", critical: true,
    scopeBoundary: "REOI approval не является final BID и не разрешает придумывать partner commitments.", missingAgentFinding: "EOI gate строится из существующих scoring/decision capabilities.",
  },
  {
    step: 4, period: "День 2–8", phase: "EOI evidence", title: "Формируется доказательная EOI baseline", initiator: "NorthStar bid lead",
    narrative: "Legal identity, consulting capability, comparable assignments, ISO credentials и доступность proposed experts проверяются с provenance. Organisational references отделены от личных CV; неподтверждённый expert не попадает в EOI claim.",
    result: "Verified company/experience dossier и EOI evidence register.", next: "E05 превращает проверенные facts в concise Expression of Interest.",
    agentIds: [6, 7, 8, 10, 55, 3, 4], responsibleActorId: "client", actorIds: ["client", "tenderlab", "consultant"], trigger: "E03 approved REOI route", startDay: 2, endDay: 8, column: 3, lane: "client", critical: true,
    scopeBoundary: "Agent 55 управляет bid credentials; Agent 10 — canonical certificates; Agent 08 — factual entity verification.", missingAgentFinding: "Key-expert CV validation видна как architecture finding: scope Agent 55 требует отдельного подтверждения.",
  },
  {
    step: 5, period: "День 8–12", phase: "EOI submission", title: "EOI проходит strategy, QA и submission", initiator: "NorthStar bid lead",
    narrative: "EOI позиционирует firm experience и service capability без преждевременной technical methodology или financial offer. QA проверяет claims против evidence, а Submission Agent фиксирует receipt.",
    result: "Submitted EOI, hash, receipt и frozen claim/evidence package.", next: "Case переходит в resumable wait до Buyer shortlist E06.",
    agentIds: [52, 55, 56, 58], responsibleActorId: "client", actorIds: ["client", "tenderlab"], trigger: "E04 verified EOI baseline", startDay: 8, endDay: 12, column: 4, lane: "client", critical: true,
    scopeBoundary: "EOI не содержит цену; Agent 54/51 не активируются до RFP.", missingAgentFinding: "Отдельный EOI Agent пока не обоснован: 52/55/56/58 имеют различимые outputs.",
  },
  {
    step: 6, period: "День 31", phase: "Shortlist + RFP", title: "Buyer включает NorthStar в shortlist и выдаёт RFP", initiator: "Rwanda Biomedical Centre",
    narrative: "Buyer публикует shortlist и направляет authoritative RFP shortlisted firms. RFP вводит technical threshold 75/100, 80:20 QCBS weights, two-envelope rule, 11 key experts и draft time-based contract.",
    result: "Authoritative shortlist notice, RFP package и 42-дневный calendar.", next: "E07 строит RFP corpus; E08 проверяет tender-specific eligibility и route.",
    agentIds: [13, 4, 17], responsibleActorId: "buyer", actorIds: ["buyer", "client", "tenderlab"], kind: "external-event", trigger: "Buyer shortlist decision", startDay: 31, endDay: 31, column: 5, lane: "buyer", critical: true,
    scopeBoundary: "Shortlist — Buyer state transition, а не Agent prediction.", missingAgentFinding: "Shortlist lifecycle пока не first-class canonical capability; это registry finding, не повод выдумывать execution.",
  },
  {
    step: 7, period: "День 31–36", phase: "RFP intelligence", title: "RFP превращается в source-locked QCBS model", initiator: "TenderLab document workflow",
    narrative: "Document intake, OCR/translation, structure, requirements, evaluation, forms и specification fidelity создают separate technical/financial envelope model. Addendum 01 меняет expert availability form и submission date; change impact versioned.",
    result: "RFP corpus, 126 requirements, 11 expert criteria, QCBS scorecard и Addendum 01 impact.", next: "E08 qualification и E10 BID gate используют только current RFP version.",
    agentIds: [21, 22, 23, 24, 26, 27, 28, 29, 30, 3, 4], responsibleActorId: "tenderlab", actorIds: ["tenderlab", "consultant"], trigger: "E06 authoritative RFP", startDay: 31, endDay: 36, column: 6, lane: "tenderlab", critical: true,
    scopeBoundary: "Agent 30 формирует buyer question только по material ambiguity; Agent 29 владеет amendment delta.", missingAgentFinding: "Нет нового Agent; envelope rule становится explicit Artifact.",
  },
  {
    step: 8, period: "День 36–39", phase: "Qualification + route", title: "Проверяются qualification, fit и prime-consultant route", initiator: "TenderLab assessment workflow",
    narrative: "Verified profile объединяется с current RFP. NorthStar проходит corporate eligibility, Match 91% и direct prime route, но получает controlled gaps по local privacy expertise и signed availability всех experts.",
    result: "Conditional qualification Pass, Match 91%, prime route и remediation plan.", next: "E09 закрывает local expertise; E10 принимает final BID decision.",
    agentIds: [25, 31, 32, 33, 34], responsibleActorId: "tenderlab", actorIds: ["tenderlab", "client", "consultant"], trigger: "ALL: E04 verified company + E07 current RFP model", startDay: 36, endDay: 39, column: 7, lane: "tenderlab", critical: true,
    scopeBoundary: "Match, qualification и participation route не взаимозаменяемы.", missingAgentFinding: "Gap remediation остаётся управляемым action plan, не скрытой verification.",
  },
  {
    step: 9, period: "День 37–43", phase: "Local expertise", title: "Выбирается и проверяется local privacy specialist", initiator: "NorthStar technical director",
    narrative: "Partner Discovery ищет не JV member и не representation vendor, а локального specialist subcontractor. Capability graph, company verification и integrity review подтверждают Rwanda health-data expertise, availability и отсутствие conflict.",
    result: "Verified local specialist agreement, scoped workshare и evidence-backed availability.", next: "E10 team baseline входит в feasibility/risk gate; E11 использует approved role.",
    agentIds: [40, 12, 8, 7, 38], standbyAgentIds: [42], responsibleActorId: "client", actorIds: ["client", "consultant", "external"], trigger: "E08 local-expertise gap", startDay: 37, endDay: 43, column: 8, lane: "client", critical: true,
    scopeBoundary: "Subcontracted expert ≠ JV member ≠ local representation provider.", missingAgentFinding: "Partner verification boundary между 08/12/38 требует наблюдения, но отдельный Agent пока не доказан.",
  },
  {
    step: 10, period: "День 43–45", phase: "Final BID gate", title: "Company утверждает полный RFP proposal route", initiator: "NorthStar Managing Partner",
    narrative: "Readiness, delivery feasibility, commercial attractiveness, integrity/conflict review и closed gap plan сходятся на human decision. Approved BID фиксирует 11 experts, price ceiling, margin floor и no-substitution conditions.",
    result: "Approved BID protocol и controlled proposal mandate.", next: "E11 и E12 запускаются параллельно с information barrier между envelopes.",
    agentIds: [9, 36, 37, 38, 35, 2], responsibleActorId: "client", actorIds: ["client", "consultant", "tenderlab"], kind: "decision", trigger: "ALL: E08 + E09 + P03 market evidence", startDay: 43, endDay: 45, column: 9, lane: "client", critical: true,
    scopeBoundary: "Agent recommendations не имеют authority заменить company BID approval.", missingAgentFinding: "Conflict-of-interest граница Agent 38/57 фиксируется как overlap finding.",
  },
  {
    step: 11, period: "День 45–61", phase: "Technical envelope", title: "Формируется technical proposal и expert team", initiator: "NorthStar technical proposal lead",
    narrative: "Solution Architecture создаёт methodology/workplan, Compliance связывает 126 requirements, Technical Proposal формирует narrative, Credentials прикладывает verified CVs. Financial values недоступны technical evaluation team.",
    result: "QA-ready technical envelope: methodology, workplan, staffing и 11 verified CVs.", next: "E13 получает technical package только после red-team closure.",
    agentIds: [39, 47, 48, 52, 53, 55], responsibleActorId: "client", actorIds: ["client", "consultant", "tenderlab"], trigger: "E10 approved proposal mandate", startDay: 45, endDay: 61, column: 10, lane: "client", critical: true,
    scopeBoundary: "Technical proposal не получает financial price; Agent 39 проектирует service solution, не IT system implementation.", missingAgentFinding: "Key Expert/CV scope Agent 55 остаётся architecture-review item.",
  },
  {
    step: 12, period: "День 45–60", phase: "Financial envelope", title: "Отдельно формируется time-based financial proposal", initiator: "NorthStar finance director",
    narrative: "Pricing Agent строит remuneration by expert-month и reimbursables вместо goods BOQ; Commercial Compliance проверяет forms/taxes/currency, Commercial Proposal создаёт sealed envelope, Legal Review фиксирует contract deviations.",
    result: "Financial envelope $4,62 млн, staffing schedule, reimbursables и deviation register.", next: "E13 получает sealed financial package без раскрытия technical team.",
    agentIds: [51, 49, 54, 57], responsibleActorId: "client", actorIds: ["client", "consultant"], trigger: "E10 approved price/margin boundaries", startDay: 45, endDay: 60, column: 10, lane: "client", critical: true,
    scopeBoundary: "Agent 51 применён к time-based schedule; Agent 50 Landed Price намеренно не участвует.", missingAgentFinding: "Название Pricing & BOQ может быть слишком goods-centric; capability работает, но терминология требует review.",
  },
  {
    step: 13, period: "День 61–65", phase: "QA + submission", title: "Envelopes проходят red team и раздельную подачу", initiator: "NorthStar authorised signatory",
    narrative: "Bid QA проверяет cross-envelope consistency без раскрытия price evaluator, Assembly формирует два independently sealed packages, Human signer утверждает final submission. Receipt и hashes фиксируются до deadline.",
    result: "Submitted technical and financial envelopes, receipts, hashes и frozen baseline.", next: "E14 ждёт technical evaluation; financial envelope остаётся unopened.",
    agentIds: [56, 58, 4, 17, 2], responsibleActorId: "client", actorIds: ["client", "tenderlab"], kind: "decision", trigger: "ALL: E11 + E12 + human signature", startDay: 61, endDay: 65, column: 11, lane: "client", critical: true,
    scopeBoundary: "Human signatory owns submission authority; system preserves separation and evidence.", missingAgentFinding: "Envelope separation is a workflow control, not a new Agent.",
  },
  {
    step: 14, period: "День 92–103", phase: "QCBS evaluation", title: "Technical threshold открывает financial evaluation", initiator: "Rwanda Biomedical Centre",
    narrative: "Buyer records technical score 86/100, выше threshold 75. Только после этого financial envelope открывается; Post-Bid Clarification отвечает на two bounded questions without changing methodology or experts. Combined QCBS ranking places NorthStar first.",
    result: "Technical 86/100, evaluated price $4,62 млн и combined rank 1.", next: "E15 получает invitation to negotiate и frozen evaluated proposal.",
    agentIds: [59, 3, 4], responsibleActorId: "buyer", actorIds: ["buyer", "client", "consultant"], kind: "external-event", trigger: "Buyer technical evaluation and threshold pass", startDay: 92, endDay: 103, column: 12, lane: "buyer", critical: true,
    scopeBoundary: "Agents support clarification/evidence; Buyer owns score and ranking.", missingAgentFinding: "QCBS scoring is external Buyer authority, not TenderLab Agent output.",
  },
  {
    step: 15, period: "День 108–121", phase: "Negotiation + contract", title: "Parties negotiate и подписывают consultancy contract", initiator: "Buyer negotiation committee",
    narrative: "Presentation & Negotiation prepares mandate, Legal Review controls deviations, Award-to-Contract reconciles evaluated proposal with final contract. Human approvers accept team, workplan, rates and inception conditions; execution beyond inception handoff is excluded.",
    result: "Signed $4,62 млн contract, 11 confirmed experts и approved inception/mobilization baseline.", next: "Delivery team owns 36-month execution; P06 records outcome and Case 4 closes.",
    agentIds: [60, 57, 61, 2, 4], standbyAgentIds: [63], responsibleActorId: "buyer", actorIds: ["buyer", "client", "consultant", "tenderlab"], kind: "decision", trigger: "E14 rank 1 + invitation to negotiate", startDay: 108, endDay: 121, column: 13, lane: "buyer", critical: true,
    scopeBoundary: "Terminal state is signed contract + inception baseline; delivery and invoice administration are next Case/Process.", missingAgentFinding: "No new Agent needed at terminal boundary; Agent 62 and 63 are deliberately outside/standby.",
  },
];

export const case4Processes: CaseProcess[] = [
  { id: "C4-P01", name: "Governance, taxonomy and evidence policy", ownerActorId: "tenderlab", agentIds: [1, 3, 4, 5], kind: "persistent", timing: "До и на всём протяжении Case", trigger: "Platform governance lifecycle", purpose: "Версионировать policy, terminology, evidence и orchestration state.", inputs: [{ name: "Canonical policy and taxonomy", sourceKind: "case-state", availability: "До E01", blocking: true }], outputArtifactIds: ["c4-artifact-p01-policy"], consumerRefs: ["case4-activity-02", "case4-activity-03", "case4-activity-13"], blocking: true, state: "completed" },
  { id: "C4-P02", name: "Company, capability and expert intelligence", ownerActorId: "tenderlab", agentIds: [6, 7, 8, 10, 12], kind: "persistent", timing: "Reusable baseline + Case refresh", trigger: "New evidence or expert availability change", purpose: "Поддерживать verified firm, capability и team evidence без смешивания с tender-specific score.", inputs: [{ name: "Company and expert evidence", sourceKind: "actor", sourceRef: "client", availability: "Before E03 and refreshed E04/E09", blocking: true }], outputArtifactIds: ["c4-artifact-p02-company"], consumerRefs: ["case4-activity-03", "case4-activity-04", "case4-activity-08", "case4-activity-10"], blocking: true, state: "completed" },
  { id: "C4-P03", name: "Consulting market, award and buyer intelligence", ownerActorId: "tenderlab", agentIds: [18, 19, 20], kind: "parallel", timing: "E02–E10", trigger: "Qualified consulting opportunity", purpose: "Дать rate benchmarks, comparable awards, Buyer patterns и competitor context.", inputs: [{ name: "Public awards and buyer records", sourceKind: "external", availability: "Before final BID", blocking: false }], outputArtifactIds: ["c4-artifact-p03-market"], consumerRefs: ["case4-activity-03", "case4-activity-10", "case4-activity-12"], blocking: false, state: "completed" },
  { id: "C4-P04", name: "Deadline and amendment control", ownerActorId: "tenderlab", agentIds: [17, 29], kind: "case-scoped", timing: "E01–E15", trigger: "Notice, RFP, addendum or Buyer communication", purpose: "Поддерживать current schedule и versioned change impact.", inputs: [{ name: "Official source updates", sourceKind: "external", availability: "Continuous", blocking: true }], outputArtifactIds: ["c4-artifact-p04-calendar"], consumerRefs: ["case4-activity-07", "case4-activity-13", "case4-activity-15"], blocking: true, state: "completed" },
  { id: "C4-P05", name: "Expert availability and conflict monitoring", ownerActorId: "client", agentIds: [10, 12, 38, 55], kind: "case-scoped", timing: "E04–E15", trigger: "Expert nomination, substitution request or conflict signal", purpose: "Не допустить неподтверждённый CV, double commitment или conflict-of-interest.", inputs: [{ name: "CVs, declarations and availability", sourceKind: "actor", sourceRef: "client", availability: "Before E11 and refreshed through negotiation", blocking: true }], outputArtifactIds: ["c4-artifact-p05-experts"], consumerRefs: ["case4-activity-08", "case4-activity-10", "case4-activity-11", "case4-activity-15"], blocking: true, state: "completed" },
  { id: "C4-P06", name: "Outcome and architecture learning", ownerActorId: "tenderlab", agentIds: [5, 19, 64], kind: "persistent", timing: "After E06, E14 and E15", trigger: "Shortlist, evaluation or contract outcome", purpose: "Связать REOI→shortlist→evaluation→contract и сохранить architecture findings.", inputs: [{ name: "Buyer outcomes and Case audit", sourceKind: "event", sourceRef: "case4-activity-15", availability: "At terminal state", blocking: false }], outputArtifactIds: ["c4-artifact-p06-learning"], consumerRefs: ["future-case", "canonical-agent-review"], blocking: false, state: "completed" },
];

export const case4RelationshipSpecs: Case4RelationshipSpec[] = [
  { from: 1, to: 2, label: "REOI source package", blocking: true },
  { from: 2, to: 3, label: "Opportunity Review Pack", blocking: true },
  { from: 3, to: 4, label: "Approved REOI route", blocking: true },
  { from: 4, to: 5, label: "Verified EOI evidence", blocking: true },
  { from: 5, to: 6, type: "waits-for", label: "Buyer shortlist decision", blocking: true },
  { from: 6, to: 7, label: "Authoritative RFP", blocking: true },
  { from: 7, to: 8, label: "Current requirements + QCBS model", blocking: true },
  { from: 8, to: 9, type: "branches-to", label: "Local expertise gap", blocking: true },
  { from: 8, to: 10, type: "joins-at", label: "Qualification + Match + route", blocking: true, joinPolicy: "ALL" },
  { from: 9, to: 10, type: "joins-at", label: "Verified local expert", blocking: true, joinPolicy: "ALL" },
  { from: 10, to: 11, type: "branches-to", label: "Technical mandate", blocking: true },
  { from: 10, to: 12, type: "branches-to", label: "Financial mandate", blocking: true },
  { from: 11, to: 13, type: "joins-at", label: "Technical envelope", blocking: true, joinPolicy: "ALL" },
  { from: 12, to: 13, type: "joins-at", label: "Sealed financial envelope", blocking: true, joinPolicy: "ALL" },
  { from: 13, to: 14, type: "waits-for", label: "Buyer evaluation", blocking: true },
  { from: 14, to: 15, label: "Rank 1 + invitation", blocking: true },
];
