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
    || payload.mode !== "neon-read-only"
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
}

export async function loadSupplierEvidence(canonicalEntityId: string, signal?: AbortSignal): Promise<SupplierEvidenceApiRecord[]> {
  const response = await fetch(`/api/tendermatch/suppliers/${encodeURIComponent(canonicalEntityId)}/evidence`, { cache: "no-store", credentials: "same-origin", signal });
  const body = await responseJson(response) as { evidence?: SupplierEvidenceApiRecord[] };
  return body.evidence ?? [];
}
