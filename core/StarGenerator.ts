import { blackbodyRGB, sampleTemperature } from './StarColor.js';
import { detSin, detCos, detPow } from './DetMath.js';
import type { Rng } from './Random.js';

export type GenerateGalaxyOptions = {
  count?: number;
  radius?: number;
  innerRadius?: number;
  thickness?: number;
  arms?: number;
  spin?: number;
  spread?: number;
  fieldRatio?: number;
  armReach?: number;
  fieldReach?: number;
  minDistance?: number;
  maxAttemptsPerStar?: number;
  fillCenter?: boolean;
  armSpinJ?: number[] | null;
  armPhaseJ?: number[] | null;
  rng?: Rng;
};

export type GalaxyBuffers = {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  temps: Float32Array;
  count: number;
};

/**
 * Procedurally generates a deterministic spiral galaxy. The output buffers are
 * byte-identical for a given (seed, opts) tuple across any ES2017+ JS engine
 * (uses det-math; no Math.sin/cos/pow/log/exp).
 *
 * Caller must supply a seeded `rng` for cross-engine determinism; the default
 * Math.random is for one-off dev usage only.
 */
export function generateGalaxy({
  count = 15000,
  radius = 50,
  innerRadius = 4,
  thickness = 0,
  arms = 4,
  spin = 0.9,
  spread = 0.95,
  fieldRatio = 0.30,
  armReach = 0.82,
  fieldReach = 0.90,
  minDistance = 0.25,
  maxAttemptsPerStar = 32,
  fillCenter = false,
  armSpinJ = null,
  armPhaseJ = null,
  rng = Math.random,
}: GenerateGalaxyOptions = {}): GalaxyBuffers {
  const positions = new Float32Array(count * 3);
  const colors    = new Float32Array(count * 3);
  const sizes     = new Float32Array(count);
  const temps     = new Float32Array(count);

  let spinJ: number[] = armSpinJ ?? [];
  let phaseJ: number[] = armPhaseJ ?? [];
  if (!armSpinJ || !armPhaseJ) {
    spinJ = new Array(arms);
    phaseJ = new Array(arms);
    for (let a = 0; a < arms; a++) {
      spinJ[a]  = 0.92 + rng() * 0.16;
      phaseJ[a] = (rng() - 0.5) * 0.22;
    }
  }

  const minDistSq = minDistance * minDistance;
  const cellSize = Math.max(minDistance, 1e-6);
  const hash = new Map<string, number[]>();
  const cellKey = (ci: number, cj: number, ck: number) => `${ci}|${cj}|${ck}`;

  function tooClose(x: number, y: number, z: number): boolean {
    const ci = Math.floor(x / cellSize);
    const cj = Math.floor(y / cellSize);
    const ck = Math.floor(z / cellSize);
    for (let di = -1; di <= 1; di++) {
      for (let dj = -1; dj <= 1; dj++) {
        for (let dk = -1; dk <= 1; dk++) {
          const arr = hash.get(cellKey(ci + di, cj + dj, ck + dk));
          if (!arr) continue;
          for (let p = 0; p < arr.length; p += 3) {
            const dx = x - arr[p];
            const dy = y - arr[p + 1];
            const dz = z - arr[p + 2];
            if (dx * dx + dy * dy + dz * dz < minDistSq) return true;
          }
        }
      }
    }
    return false;
  }

  function addToHash(x: number, y: number, z: number): void {
    const ci = Math.floor(x / cellSize);
    const cj = Math.floor(y / cellSize);
    const ck = Math.floor(z / cellSize);
    const key = cellKey(ci, cj, ck);
    let arr = hash.get(key);
    if (!arr) { arr = []; hash.set(key, arr); }
    arr.push(x, y, z);
  }

  let placed = 0;
  let attempts = 0;

  const armRMax   = radius * armReach;
  const fieldRMax = radius * fieldReach;
  // fillCenter pulls rMin to 0 so arms/field reach the exact center.
  const rMin = fillCenter ? 0 : innerRadius;

  while (placed < count) {
    const u = rng();
    let r: number, theta: number;
    let isField = false;

    if (u < fieldRatio) {
      isField = true;
      r = rMin + (fieldRMax - rMin) * detPow(rng(), 0.65);
      theta = rng() * Math.PI * 2;
    } else {
      const arm = Math.floor(rng() * arms);
      r = rMin + (armRMax - rMin) * detPow(rng(), 0.7);
      const armAngle = (arm / arms) * Math.PI * 2 + phaseJ[arm];
      const spiral = (r / radius) * Math.PI * 2 * spin * spinJ[arm];
      const noise = ((rng() - 0.5) + (rng() - 0.5))
                    * spread * (0.45 + 0.75 * (r / radius));
      theta = armAngle + spiral + noise;
    }

    const x = r * detCos(theta);
    const z = r * detSin(theta);
    const y = thickness > 0 ? (rng() - 0.5) * thickness : 0;

    if (!fillCenter && Math.sqrt(x * x + z * z) < innerRadius) continue;

    if (attempts < maxAttemptsPerStar && tooClose(x, y, z)) {
      attempts++;
      continue;
    }

    positions[placed * 3 + 0] = x;
    positions[placed * 3 + 1] = y;
    positions[placed * 3 + 2] = z;
    addToHash(x, y, z);

    // Field stars: older population (more red dwarfs).
    // Arm stars: younger, more hot/blue stars.
    const armBias = isField ? 0.20 : 0.85;
    const T = sampleTemperature(armBias, rng);
    const rgb = blackbodyRGB(T);
    const lum = detPow(T / 5778, 0.4) * (0.85 + rng() * 0.25);

    colors[placed * 3 + 0] = rgb[0] * lum;
    colors[placed * 3 + 1] = rgb[1] * lum;
    colors[placed * 3 + 2] = rgb[2] * lum;
    temps[placed] = T;

    const baseSize = isField ? 0.85 : 1.05;
    const sizeFromTemp = detPow(T / 5778, 0.22);
    sizes[placed] = baseSize * sizeFromTemp * (0.85 + rng() * 0.5);

    placed++;
    attempts = 0;
  }

  return { positions, colors, sizes, temps, count };
}
