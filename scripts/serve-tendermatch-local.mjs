import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { createPairService, parsePairQuery } from "./lib/tendermatch-pair-service.mjs";
import { runtimeTenders } from "../packages/tendermatch/src/pilot-data.ts";
import {
  TENDERMATCH_SUPPLIER_BATCH_CODE,
  TENDERMATCH_SUPPLIER_CONSUMER_ROLE,
  TENDERMATCH_SUPPLIER_CONTRACT_VERSION,
  TENDERMATCH_SUPPLIER_CURRENT_EVIDENCE_VIEW,
  TENDERMATCH_SUPPLIER_CURRENT_PROFILE_VIEW,
  TENDERMATCH_SUPPLIER_EXPECTED_ARTIFACT_COUNT,
  TENDERMATCH_SUPPLIER_EXPECTED_EVIDENCE_COUNT,
  TENDERMATCH_SUPPLIER_EXPECTED_PROFILE_COUNT,
  TENDERMATCH_SUPPLIER_PROFILE_VERSION,
  TENDERMATCH_SUPPLIER_VERSIONED_EVIDENCE_VIEW,
  TENDERMATCH_SUPPLIER_VERSIONED_PROFILE_VIEW,
} from "../packages/tendermatch/src/supplier-contract.ts";
import { createSupplierStore, parseSupplierListParameters, readSupplierConnectionString, validateSupplierId } from "./lib/tendermatch-supplier-store.mjs";

