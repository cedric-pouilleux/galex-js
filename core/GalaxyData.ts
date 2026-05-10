import { generateGalaxy } from './StarGenerator.js';
import { createCubeGrid } from './CubeGrid.js';
import { mulberry32, pickSeed, deriveSubseed } from './Random.js';
import type { CubeGrid } from './CubeGrid.js';
import type { GalaxyBuffers } from './StarGenerator.js';

/**
 * Generation options. Everything that affects the seed-derived buffers lives
 * here. View-only knobs (gas density, etc.) belong on the GalaxyScene side.
 */
export type GalaxyDataOptions = {
  count?: number;
  radius?: number;
  innerRadius?: number;
  /** Defaults to `cubeSize` when omitted. */
  thickness?: number;
  cubeSize?: number;
  minDistance?: number;
  arms?: number;
  spin?: number;
  spread?: number;
  fieldRatio?: number;
  fillCenter?: boolean;
  /** null/undefined = pick a fresh one. */
  seed?: number | null;
};

export type ResolvedGalaxyOptions = Required<Omit<GalaxyDataOptions, 'seed' | 'thickness'>> & {
  thickness: number;
  seed: number | null;
};

export type GalaxyData = {
  readonly seed: number;
  readonly opts: ResolvedGalaxyOptions;
  readonly armSpinJ: number[];
  readonly armPhaseJ: number[];
  readonly data: GalaxyBuffers;
  readonly grid: CubeGrid;
};

/**
 * Pure-data side of a GalexJS galaxy. Contains the seed, resolved options,
 * star buffers, spatial grid, and arm parameters — nothing that requires a
 * browser or a renderer. Importable on a Node backend (no DOM, no WebGL,
 * no `three`).
 *
 * Two instances built with the same `(seed, opts)` produce byte-identical
 * `data` buffers across V8, SpiderMonkey and JavaScriptCore.
 */
export function createGalaxyData(opts: GalaxyDataOptions = {}): GalaxyData {
  // thickness defaults to cubeSize so a flat galaxy stays inside one cube
  // layer on the y axis without the caller having to wire the dependency.
  const cubeSize = opts.cubeSize ?? 2;
  const thickness = opts.thickness ?? cubeSize;
  // Math.sqrt is IEEE-correct since ES2017 → bit-stable across engines.
  const innerRadiusFloor = Math.sqrt(2) * 1.5 * cubeSize + 0.05;

  const resolved: ResolvedGalaxyOptions = {
    count:       opts.count       ?? 15000,
    radius:      opts.radius      ?? 50,
    cubeSize,
    innerRadius: Math.max(opts.innerRadius ?? 4.5, innerRadiusFloor),
    minDistance: opts.minDistance ?? 0.25,
    seed:        opts.seed        ?? null,
    arms:        opts.arms        ?? 6,
    spin:        opts.spin        ?? 0.9,
    spread:      opts.spread      ?? 0.95,
    fieldRatio:  opts.fieldRatio  ?? 0.30,
    fillCenter:  opts.fillCenter  ?? false,
    thickness,
  };

  const seed = (resolved.seed === null || resolved.seed === undefined)
    ? pickSeed()
    : resolved.seed >>> 0;

  const armParamsRng = mulberry32(deriveSubseed(seed, 'arm-params'));
  const starsRng     = mulberry32(deriveSubseed(seed, 'stars'));

  const { count, radius, innerRadius, minDistance,
          arms, spin, spread, fieldRatio, fillCenter } = resolved;

  const armSpinJ: number[] = new Array(arms);
  const armPhaseJ: number[] = new Array(arms);
  for (let a = 0; a < arms; a++) {
    armSpinJ[a]  = 0.92 + armParamsRng() * 0.16;
    armPhaseJ[a] = (armParamsRng() - 0.5) * 0.22;
  }

  const data = generateGalaxy({
    count, radius, thickness, innerRadius, minDistance,
    arms, spin, spread, fieldRatio, fillCenter,
    armSpinJ, armPhaseJ,
    rng: starsRng,
  });

  // Cube (0, 0, 0) centred on the world origin; symmetric integer indices.
  const origin = {
    x: -cubeSize / 2,
    y: -cubeSize / 2,
    z: -cubeSize / 2,
  };
  const grid = createCubeGrid({ cubeSize, origin });
  grid.index(data.positions);
  grid.fillDisk({ radius, j: 0 });

  return { seed, opts: resolved, armSpinJ, armPhaseJ, data, grid };
}
