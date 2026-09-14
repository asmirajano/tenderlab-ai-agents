import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { readFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";

type ViteServer = {middlewares: {use: (path: string, handler: (request: IncomingMessage, response: ServerResponse) => void) => void}};
type BrowserSession = {name?: string; token: string; browserOrigin: string; browserAudience: string; expiresAt: number; subject: string};

const workspaceRoot = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const pointerPath = path.join(workspaceRoot, "build", "tendermatch-stage9", "session-pointer.json");
const exchangePath = path.join("C:", "Temp", "tendermatch-session-exchange.json");
const browserOrigin = "http://127.0.0.1:6210";
const browserAudience = "tendermatch-stage9-development-readonly";
const bindingId = "26e1bab78a38d8d520d59563e702bc4540405213f39cbb7b40a49ecbb03a4080";

async function readBrowserSession() {
  const pointer = JSON.parse(await readFile(pointerPath, "utf8"));
  if (!pointer?.vaultName || !/^[a-z0-9-]{3,64}$/.test(pointer.vaultName) || !Number.isSafeInteger(pointer.expiresAt) || Date.now() >= pointer.expiresAt) throw new Error("expired");
  const exchange = JSON.parse(await readFile(exchangePath, "utf8"));
  const vault = exchange?.vault;
  const session = exchange?.session as BrowserSession | undefined;
  const contract = vault?.contract;
  if (!session?.token || !vault?.csrfToken || !contract || contract.origin !== browserOrigin || contract.audience !== browserAudience || contract.bindingId !== bindingId || session.browserOrigin !== browserOrigin || session.browserAudience !== browserAudience || session.expiresAt !== pointer.expiresAt || Date.now() >= session.expiresAt) throw new Error("invalid");
  return {schemaVersion: "tendermatch-browser-session/1.0.0", sourceMode: "hosted-development-stage8", bindingId, token: session.token, csrfToken: vault.csrfToken, subject: session.subject, scopes: ["read"], expiresAt: session.expiresAt, initialSupplierId: vault.initialSupplierId, initialTenderId: vault.initialTenderId, hosted: {apiOrigin: contract.apiOrigin, browserOrigin, audience: browserAudience, codeHash: pointer.codeHash, readOnly: true}};
}

function secureSessionExchange() {
  return {name: "tendermatch-secure-session-exchange", configureServer(server: ViteServer) {
    server.middlewares.use("/__tendermatch/session", async (request, response) => {
      if (request.method !== "GET") { response.statusCode = 405; response.setHeader("Allow", "GET"); response.end(); return; }
      const origin = request.headers.origin;
      const host = request.headers.host;
      if (host !== "127.0.0.1:6210" || origin && origin !== browserOrigin || request.headers["sec-fetch-site"] && request.headers["sec-fetch-site"] !== "same-origin") { response.statusCode = 403; response.end(); return; }
      try { const session = await readBrowserSession(); response.statusCode = 200; response.setHeader("Content-Type", "application/json"); response.setHeader("Cache-Control", "no-store"); response.setHeader("Referrer-Policy", "no-referrer"); response.setHeader("X-Content-Type-Options", "nosniff"); response.end(JSON.stringify(session)); }
      catch (error) { console.warn(`[tendermatch-session] exchange unavailable: ${error instanceof Error ? error.message : "invalid"}`); response.statusCode = 401; response.setHeader("Cache-Control", "no-store"); response.end(); }
    });
  }};
}

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [react(), secureSessionExchange(), {
    name: "match-build-boundary",
    generateBundle() {
      for (const id of this.getModuleIds()) {
        const normalized = id.replaceAll("\\", "/");
        if (/\/(?:apps\/(?:tender-apps|tender-logistics|tender-balance)|packages\/(?:logistics-costing|tender-balance))\//.test(normalized)) {
          this.error(`Match build crossed a product boundary: ${normalized}`);
        }
      }
    },
  }],
  build: { outDir: "dist", assetsDir: "assets/match", emptyOutDir: true, sourcemap: false, manifest: true },
});
