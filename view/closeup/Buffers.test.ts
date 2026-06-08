import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { prepareCloseupField, type CloseupFieldSource } from './Buffers.js';
import type { Cube } from '../../core/CubeGrid.js';

/** Two-star source satisfying the narrow `CloseupFieldSource` contract (no grid/opts). */
function makeSource(): CloseupFieldSource {
  return {
    seed: 1,
    data: {
      positions: new Float32Array([0, 0, 0, 1, 0, 0]),
      colors: new Float32Array([1, 0.5, 0.2, 0.2, 0.5, 1]),
      sizes: new Float32Array([1, 2]),
      temps: new Float32Array([5000, 20000]),
    },
  };
}

const CUBE: Cube = { i: 0, j: 0, k: 0, starIndices: [0, 1] };

test('a plain fragment source (no GalaxyData) is accepted', () => {
  const field = prepareCloseupField(CUBE, makeSource());
  assert.ok(field);
  assert.deepEqual([...field.globalIndices], [0, 1]);
});

test('stars start fully visible (aVisibility defaults to 1)', () => {
  const field = prepareCloseupField(CUBE, makeSource());
  assert.ok(field);
  const vis = field.points.geometry.getAttribute('aVisibility') as THREE.BufferAttribute;
  assert.equal(vis.count, 2);
  assert.deepEqual([...(vis.array as Float32Array)], [1, 1]);
});

test('material exposes a uDim uniform defaulting to 1', () => {
  const field = prepareCloseupField(CUBE, makeSource());
  assert.ok(field);
  const mat = field.points.material as THREE.ShaderMaterial;
  assert.equal(mat.uniforms.uDim?.value, 1);
});

test('aVisibility is a mutable per-star attribute (fog of war)', () => {
  const field = prepareCloseupField(CUBE, makeSource());
  assert.ok(field);
  const vis = field.points.geometry.getAttribute('aVisibility') as THREE.BufferAttribute;
  (vis.array as Float32Array)[1] = 0.1;
  vis.needsUpdate = true;
  assert.equal((vis.array as Float32Array)[0], 1);
  assert.ok(Math.abs((vis.array as Float32Array)[1] - 0.1) < 1e-6);
});
