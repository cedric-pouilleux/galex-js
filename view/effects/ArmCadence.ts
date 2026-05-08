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
