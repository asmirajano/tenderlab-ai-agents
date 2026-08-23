import type {
  AgentDatasetContribution,
  AgentDatasetGap,
  AgentDatasetRelationshipType,
  AgentDeliverable,
  AgentDeliverableDisposition,
} from "../../catalog-schema/src";
import { agents } from "./agents.ts";
import { tenderDatasets } from "./datasets.ts";

type RelationSeed = [datasetCode: string, type: AgentDatasetRelationshipType, provides: string[], condition?: string, finding?: string];
type GapSeed = [proposedName: string, neededRecord: string, whyExistingDatasetsDoNotFit: string, status: AgentDatasetGap["status"]];

const datasetRecordAgents = new Set([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 53, 54, 55, 56, 58, 59, 61, 62, 63, 64]);
const operationalStateAgents = new Set([1, 17]);
const auditOnlyAgents = new Set([2]);
const transientAgents = new Set([16, 52, 60]);

const gapFindings: Record<number, GapSeed> = {
  9: ["Company Tender Readiness Assessments", "Версионированная оценка готовности компании, блокирующие пробелы и план улучшений.", "CAPABILITY-PROFILES хранит факты о возможностях, но не самостоятельную оценку готовности.", "resolved"],
  14: ["Company × Tender Discovery Results", "Персональный shortlist возможностей с relevance score и причинами исключения.", "SHORTLISTS относится к procurement evaluation, а не к внутреннему discovery компании.", "resolved"],
  25: ["Company × Tender Qualification Assessments", "Case-specific Pass / Fail по критериям допуска и доказательствам компании.", "ELIGIBILITY-PATTERNS хранит повторяемые правила, но не конкретное решение Company × Tender.", "resolved"],
  31: ["Company × Tender Match Assessments", "Объяснимый fit score с факторными весами, evidence и gaps.", "Ни один существующий Dataset не хранит персональную аналитическую пару Company × Tender.", "resolved"],
  32: ["Company × Tender Solution-Fit Assessments", "Модель Direct / Partner / JV и покрытие компонентов решения.", "CAPABILITY-PROFILES и JV-RECORDS не являются case-specific моделью solution-fit.", "resolved"],
  33: ["Tender Participation Strategy Records", "Рекомендованная роль Prime / JV / Subcontractor с rationale.", "JV-RECORDS фиксирует фактические объединения, а не предварительную стратегию участия.", "resolved"],
  34: ["Tender Gap Remediation Plans", "Пробелы, корректирующие действия, владельцы и сроки закрытия.", "Текущие Datasets хранят факты и evidence, но не управляемый remediation plan.", "proposed"],
  35: ["Bid Decision Records", "Рекомендация и утверждённое решение Bid / No-Bid с risk-return rationale.", "BIDS фиксирует поданные заявки, но не внутреннее решение до подготовки заявки.", "resolved"],
  36: ["Tender Execution Feasibility Assessments", "Capacity load, delivery feasibility, bottlenecks и mitigations до Bid.", "DELIVERY-MILESTONES относится к исполнению заключённого контракта, а не pre-bid feasibility.", "resolved"],
  37: ["Tender Commercial Business Cases", "Margin, cash-flow и stress scenarios с go/no-go thresholds.", "BOQ-COST-ITEMS хранит cost items, но не управленческий business case конкретной возможности.", "resolved"],
  39: ["Tender Solution Architecture Records", "Конфигурация продуктов, партнёров и delivery model под конкретный тендер.", "Отдельный Dataset отклонён: расширенный BIDS теперь хранит draft/approved/submitted solution configuration.", "rejected"],
  40: ["Partner Candidate Assessments", "Ранжированные кандидаты, capability fit, evidence и contact path.", "RELATIONSHIP-GRAPH должен хранить подтверждённые отношения, а не временный candidate shortlist.", "resolved"],
  42: ["Local Service Network Assessments", "Кандидаты локального сервиса, покрытие, SLA и gaps.", "GEOSPATIAL и RELATIONSHIP-GRAPH не содержат case-specific оценки сервисной сети.", "resolved"],
  43: ["Sourcing Candidate Assessments", "Shortlist поставщиков с product/spec fit, MOQ, lead time и диапазоном цены.", "SUPPLIER-PERFORMANCE хранит историю исполнения, а не sourcing shortlist под конкретную потребность.", "resolved"],
  45: ["RFQ Events & Responses", "RFQ packages, recipients, deadlines, response status и source quotations.", "BIDS описывает tender bids, но не внутренние supplier RFQ процессы участника.", "resolved"],
  46: ["Normalized Supplier Quotations", "Сопоставимые supplier quote lines, Incoterms, lead time, deviations и exclusions.", "BOQ-COST-ITEMS не сохраняет первичные и нормализованные коммерческие предложения поставщиков.", "resolved"],
  47: ["Bid Compliance Matrices", "Requirement → response → evidence → owner → status для конкретной заявки.", "REQUIREMENTS хранит demand, а BIDS — заявку; traceability matrix между ними отсутствует.", "resolved"],
  48: ["Technical Compliance Assessments", "Compliant / deviation по техническим пунктам с evidence и clarification needs.", "TECHNICAL-SPECS хранит требования, но не оценку соответствия предлагаемого решения.", "resolved"],
  49: ["Commercial Compliance Assessments", "Проверка currency, tax, payment, bond и commercial deviations.", "CONTRACT-DOCUMENTS и BIDS не дают отдельной structured commercial compliance assessment.", "resolved"],
  56: ["Bid QA Findings", "Red-team defects, severity, owners, remediation и closure status.", "AUDIT-FINDINGS относится к procurement oversight, а не внутреннему QA заявки участника.", "resolved"],
  57: ["Contract Review & Deviation Records", "Clause risks, liabilities, securities и proposed exceptions до подписания.", "CONTRACT-DOCUMENTS хранит договоры, но не внутренний legal review и deviation schedule.", "proposed"],
};

