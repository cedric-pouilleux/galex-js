/** Cube coordinate on a flat grid (j is optional, ignored when omitted). */
export type CubeCoord = {
  i: number;
  k: number;
  j?: number;
};

export type VisibilityFieldConfig = {
  /** Non-empty list of focal cubes. */
  focals: CubeCoord[];
  /** Radius in cube units. */
  range: number;
  /** Opacity on the faded rim (range-1 < d ≤ range). */
  fadedOpacity?: number;
};

/** Subset of a CubeGrid used for projecting world XZ to cube indices. */
export type GridProjection = {
  cubeSize: number;
  originX: number;
  originZ: number;
};

/**
 * Computes per-particle visibility values for a multi-focal visibility field.
 *
 * For each particle, finds the closest focal cube (squared Euclidean distance
 * on the i/k plane) and assigns:
 *   - 1.0 if d² ≤ (range-1)² (inner core)
 *   - fadedOpacity if (range-1)² < d² ≤ range² (rim)
 *   - 0.0 otherwise (hidden)
 *
 * Pure: only depends on its arguments. Bit-stable: only uses + - * < / floor.
 */
export function computeVisibilityField(
  positions: Float32Array,
  grid: GridProjection,
  focals: CubeCoord[],
  range: number,
  fadedOpacity = 0.2,
  out?: Float32Array,
): Float32Array {
  const particleCount = positions.length / 3;
  const result = out ?? new Float32Array(particleCount);
  const inner = range - 1 > 0 ? range - 1 : 0;
  const innerSq = inner * inner;
  const rangeSq = range * range;
  const cs = grid.cubeSize;
  const ox = grid.originX;
  const oz = grid.originZ;
  const focalCount = focals.length;

  for (let n = 0; n < particleCount; n++) {
    const x = positions[n * 3 + 0];
    const z = positions[n * 3 + 2];
    const i = Math.floor((x - ox) / cs);
    const k = Math.floor((z - oz) / cs);
    let minD2 = Infinity;
    for (let f = 0; f < focalCount; f++) {
      const di = i - focals[f].i;
      const dk = k - focals[f].k;
      const d2 = di * di + dk * dk;
      if (d2 < minD2) minD2 = d2;
    }
    if (minD2 <= innerSq) result[n] = 1.0;
    else if (minD2 <= rangeSq) result[n] = fadedOpacity;
    else result[n] = 0.0;
  }
  return result;
}

/**
 * Cube tier under a visibility field (lowest tier wins across overlapping focals).
 * Returns a Map keyed by `${i}|${j}|${k}` whose value is 0 (inner) or 1 (rim).
 * Cubes outside any focal's range are absent from the map.
 */
export function tierMapForVisibilityField(
  focals: CubeCoord[],
  range: number,
  cubeExists: (i: number, j: number, k: number) => boolean,
): Map<string, 0 | 1> {
  const inner = range - 1 > 0 ? range - 1 : 0;
  const innerSq = inner * inner;
  const rangeSq = range * range;
  const tiers = new Map<string, 0 | 1>();
  for (const focal of focals) {
    const j = focal.j ?? 0;
    for (let di = -range; di <= range; di++) {
      for (let dk = -range; dk <= range; dk++) {
        const d2 = di * di + dk * dk;
        if (d2 > rangeSq) continue;
        const i = focal.i + di;
        const k = focal.k + dk;
        if (!cubeExists(i, j, k)) continue;
        const tier: 0 | 1 = d2 <= innerSq ? 0 : 1;
        const key = `${i}|${j}|${k}`;
        const existing = tiers.get(key);
        if (existing === undefined || tier < existing) {
          tiers.set(key, tier);
        }
      }
    }
  }
  return tiers;
}
