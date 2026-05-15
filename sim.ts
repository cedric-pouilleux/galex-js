/**
 * Public API — pure-logic entry point.
 *
 * Narrower than `./core`: no Three.js, no DOM, no WebGL. Exposes only the
 * deterministic data layer (galaxy generation, spatial grid, deterministic
 * math, RNG, visibility, naming, neighbor queries, pathfinding). Runs in any
 * headless JS environment — backend Node, worker, CLI, server validation.
 *
 * Typical backend usage:
 *   - `createGalaxyData({ seed, count, radius })` to derive the full board.
 *   - `findStarPath(...)` to validate a player action server-side without
 *     replaying any persisted state.
 *
 * Same `(seed, opts)` yields byte-identical buffers across V8, SpiderMonkey
 * and JavaScriptCore — see the cross-engine determinism guarantee in README.
 *
 * Render-layer (Three.js) additions live in `./core.ts`; Vue/TresJS additions
 * in `./index.ts`.
 */

// ── Galaxy data pipeline ────────────────────────────────────────
export { createGalaxyData } from './core/GalaxyData.js';
export type {
  GalaxyData,
  GalaxyDataOptions,
  ResolvedGalaxyOptions,
} from './core/GalaxyData.js';

// ── Star generation buffers ─────────────────────────────────────
export { generateGalaxy } from './core/StarGenerator.js';
export type { GenerateGalaxyOptions, GalaxyBuffers } from './core/StarGenerator.js';

// ── Star colour / spectral classification ───────────────────────
export {
  blackbodyRGB,
  spectralClass,
  sampleTemperature,
} from './core/StarColor.js';
export type { SpectralClass, TemperatureGradient } from './core/StarColor.js';

// ── Star naming ─────────────────────────────────────────────────
export { nameStarInCube } from './core/StarNames.js';

// ── Star neighbors (distance queries) ───────────────────────────
export {
  starDistance,
  starDistanceSq,
  starsWithinRadius,
  nearestStars,
} from './core/StarNeighbors.js';
export type {
  StarNeighbor,
  NearestStarsOptions,
  StarsWithinRadiusOptions,
} from './core/StarNeighbors.js';

// ── Pathfinding ─────────────────────────────────────────────────
export { findStarPath } from './core/Pathfinding.js';
export type { StarPath, StarPathOptions } from './core/Pathfinding.js';

// ── Cube grid (spatial index + raycast) ─────────────────────────
export { createCubeGrid, cubeKey } from './core/CubeGrid.js';
export type {
  Cube,
  CubeCoord3,
  CubeGrid,
  CubeGridOptions,
  Vec3,
} from './core/CubeGrid.js';

// ── Visibility / fog-of-war field ───────────────────────────────
export {
  computeVisibilityField,
  tierMapForVisibilityField,
} from './core/Visibility.js';
export type {
  CubeCoord,
  GridProjection,
  VisibilityFieldConfig,
} from './core/Visibility.js';

// ── Astronomy (world units ↔ light years) ───────────────────────
export {
  LIGHT_YEARS_PER_CUBE,
  lightYearsPerUnit,
  worldUnitsToLightYears,
} from './core/Astronomy.js';

// ── Deterministic RNG ───────────────────────────────────────────
// Reuse this PRNG when building gameplay code on top of the lib so the
// derived state stays deterministic with the same seed.
export { mulberry32, deriveSubseed, pickSeed } from './core/Random.js';
export type { Rng } from './core/Random.js';

// ── Deterministic math ──────────────────────────────────────────
// Bit-stable transcendentals — required to keep cross-engine byte
// identity. The core layer relies on these instead of Math.sin/cos/etc.
export { detSin, detCos, detLog, detExp, detPow } from './core/DetMath.js';