function dispositionFor(agentId: number): AgentDeliverableDisposition {
  if (datasetRecordAgents.has(agentId)) return "dataset-record";
  if (operationalStateAgents.has(agentId)) return "operational-state";
  if (auditOnlyAgents.has(agentId)) return "audit-only";
  if (transientAgents.has(agentId)) return "transient";
  return "potential-dataset-gap";
}

const dispositionRationale: Record<AgentDeliverableDisposition, string> = {
  "dataset-record": "Deliverable содержит устойчивые, повторно используемые records или assets и имеет доказуемую связь с каноническим Dataset.",
  "operational-state": "Deliverable управляет текущим workflow state; он нужен приложению, но не является самостоятельным аналитическим Dataset.",
  "audit-only": "Deliverable сохраняется как управленческое решение или контрольный след, а не как procurement Dataset.",
  transient: "Deliverable служит рабочим промежуточным материалом и не должен автоматически становиться каноническим Dataset.",
  "potential-dataset-gap": "Deliverable должен сохраняться, но ни один из 96 существующих Dataset не описывает его без смыслового искажения.",
};

export const agentDeliverables: AgentDeliverable[] = agents.map((agent) => {
  const disposition = dispositionFor(agent.id);
  return {
    id: `deliverable:TL-A${String(agent.id).padStart(3, "0")}-PRIMARY`,
    agentId: agent.registryId,
    name: agent.output.primary,
    payloadFields: agent.output.artifacts,
    disposition,
    rationale: dispositionRationale[disposition],
  };
});

