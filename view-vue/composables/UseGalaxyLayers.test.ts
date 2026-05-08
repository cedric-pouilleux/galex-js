import { test } from 'node:test';
import assert from 'node:assert/strict';
import { effectScope, ref } from 'vue';
import * as THREE from 'three';
import { createGalaxyData } from '../../core/GalaxyData.js';
import { createGalaxyScene } from '../../view/GalaxyScene.js';
import { useGalaxyLayers } from './UseGalaxyLayers.js';

/** FNV-1a over a typed array's bytes — same hash function as the cross-engine harness. */
function hashFloat32(arr: Float32Array): number {
  const view = new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
  let h = 0x811c9dc5;
  for (let i = 0; i < arr.length; i++) {
    const u32 = view.getUint32(i * 4, true);
    h = Math.imul(h ^ (u32 & 0xff), 0x01000193) >>> 0;
    h = Math.imul(h ^ ((u32 >>> 8) & 0xff), 0x01000193) >>> 0;
    h = Math.imul(h ^ ((u32 >>> 16) & 0xff), 0x01000193) >>> 0;
    h = Math.imul(h ^ ((u32 >>> 24) & 0xff), 0x01000193) >>> 0;
  }
  return h >>> 0;
}

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
// buffers for the same (seed, opts). If they diverged, a Vue client and a
// vanilla Three client looking at the same world would render different
// galaxies — defeating the whole determinism contract.
test('useGalaxyLayers buffers are byte-identical to createGalaxyScene buffers', () => {
  const data = createGalaxyData({ ...baseOpts, fillCenter: false });

  const layers = useGalaxyLayers(ref(data));
  const v = layers.value;

  // Build the vanilla counterpart in an effect scope so its onScopeDispose
  // hooks (none for createGalaxyScene, but future-proof) get cleaned up.
  const scope = effectScope();
  scope.run(() => {
    const scene = createGalaxyScene(data);

    const vanillaArmGlow    = scene.object3D.children.find((c) => c.name === 'armGlow') as THREE.Points;
    const vanillaGasStreaks = scene.object3D.children.find((c) => c.name === 'gasStreaks') as THREE.Points;
    const vanillaNebulae    = scene.object3D.children.find((c) => c.name === 'nebulae') as THREE.Points;
    const vanillaInnerRing  = scene.object3D.children.find((c) => c.name === 'innerRing') as THREE.Points;

    const vanillaArmGlowPos    = vanillaArmGlow.geometry.attributes.position.array    as Float32Array;
    const vanillaGasStreaksPos = vanillaGasStreaks.geometry.attributes.position.array as Float32Array;
    const vanillaNebulaePos    = vanillaNebulae.geometry.attributes.position.array    as Float32Array;
    const vanillaInnerRingPos  = vanillaInnerRing.geometry.attributes.position.array  as Float32Array;

    assert.equal(hashFloat32(v.armGlow.buffers.positions),    hashFloat32(vanillaArmGlowPos),    'armGlow positions diverge');
    assert.equal(hashFloat32(v.gasStreaks.buffers.positions), hashFloat32(vanillaGasStreaksPos), 'gasStreaks positions diverge');
    assert.equal(hashFloat32(v.nebulae.buffers.positions),    hashFloat32(vanillaNebulaePos),    'nebulae positions diverge');
    assert.equal(hashFloat32(v.innerRing.buffers.positions),  hashFloat32(vanillaInnerRingPos),  'innerRing positions diverge');

    // Star field: same source (the GalaxyData buffers) — pointer equality, not just hash.
    assert.equal(v.field.positions, data.data.positions);

    scene.dispose();
  });
  scope.stop();
});

test('useGalaxyLayers centerDust buffers are byte-identical to vanilla', () => {
  const data = createGalaxyData({ ...baseOpts, fillCenter: true });

  const layers = useGalaxyLayers(ref(data));
  const cdLayer = layers.value.centerDust;
  assert.ok(cdLayer);

  const scope = effectScope();
  scope.run(() => {
    const scene = createGalaxyScene(data);
    const vanillaCenter = scene.object3D.children.find((c) => c.name === 'centerDust');
    assert.ok(vanillaCenter);
    const vanillaDust = (vanillaCenter as THREE.Group).children.find(
      (c) => (c as THREE.Points).geometry?.attributes?.aTangent,
    ) as THREE.Points;
    const vanillaDustPos = vanillaDust.geometry.attributes.position.array as Float32Array;

    assert.equal(
      hashFloat32(cdLayer.dust.buffers.positions),
      hashFloat32(vanillaDustPos),
      'centerDust positions diverge',
    );

    scene.dispose();
  });
  scope.stop();
});
