export type SemanticSearchField = {
  key: "name" | "alias" | "description" | "scope" | "activity" | "exclusion" | "input" | "trigger" | "boundary" | "distinction" | "workflow" | "output" | "rationale" | "metadata";
  label: string;
  text: string;
  weight: number;
};

export type SemanticSearchDocument = {
  id: number;
  name: string;
  aliases: string[];
  fields: SemanticSearchField[];
};

export type SemanticSearchResult = {
  id: number;
  score: number;
  exact: boolean;
  reasons: string[];
};

type SearchDocumentInput = {
  id: number;
  name: string;
  aliases?: string[];
  description?: string;
  scope?: string;
  activities?: string;
  exclusions?: string;
  inputs?: string;
  trigger?: string;
  boundary?: string;
  distinction?: string;
  workflow?: string;
  output?: string;
  rationale?: string;
  metadata?: string;
};

const STOP_WORDS = new Set([
  "a", "an", "and", "agent", "action", "for", "from", "in", "is", "just", "normal", "of", "or", "our", "responsible", "responsibility", "that", "the", "to", "which", "who", "with",
  "агент", "в", "для", "и", "или", "который", "на", "по", "с", "что", "это",
]);

const CONCEPT_GROUPS = [
  ["evidence", "proof", "provenance", "source", "citation", "trace", "confidence", "check", "checking", "validate", "validation", "verify", "verified", "verification", "доказатель", "источник", "происхожд", "провер", "подтвержд", "уверен"],
  ["readiness", "ready", "prepared", "preparedness", "maturity", "готов", "зрел"],
  ["company", "business", "manufacturer", "organization", "supplier", "vendor", "компан", "бизнес", "организац", "производител", "поставщик"],
  ["human", "manual", "approval", "approve", "signoff", "review", "gate", "человек", "ручн", "согласован", "утвержд", "одобрен"],
  ["decision", "decide", "recommendation", "choice", "решен", "рекомендац", "выбор"],
  ["discover", "discovery", "find", "finder", "search", "scout", "opportunity", "suitable", "relevant", "найт", "поиск", "обнаруж", "возможност", "подход", "релевант"],
  ["tender", "procurement", "notice", "bid", "закуп", "тендер", "торг", "заявк"],
  ["certificate", "certification", "credential", "license", "licence", "iso", "fsc", "сертифик", "лиценз", "удостовер"],
  ["price", "pricing", "cost", "boq", "quotation", "quote", "commercial", "margin", "budget", "цена", "ценов", "стоимост", "калькуляц", "смет", "марж", "бюджет", "коммерч"],
  ["nobid", "no-go", "nogo", "participate", "participation", "opportunityscore", "go", "участи", "отказ", "вероятност", "оценк"],
  ["match", "matching", "fit", "relevance", "score", "соответств", "совпад", "релевант", "рейтинг", "оценк"],
  ["requirement", "criteria", "eligibility", "qualification", "mandatory", "требован", "критери", "допуск", "квалификац", "обязател"],
  ["compliance", "conformity", "technical", "commercial", "комплаенс", "соответств", "техническ", "коммерч"],
  ["document", "form", "attachment", "file", "documentintake", "документ", "форм", "вложен", "файл"],
  ["proposal", "submission", "assemble", "application", "offer", "предложен", "подач", "сборк", "заявк", "оферт"],
  ["partner", "consortium", "jv", "subcontractor", "representative", "партнер", "партнёр", "консорци", "субподряд", "представител"],
  ["supplier", "vendor", "rfq", "quotation", "поставщик", "вендор", "котиров", "запросцен"],
  ["risk", "integrity", "sanction", "due", "diligence", "риск", "санкц", "добросовест"],
  ["award", "contract", "winner", "присужден", "контракт", "победител"],
  ["delivery", "execution", "logistics", "capacity", "поставк", "исполнен", "логист", "мощност"],
  ["ocr", "translation", "language", "scan", "перевод", "язык", "скан", "распознаван"],
  ["deadline", "alert", "reminder", "calendar", "срок", "уведомлен", "напоминан", "календар"],
  ["buyer", "customer", "competitor", "market", "заказчик", "покупател", "конкурент", "рынок"],
  ["new", "newly", "publish", "published", "publication", "announce", "announced", "notice", "нов", "публикац", "опублик", "объяв", "анонс", "извещен"],
  ["monitor", "monitoring", "detect", "detection", "fetch", "collect", "capture", "acquire", "acquisition", "ingest", "ingestion", "receive", "crawl", "монитор", "обнаруж", "получ", "забира", "собира", "загруз"],
  ["radar", "portal", "source", "feed", "endpoint", "website", "api", "радар", "портал", "источник", "фид", "сайт"],
];

