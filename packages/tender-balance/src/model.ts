/** Shared, UI-agnostic balance-sheet review engine for TenderBalance. */
export const BALANCE_SHEET_SCHEMA_VERSION = "1.0.0";

export type DocumentLanguage = "en" | "ru" | "uz" | "und";
export type ExtractionMethod = "digital-text" | "ocr" | "manual-transcription";
export type ReviewStatus = "unreviewed" | "needs-review" | "corrected" | "approved";
export type StatementStatus = "draft" | "needs-review" | "approved";
export type IssueSeverity = "info" | "warning" | "error" | "blocking";
export type BalanceSheetConcept =
  | "total_assets"
  | "total_liabilities"
  | "total_liabilities_and_equity"
  | "owners_equity"
  | "net_assets"
  | "current_assets"
  | "non_current_assets"
  | "current_liabilities"
  | "non_current_liabilities"
  | "cash_and_cash_equivalents"
  | "trade_receivables"
  | "inventories"
  | "other_current_assets"
  | "property_plant_equipment"
  | "intangible_assets"
  | "other_non_current_assets"
  | "trade_payables"
  | "short_term_borrowings"
  | "other_current_liabilities"
  | "long_term_borrowings"
  | "other_non_current_liabilities"
  | "share_capital"
  | "retained_earnings"
  | "other_equity"
  | "personal_assets"
  | "total_assets_including_personal"
  | "personal_liabilities"
  | "personal_net_worth"
  | "total_liabilities_including_personal"
  | "total_net_worth_including_personal"
  | "unmapped";

export type BalanceSheetClassification =
  | "asset"
  | "current_asset"
  | "non_current_asset"
  | "liability"
  | "current_liability"
  | "non_current_liability"
  | "equity"
  | "unclassified";

export type SourcePageInput = {
  pageNumber: number;
  text?: string;
  extractionMethod?: ExtractionMethod;
  confidence?: number;
  missing?: boolean;
  imageOnly?: boolean;
  /** Reporting year established from this statement page or its nearby cover page. */
  reportingYear?: string;
};

export type SourceDocumentInput = {
  documentId: string;
  fileName: string;
  mimeType: string;
  sha256: string;
  pageCount: number;
  expectedPageCount?: number;
  synthetic?: boolean;
  processedAt?: string;
  processingVersion?: string;
};

export type ReportedValueInput = {
  period: string;
  raw: string;
  value?: number | null;
  confidence?: number;
  columnIndex?: number;
};

export type LineItemInput = {
  id?: string;
  page: number;
  originalLabel: string;
  englishLabel?: string;
  sourceRowCode?: string;
  concept?: BalanceSheetConcept;
  classification?: BalanceSheetClassification;
  isTotal?: boolean;
  values: ReportedValueInput[];
  extractionMethod?: ExtractionMethod;
  confidence?: number;
};

export type BalanceSheetInput = {
  source: SourceDocumentInput;
  pages: SourcePageInput[];
  reportingEntity?: string;
  reportingDate?: string;
  periods?: string[];
  currency?: string;
  unitLabel?: string;
  unitScale?: number;
  language?: DocumentLanguage;
  lineItems?: LineItemInput[];
};

export type SourceReference = {
  documentId: string;
  fileName: string;
  page: number;
  originalLabel: string;
  period: string;
  columnIndex: number;
  extractionMethod: ExtractionMethod;
  confidence: number;
};

export type LineItemValue = {
  period: string;
  rawReportedValue: string;
  reportedValue: number | null;
  normalizedValue: number | null;
  correction?: {
    correctedReportedValue: number;
    correctedNormalizedValue: number;
    reason: string;
    reviewer: string;
    at: string;
  };
  source: SourceReference;
};

export type BalanceSheetLineItem = {
  id: string;
  originalLabel: string;
  englishLabel: string;
  translationStatus: "source-english" | "canonical" | "review-required";
  sourceRowCode?: string;
  normalizedConcept: BalanceSheetConcept;
  classification: BalanceSheetClassification;
  isTotal: boolean;
  values: LineItemValue[];
  confidence: number;
  reviewStatus: ReviewStatus;
};

export type ReviewIssue = {
  id: string;
  code:
    | "MISSING_PAGE"
    | "OCR_REQUIRED"
    | "OCR_LOW_CONFIDENCE"
    | "STATEMENT_PAGE_NOT_FOUND"
    | "REQUIRED_TOTAL_MISSING"
    | "ACCOUNTING_EQUATION_MISMATCH"
    | "NET_ASSETS_MISMATCH"
    | "SUBTOTAL_MISMATCH"
    | "ROUNDING_DIFFERENCE"
    | "SIGN_ANOMALY"
    | "CLASSIFICATION_ANOMALY"
    | "COMPARATIVE_PERIOD_DISCREPANCY"
    | "OPENING_CLOSING_INCONSISTENCY";
  severity: IssueSeverity;
  message: string;
  period?: string;
  lineItemId?: string;
  difference?: number;
  sourceRefs: SourceReference[];
};

export type ArithmeticCheck = {
  id: string;
  period: string;
  formula: "assets = liabilities + equity" | "net assets = assets - liabilities" | "reported liabilities + equity total = liabilities + equity" | "subtotal = underlying lines";
  leftValue: number | null;
  rightValue: number | null;
  difference: number | null;
  status: "passed" | "failed" | "not-testable";
  inputs: Array<{ concept: BalanceSheetConcept; value: number | null; lineItemId?: string }>;
};

export type AuditEvent = {
  id: string;
  action: "created" | "corrected" | "line-approved" | "statement-approved" | "approval-revoked";
  actor: string;
  at: string;
  detail: string;
};

export type BalanceSheetReview = {
  schemaVersion: typeof BALANCE_SHEET_SCHEMA_VERSION;
  reviewId: string;
  capability: {
    disposition: "EXISTING AGENT — SPECIALIZED CAPABILITY";
    ownerAgentId: "agent:TL-A008";
    ownerAgentName: "Company Verification Agent";
    supportingAgentIds: string[];
  };
  source: SourceDocumentInput;
  pages: SourcePageInput[];
  statement: {
    reportingEntity: string;
    reportingDate: string;
    periods: string[];
    currency: string;
    unitLabel: string;
    unitScale: number;
    language: DocumentLanguage;
  };
  lineItems: BalanceSheetLineItem[];
  arithmeticChecks: ArithmeticCheck[];
  issues: ReviewIssue[];
  review: {
    status: StatementStatus;
    reviewer?: string;
    approvedAt?: string;
    auditTrail: AuditEvent[];
  };
};

export type RecordComparison = {
  leftReviewId: string;
  rightReviewId: string;
  overlaps: Array<{
    period: string;
    concept: BalanceSheetConcept;
    leftValue: number;
    rightValue: number;
    difference: number;
    matches: boolean;
  }>;
  issues: ReviewIssue[];
};

