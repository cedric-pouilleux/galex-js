import * as THREE from 'three';
import { resolveArmCadence } from './ArmCadence.js';
import type { ArmLayerOptions } from './ArmCadence.js';
import {
  STREAK_PALETTE, HAZE_PALETTE, STRETCH_VERT, STRETCH_FRAG, createPointsMaterialDef,
} from './Shaders.js';
import type { ShaderMaterialDef } from './Shaders.js';

export type GasStreaksOptions = ArmLayerOptions & {
  streaks?: number;
  hazeClouds?: number;
};

/** Pure-data buffers for the gas streaks layer. */
export type GasStreaksBuffers = {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  tangents: Float32Array;
  stretches: Float32Array;
  visibility: Float32Array;
  count: number;
};

const BLOBS_PER_STREAK = 18;
const BLOBS_PER_HAZE   = 6;

/**
 * Computes the per-particle buffers for the gas streaks layer: stretched wisps
 * along the spiral arms + diffuse haze clouds scattered around. Long trails
 * (16-32 units) coexist with shorter wisps (5-15) so the gas reads as broken
 * and organic rather than uniform dashes.
 */
export function buildGasStreaksBuffers({
  radius,
  innerRadius = 5,
  arms = 4,
  spin = 0.9,
  armSpinJ = null,
  armPhaseJ = null,
  streaks = 220,
  hazeClouds = 80,
  rng = Math.random,
}: GasStreaksOptions): GasStreaksBuffers {
  const { spinJ, phaseJ } = resolveArmCadence(arms, rng, armSpinJ, armPhaseJ);

  const N = streaks * BLOBS_PER_STREAK + hazeClouds * BLOBS_PER_HAZE;

  const positions = new Float32Array(N * 3);
  const colors    = new Float32Array(N * 3);
  const sizes     = new Float32Array(N);
  const tangents  = new Float32Array(N * 2);
  const stretches = new Float32Array(N);
  let n = 0;

  for (let s = 0; s < streaks; s++) {
    const arm = Math.floor(rng() * arms);
    const armAngle = (arm / arms) * Math.PI * 2 + phaseJ[arm];
    const isLong = rng() < 0.45;
    const dr = isLong
      ? 16 + rng() * 16   // long trails: 16-32
      : 5  + rng() * 10;  // wisps: 5-15
    const r0Min = innerRadius + 4;
    const endMax = radius * 0.86;
    const r0 = r0Min + rng() * Math.max(2, endMax - r0Min - dr);
    const offsetAcross = (rng() - 0.5) * 5.5;

    const ci = Math.floor(rng() * STREAK_PALETTE.length);
    const colorA = STREAK_PALETTE[ci];
    const colorB = STREAK_PALETTE[(ci + 1 + Math.floor(rng() * (STREAK_PALETTE.length - 1))) % STREAK_PALETTE.length];

    const dThetaDr = (Math.PI * 2 * spin * spinJ[arm]) / radius;

    for (let b = 0; b < BLOBS_PER_STREAK; b++) {
      const t = b / (BLOBS_PER_STREAK - 1);
      const r = r0 + dr * t;
      const spiral = (r / radius) * Math.PI * 2 * spin * spinJ[arm];
      const theta = armAngle + spiral;

      const cx = r * Math.cos(theta);
      const cz = r * Math.sin(theta);
      const nx = Math.cos(theta);
      const nz = Math.sin(theta);
      const tx = -Math.sin(theta);
      const tz =  Math.cos(theta);

      const px = cx + nx * offsetAcross;
      const pz = cz + nz * offsetAcross;
      const ja = (rng() - 0.5) * 0.7;
      const jc = (rng() - 0.5) * 0.9;

      positions[n * 3 + 0] = px + tx * ja + nx * jc;
      positions[n * 3 + 1] = (rng() - 0.5) * 0.7;
      positions[n * 3 + 2] = pz + tz * ja + nz * jc;

      // Local spiral tangent in XZ plane (parameterized by r)
      const dposX = Math.cos(theta) - r * Math.sin(theta) * dThetaDr;
      const dposZ = Math.sin(theta) + r * Math.cos(theta) * dThetaDr;
      const dposLen = Math.hypot(dposX, dposZ) || 1;
      tangents[n * 2 + 0] = dposX / dposLen;
      tangents[n * 2 + 1] = dposZ / dposLen;
      stretches[n] = isLong ? 1.0 : 0.75;

      const v = 0.55 + rng() * 0.4;
      colors[n * 3 + 0] = (colorA[0] * (1 - t) + colorB[0] * t) * v;
      colors[n * 3 + 1] = (colorA[1] * (1 - t) + colorB[1] * t) * v;
      colors[n * 3 + 2] = (colorA[2] * (1 - t) + colorB[2] * t) * v;

      const wisp = Math.sin(t * Math.PI);
      sizes[n] = (1.8 + wisp * 4.5) * (0.8 + rng() * 0.45);
      n++;
    }
  }

  for (let h = 0; h < hazeClouds; h++) {
    const r = innerRadius + 5 + rng() * (radius * 0.85 - innerRadius - 5);
    const theta = rng() * Math.PI * 2;
    const cx = r * Math.cos(theta);
    const cz = r * Math.sin(theta);

    const baseColor = HAZE_PALETTE[Math.floor(rng() * HAZE_PALETTE.length)];
    const cloudScale = 1.0 + rng() * 1.6;

    for (let b = 0; b < BLOBS_PER_HAZE; b++) {
      const dx = (rng() - 0.5) * 8 * cloudScale;
      const dz = (rng() - 0.5) * 8 * cloudScale;
      const dy = (rng() - 0.5) * 0.8;

      positions[n * 3 + 0] = cx + dx;
      positions[n * 3 + 1] = dy;
      positions[n * 3 + 2] = cz + dz;

      tangents[n * 2 + 0] = 1;
      tangents[n * 2 + 1] = 0;
      stretches[n] = 0; // haze stays round

      const v = 0.4 + rng() * 0.4;
      colors[n * 3 + 0] = baseColor[0] * v;
      colors[n * 3 + 1] = baseColor[1] * v;
      colors[n * 3 + 2] = baseColor[2] * v;

      sizes[n] = (4 + rng() * 6) * cloudScale;
      n++;
    }
  }

  const visibility = new Float32Array(N);
  visibility.fill(1);

  return { positions, colors, sizes, tangents, stretches, visibility, count: N };
}

