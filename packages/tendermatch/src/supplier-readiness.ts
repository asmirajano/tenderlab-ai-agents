import { sha256Content, stableStringify } from "./retrieval-features.ts";
import { SAFE_FIELDS, type SupplierInput, type SourceClaim } from "./input-normalization.ts";

export const READINESS_SCHEMA = "tendermatch-supplier-readiness/1.0.0";
export const READINESS_POLICY = "tendermatch-supplier-alignment/1.0.0";
export const READINESS_FIELDS = ["classification", "activity", "product_families", "works_specializations",
  "industries_served", "materials", "manufacturing_processes", "service_capabilities", "output_capacity",
  "facilities", "workforce", "equipment", "specifications", "geographic_markets", "local_presence",
  "delivery", "after_sales", "certifications", "comparable_contracts", "reference_context", "financial",
  "financial_other", "operating_metrics", "experience_context", "compliance"] as const;
type Field = typeof READINESS_FIELDS[number];
type State = "MAPPED" | "NEEDS_EVIDENCE" | "UNKNOWN";
type JsonValue = null | string | number | boolean | JsonValue[] | { [key: string]: JsonValue };
type Fact = { id: string; field: Field; state: State; value: JsonValue; sourceClaimId: string;
  sourceStatus: SourceClaim["status"]; valueClass: "SOURCE" | "CALCULATED" | "ESTIMATED";
  sourceSpan: string; rule: string; reasons: string[] };
type Scope = "GOODS" | "WORKS" | "SERVICES" | "CONSULTING" | "MIXED" | "UNKNOWN";
const hash = (value: unknown) => sha256Content(stableStringify(value));
const unique = (values: string[]) => [...new Set(values)].sort();
const usable = (e: SourceClaim) => e.status !== "UNKNOWN" && e.value_class === "SOURCE"
  && !!e.display_value?.trim() && !/^(UNKNOWN|N\/A|not (?:known|disclosed|available))\b/i.test(e.display_value);
const SERVICE = /\b(?:services?|freight|forward(?:er|ing)|shipping|shipment|sourcing|purchasing|logistics|consult(?:ing|ation|ancy)|warehousing|transport(?:ation|ion)?|importer agent|LCL|DDP|Express)\b/i;
const WORKS = /\b(?:EPC|civil works|general construction|road construction|building construction|warehouse design and construction|steel frame construction)\b/i;
// Physical product nouns, not arbitrary "supplier", "goods" or a company name.
const GOODS = /\b(?:parts?|components?|bags?|pouches?|packaging|film|bottles?|jars?|boxes|box|cartons?|cups?|paper|sacks?|labels?|patches|tags|shirts?|apparel|jersey|jerseys|hoodies?|caps?|hats?|wigs?|hair|diapers?|wipes?|gloves?|tyres?|tires?|tubes?|tractors?|engines?|steel|cables?|wires?|transformers?|switchgear|equipment|machinery|forklifts?|stackers?|pallet|excavators?|minerals?|masterbatch|powder|desiccant|deoxidizer|moulds?|molds?|housings?|plastic|plastics|pcb|pcba|microcontrollers?|circuits?|semiconductors?|connectors?|IC|plc|converter|power supply|LED|display|prefab|prefabricated|container house|villa|wheels?|rims?|shelves|pvc|petrochemicals|seafood|aluminum|aluminium|sheet metal)\b/i;
const PROCESS = /\b(?:machining|milling|turning|drilling|broaching|EDM|etching|tapping|grinding|print(?:ing|ed)|casting|molding|moulding|fabrication|stamp(?:ing)?|seal(?:ing)?|custom(?:ization)?|inspection|tooling|surface treatment|OEM|ODM|production|processing|lamination|polishing|finishing|deburring|design|manufacturing|dyeing|styling|bleaching|perming|hand made|traceability|laser marking)\b/i;
const ADDITIONAL_PRODUCTS = /\b(?:pouch(?:es)?|injectors?|nozzles?|fuel injection system|valves?|coils?|paints?|belts?|sticks?|FPGA|FPGAs|PCBs|electronics|transistors?|memory|modules?|sachets?|PE|PP|caustic soda|stickers?|manuals?|brochures?|booklets?|catalogs?|indicators?|racking|joints?|metal products?|rubber products?|electrical products?|aprons?|fibers?|masterbatches|refrigerators?|dishwashers?|washing machines|freezers?|appliances?|crushers?|mills?|tissue|jackets?|kaolin|mica|iron oxide|sprayers?|pumps?|pullovers?|pac|cases?|silicone products?|flasks?|notebooks?|power banks|lanyards?|umbrellas?|kits?|buildings?|warehouses?|hearing aid|accessories|trucks?|displays?|tshirts?|plate|hangar|workshop|wallets?|holders?|sleeves|LCD|MCU|shells?|flyers|golf products|industrial products|agri-nutrients)\b/i;
const serviceOffering=(value:string)=>SERVICE.test(value.replace(/shipping\s+(?=(?:cartons?|boxes|bags?|envelopes)\b)/gi,""));
const physicalProduct=(value:string)=>!/\b(?:freight|logistics|DDP|FBA|LCL)\b/i.test(value)&&(GOODS.test(value)||ADDITIONAL_PRODUCTS.test(value));
const negated=(value:string)=>/\b(?:not (?:a|an|provided|available|certified|held)|no (?:evidence|certificate|capacity|manufacturing)|does not|cannot confirm)\b/i.test(value);