const relations: Record<number, RelationSeed[]> = {
  3: [["PROVENANCE-RIGHTS", "enriches-record", ["source citations", "confidence", "evidence gaps"]], ["EVIDENCE-VAULT", "validates-record", ["document provenance", "evidence validity"]]],
  4: [["RAW-ARCHIVE", "appends-event", ["immutable versions", "change hashes", "decision history"]], ["PROVENANCE-RIGHTS", "enriches-record", ["version lineage", "change provenance"]]],
  5: [["RELATIONSHIP-GRAPH", "updates-record", ["entity nodes", "verified edges", "temporal relations"]]],
  6: [["CAPABILITY-PROFILES", "updates-record", ["company capabilities", "capacity", "geography", "evidence links"]]],
  7: [["PRODUCT-CATALOGUE", "enriches-record", ["normalized products", "technical attributes"]], ["CAPABILITY-PROFILES", "enriches-record", ["production capacity", "capability constraints"]]],
  8: [["COMPANY-REGISTRY", "validates-record", ["legal identity", "operating status"]], ["CAPABILITY-PROFILES", "validates-record", ["factory", "experience", "references"]]],
  9: [["COMPANY-READINESS-ASSESSMENTS", "creates-record", ["readiness score", "blocking gaps", "improvement priorities", "evidence basis"]]],
  10: [["CERTIFICATES", "updates-record", ["certificate scope", "issuer", "validity"]], ["LICENCES", "updates-record", ["licence scope", "expiry"]], ["EVIDENCE-VAULT", "enriches-record", ["credential evidence files"]]],
  11: [["PERFORMANCE-HISTORY", "enriches-record", ["delivery history", "quality", "supplier risk"]]],
  12: [["RELATIONSHIP-GRAPH", "enriches-record", ["partner links", "capability coverage"]], ["CAPABILITY-PROFILES", "enriches-record", ["partner competencies", "coverage gaps"]]],
  13: [["TENDER-NOTICES", "creates-record", ["normalized notice", "source URL", "publication metadata"]], ["RAW-ARCHIVE", "appends-event", ["original response", "attachments", "hashes"]], ["PROVENANCE-RIGHTS", "enriches-record", ["source", "licence", "ingestion method"]]],
  14: [["COMPANY-TENDER-OPPORTUNITY-ASSESSMENTS", "creates-record", ["discovery relevance", "ranking", "inclusion and exclusion reasons", "deadline and source"]]],
  15: [["TENDER-LOT-MASTER", "enriches-record", ["sector", "category", "country", "buyer type", "procedure"]], ["ONTOLOGY", "enriches-record", ["classification mappings", "normalized terms"], "После подтверждения новой или уточнённой классификации."]],
  18: [["PRICE-BENCHMARK", "materializes-asset", ["normalized comparison prices", "market bands"]], ["BUYER-HISTORY", "enriches-record", ["demand and timing patterns"]]],
  19: [["AWARDS", "updates-record", ["winner", "award value", "award date"]], ["CONTRACT-REGISTER", "enriches-record", ["award-to-contract link", "contract pattern"]], ["GLOBAL-HISTORY", "appends-event", ["linked tender-award-contract history"]]],
  20: [["BUYER-HISTORY", "enriches-record", ["procurement patterns", "timing", "change behavior"]], ["COMPETITION-HISTORY", "enriches-record", ["competitor sets", "wins", "participation bands"]]],
  21: [["TENDER-DOCUMENTS", "creates-record", ["document manifest", "source URLs", "file hashes"]], ["DOCUMENT-CORPUS", "enriches-record", ["indexed files", "version lineage"]]],
  22: [["DOCUMENT-CORPUS", "enriches-record", ["OCR text", "canonical English", "translation cache", "page provenance"]]],
  23: [["TENDER-LOT-MASTER", "enriches-record", ["lot tree", "annex relationships"]], ["FORMS-SCHEMA", "creates-record", ["forms registry", "field structure"]], ["BOQ-SCHEDULE", "creates-record", ["BOQ hierarchy", "line identities"]]],
  24: [["REQUIREMENTS", "creates-record", ["normalized requirements", "clause locators", "evidence types"]], ["REQUIREMENT-LIBRARY", "enriches-record", ["reusable requirement patterns", "versions"]]],
  25: [["ELIGIBILITY-PATTERNS", "enriches-record", ["criteria patterns", "thresholds", "required evidence"], "После отделения повторяемого pattern от case-specific qualification decision."], ["COMPANY-TENDER-OPPORTUNITY-ASSESSMENTS", "creates-record", ["qualification result", "pass/fail matrix", "mandatory gaps", "qualification evidence"]]],
  26: [["EVALUATION-CRITERIA", "creates-record", ["criteria", "weights", "formulas", "pass thresholds"]]],
  27: [["FORMS-SCHEMA", "enriches-record", ["required forms", "deliverable structure", "completion rules"]]],
  28: [["TECHNICAL-SPECS", "enriches-record", ["exact clauses", "units", "tolerances", "substitution rules"]], ["REQUIREMENTS", "validates-record", ["source-locked specification fidelity"]]],
  29: [["AMENDMENTS", "creates-record", ["changed clauses", "effective date", "redline"]], ["GLOBAL-HISTORY", "appends-event", ["amendment event", "affected records"]]],
  30: [["CLARIFICATIONS", "creates-record", ["question", "source clauses", "buyer response", "status"]]],
  31: [["COMPANY-TENDER-OPPORTUNITY-ASSESSMENTS", "creates-record", ["weighted fit score", "factor weights", "strengths and gaps", "evidence citations"]]],
  32: [["COMPANY-TENDER-OPPORTUNITY-ASSESSMENTS", "creates-record", ["solution-fit assessment", "direct/partner/JV model", "component coverage", "uncovered components"]]],
  33: [["PARTICIPATION-DECISIONS", "creates-record", ["participation route", "prime/JV/subcontractor role", "rationale", "partner requirements"]]],
  35: [["PARTICIPATION-DECISIONS", "updates-record", ["Bid/No-Bid recommendation", "approved decision", "opportunity score", "risk-return rationale"]]],
  36: [["COMPANY-TENDER-OPPORTUNITY-ASSESSMENTS", "creates-record", ["execution feasibility", "capacity load", "delivery schedule", "bottlenecks and mitigations"]]],
  37: [["COMPANY-TENDER-OPPORTUNITY-ASSESSMENTS", "creates-record", ["commercial attractiveness", "margin scenarios", "cash-flow curve", "go/no-go thresholds"]]],
  38: [["RISK-HISTORY", "appends-event", ["screening result", "risk signals", "mitigation", "outcome"]], ["SANCTIONS", "validates-record", ["entity match decision", "effective dates"]], ["DEBARMENT", "validates-record", ["ineligibility match decision", "effective dates"]]],
  39: [["BIDS", "updates-record", ["draft/approved/submitted state", "solution configuration", "products", "partners", "work packages", "delivery model"]]],
  40: [["CANDIDATE-ASSESSMENTS", "creates-record", ["partner candidates", "capability fit", "evidence", "contact path", "ranking"]]],
  41: [["JV-RECORDS", "creates-record", ["members", "roles", "workshare", "eligibility coverage"], "После управленческого подтверждения предлагаемой структуры."]],
  42: [["CANDIDATE-ASSESSMENTS", "creates-record", ["local representatives", "geographic coverage", "SLA capabilities", "service gaps"]]],
  43: [["CANDIDATE-ASSESSMENTS", "creates-record", ["supplier candidates", "product/spec fit", "MOQ", "lead time", "initial price range"]]],
  44: [["COMPANY-REGISTRY", "validates-record", ["supplier legal identity", "operating status"]], ["CERTIFICATES", "validates-record", ["supplier certificate validity"]], ["PERFORMANCE-HISTORY", "enriches-record", ["verified capacity and supplier risk"]]],
  45: [["SUPPLIER-RFQ-QUOTATIONS", "creates-record", ["RFQ package", "recipient list", "deadlines", "response events", "source quotations"]]],
  46: [["SUPPLIER-RFQ-QUOTATIONS", "updates-record", ["normalized quote lines", "Incoterms", "MOQ", "lead time", "deviations and exclusions"]]],
  47: [["BIDS", "enriches-record", ["compliance status summary", "open gaps"], "Агрегированный статус для bid version."], ["BID-COMPLIANCE-ASSURANCE", "creates-record", ["requirement-response-evidence traceability", "owner", "status", "open gaps"]]],
  48: [["BID-COMPLIANCE-ASSURANCE", "creates-record", ["technical compliance result", "deviations", "equivalence evidence", "clarification needs"]]],
  49: [["BID-COMPLIANCE-ASSURANCE", "creates-record", ["commercial compliance result", "currency and tax checks", "payment and bond terms", "commercial deviations"]]],
  50: [["BOQ-COST-ITEMS", "updates-record", ["unit cost", "freight", "duties", "tax", "scenario assumptions"]]],
  51: [["BIDS", "updates-record", ["priced BOQ lines", "currency", "tax", "margin summary"]], ["BOQ-COST-ITEMS", "enriches-record", ["approved cost basis", "line mapping"]]],
  53: [["BIDS", "updates-record", ["technical methodology", "execution plan", "annex links"]]],
  54: [["BIDS", "updates-record", ["price schedules", "commercial terms", "assumptions", "exclusions"]]],
  55: [["EVIDENCE-VAULT", "enriches-record", ["references", "CVs", "certificates", "requirement mapping"]], ["BIDS", "enriches-record", ["selected qualification evidence"]]],
  56: [["BID-COMPLIANCE-ASSURANCE", "appends-event", ["red-team findings", "severity", "owners", "remediation", "closure status"]]],
  58: [["BIDS", "updates-record", ["final signed package", "file manifest"]], ["SUBMISSION-EVENTS", "appends-event", ["upload timestamp", "portal receipt", "submitted version"]]],
  59: [["BIDS", "updates-record", ["approved clarification answers", "supporting evidence"]], ["EVALUATION-RECORDS", "appends-event", ["clarification request", "response", "submission version"]]],
  61: [["CONTRACT-REGISTER", "creates-record", ["award link", "contract status", "signing milestones"]], ["CONTRACT-DOCUMENTS", "creates-record", ["signed agreement", "bonds", "securities"]]],
  62: [["DELIVERY-MILESTONES", "updates-record", ["production", "QC", "shipment", "installation status"]], ["ACCEPTANCE", "appends-event", ["inspection", "acceptance", "defects"]], ["WARRANTY", "updates-record", ["warranty start", "coverage", "service milestones"]]],
  63: [["PAYMENTS", "appends-event", ["invoice", "payment", "retention", "guarantee status"]], ["CONTRACT-CHANGES", "appends-event", ["variation", "approval", "financial impact"]], ["CONTRACT-REGISTER", "updates-record", ["administration status", "completion state"]]],
  64: [["PARTICIPATION-HISTORY", "appends-event", ["participation", "result", "score", "feedback"]], ["PERFORMANCE-HISTORY", "enriches-record", ["delivery outcome", "buyer feedback"]], ["COMPETITION-HISTORY", "enriches-record", ["win/loss", "competitor set", "award context"]]],
};

