import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [react(), {
    name: "logistics-build-boundary",
    generateBundle() {
      for (const id of this.getModuleIds()) {
        const normalized = id.replaceAll("\\", "/");
        if (/\/(?:apps\/tender-apps|packages\/tender-balance|packages\/tendermatch)\//.test(normalized) || normalized.includes("tesseract")) {
          this.error(`Logistics build crossed a product boundary: ${normalized}`);
        }
      }
    },
  }],
  build: { outDir: "dist", assetsDir: "assets/logistics", emptyOutDir: true, sourcemap: false, manifest: true },
});
