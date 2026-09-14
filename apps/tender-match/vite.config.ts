import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [react(), {
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
