import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { copyFileSync, createReadStream, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = fileURLToPath(new URL(".", import.meta.url));
const require = createRequire(import.meta.url);
const tesseractRequire = createRequire(require.resolve("tesseract.js/package.json"));
// Preserve the domain's same-origin /ocr contract without requiring another app.
const ocrAssets = [
  [require.resolve("tesseract.js/dist/worker.min.js"), "tesseract-worker.min.js"],
  [tesseractRequire.resolve("tesseract.js-core/tesseract-core-lstm.wasm.js"), "tesseract-core-lstm.wasm.js"],
  [require.resolve("@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz"), "eng.traineddata.gz"],
] as const;

export default defineConfig({
  root: appRoot,
  plugins: [react(), {
    name: "balance-build-boundary",
    generateBundle() {
      for (const id of this.getModuleIds()) {
        const normalized = id.replaceAll("\\", "/");
        if (/\/(?:apps\/(?:tender-apps|tender-logistics)|packages\/(?:logistics-costing|tendermatch))\//.test(normalized)) {
          this.error(`Balance build crossed a product boundary: ${normalized}`);
        }
      }
    },
  }, {
    name: "balance-local-ocr-assets",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const asset = ocrAssets.find(([, name]) => request.url?.split("?")[0] === `/ocr/${name}`);
        if (!asset || !["GET", "HEAD"].includes(request.method ?? "")) return next();
        response.setHeader("Content-Type", asset[1].endsWith(".js") ? "application/javascript" : "application/gzip");
        if (request.method === "HEAD") return response.end();
        const stream = createReadStream(asset[0]);
        stream.on("error", () => { response.statusCode = 500; response.end("OCR asset unavailable"); });
        stream.pipe(response);
      });
    },
    closeBundle() {
      const output = path.join(appRoot, "dist", "ocr");
      mkdirSync(output, { recursive: true });
      for (const [source, name] of ocrAssets) copyFileSync(source, path.join(output, name));
    },
  }],
  build: { outDir: "dist", assetsDir: "assets/balance", emptyOutDir: true, sourcemap: false, manifest: true },
});
