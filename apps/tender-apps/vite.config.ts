import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const tesseractRequire = createRequire(require.resolve("tesseract.js/package.json"));

const ocrAssets = [
  [require.resolve("tesseract.js/dist/worker.min.js"), "tesseract-worker.min.js"],
  [tesseractRequire.resolve("tesseract.js-core/tesseract-core-lstm.wasm.js"), "tesseract-core-lstm.wasm.js"],
  [require.resolve("@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz"), "eng.traineddata.gz"],
] as const;

export default defineConfig({
  plugins: [
    react(),
    {
      name: "bundle-tesseract-runtime",
      closeBundle() {
        const outputDirectory = path.join(appRoot, "dist", "ocr");
        mkdirSync(outputDirectory, { recursive: true });
        for (const [source, fileName] of ocrAssets) {
          copyFileSync(source, path.join(outputDirectory, fileName));
        }
      },
    },
  ],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
  },
});