const FIELD_WEIGHTS: Record<SemanticSearchField["key"], number> = {
  name: 1,
  alias: .96,
  description: .82,
  scope: .92,
  activity: .9,
  exclusion: .66,
  input: .78,
  trigger: .94,
  boundary: .9,
  distinction: .9,
  workflow: .78,
  output: .88,
  rationale: .7,
  metadata: .56,
};

const SOURCE_QUERY_SIGNALS = ["new", "newly", "publish", "announc", "monitor", "detect", "radar", "portal", "source", "feed", "fetch", "collect", "capture", "acquire", "ingest", "receive", "crawl", "notice", "нов", "публи", "объяв", "анонс", "монитор", "обнаруж", "радар", "портал", "источник", "получ", "забира", "собира", "загруз"];
const SOURCE_OWNER_ACTIONS = ["fetch", "acquire", "acquisition", "monitor", "crawl", "collect", "capture", "receive", "download", "получ", "забира", "скачив", "монитор", "собира", "загруз"];
const SOURCE_OWNER_CHANNELS = ["source", "portal", "feed", "endpoint", "website", "api", "источник", "портал", "сайт", "фид"];
const POST_AWARD_SIGNALS = ["award", "outcome", "feedback", "execution", "contract performance", "learning", "присужд", "результат", "обратн", "исполнен", "обучен"];
const SUBMISSION_SIGNALS = ["proposal", "submission", "submit", "final package", "signature", "receipt", "предложен", "подач", "подпис", "финальн", "квитанц"];

function includesSignal(token: string, signals: string[]) {
  return signals.some((signal) => token === signal || (Math.min(token.length, signal.length) >= 4 && (token.startsWith(signal) || signal.startsWith(token))));
}

