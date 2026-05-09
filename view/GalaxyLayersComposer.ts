// Single source of truth for "what layers compose a galaxy view, with what
// counts and what tints". Both the imperative path (`createGalaxyScene`) and
// the declarative Vue path (`useGalaxyLayers`) consume this composer — magic
// numbers and seed labels live here, nowhere else.
//
// Output is pure data (typed-array buffers + geometries + ShaderMaterialDefs).
// Consumers wrap it in `THREE.Points` / `THREE.Mesh` (vanilla) or in TresJS
// elements (Vue) without re-deciding any of the per-layer parameters.

import { mulberry32, deriveSubseed } from '../core/Random.js';
import type { GalaxyData } from '../core/GalaxyData.js';
import {
  buildArmGlowBuffers, createArmGlowMaterialDef,
} from './effects/ArmGlow.js';
import type { ArmGlowBuffers } from './effects/ArmGlow.js';
import {
  buildGasStreaksBuffers, createGasStreaksMaterialDef,
} from './effects/GasStreaks.js';
import type { GasStreaksBuffers } from './effects/GasStreaks.js';
import {
  buildNebulaeBuffers, createNebulaeMaterialDef,
} from './effects/Nebulae.js';
import type { NebulaeBuffers } from './effects/Nebulae.js';
import {
  buildInnerRingBuffers, createInnerRingMaterialDef,
} from './effects/InnerRing.js';
import type { InnerRingBuffers } from './effects/InnerRing.js';
import {
  buildCenterDustBuffers, createCenterDiscMaterialDef, createCenterDustMaterialDef,
  createCenterDiscGeometry,
} from './effects/CenterDust.js';
import type { CenterDustBuffers } from './effects/CenterDust.js';
import {
  createHaloMaterialDef, createHaloGeometry,
} from './effects/Halo.js';
import {
  createStarFieldMaterialDef, createStarFieldVisibility,
} from './effects/StarField.js';
import type { ShaderMaterialDef } from './effects/Shaders.js';

// ─── Per-layer base counts (multiplied by gasDensity at compose time) ──────
const BASE_GAS_STREAKS = 220;
const BASE_HAZE_CLOUDS = 80;
const BASE_NEBULA_CLUSTERS = 32;
const BASE_CENTER_DUST_PARTICLES = 1400;

// Halo + center-disc visual constants — picked once, shared by both paths.
const HALO_COLOR = 0xc8d4ee;
const HALO_INTENSITY = 0.06;
const CENTER_COLOR = 0xffc580;
const CENTER_DISC_BASE_INTENSITY = 0.45;
/** Floor on the gas-density factor used by the center disc, so very low
 *  density still keeps a visible bulge halo. */
const CENTER_DISC_DENSITY_FLOOR = 0.4;

// Subseed labels — each layer pulls its own deterministic stream so adding /
// removing a layer never disturbs the others.
const SEED_LABEL_ARM_GLOW    = 'arm-glow';
const SEED_LABEL_GAS_STREAKS = 'gas-streaks';
const SEED_LABEL_NEBULAE     = 'nebulae';
const SEED_LABEL_INNER_RING  = 'inner-ring';
const SEED_LABEL_CENTER_DUST = 'center-dust';

const scaleCount = (base: number, density: number) => Math.max(0, Math.round(base * density));

export type ComposeLayersOptions = {
  /** Multiplier for gas streaks, haze and nebula counts. Default 1.0. */
  gasDensity?: number;
};

/** Star field — buffers are aliased from `GalaxyData`, plus a fresh visibility array. */
export type StarLayer = {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  visibility: Float32Array;
  materialDef: ShaderMaterialDef;
};

export type PointsLayer<TBuffers> = {
  buffers: TBuffers;
  materialDef: ShaderMaterialDef;
};

export type HaloLayer = {
  geometry: ReturnType<typeof createHaloGeometry>;
  materialDef: ShaderMaterialDef;
};

export type CenterDustLayer = {
  disc: { geometry: ReturnType<typeof createCenterDiscGeometry>; materialDef: ShaderMaterialDef };
  dust: { buffers: CenterDustBuffers; materialDef: ShaderMaterialDef };
};