const conceptRules: Array<{
  concept: BalanceSheetConcept;
  classification: BalanceSheetClassification;
  isTotal?: boolean;
  patterns: RegExp[];
}> = [
  { concept: "total_assets_including_personal", classification: "asset", isTotal: true, patterns: [/^total assets including personal assets$/i, /^total farm and personal assets$/i] },
  { concept: "total_liabilities_including_personal", classification: "liability", isTotal: true, patterns: [/^total liabilities including personal liabilities$/i, /^total farm and personal liabilities$/i] },
  { concept: "total_net_worth_including_personal", classification: "equity", isTotal: true, patterns: [/^total net worth including personal assets and liabilities$/i, /^total farm and personal net worth$/i] },
  { concept: "personal_assets", classification: "asset", patterns: [/^(?:total )?personal assets$/i] },
  { concept: "personal_liabilities", classification: "liability", patterns: [/^(?:total )?personal liabilities$/i] },
  { concept: "personal_net_worth", classification: "equity", patterns: [/^personal net worth$/i] },
  { concept: "total_assets", classification: "asset", isTotal: true, patterns: [/^total (?:farm )?assets$/i, /^assets(?: total)?$/i, /^итого активы?$/i, /^баланс.*актив/i, /^jami aktivlar$/i, /^баланс активи бўйича жами/i] },
  { concept: "total_liabilities_and_equity", classification: "equity", isTotal: true, patterns: [/^total liabilities\s*(?:&|and)\s*(?:(?:owners?|(?:share|stock)holders?)[’'s\s-]*(?:equity)?|partners?[’'s\s-]*(?:equity|deficit)|net worth)$/i, /^equity and liabilities$/i, /^liabilities,?\s*provisions and equity$/i] },
  { concept: "total_liabilities", classification: "liability", isTotal: true, patterns: [/^total (?:farm )?liabilities$/i, /^liabilities$/i, /^итого обязательств/i, /^jami majburiyatlar$/i, /^ii бўлим бўйича жами/i] },
  { concept: "owners_equity", classification: "equity", isTotal: true, patterns: [/^(?:total )?(?:(?:owners?|(?:share|stock)holders?)[’'s\s-]*)?equity$/i, /^(?:total )?partners?[’'s\s-]*(?:equity|deficit)$/i, /^members?[’']? funds$/i, /^farm net worth$/i, /^капитал( и резервы)?$/i, /^собственный капитал$/i, /^jami xususiy kapital$/i] },
  { concept: "net_assets", classification: "equity", isTotal: true, patterns: [/^net assets$/i, /^чистые активы$/i, /^sof aktivlar$/i] },
  { concept: "current_assets", classification: "current_asset", isTotal: true, patterns: [/^total current assets$/i, /^current assets$/i, /^оборотные активы$/i, /^jami joriy aktivlar$/i, /^ii бўлим бўйича жами/i] },
  { concept: "non_current_assets", classification: "non_current_asset", isTotal: true, patterns: [/^total non.?current assets$/i, /^non.?current assets$/i, /^fixed assets$/i, /^i бўлим бўйича жами/i] },
  { concept: "current_liabilities", classification: "current_liability", isTotal: true, patterns: [/^total current liabilities$/i, /^current liabilities$/i, /^short.?term liabilities$/i, /^amounts falling due within one year$/i, /^краткосрочные обязательства$/i, /^jami joriy majburiyatlar$/i, /^жорий мажбуриятлар, жами/i] },
  { concept: "non_current_liabilities", classification: "non_current_liability", isTotal: true, patterns: [/^total non.?current liabilities$/i, /^non.?current liabilities$/i, /^(?:total )?long.?term liabilities$/i, /^узоқ муддатли мажбуриятлар, жами/i] },
  { concept: "cash_and_cash_equivalents", classification: "current_asset", patterns: [/cash( and cash equivalents)?/i, /денежн/i, /pul mablag/i, /пул маблағлари/i, /ҳисоб-китоб счётидаги пул/i] },
  { concept: "trade_receivables", classification: "current_asset", patterns: [/trade (and other )?receivables/i, /accounts receivable/i, /^receivables from affiliates$/i, /дебитор/i, /debitor/i] },
  { concept: "inventories", classification: "current_asset", patterns: [/inventor/i, /запас/i, /tovar.?moddiy/i, /товар-моддий/i, /fertilizer and supplies/i, /growing crops/i, /crops held for sale/i, /market livestock/i] },
  { concept: "other_current_assets", classification: "current_asset", patterns: [/other current assets/i, /prepaid expenses?/i, /current portion of savings/i, /прочие оборотные/i, /boshqa joriy aktiv/i] },
  { concept: "property_plant_equipment", classification: "non_current_asset", patterns: [/property.*plant.*equipment/i, /^equipment$/i, /^property$/i, /machinery and equipment/i, /^buildings$/i, /^land$/i, /fixed assets/i, /основные средства/i, /asosiy vositalar/i, /асосий воситалар/i] },
  { concept: "intangible_assets", classification: "non_current_asset", patterns: [/intangible assets/i, /goodwill.*intangibles/i, /^goodwill$/i, /нематериальные активы/i, /nomoddiy aktivlar/i, /номоддий активлар/i] },
  { concept: "other_non_current_assets", classification: "non_current_asset", patterns: [/other non.?current assets/i, /^other assets$/i, /breeding livestock/i, /investments? in cooperatives/i, /прочие внеоборотные/i, /boshqa uzoq muddatli aktiv/i] },
  { concept: "trade_payables", classification: "current_liability", patterns: [/trade (and other )?payables/i, /accounts payable/i, /кредитор/i, /kreditor/i, /мол етказиб берувчилар ва пудратчиларга қарз/i] },
  { concept: "short_term_borrowings", classification: "current_liability", patterns: [/short.?term borrow/i, /current borrow/i, /current loans? due within/i, /current portion(?:\s*[-:]| of).*long.?term debt/i, /current portion of term debt/i, /^commercial paper$/i, /operating debt/i, /borrowed principal due within/i, /краткосрочн.*за[её]м/i, /qisqa muddatli qarz/i] },
  { concept: "other_current_liabilities", classification: "current_liability", patterns: [/other current liabilities/i, /accrued expenses?/i, /accrued interest/i, /income (?:&|and) social security taxes payable/i, /^current portion:\s*deferred taxes/i, /real estate and personal property taxes/i, /^taxes payable$/i, /^(?:unearned|deferred) revenue$/i, /salar(?:y|ies) payable/i, /income taxes? payable/i, /warranty liabilit/i, /прочие краткосрочные/i, /boshqa joriy majburiyat/i] },
  { concept: "long_term_borrowings", classification: "non_current_liability", patterns: [/long.?term (?:borrow|debt|loans?)/i, /intermediate loans?/i, /term debt/i, /non.?current borrow/i, /долгосрочн.*за[её]м/i, /uzoq muddatli qarz/i] },
  { concept: "other_non_current_liabilities", classification: "non_current_liability", patterns: [/other (?:non.?current|long.?term) liabilities/i, /^provisions(?: for liabilities and charges)?$/i, /^deferred income$/i, /noncurrent portion:\s*deferred taxes/i, /прочие долгосрочные/i, /boshqa uzoq muddatli majburiyat/i] },
  { concept: "share_capital", classification: "equity", patterns: [/(?:share|equity) capital/i, /common stock.*additional paid.?in capital/i, /уставн.*капитал/i, /ustav kapital/i, /устав капитали/i] },
  { concept: "retained_earnings", classification: "equity", patterns: [/retained earnings/i, /accumulated (deficit|loss|profit)/i, /нераспределенн.*прибыл/i, /непокрыт.*убыт/i, /taqsimlanmagan/i, /тақсимланмаган фойда/i] },
  { concept: "other_equity", classification: "equity", patterns: [/other (reserves|equity)/i, /accumulated other comprehensive (?:income|loss)/i, /прочие резервы/i, /boshqa kapital/i] },
];

const requiredConcepts: BalanceSheetConcept[] = [
  "total_assets",
  "total_liabilities",
  "owners_equity",
  "current_assets",
  "current_liabilities",
];

const statementPatterns = [/balance sheet/i, /statement of financial position/i, /бухгалтерский баланс/i, /бухгалтерия баланси/i, /баланс/i, /moliyaviy holat/i];

function isStatementTitleLine(line: string) {
  const normalized = line.replace(/\s+/g, " ").trim();
  return /^(?:audited\s+)?(?:consolidated\s+)?balance sheets?(?:\s+as\s+(?:of|at)\s+.+)?(?:\s*\((?:continued|unaudited)\))?$/i.test(normalized)
    || /^(?:consolidated\s+)?statements? of financial position(?:\s+as\s+(?:of|at)\s+.+)?(?:\s*\((?:continued|unaudited)\))?$/i.test(normalized)
    || /^accounting balance(?: sheet)?(?:\s*[-–]\s*|\s+)form\s+(?:no\.?|n[eo])?\s*1\b/i.test(normalized)
    || /^бухгалтерия баланси(?:\s|№|$)/iu.test(normalized)
    || /^бухгалтерский баланс(?:\s|№|$)/iu.test(normalized);
}

function isIncomeStatementTitleLine(line: string) {
  const normalized = line.replace(/\s+/g, " ").trim();
  return /^(?:audited\s+)?(?:consolidated\s+)?statements? of (?:(?:operations|income|profit(?: or loss)?)(?: and comprehensive income)?|comprehensive income)(?:\s+for(?:\s+the)?\s+period)?(?:\s*\(unaudited\))?$/i.test(normalized)
    || /^(?:consolidated\s+)?income statements?(?:\s*\(unaudited\))?$/i.test(normalized)
    || /^profit and loss account(?:\s+for)?$/i.test(normalized)
    || /^reports? on financial results?\s*[-–]?\s*form\s+(?:no\.?|n[eo])?\s*2\b/i.test(normalized)
    || /молиявий натижалар.*(?:ҳисобот|хисобот)/iu.test(normalized);
}

export const CONCEPT_ENGLISH_LABELS: Record<BalanceSheetConcept, string> = {
  total_assets: "Total assets",
  total_liabilities: "Total liabilities",
  total_liabilities_and_equity: "Total liabilities and equity",
  owners_equity: "Owners’ equity",
  net_assets: "Net assets",
  current_assets: "Current assets",
  non_current_assets: "Non-current assets",
  current_liabilities: "Current liabilities",
  non_current_liabilities: "Non-current liabilities",
  cash_and_cash_equivalents: "Cash and cash equivalents",
  trade_receivables: "Trade receivables",
  inventories: "Inventories",
  other_current_assets: "Other current assets",
  property_plant_equipment: "Property, plant and equipment",
  intangible_assets: "Intangible assets",
  other_non_current_assets: "Other non-current assets",
  trade_payables: "Trade payables",
  short_term_borrowings: "Short-term borrowings",
  other_current_liabilities: "Other current liabilities",
  long_term_borrowings: "Long-term borrowings",
  other_non_current_liabilities: "Other non-current liabilities",
  share_capital: "Share capital",
  retained_earnings: "Retained earnings / accumulated loss",
  other_equity: "Other equity",
  personal_assets: "Personal assets",
  total_assets_including_personal: "Total assets including personal assets",
  personal_liabilities: "Personal liabilities",
  personal_net_worth: "Personal net worth",
  total_liabilities_including_personal: "Total liabilities including personal liabilities",
  total_net_worth_including_personal: "Total net worth including personal assets and liabilities",
  unmapped: "Unmapped balance-sheet item",
};

const UZBEK_FORM_1_ROW_CONCEPTS: Partial<Record<string, BalanceSheetConcept>> = {
  "010": "property_plant_equipment",
  "011": "property_plant_equipment",
  "012": "property_plant_equipment",
  "020": "intangible_assets",
  "021": "intangible_assets",
  "022": "intangible_assets",
  "130": "non_current_assets",
  "140": "inventories",
  "210": "trade_receivables",
  "320": "cash_and_cash_equivalents",
  "370": "other_current_assets",
  "380": "other_current_assets",
  "390": "current_assets",
  "400": "total_assets",
  "410": "share_capital",
  "450": "retained_earnings",
  "480": "owners_equity",
  "490": "non_current_liabilities",
  "570": "long_term_borrowings",
  "600": "current_liabilities",
  "601": "other_current_liabilities",
  "602": "other_current_liabilities",
  "610": "trade_payables",
  "730": "short_term_borrowings",
  "740": "short_term_borrowings",
  "750": "other_current_liabilities",
  "760": "other_current_liabilities",
  "770": "total_liabilities",
  "780": "total_liabilities_and_equity",
};

function uzbekForm1Concept(sourceRowCode: string) {
  const direct = UZBEK_FORM_1_ROW_CONCEPTS[sourceRowCode];
  if (direct) return direct;
  const row = Number(sourceRowCode);
  if (row >= 30 && row <= 120) return "other_non_current_assets" as const;
  if (row >= 140 && row <= 180) return "inventories" as const;
  if (row >= 190 && row <= 200) return "other_current_assets" as const;
  if (row >= 210 && row <= 310) return "trade_receivables" as const;
  if (row >= 320 && row <= 360) return "cash_and_cash_equivalents" as const;
  if (row >= 370 && row <= 380) return "other_current_assets" as const;
  if ([420, 430, 440, 460, 470].includes(row)) return "other_equity" as const;
  if ((row >= 500 && row <= 590) || row === 491) return "other_non_current_liabilities" as const;
  if ((row >= 620 && row <= 720) || [601, 602].includes(row)) return "other_current_liabilities" as const;
  return undefined;
}

const UZBEK_FORM_1_ENGLISH_LABELS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /^Бошланғич \(қайта тиклаш\) қиймати/i, label: "Historical (replacement) cost" },
  { pattern: /^Эскириш суммаси/i, label: "Accumulated depreciation" },
  { pattern: /^қолдиқ \(баланс\) қиймати/i, label: "Carrying amount (net book value)" },
  { pattern: /^Номоддий активлар/i, label: "Intangible assets" },
  { pattern: /^Бошланғич қиймати/i, label: "Initial cost" },
  { pattern: /^Амортизация суммаси/i, label: "Accumulated amortization" },
  { pattern: /^Узоқ муддатли инвестициялар, жами/i, label: "Total long-term investments" },
  { pattern: /^Қимматли қоғозлар/i, label: "Securities" },
  { pattern: /^Шўъба хўжалик жамиятларига инвестициялар/i, label: "Investments in subsidiaries" },
  { pattern: /^қарам хўжалик жамиятларига инвестициялар/i, label: "Investments in associates" },
  { pattern: /^Чет эл капитали мавжуд бўлган корхоналарга инвестициялар/i, label: "Investments in foreign-capital enterprises" },
  { pattern: /^Бошқа узоқ муддатли инвестициялар/i, label: "Other long-term investments" },
  { pattern: /^Ўрнатиладиган асбоб-ускуналар/i, label: "Equipment for installation" },
  { pattern: /^Капитал қўйилмалар/i, label: "Capital investments" },
  { pattern: /^Узоқ муддатли дебиторлик қарзлари/i, label: "Long-term receivables" },
  { pattern: /^Долгосрочные отсроченные расходы/i, label: "Long-term deferred expenses" },
  { pattern: /^Товар-моддий захиралари, жами/i, label: "Total inventories" },
  { pattern: /^Ишлаб чиқариш захиралари/i, label: "Production inventories" },
  { pattern: /^Тугалланмаган ишлаб чиқариш/i, label: "Work in progress" },
  { pattern: /^Тайёр маҳсулот/i, label: "Finished goods" },
  { pattern: /^Товарлар/i, label: "Goods for resale" },
  { pattern: /^Келгуси давр харажатлари/i, label: "Prepaid expenses" },
  { pattern: /^Кечиктирилган харажатлар/i, label: "Deferred expenses" },
  { pattern: /^Дебиторлар, жами/i, label: "Total receivables" },
  { pattern: /^шундан: муддати ўтган/i, label: "Of which: overdue" },
  { pattern: /^Харидор ва буюртмачиларнинг қарзи/i, label: "Trade receivables from customers" },
  { pattern: /^Ажратилган бўлинмаларнинг қарзи/i, label: "Receivables from separate divisions" },
  { pattern: /^Шўъба ва қарам хўжалик жамиятларнинг қарзи/i, label: "Receivables from subsidiaries and associates" },
  { pattern: /^Ходимларга берилган бўнаклар/i, label: "Advances to employees" },
  { pattern: /^Мол етказиб берувчилар ва пудратчиларга берилган бўнаклар/i, label: "Advances to suppliers and contractors" },
  { pattern: /^Бюджетга солиқлар ва бошқа мажбурий тўловлар бўйича бўнак/i, label: "Advance payments of taxes and mandatory charges" },
  { pattern: /^Мақсадли давлат жамғармалари ва суғурталар бўйича бўнак/i, label: "Advances to state funds and insurers" },
  { pattern: /^Таъсисчиларнинг устав капиталига улушлар бўйича қарзи/i, label: "Founders’ receivables for capital contributions" },
  { pattern: /^Ходимларнинг бошқа операциялар бўйича қарзи/i, label: "Other employee receivables" },
  { pattern: /^Бошқа дебиторлик қарзлари/i, label: "Other receivables" },
  { pattern: /^Пул маблағлари, жами/i, label: "Total cash and cash equivalents" },
  { pattern: /^Кассадаги пул маблағлари/i, label: "Cash on hand" },
  { pattern: /^Ҳисоб-китоб счётидаги пул маблағлари/i, label: "Cash in settlement accounts" },
  { pattern: /^Чет эл валютасидаги пул маблағлари/i, label: "Foreign-currency cash" },
  { pattern: /^Бошқа пул маблағлари ва эквивалентлари/i, label: "Other cash and cash equivalents" },
  { pattern: /^қисқа муддатли инвестициялар/i, label: "Short-term investments" },
  { pattern: /^Бошқа жорий активлар/i, label: "Other current assets" },
  { pattern: /^Устав капитали/i, label: "Share capital" },
  { pattern: /^Қўшилган капитал/i, label: "Additional paid-in capital" },
  { pattern: /^Резерв капитали/i, label: "Reserve capital" },
  { pattern: /^Сотиб олинган хусусий акциялар/i, label: "Treasury shares" },
  { pattern: /^Тақсимланмаган фойда/i, label: "Retained earnings (accumulated loss)" },
  { pattern: /^Мақсадли тушумлар/i, label: "Targeted receipts" },
  { pattern: /^Келгуси давр харажатлари ва тўловлари учун захиралар/i, label: "Provisions for future expenses and payments" },
  { pattern: /^Узоқ муддатли мажбуриятлар, жами/i, label: "Total non-current liabilities" },
  { pattern: /^шу жумладан: узоқ муддатли кредиторлик/i, label: "Of which: long-term payables" },
  { pattern: /^Мол етказиб берувчилар ва пудратчиларга узоқ муддатли қарз/i, label: "Long-term payables to suppliers and contractors" },
  { pattern: /^Ажратилган бўлинмаларга узоқ муддатли қарз/i, label: "Long-term payables to separate divisions" },
  { pattern: /^Шўъба ва қарам хўжалик жамиятларга узоқ муддатли қарз/i, label: "Long-term payables to subsidiaries and associates" },
  { pattern: /^Узоқ муддатли кечиктирилган даромадлар/i, label: "Long-term deferred income" },
  { pattern: /^Солиқ ва бошқа мажбурий тўловлар бўйича узоқ муддатли/i, label: "Long-term deferred tax and mandatory-payment liabilities" },
  { pattern: /^Бошқа узоқ муддатли кечиктирилган мажбуриятлар/i, label: "Other long-term deferred liabilities" },
  { pattern: /^Харидорлар ва буюртмачилардан олинган бўнаклар/i, label: "Advances received from customers" },
  { pattern: /^Узоқ муддатли банк кредитлари/i, label: "Long-term bank loans" },
  { pattern: /^Узоқ муддатли қарзлар/i, label: "Other long-term borrowings" },
  { pattern: /^Бошқа узоқ муддатли кредиторлик қарзлар/i, label: "Other long-term payables" },
  { pattern: /^Жорий мажбуриятлар, жами/i, label: "Total current liabilities" },
  { pattern: /^шу жумладан: жорий кредиторлик/i, label: "Of which: current payables" },
  { pattern: /^Мол етказиб берувчилар ва пудратчиларга қарз/i, label: "Trade payables to suppliers and contractors" },
  { pattern: /^Ажратилган бўлинмаларга қарз/i, label: "Payables to separate divisions" },
  { pattern: /^Шўъба ва қарам хўжалик жамиятларга қарз/i, label: "Payables to subsidiaries and associates" },
  { pattern: /^Кечиктирилган даромадлар/i, label: "Deferred income" },
  { pattern: /^Солиқ ва бошқа мажбурий тўловлар бўйича кечиктирилган/i, label: "Deferred tax and mandatory-payment liabilities" },
  { pattern: /^Бошқа кечиктирилган мажбуриятлар/i, label: "Other deferred liabilities" },
  { pattern: /^Олинган бўнаклар/i, label: "Advances received" },
  { pattern: /^Бюджетга тўловлар бўйича қарз/i, label: "Taxes and mandatory charges payable" },
  { pattern: /^Суғурталар бўйича қарз/i, label: "Insurance payable" },
  { pattern: /^Мақсадли давлат жамғармаларига тўловлар бўйича қарз/i, label: "State-fund contributions payable" },
  { pattern: /^Таъсисчиларга бўлган қарзлар/i, label: "Amounts payable to founders" },
  { pattern: /^Меҳнатга ҳақ тўлаш бўйича қарз/i, label: "Payroll payable" },
  { pattern: /^Қисқа муддатли банк кредитлари/i, label: "Short-term bank loans" },
  { pattern: /^Қисқа муддатли қарзлар/i, label: "Other short-term borrowings" },
  { pattern: /^Узоқ муддатли мажбуриятларнинг жорий қисми/i, label: "Current portion of long-term liabilities" },
  { pattern: /^Бошқа кредиторлик қарзлар/i, label: "Other payables" },
];

function cleanLabel(label: string) {
  return label.replace(/^\s*\d+(?:[.)]\s*|\s+)/, "").replace(/\s+/g, " ").trim();
}

export function normalizeConcept(label: string, sourceRowCode?: string) {
  const cleaned = cleanLabel(label).replace(/\s+(?:\(\d+(?:,\s*\d+)*\)|\d{1,2}\)?)$/, "");
  // Uzbekistan Form No. 1 row codes retain the same meaning when the
  // statutory statement is rendered in English, Russian, or Uzbek.
  const rowConcept = sourceRowCode ? uzbekForm1Concept(sourceRowCode) : undefined;
  if (rowConcept) {
    return {
      concept: rowConcept,
      classification: inferClassification(rowConcept),
      isTotal: inferIsTotal(rowConcept),
    };
  }
  const rule = conceptRules.find((candidate) => candidate.patterns.some((pattern) => pattern.test(cleaned)));
  return {
    concept: rule?.concept ?? "unmapped" as BalanceSheetConcept,
    classification: rule?.classification ?? "unclassified" as BalanceSheetClassification,
    isTotal: rule?.isTotal ?? false,
  };
}

