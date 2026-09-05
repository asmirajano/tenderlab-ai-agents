import { sha256Content, stableStringify } from "./retrieval-features.ts";

export const ASSESSMENT_POLICY_VERSION = "tendermatch-selective-tors/1.0.0" as const;
export const ASSESSMENT_SCHEMA_VERSION = "tendermatch-full-tors/1.0.0" as const;
export type AssessmentReason = "SHORTLIST_TOP_RANKED" | "AMBIGUOUS_EVIDENCE" | "MISSING_REQUIRED_EVIDENCE" | "CONFLICTING_EVIDENCE" | "USER_OPENED_PAIR" | "JUSTIFIED_REPORT_REQUEST";
export type AssessmentState = "NOT_ESCALATED" | "DISABLED" | "QUEUED" | "LEASED" | "SUCCEEDED" | "RETRY_WAIT" | "FAILED" | "CANCELLED";
export type AssessmentIdentity = {
  tenantId: string; runId: string; supplierId: string; tenderId: string; pairCacheKey: string;
  supplierVersion: string; tenderVersion: string; evidenceSnapshot: string; formulaVersion: string;
};
export type AssessmentPolicyInput = AssessmentIdentity & {
  eligible: boolean; shortlistRank?: number | null; ambiguousEvidence?: boolean; missingRequiredEvidence?: boolean;
  conflictingEvidence?: boolean; openedBy?: string; reportRequest?: { requestId: string; justification: string; actor: string };
};
export type AssessmentJob = {
  id: string; idempotencyKey: string; identity: AssessmentIdentity; policyVersion: typeof ASSESSMENT_POLICY_VERSION;
  schemaVersion: typeof ASSESSMENT_SCHEMA_VERSION; providerVersion: string | null; reasons: AssessmentReason[];
  state: AssessmentState; revision: number; attempts: number; maxAttempts: number; createdAt: string; updatedAt: string;
  nextAttemptAt: string | null; lease: { token: string; owner: string; expiresAt: string } | null;
  lastError: string | null; artifactId: string | null;
};
export type FullTorsArtifact = {
  id: string; jobId: string; identity: AssessmentIdentity; schemaVersion: typeof ASSESSMENT_SCHEMA_VERSION;
  providerVersion: string; modelVersion: string; promptVersion: string; inputHash: string; createdAt: string;
  assessment: { summary: string; findings: { claim: string; evidenceIds: string[]; missing: boolean }[]; limitations: string[] };
  /** TORS reports are advisory; Formula points and human disposition have no write path here. */
  authority: "ADVISORY_ONLY";
};
export interface FullTorsProvider {
  version: string; modelVersion: string; promptVersion: string;
  assess(input: { identity: AssessmentIdentity; evidence: readonly { id: string; text: string }[]; inputHash: string; signal?: AbortSignal }): Promise<FullTorsArtifact["assessment"]>;
}

function validTime(value: string) { const number = Date.parse(value); if (!Number.isFinite(number)) throw new Error("An explicit valid ISO clock is required."); return number; }
function validateIdentity(identity: AssessmentIdentity) {
  for (const [key, value] of Object.entries(identity)) if (typeof value !== "string" || !value.trim()) throw new Error(`Assessment identity ${key} is required.`);
}
export function assessmentReasons(input: AssessmentPolicyInput, options: { shortlistLimit?: number } = {}): AssessmentReason[] {
  if (!input.eligible) return [];
  const limit = options.shortlistLimit ?? 20;
  if (!Number.isInteger(limit) || limit < 0 || limit > 100) throw new Error("shortlistLimit must be an integer from 0 to 100.");
  const reasons: AssessmentReason[] = [];
  if (input.shortlistRank != null && Number.isInteger(input.shortlistRank) && input.shortlistRank >= 1 && input.shortlistRank <= limit) reasons.push("SHORTLIST_TOP_RANKED");
  if (input.ambiguousEvidence) reasons.push("AMBIGUOUS_EVIDENCE");
  if (input.missingRequiredEvidence) reasons.push("MISSING_REQUIRED_EVIDENCE");
  if (input.conflictingEvidence) reasons.push("CONFLICTING_EVIDENCE");
  if (input.openedBy?.trim()) reasons.push("USER_OPENED_PAIR");
  if (input.reportRequest?.requestId.trim() && input.reportRequest.justification.trim() && input.reportRequest.actor.trim()) reasons.push("JUSTIFIED_REPORT_REQUEST");
  return reasons;
}

