/**
 * Vite library build for @cedric-pouilleux/galexjs.
 *
 * Produces three ES module entry points:
 *   - dist/sim.js    — pure data (no Three, no Vue, no DOM)
 *   - dist/core.js   — Three.js render layer (extends sim)
 *   - dist/index.js  — Vue / TresJS surface (extends core)
 *
 * Peer dependencies (three, vue, @tresjs/core) stay external so consumers
 * control their own versions. Shared code between the three entries is
 * factored into `dist/chunks/` by Rollup.
 *
 * Type declarations (.d.ts) are emitted by `vue-tsc` via tsconfig.build.json
 * — see the `build` script in package.json.
 */
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { templateCompilerOptions } from '@tresjs/core';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [vue({ ...templateCompilerOptions })],
  build: {
    outDir:      'dist',
    emptyOutDir: true,
    target:      'es2022',
    minify:      false,
    sourcemap:   true,
    lib: {
      entry: {
        sim:   `${here}sim.ts`,
        core:  `${here}core.ts`,
        index: `${here}index.ts`,
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: (id) =>
        id === 'three'         || id.startsWith('three/')   ||
        id === 'vue'           || id.startsWith('vue/')     ||
        id.startsWith('@vue/') || id.startsWith('@tresjs/'),
      output: {
        preserveModules: false,
        entryFileNames:  '[name].js',
        chunkFileNames:  'chunks/[name]-[hash].js',
      },
    },
  },
});
