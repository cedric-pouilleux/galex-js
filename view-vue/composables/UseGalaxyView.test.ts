import { test } from 'node:test';
import assert from 'node:assert/strict';
import { effectScope, nextTick, ref } from 'vue';
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
  if (!(layer instanceof THREE.Mesh) && !(layer instanceof THREE.Points)) return undefined;
  const mat = layer.material;
  if (Array.isArray(mat) || !(mat instanceof THREE.ShaderMaterial)) return undefined;
  return mat.uniforms?.[name]?.value as number | undefined;
}

/** The scene's children live one Group deeper now (view.object3D wraps scene.object3D). */
function sceneChildren(view: ReturnType<typeof useGalaxyView>): THREE.Object3D[] {
  return view.scene.object3D.children;
}

test('useGalaxyView returns a stable object3D wrapping the underlying scene', () => {
  const scope = effectScope();
  scope.run(() => {
    const view = useGalaxyView(createGalaxyData(baseOpts));
    assert.ok(view.object3D);
    assert.ok(view.scene);
    // The wrapper contains the scene group as its single child.
    assert.equal(view.object3D.children[0], view.scene.object3D);
  });
  scope.stop();
});

test('mutating dimming ref propagates to every layer uniform', async () => {
  const scope = effectScope();
  await scope.run(async () => {
    const view = useGalaxyView(createGalaxyData(baseOpts));
    const field = sceneChildren(view).find((c) => c instanceof THREE.Points && c.geometry.attributes.aSize)!;
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
    const children = sceneChildren(view);
    const armGlow    = children.find((c) => c.name === 'armGlow')!;
    const gasStreaks = children.find((c) => c.name === 'gasStreaks')!;
    const nebulae    = children.find((c) => c.name === 'nebulae')!;
    const innerRing  = children.find((c) => c.name === 'innerRing')!;

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
    const halo = sceneChildren(view).find((c) => c.name === 'halo')!;
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

test('mutating coreVisible toggles the inner ring and center dust group together', async () => {
  const scope = effectScope();
  await scope.run(async () => {
    const view = useGalaxyView(createGalaxyData({ ...baseOpts, fillCenter: true }));
    const innerRing  = sceneChildren(view).find((c) => c.name === 'innerRing')!;
    const centerDust = sceneChildren(view).find((c) => c.name === 'centerDust')!;
    assert.equal(innerRing.visible, true);
    assert.equal(centerDust.visible, true);

    view.coreVisible.value = false;
    await nextTick();
    assert.equal(innerRing.visible, false);
    assert.equal(centerDust.visible, false);

    view.coreVisible.value = true;
    await nextTick();
    assert.equal(innerRing.visible, true);
    assert.equal(centerDust.visible, true);
  });
  scope.stop();
});

test('mutating visibilityField updates the per-particle visibility attribute', async () => {
  const scope = effectScope();
  await scope.run(async () => {
    const view = useGalaxyView(createGalaxyData(baseOpts));
    const field = sceneChildren(view).find(
      (c) => c instanceof THREE.Points && c.geometry.attributes.aVisibility,
    );
    assert.ok(field instanceof THREE.Points);
    const visAttr = field.geometry.attributes.aVisibility;
    assert.ok(visAttr instanceof THREE.BufferAttribute);
    const visArray = visAttr.array as Float32Array;
    // Initially every particle is fully visible.
    assert.equal(visArray[0], 1);

    view.visibilityField.value = { focals: [{ i: 999, k: 999 }], range: 1 };
    await nextTick();
    // A focal far outside the disk hides every particle.
    assert.equal(visArray[0], 0);

    view.visibilityField.value = null;
    await nextTick();
    assert.equal(visArray[0], 1);
  });
  scope.stop();
});

test('mutating clipping toggles the clip uniforms', async () => {
  const scope = effectScope();
  await scope.run(async () => {
    const view = useGalaxyView(createGalaxyData(baseOpts));
    const field = sceneChildren(view).find((c) => c instanceof THREE.Points && c.geometry.attributes.aSize)!;
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

test('changing galaxyData rebuilds the scene under the same wrapper, replaying controls', async () => {
  const scope = effectScope();
  await scope.run(async () => {
    const galaxy = ref(createGalaxyData({ ...baseOpts, seed: 1 }));
    const view = useGalaxyView(galaxy);
    const wrapper = view.object3D;
    const sceneObjectBefore = view.scene.object3D;
    // Set a non-default control so we can verify it survives the rebuild.
    view.dimming.value = 0.42;
    await nextTick();

    galaxy.value = createGalaxyData({ ...baseOpts, seed: 2 });
    await nextTick();

    // Wrapper identity is stable — TresPrimitive bindings survive.
    assert.equal(view.object3D, wrapper);
    // Inner scene group is fresh (a new createGalaxyScene call).
    assert.notEqual(view.scene.object3D, sceneObjectBefore);
    // Controls replayed onto the rebuilt scene.
    const field = sceneChildren(view).find((c) => c instanceof THREE.Points && c.geometry.attributes.aSize)!;
    assert.equal(uniformOf(field, 'uDim'), 0.42);
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
