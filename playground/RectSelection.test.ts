import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Cube } from '../core/CubeGrid.js';
import { rectBox, outlineCoords, cubesInBox } from './RectSelection.js';

const cube = (i: number, j: number, k: number): Cube => ({ i, j, k, starIndices: [] });

test('rectBox normalises min/max regardless of anchor/current order', () => {
  const a = { i: 3, j: 0, k: 7 };
  const b = { i: -2, k: 4 };
  const box = rectBox(a, b);
  assert.deepEqual(box, { minI: -2, maxI: 3, minK: 4, maxK: 7, j: 0 });
});

test('rectBox always pins j to the anchor (current.j is ignored)', () => {
  const box = rectBox({ i: 0, j: 5, k: 0 }, { i: 1, k: 1 });
  assert.equal(box.j, 5);
});

test('outlineCoords on a 1x1 box is empty (anchor === current === only cell)', () => {
  const a = { i: 2, j: 0, k: 2 };
  const box = rectBox(a, { i: 2, k: 2 });
  const out = outlineCoords(box, a, { i: 2, k: 2 });
  assert.deepEqual(out, []);
});

test('outlineCoords on a 1×N strip excludes endpoints but keeps the middle cells', () => {
  const a = { i: 0, j: 0, k: 0 };
  const c = { i: 0, k: 3 };
  const box = rectBox(a, c);
  const out = outlineCoords(box, a, c);
  // i = 0 row, k ∈ [0..3] → 4 cells, minus the 2 endpoints (0,0) and (0,3)
  assert.deepEqual(out, [
    { i: 0, j: 0, k: 1 },
    { i: 0, j: 0, k: 2 },
  ]);
});

test('outlineCoords on a 3×3 box returns the 8 perimeter cells, minus the 2 endpoints', () => {
  const a = { i: 0, j: 0, k: 0 };
  const c = { i: 2, k: 2 };
  const box = rectBox(a, c);
  const out = outlineCoords(box, a, c);
  // Perimeter of a 3×3 grid = 8 cells; we exclude (0,0) and (2,2) → 6
  assert.equal(out.length, 6);
  // No interior cell (1,1) in the result
  assert.equal(out.some((p) => p.i === 1 && p.k === 1), false);
  // No anchor / current
  assert.equal(out.some((p) => p.i === 0 && p.k === 0), false);
  assert.equal(out.some((p) => p.i === 2 && p.k === 2), false);
});

test('cubesInBox returns only selectable cubes inside the box', () => {
  const grid = new Map<string, Cube>([
    ['0|0|0', cube(0, 0, 0)],
    ['1|0|0', cube(1, 0, 0)],
    ['2|0|0', cube(2, 0, 0)],
    // (0|0|1) intentionally missing
    ['1|0|1', cube(1, 0, 1)],
    ['2|0|1', cube(2, 0, 1)],
    // (3|0|0) outside the box
    ['3|0|0', cube(3, 0, 0)],
  ]);
  const getSelectable = (i: number, j: number, k: number) => grid.get(`${i}|${j}|${k}`) ?? null;

  const box = rectBox({ i: 0, j: 0, k: 0 }, { i: 2, k: 1 });
  const cubes = cubesInBox(box, getSelectable);
  const keys = cubes.map((c) => `${c.i}|${c.j}|${c.k}`).sort();
  assert.deepEqual(keys, ['0|0|0', '1|0|0', '1|0|1', '2|0|0', '2|0|1']);
});

test('cubesInBox skips cells flagged non-selectable by the resolver (e.g. fog-hidden)', () => {
  const visible = cube(0, 0, 0);
  const hidden = cube(1, 0, 0);
  const getSelectable = (i: number, _j: number, _k: number) => (i === 0 ? visible : null);

  const box = rectBox({ i: 0, j: 0, k: 0 }, { i: 1, k: 0 });
  const cubes = cubesInBox(box, getSelectable);
  assert.deepEqual(cubes, [visible]);
  assert.equal(cubes.includes(hidden), false);
});