const datasetByCode = new Map(tenderDatasets.map((dataset) => [dataset.id.replace("dataset:TEA-DS-", ""), dataset]));

export const agentDatasetContributions: AgentDatasetContribution[] = Object.entries(relations).flatMap(([rawAgentId, seeds]) => {
  const numericAgentId = Number(rawAgentId);
  const agent = agents.find((candidate) => candidate.id === numericAgentId)!;
  const deliverable = agentDeliverables.find((candidate) => candidate.agentId === agent.registryId)!;
  return seeds.map(([datasetCode, relationshipType, provides, condition = "Когда соответствующий output подтверждён evidence и прошёл применимые approval gates.", validationFinding], index) => {
    const dataset = datasetByCode.get(datasetCode)!;
    const requiresIdentity = relationshipType === "creates-record" || relationshipType === "updates-record" || relationshipType === "appends-event";
    return {
      id: `agent-dataset:TL-A${String(agent.id).padStart(3, "0")}-${String(index + 1).padStart(2, "0")}`,
      agentId: agent.registryId,
      deliverableId: deliverable.id,
      datasetId: dataset.id,
      relationshipType,
      provides,
      targetFields: provides,
      ...(requiresIdentity ? { recordIdentity: `${dataset.slug} canonical key + effective version` } : {}),
      condition,
      rationale: `${agent.name} производит ${provides.join(", ")}; это соответствует содержанию ${dataset.name.en}, а не только тематически похоже на него.`,
      provenanceRequirement: "Source reference, effective timestamp, confidence, producing Agent ID и deliverable version.",
      status: "proposed" as const,
      ...(validationFinding ? { validationFinding } : {}),
    };
  });
});

