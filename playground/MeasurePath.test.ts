import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createMeasurePath } from './MeasurePath.js';

test('factory exposes the API surface and starts hidden', () => {
  const p = createMeasurePath({ color: 0x6cf2ff });
  assert.equal(p.object3D.visible, false);
  assert.equal(typeof p.setStops, 'function');
  assert.equal(typeof p.show, 'function');
  assert.equal(typeof p.hide, 'function');
  assert.equal(typeof p.update, 'function');
  assert.equal(typeof p.setResolution, 'function');
  assert.equal(typeof p.dispose, 'function');
});

test('setStops with < 2 stops hides the group (no segment, no ring)', () => {
  const p = createMeasurePath({ color: 0x6cf2ff });
  p.show();
  p.setStops([new THREE.Vector3(0, 0, 0)]);
  assert.equal(p.object3D.visible, false);
});

test('setStops with N stops creates N - 1 segments and N - 2 intermediate rings', () => {
  const p = createMeasurePath({ color: 0x6cf2ff });
  p.setStops([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(2, 0, 0),
    new THREE.Vector3(3, 0, 0),
  ]);
  // object3D layout: [segGroup, stopGroup] — children of those tell us the counts.
  const [segGroup, stopGroup] = p.object3D.children as [THREE.Group, THREE.Group];
  assert.equal(segGroup.children.length, 3, 'one DashedPath per hop');
  assert.equal(stopGroup.children.length, 2, 'rings on intermediate stops only');
});

test('setStops replaces previous segments and rings (no leak across re-routes)', () => {
  const p = createMeasurePath({ color: 0x6cf2ff });
  p.setStops([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(2, 0, 0),
    new THREE.Vector3(3, 0, 0),
  ]);
  p.setStops([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(5, 0, 0),
  ]);
  const [segGroup, stopGroup] = p.object3D.children as [THREE.Group, THREE.Group];
  assert.equal(segGroup.children.length, 1);
  assert.equal(stopGroup.children.length, 0);
});

test('update is a no-op when hidden (avoids burning CPU off-screen)', () => {
  const p = createMeasurePath({ color: 0x6cf2ff });
  p.setStops([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(2, 0, 0),
  ]);
  // Hidden by default — update should not throw, and that's about all we can check
  // without a real renderer (ring.update mutates GPU uniforms behind the scenes).
  const camera = new THREE.PerspectiveCamera();
  p.update(camera, 1.0);
});
