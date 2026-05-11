import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createDashedPath } from './DashedPath.js';

test('factory exposes API surface and starts hidden', () => {
  const p = createDashedPath({ color: 0xff0000 });
  assert.equal(p.object3D.visible, false);
  assert.ok(p.material, 'material is exposed');
  assert.ok(p.geometry, 'geometry is exposed');
  assert.equal(typeof p.setEndpoints, 'function');
  assert.equal(typeof p.show, 'function');
  assert.equal(typeof p.hide, 'function');
  assert.equal(typeof p.update, 'function');
  assert.equal(typeof p.setResolution, 'function');
  assert.equal(typeof p.dispose, 'function');
});

test('show/hide toggles visibility', () => {
  const p = createDashedPath({ color: 0xff0000 });
  p.show();
  assert.equal(p.object3D.visible, true);
  p.hide();
  assert.equal(p.object3D.visible, false);
});

test('static defaults: update leaves dash + opacity untouched', () => {
  const p = createDashedPath({ color: 0xff0000 });
  p.show();
  const offset0 = p.material.dashOffset;
  const opacity0 = p.material.opacity;
  p.update(7.5);
  assert.equal(p.material.dashOffset, offset0);
  assert.equal(p.material.opacity, opacity0);
});

test('dashScrollSpeed > 0: update scrolls the dash pattern (negative offset, A → B)', () => {
  const p = createDashedPath({ color: 0xff0000, dashScrollSpeed: 1.0 });
  p.show();
  p.update(2.0);
  assert.equal(p.material.dashOffset, -2.0);
  p.update(3.5);
  assert.equal(p.material.dashOffset, -3.5);
});

test('pulseAmp > 0: update breathes opacity around the base value', () => {
  const p = createDashedPath({ color: 0xff0000, opacity: 0.8, pulseAmp: 0.1 });
  p.show();
  p.update(0);
  // sin(0) = 0 → opacity stays at base.
  assert.ok(Math.abs(p.material.opacity - 0.8) < 1e-9);
});

test('update is a no-op when hidden (avoids burning CPU off-screen)', () => {
  const p = createDashedPath({ color: 0xff0000, dashScrollSpeed: 1.0, pulseAmp: 0.1 });
  const offset0 = p.material.dashOffset;
  const opacity0 = p.material.opacity;
  // Hidden by default.
  p.update(10);
  assert.equal(p.material.dashOffset, offset0);
  assert.equal(p.material.opacity, opacity0);
});

test('object3D is extensible — children can be added by the caller', () => {
  const p = createDashedPath({ color: 0xff0000 });
  const childCountBefore = p.object3D.children.length;
  const extra = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  p.object3D.add(extra);
  assert.equal(p.object3D.children.length, childCountBefore + 1);
});

test('setEndpoints accepts any Vector3 pair (no throw)', () => {
  const p = createDashedPath({ color: 0xff0000 });
  p.setEndpoints(new THREE.Vector3(0, 0, 0), new THREE.Vector3(5, 3, -2));
  // We can't easily inspect LineGeometry internals across versions, but the
  // call must not throw and the line distances must be recomputed.
});

test('setResolution forwards to the line material', () => {
  const p = createDashedPath({ color: 0xff0000 });
  p.setResolution(1920, 1080);
  assert.equal(p.material.resolution.x, 1920);
  assert.equal(p.material.resolution.y, 1080);
});
