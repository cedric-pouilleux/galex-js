import { resolveArmCadence, writeSpiralTangent } from './ArmCadence.js';
import type { ArmLayerOptions } from './ArmCadence.js';
import { STRETCH_VERT, STRETCH_FRAG, createPointsMaterialDef } from './Shaders.js';
import type { ShaderMaterialDef } from './Shaders.js';

export type InnerRingOptions = ArmLayerOptions & {
  density?: number;
};

/** Pure-data buffers for the inner-ring layer. */
export type InnerRingBuffers = {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  tangents: Float32Array;
  stretches: Float32Array;
  visibility: Float32Array;
  count: number;
};

const SEPIA_PALETTE: readonly [number, number, number][] = [
  [0.95, 0.74, 0.50],
  [0.86, 0.62, 0.42],
  [0.92, 0.78, 0.58],
  [0.78, 0.55, 0.42],
];

/**
 * Computes the per-particle buffers for the inner-ring layer — the transition
 * zone between the central bulge and the spiral arms. Mixes diffuse round dust
 * and lightly coiled streaks following the spiral pattern (lenticular look).
 */
export function buildInnerRingBuffers({
  innerRadius = 5,
  radius = 50,
  arms = 6,
  spin = 0.9,
  armSpinJ = null,
  armPhaseJ = null,
  density = 1.0,
  rng = Math.random,
}: InnerRingOptions): InnerRingBuffers {
  const { spinJ, phaseJ } = resolveArmCadence(arms, rng, armSpinJ, armPhaseJ);

  const rMin = innerRadius * 1.05;
  const rMax = innerRadius * 2.6;
  const N = Math.max(0, Math.round(900 * density));

  const positions = new Float32Array(N * 3);
  const colors    = new Float32Array(N * 3);
  const sizes     = new Float32Array(N);
  const tangents  = new Float32Array(N * 2);
  const stretches = new Float32Array(N);

  for (let n = 0; n < N; n++) {
    const t = Math.pow(rng(), 0.55);
    const r = rMin + (rMax - rMin) * t;
    // Light spiral bias echoing the arms without redrawing them.
    const arm = Math.floor(rng() * arms);
    const armAngle = (arm / arms) * Math.PI * 2 + phaseJ[arm];
    const spiral = (r / radius) * Math.PI * 2 * spin * spinJ[arm];
    const wide = (rng() - 0.5) * Math.PI * 2 * 0.85; // diffuse, not bound to the arm
    const theta = armAngle + spiral + wide;

    const cx = r * Math.cos(theta);
    const cz = r * Math.sin(theta);
    positions[n * 3 + 0] = cx;
    positions[n * 3 + 1] = (rng() - 0.5) * 0.5;
    positions[n * 3 + 2] = cz;

    writeSpiralTangent(tangents, n, arm, r, theta, radius, spin, spinJ);
    // 60% round granules, 40% stretched trails that wrap around the bulge.
    stretches[n] = rng() < 0.4 ? 0.6 + rng() * 0.3 : 0;

    const c = SEPIA_PALETTE[Math.floor(rng() * SEPIA_PALETTE.length)];
    const v = 0.55 + rng() * 0.45;
    colors[n * 3 + 0] = c[0] * v;
    colors[n * 3 + 1] = c[1] * v;
    colors[n * 3 + 2] = c[2] * v;

    sizes[n] = 2.0 + rng() * 4.0;
  }

  const visibility = new Float32Array(N);
  visibility.fill(1);

  return { positions, colors, sizes, tangents, stretches, visibility, count: N };
}

/** Material def for the inner-ring layer (stretched sprite shader). */
export function createInnerRingMaterialDef(): ShaderMaterialDef {
  return createPointsMaterialDef(STRETCH_VERT, STRETCH_FRAG);
}
