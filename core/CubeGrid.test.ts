import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCubeGrid } from './CubeGrid.js';

const ORIGIN = { x: -1, y: -1, z: -1 }; // cubeSize=2 → cube (0, 0, 0) centred at world origin

test('worldToCube and cubeToWorldCenter are inverse for cube centres', () => {
  const grid = createCubeGrid({ cubeSize: 2, origin: ORIGIN });
  for (let i = -3; i <= 3; i++) {
    for (let k = -3; k <= 3; k++) {
      const center = grid.cubeToWorldCenter(i, 0, k);
      const back = grid.worldToCube(center.x, center.y, center.z);
      assert.equal(back.i, i, `i mismatch at (${i}, ${k})`);
      assert.equal(back.k, k, `k mismatch at (${i}, ${k})`);
    }
  }
});

test('cube boundaries snap to the lower index', () => {
  const grid = createCubeGrid({ cubeSize: 2, origin: ORIGIN });
  // Cube (0,0,0) spans world [-1,1] on each axis. World point (1, 0, 1) sits
  // exactly on the boundary; floor() snaps it to cube (1, …, 1).
  const c = grid.worldToCube(1, 0, 1);
  assert.equal(c.i, 1);
  assert.equal(c.k, 1);
});

test('index buckets stars by cube and preserves star indices', () => {
  const grid = createCubeGrid({ cubeSize: 2, origin: ORIGIN });
  // 4 stars: 0→cube(0,0,0), 1→cube(1,0,0), 2→cube(0,0,0), 3→cube(-1,0,-1)
  const positions = new Float32Array([
    0.5, 0.0, 0.5,    // (0,0,0)
    2.5, 0.0, 0.0,    // (1,0,0)
    -0.2, 0.0, 0.7,   // (0,0,0)
    -1.5, 0.0, -1.5,  // (-1,0,-1)
  ]);
  grid.index(positions);

  const c000 = grid.get(0, 0, 0);
  assert.ok(c000);
  assert.deepEqual(c000.starIndices, [0, 2]);

  const c100 = grid.get(1, 0, 0);
  assert.ok(c100);
  assert.deepEqual(c100.starIndices, [1]);

  const cm1m1 = grid.get(-1, 0, -1);
  assert.ok(cm1m1);
  assert.deepEqual(cm1m1.starIndices, [3]);

  assert.equal(grid.size(), 3);
  assert.equal(grid.occupiedCount(), 3);
});

test('index() resets state across calls (no stale star indices)', () => {
  const grid = createCubeGrid({ cubeSize: 2, origin: ORIGIN });
  grid.index(new Float32Array([0.5, 0.0, 0.5]));
  grid.index(new Float32Array([2.5, 0.0, 0.0]));
  // Old cube must be gone; new one is the only entry.
  assert.equal(grid.get(0, 0, 0), undefined);
  assert.equal(grid.size(), 1);
  assert.deepEqual(grid.get(1, 0, 0)?.starIndices, [0]);
});

test('fillDisk inserts empty cubes inside the radius and skips outside', () => {
  const grid = createCubeGrid({ cubeSize: 2, origin: ORIGIN });
  grid.fillDisk({ radius: 3 });
  // Cube (0, 0, 0) centre is at (0, 0, 0) — well inside r=3.
  assert.ok(grid.get(0, 0, 0));
  // Cube (5, 0, 0) centre at (10, 0, 0) — outside r=3.
  assert.equal(grid.get(5, 0, 0), undefined);
});

test('fillDisk preserves existing cubes and their star indices', () => {
  const grid = createCubeGrid({ cubeSize: 2, origin: ORIGIN });
  grid.index(new Float32Array([0.5, 0.0, 0.5])); // populates cube (0, 0, 0)
  grid.fillDisk({ radius: 3 });
  const c = grid.get(0, 0, 0);
  assert.ok(c);
  assert.deepEqual(c.starIndices, [0]);
});

test('remove deletes a cube and returns whether it existed', () => {
  const grid = createCubeGrid({ cubeSize: 2, origin: ORIGIN });
  grid.index(new Float32Array([0.5, 0.0, 0.5]));
  assert.equal(grid.remove(0, 0, 0), true);
  assert.equal(grid.get(0, 0, 0), undefined);
  assert.equal(grid.remove(0, 0, 0), false);
});

test('bounds reports the integer extents of occupied cubes', () => {
  const grid = createCubeGrid({ cubeSize: 2, origin: ORIGIN });
  grid.index(new Float32Array([
    -3.0, 0.0, 0.0,   // i = floor((-3 - -1) / 2) = -1
    5.0, 0.0, 3.0,    // i = floor((5 - -1) / 2) = 3, k = floor((3 - -1) / 2) = 2
  ]));
  const b = grid.bounds();
  assert.equal(b.minI, -1);
  assert.equal(b.maxI, 3);
  assert.equal(b.minK, 0);
  assert.equal(b.maxK, 2);
});

test('pickCube returns the first occupied cube along a ray', () => {
  const grid = createCubeGrid({ cubeSize: 2, origin: ORIGIN });
  grid.index(new Float32Array([6.0, 0.0, 0.0])); // cube (3, 0, 0)
  // Ray from origin going +x — must hit cube (3, 0, 0).
  const hit = grid.pickCube({ x: -10, y: 0, z: 0 }, { x: 1, y: 0, z: 0 });
  assert.ok(hit);
  assert.equal(hit.i, 3);
});

test('pickCube returns null when the ray misses every occupied cube', () => {
  const grid = createCubeGrid({ cubeSize: 2, origin: ORIGIN });
  grid.index(new Float32Array([0.5, 0.0, 0.5]));
  // Ray going straight up from below — never hits y=0 cube row.
  const hit = grid.pickCube({ x: 100, y: -100, z: 100 }, { x: 0, y: 1, z: 0 }, { maxSteps: 50 });
  assert.equal(hit, null);
});
