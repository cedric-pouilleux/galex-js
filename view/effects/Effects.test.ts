import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { mulberry32 } from '../../core/Random.js';
import { createNebulae } from './Nebulae.js';
import { createHalo } from './Halo.js';
import { createCenterDust } from './CenterDust.js';
import { createInnerRing } from './InnerRing.js';
import { createGasStreaks } from './GasStreaks.js';
import { createArmGlow } from './ArmGlow.js';
import { resolveArmCadence } from './ArmCadence.js';

const seedRng = () => mulberry32(0xdeadbeef);

test('createNebulae produces clusters × blobsPerCluster particles', () => {
  const points = createNebulae({ radius: 50, clusters: 8, blobsPerCluster: 5, rng: seedRng() });
  assert.equal(points.name, 'nebulae');
  assert.equal(points.geometry.attributes.position.count, 40);
  assert.equal(points.frustumCulled, false);
});

test('createHalo returns a flat circle mesh on the XZ plane', () => {
  const halo = createHalo({ radius: 50 });
  assert.equal(halo.name, 'halo');
  assert.ok(halo.geometry instanceof THREE.CircleGeometry);
  // Rotated -π/2 on X to lie horizontally.
  assert.ok(Math.abs(halo.rotation.x + Math.PI / 2) < 1e-9);
});

test('createCenterDust returns a wrapper with object3D + disc/dust materials exposed', () => {
  const cd = createCenterDust({ radius: 50, innerRadius: 5, dustParticles: 100, rng: seedRng() });
  assert.equal(cd.object3D.name, 'centerDust');
  // Disc + dust = 2 children.
  assert.equal(cd.object3D.children.length, 2);
  // Materials are surfaced for the host (PlanView etc.) — keep this contract.
  assert.ok(cd.discMaterial);
  assert.ok(cd.dustMaterial);
});

test('createInnerRing scales particle count with density', () => {
  const sparse = createInnerRing({ radius: 50, innerRadius: 5, density: 0.5, rng: seedRng() });
  const dense  = createInnerRing({ radius: 50, innerRadius: 5, density: 2.0, rng: seedRng() });
  assert.equal(sparse.geometry.attributes.position.count, 450);
  assert.equal(dense.geometry.attributes.position.count, 1800);
});

test('createGasStreaks particle count is streaks*18 + hazeClouds*6', () => {
  const points = createGasStreaks({
    radius: 50, streaks: 10, hazeClouds: 5, rng: seedRng(),
  });
  assert.equal(points.name, 'gasStreaks');
  assert.equal(points.geometry.attributes.position.count, 10 * 18 + 5 * 6);
});

test('createArmGlow particle count is arms × particlesPerArm', () => {
  const points = createArmGlow({
    radius: 50, arms: 5, particlesPerArm: 50, rng: seedRng(),
  });
  assert.equal(points.name, 'armGlow');
  assert.equal(points.geometry.attributes.position.count, 250);
});

test('every gas/arm factory exposes the standard attribute set required by the shaders', () => {
  const factories = [
    createNebulae({ radius: 50, clusters: 4, rng: seedRng() }),
    createGasStreaks({ radius: 50, streaks: 4, hazeClouds: 2, rng: seedRng() }),
    createArmGlow({ radius: 50, arms: 4, particlesPerArm: 10, rng: seedRng() }),
    createInnerRing({ radius: 50, innerRadius: 5, density: 0.1, rng: seedRng() }),
  ];
  for (const points of factories) {
    const attrs = points.geometry.attributes;
    assert.ok(attrs.position, `${points.name}: position`);
    assert.ok(attrs.aColor,   `${points.name}: aColor`);
    assert.ok(attrs.aSize,    `${points.name}: aSize`);
    assert.ok(attrs.aVisibility, `${points.name}: aVisibility`);
  }
});

test('resolveArmCadence reuses caller-supplied arrays when both are provided', () => {
  const spinJ = [1.0, 1.0];
  const phaseJ = [0.0, 0.0];
  const out = resolveArmCadence(2, () => 0.5, spinJ, phaseJ);
  assert.equal(out.spinJ, spinJ);
  assert.equal(out.phaseJ, phaseJ);
});

test('resolveArmCadence generates fresh arrays when either is missing', () => {
  const out = resolveArmCadence(3, mulberry32(1), null, null);
  assert.equal(out.spinJ.length, 3);
  assert.equal(out.phaseJ.length, 3);
  // Spin samples must lie in the documented range [0.92, 1.08).
  for (const s of out.spinJ) assert.ok(s >= 0.92 && s < 1.08, `spin out of range: ${s}`);
});
