import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCubeGrid } from '../core/CubeGrid.js';
import type { GalaxyData } from '../core/GalaxyData.js';
import { cubesAtPositions } from './MeasureTool.js';

/**
 * Builds the minimal slice of GalaxyData used by `cubesAtPositions`. The full
 * factory pulls a lot of side-effect-heavy work in (random buffers, octree…)
 * which we don't need here.
 */
function makeGalaxy(positions: Float32Array, cubeSize = 2): GalaxyData {
  const grid = createCubeGrid({ cubeSize });
  grid.index(positions);
  return {
    opts: { cubeSize },
    grid,
    data: { positions },
  } as unknown as GalaxyData;
}

test('cubesAtPositions returns the canonical grid cube at each position', () => {
  // Two stars in two distinct cubes — cubeSize=2 → (0,0,0) and (-1,0,-1).
  const positions = new Float32Array([1.0, 0.0, 1.0, -1.0, 0.0, -1.0]);
  const galaxy = makeGalaxy(positions);

  const cubes = cubesAtPositions(galaxy, [
    { x: 1.0, y: 0.0, z: 1.0 },
    { x: -1.0, y: 0.0, z: -1.0 },
  ]);

  assert.equal(cubes.length, 2);
  const keys = cubes.map((c) => `${c.i}|${c.j}|${c.k}`).sort();
  assert.deepEqual(keys, ['-1|0|-1', '0|0|0']);
});

test('cubesAtPositions deduplicates when several positions fall in the same cube', () => {
  const positions = new Float32Array([0.5, 0.5, 0.5]);
  const galaxy = makeGalaxy(positions);

  const cubes = cubesAtPositions(galaxy, [
    { x: 0.5, y: 0.5, z: 0.5 },
    { x: 0.6, y: 0.6, z: 0.6 }, // Still inside the same cube
    { x: 0.5, y: 0.5, z: 0.5 }, // Exact dup
  ]);

  assert.equal(cubes.length, 1);
});

test('cubesAtPositions skips positions that land outside the indexed grid', () => {
  const positions = new Float32Array([0.5, 0.5, 0.5]);
  const galaxy = makeGalaxy(positions);

  const cubes = cubesAtPositions(galaxy, [
    { x: 0.5, y: 0.5, z: 0.5 },
    { x: 100, y: 100, z: 100 }, // empty cell
  ]);

  assert.equal(cubes.length, 1);
});

test('cubesAtPositions on an empty positions list returns []', () => {
  const galaxy = makeGalaxy(new Float32Array(0));
  assert.deepEqual(cubesAtPositions(galaxy, []), []);
});