/** Called only at a shortlist/review/report boundary, not for all ordinary pair records. */
export function createAssessmentJob(input: AssessmentPolicyInput, now: string, providerVersion: string | null, options: { shortlistLimit?: number; maxAttempts?: number } = {}): AssessmentJob {
  validTime(now);
  const identity: AssessmentIdentity = { tenantId: input.tenantId, runId: input.runId, supplierId: input.supplierId, tenderId: input.tenderId, pairCacheKey: input.pairCacheKey, supplierVersion: input.supplierVersion, tenderVersion: input.tenderVersion, evidenceSnapshot: input.evidenceSnapshot, formulaVersion: input.formulaVersion };
  validateIdentity(identity);
  const maxAttempts = options.maxAttempts ?? 3;
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10) throw new Error("maxAttempts must be from 1 to 10.");
  const reasons = assessmentReasons(input, options);
  const idempotencyKey = sha256Content(stableStringify({ identity, policy: ASSESSMENT_POLICY_VERSION, schema: ASSESSMENT_SCHEMA_VERSION, providerVersion }));
  return { id: `assessment:${idempotencyKey}`, idempotencyKey, identity, policyVersion: ASSESSMENT_POLICY_VERSION, schemaVersion: ASSESSMENT_SCHEMA_VERSION,
    providerVersion, reasons, state: !reasons.length ? "NOT_ESCALATED" : providerVersion ? "QUEUED" : "DISABLED", revision: 1, attempts: 0, maxAttempts,
    createdAt: now, updatedAt: now, nextAttemptAt: null, lease: null, lastError: providerVersion || !reasons.length ? null : "No server-side TORS provider is configured.", artifactId: null };
}

