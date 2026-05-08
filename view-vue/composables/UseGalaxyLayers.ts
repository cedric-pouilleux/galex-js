import { computed } from 'vue';
import type { ComputedRef, MaybeRefOrGetter } from 'vue';
import { toValue } from 'vue';
import { mulberry32, deriveSubseed } from '../../core/Random.js';
import type { GalaxyData } from '../../core/GalaxyData.js';
import {
  buildNebulaeBuffers, createNebulaeMaterialDef,
} from '../../view/effects/Nebulae.js';
import type { NebulaeBuffers } from '../../view/effects/Nebulae.js';
import {
  buildGasStreaksBuffers, createGasStreaksMaterialDef,
} from '../../view/effects/GasStreaks.js';
import type { GasStreaksBuffers } from '../../view/effects/GasStreaks.js';
import {
  buildArmGlowBuffers, createArmGlowMaterialDef,
} from '../../view/effects/ArmGlow.js';
import type { ArmGlowBuffers } from '../../view/effects/ArmGlow.js';
import {
  buildInnerRingBuffers, createInnerRingMaterialDef,
} from '../../view/effects/InnerRing.js';
import type { InnerRingBuffers } from '../../view/effects/InnerRing.js';
import {
  buildCenterDustBuffers, createCenterDiscMaterialDef, createCenterDustMaterialDef,
  createCenterDiscGeometry,
} from '../../view/effects/CenterDust.js';
import type { CenterDustBuffers } from '../../view/effects/CenterDust.js';
import {
  createHaloMaterialDef, createHaloGeometry,
} from '../../view/effects/Halo.js';
import {
  createStarFieldMaterialDef, createStarFieldVisibility,
} from '../../view/effects/StarField.js';
import type { ShaderMaterialDef } from '../../view/effects/Shaders.js';

export type GalaxyLayersOptions = {
  /** Multiplier for gas streaks, haze and nebula counts. Default 1.0. */
  gasDensity?: number;
};

/** Star field layer — buffers come straight from `GalaxyData`, plus a fresh visibility array. */
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

export type GalaxyLayers = {
  field: StarLayer;
  halo: HaloLayer;
  armGlow: PointsLayer<ArmGlowBuffers>;
  gasStreaks: PointsLayer<GasStreaksBuffers>;
  nebulae: PointsLayer<NebulaeBuffers>;
  innerRing: PointsLayer<InnerRingBuffers>;
  centerDust: CenterDustLayer | null;
};

/**
 * Reactive Vue composable that turns a `GalaxyData` into the full set of
 * layer buffers + material defs needed by a TresJS template. Reactive on the
 * input — pass a `Ref<GalaxyData>` (or getter) and the layers refresh on
 * regeneration.
 *
 * Each layer is plain data: no `THREE.Points` is instantiated here. The Vue
 * template assembles `<TresPoints>` (or `<TresMesh>` for the halo/disc) and
 * binds the buffers as buffer attributes + the material def as shader props.
 */
export function useGalaxyLayers(
  galaxyData: MaybeRefOrGetter<GalaxyData>,
  opts: MaybeRefOrGetter<GalaxyLayersOptions> = {},
): ComputedRef<GalaxyLayers> {
  return computed<GalaxyLayers>(() => {
    const data = toValue(galaxyData);
    const { gasDensity = 1.0 } = toValue(opts);
    const { seed, armSpinJ, armPhaseJ, opts: dataOpts } = data;
    const { radius, innerRadius, arms, spin, fillCenter } = dataOpts;

    // Render-side rng streams. They never touch `data` so they can use
    // independent subseed labels without disturbing the deterministic chain.
    const armGlowRng = mulberry32(deriveSubseed(seed, 'arm-glow'));
    const gasRng     = mulberry32(deriveSubseed(seed, 'gas-streaks'));
    const nebulaeRng = mulberry32(deriveSubseed(seed, 'nebulae'));
    const innerRng   = mulberry32(deriveSubseed(seed, 'inner-ring'));

    const field: StarLayer = {
      positions: data.data.positions,
      colors: data.data.colors,
      sizes: data.data.sizes,
      visibility: createStarFieldVisibility(data.data.count),
      materialDef: createStarFieldMaterialDef(),
    };

    const halo: HaloLayer = {
      geometry: createHaloGeometry(radius),
      materialDef: createHaloMaterialDef({ color: 0xc8d4ee, intensity: 0.06 }),
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
        streaks: Math.max(0, Math.round(220 * gasDensity)),
        hazeClouds: Math.max(0, Math.round(80 * gasDensity)),
      }),
      materialDef: createGasStreaksMaterialDef(),
    };

    const nebulae: PointsLayer<NebulaeBuffers> = {
      buffers: buildNebulaeBuffers({
        radius, innerRadius, arms, spin, armSpinJ, armPhaseJ, rng: nebulaeRng,
        clusters: Math.max(0, Math.round(32 * gasDensity)),
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
      const centerRng = mulberry32(deriveSubseed(seed, 'center-dust'));
      centerDust = {
        disc: {
          geometry: createCenterDiscGeometry(innerRadius),
          materialDef: createCenterDiscMaterialDef({
            color: 0xffc580,
            intensity: 0.45 * Math.max(0.4, gasDensity),
          }),
        },
        dust: {
          buffers: buildCenterDustBuffers({
            innerRadius, radius, arms, spin, armSpinJ, armPhaseJ,
            color: 0xffc580,
            dustParticles: Math.max(0, Math.round(1400 * gasDensity)),
            rng: centerRng,
          }),
          materialDef: createCenterDustMaterialDef(),
        },
      };
    }

    return { field, halo, armGlow, gasStreaks, nebulae, innerRing, centerDust };
  });
}
