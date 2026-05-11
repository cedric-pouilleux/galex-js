import type { GalaxyData } from './GalaxyData.js';
import { starsWithinRadius } from './StarNeighbors.js';

export type StarPathOptions = {
  /**
   * Maximum length of a single jump, in world units. Two stars farther apart
   * than this cannot be connected directly — the route must hop through
   * intermediate stars. Modelled after the player's "engine range" skill.
   */
  maxJumpDistance: number;
  /**
   * Optional cut-off on the total path length (world units). Dijkstra stops
   * expanding any node whose tentative distance exceeds this bound, which
   * keeps the cost predictable on huge galaxies. Default: Infinity.
   */
  maxTotalDistance?: number;
  /**
   * Optional per-star filter. When provided, stars for which it returns false
   * are removed from the search space — they cannot be used as a hop *or* as
   * the start/end. Returns `null` if either endpoint is filtered out. Used by
   * the caller to hide stars behind fog of war or in inaccessible cubes.
   */
  isStarAllowed?: (starIndex: number) => boolean;
};

export type StarPath = {
  /**
   * Global star indices in travel order, A → … → B included. Length ≥ 2
   * (length === 2 means the trip is a single direct jump within the
   * configured range).
   */
  stars: number[];
  /** Sum of the per-jump distances, in world units. */
  totalDistance: number;
  /** Longest jump on the route, in world units — handy for UI feedback. */
  longestJump: number;
};

/**
 * Shortest multi-jump route from `fromStar` to `toStar`, where each jump is
 * capped by `opts.maxJumpDistance`. Uses Dijkstra on the implicit graph whose
 * edges are pairs of stars within reach. Neighbors are queried on demand via
 * `starsWithinRadius`, so no graph is precomputed — the cube grid is the only
 * spatial structure, and a different `maxJumpDistance` simply re-runs the
 * search without any cache to invalidate.
 *
 * Returns `null` when the target is unreachable for the given range (or beyond
 * `maxTotalDistance`).
 *
 * Cost is bounded by the number of stars visited, not by the galaxy size:
 * with a tight range Dijkstra fans out only locally before reaching the goal.
 */
export function findStarPath(
  galaxy: GalaxyData,
  fromStar: number,
  toStar: number,
  opts: StarPathOptions,
): StarPath | null {
  const { positions, count } = galaxy.data;
  if (fromStar < 0 || fromStar >= count) return null;
  if (toStar < 0 || toStar >= count) return null;
  if (fromStar === toStar) {
    return { stars: [fromStar], totalDistance: 0, longestJump: 0 };
  }
  const maxJump = opts.maxJumpDistance;
  if (!(maxJump > 0)) return null;
  const maxTotal = opts.maxTotalDistance ?? Infinity;
  const isAllowed = opts.isStarAllowed;
  // Endpoints are themselves filtered — no point starting the search otherwise.
  if (isAllowed && (!isAllowed(fromStar) || !isAllowed(toStar))) return null;

  const dist = new Float64Array(count);
  dist.fill(Infinity);
  dist[fromStar] = 0;
  const prev = new Int32Array(count);
  prev.fill(-1);
  const settled = new Uint8Array(count);

  const heap = createMinHeap();
  heap.push(fromStar, 0);

  while (heap.size() > 0) {
    const current = heap.pop();
    if (current === null) break;
    const u = current.index;
    if (settled[u]) continue;
    settled[u] = 1;
    if (u === toStar) break;

    const baseDist = dist[u];
    if (baseDist > maxTotal) continue;

    const neighbors = starsWithinRadius(galaxy, u, maxJump);
    for (const n of neighbors) {
      if (settled[n.index]) continue;
      if (isAllowed && !isAllowed(n.index)) continue;
      const candidate = baseDist + n.distance;
      if (candidate > maxTotal) continue;
      if (candidate < dist[n.index]) {
        dist[n.index] = candidate;
        prev[n.index] = u;
        heap.push(n.index, candidate);
      }
    }
  }

  if (!settled[toStar] || dist[toStar] === Infinity) return null;
  return reconstruct(positions, prev, fromStar, toStar, dist[toStar]);
}

/** Walks `prev` backwards to materialize the path and re-compute the longest jump. */
function reconstruct(
  positions: ArrayLike<number>,
  prev: Int32Array,
  fromStar: number,
  toStar: number,
  totalDistance: number,
): StarPath {
  const reversed: number[] = [];
  let cursor: number = toStar;
  while (cursor !== -1) {
    reversed.push(cursor);
    if (cursor === fromStar) break;
    cursor = prev[cursor];
  }
  reversed.reverse();

  let longestJump = 0;
  for (let i = 1; i < reversed.length; i++) {
    const a = reversed[i - 1];
    const b = reversed[i];
    const dx = positions[a * 3]     - positions[b * 3];
    const dy = positions[a * 3 + 1] - positions[b * 3 + 1];
    const dz = positions[a * 3 + 2] - positions[b * 3 + 2];
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d > longestJump) longestJump = d;
  }

  return { stars: reversed, totalDistance, longestJump };
}

// ── Min-heap (binary, indexed by distance) ──────────────────────────────────

type HeapEntry = { index: number; distance: number };

type MinHeap = {
  push(index: number, distance: number): void;
  pop(): HeapEntry | null;
  size(): number;
};

/**
 * Plain binary min-heap. We push duplicate entries for re-relaxed nodes (rather
 * than tracking heap positions for decrease-key) — `settled[]` in the outer
 * loop discards the stale ones, which is the textbook Dijkstra variant and
 * stays simple at our scale.
 */
function createMinHeap(): MinHeap {
  const items: HeapEntry[] = [];

  function push(index: number, distance: number): void {
    items.push({ index, distance });
    siftUp(items.length - 1);
  }

  function pop(): HeapEntry | null {
    if (items.length === 0) return null;
    const top = items[0];
    const last = items.pop()!;
    if (items.length > 0) {
      items[0] = last;
      siftDown(0);
    }
    return top;
  }

  function siftUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (items[parent].distance <= items[i].distance) break;
      swap(parent, i);
      i = parent;
    }
  }

  function siftDown(i: number): void {
    const n = items.length;
    for (;;) {
      const left = i * 2 + 1;
      const right = left + 1;
      let smallest = i;
      if (left < n && items[left].distance < items[smallest].distance) smallest = left;
      if (right < n && items[right].distance < items[smallest].distance) smallest = right;
      if (smallest === i) break;
      swap(i, smallest);
      i = smallest;
    }
  }

  function swap(a: number, b: number): void {
    const tmp = items[a];
    items[a] = items[b];
    items[b] = tmp;
  }

  return { push, pop, size: () => items.length };
}
