import { computed } from 'vue';
import type { ComputedRef, MaybeRefOrGetter } from 'vue';
import { toValue } from 'vue';
import type { GalaxyData } from '../../core/GalaxyData.js';
import { composeGalaxyLayers } from '../../view/GalaxyLayersComposer.js';
import type {
  ComposedGalaxyLayers, ComposeLayersOptions,
  StarLayer, PointsLayer, HaloLayer, CenterDustLayer,
} from '../../view/GalaxyLayersComposer.js';

/**
 * Vue-side alias of the composer's options + result. Re-exported so a Vue
 * caller doesn't need to reach into `view/` for typings.
 */
export type GalaxyLayersOptions = ComposeLayersOptions;
export type GalaxyLayers = ComposedGalaxyLayers;
export type { StarLayer, PointsLayer, HaloLayer, CenterDustLayer };

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
  return computed<GalaxyLayers>(() => composeGalaxyLayers(toValue(galaxyData), toValue(opts)));
}
