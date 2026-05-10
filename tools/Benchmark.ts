// Micro-benchmark for the deterministic generation hot paths.
// Run via `npx tsx tools/Benchmark.ts`.
//
// Measures three things at several galaxy sizes:
//   1. createGalaxyData  — full pipeline (StarGenerator + CubeGrid index).
//   2. nearestStars      — kNN ring-walk on the cube grid.
//   3. starsWithinRadius — sphere query on the cube grid.
//
// Each measurement: 1 warm-up run + N timed runs, fixed seed for reproducibility.

import { performance } from 'node:perf_hooks';
import { createGalaxyData } from '../core/GalaxyData.js';
import { nearestStars, starsWithinRadius } from '../core/StarNeighbors.js';
import { mulberry32 } from '../core/Random.js';

type Stats = { min: number; median: number; mean: number; max: number };

function summarize(samples: number[]): Stats {
  const sorted = [...samples].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  return {
    min:    sorted[0],
    median: sorted[Math.floor(sorted.length / 2)],
    mean:   sum / sorted.length,
    max:    sorted[sorted.length - 1],
  };
}

function fmtMs(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(1)}µs`;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function bench(label: string, runs: number, fn: () => void): Stats {
  fn(); // warm-up — discard
  const samples: number[] = [];
  for (let i = 0; i < runs; i++) {
    const t0 = performance.now();
    fn();
    samples.push(performance.now() - t0);
  }
  const s = summarize(samples);
  console.log(
    `${label.padEnd(46)} ` +
    `min=${fmtMs(s.min).padStart(9)}  ` +
    `med=${fmtMs(s.median).padStart(9)}  ` +
    `mean=${fmtMs(s.mean).padStart(9)}  ` +
    `max=${fmtMs(s.max).padStart(9)}  ` +
    `(n=${runs})`,
  );
  return s;
}

const SEED = 0xC0FFEE;
const COUNTS = [5_000, 15_000, 50_000, 100_000, 200_000];

console.log('='.repeat(120));
console.log(`GalexJS benchmark — seed=${SEED.toString(16)}, Node ${process.version}, platform ${process.platform}`);
console.log('='.repeat(120));

console.log('\n# 1. createGalaxyData (StarGenerator + CubeGrid index)');
console.log('-'.repeat(120));
for (const count of COUNTS) {
  const runs = count >= 100_000 ? 3 : count >= 50_000 ? 5 : 10;
  bench(
    `count=${count.toLocaleString('en-US').padStart(8)}`,
    runs,
    () => { createGalaxyData({ count, seed: SEED }); },
  );
}

console.log('\n# 2. nearestStars — kNN ring-walk (k=8, 1000 random query stars)');
console.log('-'.repeat(120));
for (const count of COUNTS) {
  const galaxy = createGalaxyData({ count, seed: SEED });
  const rng = mulberry32(SEED ^ 0xBEEF);
  const queries = Array.from({ length: 1000 }, () => Math.floor(rng() * count));
  const runs = 5;
  bench(
    `count=${count.toLocaleString('en-US').padStart(8)}  k=8`,
    runs,
    () => {
      for (const idx of queries) nearestStars(galaxy, idx, { k: 8 });
    },
  );
}

console.log('\n# 3. starsWithinRadius — sphere query (r=2, 1000 random query stars)');
console.log('-'.repeat(120));
for (const count of COUNTS) {
  const galaxy = createGalaxyData({ count, seed: SEED });
  const rng = mulberry32(SEED ^ 0xFACE);
  const queries = Array.from({ length: 1000 }, () => Math.floor(rng() * count));
  const radius = 2;
  const runs = 5;
  bench(
    `count=${count.toLocaleString('en-US').padStart(8)}  r=${radius}`,
    runs,
    () => {
      for (const idx of queries) starsWithinRadius(galaxy, idx, radius);
    },
  );
}

console.log('\nDone.');