export type ComposedGalaxyLayers = {
  field: StarLayer;
  halo: HaloLayer;
  armGlow: PointsLayer<ArmGlowBuffers>;
  gasStreaks: PointsLayer<GasStreaksBuffers>;
  nebulae: PointsLayer<NebulaeBuffers>;
  innerRing: PointsLayer<InnerRingBuffers>;
  centerDust: CenterDustLayer | null;
};

/**
 * Builds the full set of layer buffers + material defs for a galaxy view.
 * Deterministic for a given `(galaxyData.seed, gasDensity)` — switching from
 * vanilla to Vue with the same inputs yields byte-identical buffers (this is
 * exercised by `useGalaxyLayers buffers are byte-identical to createGalaxyScene`).
 */
export function composeGalaxyLayers(
  galaxyData: GalaxyData,
  { gasDensity = 1.0 }: ComposeLayersOptions = {},
): ComposedGalaxyLayers {
  const { seed, armSpinJ, armPhaseJ, opts } = galaxyData;
  const { radius, innerRadius, arms, spin, fillCenter } = opts;

  const armGlowRng = mulberry32(deriveSubseed(seed, SEED_LABEL_ARM_GLOW));
  const gasRng     = mulberry32(deriveSubseed(seed, SEED_LABEL_GAS_STREAKS));
  const nebulaeRng = mulberry32(deriveSubseed(seed, SEED_LABEL_NEBULAE));
  const innerRng   = mulberry32(deriveSubseed(seed, SEED_LABEL_INNER_RING));

  const field: StarLayer = {
    positions: galaxyData.data.positions,
    colors:    galaxyData.data.colors,
    sizes:     galaxyData.data.sizes,
    visibility: createStarFieldVisibility(galaxyData.data.count),
    materialDef: createStarFieldMaterialDef(),
  };

  const halo: HaloLayer = {
    geometry: createHaloGeometry(radius),
    materialDef: createHaloMaterialDef({ color: HALO_COLOR, intensity: HALO_INTENSITY }),
  };

  const armGlow: PointsLayer<ArmGlowBuffers> = {
    buffers: buildArmGlowBuffers({
      radius, innerRadius, arms, spin, armSpinJ, armPhaseJ, rng: armGlowRng,
    }),
    materialDef: createArmGlowMaterialDef(),
  };

  const gasStreaks: PointsLayer<GasStreaksBuffers> = {
    buffers: buildGasStreaksBuffers({
      radius, innerRadius, arms, spin, armSpinJ, armPhaseJ, rng: gasRng,
      streaks:    scaleCount(BASE_GAS_STREAKS, gasDensity),
      hazeClouds: scaleCount(BASE_HAZE_CLOUDS, gasDensity),
    }),
    materialDef: createGasStreaksMaterialDef(),
  };

  const nebulae: PointsLayer<NebulaeBuffers> = {
    buffers: buildNebulaeBuffers({
      radius, innerRadius, arms, spin, armSpinJ, armPhaseJ, rng: nebulaeRng,
      clusters: scaleCount(BASE_NEBULA_CLUSTERS, gasDensity),
    }),
    materialDef: createNebulaeMaterialDef(),
  };

  const innerRing: PointsLayer<InnerRingBuffers> = {
    buffers: buildInnerRingBuffers({
      innerRadius, radius, arms, spin, armSpinJ, armPhaseJ, density: gasDensity, rng: innerRng,
    }),
    materialDef: createInnerRingMaterialDef(),
  };

  let centerDust: CenterDustLayer | null = null;
  if (fillCenter) {
    const centerRng = mulberry32(deriveSubseed(seed, SEED_LABEL_CENTER_DUST));
    centerDust = {
      disc: {
        geometry: createCenterDiscGeometry(innerRadius),
        materialDef: createCenterDiscMaterialDef({
          color: CENTER_COLOR,
          intensity: CENTER_DISC_BASE_INTENSITY * Math.max(CENTER_DISC_DENSITY_FLOOR, gasDensity),
        }),
      },
      dust: {
        buffers: buildCenterDustBuffers({
          innerRadius, radius, arms, spin, armSpinJ, armPhaseJ,
          color: CENTER_COLOR,
          dustParticles: scaleCount(BASE_CENTER_DUST_PARTICLES, gasDensity),
          rng: centerRng,
        }),
        materialDef: createCenterDustMaterialDef(),
      },
    };
  }

  return { field, halo, armGlow, gasStreaks, nebulae, innerRing, centerDust };
}