export const agentDatasetGapFindings: AgentDatasetGap[] = Object.entries(gapFindings).map(([rawAgentId, [proposedName, neededRecord, whyExistingDatasetsDoNotFit, status]]) => {
  const agent = agents.find((candidate) => candidate.id === Number(rawAgentId))!;
  const deliverable = agentDeliverables.find((candidate) => candidate.agentId === agent.registryId)!;
  return {
    id: `agent-dataset-gap:TL-A${String(agent.id).padStart(3, "0")}`,
    agentId: agent.registryId,
    deliverableId: deliverable.id,
    proposedName,
    neededRecord,
    whyExistingDatasetsDoNotFit,
    status,
  };
});

// Only unresolved REVIEW findings render as Potential Dataset Gaps in Agent profiles.
// Resolved and rejected findings remain in the canonical audit ledger above.
export const agentDatasetGaps = agentDatasetGapFindings.filter((item) => item.status === "proposed");

export const datasetRelationshipLabels: Record<AgentDatasetRelationshipType, string> = {
  "creates-record": "CREATES",
  "updates-record": "UPDATES",
  "enriches-record": "ENRICHES",
  "validates-record": "VALIDATES",
  "appends-event": "APPENDS EVENT",
  "materializes-asset": "MATERIALIZES",
};