/** Material def for the stretched gas-streak particles. */
export function createGasStreaksMaterialDef(): ShaderMaterialDef {
  return createPointsMaterialDef(STRETCH_VERT, STRETCH_FRAG);
}

/**
 * Builds a `THREE.Points` for the gas streaks layer. TresJS callers consume
 * `buildGasStreaksBuffers` and `createGasStreaksMaterialDef` directly.
 */
export function createGasStreaks(opts: GasStreaksOptions): THREE.Points {
  const buffers = buildGasStreaksBuffers(opts);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position',    new THREE.BufferAttribute(buffers.positions, 3));
  geo.setAttribute('aColor',      new THREE.BufferAttribute(buffers.colors,    3));
  geo.setAttribute('aSize',       new THREE.BufferAttribute(buffers.sizes,     1));
  geo.setAttribute('aTangent',    new THREE.BufferAttribute(buffers.tangents,  2));
  geo.setAttribute('aStretch',    new THREE.BufferAttribute(buffers.stretches, 1));
  geo.setAttribute('aVisibility', new THREE.BufferAttribute(buffers.visibility, 1));

  const points = new THREE.Points(geo, new THREE.ShaderMaterial(createGasStreaksMaterialDef()));
  points.frustumCulled = false;
  points.name = 'gasStreaks';
  return points;
}