/** Split clauses without breaking grouped decimal numbers or parenthetical evidence. */
export function readinessClauses(value: string) {
  const out: string[] = []; let depth = 0, start = 0;
  for (let i = 0; i < value.length; i++) {
    if (value[i] === "(") depth++;
    if (value[i] === ")") depth = Math.max(0, depth - 1);
    if (!depth && (value[i] === ";" || value[i] === "," && !(/\d/.test(value[i - 1] ?? "") && /\d/.test(value[i + 1] ?? "")))) {
      if (value.slice(start,i).trim()) out.push(value.slice(start,i).trim()); start = i + 1;
    }
  }
  if (value.slice(start).trim()) out.push(value.slice(start).trim());
  return out;
}

function decimalScale(value: string, scale: string | undefined) {
  const exponent = ({ thousand:3, million:6, billion:9, trillion:12, crore:7, k:3, m:6 })[scale?.toLowerCase() ?? ""] ?? 0;
  const sign=value.startsWith("-")?"-":"";
  const [integer,fraction=""] = value.replace(/^-/,"").replaceAll(",", "").split(".");
  const places = fraction.length - exponent; const digits = integer + fraction;
  const result = places <= 0 ? digits + "0".repeat(-places) : digits.padStart(places+1,"0").slice(0,-places) + "." + digits.padStart(places+1,"0").slice(-places);
  return sign+result.replace(/^0+(?=\d)/, "");
}