export const deliverableDispositionLabels: Record<AgentDeliverableDisposition, string> = {
  "dataset-record": "PERSISTENT DATA",
  "operational-state": "OPERATIONAL STATE",
  "audit-only": "AUDIT / APPROVAL RECORD",
  transient: "TRANSIENT WORK PRODUCT",
  "potential-dataset-gap": "POTENTIAL DATASET GAP",
};

export function deliverableForAgent(agentRegistryId: string) {
  return agentDeliverables.find((item) => item.agentId === agentRegistryId);
}

export function datasetContributionsForAgent(agentRegistryId: string) {
  return agentDatasetContributions.filter((item) => item.agentId === agentRegistryId);
}

export function datasetGapsForAgent(agentRegistryId: string) {
  return agentDatasetGaps.filter((item) => item.agentId === agentRegistryId);
}

export function tenderEcosystemDatasetUrl(datasetId: string) {
  const dataset = tenderDatasets.find((item) => item.id === datasetId);
  return dataset ? `https://tender-ecosystem-atlas.web.app/data?dataset=${encodeURIComponent(dataset.slug)}` : undefined;
}

export function validateAgentDatasetRelationships() {
  const agentIds = new Set(agents.map((agent) => agent.registryId));
  const deliverableIds = new Set(agentDeliverables.map((item) => item.id));
  const datasetIds = new Set(tenderDatasets.map((item) => item.id));
  const relationIds = new Set<string>();
  if (agentDeliverables.length !== agents.length) throw new Error(`Expected ${agents.length} Agent deliverables, got ${agentDeliverables.length}`);
  if (deliverableIds.size !== agentDeliverables.length) throw new Error("Agent deliverable IDs must be unique");
  for (const deliverable of agentDeliverables) {
    if (!agentIds.has(deliverable.agentId)) throw new Error(`Unknown Agent on ${deliverable.id}`);
    if (!deliverable.name.trim() || deliverable.payloadFields.length === 0) throw new Error(`Incomplete deliverable ${deliverable.id}`);
  }
  for (const relation of agentDatasetContributions) {
    if (relationIds.has(relation.id)) throw new Error(`Duplicate relation ${relation.id}`);
    relationIds.add(relation.id);
    if (!agentIds.has(relation.agentId)) throw new Error(`Unknown Agent on ${relation.id}`);
    if (!deliverableIds.has(relation.deliverableId)) throw new Error(`Unknown deliverable on ${relation.id}`);
    if (!datasetIds.has(relation.datasetId)) throw new Error(`Unknown Dataset on ${relation.id}`);
    if (!relation.provides.length || !relation.targetFields.length || !relation.rationale.trim()) throw new Error(`Incomplete relation ${relation.id}`);
    if (["creates-record", "updates-record", "appends-event"].includes(relation.relationshipType) && !relation.recordIdentity) throw new Error(`Missing record identity on ${relation.id}`);
  }
  for (const gap of agentDatasetGaps) {
    if (!agentIds.has(gap.agentId) || !deliverableIds.has(gap.deliverableId)) throw new Error(`Invalid gap ${gap.id}`);
  }
  const classifiedAgents = new Set(agentDeliverables.map((item) => item.agentId));
  const unclassified = agents.filter((agent) => !classifiedAgents.has(agent.registryId));
  if (unclassified.length) throw new Error(`Unclassified Agents: ${unclassified.map((agent) => agent.id).join(", ")}`);
  return {
    agents: agents.length,
    deliverables: agentDeliverables.length,
    datasetContributions: agentDatasetContributions.length,
    datasetGaps: agentDatasetGaps.length,
    datasetGapFindings: agentDatasetGapFindings.length,
    nonDatasetDeliverables: agentDeliverables.filter((item) => item.disposition !== "dataset-record").length,
  };
}

validateAgentDatasetRelationships();
