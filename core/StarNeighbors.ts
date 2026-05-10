import type { GalaxyData } from './GalaxyData.js';

/** Neighbor entry: star index in `positions` buffer + Euclidean distance to the query star. */
export type StarNeighbor = {
  index: number;
  distance: number;
};

export type NearestStarsOptions = {
  /** Number of neighbors to return (sorted nearest-first). */
  k: number;
  /** Optional cap on the search radius (world units). */
  maxDistance?: number;
  /** Include the query star itself in the output. Default: false. */
  includeSelf?: boolean;
};

export type StarsWithinRadiusOptions = {
  /** Include the query star itself in the output. Default: false. */
  includeSelf?: boolean;
};

/**
 * Squared Euclidean distance between two stars sharing the same positions buffer.
 * Prefer this over `starDistance` for comparisons — saves one sqrt per call.
 */
export function starDistanceSq(positions: ArrayLike<number>, a: number, b: number): number {
  const dx = positions[a * 3]     - positions[b * 3];
  const dy = positions[a * 3 + 1] - positions[b * 3 + 1];
  const dz = positions[a * 3 + 2] - positions[b * 3 + 2];
  return dx * dx + dy * dy + dz * dz;
}

/**
 * Euclidean distance between two stars in the same positions buffer.
 * Uses only `+ - * sqrt`, all IEEE-correct since ES2017 → bit-stable across engines.
 */
export function starDistance(positions: ArrayLike<number>, a: number, b: number): number {
  return Math.sqrt(starDistanceSq(positions, a, b));
}

/**
 * Returns every star within `radius` (world units) of `starIndex`, sorted nearest-first.
 *
 * Uses the cube grid index to scan only cubes whose AABB intersects the query sphere,
 * so cost scales with the number of neighbors, not the galaxy size.
 */
export function starsWithinRadius(
  galaxy: GalaxyData,
  starIndex: number,
  radius: number,
  opts: StarsWithinRadiusOptions = {},
): StarNeighbor[] {
  if (radius <= 0) return [];
  const { positions } = galaxy.data;
  const { grid } = galaxy;
  const includeSelf = opts.includeSelf ?? false;

  const sx = positions[starIndex * 3];
  const sy = positions[starIndex * 3 + 1];
  const sz = positions[starIndex * 3 + 2];
  const src = grid.worldToCube(sx, sy, sz);
  const reach = Math.ceil(radius / grid.cubeSize);
  const radiusSq = radius * radius;

  const out: StarNeighbor[] = [];
  for (let di = -reach; di <= reach; di++) {
    for (let dj = -reach; dj <= reach; dj++) {
      for (let dk = -reach; dk <= reach; dk++) {
        const cube = grid.get(src.i + di, src.j + dj, src.k + dk);
        if (!cube) continue;
        for (const idx of cube.starIndices) {
          if (idx === starIndex && !includeSelf) continue;
          const d2 = starDistanceSq(positions, starIndex, idx);
          if (d2 <= radiusSq) out.push({ index: idx, distance: Math.sqrt(d2) });
        }
      }
    }
  }
  out.sort(byDistance);
  return out;
}

/**
 * The `k` stars closest to `starIndex`, sorted nearest-first. Walks Chebyshev cube
 * rings outward from the query cube and stops as soon as the next ring is provably
 * farther than the current kth candidate — typically visits only a handful of cubes.
 *
 * Lower bound for ring `r+1`: after exhausting cubes at Chebyshev distance ≤ r,
 * every untouched cube is at least `r * cubeSize` away. The source occupies at
 * most one full cube span on each axis, leaving `r * cubeSize` worth of gap on
 * the axis pointing to the next shell, and the L2 distance can only be larger.
 */
export function nearestStars(
  galaxy: GalaxyData,
  starIndex: number,
  opts: NearestStarsOptions,
): StarNeighbor[] {
  const { k } = opts;
  if (k <= 0) return [];
  const { positions } = galaxy.data;
  const { grid } = galaxy;
  const maxDistance = opts.maxDistance ?? Infinity;
  const maxDistanceSq = maxDistance === Infinity ? Infinity : maxDistance * maxDistance;
  const includeSelf = opts.includeSelf ?? false;

  const sx = positions[starIndex * 3];
  const sy = positions[starIndex * 3 + 1];
  const sz = positions[starIndex * 3 + 2];
  const src = grid.worldToCube(sx, sy, sz);
  const cubeSize = grid.cubeSize;
  const maxRing = ringBound(grid.bounds(), src);

  const best: StarNeighbor[] = [];

  const tryAdd = (idx: number): void => {
    if (idx === starIndex && !includeSelf) return;
    const d2 = starDistanceSq(positions, starIndex, idx);
    if (d2 > maxDistanceSq) return;
    const distance = Math.sqrt(d2);
    if (best.length < k) {
      insertSorted(best, { index: idx, distance });
      return;
    }
    if (distance >= best[k - 1].distance) return;
    best.pop();
    insertSorted(best, { index: idx, distance });
  };

  for (let ring = 0; ring <= maxRing; ring++) {
    visitRing(grid, src, ring, tryAdd);
    if (best.length >= k && best[k - 1].distance <= ring * cubeSize) break;
    if (ring * cubeSize >= maxDistance) break;
  }

  return best;
}

const byDistance = (a: StarNeighbor, b: StarNeighbor) => a.distance - b.distance;

/** Binary-insert into a small array kept sorted by distance ascending. */
function insertSorted(arr: StarNeighbor[], entry: StarNeighbor): void {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (arr[mid].distance <= entry.distance) lo = mid + 1;
    else hi = mid;
  }
  arr.splice(lo, 0, entry);
}

type CubeBounds = { minI: number; minJ: number; minK: number; maxI: number; maxJ: number; maxK: number };
type CubeCoord3 = { i: number; j: number; k: number };

/** Largest Chebyshev distance from `src` to any occupied cube (worst-case ring budget). */
function ringBound(b: CubeBounds, src: CubeCoord3): number {
  if (b.minI === Infinity) return 0;
  return Math.max(
    Math.abs(src.i - b.minI), Math.abs(src.i - b.maxI),
    Math.abs(src.j - b.minJ), Math.abs(src.j - b.maxJ),
    Math.abs(src.k - b.minK), Math.abs(src.k - b.maxK),
  );
}

/** Visit every cube at Chebyshev distance exactly `ring` from `src` (the shell). */
function visitRing(
  grid: GalaxyData['grid'],
  src: CubeCoord3,
  ring: number,
  visitStar: (idx: number) => void,
): void {
  if (ring === 0) {
    const cube = grid.get(src.i, src.j, src.k);
    if (cube) for (const idx of cube.starIndices) visitStar(idx);
    return;
  }
  for (let di = -ring; di <= ring; di++) {
    for (let dj = -ring; dj <= ring; dj++) {
      for (let dk = -ring; dk <= ring; dk++) {
        if (Math.max(Math.abs(di), Math.abs(dj), Math.abs(dk)) !== ring) continue;
        const cube = grid.get(src.i + di, src.j + dj, src.k + dk);
        if (!cube) continue;
        for (const idx of cube.starIndices) visitStar(idx);
      }
    }
  }
}
