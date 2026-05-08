import { mulberry32, deriveSubseed } from '../core/Random.js';
import type { GalaxyData } from '../core/GalaxyData.js';
import type { Cube } from '../core/CubeGrid.js';

export const PLAYER_NAME = 'Stellex Prime';
export const PLAYER_COLOR_HEX = 0x7fff9f;
export const PLAYER_HIGHLIGHT_RGB: [number, number, number] = [0.55, 1.0, 0.65];

export type Player = { star: number; cube: Cube; name: string };

/**
 * Picks a deterministic spawn for the playground player. Derives a dedicated
 * rng from the galaxy seed so every regen places the player on a stable cube
 * that has at least 4 stars and sits in a mid-radius shell of the disk.
 *
 * The lib has no notion of "player" — this lives in the playground because
 * it composes lib primitives (cubes + grid traversal) into a sandbox concept.
 */
export function pickPlayerStar(galaxyData: GalaxyData): Player {
  const rng = mulberry32(deriveSubseed(galaxyData.seed, 'player'));
  const r = galaxyData.opts.radius;
  const ri = galaxyData.opts.innerRadius;
  const rMin = Math.max(ri + 2, r * 0.42);
  const rMax = r * 0.66;
  const candidates: Cube[] = [];
  for (const c of galaxyData.grid.cubes.values()) {
    if (c.starIndices.length < 4) continue;
    const center = galaxyData.grid.cubeToWorldCenter(c.i, c.j, c.k);
    const r2 = center.x * center.x + center.z * center.z;
    if (r2 < rMin * rMin || r2 > rMax * rMax) continue;
    candidates.push(c);
  }
  candidates.sort((a, b) => (a.i - b.i) || (a.k - b.k));
  const cube: Cube = candidates.length > 0
    ? candidates[Math.floor(rng() * candidates.length)]
    : galaxyData.grid.cubes.values().next().value!;
  const starIdx = cube.starIndices[Math.floor(rng() * cube.starIndices.length)];
  return { star: starIdx, cube, name: PLAYER_NAME };
}