const MIME = { ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8", ".ico": "image/x-icon", ".jpg": "image/jpeg", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml" };
const CSP = "default-src 'self' blob:; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data: blob:; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'";

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function json(response, status, body) {
  response.writeHead(status, { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8", "X-Content-Type-Options": "nosniff" });
  response.end(JSON.stringify(body));
}

function summary(profiles, evidence, retrievedAt) {
  const readiness = { ready_for_exploratory_matching: 0, usable_with_limitations: 0, requires_enrichment: 0, exclude_from_current_matching_run: 0 };
  const classification = { GOODS: 0, WORKS: 0 };
  const profileClaims = { VERIFIED: 0, INFERRED: 0, STATED_UNVERIFIED: 0, UNKNOWN: 0 };
  const evidenceStatuses = { VERIFIED: 0, INFERRED: 0, STATED_UNVERIFIED: 0, UNKNOWN: 0 };
  let available = 0;
  for (const profile of profiles) {
    readiness[profile.readinessStatus] += 1;
    classification[profile.classification] += 1;
    profileClaims.VERIFIED += profile.evidenceVerifiedCount;
    profileClaims.INFERRED += profile.evidenceInferredCount;
    profileClaims.STATED_UNVERIFIED += profile.evidenceStatedUnverifiedCount;
    profileClaims.UNKNOWN += profile.evidenceUnknownCount;
  }
  for (const record of evidence) { evidenceStatuses[record.status] += 1; if (record.artifactAvailable) available += 1; }
  return {
    contractVersion: TENDERMATCH_SUPPLIER_CONTRACT_VERSION,
    profileVersion: TENDERMATCH_SUPPLIER_PROFILE_VERSION,
    batchCode: TENDERMATCH_SUPPLIER_BATCH_CODE,
    consumerRole: TENDERMATCH_SUPPLIER_CONSUMER_ROLE,
    views: {
      currentProfiles: TENDERMATCH_SUPPLIER_CURRENT_PROFILE_VIEW,
      currentEvidence: TENDERMATCH_SUPPLIER_CURRENT_EVIDENCE_VIEW,
      versionedProfiles: TENDERMATCH_SUPPLIER_VERSIONED_PROFILE_VIEW,
      versionedEvidence: TENDERMATCH_SUPPLIER_VERSIONED_EVIDENCE_VIEW,
    },
    profileCount: profiles.length,
    evidenceCount: evidence.length,
    classification,
    readiness,
    profileClaims,
    evidenceStatuses,
    artifacts: { available, unavailable: evidence.length - available },
    retrievedAt,
  };
}

export async function createTenderMatchLocalServer({ store, distDir = resolve("apps/tender-apps/dist"), clock = () => new Date().toISOString() }) {
  let state = { status: "loading", startedAt: clock(), error: null, runtime: null, runtimeGzip: null };
  let pairs;
  const ready = (async () => {
    try {
      const { profiles, evidence } = await store.loadAll();
      if (profiles.length !== TENDERMATCH_SUPPLIER_EXPECTED_PROFILE_COUNT) throw new Error(`Supplier contract expected ${TENDERMATCH_SUPPLIER_EXPECTED_PROFILE_COUNT} profiles; received ${profiles.length}.`);
      if (evidence.length !== TENDERMATCH_SUPPLIER_EXPECTED_EVIDENCE_COUNT) throw new Error(`Supplier contract expected ${TENDERMATCH_SUPPLIER_EXPECTED_EVIDENCE_COUNT} evidence rows; received ${evidence.length}.`);
      if (profiles.some((profile) => profile.profileVersion !== TENDERMATCH_SUPPLIER_PROFILE_VERSION || profile.batchCode !== TENDERMATCH_SUPPLIER_BATCH_CODE)) throw new Error("Supplier contract refused a profile outside the approved v1.3 batch.");
      const evaluatedAt = clock();
      pairs = createPairService({ tenders: runtimeTenders, profiles, evidence, evaluatedAt });
      if (pairs.totals.total !== runtimeTenders.length * profiles.length) throw new Error("The Supplier × Tender evaluation inventory is incomplete or duplicated.");
      const datasetSummary = summary(profiles, evidence, store.snapshotAsOf ?? evaluatedAt);
      if (JSON.stringify(datasetSummary.classification) !== JSON.stringify({ GOODS: 14, WORKS: 3 })) throw new Error("Supplier classification totals do not match the approved v1.3 contract.");
      if (JSON.stringify(datasetSummary.readiness) !== JSON.stringify({ ready_for_exploratory_matching: 0, usable_with_limitations: 17, requires_enrichment: 0, exclude_from_current_matching_run: 0 })) throw new Error("Supplier contract readiness totals do not match the approved batch.");
      if (JSON.stringify(datasetSummary.profileClaims) !== JSON.stringify({ VERIFIED: 0, INFERRED: 17, STATED_UNVERIFIED: 226, UNKNOWN: 46 })) throw new Error("Supplier profile claim totals do not match the approved batch.");
      if (JSON.stringify(datasetSummary.evidenceStatuses) !== JSON.stringify({ VERIFIED: 0, INFERRED: 17, STATED_UNVERIFIED: 226, UNKNOWN: 46 })) throw new Error("Supplier evidence totals do not match the approved safe projection.");
      if (JSON.stringify(datasetSummary.artifacts) !== JSON.stringify({ available: TENDERMATCH_SUPPLIER_EXPECTED_ARTIFACT_COUNT, unavailable: TENDERMATCH_SUPPLIER_EXPECTED_EVIDENCE_COUNT - TENDERMATCH_SUPPLIER_EXPECTED_ARTIFACT_COUNT })) throw new Error("Supplier artifact-link totals do not match the approved safe projection.");
      const initialEvaluation = pairs.initialEvaluation();
      const runtime = { schemaVersion: "tendermatch-runtime-catalog/2.0.0", status: "ready", mode: store.sourceMode === "explicit-pinned-local-snapshot" ? "local-pinned-service" : "neon-read-only", sourceMode: store.sourceMode ?? "neon-read-only", summary: datasetSummary, suppliers: profiles, initialEvaluation, evaluationSummary: pairs.totals, pairLeadersByTender: pairs.leaders(), pairLeadersBySupplier: pairs.supplierLeaders(), scoreDistribution: pairs.scoreDistribution(), processing: pairs.stats, assessmentProvider: { state: "disabled", reason: "No server-side full-assessment provider configured." } };
      state = { status: "ready", startedAt: state.startedAt, error: null, runtime, runtimeGzip: gzipSync(JSON.stringify(runtime), { level: 6 }) };
      return state.runtime;
    } catch (error) {
      state = { status: "error", startedAt: state.startedAt, error: "The read-only supplier runtime is unavailable. No offline supplier fixture was substituted.", runtime: null, runtimeGzip: null };
      throw error;
    }
  })();
  ready.catch(() => {});

  const server = createServer(async (request, response) => {
    response.setHeader("Content-Security-Policy", CSP);
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("X-Frame-Options", "DENY");
    response.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    try {
      if (url.pathname === "/api/tendermatch/health") {
        return json(response, state.status === "error" ? 503 : 200, {
          status: state.status,
          mode: state.runtime?.mode ?? (store.sourceMode === "explicit-pinned-local-snapshot" ? "local-pinned-service" : "neon-read-only"),
          contractVersion: TENDERMATCH_SUPPLIER_CONTRACT_VERSION,
          profileVersion: TENDERMATCH_SUPPLIER_PROFILE_VERSION,
          batchCode: TENDERMATCH_SUPPLIER_BATCH_CODE,
          consumerRole: TENDERMATCH_SUPPLIER_CONSUMER_ROLE,
          views: {
            currentProfiles: TENDERMATCH_SUPPLIER_CURRENT_PROFILE_VIEW,
            currentEvidence: TENDERMATCH_SUPPLIER_CURRENT_EVIDENCE_VIEW,
            versionedProfiles: TENDERMATCH_SUPPLIER_VERSIONED_PROFILE_VIEW,
            versionedEvidence: TENDERMATCH_SUPPLIER_VERSIONED_EVIDENCE_VIEW,
          },
          supplierCount: state.runtime?.summary.profileCount ?? null,
          evidenceCount: state.runtime?.summary.evidenceCount ?? null,
          evaluationCount: state.runtime?.evaluationSummary.total ?? null,
          error: state.error,
        });
      }
      if (url.pathname === "/api/tendermatch/runtime") {
        if (state.status === "loading") return json(response, 202, { status: "loading", mode: "neon-read-only" });
        if (state.status === "error") return json(response, 503, { status: "error", mode: "neon-read-only", error: state.error });
        response.writeHead(200, { "Cache-Control": "no-store", "Content-Encoding": "gzip", "Content-Type": "application/json; charset=utf-8", "Vary": "Accept-Encoding", "X-Content-Type-Options": "nosniff" });
        response.end(state.runtimeGzip);
        return;
      }
      if (["/api/tendermatch/pairs", "/api/tendermatch/pair", "/api/tendermatch/assessments"].includes(url.pathname)) {
        if (state.status !== "ready") return json(response, state.status === "loading" ? 202 : 503, { status: state.status, error: state.error });
        if (url.pathname === "/api/tendermatch/pairs" && request.method === "GET") return json(response, 200, pairs.query(parsePairQuery(url.searchParams)));
        if (url.pathname === "/api/tendermatch/pair" && request.method === "GET") return json(response, 200, pairs.detail(url.searchParams.get("supplierId"), url.searchParams.get("tenderId"), clock()));
        if (url.pathname === "/api/tendermatch/assessments" && request.method === "POST") {
          if (!request.headers["content-type"]?.startsWith("application/json") || (request.headers.origin && request.headers.origin !== `http://${request.headers.host}`)) return json(response, 403, { error: "Same-origin JSON assessment request required." });
          let body = "";
          for await (const chunk of request) { body += chunk; if (Buffer.byteLength(body) > 8192) return json(response, 413, { error: "Assessment request exceeds the limit." }); }
          let input;
          try { input = JSON.parse(body); } catch { return json(response, 400, { error: "Invalid JSON request." }); }
          if (input.reason !== "user-opened" || typeof input.requestId !== "string" || input.requestId.length > 256) return json(response, 400, { error: "An explicit selected-pair review request and idempotency identity are required." });
          return json(response, 200, { assessment: pairs.requestAssessment(input.supplierId, input.tenderId, "local-consultant-review", clock()), modelCalls: 0 });
        }
        return json(response, 405, { error: "Method not allowed." });
      }
      if (url.pathname === "/api/tendermatch/suppliers") {
        const result = await store.listSuppliers(parseSupplierListParameters(url.searchParams));
        return json(response, 200, { mode: "neon-read-only", ...result });
      }
      const evidenceMatch = url.pathname.match(/^\/api\/tendermatch\/suppliers\/([^/]+)\/evidence$/);
      if (evidenceMatch) {
        const id = validateSupplierId(decodeURIComponent(evidenceMatch[1]));
        const profile = await store.supplierDetail(id);
        if (!profile) return json(response, 404, { error: "Supplier not found." });
        return json(response, 200, { mode: "neon-read-only", supplierId: id, evidence: await store.supplierEvidence(id) });
      }
      const detailMatch = url.pathname.match(/^\/api\/tendermatch\/suppliers\/([^/]+)$/);
      if (detailMatch) {
        const profile = await store.supplierDetail(validateSupplierId(decodeURIComponent(detailMatch[1])));
        return profile ? json(response, 200, { mode: "neon-read-only", profile }) : json(response, 404, { error: "Supplier not found." });
      }
      if (url.pathname.startsWith("/api/")) return json(response, 404, { error: "API route not found." });

      const requested = url.pathname === "/" ? "/index.html" : url.pathname;
      const relative = normalize(decodeURIComponent(requested)).replace(/^[/\\]+/, "").replace(/^(\.\.[/\\])+/, "");
      const distRoot = resolve(distDir);
      let filePath = resolve(distRoot, relative);
      if (filePath !== distRoot && !filePath.startsWith(`${distRoot}\\`) && !filePath.startsWith(`${distRoot}/`)) return json(response, 400, { error: "Invalid asset path." });
      try { if (!(await stat(filePath)).isFile()) filePath = join(distRoot, "index.html"); } catch { filePath = join(distRoot, "index.html"); }
      const extension = extname(filePath).toLowerCase();
      response.writeHead(200, { "Cache-Control": extension === ".html" ? "no-cache" : "public, max-age=3600", "Content-Type": MIME[extension] ?? "application/octet-stream", "X-Content-Type-Options": "nosniff" });
      const stream = createReadStream(filePath);
      stream.on("error", () => { if (!response.headersSent) json(response, 500, { error: "The requested local asset could not be read." }); else response.destroy(); });
      stream.pipe(response);
    } catch (error) {
      const status = Number(error?.statusCode) || 500;
      json(response, status, { error: status >= 500 ? "TenderMatch supplier service failed safely." : error.message });
    }
  });
  return { server, ready, getState: () => state };
}

async function main() {
  const envFile = argument("--env-file");
  const port = Number(argument("--port", "4177"));
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("--port must be a valid non-privileged port.");
  const snapshot = process.argv.includes("--snapshot");
  const store = snapshot ? await createPinnedSnapshotStore() : createSupplierStore(await readSupplierConnectionString(envFile));
  const { server, ready } = await createTenderMatchLocalServer({ store });
  server.listen(port, "127.0.0.1", () => console.log(`TenderMatch local supplier runtime: http://127.0.0.1:${port}/tendermatch`));
  try {
    const runtime = await ready;
    console.log(`Supplier runtime ready: ${runtime.summary.profileCount} profiles, ${runtime.summary.evidenceCount} evidence records, ${runtime.evaluationSummary.total} Formula v1.1 numeric pair scores (${runtime.evaluationSummary.numeric} numeric, ${runtime.evaluationSummary.missing} missing numeric scores).`);
  } catch {
    console.error("TenderMatch supplier runtime failed safely; no supplier fixture was substituted.");
  }
  const close = async () => { server.close(); await store.close(); };
  process.on("SIGINT", close);
  process.on("SIGTERM", close);
}

/** Explicit local demonstration source; it never falls back from a failed Neon read. */
export async function createPinnedSnapshotStore(directory = resolve("apps/tender-apps/public/tendermatch/data")) {
  const runtime = JSON.parse(await readFile(join(directory, "supplier-runtime-v1.3.json"), "utf8"));
  const snapshot = JSON.parse(await readFile(join(directory, "supplier-evidence-v1.3.json"), "utf8"));
  const profiles = runtime.suppliers;
  return {
    sourceMode: "explicit-pinned-local-snapshot",
    snapshotAsOf: runtime.summary.retrievedAt,
    loadAll: async () => ({ profiles, evidence: Object.values(snapshot.evidenceBySupplier).flat() }),
    supplierDetail: async (id) => profiles.find((row) => row.canonicalEntityId === id) ?? null,
    supplierEvidence: async (id) => snapshot.evidenceBySupplier[id] ?? [],
    listSuppliers: async (filters) => {
      const rows = profiles.filter((row) => (!filters.country || row.countryCode === filters.country) && (!filters.classification || row.classification === filters.classification) && (!filters.readiness.length || filters.readiness.includes(row.readinessStatus))).sort((a, b) => a.displayName.toLowerCase().localeCompare(b.displayName.toLowerCase()) || a.canonicalEntityId.localeCompare(b.canonicalEntityId)).filter((row) => !filters.afterName || row.displayName.toLowerCase() > filters.afterName || (row.displayName.toLowerCase() === filters.afterName && row.canonicalEntityId > filters.afterId));
      const selected = rows.slice(0, filters.limit), last = selected.at(-1);
      return { profiles: selected, nextCursor: rows.length > filters.limit ? { afterName: last.displayName.toLowerCase(), afterId: last.canonicalEntityId } : null };
    },
    close: async () => {},
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
