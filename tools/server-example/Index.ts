// Minimal Node demo of the backend pattern: a server holds a single
// `GalaxyData` per world keyed by seed, and uses it to validate client
// actions against the seed-derived structure.
//
// Run with:
//   npm run example:server
//
// No three, no DOM, no WebGL — pure data.

import { createGalaxyData } from '../../core/GalaxyData.js';
import type { GalaxyData, GalaxyDataOptions } from '../../core/GalaxyData.js';

type World = {
  seed: number;
  galaxyOpts: GalaxyDataOptions;
};

const WORLD: World = {
  seed: 42,
  galaxyOpts: {
    count: 5000,
    radius: 50,
    cubeSize: 2,
    innerRadius: 4.5,
    minDistance: 0.25,
    arms: 6,
    spin: 0.9,
    spread: 0.95,
    fieldRatio: 0.30,
    fillCenter: false,
  },
};

// One instance per (seed, opts) tuple. Immutable, safe to keep in RAM.
const galaxyCache = new Map<string, GalaxyData>();

function getGalaxy({ seed, galaxyOpts }: World): GalaxyData {
  const key = `${seed}|${JSON.stringify(galaxyOpts)}`;
  let g = galaxyCache.get(key);
  if (!g) {
    g = createGalaxyData({ ...galaxyOpts, seed });
    galaxyCache.set(key, g);
  }
  return g;
}

type Action = {
  cube: { i: number; k: number };
  starIndex: number;
};

type ValidationResult =
  | { ok: true; cubeStarCount: number }
  | { ok: false; reason: string };

/**
 * Validates a client action that targets a specific star inside a specific cube.
 * Real gameplay rules (ownership, range, resources…) live on top of this check.
 */
function validateActionTargetsCube(world: World, action: Action): ValidationResult {
  const galaxy = getGalaxy(world);
  const cube = galaxy.grid.get(action.cube.i, 0, action.cube.k);
  if (!cube) return { ok: false, reason: 'cube does not exist' };
  if (!cube.starIndices.includes(action.starIndex)) {
    return { ok: false, reason: 'star not in this cube' };
  }
  return { ok: true, cubeStarCount: cube.starIndices.length };
}

// ── Demo run ─────────────────────────────────────────────────────────────────

console.log('=== Stellex backend example ===\n');

const t0 = performance.now();
const galaxy = getGalaxy(WORLD);
const dt = (performance.now() - t0).toFixed(1);

console.log(`World seed:      ${galaxy.seed}`);
console.log(`Stars generated: ${galaxy.data.count.toLocaleString('fr-FR')}`);
console.log(`Cubes indexed:   ${galaxy.grid.size().toLocaleString('fr-FR')} (occupied: ${galaxy.grid.occupiedCount().toLocaleString('fr-FR')})`);
console.log(`Built in:        ${dt} ms\n`);

// Pick a real cube + star for the OK case.
const sampleCube = [...galaxy.grid.cubes.values()].find((c) => c.starIndices.length > 0)!;
const okAction: Action = {
  cube: { i: sampleCube.i, k: sampleCube.k },
  starIndex: sampleCube.starIndices[0],
};

const cases: [string, Action][] = [
  ['existing cube + valid star',  okAction],
  ['existing cube + bogus star',  { cube: { i: sampleCube.i, k: sampleCube.k }, starIndex: 999_999_999 }],
  ['cube far outside the disk',   { cube: { i: 9999, k: 9999 }, starIndex: 0 }],
];

for (const [label, action] of cases) {
  const result = validateActionTargetsCube(WORLD, action);
  const status = result.ok ? '✓' : '✗';
  console.log(`${status} ${label.padEnd(32)} → ${JSON.stringify(result)}`);
}

// Cross-engine determinism note: re-running this script with the same WORLD
// in any V8 / SpiderMonkey / JavaScriptCore runtime produces byte-identical
// `galaxy.data.positions`. See `npm run test:cross`.

console.log('\nCache size:', galaxyCache.size, 'entry');
