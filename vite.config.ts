import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { templateCompilerOptions } from '@tresjs/core';
import { resolve } from 'node:path';

export default defineConfig({
  // GitHub Pages serves the project under `/galex/`; locally Vite stays at `/`.
  base: process.env.GITHUB_PAGES ? '/galex/' : '/',
  plugins: [
    // TresJS ships its own Vue compiler config: `<TresCanvas>` is a real Vue
    // component, while `<TresPoints>` etc. are TresJS-managed custom elements.
    // Their isCustomElement whitelist excludes the real components.
    vue(templateCompilerOptions),
  ],
  server: {
    port: 5173,
    open: true,
    host: true,
  },
  build: {
    target: 'esnext',
    sourcemap: true,
    chunkSizeWarningLimit: 750, // Three alone is ~600 kB minified — informative warning isn't actionable below.
    rollupOptions: {
      input: {
        // Vanilla Three playground.
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three';
          return undefined;
        },
      },
    },
  },
});