/** In-memory CAS model for local tests; durable workers use the SQL lease token/revision checks. */
export class LocalAssessmentQueue {
  readonly jobs = new Map<string, AssessmentJob>();
  readonly artifacts = new Map<string, FullTorsArtifact>();
  enqueue(job: AssessmentJob) { if(job.state==="NOT_ESCALATED")return structuredClone(job); const existing = this.jobs.get(job.idempotencyKey); if (existing) return structuredClone(existing); this.jobs.set(job.idempotencyKey, structuredClone(job)); return structuredClone(job); }
  get(key: string) { const job = this.jobs.get(key); return job ? structuredClone(job) : null; }
  claim(key: string, owner: string, token: string, now: string, durationMs = 60_000): AssessmentJob | null {
    const time = validTime(now); const job = this.jobs.get(key);
    if (!owner || !token || !Number.isInteger(durationMs) || durationMs < 1_000 || durationMs > 900_000) throw new Error("A worker, unique lease token and bounded duration are required.");
    if(job?.state==="LEASED" && job.lease && validTime(job.lease.expiresAt)<=time && job.attempts>=job.maxAttempts) {job.state="FAILED";job.lastError="LEASE_EXPIRED_ATTEMPTS_EXHAUSTED";job.lease=null;job.updatedAt=now;job.revision+=1;}
    if (!job || job.attempts >= job.maxAttempts || !["QUEUED", "RETRY_WAIT", "LEASED"].includes(job.state)) return null;
    if (job.lease && validTime(job.lease.expiresAt) > time) return null;
    if (job.nextAttemptAt && validTime(job.nextAttemptAt) > time) return null;
    job.state = "LEASED"; job.attempts += 1; job.revision += 1; job.updatedAt = now; job.nextAttemptAt = null;
    job.lease = { owner, token, expiresAt: new Date(time + durationMs).toISOString() }; return structuredClone(job);
  }
  complete(key: string, token: string, now: string, artifact: FullTorsArtifact) {
    const job = this.requireLease(key, token, now);
    if (artifact.jobId !== job.id || artifact.providerVersion !== job.providerVersion || sha256Content(stableStringify(artifact.identity)) !== sha256Content(stableStringify(job.identity)) || artifact.schemaVersion !== job.schemaVersion || artifact.authority !== "ADVISORY_ONLY") throw new Error("Assessment artifact identity/provenance does not match the leased job.");
    this.artifacts.set(artifact.id, structuredClone(artifact)); job.artifactId = artifact.id; job.state = "SUCCEEDED"; job.lease = null; job.revision += 1; job.updatedAt = now; job.lastError = null;
    return structuredClone(job);
  }
  fail(key: string, token: string, now: string, reasonCode: string, retryable: boolean) {
    const job = this.requireLease(key, token, now); const retry = retryable && job.attempts < job.maxAttempts;
    job.state = retry ? "RETRY_WAIT" : "FAILED"; job.nextAttemptAt = retry ? new Date(validTime(now) + Math.min(300_000, 1_000 * 2 ** job.attempts)).toISOString() : null;
    job.lastError = reasonCode; job.lease = null; job.revision += 1; job.updatedAt = now; return structuredClone(job);
  }
  cancel(key: string, now: string) {
    validTime(now); const job = this.jobs.get(key); if (!job || ["SUCCEEDED", "CANCELLED"].includes(job.state)) return false;
    job.state = "CANCELLED"; job.lease = null; job.revision += 1; job.updatedAt = now; return true;
  }
  private requireLease(key: string, token: string, now: string) {
    const job = this.jobs.get(key);
    if (!job || job.state !== "LEASED" || job.lease?.token !== token || validTime(job.lease.expiresAt) <= validTime(now)) throw new Error("Assessment lease was lost or expired.");
    return job;
  }
}

export async function executeAssessment(queue: LocalAssessmentQueue, job: AssessmentJob, provider: FullTorsProvider | null,
  evidence: readonly { id: string; text: string }[], now: () => string, signal?: AbortSignal): Promise<AssessmentJob> {
  if (!provider) return job; // No provider: no invented assessment and zero model calls.
  if (job.state !== "LEASED" || !job.lease || provider.version !== job.providerVersion) throw new Error("An active matching provider lease is required.");
  const inputHash = sha256Content(stableStringify({ identity: job.identity, evidence, modelVersion: provider.modelVersion, promptVersion: provider.promptVersion }));
  try {
    const assessment = await provider.assess({ identity: job.identity, evidence, inputHash, signal });
    const known = new Set(evidence.map((entry) => entry.id));
    if (!assessment.summary?.trim() || !Array.isArray(assessment.findings) || !Array.isArray(assessment.limitations) || assessment.findings.some((finding) => !finding.missing && (!finding.evidenceIds.length || finding.evidenceIds.some((id) => !known.has(id))))) throw new Error("PROVIDER_EVIDENCE_LINKAGE_INVALID");
    return queue.complete(job.idempotencyKey, job.lease.token, now(), { id: `artifact:tors:${inputHash}`, jobId: job.id, identity: job.identity,
      schemaVersion: ASSESSMENT_SCHEMA_VERSION, providerVersion: provider.version, modelVersion: provider.modelVersion, promptVersion: provider.promptVersion,
      inputHash, createdAt: now(), assessment, authority: "ADVISORY_ONLY" });
  } catch (error) {
    // Store safe reason codes, never raw provider errors which may contain credentials or prompts.
    const code = error instanceof Error && error.message === "PROVIDER_EVIDENCE_LINKAGE_INVALID" ? error.message : "PROVIDER_ASSESSMENT_FAILED";
    return queue.fail(job.idempotencyKey, job.lease.token, now(), code, code !== "PROVIDER_EVIDENCE_LINKAGE_INVALID");
  }
}
