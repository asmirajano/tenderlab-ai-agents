import {defineConfig} from 'vite';
export default defineConfig({build: {assetsDir: 'access-public', sourcemap: false, manifest: true,
  rollupOptions: {input: {main: 'index.html', guard: 'src/runtime-guard.js'}}}});
