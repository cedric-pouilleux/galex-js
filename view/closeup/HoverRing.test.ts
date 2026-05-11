import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createHoverRing } from './HoverRing.js';

// Synthetic THREE.Points stand-in — `showOn` only reads the `position`
// attribute, never raycasts. Using a real BufferGeometry keeps the attribute
// access identical to runtime.
function fakeField(positions: number[]): THREE.Points {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  return new THREE.Points(geo);
}

function cameraAt(x: number, y: number, z: number): THREE.PerspectiveCamera {
  const c = new THREE.PerspectiveCamera();
  c.position.set(x, y, z);
  return c;
}

test('createHoverRing exposes object/showOn/update/hide and starts hidden', () => {
  const ring = createHoverRing();
  assert.equal(ring.object.visible, false);
  assert.equal(typeof ring.showOn, 'function');
  assert.equal(typeof ring.update, 'function');
  assert.equal(typeof ring.hide, 'function');
});

test('showOn anchors mesh to the star position', () => {
  const ring = createHoverRing();
  const field = fakeField([0, 0, 0, 3, -1, 2, 5, 5, 5]);
  ring.showOn(field, 1, cameraAt(0, 0, 10), null);
  assert.equal(ring.object.visible, true);
  assert.equal(ring.object.position.x, 3);
  assert.equal(ring.object.position.y, -1);
  assert.equal(ring.object.position.z, 2);
});

test('mesh scale grows linearly with camera distance (constant apparent size)', () => {
  const ring = createHoverRing();
  const field = fakeField([0, 0, 0]);

  ring.showOn(field, 0, cameraAt(0, 0, 4), null);
  const scaleNear = ring.object.scale.x;

  // Same star, camera 4× further away → scale should be 4× larger so the ring
  // keeps the same on-screen footprint.
  ring.showOn(field, 0, cameraAt(0, 0, 16), null);
  const scaleFar = ring.object.scale.x;

  assert.ok(Math.abs(scaleFar / scaleNear - 4) < 1e-3,
    `expected 4× ratio, got ${scaleFar / scaleNear}`);
});

test('update re-applies the distance-based scale when the camera moves', () => {
  const ring = createHoverRing();
  const field = fakeField([0, 0, 0]);
  const camera = cameraAt(0, 0, 4);

  ring.showOn(field, 0, camera, null);
  const initialScale = ring.object.scale.x;

  camera.position.set(0, 0, 8);
  ring.update(camera, 0.5);

  // Camera distance doubled → scale should double too.
  assert.ok(Math.abs(ring.object.scale.x / initialScale - 2) < 1e-3,
    `expected scale to double, got ratio ${ring.object.scale.x / initialScale}`);
});

test('hide toggles visibility off and update is a no-op while hidden', () => {
  const ring = createHoverRing();
  const field = fakeField([0, 0, 0]);
  const camera = cameraAt(0, 0, 5);
  ring.showOn(field, 0, camera, null);
  assert.equal(ring.object.visible, true);
  ring.hide();
  assert.equal(ring.object.visible, false);
  const prevScale = ring.object.scale.x;
  camera.position.set(0, 0, 100);
  ring.update(camera, 1.0);
  // Hidden → update bails out, scale untouched.
  assert.equal(ring.object.scale.x, prevScale);
});

test('update propagates time into the uTime uniform', () => {
  const ring = createHoverRing();
  const field = fakeField([0, 0, 0]);
  const camera = cameraAt(0, 0, 5);
  ring.showOn(field, 0, camera, null);
  ring.update(camera, 1.5);
  const mat = ring.object.material as THREE.ShaderMaterial;
  assert.equal(mat.uniforms.uTime.value, 1.5);
});

test('temperature null tints the ring white', () => {
  const ring = createHoverRing();
  const field = fakeField([0, 0, 0]);
  ring.showOn(field, 0, cameraAt(0, 0, 5), null);
  const color = (ring.object.material as THREE.ShaderMaterial).uniforms.uColor.value as THREE.Color;
  assert.equal(color.r, 1);
  assert.equal(color.g, 1);
  assert.equal(color.b, 1);
});

test('hot temperature shifts the tint towards blue (b > r)', () => {
  const ring = createHoverRing();
  const field = fakeField([0, 0, 0]);
  ring.showOn(field, 0, cameraAt(0, 0, 5), 30000);
  const color = (ring.object.material as THREE.ShaderMaterial).uniforms.uColor.value as THREE.Color;
  assert.ok(color.b > color.r, `expected blue-leaning tint, got r=${color.r} b=${color.b}`);
});

test('cool temperature shifts the tint towards red (r > b)', () => {
  const ring = createHoverRing();
  const field = fakeField([0, 0, 0]);
  ring.showOn(field, 0, cameraAt(0, 0, 5), 3000);
  const color = (ring.object.material as THREE.ShaderMaterial).uniforms.uColor.value as THREE.Color;
  assert.ok(color.r > color.b, `expected red-leaning tint, got r=${color.r} b=${color.b}`);
});