/** Parse known dimensions independently; a missing currency never erases an amount. */
export function readinessQuantity(text: string, field: Field) {
  const reasons: string[] = [];
  const period = text.match(/\b(?:FY\s*\d{4}(?:[-–]\d{2,4})?|H[12]\s+\d{4})\b|\((?:19|20)\d{2}\)/i)?.[0]?.replace(/[()]/g, "") ?? null;
  const cadence = text.match(/\bper\s+(?:year|month|day|hour)\b|\b(?:annual(?:ly)?|monthly|daily|hourly)\b/i)?.[0]?.toLowerCase() ?? null;
  const currencies = unique(text.match(/\b(?:USD|EUR|GBP|PLN|TWD|JPY|KRW|CNY|PHP|INR|MYR|SAR|EGP|TRY|THB)\b/gi)?.map(s=>s.toUpperCase()) ?? []);
  if (/US\s*\$/i.test(text)) currencies.push("USD");
  const currency = unique(currencies).length === 1 ? currencies[0] : null;
  if (unique(currencies).length > 1) reasons.push("CONFLICTING_CURRENCIES");
  const withoutPeriod = text.replace(/\b(?:FY\s*\d{4}(?:[-–]\d{2,4})?|H[12]\s+\d{4})\b|\((?:19|20)\d{2}\)/gi, "").replace(/m[2²]/gi,"square meters");
  const numbers = [...withoutPeriod.matchAll(/(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?(?:\s*(thousand|million|billion|trillion|crore|k|M)\b)?/gi)];
  const first = numbers[0]; const second = numbers[1];
  const range = !!(first && second && /^\s*(?:L|V|mm|m|kg)?\s*[-–~]\s*(?:(?:US\s*\$|[A-Z]{3}\s*\$?|\$)\s*)?$/i.test(withoutPeriod.slice((first.index ?? 0)+first[0].length,second.index)));
  const negative = first && /-\s*$/.test(withoutPeriod.slice(0,first.index)) && !/\+\/?-\s*$/.test(withoutPeriod.slice(0,first.index));
  let amount = first ? (negative?"-":"")+first[0].replace(/\s*(thousand|million|billion|trillion|crore|k|M)$/i, "").replaceAll(",", "").trim() : null;
  let maximum = range && second ? second[0].replace(/\s*(thousand|million|billion|trillion|crore|k|M)$/i, "").replaceAll(",", "").trim() : null;
  const scale = first?.[1] ?? (range ? second?.[1] : undefined);
  let normalizedAmount = amount === null ? null : decimalScale(amount,scale);
  let normalizedMaximum = maximum === null ? null : decimalScale(maximum,second?.[1] ?? scale);
  if (normalizedAmount === null) reasons.push("AMOUNT_MISSING");
  if (normalizedAmount !== null && normalizedMaximum !== null && Number(normalizedMaximum)<Number(normalizedAmount)) reasons.push("CONTRADICTORY_RANGE");
  if (numbers.length > (range ? 2 : 1)) {reasons.push("MULTIPLE_OR_COMPOUND_NUMBERS");amount=null;maximum=null;normalizedAmount=null;normalizedMaximum=null;}
  if(negative && !["financial","financial_other"].includes(field))reasons.push("NEGATIVE_PHYSICAL_MEASURE");
  const metric = text.match(/^([^\d:;$]{2,80}):/)?.[1]?.trim()
    ?? text.match(/\b(?:annual export revenue|annual export|transaction volume|online transactions|order book|backlog|revenue from operations|revenue|turnover|external sales|sales|annual production|on-time (?:dispatch|delivery)(?: rate)?|reorder rate|rating)\b/i)?.[0]
    ?? (field === "workforce" ? (/engineers/i.test(text)?"engineers":"workforce") : field === "equipment" ? "production equipment" : field === "facilities" ? (/\b(?:m2|m²|sqm|square met)/i.test(text)?"floor area":"facility count") : field === "output_capacity" ? (/capacity/i.test(text)?"stated output capacity":"reported output") : field==="specifications"?text.match(/tolerance|tolerancia|life span|life|colors?|capacity|voltage|thickness|height/i)?.[0]??"stated product specification":field==="experience_context"?"experience or throughput context":null);
  const unitsText=first?text.slice((text.indexOf(first[0])>=0?text.indexOf(first[0]):0)):text;
  const unit = unitsText.match(/(?:metric tons|tonnes|pieces|units|points|plants|sites|facilities|employees|people|staff|engineers|machines?|machinery|equipments?|production lines?|assembly lines?|lines?|square meters|square metres|m2|sqm|shots|hours|countries|years|projects|colors?|microns|mm|kg|kVA)\b|m²|%|(?<=\d)L\b|(?<=\d)V\b/i)?.[0]?.toLowerCase()
    ?? (/\b(?:facilities|sites|production units)\s*:/i.test(text)?"count":/^employees\s*:/i.test(text)?"employees":null);
  const financial = field === "financial" || field === "financial_other";
  if (!metric) reasons.push("METRIC_MISSING");
  if (financial && !currency) reasons.push("CURRENCY_MISSING");
  if (!financial && !unit) reasons.push("UNIT_MISSING");
  if (!period && field!=="specifications") reasons.push("REPORTING_PERIOD_MISSING");
  if (field === "output_capacity" && !cadence && !period) reasons.push("OUTPUT_TIME_BASIS_MISSING");
  if (/\b(?:possible|likely|inferred|conflicting)\b/i.test(text)) reasons.push("SOURCE_SEMANTICS_UNCERTAIN");
  return { metric, amount, maximum, scale: scale?.toLowerCase() ?? null, normalizedAmount, normalizedMaximum,
    currency, unit: financial ? null : unit, reportingPeriod:period, timeBasis:cadence,
    qualifier:text.match(/\b(?:more than|over|at least|around|approximately|up to|below|above)\b/i)?.[0] ?? (/\+\/?-|±/.test(text)?"plus/minus":/\d\+/.test(text)?"at least":null),
    observedNumbers:numbers.map(n=>n[0]),valueClass:amount===null?"MISSING":"SOURCE", normalizedValueClass:normalizedAmount===null?"MISSING":"CALCULATED",
    reasons:unique(reasons) };
}

function quantityField(text: string): Field | null {
  if (/\b(?:backlog|order book|transaction|annual production)\b/i.test(text) && /\$|\b(?:USD|EUR|PHP|PLN|million|billion)\b/i.test(text)) return "financial_other";
  if (/\b(?:revenue|turnover|sales|annual export)\b/i.test(text)) return "financial";
  if (/\b(?:rate|rating|on-time|reorder)\b/i.test(text)) return "operating_metrics";
  if (/\byears?\b.*\bexperience\b/i.test(text)) return "experience_context";
  if (/\b(?:staff|employees|people|engineers)\b/i.test(text)) return "workforce";
  if (/\b(?:floor|floor\s?space|area|facilities|factories|sites|plants|production units|m2|sqm|square meters|square metres)\b|m²/i.test(text)) return "facilities";
  if (/\b(?:tolerance|tolerancia|height|voltage|thickness|life span|life\b|\d+L|liters?|litres?|hours|\d+[- ]colors?|\d+ colors?)\b/i.test(text) || /\d+hours/i.test(text)) return "specifications";
  if (/\b(?:lines?|machines?|machinery|equipments?)\b/i.test(text) && /\d/.test(text)) return "equipment";
  if (/\b(?:capacity|output|production)\b/i.test(text) && /\d/.test(text) || /\d.*pieces per/i.test(text)) return "output_capacity";
  if (/\bprojects per year\b/i.test(text)) return "experience_context";
  return null;
}

export function supplierReadinessIdentity(input: SupplierInput, codeHash: string) {
  if (!/^[a-f0-9]{64}$/.test(codeHash) || !/^[a-f0-9]{64}$/.test(input.baseContentHash)) throw new Error("Readiness hashes required");
  const sortedInput = { ...input, evidence:[...input.evidence].sort((a,b)=>a.claim_id.localeCompare(b.claim_id)) };
  return { supplierId:input.id, profileVersionId:input.profile.profile_version_id, sourceVersion:input.sourceVersion,
    baseContentHash:input.baseContentHash, inputHash:hash(sortedInput), codeHash, schema:READINESS_SCHEMA, policy:READINESS_POLICY };
}

export function alignSupplierReadiness(input: SupplierInput, codeHash: string) {
  const identity = supplierReadinessIdentity(input,codeHash);
  if (input.kind!=="supplier" || !input.id || input.profile.profile_state!=="PINNED" || input.id!==input.profile.canonical_entity_id
    || !input.profile.profile_version_id || input.profile.evidence_count!==input.evidence.length
    || new Set(input.evidence.map(e=>e.claim_id)).size!==input.evidence.length
    || input.evidence.some(e=>e.canonical_entity_id!==input.id || e.profile_version_id!==input.profile.profile_version_id
      || !e.source_record_id || !SAFE_FIELDS.includes(e.field as typeof SAFE_FIELDS[number]))) throw new Error("Readiness source association/allowlist mismatch");
  const evidence = [...input.evidence].sort((a,b)=>a.claim_id.localeCompare(b.claim_id));
  const facts: Fact[] = [];
  function emit(e: SourceClaim, field: Field, value: JsonValue, rule: string, sourceSpan=e.display_value ?? "", reasons: string[]=[], estimated=false) {
    const allReasons = unique([...reasons,...(!e.artifact_available?["ARTIFACT_UNAVAILABLE"]:[]),...(negated(sourceSpan)?["NEGATED_OR_UNESTABLISHED_CLAIM"]:[])]);
    const body = { field, value, sourceClaimId:e.claim_id, sourceStatus:e.status, sourceSpan, rule,
      reasons:allReasons, valueClass:(estimated?"ESTIMATED":"SOURCE") as Fact["valueClass"], state:(allReasons.length?"NEEDS_EVIDENCE":"MAPPED") as State };
    const fact = {id:hash(body),...body}; if (!facts.some(f=>f.id===fact.id)) facts.push(fact);
  }
  const qemit = (e:SourceClaim, field:Field, span:string) => { const q=readinessQuantity(span,field); emit(e,field,q,"typed-measure-v1",span,q.reasons); };
  for (const e of evidence.filter(usable)) {
    const value = e.display_value!;
    switch (e.field) {
      case "classification": break; // handled with conflicting neighboring evidence below
      case "identity_company_type": case "main_activity": {
        emit(e,"activity",value,"stated-activity-v1");
        const industries=value.match(/\bfor (.+?) (?:and commercial )?fields\b/i)?.[1];
        if(industries)emit(e,"industries_served",industries,"explicit-industry-scope-v1",value);
        if (serviceOffering(value)) emit(e,"service_capabilities",value,"explicit-service-v1");
        if (WORKS.test(value)) emit(e,"works_specializations",value,"explicit-works-v1");
        break;
      }
      case "product_families": case "products_portfolio": case "product_categories": {
        for (const span of readinessClauses(value)) {
          if (physicalProduct(span)) emit(e,"product_families",span,"physical-product-v1");
          else if (serviceOffering(span)) emit(e,"service_capabilities",span,"explicit-service-v1");
          else if (PROCESS.test(span)) emit(e,"manufacturing_processes",span,"explicit-process-v1");
          else emit(e,"product_families",span,"unresolved-product-category-v1",span,["PRODUCT_OR_SERVICE_MEANING_UNRESOLVED"]);
        } break;
      }
      case "industries_served": case "works_specializations": case "materials": emit(e,e.field,value,"explicit-domain-field-v1"); break;
      case "materials_specs": {
        emit(e,"specifications",value,"source-specification-v1");
        for(const span of readinessClauses(value))if(/\d\s*(?:mm|microns|V|kVA)\b/i.test(span) && !/CAS|Alloys|Mould:|Products:/i.test(span))qemit(e,"specifications",span);
        if (/\b(?:steel|stainless|plastic|aluminum|aluminium|brass|bronze|copper|rubber|paper|cardboard|cotton|polyester|nylon|PE|PP|PET|PVC|HDPE|LDPE|BOPP|ABS|PC|POM|FR4|CEM1|PEEK|silica|mica|kaolin|glass|bamboo|hair|sandwich panel|metal)\b/i.test(value)) emit(e,"materials",value,"explicit-material-v1",value,/inferred|mentioned in news/i.test(value)?["MATERIAL_CONTEXT_REQUIRES_REVIEW"]:[]);
        break;
      }
      case "capacity": case "manufacturing_capabilities_capacity": {
        for (const span of readinessClauses(value)) {
          const kind=quantityField(span);
          if(/\b(?:ISO\s*\d{4,5}|ASTM)\b.*certified/i.test(span))emit(e,"certifications",span,"explicit-embedded-credential-v1");
          else if (/plant facilities in .*countries/i.test(span)) emit(e,"local_presence",span,"facility-location-count-not-capacity-v1",span,["FACILITY_LOCATIONS_UNSPECIFIED"]);
          else if (kind) qemit(e,kind,span);
          else if (serviceOffering(span)) emit(e,"service_capabilities",span,"explicit-service-v1");
          else if (/\b(?:warehouse|factory located|office)\b/i.test(span)) emit(e,"local_presence",span,"explicit-location-not-reach-v1");
          else emit(e,"manufacturing_processes",span,"process-context-v1",span,PROCESS.test(span)?[]:["CAPABILITY_MEANING_REQUIRES_REVIEW"]);
        } break;
      }
      case "financial": case "turnover_scale": {
        for (const span of readinessClauses(value)) qemit(e,quantityField(span) ?? "financial_other",span);
        break;
      }
      case "geographic_markets": case "export_markets": {
        const unsupported=/exhibit|expo\b|certif|clients? served|innovation claim|Fortune 500|inferred|possible end-user|Export and produce/i.test(value);
        emit(e,"geographic_markets",value,"stated-market-not-presence-v1",value,unsupported?["MARKET_REACH_NOT_ESTABLISHED"]:[]); break;
      }
      case "local_presence": emit(e,"local_presence",value,"location-not-delivery-v1"); break;
      case "installation_after_sales": emit(e,"after_sales",value,"stated-support-v1",value,/OEM|ODM|return|protection|communication|tracking|Team Service/i.test(value)?["AFTER_SALES_SCOPE_UNCLEAR"]:[]); break;
      case "moq_lead_time_incoterms": {
        if (/reorder|rating|on-time delivery/i.test(value) && !/MOQ|lead time|transit time|delivery time|DDP/i.test(value)) emit(e,"operating_metrics",value,"performance-not-delivery-v1");
        else emit(e,"delivery",value,"stated-delivery-terms-v1",value,/\d|FOB|EXW|CIF|DDP|DDU|DAP/i.test(value)?[]:["DELIVERY_TERMS_INCOMPLETE"]); break;
      }
      case "certifications": {
        const named=/\b(?:ISO\s*\d{4,5}|IATF\s*\d+|AS9100|CE|RoHS|BRC|FSC|IFS|BSCI|GRS|GMP|RINA|SAA|LVD|CCC|ETL|CWB|CSA|SONCAP|ASTM|NVOCC|FCC|UL|ITAR|IEC|FDA)\b/i.test(value);
        const unsupported=/inspection services|verified by|verification badge|Gold status|Authorized Distributor|certification mentioned|standards compliance|standards compliance claimed|Certificate of Registration mentioned/i.test(value);
        emit(e,"certifications",value,"named-credential-not-marketplace-badge-v1",value,!named||unsupported?["HELD_CREDENTIAL_NOT_ESTABLISHED"]:[]); break;
      }
      case "project_references": {
        const contract=/\b(?:contract|project)\s*(?:id|no\.?|name)\s*:/i.test(value) && /\b(?:scope|works|supplied|delivered)\s*:/i.test(value) && /\b(?:role|contractor|supplier)\s*:/i.test(value);
        emit(e,contract?"comparable_contracts":"reference_context",value,"identified-contract-required-v1",value,contract?[]:["COMPARABLE_CONTRACT_NOT_ESTABLISHED"]); break;
      }
      case "compliance_risks": emit(e,"compliance",value,"unresolved-compliance-context-v1",value,["COMPLIANCE_REVIEW_REQUIRED"]); break;
    }
  }
  const eligible = evidence.filter(e=>usable(e)&&!negated(e.display_value!));
  const direct = eligible.filter(e=>e.field==="classification" && /^(GOODS|WORKS|SERVICES|CONSULTING)$/i.test(e.display_value!.trim()));
  const declared = unique(direct.map(e=>e.display_value!.trim().toUpperCase()));
  const context = eligible.filter(e=>["main_activity","identity_company_type","product_categories","products_portfolio","product_families","works_specializations"].includes(e.field));
  const goods = declared.includes("GOODS") || context.some(e=>["product_families","product_categories","products_portfolio"].includes(e.field) && physicalProduct(e.display_value!));
  const works = declared.includes("WORKS") || eligible.some(e=>e.field==="works_specializations" || e.field==="main_activity" && WORKS.test(e.display_value!));
  const consulting = declared.includes("CONSULTING") || context.some(e=>/\bconsulting|consultancy\b/i.test(e.display_value!));
  const services = declared.includes("SERVICES") || context.some(e=>serviceOffering(e.display_value!));
  const signals: Scope[] = [...(goods?["GOODS" as const]:[]),...(works?["WORKS" as const]:[]),...(consulting?["CONSULTING" as const]:services?["SERVICES" as const]:[])];
  const scope:Scope = signals.length>1?"MIXED":signals[0]??"UNKNOWN";
  const classificationSource = unique([...direct,...context].map(e=>e.claim_id));
  const classificationReasons = scope==="UNKNOWN"?["CLASSIFICATION_UNKNOWN"]:scope==="MIXED"?["MULTIPLE_CAPABILITY_SCOPES_REVIEW_REQUIRED"]:declared.includes(scope)?[]:["LEXICAL_CLASSIFICATION_REQUIRES_REVIEW"];
  for (const e of eligible.filter(e=>classificationSource.includes(e.claim_id))) emit(e,"classification",scope,"scope-evidence-v1",e.display_value!,classificationReasons,!declared.includes(scope));
  facts.sort((a,b)=>a.field.localeCompare(b.field)||a.id.localeCompare(b.id));
  const fields = Object.fromEntries(READINESS_FIELDS.map(field=>{
    const entries=facts.filter(f=>f.field===field);
    return [field,{state:entries.some(e=>e.state==="MAPPED")?"MAPPED":entries.length?"NEEDS_EVIDENCE":"UNKNOWN",
      evidenceIds:unique(entries.map(e=>e.sourceClaimId)),factIds:entries.map(e=>e.id),
      reasons:unique(entries.length?entries.flatMap(e=>e.reasons):["NO_SUPPORTED_SOURCE_VALUE"])}];
  })) as Record<Field,{state:State;evidenceIds:string[];factIds:string[];reasons:string[]}>;
  const audit = evidence.map(e=>({ claimId:e.claim_id, externalClaimId:e.external_claim_id,
    profileVersionId:e.profile_version_id, sourceField:e.source_field, projectedField:e.field, sourceRecordId:e.source_record_id,
    sourceSystem:e.source_system, retrievedAt:e.retrieved_at, sourceStatus:e.status, sourceValueClass:e.value_class,
    artifactId:e.source_artifact_id, artifactHash:e.artifact_sha256, artifactAvailable:e.artifact_available,
    artifactStatus:e.artifact_status, artifactLimitation:e.artifact_limitation, sourceClaimHash:hash(e),
    factIds:facts.filter(f=>f.sourceClaimId===e.claim_id).map(f=>f.id),
    disposition:!usable(e)?"UNKNOWN":facts.some(f=>f.sourceClaimId===e.claim_id&&f.state==="MAPPED")?"MAPPED":"NEEDS_EVIDENCE" }));
  const formulaInputCandidates = { active:false, formulaVersion:"tendermatch-match-formula/1.1.0",
    technical: facts.filter(f=>["product_families","works_specializations","industries_served","materials"].includes(f.field)&&f.state==="MAPPED").map(f=>f.id),
    typedCapacity: facts.filter(f=>["output_capacity","facilities","workforce","equipment"].includes(f.field)).map(f=>f.id),
    market:facts.filter(f=>f.field==="geographic_markets"&&f.state==="MAPPED").map(f=>f.id),
    requiresApprovedAdapter:true };
  const body = { identity, readinessId:hash(identity), supplierId:input.id, profile:input.profile,
    sourceProvenance:input.provenance, sourceRole:"AUTHORITATIVE_SOURCE", facts, fields, audit,
    classification:{ scope, signals, sourceClassification:input.profile.classification,
      valueClass:scope==="UNKNOWN"?"MISSING":declared.includes(scope)?"SOURCE":"ESTIMATED",
      evidenceIds:classificationSource,reasons:classificationReasons,
      formulaScope:scope==="GOODS"||scope==="WORKS"?"CANDIDATE_IN_SCOPE":scope==="SERVICES"||scope==="CONSULTING"?"OUTSIDE_V1_1_SCOPE":"UNRESOLVED" },
    readiness:{ state:"NEEDS_EVIDENCE", basis:"supplier-side evidence completeness, not eligibility",
      missingFields:READINESS_FIELDS.filter(f=>fields[f].state==="UNKNOWN"),
      incompleteFields:READINESS_FIELDS.filter(f=>fields[f].state==="NEEDS_EVIDENCE"),
      reasons:unique([...classificationReasons,...(evidence.some(e=>e.status!=="VERIFIED")?["INDEPENDENT_VERIFICATION_REQUIRED"]:[]),"COMPLIANCE_AND_TENDER_REQUIREMENTS_NOT_ASSESSED"]),
      humanReview:"NOT_PERFORMED", automatedFieldReview:"COMPLETE" },
    trust:{ independentlyVerifiedClaims:evidence.filter(e=>e.status==="VERIFIED").length,
      unavailableArtifacts:evidence.filter(e=>!e.artifact_available).length, confidenceAggregation:null },
    formulaInputCandidates, execution:{ suppliersExtracted:1, pairEvaluations:0, eligibilityOutcomes:0, retrievalRuns:0, humanDispositions:0 } };
  return { ...body,contentHash:hash(body) };
}
export type SupplierReadiness = ReturnType<typeof alignSupplierReadiness>;
export function validateSupplierReadiness(record:SupplierReadiness,input:SupplierInput,codeHash:string) {
  const {contentHash,...body}=record;
  if (contentHash!==hash(body) || record.readinessId!==hash(supplierReadinessIdentity(input,codeHash))
    || record.audit.length!==input.evidence.length || record.execution.pairEvaluations!==0
    || record.formulaInputCandidates.active!==false) throw new Error("Readiness cache identity/content mismatch");
  return record;
}
