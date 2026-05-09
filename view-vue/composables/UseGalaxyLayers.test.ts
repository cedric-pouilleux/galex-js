import { test } from 'node:test';
import assert from 'node:assert/strict';
import { effectScope, ref } from 'vue';
import * as THREE from 'three';
import { createGalaxyData } from '../../core/GalaxyData.js';
import { createGalaxyScene } from '../../view/GalaxyScene.js';
import { useGalaxyLayers } from './UseGalaxyLayers.js';
import { hashFloat32 } from '../../tools/HashFloat32.js';

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
};

test('useGalaxyLayers exposes every layer with buffers + materialDef', () => {
  const data = createGalaxyData({ ...baseOpts, fillCenter: false });
  const layers = useGalaxyLayers(ref(data));
  const v = layers.value;

  // Star field — buffers come straight from GalaxyData, plus a fresh visibility array.
  assert.equal(v.field.positions, data.data.positions);
  assert.equal(v.field.visibility.length, data.data.count);
  assert.ok(v.field.materialDef.vertexShader.length > 0);

  assert.ok(v.halo.geometry);
  assert.ok(v.armGlow.buffers.count > 0);
  assert.ok(v.gasStreaks.buffers.count > 0);
  assert.ok(v.nebulae.buffers.count > 0);
  assert.ok(v.innerRing.buffers.count > 0);
});

test('useGalaxyLayers omits centerDust when fillCenter is false', () => {
  const data = createGalaxyData({ ...baseOpts, fillCenter: false });
  const layers = useGalaxyLayers(ref(data));
  assert.equal(layers.value.centerDust, null);
});

test('useGalaxyLayers builds centerDust (disc + dust) when fillCenter is true', () => {
  const data = createGalaxyData({ ...baseOpts, fillCenter: true });
  const layers = useGalaxyLayers(ref(data));
  const cd = layers.value.centerDust;
  assert.ok(cd);
  assert.ok(cd.disc.geometry);
  assert.ok(cd.dust.buffers.count > 0);
});

test('useGalaxyLayers reacts to galaxyData changes (recomputes layers)', () => {
  const a = createGalaxyData({ ...baseOpts, seed: 1, fillCenter: false });
  const b = createGalaxyData({ ...baseOpts, seed: 2, fillCenter: false });
  const data = ref(a);
  const layers = useGalaxyLayers(data);
  const armGlowA = layers.value.armGlow.buffers.positions[0];

  data.value = b;
  const armGlowB = layers.value.armGlow.buffers.positions[0];
  // Different seeds → different per-arm cadence → different first-particle x.
  assert.notEqual(armGlowA, armGlowB);
});

test('useGalaxyLayers scales gas counts with gasDensity', () => {
  const data = createGalaxyData({ ...baseOpts, fillCenter: false });
  const sparse = useGalaxyLayers(ref(data), { gasDensity: 0.5 });
  const dense  = useGalaxyLayers(ref(data), { gasDensity: 2.0 });
  // GasStreaks count scales linearly with gasDensity (up to rounding).
  assert.ok(dense.value.gasStreaks.buffers.count > sparse.value.gasStreaks.buffers.count);
});

// Cross-target determinism: the declarative Vue path (useGalaxyLayers) and the
// imperative vanilla path (createGalaxyScene) must produce byte-identical
// buffers for the same (seed, opts) — both with and without the center bulge.
// If they diverged, a Vue client and a vanilla Three client looking at the
// same world would render different galaxies, defeating the determinism
// contract.
for (const fillCenter of [false, true]) {
  test(`useGalaxyLayers buffers match createGalaxyScene (fillCenter=${fillCenter})`, () => {
    const data = createGalaxyData({ ...baseOpts, fillCenter });
    const v = useGalaxyLayers(ref(data)).value;

    const scope = effectScope();
    scope.run(() => {
      const scene = createGalaxyScene(data);
      const findByName = (name: string) =>
        scene.object3D.children.find((c) => c.name === name) as THREE.Points;
      const positionsOf = (name: string) =>
        findByName(name).geometry.attributes.position.array as Float32Array;

      assert.equal(hashFloat32(v.armGlow.buffers.positions),    hashFloat32(positionsOf('armGlow')),    'armGlow positions diverge');
      assert.equal(hashFloat32(v.gasStreaks.buffers.positions), hashFloat32(positionsOf('gasStreaks')), 'gasStreaks positions diverge');
      assert.equal(hashFloat32(v.nebulae.buffers.positions),    hashFloat32(positionsOf('nebulae')),    'nebulae positions diverge');
      assert.equal(hashFloat32(v.innerRing.buffers.positions),  hashFloat32(positionsOf('innerRing')),  'innerRing positions diverge');
      // Star field: same source (the GalaxyData buffers) — pointer equality, not just hash.
      assert.equal(v.field.positions, data.data.positions);

      if (fillCenter) {
        const cdLayer = v.centerDust!;
        const vanillaCenter = scene.object3D.children.find((c) => c.name === 'centerDust') as THREE.Group;
        const vanillaDust = vanillaCenter.children.find(
          (c) => (c as THREE.Points).geometry?.attributes?.aTangent,
        ) as THREE.Points;
        const vanillaDustPos = vanillaDust.geometry.attributes.position.array as Float32Array;
        assert.equal(
          hashFloat32(cdLayer.dust.buffers.positions),
          hashFloat32(vanillaDustPos),
          'centerDust positions diverge',
        );
      }

      scene.dispose();
    });
    scope.stop();
  });
}
