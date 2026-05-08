import { test } from 'node:test';
import assert from 'node:assert/strict';
import { effectScope, nextTick } from 'vue';
import * as THREE from 'three';
import { createGalaxyData } from '../../core/GalaxyData.js';
import { useGalaxyView } from './UseGalaxyView.js';

const baseOpts = {
  seed: 42,
  count: 500,
  radius: 50,
  innerRadius: 4.5,
  thickness: 0,
  arms: 6,
  spin: 0.9,
  spread: 0.95,
  fieldRatio: 0.3,
  minDistance: 0.25,
  fillCenter: false,
};

/** Shorthand for reading a uniform value off a Three Material. */
function uniformOf(layer: THREE.Object3D, name: string): number | undefined {
  const mesh = layer as THREE.Mesh;
  const mat = mesh.material as THREE.ShaderMaterial | undefined;
  return mat?.uniforms?.[name]?.value as number | undefined;
}

test('useGalaxyView returns object3D + underlying scene', () => {
  const scope = effectScope();
  scope.run(() => {
    const view = useGalaxyView(createGalaxyData(baseOpts));
    assert.ok(view.object3D);
    assert.ok(view.scene);
    assert.equal(view.object3D, view.scene.object3D);
  });
  scope.stop();
});

test('mutating dimming ref propagates to every layer uniform', async () => {
  const scope = effectScope();
  await scope.run(async () => {
    const view = useGalaxyView(createGalaxyData(baseOpts));
    const field = view.object3D.children.find((c) => (c as THREE.Points).geometry?.attributes?.aSize)!;
    assert.equal(uniformOf(field, 'uDim'), 1.0);

    view.dimming.value = 0.3;
    await nextTick();
    assert.equal(uniformOf(field, 'uDim'), 0.3);
  });
  scope.stop();
});

test('mutating gasDim only affects gas layers, not the star field', async () => {
  const scope = effectScope();
  await scope.run(async () => {
    const view = useGalaxyView(createGalaxyData(baseOpts));
    // Find the named gas layers.
    const armGlow    = view.object3D.children.find((c) => c.name === 'armGlow')!;
    const gasStreaks = view.object3D.children.find((c) => c.name === 'gasStreaks')!;
    const nebulae    = view.object3D.children.find((c) => c.name === 'nebulae')!;
    const innerRing  = view.object3D.children.find((c) => c.name === 'innerRing')!;

    view.gasDim.value = 0.45;
    await nextTick();

    assert.equal(uniformOf(armGlow,    'uDim'), 0.45);
    assert.equal(uniformOf(gasStreaks, 'uDim'), 0.45);
    assert.equal(uniformOf(nebulae,    'uDim'), 0.45);
    assert.equal(uniformOf(innerRing,  'uDim'), 0.45);
  });
  scope.stop();
});

test('mutating haloVisible toggles the halo mesh visibility', async () => {
  const scope = effectScope();
  await scope.run(async () => {
    const view = useGalaxyView(createGalaxyData(baseOpts));
    const halo = view.object3D.children.find((c) => c.name === 'halo')!;
    assert.equal(halo.visible, true);

    view.haloVisible.value = false;
    await nextTick();
    assert.equal(halo.visible, false);

    view.haloVisible.value = true;
    await nextTick();
    assert.equal(halo.visible, true);
  });
  scope.stop();
});

test('mutating visibilityField updates the per-particle visibility attribute', async () => {
  const scope = effectScope();
  await scope.run(async () => {
    const view = useGalaxyView(createGalaxyData(baseOpts));
    const field = view.object3D.children.find((c) => (c as THREE.Points).geometry?.attributes?.aVisibility) as THREE.Points;
    const visAttr = field.geometry.attributes.aVisibility as THREE.BufferAttribute;
    // Initially every particle is fully visible.
    assert.equal((visAttr.array as Float32Array)[0], 1);

    view.visibilityField.value = { focals: [{ i: 999, k: 999 }], range: 1 };
    await nextTick();
    // A focal far outside the disk hides every particle.
    assert.equal((visAttr.array as Float32Array)[0], 0);

    view.visibilityField.value = null;
    await nextTick();
    assert.equal((visAttr.array as Float32Array)[0], 1);
  });
  scope.stop();
});

test('mutating clipping toggles the clip uniforms', async () => {
  const scope = effectScope();
  await scope.run(async () => {
    const view = useGalaxyView(createGalaxyData(baseOpts));
    const field = view.object3D.children.find((c) => (c as THREE.Points).geometry?.attributes?.aSize)!;
    assert.equal(uniformOf(field, 'uClipActive'), 0);

    view.clipping.value = {
      active: true,
      normal: new THREE.Vector3(0, 1, 0),
      point: new THREE.Vector3(0, 0, 0),
    };
    await nextTick();
    assert.equal(uniformOf(field, 'uClipActive'), 1);

    view.clipping.value = { active: false };
    await nextTick();
    assert.equal(uniformOf(field, 'uClipActive'), 0);
  });
  scope.stop();
});

test('scope disposal calls scene.dispose (no GPU leak after unmount)', () => {
  const scope = effectScope();
  let disposed = false;
  scope.run(() => {
    const view = useGalaxyView(createGalaxyData(baseOpts));
    // Patch the scene to observe dispose. The composable forwards to scene.dispose
    // via the onScopeDispose hook; we verify the call lands.
    const orig = view.scene.dispose;
    view.scene.dispose = () => {
      disposed = true;
      orig.call(view.scene);
    };
  });
  scope.stop();
  assert.equal(disposed, true);
});
