/**
 * Assembles `dist/` into a self-contained, publish-ready npm package.
 *
 * Runs after `vite build` + `vue-tsc`. Writes a publish-ready
 * `dist/package.json` with proper `main`/`module`/`types`/`exports`, and
 * copies README + LICENSE next to the compiled bundles.
 *
 * Rationale:
 *   The source `package.json` deliberately omits the `exports` field so
 *   relative imports keep resolving to source during development. The
 *   published package needs a full `exports` map so consumers can import
 *   `@cedric-pouilleux/galexjs`, `@cedric-pouilleux/galexjs/core` and
 *   `@cedric-pouilleux/galexjs/sim` through the compiled output.
 *
 * Workflow:
 *   npm run build       # vite + vue-tsc + this script
 *   npm publish ./dist  # publishes dist/ as the package root
 */
import { readFile, writeFile, copyFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const dist = resolve(root, 'dist');

const src = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));

const publishPkg = {
  name:        src.name,
  version:     src.version,
  description: src.description,
  license:     src.license,
  type:        'module',
  sideEffects: false,
  main:        './index.js',
  module:      './index.js',
  types:       './index.d.ts',
  exports: {
    '.':              { types: './index.d.ts', import: './index.js' },
    './core':         { types: './core.d.ts',  import: './core.js'  },
    './sim':          { types: './sim.d.ts',   import: './sim.js'   },
    './package.json': './package.json',
  },
  peerDependencies:     src.peerDependencies,
  peerDependenciesMeta: {
    // `three` is required by `core` and `index`, so NOT marked optional.
    // Only the Vue / TresJS surface is truly opt-in.
    vue:            { optional: true },
    '@tresjs/core': { optional: true },
  },
  keywords: [
    'galaxy', 'procedural', 'deterministic', 'threejs',
    'tresjs', 'vue', 'spatial-grid', 'starmap',
  ],
  publishConfig: { access: 'public' },
};

if (src.repository) publishPkg.repository = src.repository;
if (src.homepage)   publishPkg.homepage   = src.homepage;
if (src.bugs)       publishPkg.bugs       = src.bugs;

await writeFile(
  resolve(dist, 'package.json'),
  JSON.stringify(publishPkg, null, 2) + '\n',
);

async function copyIfExists(name) {
  const from = resolve(root, name);
  try {
    await access(from);
    await copyFile(from, resolve(dist, name));
    console.log(`  copied ${name}`);
  } catch {
    console.log(`  skipped ${name} (missing)`);
  }
}

await copyIfExists('README.md');
await copyIfExists('LICENSE');

console.log('dist/ is ready for publish.');