export function normalizeSearchText(value: string) {
  return value
    .toLocaleLowerCase("ru-RU")
    .replaceAll("ё", "е")
    .replace(/bid\s*[-/]\s*no\s*[-/]?\s*bid/g, "bid nobid")
    .replace(/no\s*[-/]\s*bid/g, "nobid")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function stemToken(token: string) {
  if (/^[a-z0-9]+$/.test(token)) {
    return token
      .replace(/ies$/, "y")
      .replace(/(ing|edly|edly|ed|es|s)$/, "") || token;
  }
  return token;
}

function tokenize(value: string) {
  return normalizeSearchText(value)
    .split(" ")
    .map(stemToken)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function deriveAliases(name: string) {
  const withoutAgent = name.replace(/\s+Agent$/i, "").trim();
  const words = withoutAgent.match(/[A-ZА-ЯЁ][A-Za-zА-Яа-яЁё0-9]*/g) ?? [];
  const acronym = words.map((word) => word[0]).join("");
  return [...new Set([
    withoutAgent,
    withoutAgent.replace(/[&/]/g, " and ").replace(/-/g, " "),
    withoutAgent.replace(/[^\p{L}\p{N}]+/gu, ""),
    acronym.length >= 2 ? acronym : "",
  ].filter(Boolean))];
}

export function createSemanticSearchDocument(input: SearchDocumentInput): SemanticSearchDocument {
  const aliases = [...new Set([...deriveAliases(input.name), ...(input.aliases ?? [])])];
  const fields: SemanticSearchField[] = [
    { key: "name", label: "Название", text: input.name, weight: FIELD_WEIGHTS.name },
    { key: "alias", label: "Alias / аббревиатура", text: aliases.join(" · "), weight: FIELD_WEIGHTS.alias },
    { key: "description", label: "Core Purpose / Simply", text: input.description ?? "", weight: FIELD_WEIGHTS.description },
    { key: "scope", label: "Responsibility / Scope", text: input.scope ?? "", weight: FIELD_WEIGHTS.scope },
    { key: "activity", label: "What It Does", text: input.activities ?? "", weight: FIELD_WEIGHTS.activity },
    { key: "exclusion", label: "What It Should NOT Do", text: input.exclusions ?? "", weight: FIELD_WEIGHTS.exclusion },
    { key: "input", label: "Typical Inputs", text: input.inputs ?? "", weight: FIELD_WEIGHTS.input },
    { key: "trigger", label: "Trigger / Activation", text: input.trigger ?? "", weight: FIELD_WEIGHTS.trigger },
    { key: "boundary", label: "Responsibility Boundary", text: input.boundary ?? "", weight: FIELD_WEIGHTS.boundary },
    { key: "distinction", label: "Key Distinction", text: input.distinction ?? "", weight: FIELD_WEIGHTS.distinction },
    { key: "workflow", label: "Workflow", text: input.workflow ?? "", weight: FIELD_WEIGHTS.workflow },
    { key: "output", label: "Result / Output", text: input.output ?? "", weight: FIELD_WEIGHTS.output },
    { key: "rationale", label: "Platform rationale", text: input.rationale ?? "", weight: FIELD_WEIGHTS.rationale },
    { key: "metadata", label: "Класс / слой / сторона", text: input.metadata ?? "", weight: FIELD_WEIGHTS.metadata },
  ].filter((field) => field.text.trim());
  return { id: input.id, name: input.name, aliases, fields };
}

function conceptIds(token: string) {
  const ids: number[] = [];
  CONCEPT_GROUPS.forEach((group, index) => {
    if (group.some((term) => token === term || (token.length >= 4 && (token.startsWith(term) || term.startsWith(token))))) ids.push(index);
  });
  return ids;
}

function editSimilarity(left: string, right: string) {
  if (left === right) return 1;
  if (!left.length || !right.length) return 0;
  if (Math.abs(left.length - right.length) > 3) return 0;
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= right.length; j += 1) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return 1 - previous[right.length] / Math.max(left.length, right.length);
}

function tokenSimilarity(queryToken: string, fieldToken: string) {
  if (queryToken === fieldToken) return 1;
  if (Math.min(queryToken.length, fieldToken.length) >= 4 && (queryToken.startsWith(fieldToken) || fieldToken.startsWith(queryToken))) return .9;
  const queryConcepts = conceptIds(queryToken);
  if (queryConcepts.length && conceptIds(fieldToken).some((id) => queryConcepts.includes(id))) return .84;
  const fuzzy = editSimilarity(queryToken, fieldToken);
  return fuzzy >= .72 ? fuzzy * .86 : 0;
}

export function rankSemanticDocuments(query: string, documents: SemanticSearchDocument[]): SemanticSearchResult[] {
  const normalizedQuery = normalizeSearchText(query);
  const queryTokens = tokenize(query);
  if (!normalizedQuery || !queryTokens.length) return documents.map((document) => ({ id: document.id, score: 100, exact: false, reasons: [] }));

  return documents.map((document) => {
    const normalizedName = normalizeSearchText(document.name);
    const normalizedAliases = document.aliases.map(normalizeSearchText);
    const exact = normalizedName === normalizedQuery;
    if (exact) return { id: document.id, score: 100, exact: true, reasons: ["Точное название"] };
    if (normalizedAliases.includes(normalizedQuery)) return { id: document.id, score: 98, exact: true, reasons: ["Точный alias"] };

    let matchedTokens = 0;
    let roleMatchedTokens = 0;
    let weightedTokenScore = 0;
    const reasonScores = new Map<string, number>();

    for (const queryToken of queryTokens) {
      let best = 0;
      let bestLabel = "";
      for (const field of document.fields) {
        const fieldTokens = tokenize(field.text);
        const similarity = fieldTokens.reduce((highest, fieldToken) => Math.max(highest, tokenSimilarity(queryToken, fieldToken)), 0);
        const weighted = similarity * field.weight;
        if (weighted > best) {
          best = weighted;
          bestLabel = field.label;
        }
      }
      if (best >= .35) matchedTokens += 1;
      const roleSimilarity = document.fields
        .filter((field) => field.key === "name" || field.key === "alias" || field.key === "description" || field.key === "scope" || field.key === "activity" || field.key === "trigger" || field.key === "boundary" || field.key === "distinction")
        .flatMap((field) => tokenize(field.text))
        .reduce((highest, fieldToken) => Math.max(highest, tokenSimilarity(queryToken, fieldToken)), 0);
      if (roleSimilarity >= .35) roleMatchedTokens += 1;
      weightedTokenScore += best;
      if (bestLabel) reasonScores.set(bestLabel, (reasonScores.get(bestLabel) ?? 0) + best);
    }

    const coverage = matchedTokens / queryTokens.length;
    const roleCoverage = roleMatchedTokens / queryTokens.length;
    const average = weightedTokenScore / queryTokens.length;
    const phraseInName = normalizedName.includes(normalizedQuery) ? .16 : 0;
    const phraseInAlias = normalizedAliases.some((alias) => alias.includes(normalizedQuery)) ? .12 : 0;
    const phraseInOtherField = document.fields.some((field) => field.key !== "name" && field.key !== "alias" && normalizeSearchText(field.text).includes(normalizedQuery)) ? .08 : 0;
    const directOwnershipTokens = document.fields
      .filter((field) => ["scope", "activity", "input", "trigger", "boundary"].includes(field.key))
      .flatMap((field) => tokenize(field.text));
    const sourceOwnerActions = new Set(directOwnershipTokens.filter((token) => includesSignal(token, SOURCE_OWNER_ACTIONS))).size;
    const sourceOwnerChannels = new Set(directOwnershipTokens.filter((token) => includesSignal(token, SOURCE_OWNER_CHANNELS))).size;
    const publicationAdjacent = directOwnershipTokens.some((token) => conceptIds(token).includes(CONCEPT_GROUPS.length - 3));
    const negativeOwnershipTokens = document.fields
      .filter((field) => field.key === "exclusion")
      .flatMap((field) => tokenize(field.text));
    const explicitlyRejectsSourceOwnership = negativeOwnershipTokens.some((token) => includesSignal(token, SOURCE_OWNER_ACTIONS))
      && negativeOwnershipTokens.some((token) => includesSignal(token, SOURCE_OWNER_CHANNELS));
    const hasTenderIntent = queryTokens.some((token) => conceptIds(token).includes(6));
    const sourceIntent = queryTokens.some((token) => includesSignal(token, SOURCE_QUERY_SIGNALS));
    const postAwardLifecycle = directOwnershipTokens.some((token) => includesSignal(token, POST_AWARD_SIGNALS));
    const submissionLifecycle = directOwnershipTokens.some((token) => includesSignal(token, SUBMISSION_SIGNALS));
    const sourceOwnershipBonus = sourceIntent && hasTenderIntent && !explicitlyRejectsSourceOwnership && !postAwardLifecycle && !submissionLifecycle && sourceOwnerActions >= 2 && sourceOwnerChannels >= 1 ? 18 : 0;
    if (sourceOwnershipBonus) reasonScores.set("Responsibility / Scope", (reasonScores.get("Responsibility / Scope") ?? 0) + 1.2);
    let rawScore = average * 58 + coverage * 22 + roleCoverage * 16 + (phraseInName + phraseInAlias + phraseInOtherField) * 50 + sourceOwnershipBonus;
    if (sourceIntent && hasTenderIntent && !sourceOwnershipBonus) {
      rawScore = rawScore * .45 + (publicationAdjacent ? 15 : 0);
      if (postAwardLifecycle || submissionLifecycle) rawScore *= .42;
      if (publicationAdjacent) reasonScores.set("Trigger / Activation", (reasonScores.get("Trigger / Activation") ?? 0) + .8);
    }
    const score = Math.max(1, Math.min(97, Math.round(rawScore)));
    const reasons = [...reasonScores.entries()].sort((left, right) => right[1] - left[1]).slice(0, 2).map(([label]) => label);
    return { id: document.id, score, exact: false, reasons };
  }).sort((left, right) => right.score - left.score || left.id - right.id);
}

export function selectVisibleSemanticResults(results: SemanticSearchResult[], limit = 12) {
  if (!results.length) return [];
  const floor = Math.max(24, results[0].score - 42);
  const qualified = results.filter((result) => result.score >= floor).slice(0, limit);
  return qualified.length >= Math.min(3, results.length) ? qualified : results.slice(0, Math.min(3, limit, results.length));
}

