import {
  TENDERMATCH_SUPPLIER_BATCH_CODE,
  TENDERMATCH_SUPPLIER_CONTRACT_VERSION,
  TENDERMATCH_SUPPLIER_EXPECTED_EVIDENCE_COUNT,
  TENDERMATCH_SUPPLIER_EXPECTED_PROFILE_COUNT,
  TENDERMATCH_SUPPLIER_PROFILE_VERSION,
  runtimeTenders,
} from "../../../packages/tendermatch/src/index.ts";
import type {
  SupplierEvidenceApiRecord,
  TenderMatchRuntimePayload,
} from "../../../packages/tendermatch/src/index.ts";

export type TenderMatchRuntimeState =
  | { status: "loading"; progress: string }
  | { status: "ready"; payload: TenderMatchRuntimePayload }
  | { status: "offline" | "error"; message: string };

export const TENDERMATCH_STATIC_RUNTIME_URL = "/tendermatch/data/supplier-runtime-v1.3.json";
export const TENDERMATCH_STATIC_EVIDENCE_URL = "/tendermatch/data/supplier-evidence-v1.3.json";

type StaticEvidenceSnapshot = {
  schemaVersion: "tendermatch-static-supplier-evidence/1.0.0";
  mode: "static-pinned-snapshot";
  contractVersion: typeof TENDERMATCH_SUPPLIER_CONTRACT_VERSION;
  profileVersion: typeof TENDERMATCH_SUPPLIER_PROFILE_VERSION;
  batchCode: typeof TENDERMATCH_SUPPLIER_BATCH_CODE;
  retrievedAt: string;
  evidenceBySupplier: Record<string, SupplierEvidenceApiRecord[]>;
};

let staticEvidencePromise: Promise<StaticEvidenceSnapshot> | null = null;

async function responseJson(response: Response) {
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : `Supplier service returned HTTP ${response.status}.`);
  return body;
}

export function validateTenderMatchRuntimePayload(value: unknown): TenderMatchRuntimePayload {
  const payload = value as Partial<TenderMatchRuntimePayload> | null;
  const summary = payload?.summary;
  const expectedEvaluations = TENDERMATCH_SUPPLIER_EXPECTED_PROFILE_COUNT * runtimeTenders.length;
  if (
    !payload
    || payload.status !== "ready"
    || (payload.mode !== "neon-read-only" && payload.mode !== "static-pinned-snapshot")
    || !Array.isArray(payload.suppliers)
    || !Array.isArray(payload.evaluations)
    || !payload.evaluationSummary
    || summary?.contractVersion !== TENDERMATCH_SUPPLIER_CONTRACT_VERSION
    || summary.profileVersion !== TENDERMATCH_SUPPLIER_PROFILE_VERSION
    || summary.batchCode !== TENDERMATCH_SUPPLIER_BATCH_CODE
    || summary.profileCount !== TENDERMATCH_SUPPLIER_EXPECTED_PROFILE_COUNT
    || summary.evidenceCount !== TENDERMATCH_SUPPLIER_EXPECTED_EVIDENCE_COUNT
    || payload.suppliers.length !== TENDERMATCH_SUPPLIER_EXPECTED_PROFILE_COUNT
    || payload.evaluations.length !== expectedEvaluations
    || payload.evaluationSummary.total !== expectedEvaluations
  ) {
    throw new TypeError("Supplier service returned a body outside the pinned TenderMatch v1.3 runtime contract.");
  }
  return payload as TenderMatchRuntimePayload;
}

export async function loadTenderMatchRuntime(signal?: AbortSignal): Promise<TenderMatchRuntimePayload> {
  try {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const response = await fetch("/api/tendermatch/runtime", { cache: "no-store", credentials: "same-origin", signal });
      if (response.status === 202) {
        await new Promise((resolve, reject) => {
          const timer = window.setTimeout(resolve, 150);
          signal?.addEventListener("abort", () => { window.clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); }, { once: true });
        });
        continue;
      }
      return validateTenderMatchRuntimePayload(await responseJson(response));
    }
    throw new Error("Supplier service did not become ready within the local startup budget.");
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    const response = await fetch(TENDERMATCH_STATIC_RUNTIME_URL, { cache: "no-store", credentials: "same-origin", signal });
    const payload = validateTenderMatchRuntimePayload(await responseJson(response));
    if (payload.mode !== "static-pinned-snapshot") throw new TypeError("Static supplier release did not declare its pinned snapshot mode.");
    return payload;
  }
}

async function loadStaticEvidenceSnapshot(signal?: AbortSignal) {
  if (!staticEvidencePromise) {
    staticEvidencePromise = fetch(TENDERMATCH_STATIC_EVIDENCE_URL, { cache: "no-store", credentials: "same-origin", signal })
      .then(responseJson)
      .then((value) => {
        const snapshot = value as Partial<StaticEvidenceSnapshot>;
        const total = Object.values(snapshot.evidenceBySupplier ?? {}).reduce((count, records) => count + records.length, 0);
        if (
          snapshot.schemaVersion !== "tendermatch-static-supplier-evidence/1.0.0"
          || snapshot.mode !== "static-pinned-snapshot"
          || snapshot.contractVersion !== TENDERMATCH_SUPPLIER_CONTRACT_VERSION
          || snapshot.profileVersion !== TENDERMATCH_SUPPLIER_PROFILE_VERSION
          || snapshot.batchCode !== TENDERMATCH_SUPPLIER_BATCH_CODE
          || total !== TENDERMATCH_SUPPLIER_EXPECTED_EVIDENCE_COUNT
        ) throw new TypeError("Static supplier evidence is outside the pinned TenderMatch v1.3 contract.");
        return snapshot as StaticEvidenceSnapshot;
      })
      .catch((error) => {
        staticEvidencePromise = null;
        throw error;
      });
  }
  return staticEvidencePromise;
}

export async function loadSupplierEvidence(canonicalEntityId: string, signal?: AbortSignal, mode: TenderMatchRuntimePayload["mode"] = "neon-read-only"): Promise<SupplierEvidenceApiRecord[]> {
  if (mode === "neon-read-only") {
    try {
      const response = await fetch(`/api/tendermatch/suppliers/${encodeURIComponent(canonicalEntityId)}/evidence`, { cache: "no-store", credentials: "same-origin", signal });
      const body = await responseJson(response) as { evidence?: SupplierEvidenceApiRecord[] };
      return body.evidence ?? [];
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
    }
  }
  const snapshot = await loadStaticEvidenceSnapshot(signal);
  const records = snapshot.evidenceBySupplier[canonicalEntityId] ?? [];
  if (records.some((record) => record.canonicalEntityId !== canonicalEntityId)) throw new TypeError("Static evidence crossed a canonical supplier boundary.");
  return records;
}
