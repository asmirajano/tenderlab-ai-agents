import type {
  SupplierEvidenceApiRecord,
  TenderMatchRuntimePayload,
} from "../../../packages/tendermatch/src";

export type TenderMatchRuntimeState =
  | { status: "loading"; progress: string }
  | { status: "ready"; payload: TenderMatchRuntimePayload }
  | { status: "offline" | "error"; message: string };

async function responseJson(response: Response) {
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : `Supplier service returned HTTP ${response.status}.`);
  return body;
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
    return await responseJson(response) as unknown as TenderMatchRuntimePayload;
  }
  throw new Error("Supplier service did not become ready within the local startup budget.");
}

export async function loadSupplierEvidence(canonicalEntityId: string, signal?: AbortSignal): Promise<SupplierEvidenceApiRecord[]> {
  const response = await fetch(`/api/tendermatch/suppliers/${encodeURIComponent(canonicalEntityId)}/evidence`, { cache: "no-store", credentials: "same-origin", signal });
  const body = await responseJson(response) as { evidence?: SupplierEvidenceApiRecord[] };
  return body.evidence ?? [];
}
