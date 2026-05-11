import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCubeGrid } from './CubeGrid.js';
import { findStarPath } from './Pathfinding.js';
import type { GalaxyData } from './GalaxyData.js';

const CUBE_SIZE = 2;
const ORIGIN = { x: -CUBE_SIZE / 2, y: -CUBE_SIZE / 2, z: -CUBE_SIZE / 2 };

/** Minimal GalaxyData fixture — only the fields findStarPath touches. */
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

test('findStarPath returns a single direct jump when within range', () => {
  const g = makeGalaxy([[0, 0, 0], [3, 0, 0]]);
  const path = findStarPath(g, 0, 1, { maxJumpDistance: 5 });
  assert.notEqual(path, null);
  assert.deepEqual(path!.stars, [0, 1]);
  assert.equal(path!.totalDistance, 3);
  assert.equal(path!.longestJump, 3);
});

test('findStarPath chains stops when the target is out of single-jump range', () => {
  // Aligned: 0 → 4 → 8. With maxJump=5, the direct 0→2 is out of reach (8 al),
  // so the route must go through the middle waypoint.
  const g = makeGalaxy([[0, 0, 0], [4, 0, 0], [8, 0, 0]]);
  const path = findStarPath(g, 0, 2, { maxJumpDistance: 5 });
  assert.notEqual(path, null);
  assert.deepEqual(path!.stars, [0, 1, 2]);
  assert.equal(path!.totalDistance, 8);
  assert.equal(path!.longestJump, 4);
});

test('findStarPath returns null when no chain reaches the target', () => {
  // Gap of 10 between the two clusters, every jump must be ≤ 3 → unreachable.
  const g = makeGalaxy([[0, 0, 0], [1, 0, 0], [11, 0, 0], [12, 0, 0]]);
  const path = findStarPath(g, 0, 3, { maxJumpDistance: 3 });
  assert.equal(path, null);
});

test('findStarPath picks the shortest chain when several reach the target', () => {
  // Direct 0 → 1 is 8 (out of range with maxJump=5), so a chain is required.
  // Two valid chains exist:
  //   straight detour via 2 = 4 + 4         = 8.000
  //   off-axis  detour via 3,4 ≈ 3.6+4+3.6 ≈ 11.21
  // Dijkstra must pick the straight one.
  const g = makeGalaxy([
    [0, 0, 0],   // 0 — source
    [8, 0, 0],   // 1 — target
    [4, 0, 0],   // 2 — on-axis pivot (short)
    [2, 3, 0],   // 3 — off-axis pivot a (long)
    [6, 3, 0],   // 4 — off-axis pivot b (long)
  ]);
  const path = findStarPath(g, 0, 1, { maxJumpDistance: 5 });
  assert.notEqual(path, null);
  assert.deepEqual(path!.stars, [0, 2, 1]);
  assert.equal(path!.totalDistance, 8);
});

test('findStarPath honours maxTotalDistance and gives up early', () => {
  const g = makeGalaxy([[0, 0, 0], [4, 0, 0], [8, 0, 0], [12, 0, 0]]);
  // Total distance 0 → 3 is 12 (4 + 4 + 4). Capping at 10 must reject the route.
  const path = findStarPath(g, 0, 3, { maxJumpDistance: 5, maxTotalDistance: 10 });
  assert.equal(path, null);
});

test('findStarPath returns a zero-length path when source equals target', () => {
  const g = makeGalaxy([[0, 0, 0], [1, 0, 0]]);
  const path = findStarPath(g, 0, 0, { maxJumpDistance: 1 });
  assert.notEqual(path, null);
  assert.deepEqual(path!.stars, [0]);
  assert.equal(path!.totalDistance, 0);
  assert.equal(path!.longestJump, 0);
});

test('findStarPath rejects invalid star indices or non-positive range', () => {
  const g = makeGalaxy([[0, 0, 0], [1, 0, 0]]);
  assert.equal(findStarPath(g, -1, 1, { maxJumpDistance: 2 }), null);
  assert.equal(findStarPath(g, 0, 99, { maxJumpDistance: 2 }), null);
  assert.equal(findStarPath(g, 0, 1, { maxJumpDistance: 0 }), null);
  assert.equal(findStarPath(g, 0, 1, { maxJumpDistance: -3 }), null);
});

test('findStarPath skips stars filtered out by isStarAllowed', () => {
  // 0 → 1 directly is 8 (out of range with maxJump=5). The on-axis pivot (2)
  // would normally make the route reach in 4+4. Filter it out → routing must
  // fall back to the longer off-axis detour 3,4 (≈ 11.21).
  const g = makeGalaxy([
    [0, 0, 0],   // 0 — source
    [8, 0, 0],   // 1 — target
    [4, 0, 0],   // 2 — short pivot (filtered out)
    [2, 3, 0],   // 3 — long pivot a
    [6, 3, 0],   // 4 — long pivot b
  ]);
  const path = findStarPath(g, 0, 1, {
    maxJumpDistance: 5,
    isStarAllowed: (idx) => idx !== 2,
  });
  assert.notEqual(path, null);
  // The shortest remaining route is 0 → 3 → 4 → 1.
  assert.deepEqual(path!.stars, [0, 3, 4, 1]);
});

test('findStarPath returns null when either endpoint is filtered out', () => {
  const g = makeGalaxy([[0, 0, 0], [3, 0, 0]]);
  assert.equal(
    findStarPath(g, 0, 1, { maxJumpDistance: 5, isStarAllowed: () => false }),
    null,
  );
  // Endpoint specifically.
  assert.equal(
    findStarPath(g, 0, 1, { maxJumpDistance: 5, isStarAllowed: (i) => i === 0 }),
    null,
  );
});

test('findStarPath is deterministic on the same seed/options', () => {
  // Reproducible pseudo-random layout to stress the heap on more stars.
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

  const a = findStarPath(g, 0, 150, { maxJumpDistance: 6 });
  const b = findStarPath(g, 0, 150, { maxJumpDistance: 6 });
  assert.notEqual(a, null);
  assert.deepEqual(a!.stars, b!.stars);
  assert.equal(a!.totalDistance, b!.totalDistance);
});
