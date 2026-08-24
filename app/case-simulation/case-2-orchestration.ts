import { agents } from "../../packages/catalog-data/src/agents.ts";
import type { CaseProcess, EventAgentAuditDecision, ProcessActivityKind, ProcessRelationship } from "../process-model.ts";

export type Case2EventBlueprint = {
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

export type Case2ExecutionOverride = {
  role?: string;
  action?: string;
  necessity?: EventAgentAuditDecision;
  condition?: string;
  activation?: "triggered" | "standby";
  input?: string;
  output?: string;
  handoff?: string;
  rationale?: string;
  overlapNote?: string;
};

export type Case2RelationshipSpec = {
  from: number;
  to: number;
  type?: ProcessRelationship["type"];
  label: string;
  condition?: string;
  blocking?: boolean;
  joinPolicy?: ProcessRelationship["joinPolicy"];
};

const agentById = new Map(agents.map((agent) => [agent.id, agent]));

export const case2EventBlueprints: Case2EventBlueprint[] = [
  {
    step: 1, period: "День 0 · публикация", phase: "Внешний источник", title: "ООН публикует рамочную закупку PPE", initiator: "UN Procurement Office · Kenya Programme",
    narrative: "На официальном портале появляется notice KE-UN-PPE-2026-042: один лот на защитные медицинские комплекты, framework ceiling $2,10 млн и 21 день до подачи. TenderLab получает первичные файлы и фиксирует source baseline; компания ещё не знает о Case.",
    result: "Оригинальный notice, attachments, source manifest и неизменяемый publication baseline.", next: "E02 читает source package вместе с готовыми P01/P02 records; P04 начинает мониторинг дат.",
    agentIds: [13, 4], responsibleActorId: "buyer", actorIds: ["buyer", "tenderlab"], kind: "external-event", trigger: "Официальная публикация notice", startDay: 0, endDay: 0, column: 0, lane: "buyer", critical: true,
    scopeBoundary: "Buyer публикует; Agents 13/04 фиксируют источник. Интерпретация и company relevance относятся к E02.", missingAgentFinding: "Новый Agent не нужен; acquisition и audit имеют разные outputs.",
  },
  {
    step: 2, period: "День 0–1", phase: "Backend discovery", title: "Возможность проходит classification, filtering и ranking", initiator: "TenderLab / Backend",
    narrative: "Agent 15 нормализует тип закупки, Agent 16 применяет утверждённые P01 rules, Agent 14 ранжирует прошедшую возможность против готового provisional public profile P02. 91% означает preliminary relevance по открытым данным, а не eligibility, verified match или право на автоматический outreach.",
    result: "Preliminary Opportunity Review Pack 91% с filter reasons, evidence limits и contact prohibition до E03.", next: "PB01/PB02 готовят evidence; consultant принимает отдельное человеческое решение E03.",
    agentIds: [15, 16, 14], responsibleActorId: "tenderlab", actorIds: ["tenderlab"], trigger: "E01 source + P01 policy + P02 provisional profile", startDay: 0, endDay: 1, column: 1, lane: "tenderlab", critical: true,
    scopeBoundary: "E02 — только 15→16→14. Market, buyer и tender-document analysis выполняются в parallel Processes.", missingAgentFinding: "Upstream prerequisites представлены P01/P02/P03; Agent 19 не исполняется в Event.",
  },
  {
    step: 3, period: "День 1–2", phase: "Internal outreach gate", title: "Консультант решает, допустим ли контакт", initiator: "TenderLab Consultant",
    narrative: "Консультант проверяет source-backed opportunity pack, market/buyer context, pre-contact tender facts, integrity red flags и P05 outreach policy. Human Approval фиксирует решение, кому, на каком основании и с какими оговорками можно направить brief. Score сам по себе не запускает marketing.",
    result: "Approved outreach basis, contact owner, permitted claims, evidence links и stop conditions.", next: "E04 выполняет человеческий контакт; opt-out немедленно завершает Case без Client profile.",
    agentIds: [3, 2, 1], responsibleActorId: "consultant", actorIds: ["consultant", "tenderlab"], kind: "decision", trigger: "ALL: E02 + PB01 + PB02 + P05 policy", startDay: 1, endDay: 2, column: 2, lane: "consultant", critical: true,
    scopeBoundary: "Agents готовят evidence и управляют gate; решение и коммуникационная ответственность принадлежат человеку.", missingAgentFinding: "Отдельный Outreach Agent не нужен: коммуникация остаётся human activity, governance — Process.",
  },
  {
    step: 4, period: "День 2", phase: "Human outreach", title: "Консультант направляет прозрачный opportunity brief", initiator: "TenderLab Consultant",
    narrative: "Консультант связывается с MedTex, раскрывает роль TenderLab, источник контакта, preliminary nature анализа и предлагает короткий briefing. Он не утверждает eligibility, не создаёт Client account без согласия и не маскирует сообщение под решение заказчика.",
    result: "Доставленный outreach record с permitted claims, evidence links и opt-out channel.", next: "Компания самостоятельно отвечает в E05; отсутствие ответа не создаёт скрытый Client Case.",
    agentIds: [], responsibleActorId: "consultant", actorIds: ["consultant", "external"], kind: "external-event", trigger: "E03 human approval", startDay: 2, endDay: 2, column: 3, lane: "consultant", critical: true,
    scopeBoundary: "Это человеческая коммуникация; P05 фиксирует metadata, но ни один Agent не выдаётся за отправителя.", missingAgentFinding: "Zero-Agent Event является корректным; новый Agent не требуется.",
  },
  {
    step: 5, period: "День 2–3", phase: "Prospect response", title: "Компания запрашивает briefing", initiator: "Коммерческий директор MedTex Protection LLC",
    narrative: "Компания подтверждает получение brief и просит объяснить opportunity, но это ещё не consent на обработку private evidence и не решение BID. TenderLab фиксирует только волеизъявление prospect и допустимый следующий контакт.",
    result: "Prospect response с requested briefing и без implied consent на tender-specific assessment.", next: "E06 отдельно фиксирует согласие, owners и границу Client Side work.",
    agentIds: [], responsibleActorId: "client", actorIds: ["client", "consultant"], kind: "external-event", trigger: "Компания отвечает на E04", startDay: 2, endDay: 3, column: 4, lane: "client", critical: true,
    scopeBoundary: "Ответ принадлежит компании. Система не подменяет его автоматическим engagement status.", missingAgentFinding: "Новый Agent не нужен; это Actor decision/input.",
  },
  {
    step: 6, period: "День 3", phase: "Consent gate", title: "Компания разрешает tender-specific assessment", initiator: "Генеральный директор MedTex Protection LLC",
    narrative: "После briefing компания явно разрешает обработку private evidence, назначает commercial, quality и finance owners и принимает правила совместной работы. Orchestrator только после этого создаёт управляемый Client Case; calendar становится персонализированным.",
    result: "Versioned consent, processing scope, owners, Client Case state и 21-дневный calendar.", next: "E07 получает право запрашивать private company evidence; P04 связывает alerts с owners.",
    agentIds: [1, 2, 4, 17], responsibleActorId: "client", actorIds: ["client", "tenderlab", "consultant"], kind: "decision", trigger: "E05 requested briefing + informed consent", startDay: 3, endDay: 3, column: 5, lane: "client", critical: true,
    scopeBoundary: "Human approval создаёт authority; Agents фиксируют и оркестрируют state, но не предполагают consent.", missingAgentFinding: "Privacy/consent является Actor authority + audit state, не новым tender Agent.",
  },
  {
    step: 7, period: "День 3–5", phase: "Verified onboarding", title: "Публичный prospect profile заменяется verified company baseline", initiator: "MedTex quality and commercial owners",
    narrative: "Компания предоставляет registry, ownership, factory, product catalogue, capacity, references, ISO/test evidence и bank data. Agents 06/07/08/10 разделяют profile assembly, capability normalization, factual verification и credential validity; provenance сохраняет public/private source boundary.",
    result: "Verified Company Profile, PPE capability catalogue, credential register и evidence ledger.", next: "E08 оценивает общую readiness; E09 использует те же verified facts для tender-specific qualification.",
    agentIds: [6, 7, 8, 10, 3, 4], responsibleActorId: "client", actorIds: ["client", "tenderlab"], trigger: "E06 consent + assigned owners", startDay: 3, endDay: 5, column: 6, lane: "client", critical: true,
    scopeBoundary: "E07 создаёт verified company facts; readiness, eligibility и match являются отдельными downstream assessments.", missingAgentFinding: "Текущие Agents покрывают различимые profile/verification/credential outputs.",
  },
  {
    step: 8, period: "День 5", phase: "General readiness", title: "Оценивается общая готовность компании к тендерам", initiator: "TenderLab assessment workflow",
    narrative: "Agent 09 оценивает организацию, evidence completeness, экспортный процесс, bid resources и financial readiness независимо от конкретной закупки. Результат 71/100 показывает общую зрелость нового экспортёра, а не вероятность победы.",
    result: "Tender Readiness 71/100, blockers, improvement priorities и evidence confidence.", next: "E09 объединяет readiness с конкретными tender facts; general score не заменяет Match.",
    agentIds: [9, 3], responsibleActorId: "tenderlab", actorIds: ["tenderlab", "client"], trigger: "E07 verified company baseline", startDay: 5, endDay: 5, column: 7, lane: "tenderlab", critical: true,
    scopeBoundary: "Agent 09 владеет general readiness; Agents 25/31 владеют tender-specific qualification/match.", missingAgentFinding: "No gap; scope distinction explicit.",
  },
  {
    step: 9, period: "День 5–7", phase: "Qualification + fit", title: "Проверяются eligibility, verified match и direct participation", initiator: "TenderLab scoring workflow",
    narrative: "Fan-in E07 + E08 + PB02 впервые позволяет доказуемо проверить mandatory eligibility, company×tender match и direct-manufacturer solution fit. Gap Agent превращает два conditional items — UN vendor registration и guarantee line — в actions с owners и сроком шесть дней.",
    result: "Conditional eligibility Pass, verified Match 87%, direct route и six-day remediation plan.", next: "E10 проверяет способность, экономику и integrity; при route failure активируется Agent 33 отдельно.",
    agentIds: [25, 31, 32, 34, 3], standbyAgentIds: [33], responsibleActorId: "tenderlab", actorIds: ["tenderlab", "client"], trigger: "ALL: E07 + E08 + PB02", startDay: 5, endDay: 7, column: 8, lane: "tenderlab", critical: true,
    scopeBoundary: "E09 квалифицирует и сопоставляет, но не принимает BID decision и не проектирует proposal.", missingAgentFinding: "Agent 33 остаётся standby, поскольку direct route подтверждён.",
  },
  {
    step: 10, period: "День 6–8", phase: "Decision pack", title: "Проверяются feasibility, commercial case и integrity", initiator: "TenderLab + MedTex finance/operations",
    narrative: "Capacity и framework call-off constraints проверяются отдельно от economics; $2,10 млн трактуется как ceiling, а не гарантированная выручка. PB01 market/competitor records используются как inputs и не пересчитываются внутри Event. Integrity screening обновляется на verified ownership.",
    result: "Feasibility Pass, margin range 14–18%, downside thresholds и integrity clearance с mitigation.", next: "E11 получает полный human-readable decision pack.",
    agentIds: [36, 37, 38], responsibleActorId: "client", actorIds: ["client", "tenderlab"], trigger: "E09 qualification pack + PB01 market/buyer evidence", startDay: 6, endDay: 8, column: 9, lane: "client", critical: true,
    scopeBoundary: "Agents дают отдельные feasibility/economics/integrity conclusions; human authority остаётся E11.", missingAgentFinding: "Agents 18/20 являются Process executions, а не дублируются в E10.",
  },
  {
    step: 11, period: "День 8", phase: "Company decision", title: "Компания принимает условное решение BID", initiator: "MedTex tender committee",
    narrative: "Руководство рассматривает verified eligibility, Match 87%, readiness 71/100, economics, risks и шестидневный gap plan. Bid / No-Bid Agent формирует рекомендацию, Human Approval фиксирует собственное решение компании и stop conditions.",
    result: "Подписанный Conditional BID protocol с owners, thresholds и no-go branch при незакрытых gaps.", next: "Положительное решение ведёт к controlled handoff E12; No-Bid/withdrawal закрывает activation Case.",
    agentIds: [35, 2, 1], responsibleActorId: "client", actorIds: ["client", "tenderlab", "consultant"], kind: "decision", trigger: "ALL: E09 + E10", startDay: 8, endDay: 8, column: 10, lane: "client", critical: true,
    scopeBoundary: "Agent 35 рекомендует; решение принадлежит компании и фиксируется Agent 02.", missingAgentFinding: "No new Agent. Decision authority and analytics separated.",
  },
  {
    step: 12, period: "День 8", phase: "Case boundary", title: "Activation dossier передаётся в Client Side preparation", initiator: "TenderLab Orchestrator + MedTex bid owner",
    narrative: "TenderLab замораживает activation baseline: consent, sources, verified profile, scores, gaps, decision protocol, calendar и owners. Он создаёт ссылку на отдельный Client Side bid-preparation Case. Proposal, pricing, compliance, submission и award не скрываются внутри Case 2.",
    result: "Frozen Activation Dossier и явный handoff в Client-owned bid-preparation route.", next: "Case 2 завершён; следующий Case начинается только с принятым dossier и собственной Event architecture.",
    agentIds: [1, 4, 17], responsibleActorId: "tenderlab", actorIds: ["tenderlab", "client"], kind: "background-update", trigger: "E11 approved Conditional BID", startDay: 8, endDay: 8, column: 11, lane: "tenderlab", critical: true,
    scopeBoundary: "E12 передаёт state; Agents 47–58 не исполняются до открытия следующего Case.", missingAgentFinding: "No gap; boundary prevents scope creep and false completion claims.",
  },
];

export const case2Processes: CaseProcess[] = [
  {
    id: "P01", name: "Platform Policy & Taxonomy", ownerActorId: "tenderlab", agentIds: [1, 15, 16], kind: "persistent", timing: "Platform-wide; versioned before any Case", trigger: "Governance, portfolio or rule change", purpose: "Reuses the approved platform capability for taxonomy, portfolio policy, thresholds and exclusions that E02 only reads.",
    inputs: [{ name: "Platform governance", sourceKind: "actor", sourceRef: "tenderlab", availability: "Before Case", blocking: true }, { name: "Portfolio and outreach risk rules", sourceKind: "actor", sourceRef: "tenderlab", availability: "Before Case", blocking: true }], outputArtifactIds: ["artifact-p01-taxonomy", "artifact-p01-filter-policy", "artifact-p01-thresholds", "artifact-p01-rights-policy"], consumerRefs: ["case2-activity-02", "P02", "P05"], blocking: true, state: "running",
  },
  {
    id: "P02", name: "Open-source Prospect Intelligence", ownerActorId: "tenderlab", agentIds: [6, 7, 8, 3, 5], kind: "persistent", timing: "Before contact; refreshed from lawful public sources", trigger: "New prospect or material public-source change", purpose: "Reuses the approved capability to build a provisional company profile without implying consent or verified status.",
    inputs: [{ name: "Public registries and catalogues", sourceKind: "external", availability: "Before Case", blocking: true }, { name: "Public evidence rights", sourceKind: "process", sourceRef: "P01", availability: "At ingestion", blocking: true }], outputArtifactIds: ["artifact-p02-provisional-profile", "artifact-p02-evidence-gaps"], consumerRefs: ["case2-activity-02", "case2-activity-03", "case2-activity-07"], blocking: true, state: "running",
  },
  {
    id: "P03", name: "Tender & Award Intelligence Pipeline", ownerActorId: "tenderlab", agentIds: [13, 19, 5, 4], kind: "persistent", timing: "Platform-wide ingestion/linkage; Events read ready records", trigger: "Procurement, award or contract publication", purpose: "Reuses linked notice/award/contract history; Agent 19 is not artificially executed inside E02.",
    inputs: [{ name: "Official procurement and award sources", sourceKind: "external", availability: "Continuous", blocking: false }], outputArtifactIds: ["artifact-p03-history", "artifact-p03-awards"], consumerRefs: ["case2-activity-02", "PB01", "PB02"], blocking: false, state: "running",
  },
  {
    id: "P04", name: "Deadline & Amendment Monitoring", ownerActorId: "tenderlab", agentIds: [17, 29, 4], kind: "case-scoped", timing: "E01 to E12; owner alerts only after E06 consent", trigger: "E01 source baseline or official update", purpose: "Maintains dates and amendment impact asynchronously without duplicating monitoring in every Event.",
    inputs: [{ name: "Notice dates", sourceKind: "event", sourceRef: "case2-activity-01", availability: "After E01", blocking: true }, { name: "Company owners", sourceKind: "event", sourceRef: "case2-activity-06", availability: "After consent", blocking: false }], outputArtifactIds: ["artifact-p04-calendar", "artifact-p04-amendments"], consumerRefs: ["case2-activity-03", "case2-activity-06", "case2-activity-12"], blocking: false, state: "running",
  },
  {
    id: "P05", name: "Prospect Outreach Governance", ownerActorId: "consultant", agentIds: [1, 4], kind: "case-scoped", timing: "E03 through E06 and any termination branch", trigger: "E02 preliminary relevance exceeds review threshold", purpose: "Controls lawful contact basis, permitted claims, opt-out, communication lineage and the consent boundary; it does not automate human outreach.",
    inputs: [{ name: "Outreach policy", sourceKind: "process", sourceRef: "P01", availability: "Before E03", blocking: true }, { name: "Opportunity evidence pack", sourceKind: "event", sourceRef: "case2-activity-02", availability: "After E02", blocking: true }], outputArtifactIds: ["artifact-p05-outreach-basis", "artifact-p05-consent-log"], consumerRefs: ["case2-activity-03", "case2-activity-04", "case2-activity-05", "case2-activity-06"], blocking: true, state: "running",
  },
  {
    id: "PB01", name: "Market & Buyer Enrichment", ownerActorId: "tenderlab", agentIds: [18, 20], kind: "parallel", timing: "After E02; joins at E03 and E10", trigger: "E02 opportunity passes filter", purpose: "Adds market, price, buyer and competitor context without blocking source triage or being re-executed inside decision Events.",
    inputs: [{ name: "Classified opportunity", sourceKind: "event", sourceRef: "case2-activity-02", availability: "After E02", blocking: true }, { name: "Historical records", sourceKind: "process", sourceRef: "P03", availability: "Ready records", blocking: false }], outputArtifactIds: ["artifact-pb01-market", "artifact-pb01-buyer"], consumerRefs: ["case2-activity-03", "case2-activity-10"], blocking: true, state: "running",
  },
  {
    id: "PB02", name: "Pre-contact Tender Fact Pack", ownerActorId: "tenderlab", agentIds: [21, 23, 24, 26, 3], kind: "parallel", timing: "After E02; joins at E03 and E09", trigger: "E02 opportunity passes filter", purpose: "Builds a source-locked tender model before outreach without pretending to verify the company or decide eligibility.",
    inputs: [{ name: "Official source package", sourceKind: "event", sourceRef: "case2-activity-01", availability: "After E01", blocking: true }, { name: "Classified opportunity", sourceKind: "event", sourceRef: "case2-activity-02", availability: "After E02", blocking: true }], outputArtifactIds: ["artifact-pb02-corpus", "artifact-pb02-requirements", "artifact-pb02-evaluation"], consumerRefs: ["case2-activity-03", "case2-activity-09"], blocking: true, state: "running",
  },
];

export const case2RelationshipSpecs: Case2RelationshipSpec[] = [
  { from: 1, to: 2, label: "Source package + baseline", blocking: true },
  { from: 2, to: 3, type: "joins-at", label: "Preliminary Opportunity Review Pack 91%", blocking: true, joinPolicy: "ALL" },
  { from: 3, to: 4, type: "approved-by", label: "Approved contact basis", blocking: true },
  { from: 4, to: 5, type: "waits-for", label: "Prospect response", condition: "Компания отвечает; opt-out/тишина закрывает outreach route", blocking: true },
  { from: 5, to: 6, type: "approved-by", label: "Informed consent + owners", blocking: true },
  { from: 6, to: 7, label: "Private evidence permission", blocking: true },
  { from: 7, to: 8, label: "Verified company baseline", blocking: true },
  { from: 7, to: 9, type: "joins-at", label: "Verified profile + credentials", blocking: true, joinPolicy: "ALL" },
  { from: 8, to: 9, type: "joins-at", label: "Readiness 71/100", blocking: true, joinPolicy: "ALL" },
  { from: 9, to: 10, label: "Eligibility + Match 87% + gap plan", blocking: true },
  { from: 10, to: 11, type: "joins-at", label: "Feasibility + commercial + integrity pack", blocking: true, joinPolicy: "ALL" },
  { from: 11, to: 12, type: "transitions-to", label: "Approved Conditional BID", blocking: true },
];

export const case2ExecutionOverrides: Record<string, Case2ExecutionOverride> = {
  "2:15": { role: "Canonical tender classification", action: "Normalizes category, country, buyer, procedure and one-lot framework structure.", input: "E01 notice + P01 taxonomy", output: "PPE / Kenya / UN framework / Goods classification", handoff: "Agent 16" },
  "2:16": { role: "Deterministic policy filter", action: "Applies ready geography/category/risk rules without company-specific scoring.", input: "Agent 15 record + P01 filter policy", output: "Pass record with applied rules", handoff: "Agent 14" },
  "2:14": { role: "Preliminary opportunity ranking", action: "Ranks the passed tender against the provisional public prospect profile.", input: "Agent 16 pass + P02 provisional profile", output: "Preliminary relevance 91% + limitations", handoff: "E03; no automatic outreach" },
  "9:33": { necessity: "conditional", activation: "standby", condition: "Direct participation becomes invalid after verified solution-fit.", role: "Alternative route exception", action: "Not triggered: direct manufacturer route remains valid.", input: "Agent 32 route result", output: "No route change", handoff: "E10" },
};

for (const event of case2EventBlueprints) {
  for (const agentId of [...event.agentIds, ...(event.standbyAgentIds ?? [])]) {
    if (!agentById.has(agentId)) throw new Error(`Unknown canonical Agent ${agentId} in Case 2 Event ${event.step}.`);
  }
}
if (case2EventBlueprints.length !== 12 || new Set(case2EventBlueprints.map((event) => event.step)).size !== 12) throw new Error("Case 2 requires 12 unique Events.");
if (case2Processes.some((process) => process.agentIds.some((id) => !agentById.has(id)))) throw new Error("Every Case 2 Process must use canonical Agent IDs.");
