import { resolveArmCadence, writeSpiralTangent } from './ArmCadence.js';
import type { ArmLayerOptions } from './ArmCadence.js';
import {
  ARM_GLOW_PALETTE, STRETCH_VERT, STRETCH_FRAG, createPointsMaterialDef,
} from './Shaders.js';
import type { ShaderMaterialDef } from './Shaders.js';

export type ArmGlowOptions = ArmLayerOptions & {
  particlesPerArm?: number;
};

/** Pure-data buffers for the arm-glow layer. */
export type ArmGlowBuffers = {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  tangents: Float32Array;
  stretches: Float32Array;
  visibility: Float32Array;
  count: number;
};

/**
 * Computes the per-particle buffers for the arm-glow layer: a tinted bloom
 * along each spiral arm. Each arm gets its own palette tint to break visual
 * uniformity, and per-particle fade peaks mid-arm so the glow trails off
 * naturally at both ends.
 */
export function buildArmGlowBuffers({
  radius,
  innerRadius = 5,
  arms = 6,
  spin = 0.9,
  armSpinJ = null,
  armPhaseJ = null,
  particlesPerArm = 220,
  rng = Math.random,
}: ArmGlowOptions): ArmGlowBuffers {
  const { spinJ, phaseJ } = resolveArmCadence(arms, rng, armSpinJ, armPhaseJ);

  const N = arms * particlesPerArm;
  const positions = new Float32Array(N * 3);
  const colors    = new Float32Array(N * 3);
  const sizes     = new Float32Array(N);
  const tangents  = new Float32Array(N * 2);
  const stretches = new Float32Array(N);

  const rMin = innerRadius + 2;
  const rMax = radius * 0.85;

  let n = 0;
  for (let a = 0; a < arms; a++) {
    const armAngle = (a / arms) * Math.PI * 2 + phaseJ[a];
    const tint = ARM_GLOW_PALETTE[a % ARM_GLOW_PALETTE.length];

    for (let p = 0; p < particlesPerArm; p++) {
      const t = p / (particlesPerArm - 1);
      const r = rMin + (rMax - rMin) * t;
      const spiral = (r / radius) * Math.PI * 2 * spin * spinJ[a];
      const angleNoise = (rng() - 0.5) * 0.04;
      const theta = armAngle + spiral + angleNoise;

      const cx = r * Math.cos(theta);
      const cz = r * Math.sin(theta);
      const nx = Math.cos(theta);
      const nz = Math.sin(theta);
      const offset = (rng() - 0.5) * 1.4;

      positions[n * 3 + 0] = cx + nx * offset;
      positions[n * 3 + 1] = (rng() - 0.5) * 0.5;
      positions[n * 3 + 2] = cz + nz * offset;

      writeSpiralTangent(tangents, n, a, r, theta, radius, spin, spinJ);
      stretches[n] = 0.85;

      const fade = Math.sin(t * Math.PI);
      const v = (0.55 + rng() * 0.35) * (0.4 + fade * 0.6);
      colors[n * 3 + 0] = tint[0] * v;
      colors[n * 3 + 1] = tint[1] * v;
      colors[n * 3 + 2] = tint[2] * v;

      sizes[n] = (3.5 + rng() * 4.0) * (0.55 + fade * 0.55);
      n++;
    }
  }

  const visibility = new Float32Array(N);
  visibility.fill(1);

  return { positions, colors, sizes, tangents, stretches, visibility, count: N };
}

/** Material def for the arm-glow layer (same stretched-sprite shader as the streaks). */
export function createArmGlowMaterialDef(): ShaderMaterialDef {
  return createPointsMaterialDef(STRETCH_VERT, STRETCH_FRAG);
}
