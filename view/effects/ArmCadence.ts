import type { Rng } from '../../core/Random.js';

/** Common parameters shared by every arm-spiral particle factory. */
export type ArmLayerOptions = {
  /** Outer disk radius. */
  radius: number;
  /** Empty core radius. */
  innerRadius?: number;
  /** Arm count. */
  arms?: number;
  /** Spiral tightness factor. */
  spin?: number;
  /** Per-arm spin multiplier (length === arms). */
  armSpinJ?: number[] | null;
  /** Per-arm phase offset (length === arms). */
  armPhaseJ?: number[] | null;
  /** Uniform [0, 1) source. */
  rng?: Rng;
};

/**
 * Resolves per-arm spin/phase parameters: keeps the caller's if both provided,
 * otherwise generates fresh ones from the supplied rng. The "both or neither"
 * gate lets `GalaxyScene` share its arm cadence across every visual layer so
 * the spirals stay aligned, while a standalone caller can rely on defaults.
 */
export function resolveArmCadence(
  arms: number,
  rng: Rng,
  armSpinJ: number[] | null | undefined,
  armPhaseJ: number[] | null | undefined,
): { spinJ: number[]; phaseJ: number[] } {
  if (armSpinJ && armPhaseJ) return { spinJ: armSpinJ, phaseJ: armPhaseJ };
  const spinJ = new Array<number>(arms);
  const phaseJ = new Array<number>(arms);
  for (let a = 0; a < arms; a++) {
    spinJ[a]  = 0.92 + rng() * 0.16;
    phaseJ[a] = (rng() - 0.5) * 0.22;
  }
  return { spinJ, phaseJ };
}

/**
 * Writes the unit-length spiral tangent (XZ plane) for a particle at radius `r`
 * and angle `theta` on arm `arm` into `tangents[2n]` and `tangents[2n+1]`.
 *
 * Uses the analytic derivative of `(r*cos(armAngle + r/radius * 2π * spin * spinJ[a]), r*sin(...))`
 * with respect to `r`, normalised to unit length so the GLSL `STRETCH_VERT`
 * shader can rotate the sprite UV directly.
 */
export function writeSpiralTangent(
  tangents: Float32Array,
  n: number,
  arm: number,
  r: number,
  theta: number,
  radius: number,
  spin: number,
  spinJ: number[],
): void {
  const dThetaDr = (Math.PI * 2 * spin * spinJ[arm]) / radius;
  const dposX = Math.cos(theta) - r * Math.sin(theta) * dThetaDr;
  const dposZ = Math.sin(theta) + r * Math.cos(theta) * dThetaDr;
  const dposLen = Math.hypot(dposX, dposZ) || 1;
  tangents[n * 2 + 0] = dposX / dposLen;
  tangents[n * 2 + 1] = dposZ / dposLen;
}
