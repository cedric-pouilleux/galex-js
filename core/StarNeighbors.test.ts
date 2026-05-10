import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCubeGrid } from './CubeGrid.js';
import {
  starDistance,
  starDistanceSq,
  starsWithinRadius,
  nearestStars,
} from './StarNeighbors.js';
import type { GalaxyData } from './GalaxyData.js';

const CUBE_SIZE = 2;
const ORIGIN = { x: -CUBE_SIZE / 2, y: -CUBE_SIZE / 2, z: -CUBE_SIZE / 2 };

/** Minimal GalaxyData fixture — only the fields the neighbor functions touch. */
function makeGalaxy(coords: [number, number, number][]): GalaxyData {
  const positions = new Float32Array(coords.length * 3);
  for (let n = 0; n < coords.length; n++) {
    positions[n * 3 + 0] = coords[n][0];
    positions[n * 3 + 1] = coords[n][1];
    positions[n * 3 + 2] = coords[n][2];
  }
  const grid = createCubeGrid({ cubeSize: CUBE_SIZE, origin: ORIGIN });
  grid.index(positions);
  return {
    seed: 0,
    opts: {} as GalaxyData['opts'],
    armSpinJ: [],
    armPhaseJ: [],
    data: {
      positions,
      colors: new Float32Array(0),
      sizes: new Float32Array(0),
      temps: new Float32Array(0),
      count: coords.length,
    },
    grid,
  };
}

test('starDistance and starDistanceSq match Pythagoras', () => {
  const positions = new Float32Array([0, 0, 0, 3, 4, 0]);
  assert.equal(starDistanceSq(positions, 0, 1), 25);
  assert.equal(starDistance(positions, 0, 1), 5);
});

test('starDistance is symmetric and zero on identity', () => {
  const positions = new Float32Array([1, 2, 3, -4, 5, 6]);
  assert.equal(starDistance(positions, 0, 0), 0);
  assert.equal(starDistance(positions, 0, 1), starDistance(positions, 1, 0));
});

test('starsWithinRadius keeps neighbors inside the sphere and rejects others', () => {
  // 0 → (0,0,0), 1 → 3 away, 2 → 10 away.
  const g = makeGalaxy([[0, 0, 0], [3, 0, 0], [10, 0, 0]]);
  const got = starsWithinRadius(g, 0, 5);
  assert.deepEqual(got, [{ index: 1, distance: 3 }]);
});

test('starsWithinRadius excludes the query star unless includeSelf is set', () => {
  const g = makeGalaxy([[0, 0, 0], [3, 0, 0]]);
  assert.equal(starsWithinRadius(g, 0, 5).find(n => n.index === 0), undefined);
  const withSelf = starsWithinRadius(g, 0, 5, { includeSelf: true });
  assert.equal(withSelf[0].index, 0);
  assert.equal(withSelf[0].distance, 0);
});

test('starsWithinRadius returns results sorted nearest-first', () => {
  const g = makeGalaxy([[0, 0, 0], [4, 0, 0], [1, 0, 0], [2.5, 0, 0]]);
  const got = starsWithinRadius(g, 0, 10).map(n => n.index);
  assert.deepEqual(got, [2, 3, 1]);
});

test('starsWithinRadius returns [] for non-positive radius', () => {
  const g = makeGalaxy([[0, 0, 0], [1, 0, 0]]);
  assert.deepEqual(starsWithinRadius(g, 0, 0), []);
  assert.deepEqual(starsWithinRadius(g, 0, -1), []);
});

test('nearestStars returns k nearest neighbors sorted ascending', () => {
  const g = makeGalaxy([
    [0, 0, 0],
    [10, 0, 0],
    [1, 0, 0],
    [3, 0, 0],
    [-2, 0, 0],
  ]);
  const got = nearestStars(g, 0, { k: 3 });
  assert.deepEqual(got.map(n => n.index), [2, 4, 3]);
  assert.deepEqual(got.map(n => n.distance), [1, 2, 3]);
});

test('nearestStars returns at most k results even when more stars exist', () => {
  const g = makeGalaxy([[0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 0]]);
  assert.equal(nearestStars(g, 0, { k: 2 }).length, 2);
});

test('nearestStars returns fewer than k if the galaxy is smaller', () => {
  const g = makeGalaxy([[0, 0, 0], [1, 0, 0]]);
  assert.equal(nearestStars(g, 0, { k: 10 }).length, 1);
});

test('nearestStars maxDistance prunes farther candidates', () => {
  const g = makeGalaxy([[0, 0, 0], [1, 0, 0], [50, 0, 0]]);
  const got = nearestStars(g, 0, { k: 5, maxDistance: 10 });
  assert.deepEqual(got.map(n => n.index), [1]);
});

test('nearestStars includeSelf places the query star at distance 0', () => {
  const g = makeGalaxy([[0, 0, 0], [1, 0, 0]]);
  const got = nearestStars(g, 0, { k: 2, includeSelf: true });
  assert.equal(got[0].index, 0);
  assert.equal(got[0].distance, 0);
});

test('nearestStars k=0 yields an empty array', () => {
  const g = makeGalaxy([[0, 0, 0], [1, 0, 0]]);
  assert.deepEqual(nearestStars(g, 0, { k: 0 }), []);
});

test('nearestStars matches an exhaustive O(N²) baseline on a dense random layout', () => {
  // Reproducible pseudo-random layout (mulberry32 inline — keeps the test self-contained).
  let state = 0xc0ffee >>> 0;
  const rand = () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const coords: [number, number, number][] = [];
  for (let n = 0; n < 200; n++) {
    coords.push([(rand() - 0.5) * 40, (rand() - 0.5) * 4, (rand() - 0.5) * 40]);
  }
  const g = makeGalaxy(coords);

  const source = 7;
  const k = 12;

  const baseline = coords
    .map((_, idx) => ({ index: idx, distance: starDistance(g.data.positions, source, idx) }))
    .filter(n => n.index !== source)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, k);

  const got = nearestStars(g, source, { k });
  assert.deepEqual(got, baseline);
});
