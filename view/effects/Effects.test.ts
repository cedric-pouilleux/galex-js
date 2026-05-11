import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from '../../core/Random.js';
import { buildNebulaeBuffers } from './Nebulae.js';
import { buildCenterDustBuffers } from './CenterDust.js';
import { buildInnerRingBuffers } from './InnerRing.js';
import { buildGasStreaksBuffers } from './GasStreaks.js';
import { buildArmGlowBuffers } from './ArmGlow.js';
import { resolveArmCadence } from './ArmCadence.js';

const seedRng = () => mulberry32(0xdeadbeef);

test('buildNebulaeBuffers produces clusters × blobsPerCluster particles', () => {
  const buffers = buildNebulaeBuffers({ radius: 50, clusters: 8, blobsPerCluster: 5, rng: seedRng() });
  assert.equal(buffers.count, 40);
  assert.equal(buffers.positions.length, 40 * 3);
});

test('buildCenterDustBuffers honours dustParticles count', () => {
  const buffers = buildCenterDustBuffers({ radius: 50, innerRadius: 5, dustParticles: 100, rng: seedRng() });
  assert.equal(buffers.count, 100);
  assert.equal(buffers.positions.length, 100 * 3);
});

test('buildInnerRingBuffers scales particle count with density', () => {
  const sparse = buildInnerRingBuffers({ radius: 50, innerRadius: 5, density: 0.5, rng: seedRng() });
  const dense  = buildInnerRingBuffers({ radius: 50, innerRadius: 5, density: 2.0, rng: seedRng() });
  assert.equal(sparse.count, 450);
  assert.equal(dense.count, 1800);
});

test('buildGasStreaksBuffers particle count is streaks*18 + hazeClouds*6', () => {
  const buffers = buildGasStreaksBuffers({
    radius: 50, streaks: 10, hazeClouds: 5, rng: seedRng(),
  });
  assert.equal(buffers.count, 10 * 18 + 5 * 6);
});

test('buildArmGlowBuffers particle count is arms × particlesPerArm', () => {
  const buffers = buildArmGlowBuffers({
    radius: 50, arms: 5, particlesPerArm: 50, rng: seedRng(),
  });
  assert.equal(buffers.count, 250);
});

test('every gas/arm builder exposes a visibility buffer initialised to 1', () => {
  const layers = [
    buildNebulaeBuffers({ radius: 50, clusters: 4, rng: seedRng() }),
    buildGasStreaksBuffers({ radius: 50, streaks: 4, hazeClouds: 2, rng: seedRng() }),
    buildArmGlowBuffers({ radius: 50, arms: 4, particlesPerArm: 10, rng: seedRng() }),
    buildInnerRingBuffers({ radius: 50, innerRadius: 5, density: 0.1, rng: seedRng() }),
  ];
  for (const buffers of layers) {
    assert.equal(buffers.visibility.length, buffers.count);
    assert.equal(buffers.visibility[0], 1);
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
