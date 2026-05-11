import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSelectionRing } from './SelectionRing.js';

test('factory exposes the expected API and starts hidden', () => {
  const ring = createSelectionRing();
  assert.equal(ring.object.visible, false);
  assert.equal(typeof ring.setColor, 'function');
  assert.equal(typeof ring.setPosition, 'function');
  assert.equal(typeof ring.setSize, 'function');
  assert.equal(typeof ring.show, 'function');
  assert.equal(typeof ring.hide, 'function');
  assert.equal(typeof ring.update, 'function');
});

test('show/hide toggles visibility', () => {
  const ring = createSelectionRing();
  ring.show();
  assert.equal(ring.object.visible, true);
  ring.hide();
  assert.equal(ring.object.visible, false);
});

test('setPosition writes to mesh.position', () => {
  const ring = createSelectionRing();
  ring.setPosition(3, -1, 2);
  assert.equal(ring.object.position.x, 3);
  assert.equal(ring.object.position.y, -1);
  assert.equal(ring.object.position.z, 2);
});

test('setSize sets uniform scale on the mesh', () => {
  const ring = createSelectionRing();
  ring.setSize(0.42);
  assert.ok(Math.abs(ring.object.scale.x - 0.42) < 1e-6);
  assert.ok(Math.abs(ring.object.scale.y - 0.42) < 1e-6);
  assert.ok(Math.abs(ring.object.scale.z - 0.42) < 1e-6);
});

test('setColor accepts an RGB tuple', () => {
  const ring = createSelectionRing();
  ring.setColor([0.1, 0.2, 0.3]);
  const c = (ring.object.material as THREE.ShaderMaterial).uniforms.uColor.value as THREE.Color;
  assert.ok(Math.abs(c.r - 0.1) < 1e-6);
  assert.ok(Math.abs(c.g - 0.2) < 1e-6);
  assert.ok(Math.abs(c.b - 0.3) < 1e-6);
});

test('setColor accepts a hex / ColorRepresentation', () => {
  const ring = createSelectionRing({ color: 0x000000 });
  ring.setColor(0x6cf2ff);
  const c = (ring.object.material as THREE.ShaderMaterial).uniforms.uColor.value as THREE.Color;
  // Compare against the canonical THREE.Color reading of the same hex — this
  // sidesteps any sRGB ↔ linear conversion baked into the active colour space.
  const expected = new THREE.Color(0x6cf2ff);
  assert.ok(Math.abs(c.r - expected.r) < 1e-6);
  assert.ok(Math.abs(c.g - expected.g) < 1e-6);
  assert.ok(Math.abs(c.b - expected.b) < 1e-6);
});

test('pulse:false zeroes the pulse amplitude (static look)', () => {
  const ring = createSelectionRing({ pulse: false });
  const amp = (ring.object.material as THREE.ShaderMaterial).uniforms.uPulseAmp.value as number;
  assert.equal(amp, 0);
});

test('pulse:true defaults to a non-zero amplitude (breathing)', () => {
  const ring = createSelectionRing({ pulse: true });
  const amp = (ring.object.material as THREE.ShaderMaterial).uniforms.uPulseAmp.value as number;
  assert.ok(amp > 0, `expected non-zero pulse amplitude, got ${amp}`);
});

test('update propagates time to uTime', () => {
  const ring = createSelectionRing();
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(0, 0, 5);
  ring.update(camera, 2.71);
  const t = (ring.object.material as THREE.ShaderMaterial).uniforms.uTime.value as number;
  assert.equal(t, 2.71);
});

test('update orients the billboard towards the camera (lookAt)', () => {
  const ring = createSelectionRing();
  ring.setPosition(0, 0, 0);
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(0, 0, 10);
  ring.update(camera, 0);
  // Mesh facing +Z when the camera sits on +Z — its forward direction (-Z in
  // local space) should align with the world -Z axis. Read it from the
  // rotated unit vector.
  const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(ring.object.quaternion);
  assert.ok(forward.z > 0.99, `expected mesh facing +Z, got z=${forward.z}`);
});