type StatementSection = BalanceSheetClassification | null;

function sectionForHeading(line: string): StatementSection | undefined {
  const normalized = cleanLabel(line).replace(/:$/, "").trim();
  if (/^(?:current assets|оборотные активы|joriy aktivlar)$/i.test(normalized)) return "current_asset";
  if (/^(?:non.?current assets|long.?term assets|fixed assets|внеоборотные активы|uzoq muddatli aktivlar)$/i.test(normalized)) return "non_current_asset";
  if (/^(?:current liabilities|short.?term liabilities|краткосрочные обязательства|joriy majburiyatlar)$/i.test(normalized)) return "current_liability";
  if (/^(?:non.?current liabilities|long.?term liabilities|долгосрочные обязательства|uzoq muddatli majburiyatlar)$/i.test(normalized)) return "non_current_liability";
  if (/^(?:(?:share|stock)holders?[’'s\s-]*equity|owners?[’'s\s-]*equity|equity|net worth|reserves)$/i.test(normalized)) return "equity";
  if (/^assets$/i.test(normalized)) return "asset";
  if (/^liabilities(?: and (?:(?:share|stock)holders?[’'s\s-]*equity|net worth))?$/i.test(normalized)) return "liability";
  return undefined;
}

function normalizeConceptInSection(label: string, sourceRowCode: string | undefined, section: StatementSection) {
  const base = normalizeConcept(label, sourceRowCode);
  if (sourceRowCode) return base;
  const cleaned = cleanLabel(label).replace(/:$/, "").trim();
  if (/^marketable securities$/i.test(cleaned)) {
    if (section === "current_asset") return { concept: "other_current_assets" as const, classification: "current_asset" as const, isTotal: false };
    if (section === "non_current_asset") return { concept: "other_non_current_assets" as const, classification: "non_current_asset" as const, isTotal: false };
  }
  if (/^term debt$/i.test(cleaned)) {
    if (section === "current_liability") return { concept: "short_term_borrowings" as const, classification: "current_liability" as const, isTotal: false };
    if (section === "non_current_liability") return { concept: "long_term_borrowings" as const, classification: "non_current_liability" as const, isTotal: false };
  }
  if (base.concept === "unmapped" && section && section !== "asset" && section !== "liability") {
    return { ...base, classification: section };
  }
  return base;
}

function englishLabelFor(originalLabel: string, concept: BalanceSheetConcept, sourceRowCode?: string) {
  if (!/[а-яёўқғҳ]/i.test(originalLabel)) {
    return { englishLabel: originalLabel, translationStatus: "source-english" as const };
  }
  const totalLabel = sourceRowCode ? ({
    "130": "Total non-current assets",
    "390": "Total current assets",
    "400": "Total assets",
    "480": "Total owners’ equity",
    "490": "Total non-current liabilities",
    "600": "Total current liabilities",
    "770": "Total liabilities",
    "780": "Total liabilities and equity",
  } as Record<string, string>)[sourceRowCode] : undefined;
  if (totalLabel) return { englishLabel: totalLabel, translationStatus: "canonical" as const };
  const translated = UZBEK_FORM_1_ENGLISH_LABELS.find((candidate) => candidate.pattern.test(originalLabel));
  if (translated) return { englishLabel: translated.label, translationStatus: "canonical" as const };
  if (concept !== "unmapped") return { englishLabel: CONCEPT_ENGLISH_LABELS[concept], translationStatus: "canonical" as const };
  return { englishLabel: "Translation review required", translationStatus: "review-required" as const };
}

export function parseReportedNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed || /^(?:—|–|-|n\/a)$/i.test(trimmed)) return null;
  const negative = /^(?:(?:US|CA|AU|NZ|S)?[$€£₾])?\s*[({[].*[)}\]]$/.test(trimmed) || /^[-−]/.test(trimmed);
  let token = trimmed.replace(/[(){}[\]\s\u00a0'’]/g, "").replace(/^[-−]/, "").replace(/[^\d.,]/g, "");
  if (!token) return null;
  const lastComma = token.lastIndexOf(",");
  const lastDot = token.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    const decimal = lastComma > lastDot ? "," : ".";
    const grouping = decimal === "," ? /\./g : /,/g;
    token = token.replace(grouping, "").replace(decimal, ".");
  } else if (lastComma >= 0) {
    const decimals = token.length - lastComma - 1;
    token = decimals === 2 ? token.replace(",", ".") : token.replace(/,/g, "");
  } else if (lastDot >= 0) {
    const decimals = token.length - lastDot - 1;
    if (decimals === 3 && /^\d{1,3}(?:\.\d{3})+$/.test(token)) token = token.replace(/\./g, "");
  }
  const value = Number(token);
  return Number.isFinite(value) ? (negative ? -value : value) : null;
}

function detectLanguage(text: string): DocumentLanguage {
  if (/[ўқғҳ]/i.test(text)) return "uz";
  if (/[а-яё]/i.test(text)) return "ru";
  if (/[a-z]/i.test(text)) return "en";
  return "und";
}

function detectCurrency(text: string) {
  // Prefer an explicit statement-level measurement declaration over isolated
  // symbols elsewhere on the page. OCR can turn table artefacts into "$", and
  // a local-currency statement may legitimately mention foreign-currency cash.
  const declaredCurrency = text.match(/\b(?:unit of measurement|currency(?:\s*\/\s*units?)?|amounts?(?:\s+are)?(?:\s+(?:reported|presented|stated))?\s+in|in)\b[^\r\n]{0,100}\b(k?DKK|USD|EUR|UZS|RUB|KZT|GBP|GEL|US dollars?|sou?ms?|so['’]?m|с[ўу]м(?:ов)?)\b/iu)?.[1] ?? "";
  if (/^k?DKK$/i.test(declaredCurrency)) return "DKK";
  if (/^(?:UZS|sou?ms?|so['’]?m|с[ўу]м(?:ов)?)$/iu.test(declaredCurrency)) return "UZS";
  if (/^(?:USD|US dollars?)$/i.test(declaredCurrency)) return "USD";
  if (/^EUR$/i.test(declaredCurrency)) return "EUR";
  if (/^RUB$/i.test(declaredCurrency)) return "RUB";
  if (/^KZT$/i.test(declaredCurrency)) return "KZT";
  if (/^GBP$/i.test(declaredCurrency)) return "GBP";
  if (/^GEL$/i.test(declaredCurrency)) return "GEL";
  if (/\b(?:USD|US dollars?)\b|\$/i.test(text)) return "USD";
  if (/\bkDKK\b|\bDKK\b/i.test(text)) return "DKK";
  if (/\bEUR\b|€/i.test(text)) return "EUR";
  if (/\bUZS\b|с[ўу]м|\b(?:sou?ms?|so['’]?m)\b/i.test(text)) return "UZS";
  if (/\bRUB\b|руб/i.test(text)) return "RUB";
  if (/\bKZT\b|тенге/i.test(text)) return "KZT";
  if (/\bGBP\b|£/i.test(text)) return "GBP";
  if (/₾|\bGEL\b/i.test(text)) return "GEL";
  return "UNSPECIFIED";
}

function detectUnits(text: string) {
  if (/\b(?:million|millions|mln|млн)\b/i.test(text)) return { unitLabel: "millions", unitScale: 1_000_000 };
  if (/\b(?:thousand|thousands|тыс\.?|ming|k(?:DKK|EUR|USD|GBP))\b/i.test(text) || /минг/iu.test(text)) return { unitLabel: "thousands", unitScale: 1_000 };
  return { unitLabel: "units", unitScale: 1 };
}

function hasExplicitUnitScale(text: string) {
  return /\b(?:million|millions|mln|млн|thousand|thousands|тыс\.?|ming|k(?:DKK|EUR|USD|GBP))\b/i.test(text) || /минг/iu.test(text);
}

function hasStatementCurrencyFigures(text: string) {
  return /(?:\b(?:USD|EUR|RUB|KZT|GBP|GEL)\b|(?:US|CA|AU|NZ|S)?[$€£₾])\s*\(?[-−]?\d/i.test(text);
}

function reportingYearFromText(text: string) {
  const highConfidencePatterns = [
    /(?:^|\n)\s*((?:19|20)\d{2})\s*йил\s+\d+\s*(?:\n|$)/imu,
    /\bйиллик\s+чорак\s+((?:19|20)\d{2})\b/iu,
    /\b(?:as of|year ended|for the year ended)\D{0,40}((?:19|20)\d{2})\b/iu,
    /\b((?:19|20)\d{2})\s+(?:consolidated\s+)?balance sheet\b/iu,
    /\bbalance sheet\D{0,40}((?:19|20)\d{2})\b/iu,
    /\baccounting balance(?: sheet)?(?:\s*[-–]\s*|\s+)form\b[^\n]{0,100}\b((?:19|20)\d{2})\b/iu,
    /\breports? on financial results?\b[^\n]{0,100}\b((?:19|20)\d{2})\b/iu,
    /\bfinancial statements?\b[\s\S]{0,240}\bfor\s+((?:19|20)\d{2})\b/iu,
    /\b(?:first|second|third|fourth|[1-4](?:st|nd|rd|th))\s+quarter\s+(?:of\s+)?((?:19|20)\d{2})\b/iu,
    /\bon\s+((?:19|20)\d{2})\s+year\s+(?:[1-4]|first|second|third|fourth)\s+quarter\b/iu,
  ];
  for (const pattern of highConfidencePatterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

export function detectPeriods(text: string, reportingYear?: string | null) {
  const periods: string[] = [];
  const reliableReportingYear = reportingYear ?? reportingYearFromText(text);
  const headerLines = text.split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 24);
  const headerText = headerLines.join(" ");
  const statutoryForm = /(?:accounting balance(?: sheet)?\s*[-–]?\s*form\s+(?:no\.?|n[eo])?\s*1|reports? on financial results?\s*[-–]?\s*form\s+(?:no\.?|n[eo])?\s*2)/i.test(headerText);
  const statutoryRowsWithComparatives = text.split(/\r?\n/)
    .map((line) => parseStatementLine(line))
    .filter((row) => (row?.rawValues.length ?? 0) >= 2).length;
  if (reliableReportingYear && statutoryForm && statutoryRowsWithComparatives >= 2) {
    return [String(Number(reliableReportingYear) - 1), reliableReportingYear];
  }
  if (/Ҳисобот даври\s*бошига/i.test(text) && /Ҳисобот даври\s*охирига/i.test(text)) {
    return reliableReportingYear
      ? [String(Number(reliableReportingYear) - 1), reliableReportingYear]
      : ["Beginning of reporting period", "End of reporting period"];
  }
  if (/Ўтган йилнинг шу даврида/i.test(text) && /Ҳисобот даврида/i.test(text)) {
    return reliableReportingYear
      ? [String(Number(reliableReportingYear) - 1), reliableReportingYear]
      : ["Prior-year comparable period", "Reporting period"];
  }
  const hasEnglishOpening = /\bat\s*the beginning of\b/i.test(headerText);
  const hasEnglishClosing = /\b(?:at|by)\s+the end of\b/i.test(headerText);
  const hasEnglishReportingPeriod = /\breporting period\b/i.test(headerText);
  if (hasEnglishOpening && hasEnglishClosing && hasEnglishReportingPeriod) {
    return reliableReportingYear
      ? [String(Number(reliableReportingYear) - 1), reliableReportingYear]
      : ["Beginning of reporting period", "End of reporting period"];
  }
  const hasEnglishComparable = /\b(?:(?:for (?:the )?)?corresponding period (?:of (?:the )?)?(?:last|previous) year|at this time last year)\b/i.test(headerText);
  const hasEnglishReporting = /\b(?:for (?:the )?(?:accounting|reporting) period|during the reporting period)\b/i.test(headerText);
  if (hasEnglishComparable && hasEnglishReporting) {
    return reliableReportingYear
      ? [String(Number(reliableReportingYear) - 1), reliableReportingYear]
      : ["Prior-year comparable period", "Reporting period"];
  }
  const namedDatePattern = /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,?\s+(?:19|20)\d{2})?\b/gi;
  const namedDates = Array.from(headerText.matchAll(namedDatePattern), (match) => match[0].replace(/\s+/g, " "));
  for (const period of namedDates) {
    if (!periods.some((candidate) => candidate.toLocaleLowerCase() === period.toLocaleLowerCase())) periods.push(period);
  }
  if (periods.length >= 2) {
    if (/\baverage\b/i.test(text)) periods.push("Average");
    return periods.slice(0, 4);
  }
  if (periods.length === 1) {
    const namedYear = periods[0].match(/\b(?:19|20)\d{2}\b/)?.[0];
    for (const match of headerText.matchAll(/\b(?:19|20)\d{2}\b/g)) {
      if (match[0] !== namedYear && !periods.includes(match[0])) periods.push(match[0]);
    }
    if (periods.length >= 2) return periods.slice(0, 4);
  }
  const numericDateYears = Array.from(headerText.matchAll(/\b\d{1,2}[./-]\d{1,2}[./-]((?:19|20)\d{2})\b/g), (match) => match[1]);
  for (const year of numericDateYears) if (!periods.includes(year)) periods.push(year);
  if (periods.length >= 2) return periods.slice(0, 4);
  const hasPrimaryStatementTitle = headerLines.some((line) => isStatementTitleLine(line) || isIncomeStatementTitleLine(line));
  if (hasPrimaryStatementTitle) {
    // Primary statements often print the comparative years as separate cells
    // (for example `Note 2023 2022`) or on separate lines. Retain their
    // left-to-right/source order instead of sorting them chronologically.
    for (const match of headerLines.slice(0, 16).join(" ").matchAll(/\b(?:19|20)\d{2}\b/g)) {
      if (!periods.includes(match[0])) periods.push(match[0]);
    }
    if (periods.length >= 2) return periods.slice(0, 4);
  }
  const ordinalPeriods = Array.from(headerText.matchAll(/\b(?:month|period|quarter|qtr|column)\s*[-:]?\s*\d+\b/gi));
  if (ordinalPeriods.length >= 2) {
    for (const match of ordinalPeriods) {
      const [kind, number] = match[0].replace(/[-:]/g, " ").trim().split(/\s+/);
      const normalized = `${kind[0].toUpperCase()}${kind.slice(1).toLowerCase()} ${number}`;
      if (!periods.includes(normalized)) periods.push(normalized);
    }
  }
  if (periods.length >= 2) return periods.slice(0, 4);
  const yearHeaderText = headerLines.filter((line) => /\b(?:as of|year|period|ended|date)\b/i.test(line)
    || /^(?:(?:19|20)\d{2}[\s|,;]*){1,4}$/.test(line)).join(" ");
  for (const match of yearHeaderText.matchAll(/\b(?:19|20)\d{2}\b/g)) {
    if (!periods.includes(match[0])) periods.push(match[0]);
  }
  return periods.slice(0, 4);
}

function repairEntityOcr(value: string) {
  return value.replace(/(?<=[A-Z])!(?=\s+[A-Z])/g, "I");
}

function legalEntityFromLines(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
  for (const line of lines) {
    const memberMatch = line.match(/\bmembers? of\s+([A-Z][A-Za-z&.'’ -]{2,80}?\s+Society of the UK)\b/i);
    if (memberMatch?.[1]) return repairEntityOcr(memberMatch[1].trim());
    const legalMatch = line.match(/^(?:\d+\s+)?(.{2,100}?\b(?:A\/S|AG|GmbH|Ltd\.?|LLC|JSC|Inc\.?|plc))(?=\s|$|[,;:()])/i);
    if (legalMatch?.[1]) return repairEntityOcr(legalMatch[1].trim());
  }
  return null;
}

function detectEntity(text: string) {
  const legalEntity = legalEntityFromLines(text);
  if (legalEntity) return legalEntity;
  const uzbekCompany = text.match(/["“«]([^"”»\r\n]{2,100})["”»]\s+MAS[`'’]?ULIYATI\s+CHEKLANGAN\s+JAMIYAT/iu);
  if (uzbekCompany?.[1]) return `${repairEntityOcr(uzbekCompany[1].trim())} LLC`;
  const reportAddressee = text.match(/(?:auditor(?:'s)?\s+report\s+is\s+addressed\s+to|founders?\s+and\s+management)\s*:\s*(?:OOO|ООО)\s+[«"“]?([A-Z][A-Z0-9 &'().-]{2,80}?)(?=[»"”]?\s*(?:\r?\n|$))/imu);
  if (reportAddressee?.[1]) return `${repairEntityOcr(reportAddressee[1].trim())} LLC`;
  const russianCompany = text.match(/\bООО\s+[«"“]([^»"”\r\n]{2,100})[»"”]/iu);
  if (russianCompany?.[1]) return `${repairEntityOcr(russianCompany[1].trim())} LLC`;
  const prefixedCompany = text.match(/(?:^|[\s:])(?:OOO|ООО)\s+[«"“]?([A-Z][A-Z0-9 &'().-]{2,80}?)(?=[»"”]?\s*(?:\r?\n|$))/imu);
  if (prefixedCompany?.[1]) return `${repairEntityOcr(prefixedCompany[1].trim())} LLC`;
  if (detectLanguage(text) === "uz") return "Unconfirmed reporting entity";
  const candidates = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 80);
  const titleLine = candidates.find((line) => statementPatterns.some((pattern) => pattern.test(line)) && /\b(?:for|of)\b/i.test(line));
  const titleMatch = titleLine?.match(/(?:balance sheet|statement of financial position)\s+(?:for|of)\s+(.+?)(?:\s+[—–-]\s*(?:19|20)\d{2}\b|$)/i);
  if (titleMatch?.[1]) return repairEntityOcr(titleMatch[1].trim());
  const credibleCandidate = (line: string) => !/[\t|]/.test(line)
    && !/\d/.test(line)
    && (line.match(/\p{L}/gu)?.length ?? 0) >= 3
    && line.length <= 100;
  const titleIndex = candidates.findIndex((line) => statementPatterns.some((pattern) => pattern.test(line)));
  const preamble = candidates.slice(0, titleIndex >= 0 ? titleIndex : Math.min(3, candidates.length));
  return repairEntityOcr(candidates.find((line) => credibleCandidate(line) && /\b(?:ltd|llc|jsc|inc|plc|company|corp|mchj|ооо|ао)\b/i.test(line))
    ?? preamble.find((line) => credibleCandidate(line) && normalizeConcept(line).concept === "unmapped" && !/^(?:description|assets?:?|liabilities:?|equity:?|notes?|average|month\s*\d+|period\s*\d+)$/i.test(line))
    ?? "Unconfirmed reporting entity");
}

function reportingDateFromText(text: string, reportingYear?: string | null) {
  const month = "January|February|March|April|May|June|July|August|September|October|November|December";
  const dayFirst = new RegExp(`\\b(?:balance sheets?|statements? of financial position)\\s+as\\s+(?:of|at)\\s+(\\d{1,2}\\s+(?:${month})\\s+(?:19|20)\\d{2})`, "i");
  const monthFirst = new RegExp(`\\b(?:balance sheets?|statements? of financial position)\\s+as\\s+(?:of|at)\\s+((?:${month})\\s+\\d{1,2},?\\s+(?:19|20)\\d{2})`, "i");
  const explicit = text.match(dayFirst)?.[1] ?? text.match(monthFirst)?.[1];
  if (explicit) return explicit.replace(/\s+/g, " ").trim();
  const dayMonth = text.match(new RegExp(`\\b(?:balance sheets?|statements? of financial position)\\s+as\\s+(?:of|at)\\s+(\\d{1,2}\\s+(?:${month}))\\b`, "i"))?.[1];
  return dayMonth && reportingYear ? `${dayMonth} ${reportingYear}` : null;
}

function inferClassification(concept: BalanceSheetConcept): BalanceSheetClassification {
  return conceptRules.find((rule) => rule.concept === concept)?.classification ?? "unclassified";
}

function inferIsTotal(concept: BalanceSheetConcept) {
  return conceptRules.find((rule) => rule.concept === concept)?.isTotal ?? false;
}

export function parseStatementLine(line: string, expectedValueCount = 0) {
  const tabParts = line.split("\t").map((part) => part.trim());
  if (tabParts.length >= 2) {
    const rowCodeIndex = tabParts.findIndex((part) => /^\d{3}$/.test(part));
    const collapsedRowCode = rowCodeIndex < 0 ? tabParts[0]?.match(/^(.*?)\s+(\d{3})$/) : undefined;
    if (rowCodeIndex > 0 || collapsedRowCode) {
      const label = collapsedRowCode?.[1]?.trim() ?? tabParts.slice(0, rowCodeIndex).filter(Boolean).join(" ");
      const sourceRowCode = collapsedRowCode?.[2] ?? tabParts[rowCodeIndex];
      const valueCells = collapsedRowCode ? tabParts.slice(1) : tabParts.slice(rowCodeIndex + 1);
      const rawValues = valueCells.map((part) => /^(?:[-−]?\d[\d .'’,]*[,.]\d{2}|—|–|-)$/.test(part) ? part : "");
      const lastValueIndex = rawValues.findLastIndex(Boolean);
      if (label && lastValueIndex >= 0) {
        const selected = rawValues.slice(0, Math.max(expectedValueCount, lastValueIndex + 1));
        while (expectedValueCount > 0 && selected.length < expectedValueCount) selected.push("");
        return { label, sourceRowCode, rawValues: selected.slice(0, expectedValueCount || selected.length) };
      }
      if (label && expectedValueCount > 0) return { label, sourceRowCode, rawValues: Array.from({ length: expectedValueCount }, () => "") };
      if (label) return { label, sourceRowCode, rawValues: [] };
      return undefined;
    }
  }

  if (/[а-яёўқғҳ]/i.test(line)) {
    const statutory = line.match(/^(.*?)\s+(\d{3})\s+(.+)$/u);
    if (statutory) {
      const rawValues = Array.from(statutory[3].matchAll(/[-−]?\d{1,3}(?:[ \u00a0]\d{3})*(?:[,.]\d{2})/g), (match) => match[0]);
      if (rawValues.length) {
        const selected = expectedValueCount > 0 ? rawValues.slice(-expectedValueCount) : rawValues;
        return { label: statutory[1].trim(), sourceRowCode: statutory[2], rawValues: selected };
      }
    }
    const codeOnly = line.match(/^(.*?)\s+(\d{3})\s*$/u);
    if (codeOnly) return expectedValueCount > 0
      ? { label: codeOnly[1].trim(), sourceRowCode: codeOnly[2], rawValues: Array.from({ length: expectedValueCount }, () => "") }
      : undefined;
  }

  const pipeParts = line.split(/\s*\|\s*|\t+/).filter(Boolean);
  if (pipeParts.length >= 2) {
    const values = pipeParts.slice(1).filter((part) => /^(?:[$€£₾]\s*)?(?:\(?[-−]?\d[\d,.'’\s]*\)?|—|–|-)$/.test(part.trim()));
    if (values.length && (expectedValueCount === 0 || values.length >= expectedValueCount)) {
      return { label: pipeParts[0], rawValues: expectedValueCount > 0 ? values.slice(-expectedValueCount) : values };
    }
  }

  if (expectedValueCount > 0) {
    const positionalLine = line
      .replace(/^\d+[.)]\s*/, "")
      .replace(/\s+\([^)]*[A-Za-z][^)]*\)\s*$/, "");
    const numericMatches = Array.from(positionalLine.matchAll(/[({[]?[-−]?\d(?:[\d,.'’]*\d)?[)}\]]?/g));
    if (numericMatches.length >= expectedValueCount) {
      let selected = numericMatches.slice(0, expectedValueCount);
      let selectedScore = Number.NEGATIVE_INFINITY;
      for (let start = 0; start <= numericMatches.length - expectedValueCount; start += 1) {
        const candidate = numericMatches.slice(start, start + expectedValueCount);
        const score = candidate.reduce((sum, match) => sum + Math.log10(Math.abs(parseReportedNumber(match[0]) ?? 0) + 1), 0);
        if (score > selectedScore) {
          selected = candidate;
          selectedScore = score;
        }
      }
      const firstIndex = selected[0].index ?? -1;
      const last = selected.at(-1);
      const suffix = last ? positionalLine.slice((last.index ?? 0) + last[0].length).trim() : "";
      if (firstIndex >= 0 && /^(?:[)}\]]|[,.;:]|[$€£₾]|S)*$/i.test(suffix)) {
        const label = positionalLine.slice(0, firstIndex).replace(/(?:S?\$|[$€£₾]|\bS|\b5)\s*$/i, "").trim();
        if (label) return { label, rawValues: selected.map((match) => match[0]) };
      }
    }
  }

  const currencyValues = Array.from(line.matchAll(/(?:[$€£₾]\s*)\(?[-−]?\d[\d,.'’\s]*\)?/g));
  if (currencyValues.length && (expectedValueCount === 0 || currencyValues.length >= expectedValueCount)) {
    const firstIndex = currencyValues[0].index ?? -1;
    if (firstIndex >= 0) {
      return {
        label: line.slice(0, firstIndex).trim(),
        rawValues: currencyValues.map((match) => match[0].trim()),
      };
    }
  }

  const match = line.match(/^(.*?)\s+(\(?[-−]?\d[\d,.'’]*\)?|—|–|-)(?:\s+(\(?[-−]?\d[\d,.'’]*\)?|—|–|-))?(?:\s+(\(?[-−]?\d[\d,.'’]*\)?|—|–|-))?\s*$/);
  if (!match) return undefined;
  const rawValues = [match[2], match[3], match[4]].filter((value): value is string => Boolean(value));
  if (expectedValueCount > 0 && rawValues.length < expectedValueCount) return undefined;
  return { label: match[1], rawValues };
}

function statementPageScore(page: SourcePageInput) {
  if (page.missing || page.imageOnly || !page.text) return { page, score: -1, tabularRows: 0 };
  const lines = page.text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const tabularRows = lines.filter((line) => (parseStatementLine(line)?.rawValues.length ?? 0) >= 2).length;
  const title = statementPatterns.some((pattern) => pattern.test(page.text ?? ""));
  const totals = [/total (?:farm )?assets/i, /total (?:farm )?liabilities/i, /net worth|owners?.? equity/i, /баланс активи бўйича жами/i, /баланс пассиви бўйича жами/i].filter((pattern) => pattern.test(page.text ?? "")).length;
  return { page, tabularRows, score: tabularRows * 10 + (title ? 30 : 0) + totals * 8 };
}

function pageLeadingLines(page: SourcePageInput) {
  return (page.text ?? "").split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 24);
}

function hasBalanceStatementTitle(page: SourcePageInput) {
  const leadingLines = pageLeadingLines(page);
  if (leadingLines.some((line) => /^notes? to (?:the )?(?:consolidated )?financial statements?\b/i.test(line))) return false;
  return leadingLines.some(isStatementTitleLine);
}

function hasOtherPrimaryStatementTitle(page: SourcePageInput) {
  return pageLeadingLines(page).some((line) => isIncomeStatementTitleLine(line)
    || /^(?:audited\s+)?(?:consolidated\s+)?(?:(?:statements? of )?(?:cash flows?|shareholders?[’'s\s-]*equity|stockholders?[’'s\s-]*equity|changes in equity)|cash flow statement)\b/i.test(line)
    || /^notes? to (?:the )?(?:consolidated )?financial statements?\b/i.test(line));
}

function isBalanceContinuationPage(page: SourcePageInput) {
  if (hasOtherPrimaryStatementTitle(page) || hasBalanceStatementTitle(page)) return false;
  const parsedRows = (page.text ?? "").split(/\r?\n/).map((line) => parseStatementLine(line.trim())).filter((row): row is NonNullable<typeof row> => Boolean(row && row.rawValues.length >= 2));
  if (parsedRows.length < 2) return false;
  const balanceRows = parsedRows.filter((row) => row.sourceRowCode
    ? Boolean(uzbekForm1Concept(row.sourceRowCode))
    : normalizeConcept(row.label).concept !== "unmapped" || /\b(?:assets?|liabilit|equity|net worth)\b/i.test(row.label));
  return balanceRows.length >= 2;
}

export function selectStatementPages(pages: SourcePageInput[]) {
  const ordered = [...pages].sort((left, right) => left.pageNumber - right.pageNumber);
  const explicitlyTitled = ordered.filter(hasBalanceStatementTitle);
  if (explicitlyTitled.length) {
    const selected = new Map<number, SourcePageInput>();
    for (const titled of explicitlyTitled) {
      selected.set(titled.pageNumber, titled);
      const startIndex = ordered.findIndex((page) => page.pageNumber === titled.pageNumber);
      for (let index = startIndex + 1; index < ordered.length; index += 1) {
        const candidate = ordered[index];
        if (candidate.pageNumber !== ordered[index - 1].pageNumber + 1 || hasBalanceStatementTitle(candidate) || hasOtherPrimaryStatementTitle(candidate)) break;
        if (!isBalanceContinuationPage(candidate)) break;
        selected.set(candidate.pageNumber, candidate);
      }
    }
    return [...selected.values()].sort((left, right) => left.pageNumber - right.pageNumber);
  }
  const scored = ordered.filter((page) => !hasOtherPrimaryStatementTitle(page)).map(statementPageScore);
  const strong = scored.filter((candidate) => candidate.tabularRows >= 3 && candidate.score >= 38);
  if (strong.length) {
    const best = [...strong].sort((left, right) => right.score - left.score)[0];
    return best ? [best.page] : [];
  }
  const best = [...scored].sort((left, right) => right.score - left.score)[0];
  return best && best.score > 0 ? [best.page] : ordered;
}

function balanceStatementLines(text: string) {
  const lines = text.split(/\r?\n/);
  // A continuation page may begin with valid rows before a major total such as
  // "Total balance sheet asset". Treating any generic “balance” phrase as a
  // title silently discarded those preceding rows. Only an actual statement
  // title may advance the start boundary; untitled continuation pages start at
  // their first line.
  const titleIndex = lines.findIndex((line) => isStatementTitleLine(line));
  const start = titleIndex >= 0 ? titleIndex : 0;
  const nextStatementIndex = lines.findIndex((line, index) => index > start && isIncomeStatementTitleLine(line));
  return lines.slice(start, nextStatementIndex >= 0 ? nextStatementIndex : undefined);
}

function parseLineItems(pages: SourcePageInput[], periods: string[]): LineItemInput[] {
  const items: LineItemInput[] = [];
  for (const page of pages) {
    if (page.missing || page.imageOnly || !page.text) continue;
    const reportingYear = page.reportingYear ?? periods.findLast((period) => /^(?:19|20)\d{2}$/.test(period));
    const pagePeriods = detectPeriods(page.text, reportingYear);
    const observedColumnCount = Math.max(0, ...balanceStatementLines(page.text)
      .map((line) => parseStatementLine(line)?.rawValues.length ?? 0)
      .filter((count) => count <= 4));
    const contextualPeriods = reportingYear
      ? observedColumnCount >= 2 ? [String(Number(reportingYear) - 1), reportingYear] : [reportingYear]
      : [];
    const usedPeriods = pagePeriods.length ? pagePeriods : (contextualPeriods.length ? contextualPeriods : periods);
    let pendingLabel = "";
    let activeSection: StatementSection = null;
    for (const sourceLine of balanceStatementLines(page.text)) {
      const line = sourceLine.trim();
      if (!line) continue;
      const sectionHeading = sectionForHeading(line);
      if (!pendingLabel && sectionHeading !== undefined) {
        activeSection = sectionHeading;
        pendingLabel = "";
        continue;
      }
      const isPeriodHeader = /^(?:as of\s+)?(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?(?:\s+(?:(?:19|20)\d{2})(?:\s*(?:,|and)?\s*(?:19|20)\d{2})*)?\s*$/i.test(line)
        || /^(?:(?:19|20)\d{2}[\s|,;]*){1,4}$/.test(line)
        || /^notes?\b.*\b(?:19|20)\d{2}\b.*\b(?:19|20)\d{2}\b/i.test(line)
        || /^description(?:\s|\t)/i.test(line)
        || /^assets(?:\s|\t)+(?:19|20)\d{2}(?:\s|\t)+(?:19|20)\d{2}$/i.test(line);
      if (/^the financial statements\b.*\b(?:approved|authorised|authorized)\b/i.test(line)) break;
      if (isStatementTitleLine(line) || (!pendingLabel && /^(?:assets|current assets|liabilities(?: and (?:net worth|stockholders.? equity))?|current liabilities|stockholders.? equity):?$/i.test(line)) || /^commitments? and contingencies\b/i.test(line) || /^the financial statements\b.*\b(?:approved|authorised|authorized)\b/i.test(line) || /^(?:January|February|March|April|May|June|July|August|September|October|November|December).+\bNotes\b/i.test(line) || isPeriodHeader) {
        pendingLabel = "";
        continue;
      }
      const unlabelledSubtotalConcept = activeSection === "current_asset"
        ? "current_assets"
        : activeSection === "non_current_asset"
          ? "non_current_assets"
          : null;
      if (!pendingLabel && unlabelledSubtotalConcept && /^(?:[$€£₾]\s*)?[({[]?[-−]?\d/.test(line)) {
        const subtotal = parseStatementLine(`continued-row ${line}`, usedPeriods.length);
        if (subtotal?.label === "continued-row" && subtotal.rawValues.length === usedPeriods.length) {
          items.push({
            page: page.pageNumber,
            originalLabel: "[no printed label]",
            englishLabel: CONCEPT_ENGLISH_LABELS[unlabelledSubtotalConcept],
            concept: unlabelledSubtotalConcept,
            classification: activeSection,
            isTotal: true,
            values: subtotal.rawValues.map((raw, index) => ({
              period: usedPeriods[index] ?? `column-${index + 1}`,
              raw,
              value: parseReportedNumber(raw),
              confidence: page.confidence,
              columnIndex: index,
            })),
            extractionMethod: page.extractionMethod,
            confidence: page.confidence,
          });
          continue;
        }
      }
      const shareDescription = /^common stock.*\b(?:par value|shares? authorized)\b/i.test(line);
      if (shareDescription) {
        pendingLabel = `${pendingLabel} ${cleanLabel(line)}`.trim();
        continue;
      }
      if (/^common stock\b/i.test(pendingLabel) && /\bshares? issued\b|\bshares? outstanding\b/i.test(line)) {
        const respectivelyIndex = line.search(/\brespectively\b/i);
        const valueText = respectivelyIndex >= 0 ? line.slice(respectivelyIndex).replace(/^respectively\b[,;:]?\s*/i, "") : "";
        const parsedContinuation = valueText ? parseStatementLine(`continued-row ${valueText}`, usedPeriods.length) : undefined;
        if (parsedContinuation?.rawValues.length) {
          const descriptivePart = respectivelyIndex >= 0 ? line.slice(0, respectivelyIndex + "respectively".length) : line;
          const label = `${pendingLabel} ${cleanLabel(descriptivePart)}`.trim();
          const normalized = normalizeConceptInSection(label, undefined, activeSection);
          const rowPeriods = usedPeriods.length ? usedPeriods : parsedContinuation.rawValues.map((_, index) => `column-${index + 1}`);
          items.push({
            page: page.pageNumber,
            originalLabel: label,
            ...normalized,
            values: parsedContinuation.rawValues.slice(-rowPeriods.length).map((raw, index) => ({
              period: rowPeriods[index] ?? `column-${index + 1}`,
              raw,
              value: parseReportedNumber(raw),
              confidence: page.confidence,
              columnIndex: index,
            })),
            extractionMethod: page.extractionMethod,
            confidence: page.confidence,
          });
          pendingLabel = "";
          continue;
        }
      }
      if (/\b(?:authorized as of|shares issued|outstanding as of)\b/i.test(line)) {
        pendingLabel = `${pendingLabel} ${cleanLabel(line)}`.trim();
        continue;
      }
      const valueOnlyContinuation = Boolean(pendingLabel) && /^(?:[$€£₾]|S?\$|[({[]?[-−]?\d|—|–)/.test(line);
      const parsed = valueOnlyContinuation
        ? parseStatementLine(`continued-row ${line}`, usedPeriods.length)
        : parseStatementLine(line, usedPeriods.length);
      let label = parsed?.label ?? "";
      if (valueOnlyContinuation && label === "continued-row") label = "";
      const rawValues = parsed?.rawValues ?? [];
      if (pendingLabel && rawValues.length) {
        label = `${pendingLabel} ${label}`.trim();
        pendingLabel = "";
      } else if (!rawValues.length && (/^\d+[.)]?\s*\p{L}/u.test(line) || /^common stock\b/i.test(line) || pendingLabel)) {
        pendingLabel = `${pendingLabel} ${cleanLabel(line)}`.trim();
        continue;
      }
      if (!label || rawValues.length === 0) continue;
      if (/^description$/i.test(label)) continue;
      const normalized = normalizeConceptInSection(label, parsed?.sourceRowCode, activeSection);
      if (normalized.concept === "unmapped" && !/[a-zа-яўқғҳ]/i.test(label)) continue;
      const rowPeriods = usedPeriods.length ? usedPeriods : rawValues.map((_, index) => `column-${index + 1}`);
      items.push({
        page: page.pageNumber,
        originalLabel: cleanLabel(label),
        sourceRowCode: parsed?.sourceRowCode,
        ...normalized,
        values: rawValues.slice(-rowPeriods.length).map((raw, index) => ({
          period: rowPeriods[index] ?? `column-${index + 1}`,
          raw,
          value: parseReportedNumber(raw),
          confidence: page.confidence,
          columnIndex: index,
        })),
        extractionMethod: page.extractionMethod,
        confidence: page.confidence,
      });
    }
  }
  return items;
}

function sourceRefsFor(item: BalanceSheetLineItem | undefined, period?: string) {
  if (!item) return [];
  return item.values.filter((value) => !period || value.period === period).map((value) => value.source);
}

export function effectiveNormalizedValue(item: BalanceSheetLineItem | undefined, period: string) {
  const value = item?.values.find((candidate) => candidate.period === period);
  return value?.correction?.correctedNormalizedValue ?? value?.normalizedValue ?? null;
}

function firstConcept(items: BalanceSheetLineItem[], concept: BalanceSheetConcept) {
  return items.find((item) => item.normalizedConcept === concept);
}

function conceptForPeriod(items: BalanceSheetLineItem[], concept: BalanceSheetConcept, period: string) {
  return items.find((item) => item.normalizedConcept === concept && item.values.some((value) => value.period === period));
}

const UZBEK_FORM_1_SUBTOTAL_ROWS: Partial<Record<string, Array<[string, number]>>> = {
  "130": [["012", 1], ["022", 1], ["030", 1], ["090", 1], ["100", 1], ["110", 1], ["120", 1]],
  "390": [["140", 1], ["190", 1], ["200", 1], ["210", 1], ["320", 1], ["370", 1], ["380", 1]],
  "400": [["130", 1], ["390", 1]],
  "480": [["410", 1], ["420", 1], ["430", 1], ["440", -1], ["450", 1], ["460", 1], ["470", 1]],
  "490": [["500", 1], ["520", 1], ["530", 1], ["540", 1], ["550", 1], ["560", 1], ["570", 1], ["580", 1], ["590", 1]],
  "600": [["610", 1], ["630", 1], ["640", 1], ["650", 1], ["660", 1], ["670", 1], ["680", 1], ["690", 1], ["700", 1], ["710", 1], ["720", 1], ["730", 1], ["740", 1], ["750", 1], ["760", 1]],
  "770": [["490", 1], ["600", 1]],
};

function arithmetic(items: BalanceSheetLineItem[], periods: string[], unitScale: number) {
  const checks: ArithmeticCheck[] = [];
  const tolerance = Math.max(0.000001, unitScale * 0.000001);
  for (const period of periods) {
    const assetsItem = conceptForPeriod(items, "total_assets", period);
    const liabilitiesItem = conceptForPeriod(items, "total_liabilities", period);
    const equityItem = conceptForPeriod(items, "owners_equity", period);
    const netAssetsItem = conceptForPeriod(items, "net_assets", period);
    const assets = effectiveNormalizedValue(assetsItem, period);
    const liabilities = effectiveNormalizedValue(liabilitiesItem, period);
    const equity = effectiveNormalizedValue(equityItem, period);
    const equationRight = liabilities === null || equity === null ? null : liabilities + equity;
    const equationDifference = assets === null || equationRight === null ? null : assets - equationRight;
    checks.push({
      id: `check:equation:${period}`,
      period,
      formula: "assets = liabilities + equity",
      leftValue: assets,
      rightValue: equationRight,
      difference: equationDifference,
      status: equationDifference === null ? "not-testable" : Math.abs(equationDifference) <= tolerance ? "passed" : "failed",
      inputs: [
        { concept: "total_assets", value: assets, lineItemId: assetsItem?.id },
        { concept: "total_liabilities", value: liabilities, lineItemId: liabilitiesItem?.id },
        { concept: "owners_equity", value: equity, lineItemId: equityItem?.id },
      ],
    });
    const calculatedNetAssets = assets === null || liabilities === null ? null : assets - liabilities;
    const reportedNetAssets = netAssetsItem ? effectiveNormalizedValue(netAssetsItem, period) : equity;
    const netAssetsDifference = reportedNetAssets === null || calculatedNetAssets === null ? null : reportedNetAssets - calculatedNetAssets;
    checks.push({
      id: `check:net-assets:${period}`,
      period,
      formula: "net assets = assets - liabilities",
      leftValue: reportedNetAssets,
      rightValue: calculatedNetAssets,
      difference: netAssetsDifference,
      status: netAssetsDifference === null ? "not-testable" : Math.abs(netAssetsDifference) <= tolerance ? "passed" : "failed",
      inputs: [
        { concept: netAssetsItem ? "net_assets" : "owners_equity", value: reportedNetAssets, lineItemId: (netAssetsItem ?? equityItem)?.id },
        { concept: "total_assets", value: assets, lineItemId: assetsItem?.id },
        { concept: "total_liabilities", value: liabilities, lineItemId: liabilitiesItem?.id },
      ],
    });

    const reportedLiabilitiesAndEquityItem = conceptForPeriod(items, "total_liabilities_and_equity", period);
    if (reportedLiabilitiesAndEquityItem) {
      const reportedLiabilitiesAndEquity = effectiveNormalizedValue(reportedLiabilitiesAndEquityItem, period);
      const calculatedLiabilitiesAndEquity = liabilities === null || equity === null ? null : liabilities + equity;
      const liabilitiesAndEquityDifference = reportedLiabilitiesAndEquity === null || calculatedLiabilitiesAndEquity === null
        ? null
        : reportedLiabilitiesAndEquity - calculatedLiabilitiesAndEquity;
      checks.push({
        id: `check:reported-liabilities-equity:${period}`,
        period,
        formula: "reported liabilities + equity total = liabilities + equity",
        leftValue: reportedLiabilitiesAndEquity,
        rightValue: calculatedLiabilitiesAndEquity,
        difference: liabilitiesAndEquityDifference,
        status: liabilitiesAndEquityDifference === null ? "not-testable" : Math.abs(liabilitiesAndEquityDifference) <= tolerance ? "passed" : "failed",
        inputs: [
          { concept: "total_liabilities_and_equity", value: reportedLiabilitiesAndEquity, lineItemId: reportedLiabilitiesAndEquityItem.id },
          { concept: "total_liabilities", value: liabilities, lineItemId: liabilitiesItem?.id },
          { concept: "owners_equity", value: equity, lineItemId: equityItem?.id },
        ],
      });
    }

    const currentAssetSubtotal = conceptForPeriod(items, "current_assets", period);
    const nonCurrentAssetSubtotal = conceptForPeriod(items, "non_current_assets", period);
    const currentLiabilitySubtotal = conceptForPeriod(items, "current_liabilities", period);
    const nonCurrentLiabilitySubtotal = conceptForPeriod(items, "non_current_liabilities", period);
    const subtotalSpecs: Array<{ concept: BalanceSheetConcept; components: BalanceSheetLineItem[] }> = [
      { concept: "current_assets", components: items.filter((item) => item.classification === "current_asset" && !item.isTotal) },
      { concept: "non_current_assets", components: items.filter((item) => item.classification === "non_current_asset" && !item.isTotal) },
      { concept: "current_liabilities", components: items.filter((item) => item.classification === "current_liability" && !item.isTotal) },
      { concept: "non_current_liabilities", components: items.filter((item) => item.classification === "non_current_liability" && !item.isTotal) },
      {
        concept: "total_assets",
        components: [
          ...(currentAssetSubtotal ? [currentAssetSubtotal] : items.filter((item) => item.classification === "current_asset" && !item.isTotal)),
          ...(nonCurrentAssetSubtotal ? [nonCurrentAssetSubtotal] : items.filter((item) => item.classification === "non_current_asset" && !item.isTotal)),
        ],
      },
      {
        concept: "total_liabilities",
        components: [
          ...(currentLiabilitySubtotal ? [currentLiabilitySubtotal] : items.filter((item) => item.classification === "current_liability" && !item.isTotal)),
          ...(nonCurrentLiabilitySubtotal ? [nonCurrentLiabilitySubtotal] : items.filter((item) => item.classification === "non_current_liability" && !item.isTotal)),
        ],
      },
      { concept: "total_assets_including_personal", components: [assetsItem, conceptForPeriod(items, "personal_assets", period)].filter((item): item is BalanceSheetLineItem => Boolean(item)) },
      { concept: "total_liabilities_including_personal", components: [liabilitiesItem, conceptForPeriod(items, "personal_liabilities", period)].filter((item): item is BalanceSheetLineItem => Boolean(item)) },
    ];
    for (const { concept, components } of subtotalSpecs) {
      const subtotalItem = conceptForPeriod(items, concept, period);
      if (!subtotalItem || !components.length) continue;
      const subtotal = effectiveNormalizedValue(subtotalItem, period);
      const subtotalPage = subtotalItem.values.find((value) => value.period === period)?.source.page;
      const statutoryFormula = subtotalItem.sourceRowCode ? UZBEK_FORM_1_SUBTOTAL_ROWS[subtotalItem.sourceRowCode] : undefined;
      const componentTerms = statutoryFormula
        ? statutoryFormula.map(([rowCode, sign]) => ({ item: items.find((candidate) => candidate.sourceRowCode === rowCode
          && candidate.values.some((value) => value.period === period && (subtotalPage === undefined || value.source.page === subtotalPage))), sign })).filter((term): term is { item: BalanceSheetLineItem; sign: number } => Boolean(term.item))
        : components.filter((item) => item.values.some((value) => value.period === period && (subtotalPage === undefined || value.source.page === subtotalPage))).map((item) => ({ item, sign: 1 }));
      const componentValues = componentTerms.map(({ item, sign }) => {
        const value = effectiveNormalizedValue(item, period);
        return value === null ? null : value * sign;
      }).filter((value): value is number => value !== null);
      const componentSum = componentValues.length ? componentValues.reduce((sum, value) => sum + value, 0) : null;
      const difference = subtotal === null || componentSum === null ? null : subtotal - componentSum;
      checks.push({
        id: `check:subtotal:${concept}:${period}`,
        period,
        formula: "subtotal = underlying lines",
        leftValue: subtotal,
        rightValue: componentSum,
        difference,
        status: difference === null ? "not-testable" : Math.abs(difference) <= tolerance ? "passed" : "failed",
        inputs: [
          { concept, value: subtotal, lineItemId: subtotalItem?.id },
          ...componentTerms.map(({ item, sign }) => {
            const value = effectiveNormalizedValue(item, period);
            return { concept: item.normalizedConcept, value: value === null ? null : value * sign, lineItemId: item.id };
          }),
        ],
      });
    }

    const totalIncludingPersonal = conceptForPeriod(items, "total_assets_including_personal", period);
    const liabilitiesIncludingPersonal = conceptForPeriod(items, "total_liabilities_including_personal", period);
    const netWorthIncludingPersonal = conceptForPeriod(items, "total_net_worth_including_personal", period);
    if (totalIncludingPersonal || liabilitiesIncludingPersonal || netWorthIncludingPersonal) {
      const personalAssets = effectiveNormalizedValue(totalIncludingPersonal, period);
      const personalLiabilities = effectiveNormalizedValue(liabilitiesIncludingPersonal, period);
      const reportedPersonalNetWorth = effectiveNormalizedValue(netWorthIncludingPersonal, period);
      const calculatedPersonalNetWorth = personalAssets === null || personalLiabilities === null ? null : personalAssets - personalLiabilities;
      const difference = reportedPersonalNetWorth === null || calculatedPersonalNetWorth === null ? null : reportedPersonalNetWorth - calculatedPersonalNetWorth;
      checks.push({
        id: `check:net-worth-including-personal:${period}`,
        period,
        formula: "net assets = assets - liabilities",
        leftValue: reportedPersonalNetWorth,
        rightValue: calculatedPersonalNetWorth,
        difference,
        status: difference === null ? "not-testable" : Math.abs(difference) <= tolerance ? "passed" : "failed",
        inputs: [
          { concept: "total_net_worth_including_personal", value: reportedPersonalNetWorth, lineItemId: netWorthIncludingPersonal?.id },
          { concept: "total_assets_including_personal", value: personalAssets, lineItemId: totalIncludingPersonal?.id },
          { concept: "total_liabilities_including_personal", value: personalLiabilities, lineItemId: liabilitiesIncludingPersonal?.id },
        ],
      });
    }
  }
  return checks;
}

function validate(review: Omit<BalanceSheetReview, "issues" | "arithmeticChecks">) {
  const issues: ReviewIssue[] = [];
  const arithmeticChecks = arithmetic(review.lineItems, review.statement.periods, review.statement.unitScale);
  const sourceRef = (lineItemId?: string, period?: string) => sourceRefsFor(review.lineItems.find((item) => item.id === lineItemId), period);
  const expectedPages = review.source.expectedPageCount ?? review.source.pageCount;
  const presentPages = new Set(review.pages.filter((page) => !page.missing).map((page) => page.pageNumber));
  const missingNumbers = Array.from({ length: expectedPages }, (_, index) => index + 1).filter((page) => !presentPages.has(page));
  if (missingNumbers.length) {
    issues.push({ id: "issue:missing-pages", code: "MISSING_PAGE", severity: "blocking", message: `Missing expected page(s): ${missingNumbers.join(", ")}.`, sourceRefs: [] });
  }
  const imageOnlyPages = review.pages.filter((page) => page.imageOnly);
  if (imageOnlyPages.length && review.lineItems.length === 0) {
    issues.push({ id: "issue:ocr-required", code: "OCR_REQUIRED", severity: "blocking", message: `No balance-sheet rows could be recovered. Page(s) ${imageOnlyPages.map((page) => page.pageNumber).join(", ")} contain no usable text layer; targeted OCR or manual transcription is required.`, sourceRefs: [] });
  }
  const lowConfidencePages = review.pages.filter((page) => page.confidence !== undefined && page.confidence < 0.8);
  if (lowConfidencePages.length) {
    issues.push({ id: "issue:low-confidence-pages", code: "OCR_LOW_CONFIDENCE", severity: "warning", message: `Low-confidence extraction on page(s) ${lowConfidencePages.map((page) => page.pageNumber).join(", ")}; confirm affected values manually.`, sourceRefs: review.lineItems.flatMap((item) => item.values.filter((value) => lowConfidencePages.some((page) => page.pageNumber === value.source.page)).map((value) => value.source)) });
  }
  const allText = review.pages.map((page) => page.text ?? "").join("\n");
  if (!statementPatterns.some((pattern) => pattern.test(allText)) && review.lineItems.length === 0) {
    issues.push({ id: "issue:statement-page", code: "STATEMENT_PAGE_NOT_FOUND", severity: "blocking", message: "No balance-sheet or statement-of-financial-position page was identified.", sourceRefs: [] });
  }
  for (const concept of requiredConcepts) {
    if (!firstConcept(review.lineItems, concept)) {
      issues.push({ id: `issue:missing:${concept}`, code: "REQUIRED_TOTAL_MISSING", severity: "blocking", message: `Required balance-sheet concept is missing: ${concept}.`, sourceRefs: [] });
    }
  }
  for (const check of arithmeticChecks) {
    if (check.status !== "failed") continue;
    const isRoundingDifference = check.difference !== null && Math.abs(check.difference) <= Math.max(2, review.statement.unitScale * 2);
    if (isRoundingDifference && check.id.startsWith("check:net-assets:") && check.inputs[0]?.concept === "owners_equity") continue;
    const lineRefs = check.inputs.flatMap((input) => sourceRef(input.lineItemId, check.period));
    issues.push({
      id: `issue:${check.id}`,
      code: isRoundingDifference ? "ROUNDING_DIFFERENCE" : check.formula === "assets = liabilities + equity" || check.formula === "reported liabilities + equity total = liabilities + equity" ? "ACCOUNTING_EQUATION_MISMATCH" : check.formula === "net assets = assets - liabilities" ? "NET_ASSETS_MISMATCH" : "SUBTOTAL_MISMATCH",
      severity: isRoundingDifference || check.formula === "subtotal = underlying lines" ? "warning" : "blocking",
      message: `${check.formula} differs by ${check.difference?.toLocaleString("en-US") ?? "an unknown amount"} for ${check.period}. ${isRoundingDifference ? "This small difference is reported as a possible rounding effect. " : ""}Reported figures were not changed.`,
      period: check.period,
      difference: check.difference ?? undefined,
      sourceRefs: lineRefs,
    });
  }
  for (const item of review.lineItems) {
    if (item.normalizedConcept === "unmapped") {
      issues.push({ id: `issue:classification:${item.id}`, code: "CLASSIFICATION_ANOMALY", severity: "warning", message: `Original label “${item.originalLabel}” is not mapped to a normalized concept.`, lineItemId: item.id, sourceRefs: sourceRefsFor(item) });
    }
    for (const value of item.values) {
      const effective = value.correction?.correctedNormalizedValue ?? value.normalizedValue;
      if (effective !== null && effective < 0 && item.isTotal && item.normalizedConcept !== "owners_equity" && item.normalizedConcept !== "net_assets") {
        issues.push({ id: `issue:sign:${item.id}:${value.period}`, code: "SIGN_ANOMALY", severity: "warning", message: `Negative total reported for ${item.normalizedConcept} in ${value.period}; verify the sign convention.`, period: value.period, lineItemId: item.id, sourceRefs: [value.source] });
      }
    }
  }
  return { arithmeticChecks, issues };
}

function lineItemFromInput(input: LineItemInput, source: SourceDocumentInput, unitScale: number, index: number): BalanceSheetLineItem {
  const normalized = input.concept ? { concept: input.concept, classification: input.classification ?? inferClassification(input.concept), isTotal: input.isTotal ?? inferIsTotal(input.concept) } : normalizeConcept(input.originalLabel, input.sourceRowCode);
  const english = input.englishLabel
    ? { englishLabel: input.englishLabel, translationStatus: "canonical" as const }
    : englishLabelFor(input.originalLabel, normalized.concept, input.sourceRowCode);
  const extractionMethod = input.extractionMethod ?? "digital-text";
  const confidence = input.confidence ?? Math.min(...input.values.map((value) => value.confidence ?? 0.98));
  return {
    id: input.id ?? `line:${source.documentId}:${index + 1}`,
    originalLabel: input.originalLabel,
    ...english,
    sourceRowCode: input.sourceRowCode,
    normalizedConcept: normalized.concept,
    classification: input.classification ?? normalized.classification,
    isTotal: input.isTotal ?? normalized.isTotal,
    confidence,
    reviewStatus: confidence < 0.8 ? "needs-review" : "unreviewed",
    values: input.values.map((value, valueIndex) => {
      const reportedValue = value.value === undefined ? parseReportedNumber(value.raw) : value.value;
      return {
        period: value.period,
        rawReportedValue: value.raw,
        reportedValue,
        normalizedValue: reportedValue === null ? null : reportedValue * unitScale,
        source: {
          documentId: source.documentId,
          fileName: source.fileName,
          page: input.page,
          originalLabel: input.originalLabel,
          period: value.period,
          columnIndex: value.columnIndex ?? valueIndex,
          extractionMethod,
          confidence: value.confidence ?? confidence,
        },
      };
    }),
  };
}

function pagesWithReportingContext(pages: SourcePageInput[]) {
  const directYears = new Map(pages.map((page) => [page.pageNumber, reportingYearFromText(page.text ?? "")]));
  let activeReportingYear: string | undefined;
  return [...pages].sort((left, right) => left.pageNumber - right.pageNumber).map((page) => {
    const direct = page.reportingYear ?? directYears.get(page.pageNumber) ?? undefined;
    if (direct) activeReportingYear = direct;
    return activeReportingYear ? { ...page, reportingYear: activeReportingYear } : page;
  });
}

function orderedUniquePeriods(periods: string[], chronological = false) {
  const unique = [...new Set(periods)];
  return chronological && unique.every((period) => /^(?:19|20)\d{2}$/.test(period))
    ? unique.sort((left, right) => Number(left) - Number(right))
    : unique;
}

function latestPeriodLabel(periods: string[]) {
  const scored = periods.flatMap((period, index) => {
    const explicitYear = period.match(/\b(?:19|20)\d{2}\b/)?.[0];
    if (!explicitYear) return [];
    const namedDate = /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\b/i.test(period)
      ? Date.parse(period.replace(/,(?=\s*\d{4}\b)/, ""))
      : Number.NaN;
    return [{ period, score: Number.isNaN(namedDate) ? Date.UTC(Number(explicitYear), 0, 1) : namedDate, index }];
  });
  return scored.sort((left, right) => right.score - left.score || left.index - right.index)[0]?.period;
}

export function buildBalanceSheetReview(input: BalanceSheetInput): BalanceSheetReview {
  const contextualPages = pagesWithReportingContext(input.pages);
  const statementPages = input.lineItems?.length ? contextualPages : selectStatementPages(contextualPages);
  const statementText = statementPages.map((page) => page.text ?? "").join("\n");
  const documentText = contextualPages.map((page) => page.text ?? "").join("\n");
  const statutoryComparatives = /accounting balance(?: sheet)?(?:\s*[-–]\s*|\s+)form\s+(?:no\.?|n[eo])?\s*1\b/i.test(statementText)
    || /бухгалтерия баланси|бухгалтерский баланс/iu.test(statementText);
  const detectedPeriods = orderedUniquePeriods(statementPages.flatMap((page) => detectPeriods(page.text ?? "", page.reportingYear)), statutoryComparatives);
  const statementYears = statementPages.map((page) => page.reportingYear).filter((year): year is string => Boolean(year));
  const inferredReportingYear = detectedPeriods.flatMap((period) => period.match(/\b(?:19|20)\d{2}\b/)?.[0] ?? [])
    .sort((left, right) => Number(left) - Number(right)).at(-1)
    ?? statementYears.sort((left, right) => Number(left) - Number(right)).at(-1)
    ?? reportingYearFromText(statementText);
  const periods = input.periods?.length ? input.periods : (detectedPeriods.length ? detectedPeriods : detectPeriods(statementText, inferredReportingYear));
  const periodYears = periods
    .flatMap((period) => period.match(/\b(?:19|20)\d{2}\b/)?.[0] ?? [])
    .sort((left, right) => Number(left) - Number(right));
  const inferredReportingDate = reportingDateFromText(statementText, inferredReportingYear)
    ?? latestPeriodLabel(periods)
    ?? inferredReportingYear
    ?? periodYears.at(-1)
    ?? "Unconfirmed";
  const statementUnits = detectUnits(statementText);
  const units = hasExplicitUnitScale(statementText) || hasStatementCurrencyFigures(statementText)
    ? statementUnits
    : detectUnits(documentText);
  const statementCurrency = detectCurrency(statementText);
  const unitScale = input.unitScale ?? units.unitScale;
  const parsedItems = input.lineItems?.length ? input.lineItems : parseLineItems(statementPages, periods);
  const lineItems = parsedItems.map((item, index) => lineItemFromInput(item, input.source, unitScale, index));
  const statementEntity = detectEntity(statementText);
  const documentEntity = detectEntity(documentText);
  const base: Omit<BalanceSheetReview, "issues" | "arithmeticChecks"> = {
    schemaVersion: BALANCE_SHEET_SCHEMA_VERSION,
    reviewId: `bs-review:${input.source.documentId}`,
    capability: {
      disposition: "EXISTING AGENT — SPECIALIZED CAPABILITY",
      ownerAgentId: "agent:TL-A008",
      ownerAgentName: "Company Verification Agent",
      supportingAgentIds: ["agent:TL-A002", "agent:TL-A003", "agent:TL-A004", "agent:TL-A022"],
    },
    source: input.source,
    pages: contextualPages,
    statement: {
      reportingEntity: input.reportingEntity ?? (documentEntity !== "Unconfirmed reporting entity" ? documentEntity : statementEntity),
      reportingDate: input.reportingDate ?? inferredReportingDate,
      periods,
      currency: input.currency ?? (statementCurrency !== "UNSPECIFIED" ? statementCurrency : detectCurrency(documentText)),
      unitLabel: input.unitLabel ?? units.unitLabel,
      unitScale,
      language: input.language ?? detectLanguage(documentText),
    },
    lineItems,
    review: {
      status: "draft",
      auditTrail: [{ id: `audit:${input.source.documentId}:created`, action: "created", actor: "Balance Sheet Digitization capability", at: input.source.processedAt ?? "2026-08-26T00:00:00.000Z", detail: `Result produced with ${input.source.processingVersion ?? "tender-balance/1.0.0"} without altering reported figures.` }],
    },
  };
  const validated = validate(base);
  return { ...base, ...validated, review: { ...base.review, status: validated.issues.some((issue) => issue.severity === "blocking" || issue.severity === "error") ? "needs-review" : "draft" } };
}

function revalidate(review: BalanceSheetReview): BalanceSheetReview {
  const validated = validate(review);
  const hasBlocking = validated.issues.some((issue) => issue.severity === "blocking" || issue.severity === "error");
  return { ...review, ...validated, review: { ...review.review, status: review.review.status === "approved" && !hasBlocking ? "approved" : hasBlocking ? "needs-review" : "draft" } };
}

export function correctLineItemValue(review: BalanceSheetReview, lineItemId: string, period: string, correctedReportedValue: number, reason: string, reviewer: string, at = new Date().toISOString()): BalanceSheetReview {
  const lineItems = review.lineItems.map((item) => item.id !== lineItemId ? item : {
    ...item,
    reviewStatus: "corrected" as const,
    values: item.values.map((value) => value.period !== period ? value : {
      ...value,
      correction: {
        correctedReportedValue,
        correctedNormalizedValue: correctedReportedValue * review.statement.unitScale,
        reason,
        reviewer,
        at,
      },
    }),
  });
  return revalidate({
    ...review,
    lineItems,
    review: {
      status: "draft",
      auditTrail: [...review.review.auditTrail, { id: `audit:${lineItemId}:${period}:${at}`, action: "corrected", actor: reviewer, at, detail: `${lineItemId} ${period} corrected to ${correctedReportedValue}; source value preserved. Reason: ${reason}` }],
    },
  });
}

export function approveLineItem(review: BalanceSheetReview, lineItemId: string, reviewer: string, at = new Date().toISOString()): BalanceSheetReview {
  return {
    ...review,
    lineItems: review.lineItems.map((item) => item.id === lineItemId ? { ...item, reviewStatus: item.reviewStatus === "corrected" ? "corrected" as const : "approved" as const } : item),
    review: {
      ...review.review,
      auditTrail: [...review.review.auditTrail, { id: `audit:${lineItemId}:approved:${at}`, action: "line-approved" as const, actor: reviewer, at, detail: `${lineItemId} inspected and approved.` }],
    },
  };
}

export function approveEligibleLineItems(review: BalanceSheetReview, reviewer: string, at = new Date().toISOString()): BalanceSheetReview {
  return review.lineItems.reduce((current, item) => item.confidence >= 0.8 && item.reviewStatus === "unreviewed" ? approveLineItem(current, item.id, reviewer, at) : current, review);
}

export function canApproveStatement(review: BalanceSheetReview) {
  const hasBlocking = review.issues.some((issue) => issue.severity === "blocking" || issue.severity === "error");
  const hasUnreviewedValues = review.lineItems.some((item) => !["approved", "corrected"].includes(item.reviewStatus));
  return !hasBlocking && review.lineItems.length > 0 && !hasUnreviewedValues;
}

export function approveStatement(review: BalanceSheetReview, reviewer: string, at = new Date().toISOString()): BalanceSheetReview {
  if (!canApproveStatement(review)) return review;
  return {
    ...review,
    review: {
      status: "approved",
      reviewer,
      approvedAt: at,
      auditTrail: [...review.review.auditTrail, { id: `audit:${review.reviewId}:approved:${at}`, action: "statement-approved", actor: reviewer, at, detail: "All extracted values reviewed; statement approved for downstream use. Approval is not a tender eligibility decision." }],
    },
  };
}

export function compareBalanceSheetReviews(left: BalanceSheetReview, right: BalanceSheetReview): RecordComparison {
  const overlaps: RecordComparison["overlaps"] = [];
  const issues: ReviewIssue[] = [];
  const sharedPeriods = left.statement.periods.filter((period) => right.statement.periods.includes(period));
  const concepts = Array.from(new Set(left.lineItems.map((item) => item.normalizedConcept).filter((concept) => concept !== "unmapped")));
  for (const period of sharedPeriods) {
    for (const concept of concepts) {
      const leftItem = firstConcept(left.lineItems, concept);
      const rightItem = firstConcept(right.lineItems, concept);
      const leftValue = effectiveNormalizedValue(leftItem, period);
      const rightValue = effectiveNormalizedValue(rightItem, period);
      if (leftValue === null || rightValue === null) continue;
      const difference = leftValue - rightValue;
      const matches = Math.abs(difference) <= Math.max(1, left.statement.unitScale * 0.001);
      overlaps.push({ period, concept, leftValue, rightValue, difference, matches });
      if (!matches) {
        issues.push({
          id: `issue:comparative:${period}:${concept}:${left.reviewId}:${right.reviewId}`,
          code: "COMPARATIVE_PERIOD_DISCREPANCY",
          severity: "warning",
          message: `${concept} for comparative period ${period} differs across documents by ${difference.toLocaleString("en-US")}.`,
          period,
          difference,
          sourceRefs: [...sourceRefsFor(leftItem, period), ...sourceRefsFor(rightItem, period)],
        });
      }
    }
  }
  const leftLatest = left.statement.periods[0];
  const rightPrior = right.statement.periods.find((period) => period === leftLatest);
  if (rightPrior) {
    for (const concept of ["total_assets", "total_liabilities", "owners_equity"] as BalanceSheetConcept[]) {
      const leftItem = firstConcept(left.lineItems, concept);
      const rightItem = firstConcept(right.lineItems, concept);
      const leftValue = effectiveNormalizedValue(leftItem, leftLatest);
      const rightValue = effectiveNormalizedValue(rightItem, rightPrior);
      if (leftValue !== null && rightValue !== null && leftValue !== rightValue) {
        issues.push({ id: `issue:opening-closing:${concept}:${leftLatest}`, code: "OPENING_CLOSING_INCONSISTENCY", severity: "warning", message: `${concept} closing balance for ${leftLatest} does not match the same reported period in the comparison document.`, period: leftLatest, difference: leftValue - rightValue, sourceRefs: [...sourceRefsFor(leftItem, leftLatest), ...sourceRefsFor(rightItem, rightPrior)] });
      }
    }
  }
  return { leftReviewId: left.reviewId, rightReviewId: right.reviewId, overlaps, issues };
}

export function reviewToCsv(review: BalanceSheetReview) {
  const header = ["review_id", "document_id", "file_name", "entity", "page", "english_label", "original_label", "translation_status", "source_row_code", "normalized_concept", "classification", "period", "raw_reported_value", "reported_value", "normalized_value", "corrected_reported_value", "corrected_normalized_value", "currency", "unit_scale", "confidence", "review_status"];
  const rows = review.lineItems.flatMap((item) => item.values.map((value) => [
    review.reviewId,
    review.source.documentId,
    review.source.fileName,
    review.statement.reportingEntity,
    value.source.page,
    item.englishLabel,
    item.originalLabel,
    item.translationStatus,
    item.sourceRowCode ?? "",
    item.normalizedConcept,
    item.classification,
    value.period,
    value.rawReportedValue,
    value.reportedValue ?? "",
    value.normalizedValue ?? "",
    value.correction?.correctedReportedValue ?? "",
    value.correction?.correctedNormalizedValue ?? "",
    review.statement.currency,
    review.statement.unitScale,
    value.source.confidence,
    item.reviewStatus,
  ]));
  const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  return [header, ...rows].map((row) => row.map(escape).join(",")).join("\n");
}
