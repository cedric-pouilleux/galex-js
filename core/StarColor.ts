import { detPow, detLog } from './DetMath.js';
import type { Rng } from './Random.js';

export type SpectralClass = 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M';

/**
 * Blackbody radiation → RGB approximation (Mitchell Charity, 2001).
 * Bit-stable across engines (uses det-math, not native Math.pow/log).
 */
export function blackbodyRGB(T: number): [number, number, number] {
  const t = T / 100;
  let r: number, g: number, b: number;

  if (t <= 66) r = 255;
  else r = 329.698727446 * detPow(t - 60, -0.1332047592);

  if (t <= 66) g = 99.4708025861 * detLog(t) - 161.1195681661;
  else g = 288.1221695283 * detPow(t - 60, -0.0755148492);

  if (t >= 66) b = 255;
  else if (t <= 19) b = 0;
  else b = 138.5177312231 * detLog(t - 10) - 305.0447927307;

  return [
    Math.max(0, Math.min(255, r)) / 255,
    Math.max(0, Math.min(255, g)) / 255,
    Math.max(0, Math.min(255, b)) / 255,
  ];
}

/** Morgan-Keenan spectral class label for a given temperature. */
export function spectralClass(T: number): SpectralClass {
  if (T >= 30000) return 'O';
  if (T >= 10000) return 'B';
  if (T >= 7500)  return 'A';
  if (T >= 6000)  return 'F';
  if (T >= 5200)  return 'G';
  if (T >= 3700)  return 'K';
  return 'M';
}

/**
 * Samples a star temperature from a class distribution biased by `armBias`.
 * `armBias = 0` skews to old populations (M/K dominant), `armBias = 1` to
 * young populations (more B/A/F/O). Bit-stable: only uses + - * < / on doubles.
 */
export function sampleTemperature(armBias = 0.5, rng: Rng = Math.random): number {
  const u = rng();
  const lerp = (a: number, b: number) => a + armBias * (b - a);

  const cumM = lerp(0.80, 0.42);
  const cumK = cumM + lerp(0.12, 0.16);
  const cumG = cumK + lerp(0.05, 0.14);
  const cumF = cumG + lerp(0.022, 0.13);
  const cumA = cumF + lerp(0.007, 0.10);
  const cumB = cumA + lerp(0.0009, 0.04);

  if (u < cumM) return 2400 + rng() * 1300;
  if (u < cumK) return 3700 + rng() * 1500;
  if (u < cumG) return 5200 + rng() * 800;
  if (u < cumF) return 6000 + rng() * 1500;
  if (u < cumA) return 7500 + rng() * 2500;
  if (u < cumB) return 10000 + rng() * 5000;
  return 15000 + rng() * 15000;
}
