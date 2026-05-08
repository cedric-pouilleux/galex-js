import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeVisibilityField, tierMapForVisibilityField } from './Visibility.js';

const grid = { cubeSize: 2, originX: -1, originZ: -1 };
// Cube (i, k) world centre is (i*2, _, k*2). The origin offset puts cube (0, 0)
// centred at (0, 0) — matching Galaxy.js.

function makePositions(coords: [number, number, number][]): Float32Array {
  const buf = new Float32Array(coords.length * 3);
  for (let n = 0; n < coords.length; n++) {
    const [x, , z] = coords[n];
    buf[n * 3 + 0] = x;
    buf[n * 3 + 1] = 0;
    buf[n * 3 + 2] = z;
  }
  return buf;
}

test('single focal: particle on the focal cube is fully visible', () => {
  const positions = makePositions([[0, 0, 0]]);
  const out = computeVisibilityField(positions, grid, [{ i: 0, k: 0 }], 2);
  assert.equal(out[0], 1);
});

test('single focal range=2: particle 1 cube away is fully visible (inner)', () => {
  const positions = makePositions([[2, 0, 0]]); // cube (1, 0)
  const out = computeVisibilityField(positions, grid, [{ i: 0, k: 0 }], 2);
  assert.equal(out[0], 1);
});

test('single focal range=2: particle 2 cubes away on diagonal is faded', () => {
  const positions = makePositions([[2, 0, 2]]); // cube (1, 1), d² = 2, (range-1)² = 1, range² = 4
  const out = computeVisibilityField(positions, grid, [{ i: 0, k: 0 }], 2, 0.3);
  assert.equal(out[0], Math.fround(0.3));
});

test('single focal range=2: particle 3 cubes away is hidden', () => {
  const positions = makePositions([[6, 0, 0]]); // cube (3, 0), d² = 9 > 4
  const out = computeVisibilityField(positions, grid, [{ i: 0, k: 0 }], 2);
  assert.equal(out[0], 0);
});

test('range=1 collapses inner radius to 0 — only the focal cube is visible', () => {
  const positions = makePositions([[0, 0, 0], [2, 0, 0]]);
  const out = computeVisibilityField(positions, grid, [{ i: 0, k: 0 }], 1, 0.2);
  assert.equal(out[0], 1);                  // cube (0, 0): d² = 0, innerSq = 0
  assert.equal(out[1], Math.fround(0.2));   // cube (1, 0): d² = 1, rangeSq = 1
});

test('multiple focals: visibility takes the closest focal', () => {
  // Particle at cube (5, 0). Focal A at (0, 0) is far, focal B at (5, 0) is on it.
  const positions = makePositions([[10, 0, 0]]);
  const focals = [{ i: 0, k: 0 }, { i: 5, k: 0 }];
  const out = computeVisibilityField(positions, grid, focals, 2);
  assert.equal(out[0], 1);
});

test('reuses the provided output buffer', () => {
  const positions = makePositions([[0, 0, 0]]);
  const reused = new Float32Array(1);
  reused[0] = 0.42;
  const out = computeVisibilityField(positions, grid, [{ i: 0, k: 0 }], 2, 0.2, reused);
  assert.equal(out, reused);
  assert.equal(out[0], 1);
});

test('tierMap returns 0 on focal cube and 1 on the rim', () => {
  const cubeExists = () => true;
  const tiers = tierMapForVisibilityField([{ i: 0, k: 0 }], 2, cubeExists);
  assert.equal(tiers.get('0|0|0'), 0);
  assert.equal(tiers.get('1|0|0'), 0); // d² = 1, innerSq = 1
  assert.equal(tiers.get('2|0|0'), 1); // d² = 4 = rangeSq, > innerSq
  assert.equal(tiers.has('3|0|0'), false); // d² = 9 > rangeSq
});

test('tierMap with overlapping focals: the lowest tier wins', () => {
  const cubeExists = () => true;
  const focals = [{ i: 0, k: 0 }, { i: 4, k: 0 }];
  const tiers = tierMapForVisibilityField(focals, 2, cubeExists);
  // cube (2, 0): d²=4 from A (rim), d²=4 from B (rim) → tier 1
  assert.equal(tiers.get('2|0|0'), 1);
  // cube (3, 0): d²=9 from A (out), d²=1 from B (inner) → tier 0
  assert.equal(tiers.get('3|0|0'), 0);
});

test('tierMap skips cubes that do not exist on the grid', () => {
  const cubeExists = (i: number, _j: number, k: number) => !(i === 1 && k === 0);
  const tiers = tierMapForVisibilityField([{ i: 0, k: 0 }], 2, cubeExists);
  assert.equal(tiers.has('0|0|0'), true);
  assert.equal(tiers.has('1|0|0'), false);
});
